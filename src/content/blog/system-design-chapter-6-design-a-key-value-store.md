---
title: "System Design Chapter 6: Design A Key-Value Store"
description: "Notes from System Design Interview Chapter 6 on key-value store design, APIs, partitioning, replication, consistency, and failure handling."
pubDate: 2026-03-06
slug: "system-design-chapter-6-design-a-key-value-store"
tags: ["system-design", "databases", "key-value-store"]
draft: false
series: "System Design Interview"
seriesOrder: 6
---
> System Design Interview series: Chapter 6 - Design A Key-Value Store
> Summarizing chapters

A key-value store is a non-relational database that stores data as a collection of key–value pairs, where each unique key is associated with a single value.

Keys must be unique and are typically strings, though they may represent hashed values depending on the system design. For example:

| Key            | Value     |
| -------------- | --------- |
| last_logged_in | 198382131 |
| 6734273        | 198382131 |

The value can be any data that can be serialized, such as strings, numbers, JSON objects, etc.

### Single-server key-value store

A single-server key-value store is easy to implement because all data is managed by one machine. Frequently accessed data is typically stored in memory for fast access, while less frequently accessed data is persisted on disk.

When memory is limited, techniques such as data compression can be used to increase the amount of data stored in memory. However, this design does not scale well and introduces a single point of failure, making it unsuitable for large-scale or highly available systems.

### CAP theorem

**Consistency**: clients should be working with the same data at the same time across different nodes/instances

**Availability**: services should be able to return a response to the client even though some of the nodes may be down.

**Partition Tolerance**: the system should continue working despite network issues/failures between services

---

Designing a real-world key-value store forces us to always choose partition tolerance and then make a trade-off between consistency and availability. This is because network partitions can always happen, and systems must continue operating without cascading failures across services.

If we prioritize consistency, the system may need to block or reject read/write operations while another write is in progress. This prevents clients from reading stale data.

For example, in banking systems where data correctness is critical, it is better to return an error or delay the response rather than serve outdated account information. This ensures that clients always observe the most up-to-date state.

If we prioritize availability, the system will continue to return responses even while a write is happening. In this case, different nodes may temporarily return stale data, and updates are propagated and synchronized across nodes eventually.

---

### System components

1. **Data partition**

At scale, one key value store service won’t be able to handle/store all of the information within in-memory or on disk, also It will be hard to handle a lot of concurrent requests, and it will be a single point of failure. That’s why we need to partition the data within multiple nodes/services. This is done by splitting the data and storing pieces on different nodes.

Example of data partition:

Users from 0-1000 go to server 1

Users from 1000-2000 go to server 2

However, two problems occur that make the data partition complex:

- partition the data evenly across the servers
- When adding or removing servers, we have to minimize the whole data

These problems are often solved using consistent hashing because adding or removing servers only affects a small portion of the hash ring. As a result, only a limited number of keys need to be remapped, while most keys remain on the same servers.

Also, by using virtual nodes, each server is responsible for multiple smaller partitions across the ring rather than a single large one. This distributes data more evenly across servers and reduces the load imbalance.

---

1. **Data replication**

To make data available across multiple nodes, replication is used. Each key is replicated to N unique servers, where N is the replication factor. After finding the main server for a key on the hash ring, replicas are placed on the next N−1 unique servers encountered while moving clockwise.

When virtual nodes are used, it is possible to encounter multiple virtual nodes that belong to the same physical server. In such cases, only unique physical servers are selected to ensure proper replication.

Also, to prevent data loss in case of large-scale failures, such as data center outages, replicas can be distributed across different data centers.

---

1. **Consistency**

Because data is replicated across multiple nodes, the system must ensure that reads and writes have access to the same data. This is controlled using three parameters:

**N** – the number of replicas for each key

**W** – the minimum number of replicas that must acknowledge a write for it to be considered successful

**R** – the minimum number of replicas that must respond to a read

For example, if N = 3 and W = 1, the coordinator can return a successful write response after receiving an acknowledgment from only one replica. Similarly, if R = 1, the coordinator can return a read response after receiving data from a single replica. This results in low latency but allows stale reads.

When **W + R > N**, the system guarantees strong consistency because every read overlaps with the most recent successful write on at least one replica. This ensures that a read will always see the most recent successful write. The trade-off is increased latency, as the coordinator must wait for more replicas to respond.

---

1. **Consistency models**

There are different types of consistencies:

1. **Strong consistency**
   The system guarantees that a client will never read stale data. After a successful write, all subsequent reads return the latest value. This often comes at the cost of higher latency, since the system may need to wait for replicas to perform the write before serving reads.

2. **Weak consistency**
   The system does not guarantee that a read will return the most recent write. Clients may see stale data, and there is no guarantee on when replicas become consistent.

3. **Eventual consistency**
   The system guarantees that, if no new updates are made, all replicas will eventually get to the same value. Reads may return stale data in the short term, but consistency is achieved over time.

As I mentioned, strong consistency may be ensured by frequently blocking read operations to prevent stale reads, which is undesirable because waiting introduces latency. For the example in this chapter, eventual consistency is chosen, which is also used in other stores, such as Casandra and DynamoDB.

---

1. **Inconsistency resolution: versioning**

Replicating data across multiple servers improves availability, but it can lead to inconsistency when replicas are not perfectly synchronized. In an eventually consistent system, different replicas may temporarily store different values for the same key.

For example, replicas A and B initially store the same data: `{ "name": "Petar" }`. If a write updates replica A to `{ "name": "Gosho" }` and another writes independently updates replica B to `{ "name": "Mitko" }`The replicas now hold different values for the same key. As a result, read operations may return different results depending on which replica is queried.

**Vector clocks**

This is metadata attached to a data item and consists of a set of pairs in the form
`[server_id, number_of_updates]`. Each server maintains its own counter.

Vector clocks are used to determine whether one version of a data item happened after another,
whether two versions are conflicting, or whether one version is outdated.

When a server updates a data item, it increments its own counter in the vector clock. When an
update is based on a previously read version, the server copies the existing vector clock, and
increments its own entry.

Here is an example showing updates of the same Data Item by one or different servers:

![Chapter 6 Design A Key-Value Store figure 1](/images/system-design/chapter-6-design-a-key-value-store/1.png)

A conflict occurs when two or more servers independently update the same data item. In this case, their vector clocks are concurrent, and conflict resolution is required.

Vector clocks have two downsides.

First, they increase application complexity. While vector clocks can detect conflicting
updates, they do not resolve them. The application using the key-value store must implement the conflict resolution logic.

Second, vector clocks can grow in size as more servers update the same data item. Since
each vector clock contains one entry per server, this metadata can become
large in highly distributed systems. To limit growth, a threshold is enforced. This reduces
overhead but may weaken the ability to detect all conflicts. (Some paper from Amazon says, everything is fine…)

---

1. **Handling failures**

**Failure detection**

In distributed systems, to detect if a service is down, we would need at least two sources of information.

One solution is to use the gossip protocol. In this model, each node maintains a record of heartbeat information for other nodes. Nodes periodically exchange this information with each other.

If a node detects that another node’s heartbeat has not been updated for a certain period of time, it marks that node as potentially failed and gossips this suspicion to other nodes. Once multiple nodes independently confirm the missing heartbeats, the system can safely conclude that the node has failed.

---

1. **System design architecture**

![Chapter 6 Design A Key-Value Store figure 2](/images/system-design/chapter-6-design-a-key-value-store/2.png)

In this architecture, any node in the cluster can act as a coordinator. A client sends read
or write requests to a node (for example, n6), which temporarily assumes the coordinator
role for that request.

The coordinator node uses the hash ring and uses consistent hashing to route the
request to the appropriate replica nodes. It is also responsible for coordinating reads
and writes, collecting responses from replicas, and applying consistency rules before
responding to the client.

There is no single point of failure in the system, since all nodes are equal and capable of
acting as coordinators. If a coordinator node fails, the client can retry the request with
another node.

Each node in the cluster runs the same logic, including replication, consistency handling,
failure detection, inconsistency resolution, and data synchronization. The
system relies on replication and eventual consistency to provide high availability.

---

1. **Write and Read Paths**

### Write path

When a client issues a write request, it sends the request to the coordinator node. The coordinator uses consistent hashing to identify the N replica nodes responsible for the key and forwards the write request to them.

Once the coordinator receives acknowledgments from W replicas, the write is considered successful, and a response is returned to the client.

### Read path

When a client issues a read request, it contacts the coordinator for the request. The coordinator identifies the N replica nodes responsible for the key and sends read requests to them.

After receiving responses from R replicas, the coordinator selects the most recent version of the data and returns it to the client.
