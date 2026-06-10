---
title: "DDIA Chapter 9: Consistency and Consensus"
description: "Notes from DDIA Chapter 9 on consistency, consensus, linearizability, ordering guarantees, and distributed coordination."
pubDate: 2026-06-09
slug: "ddia-chapter-9-consistency-and-consensus"
tags: ["ddia", "databases", "distributed-systems", "systems-design", "consensus", "consistency"]
draft: false
series: "DDIA"
seriesOrder: 9
---
> DDIA series: Chapter 9 - Consistency and Consensus
> Part 2: Distributed Data

## Consistency Guarantees

We have discussed replication lag in previous chapters; it’s a timing issue that can happen in replicated databases. It can happen that if we query two database nodes, they can return different data. This inconsistency can occur no matter the algorithm used for replication.

It’s a hard problem to resolve such inconsistencies between the replicated nodes, especially when the synchronization mechanism of the master and other replicas is asynchronous.

What we can achieve in this scenario is **eventual consistency,** which means that if you stop writing to the database and wait for some period of time, then eventually the replicas have all of the writes that the master has.

**Eventual consistency** doesn’t guarantee us that if we perform a write-read operation, we will get the data that we wrote, simply because the read might be routed to some replica that doesn’t have the changes yet. (except in cases where the master handles that read request)

## Linearizability

The problems with Eventual Consistency is: if there are many replicas and writes are propagated asynchronously to them, different replicas may be temporarily out of sync.

If at that moment **Client A** writes `name = Ivan` to replica 1, and **Client B** reads from replica 2 at the same time. Replica 2 might still have the old value `name = Mitko` . This is basically **replication lag**.

**Linearizability** in this case guarantees us that if a write completes successfully, any later read must see that write.

So if:

- **Client A** writes `name = Ivan` and the write returns successfully
- **Client B** reads `name` and sees `Ivan` immediately.

---

When the book shows those timing diagrams, the important idea is this: every operation (read, write, compare-and-set) takes some time from the client’s perspective. It starts when the request is sent and ends when the response is received. Somewhere between those two moments, the operation takes effect.

**Linearizability** requires that we can imagine each operation taking effect at one exact instant inside that window, and if we order those instants, they must respect real-world time.

If a write completes before a read starts, that read must see the value written. Not eventually. Not most of the time. Always. If one client reads a new value, then any later read by anyone must not return an older value. Once the system has moved forward, it cannot move backward.

The tricky part is concurrent operations. If a read overlaps with a write, meaning the write hasn’t completed yet, the read is allowed to return either the old value or the new value.

That’s fine. What is not allowed is seeing the new value and then later seeing the old value again. That would break the illusion of a single copy.

The `compare-and-set` is used in these cases, it applies not just to simple reads and writes but to conditional atomic operations too. You must be able to line up all operations in a single order that makes sense, where each read returns the value from the most recent write in that order.

---

**Linearizability** is needed when the system might break if two people could momentarily disagree about the current state of the data. When a decision is being made based on the current value, that decision must be based on the latest one.

**For example:**

If two users try to grab the last item in stock, and the system allows both to believe the item is still available, we have oversold.

If stale data just means a user sees an old score for a few seconds, that’s fine. If stale data means money is lost, inventory is corrupted, or two leaders exist, that’s not fine. That’s when linearizability matters.

Example:

![DDIA Chapter 9 figure 1](/images/ddia/chapter-9-consistency-and-consensus/1.png)

Assume the system is **linearizable**. That means when step 2 (store image in File Storage) completes successfully, the system guarantees:

- Any subsequent read must see that exact image.

So when step 3 sends a message to the queue, and later the **Image Resizer** fetches the image, it is guaranteed to see the latest version.

Even if internally the storage system has replicas, the replication lag is invisible to clients. The system will not allow a read to observe a stale replica in a way that violates real-time order.

If the system is not **linearizable,** race conditions appear.

At step 2, the web server writes the image. But internally:

- The file storage writes to one node.
- That node asynchronously replicates to other replicas.
- The write returns “success” before replication finishes everywhere.

Then step 3 sends the message to the queue. The queue might deliver that message very quickly. Now the **Image Resizer** (step 5) tries to fetch the image. If it reads from:

- A replica that hasn’t received the new image yet

It may:

- See the old version
- Or see no file at all

That creates a real bug:

- The resized image might be generated from stale or missing data, and now the full-size image and thumbnail are inconsistent.

The main issue is that there are two communication channels:

- File storage
- Message queue

If storage is not linearizable, the queue can “outrun” replication inside storage. So the message saying “the image is ready” may reach the resizer before the image is actually visible everywhere.

---

**With linearizability**: When write returns success → the world agrees the data exists.

**Without linearizability:** Write returns success → some parts of the system might still disagree for a while.

And that window of disagreement is where race conditions live.

## Implementing Linearizable Systems

As it’s said in the book:

:::note
Since linearizability essentially means “behave as though there is only a single copy of
the data, and all operations on it, are atomic.”
:::

The easiest solution to achieve this is to use a single copy of the data. However, this approach is not fault-tolerant at all; if the node fails, we lose everything.

---

**Single-leader replication**

In this setup, one node is designated as the leader. All writes must go through that leader, and followers replicate whatever the leader writes. Conceptually, this works well for linearizability because there is still only one node deciding the order of writes. The leader becomes the single authority that defines what “the latest value” is.

If clients always read from the leader, or from followers that are synchronously updated, the system can make the illusion of a single copy. The leader determines the order of writes, and everyone else follows that order. So from the outside, it behaves like a single logical database.

However, if the replication is asynchronous and we have a **failover**, the new leader may not contain the most recent writes, which means a write that previously returned success to a client can effectively disappear, breaking both durability and linearizability.

---

**Multi-leader replication**

Multi-leader replication is generally not linearizable because multiple nodes can accept writes at the same time. Since those writes are processed independently and replicated asynchronously, conflicting updates can occur and must be resolved later.

---

**Leaderless replication**

Leaderless replication is also usually not linearizable. Even though it uses quorum reads and writes (like requiring a majority of replicas), that alone does not guarantee real-time consistency. Due to network delays and timing differences, one client can observe a newer value while another client, slightly later, still sees an older one. Even with strict quorums, race conditions are still possible, so we cannot assume linearizability in leaderless systems.

---

### Linearizability and quorums

![DDIA Chapter 9 figure 2](/images/ddia/chapter-9-consistency-and-consensus/2.png)

In the example above, we have a leaderless replication setup with three replicas `(n = 3)`, write quorum `w = 3`, and read quorum `r = 2`. Initially, all replicas store `x = 0`.

1. A writer updates `x = 1` and sends the write to all three replicas.
    Because of network delays, the replicas receive and apply the write at slightly different times.

2. **Replica 3** receives the write first and updates its value to `x = 1`.
3. At the same time, **Reader A** issues a read request with quorum `r = 2`.
    The read is sent to **Replica 2** and **Replica 3**.

    1. **Replica 2** has not yet received the write, so it returns `x = 0`.
    2. **Replica 3** has already applied the write, so it returns `x = 1`.

**Reader A** receives both values. In quorum systems, the client typically picks the most recent value (based on versioning or timestamps), so **Reader A** returns `x = 1`.

At this point, **Reader A** has successfully observed the new value 1.

4. Now **Reader B** starts a read slightly later in real time, after **Reader A** has already completed.
   1. **Reader B** sends read requests to **Replica 1** and **Replica 2**.
   2. **Replica 1** has not yet received the write and returns `x = 0`.
   3. **Replica 2** has also not yet received the write and returns `x = 0`. **Reader B,** therefore, returns `x = 0`.

From this example, **Reader A** sees the new value `x = 1`. After A’s read completes, **Reader B** starts its read, but B gets the old value `x = 0`.

This violates linearizability because once a new value is observed, any later read must not return an older value. The system appears to move backward in time, which violates the single-copy illusion.

## Ordering Guarantees

Ordering keeps coming up in distributed systems because of causality, the basic idea that cause must come before effect.

- If event B depends on event A, then A must have happened before B. That’s causality.

In distributed systems, this shows up everywhere:

- If someone answers a question, the question must have been asked first.
- If a row is updated, it must have been created before.
- If a transaction decides something based on data it reads, that read must logically come before the write it produces.

So causality is really about “happened-before” relationships. Between any two operations, one of three things is true:

- A happened before B
- B happened before A
- They are concurrent (independent, no causal link)
- If A happened before B, then B may have seen A or depended on it.
- If they are concurrent, neither could have known about the other.

---

In a distributed system, events happen on different machines with network delays. If we don’t enforce some **ordering guarantees**, we can observe effects before causes. That feels wrong because it violates causality.

Causal consistency means the system respects these cause-and-effect relationships. If you see some piece of data, you must also be able to see everything that causally came before it.

For example, with snapshot isolation, when you read a consistent snapshot of the database, we see a state that could have existed at one moment in time. That means we see all the causes necessary to explain the effects we observe. We won’t see an answer without the question.

---

Without respecting causality, systems behave in ways that feel logically impossible, like time running backward.

### The causal order is not a total order

In a total order, like natural numbers, we can always compare any two elements. Given 5 and 13, we can definitively say which one is greater. There is a single, unambiguous ordering of everything.

Linearizability works like that. It creates the illusion that all operations happen along one single timeline. For any two operations, we can always say which one happened first. There is no real concurrency from the system’s point of view; everything is placed at a single point in a global sequence.

With causality, two operations are ordered only if one actually depends on the other, if one happened before the other. But if two operations occur independently, without knowledge of each other, they are concurrent. And concurrent operations are incomparable. We cannot say which one came first in any meaningful causal sense.

This makes causality a **partial order**, not a total order. Some operations are ordered, some are not.

**Example with Git**

Sometimes commits form a straight line; one clearly after another. But sometimes two developers create commits at the same time. Those commits exist on different branches. Neither is before the other until they are merged. The history is a graph, not a single line.

That’s what causality looks like: a graph of dependencies.

Linearizability is stronger because it forces the graph into a single straight line. And if we can force everything into a single order, then causality is automatically preserved. If A caused B, then A must appear before B in that timeline.

But the cost is high. To maintain a total order across machines, especially across regions, we pay with latency and availability. That’s why some systems omit linearizability and instead aim for causal consistency.

Causal consistency preserves all **cause-and-effect** relationships, but it does not force unrelated operations into an order. It only requires that if **operation A** happened before **operation B**, then every replica must process **A** before **B**. If two operations are concurrent, replicas are free to order them differently.

---

## Sequence Number Ordering

Keeping track of all causal dependencies directly can be complicated and expensive. A simpler approach is to assign sequence numbers or logical timestamps to operations. These numbers give a total order that can respect causality:

- if A causally happened before B, A gets a lower number than B. Concurrent operations can be ordered arbitrarily.

In single-leader systems, the leader can just increment a counter for each write, so followers applying writes in that order automatically stay causally consistent.

In multi-leader or leaderless systems, generating sequence numbers is harder. Nodes can use tricks like odd/even numbers, timestamp-based IDs, or preallocated blocks, but these numbers may not respect causality, because clocks can skew or nodes may progress at different speeds.

Sequence numbers give a compact way to order operations, but only a single-leader system guarantees they match causal order.

## Total Order Broadcast

Total order broadcast is the problem of getting all nodes in a distributed system to agree on the same global order of messages, even in the presence of failures.

It guarantees two things:

- Reliable delivery - if one node delivers a message, all nodes will eventually deliver it.
- Same order everywhere - all nodes deliver messages in exactly the same order.

The important part is that the order is final at delivery time. Once a message is delivered, nothing can later be inserted before it. That makes total order broadcast stronger than simple timestamp ordering, where the final order might only become clear after collecting all operations.

Every node appends messages to a log, and all nodes see the same log in the same order. This idea is the foundation of state machine replication: if every replica processes the same operations in the same order, they stay consistent.

This is closely related to consensus, and systems like ZooKeeper and etcd implement it internally.

Total order broadcast is asynchronous - it guarantees order, but not when messages are delivered. Linearizability, on the other hand, guarantees recency (reads see the latest write). However, you can build linearizable writes on top of total order broadcast by using the shared log to decide which operation “came first,” such as when enforcing uniqueness constraints.

### Implementing total order broadcast using linearizable storage

We can build a total order broadcast if we already have linearizable storage.

Assume we have a linearizable register that supports an atomic increment-and-get operation. For every message we want to broadcast, we first increment the register and use the returned value as the message’s sequence number. Because the register is linearizable, each increment is globally ordered and unique.

All nodes then deliver messages strictly in increasing sequence number order.

If a node receives message 6 before message 5, it knows that message 5 must exist and simply waits. Since sequence numbers are gap-free and globally ordered, the delivery order is finalized and consistent across all nodes.

That is exactly what total order broadcast requires: a single, agreed, irreversible global order of messages.

## Distributed Transactions and Consensus

Consensus is the problem of getting multiple nodes to agree on a single decision, even in the presence of failures. It sounds simple, but it’s one of the hardest and most fundamental problems in distributed systems.

Two classic situations where consensus is needed are:

- Leader election - All nodes must agree on who the leader is. If two nodes both think they are the leader (split-brain), the system can diverge and corrupt data.
- Atomic commit - In distributed transactions, multiple nodes participate. They must all agree on the outcome: either all commit or all abort. If some commit and others abort, the database becomes inconsistent.

---

On a single node, atomicity is easy: the disk decides. If the commit record is written to disk, the transaction is committed; if not, it is rolled back. One machine, one authority.

In distributed transactions, there is no single disk deciding. Now multiple machines must agree before any of them makes an irreversible commit. And once a transaction commits, it cannot be undone, because other transactions may already depend on it.

To solve this, systems use Two-Phase Commit. 2PC introduces a coordinator and splits commit into two phases:

- Phase 1 (Prepare / Voting phase):

The coordinator asks all participants: “Can you commit?”
Each participant replies yes or no.

- Phase 2 (Decision phase):

If all say yes → coordinator tells everyone to commit.

If any say no → coordinator tells everyone to abort.

This guarantees atomicity: either everyone commits or everyone aborts.

However, 2PC is not perfect. It is a form of consensus, but a weak and blocking one. If the coordinator crashes at the wrong time, participants can get stuck waiting.

---

**FLP impossibility result.** It proves that in a purely asynchronous system where nodes may crash, deterministic consensus is impossible.

In practice, systems escape this limitation by using timeouts, failure detectors, or randomness. That’s why consensus algorithms like those used in ZooKeeper or etcd can work in real systems.

---

Two-phase commit ensures atomicity because it introduces two irreversible moments in the protocol.

First, when a participant receives the prepare request and replies “yes,” it guarantees that it can commit the transaction under all circumstances. It writes all necessary data to disk and checks for conflicts or constraint violations. By voting “yes,” the participant gives up the right to abort later, even though it has not yet committed.

Second, once the coordinator has received all responses and writes its final decision (commit or abort) to its transaction log, that decision becomes final. From that point on, it cannot change its mind. If the decision is to commit, it must keep retrying until all participants commit, even if failures occur.

Participants promise they will commit if asked, and the coordinator promises to enforce the final decision. Because neither side can back out after these moments, the transaction either commits everywhere or aborts everywhere, ensuring atomicity.

### Coordinator failure

If a participant or the network fails during 2PC, the behavior is clear: the coordinator aborts if prepare fails, and retries commit or abort messages indefinitely. The difficult case is when the coordinator crashes.

If the coordinator crashes before sending prepare requests, participants can safely abort. However, once a participant has received a prepare request and voted “yes,” it is no longer allowed to abort on its own. At that point, it must wait for the coordinator’s final decision. If the coordinator crashes after collecting “yes” votes, the participants enter an in-doubt (or uncertain) state.

In this state, a participant cannot safely commit or abort unilaterally. If it aborts after a timeout, it might become inconsistent with another participant that has already committed. If it commits, another participant might have aborted. Since 2PC does not include a protocol for participants to coordinate among themselves, they can only wait.

The only way the transaction can complete is for the coordinator to recover. This is why the coordinator must write its commit or abort decision to its transaction log before notifying participants. When it restarts, it reads the log to determine the outcome. Any transaction without a recorded commit decision is aborted. Thus, the real commit point in 2PC is effectively a single-node atomic commit on the coordinator.

Because participants may have to wait indefinitely for the coordinator to recover, 2PC is called a blocking protocol.

### Three-phase commit

Three-phase commit (3PC) was proposed to avoid this blocking problem. However, it assumes bounded network delays and bounded response times. In practical systems with unbounded delays, it cannot guarantee atomicity. More generally, a nonblocking atomic commit requires a perfect failure detector — something that can reliably distinguish a crashed node from one that is just slow. In systems with unbounded network delay, timeouts cannot provide that guarantee. For this reason, 2PC remains in use despite its coordinator failure problem.

### Recovering from coordinator failure

In theory, recovery from coordinator failure is straightforward: when the coordinator restarts, it reads its transaction log and determines the outcome of any in-doubt transactions. It can then send the appropriate commit or abort messages and resolve them.

In practice, however, problems can occur. Sometimes transactions remain permanently in doubt because the coordinator cannot determine their outcome. For example, if the transaction log has been lost or corrupted. These are called orphaned in-doubt transactions. Since their final decision is unknown, they cannot be completed automatically.

Such transactions continue holding locks and blocking other transactions. Rebooting the database servers does not help, because a correct 2PC implementation must preserve the locks of in-doubt transactions across restarts. Releasing those locks would risk violating atomicity.

The only solution in this situation is manual intervention. An administrator must investigate each in-doubt transaction, check the state of its participants, determine whether any of them have already committed or aborted, and then enforce the same outcome on the remaining participants.

## Fault-Tolerant Consensus

Fault-Tolerant Consensus is about getting multiple nodes to agree on a single value, even when some nodes fail. For example, deciding which of several users gets the last seat on a plane or who can register a particular username.

A consensus algorithm must satisfy these properties:

- Uniform agreement: No two nodes decide differently.
- Integrity: No node decides more than once.
- Validity: Any decided value must have been proposed by some node.
- Termination: Every non-crashed node eventually decides a value.

The first three are safety properties (nothing bad happens), while termination is a liveness property (progress happens).

Without fault tolerance, consensus is easy: one node (a “dictator”) decides everything.

With failures, termination becomes tricky: if nodes crash, some algorithms, like 2PC, can get stuck in uncertain states.

---

**Single-Leader Replication and Consensus**

Single-leader replication works by sending all writes to one leader, which then applies them to follower nodes in the same order, keeping replicas consistent. This is a form of total order broadcast.

If the leader is manually chosen, the system relies on a “dictatorial” consensus: only one node makes decisions, and if it fails, progress halts until humans pick a new leader. This approach does not satisfy the **termination property** of consensus because it cannot make progress automatically.

Automatic leader election and failover improve fault tolerance, promoting a new leader if the old one fails. However, this introduces the **split-brain problem**: multiple nodes might believe they are the leader simultaneously, leading to an inconsistent state. To prevent this, the system must run a consensus algorithm to agree on the leader. This creates a seeming paradox: to elect a leader, you need consensus; to run consensus, you often need a leader.

Consensus protocols solve this using **epoch numbering and quorums**. Each leader election is assigned a monotonically increasing epoch number. Within each epoch, there is at most one leader. If multiple leaders appear in different epochs, the one with the higher epoch wins.

Before making decisions, a leader must ensure no other leader with a higher epoch exists. To do this, it collects votes from a **quorum** of nodes, typically a majority. Nodes vote for a proposal only if they are not aware of a higher-numbered leader. This ensures **overlapping quorums**: at least one node participating in a proposal vote also participated in the most recent leader election, preventing conflicting decisions.

This two-phase voting (first for the leader, then for the leader’s proposals) resembles two-phase commit superficially, but with critical differences: 2PC’s coordinator is not elected, 2PC requires unanimous agreement, and it lacks a recovery process for consistency. Fault-tolerant consensus only needs a majority and defines clear recovery steps, ensuring both **safety** (agreement, integrity, validity) and **liveness** (termination) even if some nodes fail.

### Limitations of Consensus Algorithms

1. **Synchronous replication overhead**

Consensus requires nodes to vote on every proposal before it is committed. This is effectively synchronous replication, which can be slower than asynchronous replication. Many databases prefer asynchronous replication for performance, even if it risks some data loss on failover.

1. **Majority requirement**

Consensus requires a strict majority to operate. To tolerate one node failure, you need at least three nodes; to tolerate two failures, at least five. If a network partition occurs, only the majority side can make progress, while the minority is blocked.

1. **Static membership assumptions**

Most algorithms assume a fixed set of voting nodes. Adding or removing nodes dynamically is possible with special extensions, but these are less mature and more complex.

1. **Timeout-based failure detection**

Consensus algorithms rely on timeouts to detect node failures. In geographically distributed systems with variable network delays, nodes may incorrectly suspect the leader of failing. While safety is preserved, frequent false leader elections hurt performance.

## Summary

### Consistency and Replication

- Replication lag occurs when different nodes return different data due to asynchronous replication.
- Eventual consistency guarantees replicas converge over time, but does not ensure a read immediately reflects a prior write.
- Linearizability ensures a read always observes the most recent completed write, providing a single-copy illusion. This is crucial for operations that must be based on up-to-date data (e.g., inventory, payments).

### Replication Models and Linearizability

- Single-leader replication: Linearizable if clients read from the leader or synchronously updated followers. Failover risks losing recent writes.
- Multi-leader replication: Generally not linearizable due to concurrent independent writes and asynchronous propagation.
- Leaderless replication: Usually not linearizable; even quorum-based reads can observe stale data due to timing differences.

### Ordering and Causality

- Causal consistency: Ensures cause-and-effect relationships are preserved; operations dependent on others are ordered, independent operations may remain unordered (partial order).
- Sequence numbers / logical timestamps: Used to track order; in single-leader systems, they naturally preserve causal order, but in multi-leader or leaderless systems, ordering can be inconsistent.
- Total order broadcast: All nodes agree on the same global order of messages, ensuring reliable delivery and consistent log application. Foundation for state machine replication and building linearizable operations.

### Distributed Transactions and Atomic Commit

**Two-Phase Commit (2PC):**

- Prepare phase: Coordinator asks participants if they can commit; participants vote yes/no.
- Decision phase: Coordinator commits if all vote yes, otherwise aborts.
- Guarantees atomicity: either all commit or all abort.
- Blocking issue: If the coordinator crashes after participants vote yes, they enter an in-doubt state until recovery.

**Three-Phase Commit (3PC):**

- Attempts to avoid blocking but requires bounded network delays and perfect failure detection; impractical in real-world asynchronous systems.
- Recovery: Orphaned in-doubt transactions may require manual administrator intervention to resolve.

### Consensus and Fault Tolerance

- Consensus goal: All nodes agree on a single value, even with failures.

**Properties:**

- Uniform agreement: no conflicting decisions
- Integrity: no double decisions
- Validity: only proposed values are chosen
- Termination: all non-faulty nodes eventually decide

**Limitations of Consensus**

- Synchronous replication overhead → slower than asynchronous systems.
- Majority requirement → must have a quorum; minority nodes are blocked during partitions.
- Static membership assumptions → dynamic cluster changes are complex.
- Timeout-based failure detection → false positives can trigger frequent leader elections and reduce throughput.
