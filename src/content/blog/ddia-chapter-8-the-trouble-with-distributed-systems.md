---
title: "DDIA Chapter 8: The trouble with Distributed Systems"
description: "Notes from DDIA Chapter 8 on faults, partial failures, unreliable networks, clocks, and distributed-system uncertainty."
pubDate: 2026-06-08
slug: "ddia-chapter-8-the-trouble-with-distributed-systems"
tags: ["ddia", "databases", "distributed-systems", "systems-design", "fault-tolerance"]
draft: false
series: "DDIA"
seriesOrder: 8
---
> DDIA series: Chapter 8 - The trouble with Distributed Systems
> Part 2: Distributed Data

:::note
Only faults and partial failures + unreliable networks
:::

## Faults and Partial Failures

There is no fundamental reason why software running on a single computer should be flaky when the hardware is working as expected. Every operation produces the same output. However, if the hardware is having issues most of the time, this can cause a total shutdown of the system.

Computers are made in such a way that if an internal/ hardware fault occurs, the computer crashes completely, instead of giving a wrong result, because working in that state is rather confusing and hard to deal with.

When it comes to distributed systems, there are **partial failures**, which are when some of the components in the system have crashed while others are working correctly.

Working in distributed systems is a hard problem to deal with because we have to accept the possibility of partial failures and aim to build fault-tolerant software.

## Unreliable Networks

Share-nothing systems are a bunch of machines connected by a network. Each machine has its hardware, and other machines can not access its memory or disk storage directly.

In internal/local networks, like in datacenters which are using Ethernet, one node can send a packet to another node, but the network doesn’t guarantees if it’s going to arrive at all. So if we send a request and wait for a response, different things can go wrong.

- The request can be lost due to an unplugged network cable.
- The receiver’s network may be congested, so the request waits in a queue.
- The remote node may have failed and therefore never sent a response.

In such asynchronous networks, it is impossible to know why a response has not been received. The message could be delayed, lost, or the node could have crashed. Because of this uncertainty, clients typically wait for some period of time before giving up. **(Timeout)**

## Detecting Faults

Many systems need to automatically detect faulty nodes.

- A load balancer should stop sending requests to a node that is considered dead.
- In a replicated database with single-leader replication, if the leader fails, one of the replicas must be promoted to become the new leader.

It’s possible to receive feedback from nodes when the software that is running on them is not working:

- If the operating system is still running, a monitoring process may notify other nodes about a crash.
- If a connection attempt is made and no process is listening on the destination port, the OS may immediately reject the connection (for example, by sending a TCP reset).

## Timeouts and Unbounded Delays

As I said, timeouts are the only sure way to “detect” a fault. A long timeout can make the system wait a long time, while the node on the other end is declared dead. A short timeout may detect this kind of case faster, however if may cause false positives i.e nodes that have suffered a temporary slowdown.

Declaring a node as dead prematurely is a problem because another node can overtake its work, and if the previous one was in the middle of some process of modifying data, we can cause a duplication of that process.

Switching nodes due to marking a node dead, while having a high load of requests, can cause a cascading failure due to marking all subsequent nodes as dead too, because of the high load that can not be handled.

## Sync vs Async networks

Distributed systems would be much simpler if the network guaranteed that packets were always delivered within a fixed maximum time and were never lost. However, real-world datacenter networks and the internet do not work like that.

Computer networks (Ethernet and IP) are packet-switched and asynchronous. Packets share the network dynamically, competing for bandwidth. As a result:

- Packets may be delayed due to queueing.
- Packets may be dropped.
- Delays can be unbounded.
- There is no guaranteed maximum response time.

This design exists because computer traffic is bursty.

For example, when transferring a file or loading a web page, we want to use as much bandwidth as possible for a short time, rather than reserving a fixed amount that might be wasted.

---

In real distributed systems, we must assume:

- Network delays are unpredictable.
- Packets can be lost.
- Nodes may appear slow or unreachable without being crashed.
- There is no “correct” timeout value — timeouts must be chosen experimentally.

In practice, we design distributed systems under the assumption that the network is asynchronous and unreliable, and we build mechanisms (timeouts, retries, replication, leader election) to cope with that uncertainty.
