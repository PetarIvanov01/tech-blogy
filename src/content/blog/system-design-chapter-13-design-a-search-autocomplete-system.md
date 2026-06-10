---
title: "System Design Chapter 13: Design A Search Autocomplete System"
description: "Notes from System Design Interview Chapter 13 on autocomplete requirements, trie-based designs, ranking, updates, and scaling."
pubDate: 2026-03-13
slug: "system-design-chapter-13-design-a-search-autocomplete-system"
tags: ["system-design", "autocomplete", "search"]
draft: false
series: "System Design Interview"
seriesOrder: 13
---
> System Design Interview series: Chapter 13 - Design A Search Autocomplete System
> Summarizing chapters

SYSTEM

> Source: Summarizing chapters
> Notion page: https://app.notion.com/p/CHAPTER-13-DESIGN-A-SEARCH-AUTOCOMPLETE-SYSTEM-2ee4038a7d0180fe87aad9947f1d3c61

## Step 1: Understand the problem and establish a scope

Questions:

1. From which part of the query does the matching start, the start or the middle part?
   1. It should begin from the start of the query.
2. How many suggestions for autocomplete should be shown?
   1. 5
3. How to know which suggestion to show?
   1. Depending on the search frequency of the query.
4. Is English the only supported language?
   1. Yes.
5. Are we considering Uppercase and special characters in the query?
   1. No, only lowercase English letters.
6. How many users are using the product?
   1. 10 mil DAU

---

Auto-suggestions should be fast enough, as Facebook suggests in their articles, a response should be shown within 100 ms. The results should be relevant to the search query and sorted by some criteria, such as frequency, popularity, or other ranking systems.

### Back-of-the-envelope estimation

- 10 Million DAU.
- On average, a user makes 10 requests per day.
- The average query has a size of 20 bytes; each ASCII character is 1 byte.
- For each character of the query, the client sends a request to the server, making it 20 requests per query.
- 10 000 000 DAU _ 10 queries/day _ 20 chars / 24 hours / 3600 seconds ≈ 24 000 QPS
- 24 000 QPS \* 2 = 48 000 Peak QPS
- Assuming 20% of the queries are new: 10 mil _ 10 q/d _ 20 bytes \* 20 % = 0.4 GB of storage per day is taken

---

## Step 2: High-level design

On a high-level we have two components:

### Data Gathering Service (Write Path)

We can go with real-time data processing, and what we will have is a table with `query:` `frequency` pairs, and whenever a user types a query that is not within our data set, we will create it and assign a frequency of 1.

However, real-time processing is not a good solution at scale. In an autocomplete system, each user may generate multiple events per query (for example, one per typed character). If the system handles around 24,000 QPS, this translates to tens of thousands of writes per second. Each write requires coordination on shared data, such as atomic updates or locks, which quickly becomes a bottleneck.

---

### Query Service (Read Path)

On the storage side, we have the following data model:

| Query   | Frequincy |
| ------- | --------- |
| Twitter | 25        |
| twitch  | 18        |
| twillio | 10        |
| …       | …         |

When a user writes the query, we perform an SQL query within that table where we search for records starting with the particular search query; for example:

`Select * from freq_table WHERE query LIKE 'prefix%' ORDER BY frequincy Limit 5`

This way, we can extract the top 5 records from the table.

For a small-scale system, this approach can get the job done; however, with 10 million daily active users, it does not scale well.

The main bottleneck is the SQL query itself. Even with a composite index on `(query, frequency)`, the database must perform large range scans for popular prefixes and sort the results by frequency. Since the system experiences a very high write rate, the frequency column is constantly updated, which causes frequent index updates and rebalancing. This can degrade both read and write performance and make it difficult to meet low-latency requirements.

---

## Step 3: Design deep dive

The current way of searching is not efficient for large-scale. A much better way is to use a `prefix tree` or `trie`.

A **Trie** is a tree-like data structure where each node represents a character. Each path from the root to a node represents a prefix, and a complete path to a terminal node represents a full word (query).

A node can store:

- A map of characters → child nodes
- A flag indicating whether this node marks the end of a word
- (For our case) metadata such as frequency or top-K suggestions

Example:

`t
 └── w
 └── i
 ├── t → twitter (25)
 └── c → twitch (18)
 └── l → twilio (10)`

For the **Write Path,** the algorithm is as follows:

When a query is submitted:

1. Traverse the Trie
2. Create nodes if they do not exist
3. Increment the frequency at the terminal node
4. Update top-K lists on the path from root to leaf (if such is used)
- This removes any work related to indexes
- Reads are as fast as they depend only on the prefix length

Usually, users’ queries are small in terms of length; we can add a max-length constraint, which will make the search O(1) constant time complexity. As I mentioned, we can store a list of the Top 5 queries for each prefix node, and we can reduce the time complexity of finding the results/suggestions. This comes with additional memory overhead as we have to store 5 records per node.

---

### Data gathering service re-design

In the high-level design, we choose real-time processing of the data, on each write request, we have to update the frequency or create a new record. Even if we go with the trie data structure, we will have a lot of writes that are not necessarily needed to happen in real-time.

A better approach is to process data at some interval and rebalance the trie. The data will come from analytics log files with the query and timestamp as fields.

**An Aggregator** component will read those log files, as they can be very large and filled with unstructured data. The component has to read the data on some interval, depending on the system's needs. It can be once a week or more frequently. The aggregators are creating aggregated data that later workers are using to restructure the trie and store it in Trie DB.

For storage, we can choose a key-value store or document storage:

- Mongo is a good choice for document storage. We can take a snapshot of the trie, serialize it, and store it as a document.

---

### Query service

In the high-level design, we fetch the top 5 suggestions from the DB with an SQL query, as I explained, it’s not optimal for large scale. Also, we moved to Trie for datastructure. Relational DB can work, but it’s not a good fit.

---

![Chapter 13 Design A Search Autocomplete System figure 1](/images/system-design/chapter-13-design-a-search-autocomplete-system/1.png)

1. The request comes from the user and hits the load balancer.
2. The load balancer routes the request to one of the API servers.
3. The API server queries the Trie (usually from an in-memory cache) to efficiently retrieve the top 5 suggestions for the given prefix.
4. The results are returned to the user.

---

### Trie Operations

#### Create

The Trie is created by background workers using aggregated data derived from analytics logs.

#### Update

Option 1: Update the trie on a certain interval by replacing the old one with entirly new.

Option 2: Update individual nodes in the Trie. This approach is expensive at a large scale because updating a single query may require recomputing top suggestions for multiple ancestor nodes along the prefix path.

#### Delete

Instead of deleting nodes from the Trie later, unwanted queries (such as spam, offensive content, or very low-frequency queries) should be filtered out during data aggregation, before the Trie is built.

---

### Scale the storage

Since we are storing only lowercase English letters, we can shard the Trie by prefix. For example, one shard can store prefixes from `a to m,` and another from `n to z`.

---

## Step 4: Wrap up

In this chapter, we redesigned the autocomplete system to scale for large traffic by separating the read and write paths.

The write path collects search queries through append-only logs and periodically aggregates them to rebuild the Trie offline. The read path serves autocomplete suggestions from an in-memory Trie cache, ensuring low latency for users.

If there is more time, we can further explore:

Supporting multiple languages by storing Unicode characters in Trie nodes and potentially separating Tries by language.

Geographical optimization, by building country-specific Tries and using CDNs to route users to the nearest cache for faster responses.
