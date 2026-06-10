---
title: "DDIA Chapter 5: Replication"
description: "Notes from DDIA Chapter 5 on replication, leader-based replication, replication lag, and consistency tradeoffs."
pubDate: 2026-06-05
slug: "ddia-chapter-5-replication"
tags: ["ddia", "databases", "distributed-systems", "systems-design", "replication"]
draft: false
series: "DDIA"
seriesOrder: 5
---
> DDIA series: Chapter 5 - Replication
> Part 2: Distributed Data

Replication is the process of keeping a copy of the same data on multiple machines connected via the network. There are several reasons discussed in the previous chapter on why we may want this:

- Having data on different geo-locations close to our users will reduce latency
- Having many replicas improves redundancy, as if some of them fail, there are other replicas to handle the load.
- Simply improving our read throughput by scaling the replica services.

Keeping the same data on all of the replicas and serving reads is quite easy; the data may change over time, and we have to update the content on each replica so we can ensure consistency across them.

There are different algorithms to handle this, such as:

- Single-leader
- Multi-leader
- Leaderless

All of them have benefits and trade-offs. There are other things to consider with replication, such as:

- sync and async replication
- handling failed replicas

---

## Leader-based replication

When having multiple replicas, we have to ensure that all of the data that is being written ends up on all of the replicas.

![DDIA Chapter 5 figure 1](/images/ddia/chapter-5-replication/1.png)

This algorithm works as follows:

1. We have one of the “replicas” called a **leader (or master/primary).** When clients perform write requests, they are sending those requests to that instance, which first writes the new data to its local memory.
2. After that, the other replicas called **followers** (read replicas or slaves) will receive the data change via **replication lag** or **change stream.** Then, they have to update their local copy of the data based on the input that they received, simply applying all writes.

This is, in simple terms, how they are being synced. When a client wants to read from the database, the request is distributed to one of those **followers** (I will show a case where the client can hit the master for reads) to read the data.

---

However, in the example above, I did not mention the way that this data is being sent out to the replica. There are two common approaches:

- Synchronous
- Asynchronous

**Example with Replica 1 (sync) and Replica 2 (async)**

![DDIA Chapter 5 figure 2](/images/ddia/chapter-5-replication/2.png)

Let’s say we have 2 replicas and a master.

1. User makes a request to update the profile picture.
2. The write goes to the master.
   1. The master sends the write to **Replica 1,** which is synchronous; the Leader has to wait until Replica 1 returns a response so it can return a final response to the user.
   2. The master sends the write to **Replica 2,** which is asynchronous and does not have to wait for its response; it simply can continue and return to the user.
3. Finally, after **Replica 1** has either failed or succesfully return a response to the leader, the leader can continue and return its response to the user.

As we can see, there are both pros and cons to both approaches:

**Pros Sync:**

- We ensure data consistency across that replica simply because the leader has been notified that the write has been applied.
- If it happens that the leader goes down, that replica can take the leader's place, as we will know that the data is certainly up-to-date.

**Cons Sync:**

- Since the master has to wait for a response from that replica, if the replica dies, the master is going to wait, and the write cannot be processed.
- The master will block all writes and wait for the sync replica when it’s available again.

The Cons reasons are not negligible, thus in most cases we don’t want to have many sync replicas. We can go for one sync replica, and if it dies, we can take an async one and make it sync. This is called **semi-synchronous.**

As it says in the book, in most of the cases, the communication between the master and replicas is mostly entirely async, which again has downsides. If the leader fails while data is being written, or if not all of the replicas are up-to-date and the leader dies, the data may be lost entirely.

In the **Async** approach, we don’t have guaranteed consistency, it’s eventual meaning the replicas will become up-to-date at some point in time, not immediately.

The **Advantage** that makes this approach more preferred is - master is not blocked from processing writes, even if all replicas have fallen behind.

---

### Adding new Replica/ Follower

We may want to scale our replicas at some point, so we need to load that replica with a copy of the data from the leader or the most up-to-date replica. We can not just copy the data from the leader and load it to the new replica, because this process will take a while, and all writes that have happened after the copy are not going to be present in the new replica.

**How to solve it:**

1. Create a snapshot of the master dataset. (if it’s possible without locking the database)
2. Copy that snapshot to the new replica instance.
3. Connect the replica to the leader and request all the data changes that have happened after that snapshot was taken. ( more about this in the replication log )
4. After the replica has applied all of the log of changes, it can become available to process reads and process writes coming from the master.

---

### Handle Failed Instance

Each of our replicas/master can eventually go down, or engineers can purposely take down an instance for maintenance, rebooting a machine, etc.

In our case, Leader-based replication, two failures may happen:

- Master fails
- Follower fails

---

1. **Follower goes down**

If a follower goes down or is being restarted, or there is a network interruption between the master and the replica, the follower can recover the data easily:

Each replica stores the log of changes from the leader in its disk storage. When it becomes available, it can connect to the leader and request all changes from its log that have happened after the last change that is saved in the replica storage. When it’s done applying all changes, it can continue receiving writes and processing reads.

1. **Master goes down (ебало си е ма\*)**

This case is more complex than the first one, as we have:

- Promote a new leader, which means we have to choose one of our replicas
- All other followers have to be re-configured to notice the change above
- The client also has to be rerouted to send writes to the newly promoted master.

This process is called **failover,** and it can be done manually or automatically.

**Automatic approach**

1. We need some way of detecting when the master goes down. This is not an easy task, as there are many cases that can bring down the master, such as power outages, network issues, error crashes, etc.
   One potential solution is to send a health request to that instance, checking whether it returns a good response. We can configure it every 30 sec, otherwise the node is assumed to be dead. This, however, may result in false alerts if there is a network issue in that moment of the request.

2. After detecting the failure of the master, another leader has to be chosen.
   1. Election-based - majority between remaining replicas
   2. The last leader could point out which instance is going to take its place.
   3. Select the replica that is most up-to-date to minimize data loss.
3. We have the new leader; however, nobody knows that, so we have to reconfigure the other followers to start receiving writes from the new leader and re-route all write requests from the client to the new leader.

---

Many things can go wrong (I forgot most of the stuff, so I will summarize the points from the book):

- A new leader may be missing recent writes from the old leader. These writes are often discarded, which can violate durability guarantees and cause conflicts if the old leader rejoins.
- A discarded or stale state can break coordination with external systems. For example, promoting an out-of-date replica may reuse identifiers, leading to data corruption or security issues across dependent systems.
- Multiple nodes may believe they are the leader and accept writes concurrently. Without conflict resolution, this can result in data loss. Safety mechanisms exist, but poor design may shut down all leaders.
- Short timeouts cause unnecessary failovers during load spikes or network glitches. Long timeouts increase recovery time. Both extremes can worsen system instability.

---

### Replication Logs

Different replication algorithms are used in practice.

**Statement-based replication**

The leader forwards every write statement (INSERT, UPDATE, DELETE) to followers, which then re-execute those statements as if they came from a client.

**Cons:**

- Functions like NOW() or RAND() can produce different results on each replica.
- Statements that rely on execution order (autoincrement fields or conditional updates) must run in the exact same sequence on all replicas, which limits concurrency.
- Triggers, stored procedures, or user-defined functions may behave differently across replicas unless they are fully deterministic.

There are workarounds to these issues; another approach is often preferred - **row-based replication.**

---

**Row-based replication**

This method uses a replication log that is independent of the storage engine’s internal format. Instead of SQL statements, it records changes at the row level.

- Insert: logs the new values of all columns.
- Delete: logs the primary key (or all column values if no primary key exists).
- Update: logs the row identifier and the new values of changed columns.
- Each transaction produces multiple row records followed by a commit record.

Because the log is decoupled from storage internals, it is easier to keep backward compatibility, allowing different database versions or even different storage engines to replicate together.

---

**Other Replication Approaches**

**Trigger-based replication** moves replication logic to the application layer using triggers or stored procedures. It offers more flexibility but comes with higher overhead and greater complexity compared to built-in database replication.

**Write-ahead log (WAL)** shipping replicates data by sending the database’s low-level append-only log to followers, allowing them to rebuild the exact same data structures. This approach is efficient but tightly coupled to the storage engine, making version mismatches and zero-downtime upgrades difficult.

### Problems with Replication Lag

When an application reads from an asynchronous follower, it may see stale data if the follower has not yet applied all writes from the leader. As a result, the same query executed on the leader and on a follower can return different results.

This inconsistency is temporary: if no new writes occur, followers will eventually catch up with the leader. This behavior is known as eventual consistency.

Replication lag can be negligible under normal conditions, but under high load or network issues, it can grow to seconds or even minutes. At that point, lag becomes an application-level problem rather than a theoretical one.

### Reading Your Own Writes

There are cases where a user submits data and then immediately tries to read it. In systems with asynchronous replication and eventual consistency, a follower may not have applied the write yet, and therefore may return stale data.

To handle this, we can ensure **read-after-write** consistency by routing certain reads to the leader instead of followers, especially when the read is likely to depend on recent writes.

**Common approaches:**

- Read from the leader for recently modified data. For example, a user’s own profile can always be read by the leader, while other users’ profiles can be read by followers.
- After a write, the route reads to the leader for a short period (one minute), or avoids followers that are lagging beyond a threshold.
- The client records the timestamp or log position of its last write, and reads are served only from replicas that are at least up to date. Otherwise, the read is delayed or routed to another replica.

### Monotonic Reads

Another anomaly that can occur with asynchronous replication is that users may see data moving backward in time. This happens when consecutive reads are served by different replicas with different replication lag.

**Example:**

1. User first reads from a replica that is mostly up to date and sees a recent change
2. Then read from a more lagging replica where that change has not yet been applied.
3. The result is: data appears and then disappears.

To prevent this, we can use monotonic reads. The guarantee is that once a user has seen a
particular version of the data, they will not later see an older version (I don’t quite get this). This is weaker than strong consistency, but stronger than eventual consistency.

A common way to achieve monotonic reads is to ensure that each user’s reads are always routed to the same replica (for example, by hashing on user ID). If that replica fails, the user’s requests must be redirected to another replica, which may temporarily break the guarantee.

### Consistent Prefix Reads

A reader may observe related events out of order. For example, seeing a response before the
question that caused it.

**Consistent prefix** reads guarantee that writes are observed in the same order in which they occurred. This problem is especially common in partitioned databases, where different shards may be replicated at different speeds.

Ensuring causally related writes go to the same partition, or explicitly tracking causal dependencies, can help avoid this issue.

## Multi-Leader Replication

Leader-based replication has one major downside: there is only one leader that can process writes, which can become both a performance bottleneck and a single point of failure.

A multi-leader setup addresses this by allowing multiple leaders, usually one per datacenter. Each datacenter processes writes locally, and those writes are then replicated asynchronously to leaders in other datacenters. While this improves availability and latency, it also makes the system much more complex, which is why this approach is used more rarely.

![DDIA Chapter 5 figure 3](/images/ddia/chapter-5-replication/3.png)

Having leaders in multiple datacenters means that the failure of an entire datacenter does not take the system offline. Traffic can be routed to a healthy region while the failed one recovers.

The book compares single-leader and multi-leader replication in a multi-datacenter deployment across a few dimensions:

- **Performance**

In a single-leader setup, all writes must go to the datacenter that hosts the leader. For users in other regions, this adds internet latency and partially defeats the purpose of having multiple datacenters.

In a multi-leader setup, writes are handled by the local leader, and replication to other datacenters happens asynchronously.

- **Failure tolerance**

With a single leader, if the datacenter hosting that leader goes down, the system must perform a failover, which can cause downtime.

With multi-leader replication, each datacenter can continue operating independently. Replication simply resumes once the failed datacenter comes back online.

---

The biggest downside of multi-leader replication is write conflicts. The same data can be modified in different datacenters at the same time, and the system must detect and resolve these conflicts correctly.

## Handling Write Conflicts

As I said above, this is the biggest problem when it comes to this setup. When conflicts arise, we have to perform conflict resolution.

**Example:**

![DDIA Chapter 5 figure 4](/images/ddia/chapter-5-replication/4.png)

- User 1 changes the title from **A** to **B.**
  - The write is handled by leader 1.
- User 2 changes the title from **A** to **C.**
  - The write is handled by leader 2.
- Both leaders have different information stored for that record, meaning there is a conflict between them. When they attempt to sync each other, this conflict will arise.

---

### Conflict resolution

The simplest strategy is to avoid conflicts altogether. This can be done by ensuring that all writes for a particular record are always routed to the same leader. If only one leader ever processes writes for that data, conflicts cannot occur. This is one of the most frequently recommended approaches, since many multi-leader systems handle conflicts poorly. (This assumption is from the book)

If users are only allowed to modify their own records, requests from a given user can always be routed to the same datacenter, and thus the same leader, for both reads and writes. Different users may be assigned to different datacenters (often based on geographic proximity), but from each user’s perspective, the system behaves like a single-leader setup.

However, conflict avoidance is not always possible. If a datacenter fails and traffic needs to be rerouted, or if a user moves and is reassigned to a different datacenter, writes for the same record may temporarily go to different leaders. In such cases, conflicts can occur and must be explicitly handled.

### Converging toward a consistent state

In a single-leader setup, writes are applied sequentially, so the last write always determines the final value.

In a multi-leader setup, there is no global ordering of writes. For example, two users may update the same record on different leaders at roughly the same time - both updates are “valid” locally, but replicas could end up with different final values.

To avoid this, multi-leader replication must converge: all replicas eventually reach the same final state.

**Common strategies:**

- Assign each write a timestamp or unique ID and keep only the write with the highest ID (simple but can lose data).
- Writes from a higher-numbered replica override lower-numbered ones (also risks data loss).
- Combine conflicting writes. (How?, probably will check)
- Store conflicts and resolve them later in application code, possibly with user input. (This seems a good option, in my opinion)

### Multi-Leader Replication Topologies

A replication topology defines how writes are propagated between leaders.

With two leaders, the path is obvious:

- each sends writes to the other.

![DDIA Chapter 5 figure 5](/images/ddia/chapter-5-replication/5.png)

With more leaders, different topologies are possible:

- **All-to-all**: every leader sends writes to every other leader. High fault tolerance, but network ordering issues can occur.
- **Circular:** each leader sends writes to one other node in a ring. Simple, but a single node failure can block replication.
- **Star/tree:** a root node forwards writes to others. Easier to manage than circular, but still vulnerable to failures of key nodes.

Writes may arrive out of order at some replicas, causing issues (an update reaching a replica before the corresponding insert). Techniques like version vectors are needed for proper ordering.

---

## Leaderless Replication

Both of the previous setups were based on the client sending write requests to a specific leader, which later distributes the changes over the replicas.

However, in a **leaderless** environment, the client sends its write requests to more than one replica.

### Read Repair and Anti-Entropy

When a node recovers, it needs to catch up on missed writes.

Two common approaches:

- **Read repair**

When a client reads from multiple replicas, it can detect stale values and update outdated replicas. Works best for frequently read data.

- **Anti-entropy**

A background process compares replicas and copies missing data, ensuring eventual consistency. Unlike leader-based replication, the order of writes isn’t preserved, and rarely-read data may take longer to propagate.

Not all systems use both; without anti-entropy, infrequently read data may temporarily be missing on some replicas.

---

### Quorums for Reading and Writing

In leaderless replication, a write doesn’t have to reach every replica to succeed. For example, if a value is stored on 3 replicas (n = 3) and we require 2 writes to succeed (w = 2), then at most one replica can be stale. If we read from 2 replicas (r = 2), at least one of them will have the latest value.

More generally, with n replicas, a write is considered successful when w nodes confirm it, and a read queries r nodes. As long as w + r > n, we can always get an up-to-date value.

Dynamo-style databases let you configure n, w, and r.

n = 3 or 5 (odd numbers for simplicity)

w = r = (n + 1)/2 (rounded up)

It depends on the workload - fewer writes, more reads → w = n, r = 1 (fast reads, but writes fail if one node is down).

In practice, reads and writes go to all n replicas in parallel; w and r just define how many successful responses are required. If fewer than w or r nodes respond successfully, the operation fails. This setup lets the system tolerate unavailable nodes without sacrificing correctness.

## Limitations of Quorum Consistency

Quorums give the illusion of safety: if w + r > n, reads and writes usually overlap on at least one replica, so reads tend to return the latest value. Often, r and w are majorities (more than n/2) to tolerate up to n/2 node failures, but other configurations are possible.

Smaller w or r increases availability and lowers latency, but also raises the chance of reading stale data. Even with w + r > n, edge cases remain:

- Sloppy quorums can break the guaranteed overlap between writes and reads.
- Concurrent writes can conflict; last-write-wins may lose data due to clock skew.
- Reads concurrent with writes may see old or new values unpredictably.
- Writes that partially fail may leave inconsistent replicas.
- Node failures or restores from outdated replicas can break the quorum.
- Even under normal operation, unlucky timing can produce stale reads.

In practice, Dynamo-style databases optimize for eventual consistency. Quorums reduce the probability of stale reads but don’t guarantee monotonic reads, read-your-writes, or consistent prefix reads. Stronger guarantees require transactions or consensus.

### Monitoring Staleness

It’s important to track whether replicas are up-to-date:

- Leader-based replication: monitor replication lag using the leader’s log position vs followers.
- Leaderless replication: harder to measure because writes have no fixed order. If only read repair is used, rarely-read values can remain stale indefinitely.

## Detecting Concurrent Writes

Multiple clients can write to the same key at the same time, so conflicts are inevitable even with strict quorums. This is similar to multi-leader replication, but conflicts can also happen during read repair.

The problem is that writes may arrive at different nodes in different orders due to network delays or partial failures. **For example:**

- Node 1 sees A but misses B.
- Node 2 sees A then B.
- Node 3 sees B then A.

If each node simply overwrites the key on receipt, replicas permanently diverge. To achieve eventual consistency, nodes must converge to the same value.

In practice, most databases don’t resolve this automatically. To avoid losing data, the application often needs to understand and handle conflicts explicitly, using techniques like:

- Last-write-wins (LWW): pick the write with the latest timestamp. Simple but can lose data.
- Combine concurrent writes when possible (append to a list).
- Store all versions and resolve later, sometimes at the application level

---

### Last Write Wins (Discarding Concurrent Writes)

One way to achieve convergence in a leaderless system is last write wins (LWW). Each replica stores only the “most recent” value, overwriting and discarding older or concurrent writes.

To enforce this, we attach a timestamp (or unique ID) to each write and pick the highest as the winner. LWW guarantees that replicas eventually converge to the same value.

**Cons:**

- True concurrency means the writes have no natural order. LWW forces an arbitrary order, which can discard data.
- Even non-concurrent writes may be lost if timestamps are imperfect.
- LWW is acceptable only when losing writes is safe (having cache) or when keys are immutable

To decide if two writes are concurrent:

- A happens before B if B depends on A or builds on A.
- A and B are concurrent if neither knows about the other.

Only truly concurrent writes require conflict resolution. If one happens before the other, the later operation overwrites the earlier one automatically.

### Merging Concurrently Written Values

Instead of silently discarding concurrent writes like last write wins (LWW), we can preserve all conflicting values and merge them later.

**Why merge siblings:**

Simply picking one write can cause data loss. Merging preserves all user actions, but the application may need to resolve conflicts.

**Example (shopping cart):**

Sibling 1: [milk, flour, eggs, bacon]

Sibling 2: [eggs, milk, ham]

Merged: [milk, flour, eggs, bacon, ham]

**Deletions:**

A naive union would resurrect removed items. Instead, a tombstone marks deletions with a version, so removals are respected.

**Automatic conflict resolution:**

Some systems, like Riak, use CRDTs (conflict-free replicated data types) to merge siblings automatically, including handling deletions safely.

### Version Vectors

When multiple replicas accept writes concurrently, a single version number isn’t enough. Version vectors track:

- Each replica’s own write count.
- The latest versions seen from other replicas.

This lets the database distinguish:

- Overwrites (one value replaces another)
- True concurrent writes (siblings that need merging)

## Summary

Replication can serve for:

- High availability
  Keep the system running, even when another machine goes down

- Disconnected operation
  Application continue to work when there is a network interruption

- Latency
  Place replicas geographically close to users, so users can work with them faster.

- Scalability
  Handle more reads, even more writes (on multi-leader).

We went through different algorithms for replications

- Single - based replication

Clients send all of the write requests to one master replica, which then distributes the changes in the form of a stream to the other replicas. Reads can be performed entirely on the replicas, but can also be performed on the master.

- Multi - leader replication

Clients send each write to one of several leader instances, most of the cases to the most geographically appropriate one. The leaders send the changes to each other, and after they have synced, the changes are distributed to the replicas.

- Leaderless replication

Clients send each write to several replicas, and read from several nodes in parallel in order to detect and correct nodes with stale data.

---

**Synchronous vs asynchronous replication**
Synchronous replication ensures followers are up to date before acknowledging a write, but it can be slower. Asynchronous replication is faster but can lead to replication lag, which may cause inconsistencies or lost writes if a leader fails.

---

- Read-after-write consistency: Users should always see the data they just wrote.
- Monotonic reads: Users should never see older versions of data after having seen newer ones.
- Consistent prefix reads: Data should be seen in a causally correct order, e.g., a reply should never appear before the question it answers.

**Concurrency issues**
Multi-leader and leaderless setups allow concurrent writes, so conflicts can occur. Databases detect whether operations are concurrent (or one happened before the other) and resolve conflicts through techniques like LWW, merging sibling values, tombstones, CRDTs, and version vectors.

In short, replication provides high availability, fault tolerance, low latency, and scalability, but the design choice affects consistency, complexity, and conflict handling.
