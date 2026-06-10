---
title: "DDIA Chapter 7: Transactions"
description: "Notes from DDIA Chapter 7 on transactions, ACID guarantees, single-object operations, and multi-object operations."
pubDate: 2026-06-07
slug: "ddia-chapter-7-transactions"
tags: ["ddia", "databases", "distributed-systems", "systems-design", "transactions"]
draft: false
series: "DDIA"
seriesOrder: 7
---
> DDIA series: Chapter 7 - Transactions
> Part 2: Distributed Data

:::note
Only ACID + single object and multi object operations
:::

## ACID

## Atomicity

Atomicity describes the behavior of an operation that either completes or, if it fails, reverts all of its changes.

**For example,** if we have write operations grouped into an atomic transaction and for some reason the transaction cannot be completed (committed) due to some fault, the transaction has to be aborted, and the database should revert any writes that were made during the transaction.

The database should handle this rollback automatically. Otherwise, we cannot be sure which operations were applied and which caused the failure, potentially leaving the data in an inconsistent or partially updated state.

## Consistency

Consistency means that the database must always remain in a valid or “good” state according to defined business rules (invariants).

These rules are defined and enforced on the application side. If we, as developers, do not correctly implement the application logic, it is possible to perform operations that leave the database in an inconsistent state.

The database alone cannot guarantee consistency in the ACID sense. Unlike atomicity, isolation, and durability, consistency is primarily a property of the application. The database can help enforce certain constraints, but it cannot fully understand business logic.

## Isolation

Isolation ensures that concurrently running transactions can not interfere with each other. They are basically isolated.

When having many users accessing and modifying the same data at the same time, we might expect race conditions to occur. Isolation prevents these transactions to step on each other. It’s more of like serial execution of these transactions, even if they are run concurrently the database ensures that the final result is the same as if they were ran one after another.

## Durability

Durability guarantees that once a transaction has successfully committed, the data it has written won’t be lost, even if crash or other fault occur.

In a single-node database, data mostly is writtten to disk, using mechanisms like write-ahead log to recover from failure.

In replicated database, durability may require that data has been copied to multiple nodes before the transaction is reported as committed.

## Singe and multi Objects

Single-object operations modify only one object at a time. An object could be a single row, document or key-value pair.

Storage engines almost always aim to provide atomicity and isolation at this level, even in DB that do not support full transactions.

Examples:

- If you are writing a JSON document and an error occurs, the database should not store only half of the document.
- If the database crashes while overwriting a value, it should not mix the old and the new values.
- If one client reads an object while another client is updating it, the reader should see either the old value or the new value — not a partially updated result.

These guarantees are typically implemented using mechanisms such as write-ahead logs (WAL) for crash recovery (atomicity) and locks on individual objects to prevent concurrent updates (isolation).

Some databases also provide operations such as compare-and-set or atomic increment, which help prevent lost updates when multiple clients modify the same object concurrently.

---

Multi-object operations groups several operations on different objects (rows, documents, etc) into a single transaction.

The atomicity ensures that either all of the writes succeed or all of them are rolled back, while Isolation ensures that other transactions see either all of the changes or none of them. This is important when multiple objects has to remain in sync.

Example:

- Let’s say we have an email inbox, when the system sends an email to our inbox the counter should increment, if this is not happening in one unit of work, a fault can make these related data inconsistent. Both of the changes has to be applied together.

Multi-object transactions are also important when maintaining relationships between records, such as foreign key references in relational databases. If several related rows are inserted or updated, they must remain consistent with each other. Similarly, when updating data that has secondary indexes, the main record and its indexes must be updated together. Without transactional guarantees, a record might appear in one index but not another, depending on timing.

While some applications can be built using only single-object operations, many real-world scenarios require coordinating writes across multiple objects. Without multi-object transactions, error handling becomes more complex, and the application must manually deal with partial failures and inconsistencies.

Transactions simplify this by allowing the database to treat a group of related operations as one indivisible unit.
