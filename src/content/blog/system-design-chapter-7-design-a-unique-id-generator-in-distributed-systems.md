---
title: "System Design Chapter 7: Design A Unique ID Generator In Distributed Systems"
description: "Notes from System Design Interview Chapter 7 on distributed unique ID generation, UUIDs, tickets, Snowflake IDs, and tradeoffs."
pubDate: 2026-03-07
slug: "system-design-chapter-7-design-a-unique-id-generator-in-distributed-systems"
tags: ["system-design", "distributed-systems", "id-generation"]
draft: false
series: "System Design Interview"
seriesOrder: 7
---
> System Design Interview series: Chapter 7 - Design A Unique ID Generator In Distributed Systems
> Summarizing chapters

### Step 1: Understand the problem and define the design scope

Following the book’s example, the first step is to remove ambiguity by clarifying what we are trying to achieve. Here are a few questions that help define the scope for this system design:

1. What are the characteristics of the unique IDs?
    1. They must be **unique** and **sortable** (sortability is a key requirement).
2. Should IDs be incremented for every new record?
    1. Not strictly. They should increase with time. For example, IDs generated at night should be larger than those generated in the morning of the same day.
3. Are the IDs numeric only?
    1. Yes.
4. What is the size of an ID?
    1. It should be **64 bits**.
5. What is the expected throughput for ID generation?
    1. Each server should be able to generate **10,000 IDs per second**.

After gathering these requirements, we have:

1. Sortable and unique IDs
2. Numeric only
3. Increasing over time
4. 64-bit IDs size
5. 10,000 IDs/second per server

---

### Step 2: Propose a high-level architecture

There are a few common approaches to ID generation:

- Multi-master replication
- Universally Unique Identifier (UUID)
- Ticket server
- Twitter Snowflake ID generator

---

1. **Multi-master replication**

In this approach, IDs are auto-incremented, but not by 1. Instead, the increment is based on *k*, where *k* is the number of database nodes.

Example:

If we have 2 servers:

- Server 1 generates IDs: 1, 3, 5, …
- Server 2 generates IDs: 2, 4, 6, …

Downsides:

- It is hard to scale across multiple data centers.
- IDs do not increase strictly with time, which violates our “time-sortable” requirement.

---

1. **UUIDs**

A UUID is a 128-bit identifier made of characters and numbers. Collisions are extremely unlikely, so UUIDs scale well and can be generated independently on each server without coordination.

Cons for our use case:

- Not numeric only.
- 128 bits, which exceeds the 64-bit requirement.
- Not naturally increasing with time.

---

1. **Ticket server**

In this approach, a dedicated service generates IDs and keeps track of them. Other services call it whenever they need an ID.

The main issue is that it becomes a single source of truth, and therefore a single point of failure. If the ticket server is down, the rest of the system cannot create new IDs.

Pros:

- Generates numeric IDs.
- Easy to implement.

Cons:

- Single point of failure.

---

1. **Twitter Snowflake approach**

Each generated ID consists of multiple parts packed into a 64-bit number:

- 1 bit: sign bit (usually 0, can show whether it’s signed or unsigned)
- 41 bits: timestamp (milliseconds since a custom epoch)
- 5 bits: data center ID (assigned at service startup)
- 5 bits: machine ID (assigned at service startup)
- 12 bits: sequence number (incremented for IDs generated on the same machine within the same millisecond; resets when the millisecond changes)

This approach fits our use case because it:

- Produces 64-bit numeric IDs.
- Increases over time (sortable by creation time).
- Scales.

---

### Step 3: Deep dive

For the ID generator, we choose the Twitter Snowflake approach.

**Data center ID** and **machine ID** are fixed (assigned at startup), while the **timestamp** and **sequence number** change for each generated ID.

Because 41 bits are allocated to the timestamp, we can sort IDs by their numeric value to get chronological ordering (assuming the same epoch and a consistent generation strategy).

To extract the timestamp, we:

- Take the timestamp bits from the ID.
- Convert them to a number.
- Add the custom epoch to obtain the real time.

Depending on which epoch we choose, we may eventually need to update it in the far future (once the 41-bit timestamp range is exhausted).

The sequence number is incremented for each ID generated on the same machine within the same millisecond. With 12 bits, the maximum number of IDs per millisecond per machine is:

2^{12} = 4096

This is typically enough, and if we exceed it, the generator can wait for the next millisecond.

---

### Step 4: Wrap up

We discussed a few methods:

- Multi-master replication
- Ticket server
- UUIDs
- Twitter Snowflake approach

For our requirements, we choose the Twitter Snowflake approach because it supports **time-sortable, numeric, 64-bit IDs** at high scale.
