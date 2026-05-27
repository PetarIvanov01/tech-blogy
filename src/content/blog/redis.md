---
title: "Redis Explained: Data Structures, Atomicity, and Production Patterns"
description: "A practical guide to Redis as an in-memory data structure store, including core data types, TTLs, atomic operations, Lua scripts, distributed locks, sharding, rate limiting, cache stampede protection, replication, and production trade-offs."
pubDate: 2026-05-24
tags: ["redis", "databases", "distributed-systems", "backend", "caching"]
---

# Redis Explained: Data Structures, Atomicity, and Production Patterns

## Summary

**Redis** stands for **Remote Dictionary Server**. It is a very fast, network-accessible, **in-memory data structure store** that stores data as **key-value pairs**.

Redis is often used as a **cache**, but it can also be used for **sessions**, **rate limiting**, **counters**, **leaderboards**, **queues**, **distributed locks**, **temporary tokens**, **Pub/Sub messaging**, and other fast shared-state problems in distributed systems.

The most important Redis idea is this:

> **Redis is not mainly about general-purpose querying. Redis is about designing keys and data structures around the exact access patterns your application needs to answer quickly.**

In production, Redis is usually best used as an **acceleration and coordination layer** next to a durable system of record such as PostgreSQL, MySQL, or another primary database.

---

## What Is Redis?

Redis stores values under keys.

For example:

```text
user:123:name -> "Petar"
cart:456 -> ["item1", "item2", "item3"]
post:999:likes -> 153
```

Using a key, Redis gives you the value.

The key idea of Redis is that it is an **in-memory data structure store**. This means Redis keeps data primarily in **RAM**, not on disk, and its values are not limited to plain strings.

Redis supports built-in data structures such as:

- **Strings**
- **Lists**
- **Sets**
- **Sorted Sets**
- **Hashes**
- **Streams**
- **Bitmaps**
- **HyperLogLogs**
- **Geospatial indexes**

This makes Redis useful both as a very fast cache and as a shared data-structure server for distributed systems.

Traditional databases such as **PostgreSQL**, **MySQL**, or **Oracle** are usually better when you need:

- Strong persistence
- Joins
- Indexes
- Transactions
- Relational constraints
- Complex queries

However, many production systems also need extremely fast operations like:

```text
Get this user session.
Increment this counter.
Check whether this user has already liked a post.
Store a temporary login token.
Keep the latest 100 events.
Rate-limit this API user.
Cache this expensive database query.
```

For these cases, going to disk like a traditional database often does can be too slow or too expensive.

Redis was built to solve this kind of problem:

> **I need a very fast, network-accessible, shared data structure store that many application servers can use.**

Redis is commonly used for:

- **Caching**
- **Session storage**
- **Rate limiting**
- **Counters**
- **Leaderboards**
- **Queues**
- **Distributed locks**
- **Pub/Sub messaging**
- **Real-time analytics**
- **Feature flags**
- **Temporary tokens**
- **Deduplication**

---

## Why Is Redis So Fast?

The biggest reason Redis is fast is that it primarily works **in memory**.

RAM access is much faster than disk access. A traditional database may need to read from disk, update indexes, write transaction logs, coordinate locks, and guarantee durability. Redis usually performs simple operations on in-memory data structures.

Examples:

```text
INCR page_views
```

Increments a counter in memory.

```text
SADD post:123:liked_by user:456
```

Adds a user ID to a set.

```text
LPUSH queue:emails email_job_1
```

Pushes a job into a list.

Redis is fast because many operations are direct, simple, and memory-based.

---

## Redis Is Not Just a Cache

Many people first hear about Redis as a cache. Redis can absolutely be used as a cache, but it can also act as:

- A **primary database** for some workloads
- A **message broker**
- A **queue backend**
- A **real-time counter store**
- A **session store**
- A **rate limiter**
- A **leaderboard engine**
- A **coordination primitive**

The key question is not:

> Is Redis a database or a cache?

A better question is:

> **What kind of state do I need, how fast does it need to be, how durable must it be, and what consistency guarantees do I need?**

---

# Redis Data Model

## Every Redis Entry Has a Key

In Redis, every entry has a **key**.

A key is a binary-safe string. Examples:

```text
user:123
user:123:profile
session:abc123
post:43:likes
queue:emails
cache:homepage
```

Redis itself does **not** understand `:` as a hierarchy. The colon is only a naming convention that humans use.

So this key:

```text
user:123:profile
```

Does **not** mean Redis has folders like this:

```text
user / 123 / profile
```

It is one flat key name.

The `:` convention is useful because it makes keys easy to group mentally and operationally.

For example:

```text
user:123:name
user:123:settings
user:123:sessions
```

For one user ID, you can store the user's name, settings, and sessions using related key names.

---

## Values Are Typed Data Structures

Each Redis key points to a value. That value can be one of several Redis data structures:

- **String**
- **Hash**
- **List**
- **Set**
- **Sorted Set**
- **Stream**
- **Bitmap**
- **HyperLogLog**
- **Geospatial index**

The core Redis types you should understand first are:

1. **Strings**
2. **Hashes**
3. **Lists**
4. **Sets**
5. **Sorted Sets**

---

## Strings

A Redis string is the simplest Redis type. It can store text, JSON, a number, or binary data.

Example:

```text
SET user:123:name "Petar"
GET user:123:name
```

Result:

```text
"Petar"
```

Strings are often used for:

- Caching serialized objects
- Counters
- Feature flags
- Tokens
- Simple values

Example counter:

```text
SET page_views 0
INCR page_views
INCR page_views
GET page_views
```

Result:

```text
2
```

Even though Redis stores this as a string internally, Redis understands numeric operations like `INCR`.

A very common cache pattern is storing serialized JSON:

```text
SET cache:user:123 '{"id": 123, "name": "Petar"}'
GET cache:user:123
```

This stores a serialized object, usually JSON.

> **Important:** Normal Redis does not understand the fields inside the JSON unless you use a module such as RedisJSON. To normal Redis, that JSON is just a string.

---

## Hashes

A Redis hash is like a small dictionary stored at one key.

Example:

```text
HSET user:123 name "Petar" age "28" country "Bulgaria"
HGET user:123 name
HGETALL user:123
```

Conceptually:

```text
user:123 -> {
  "name": "Petar",
  "age": "28",
  "country": "Bulgaria"
}
```

Hashes are useful when you want to store an object with fields and update individual fields.

For example:

```text
HSET user:123 last_login "2026-05-25"
HINCRBY user:123 login_count 1
```

This is better than storing the whole user as JSON if you often update individual fields.

Using string JSON:

```text
SET user:123 '{"name": "Petar", "age": "28", "login_count": 4}'
```

To increment `login_count`, your app usually needs to:

```text
GET user:123
parse JSON
modify login_count
serialize JSON
SET user:123
```

Using a hash, Redis can update only the field you need:

```text
HINCRBY user:123 login_count 1
```

Redis updates just that field.

---

## Lists

A Redis list is an ordered sequence of strings.

You can push items to the left or right:

```text
LPUSH queue:emails email_job_1
LPUSH queue:emails email_job_2
RPOP queue:emails
```

Conceptually:

```text
queue:emails -> [email_job_2, email_job_1]
```

This happens because `LPUSH` pushes each item onto the left side of the list.

Lists are useful for:

- Simple queues
- Recent activity feeds
- Ordered logs
- Stacks

Example: keep the latest events for a user.

```text
LPUSH user:123:events "logged_in"
LPUSH user:123:events "viewed_product"
LPUSH user:123:events "added_to_cart"
LTRIM user:123:events 0 99
```

This keeps only the latest 100 events.

Important mental model:

```text
LPUSH + LPOP = stack behavior
LPUSH + RPOP = queue behavior
```

A **stack** is last-in, first-out.

A **queue** is first-in, first-out.

---

## Sets

A Redis set is an unordered collection of unique strings.

Example:

```text
SADD post:42:liked_by user:1
SADD post:42:liked_by user:2
SADD post:42:liked_by user:1
SMEMBERS post:42:liked_by
```

Result:

```text
user:1
user:2
```

`user:1` appears only once because sets enforce uniqueness.

Sets are useful for:

- Deduplication
- Membership checks
- Tags
- Followers/following
- Liked posts
- Unique users

Example membership check:

```text
SISMEMBER post:42:liked_by user:1
```

This asks:

> Has `user:1` liked `post:42`?

Redis sets also support set operations:

```text
SINTER users:interested_in_redis users:from_bulgaria
```

Returns users who are in **both** sets.

```text
SUNION set:a set:b
```

Returns users who are in **either** set.

```text
SDIFF set:a set:b
```

Returns members in `set:a` but not in `set:b`.

This makes Redis sets useful for relationship and filtering problems.

---

## Sorted Sets

A Redis sorted set is like a set, but every member has a **score**.

Example:

```text
ZADD leaderboard 1500 user:1
ZADD leaderboard 900 user:2
ZADD leaderboard 2200 user:3
```

Conceptually:

```text
leaderboard -> {
  user:2: 900,
  user:1: 1500,
  user:3: 2200
}
```

You can ask for the top users:

```text
ZREVRANGE leaderboard 0 9 WITHSCORES
```

Sorted sets are useful for:

- Leaderboards
- Rankings
- Priority queues
- Time-based indexes
- Scheduled jobs
- Trending content

Example: top 10 players in a game.

```text
ZREVRANGE game:leaderboard 0 9 WITHSCORES
```

Example: scheduled jobs.

```text
ZADD scheduled_jobs 1716552000 job:send_email:123
```

The score can represent a Unix timestamp. Workers can then fetch jobs whose score is less than or equal to the current time.

---

## Expiration and TTL

One of Redis's most important features is that keys can expire automatically.

Example:

```text
SET session:abc123 "user:123"
EXPIRE session:abc123 3600
```

This stores the session for 3,600 seconds. After that, Redis can delete it automatically.

You can also set the value and expiration together:

```text
SET session:abc123 "user:123" EX 3600
```

**TTL** means **time to live**.

You can check the remaining TTL like this:

```text
TTL session:abc123
```

Common TTL uses:

- Sessions
- Login tokens
- Password reset tokens
- Cache entries
- Rate limiting windows
- Temporary locks

Example password reset token:

```text
SET reset_token:xyz user:123 EX 900
```

This token expires after 15 minutes.

---

## Redis Database Structure

Redis has logical databases numbered like this:

```text
0
1
2
...
```

By default, most clients use database `0`.

You can switch databases with:

```text
SELECT 1
```

In production, many teams avoid relying heavily on multiple Redis logical databases. They often prefer separate Redis instances or clusters for cleaner separation.

The basic model is:

```text
One Redis deployment has a large flat keyspace.
Each key has a type.
Each key may have an expiration.
```

---

## How to Choose a Redis Data Type

### Decision Guide by Need

| Need                                             | Redis type                      |
| ------------------------------------------------ | ------------------------------- |
| Store a simple value                             | **String**                      |
| Cache serialized JSON                            | **String**                      |
| Increment a counter                              | **String** with `INCR` / `DECR` |
| Store an object with fields                      | **Hash**                        |
| Update one field inside an object                | **Hash**                        |
| Keep an ordered list of recent items             | **List**                        |
| Build a simple queue                             | **List**                        |
| Store unique members                             | **Set**                         |
| Check membership quickly                         | **Set**                         |
| Find intersections or differences between groups | **Set**                         |
| Build a leaderboard                              | **Sorted Set**                  |
| Rank items by score                              | **Sorted Set**                  |
| Schedule jobs by timestamp                       | **Sorted Set**                  |
| Store time-ordered event streams                 | **Stream**                      |
| Count approximate unique values                  | **HyperLogLog**                 |
| Store temporary data                             | **Any type + TTL**              |

### Decision Guide by Problem

| Problem                                    | Redis type or tool                      |
| ------------------------------------------ | --------------------------------------- |
| Cache a database query result              | **String + TTL**                        |
| Store user sessions                        | **String or Hash + TTL**                |
| Track page views                           | **String counter**                      |
| Check whether a user liked a post          | **Set + `SISMEMBER`**                   |
| Store followers or following relationships | **Set**                                 |
| Show top players                           | **Sorted Set**                          |
| Keep the latest 100 user events            | **List + `LTRIM`**                      |
| Process background jobs                    | **List**, **Stream**, or **Sorted Set** |
| Rate-limit API requests                    | **Counter + TTL**, often with **Lua**   |
| Prevent duplicate worker processing        | **Lock with token + TTL**               |
| Prevent cache stampedes                    | **Lock + stale cache strategy**         |
| Run multi-step logic atomically            | **Lua script** or **MULTI/EXEC**        |
| Scale memory and throughput                | **Redis Cluster sharding**              |

---

## The Most Important Redis Mindset

In SQL, we often model data around tables and relationships:

```text
users table
posts table
likes table
comments table
```

In Redis, we model around **access patterns**.

First, ask:

> **What exact question do I need to answer quickly?**

Then design the key and data type for that question.

Question:

```text
Has user 123 liked post 42?
```

Good Redis model:

```text
SISMEMBER post:42:liked_by user:123
```

Question:

```text
Who are the top 10 players?
```

Good Redis model:

```text
ZREVRANGE leaderboard 0 9 WITHSCORES
```

Question:

```text
What is the user session for this token?
```

Good Redis model:

```text
GET session:abc123
```

Redis is fast partly because it avoids general-purpose querying. You design the key and data structure so the operation is direct.

---

# Redis Concepts for Production Systems

The most important Redis concepts for production systems are:

1. **Atomicity and race conditions**
2. **Transactions and Lua scripts**
3. **Distributed locks**
4. **Partitioning and sharding**
5. **Redis in distributed production systems**
6. **Important failure modes**

---

## Redis and Race Conditions

A race condition happens when multiple clients interact with shared state at the same time, and the final result depends on timing.

Imagine an e-commerce system with one item left in stock:

```text
inventory:product:iphone_15 = 1
```

Two users click **Buy** at almost the same time.

Naive application logic:

```text
Client A: GET inventory
Client B: GET inventory

Client A sees 1
Client B sees 1

Client A decrements to 0
Client B decrements to 0

Both orders succeed.
```

This is bad. The system sold one item twice.

The problem is not Redis itself. The problem is that the application performed a read-modify-write sequence across multiple separate commands:

```text
GET
check in application
SET / DECR
```

Between those commands, another client can interfere.

---

## Redis Commands Are Atomic

Redis executes individual commands atomically. That means one command runs to completion before another command is processed.

This is safe as a single operation:

```text
DECR inventory:product:iphone_15
```

But it may not be logically safe, because inventory could become negative:

```text
inventory = -1
```

The real rule is:

> **A single Redis command is atomic, but your multi-step business logic is not automatically atomic.**

If your business rule is:

```text
Only decrement if inventory > 0
```

Then the check and the decrement need to happen as one atomic operation.

---

## Realistic Example: Safe Inventory Reservation

Suppose you are building ticket sales.

You want this behavior:

```text
If remaining tickets > 0:
  decrement remaining tickets
  create reservation with TTL
else:
  reject purchase
```

Naive version:

```text
GET concert:123:tickets_remaining
if tickets_remaining > 0:
  DECR concert:123:tickets_remaining
  SET reservation:concert:123:user:456 "reserved" EX 600
```

This can race.

A better version is to use a **Lua script**.

Redis can execute Lua scripts atomically. While the script is running, Redis does not interleave commands from other clients. Redis also supports transactions with `MULTI` / `EXEC`, but Lua is often clearer when you need conditional logic.

Conceptual Lua script:

```lua
local stock_key = KEYS[1]
local reservation_key = KEYS[2]
local ttl_seconds = ARGV[1]

local stock = tonumber(redis.call("GET", stock_key) or "0")

if stock <= 0 then
  return {err = "SOLD_OUT"}
end

redis.call("DECR", stock_key)
redis.call("SET", reservation_key, "reserved", "EX", ttl_seconds)

return "RESERVED"
```

Called with:

```text
KEYS[1] = concert:123:tickets_remaining
KEYS[2] = reservation:concert:123:user:456
ARGV[1] = 600
```

Now these steps happen as one atomic server-side operation:

- Check stock
- Decrement stock
- Create reservation

This prevents the oversell race.

---

## Redis Transactions: MULTI / EXEC

Redis also has transactions:

```text
MULTI
DECR account:123:balance
INCR account:456:balance
EXEC
```

Redis queues the commands between `MULTI` and `EXEC`, then runs them sequentially without interleaving another client's commands.

But Redis transactions are not exactly like SQL transactions.

In PostgreSQL, you might expect rollback, isolation levels, constraints, and complex transaction behavior. Redis transactions are simpler:

```text
1. Queue commands.
2. Execute them as a batch.
3. Do not interleave other commands during execution.
```

For conditional updates, Redis has `WATCH`:

```text
WATCH inventory:product:iphone_15
GET inventory:product:iphone_15

if value > 0:
  MULTI
  DECR inventory:product:iphone_15
  EXEC
```

If another client modifies the watched key before `EXEC`, the transaction fails and the client retries.

This is **optimistic concurrency control**. In production, for many Redis workflows, Lua scripts are often easier because the condition and mutation live together on the Redis server.

---

## Distributed Locks: Why They Exist

Imagine you have 20 backend workers processing payment retries. Only one worker should process a given payment at a time.

```text
payment:789
```

Without coordination:

```text
Worker A starts processing payment:789
Worker B also starts processing payment:789

Both call the external payment provider.
The customer may be charged twice.
```

A lock is a way to say:

```text
I am working on payment:789.
Nobody else should work on it until I finish or until the lock expires.
```

In Redis, a basic lock uses `SET` with options:

```text
SET lock:payment:789 unique_token NX PX 30000
```

Meaning:

```text
Set this key only if it does not already exist.
Expire it automatically after 30 seconds.
Store my unique ownership token as the value.
```

Important pieces:

```text
NX = only acquire if the lock does not exist
PX = expiration in milliseconds
unique_token = proves ownership
```

---

## Why Lock Release Needs Care

Bad unlock:

```text
DEL lock:payment:789
```

Why is this unsafe?

Scenario:

```text
Worker A gets the lock for 30 seconds.
Worker A pauses for 40 seconds because of GC or network slowness.
The lock expires.

Worker B gets a new lock.
Worker A resumes and calls DEL lock:payment:789.
Worker A accidentally deletes Worker B's lock.
Worker C can now get the lock too.
```

The unlock operation must say:

> **Delete the lock only if the value is still my unique token.**

That check-and-delete must be atomic.

Lua unlock script:

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

This prevents a worker from deleting another worker's lock.

---

## Redlock: Distributed Locking Across Multiple Redis Nodes

A single Redis-instance lock has a problem:

```text
Client A acquires lock on primary.
Primary crashes before replicating the lock.
Replica is promoted.
Client B acquires the same lock.
Now A and B both think they own it.
```

Redis has a more robust distributed locking algorithm called **Redlock**, where a client tries to acquire the lock from multiple independent Redis masters and succeeds only if it obtains a majority within the lock validity time.

Conceptually:

```text
Redis node 1: lock acquired
Redis node 2: lock acquired
Redis node 3: lock acquired
Redis node 4: failed
Redis node 5: failed

3 out of 5 acquired => lock accepted
```

However, Redlock is controversial for correctness-critical locking. If the lock protects correctness rather than just efficiency, you may need stronger guarantees and often a different coordination system, such as a consensus-backed system.

---

## Partitioning and Sharding

A single Redis instance has limits:

- Memory limit of one machine
- CPU limit of one Redis process
- Network bandwidth limit
- Single-node failure domain

To scale horizontally, you split data across multiple Redis nodes. This is called **sharding** or **partitioning**.

Simple conceptual example:

```text
Node A stores users 1-1,000,000
Node B stores users 1,000,001-2,000,000
Node C stores users 2,000,001-3,000,000
```

Real Redis Cluster does not usually shard by numeric ranges like this. Redis Cluster uses **hash slots**.

Redis Cluster has **16,384 hash slots**. A key is mapped to a slot using:

```text
CRC16(key) modulo 16384
```

Each cluster node owns a subset of slots.

Conceptually:

```text
key: user:123
hash slot: 9821
slot 9821 belongs to Node B
therefore user:123 lives on Node B
```

Example cluster:

```text
Node A owns slots 0-5460
Node B owns slots 5461-10922
Node C owns slots 10923-16383
```

When a client wants this:

```text
GET user:123
```

A Redis Cluster client can route the command to the node that owns that key's slot.

---

## Hash Tags: Keeping Related Keys Together

In Redis Cluster, multi-key operations are tricky.

Example:

```text
SINTER user:123:followers user:123:following
```

This operation needs both keys. But what if the keys are on different shards?

Redis Cluster generally requires multi-key operations to involve keys in the same hash slot.

Redis supports a convention called a **hash tag**:

```text
user:{123}:followers
user:{123}:following
```

Only the part inside `{}` is used for slot calculation.

So both keys hash based on:

```text
123
```

That means they land on the same slot and therefore the same shard.

This matters a lot in production design.

Cluster-unfriendly keys if you need multi-key operations:

```text
user:123:followers
user:123:following
```

Better keys for same-slot multi-key operations:

```text
user:{123}:followers
user:{123}:following
```

There is a trade-off: if you put too much data under one hash tag, you can create a **hot shard**.

---

## Realistic Example: Rate Limiting in a Distributed API

Suppose you run an API with 100 backend servers.

You want this rule:

```text
Each user can make 100 requests per minute.
```

Without Redis, each app server only sees local traffic:

```text
App Server 1 sees 30 requests
App Server 2 sees 40 requests
App Server 3 sees 50 requests
```

No individual server sees more than 100 requests, but globally the user made 120 requests.

Redis solves this by centralizing the counter.

Simple fixed-window rate limiter:

```text
INCR rate_limit:user:123:2026-05-24T10:31
EXPIRE rate_limit:user:123:2026-05-24T10:31 60
```

But there is a race:

```text
INCR succeeds
server crashes before EXPIRE
key may never expire
```

A better approach is a Lua script:

```lua
local current = redis.call("INCR", KEYS[1])

if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end

return current
```

Application logic:

```text
count = script(rate_limit_key, 60)

if count > 100:
  reject request
else:
  allow request
```

This is a realistic example where Redis helps a distributed fleet enforce one shared limit.

---

## Realistic Example: Cache Stampede Protection

Suppose your homepage shows expensive recommendations.

Cache key:

```text
cache:homepage:recommendations
```

Normal flow:

```text
GET cache:homepage:recommendations

if exists:
  return it

if missing:
  compute recommendations from database
  SET cache:homepage:recommendations result EX 300
```

Problem: the cache expires during peak traffic.

```text
10,000 requests see a cache miss.
All 10,000 hit the database.
The database melts.
```

This is called a **cache stampede** or **thundering herd**.

Redis lock pattern:

```text
GET cache:homepage:recommendations

if hit:
  return

try SET lock:cache:homepage:recommendations token NX PX 10000

if got lock:
  compute value
  SET cache:homepage:recommendations result EX 300
  release lock safely
else:
  wait briefly and retry cache
  or return stale value
```

Better production design often uses:

- Fresh cache key
- Stale cache key
- Single-flight lock
- Background refresh
- Jittered TTLs

Example:

```text
cache:homepage:fresh -> expires in 5 minutes
cache:homepage:stale -> expires in 30 minutes
```

If the fresh value is gone but the stale value exists:

```text
return stale immediately
one worker refreshes in the background
```

This keeps latency low and protects the database.

---

## Replication and Fault Tolerance

Redis can replicate data from a primary to replicas.

Basic shape:

```text
Primary Redis
     |
     | async replication
     v
Replica Redis
```

The replica can be promoted if the primary fails.

But the important detail is this:

> **Redis replication is usually asynchronous.**

That means the primary can acknowledge a write before replicas have received it.

Failure scenario:

```text
Client writes SET order:123 paid
Primary replies OK
Primary crashes before replica receives the write
Replica is promoted
order:123 paid is lost
```

Redis has a command called `WAIT`, which lets a client wait until previous writes are acknowledged by a specified number of replicas or until a timeout is reached.

Example:

```text
SET order:123 paid
WAIT 1 100
```

Meaning:

```text
Wait until at least 1 replica acknowledges, or 100 ms pass.
```

But `WAIT` does not magically turn Redis into a fully strongly consistent database. It improves safety, but acknowledged writes can still be lost depending on failover and persistence configuration.

Production lesson:

- Redis can be highly available.
- Redis can reduce the risk of data loss.
- Redis is usually not the best system of record for critical irreversible data.

---

## Redis in a Distributed Production Architecture

A realistic production system often uses Redis like this:

```text
                    ┌──────────────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼──────┐  ┌────────▼──────┐
│ App Server   │  │ App Server    │  │ App Server    │
└───────┬──────┘  └────────┬──────┘  └────────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼───────┐
                    │ Redis Cluster│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ PostgreSQL   │
                    └──────────────┘
```

Redis handles:

- Hot cache
- Sessions
- Rate limits
- Distributed locks for background jobs
- Leaderboards
- Temporary reservations
- Pub/Sub or queues in some cases

PostgreSQL handles:

- Permanent source of truth
- Transactions
- Constraints
- User accounts
- Orders
- Payments
- Audit history

A good design does not ask Redis to do everything.

It asks Redis to do what it is excellent at:

- Fast shared state
- Low-latency operations
- Temporary data
- Precomputed views
- Coordination with bounded risk

---

## The Most Important Mental Model

In a distributed environment, Redis is often a **coordination and acceleration layer**.

It helps many machines agree on fast-changing operational state:

- Who is rate limited?
- Who owns this short-lived lock?
- What is the cached answer?
- What jobs are pending?
- What users are currently online?
- What is the current leaderboard?

But Redis does not remove the need to reason about:

- Atomicity
- Idempotency
- Replication lag
- Failover
- Network partitions
- Data loss windows
- Hot keys
- Shard placement
- TTL behavior

---

## Production Design Rules of Thumb

| Problem                           | Redis tool                          | Main warning                                                      |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Prevent simple counter races      | **Atomic commands** or **Lua**      | Multi-command application logic can race.                         |
| Reserve inventory temporarily     | **Lua + TTL**                       | Final purchase should still be confirmed in the primary database. |
| Avoid duplicate worker processing | **Lock with token + TTL**           | Lock expiry does not cancel the old worker.                       |
| Prevent cache stampede            | **Lock + stale cache**              | Avoid making all requests wait on the lock.                       |
| Rate-limit globally               | **Atomic counter + TTL** or **Lua** | Choose fixed window vs. sliding window carefully.                 |
| Scale memory and throughput       | **Redis Cluster sharding**          | Multi-key operations need the same hash slot.                     |
| Survive node failure              | **Replication/failover**            | Asynchronous replication can lose writes.                         |
| Improve write safety              | **WAIT**                            | Better safety, but not full strong consistency.                   |

---

## Where to Go Next

The natural next step is to go deeper into atomicity and race-condition prevention with three realistic patterns:

1. **Safe inventory reservation**
2. **Global API rate limiter**
3. **Cache stampede protection**

These patterns give you a practical foundation before going deeper into Redis Cluster, consistency, and failover behavior.
