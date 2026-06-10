---
title: "DDIA Chapter 2: Data Models and Query Languages"
description: "Notes from DDIA Chapter 2 on data models, query languages, document databases, graph data, and relational tradeoffs."
pubDate: 2026-06-02
slug: "ddia-chapter-2-data-models-and-query-languages"
tags: ["ddia", "databases", "distributed-systems", "systems-design", "data-models", "query-languages"]
draft: false
series: "DDIA"
seriesOrder: 2
---
> DDIA series: Chapter 2 - Data Models and Query Languages
> Part 1: Foundations of Data Systems

Data models are one of the main components of the software development lifecycle, because software is largely built around them. They are important because they have a profound effect on how we think about the problems we are solving.

As developers, we have to convert the data that is used and stored within the business
logic into different data structures, and use APIs to manipulate it.

These data structures can vary significantly. Most of the time, when it comes to data
storage, we think in terms of JSON, XML, tables in relational databases, graphs, and
similar representations.

## SQL vs NoSQL (Relations vs Documents)

The relational model is one of the most widely used models for representing and
storing relationships in data storage systems. It hides much of the complexity of the underlying data structures, providing a cleaner API and query language to work with.

NoSQL is also a popular data model, even though it was adopted much later than the
relational model.

NoSQL systems were mostly adopted because they fit well when we need:

- Better scalability than the relational model
- Support for write-heavy applications
- No enforced rigid schema

---

Relational databases often receive criticism because they require a translation layer
between application objects and the database model. This awkwardness led to the creation of ORMs (**Object-Relational Mapping** frameworks), which aim to reduce
this overhead, but do not eliminate it entirely.

Most popular programming languages have ORM implementations. By using them,
developers do not need to write raw SQL queries or worry directly about escaping
malicious inputs and sanitization. However, this abstraction comes at a cost: some
flexibility is sacrificed in exchange for convenience.

Relational databases model relationships explicitly. They support:

- One-to-one
- One-to-many
- Many-to-many relationships

To handle the most common case, **one-to-many relationships**, we can use:

- A separate table for the “many” side, with a foreign key reference to the “one”
- Newer SQL databases that allow key–value structures (usually JSON) to be stored in a single row, while still supporting queries over that data

The JSON representation improves data locality, since related data can be stored
together. This reduces the need for complex joins when fetching an entity and its related data.

---

In the example in the book, fields like `region_id` and `industry_id` are stored as **IDs instead of plain-text strings** (like Greater Seattle Area, Philanthropy).

This is a deliberate design choice with important tradeoffs.

At first glance, storing strings directly may seem simpler. However, using **standardized lists referenced by IDs** has several advantages:

- **Consistency:** ensures uniform spelling and naming across all records.
- **Avoids ambiguity:** multiple places can share the same name, but IDs are unambiguous.
- **Ease of updates:** names are stored in one place; changing them updates all references.
- **Localization:** the same ID can map to different language-specific names.

Because IDs have no human meaning, they **do not need to change**, even if the underlying label changes. This reduction of duplication lowers write overhead and prevents inconsistencies. This principle is the core idea behind **database normalization**.

---

### Normalization and the Document Model

Normalization often introduces **many-to-one relationships**:

- Many users belong to one region.
- Many users work in one industry.

These relationships fit naturally in **relational databases**, where joins are very performant. In contrast, document databases work best with one-to-many tree-like structures and often have limited or no join support.

This leads to some downsides:

- The application must perform multiple queries.
- Join logic moves from the database into the application code.

While a document model may work well initially, data tends to become more interconnected as applications evolve, making joins increasingly necessary.

---

### Relational model

The idea of the **relational model** is that all data is stored in simple, flat tables (relations) made up of rows and columns. There are no deeply nested or hidden data structures.

This design gives several important properties:

- Any row can be read using some kind of arbitrary conditions.
- Rows can be retrieved by keys or by any combination of columns.
- New rows can be inserted without navigating complex data structures.

---

### Query Optimizer

The query optimizer is a core component of a relational database that determines how a query should be executed. Instead of requiring developers to specify execution steps, the optimizer allows queries to be written declaratively.

It's responsible for:

- Choosing the **execution order** of operations (joins, filters).
- Selecting the most appropriate **indexes**.
- Deciding on efficient access paths based on data statistics and costs.

By handling these decisions internally, it hides a lot of the details from the application.

Indexes can be added without modifying existing queries.

---

### Comparison to the Relational Model (Document Databases)

Document databases differ from the relational model primarily in how they structure data, not primarily because of the relations between the data.

Document databases have a hierarchical approach by allowing nested records to be stored inside a parent document. In these cases, embedding related data avoids joins and allows the entire document to be read in one operation.

However, when it comes to **many-to-one** and **many-to-many relationships**, document databases are not different from relational databases:

- Both models use a **unique identifier** to reference related data.
- The referenced data is resolved at **read time**.
    - Via **joins** in relational databases.
    - Via **joins (if supported)** or **multiple follow-up queries** in document databases.

---

### Schema Flexibility in the Document Model

Most document databases do **not enforce a schema** on the data they store. Documents can contain arbitrary fields and values, and clients cannot rely on the database to guarantee which fields exist.

Although document databases are often described as **schemaless**, this is misleading. In practice, application code usually assumes a certain structure. This means there is an implicit schema, but it is not enforced by the database. A more accurate term is **schema-on-read**:

- The structure is interpreted when data is read.
- The database does not validate data at write time.

In comparison to **schema-on-write**, used by traditional relational databases, where:

- The schema is explicit and enforced.
- All written data must conform to it.

---

The difference between relational vs document becomes clear when data formats change.

Example: splitting a user’s full name into `first_name` and `last_name`.

- **Document databases**
  New documents can be written with the new fields immediately. Application code handles old documents at read time.

- **Relational databases**
  Typically requires a schema migration:

    - Add new columns.
    - Backfill existing rows.
  These operations may be fast or slow depending on the database and table size.

---

## SQL (Structured Query Language)

SQL is a declarative language used to describe the intent without writing any imperative logic.

Instead of specifying *how* to retrieve data step by step, SQL specifies:

- What pattern should the result match
- How results should be **filtered, grouped, sorted, or aggregated**

The database is responsible for deciding:

- Execution order
- Index usage
- Joins

Declarative languages intentionally limit expressiveness compared to imperative code, but this limitation gives the database freedom to:

- Reorder operations
- Execute queries in parallel
- Adapt execution plans as data size and distribution change

---

## MapReduce Querying

**MapReduce** is a programming model for processing large datasets across many machines.

It has the concepts of the following functions:

- **Map** — transforms input records into key–value pairs
- **Reduce** — aggregates values with the same key

Notes:

- Functions must be **pure** (no side effects, no external queries)

MapReduce sits **between declarative and imperative**:

- Logic is written as code (imperative)
- Execution and distribution are handled by the framework

Pros:

- Very flexible
- Good for complex batch computations
- Works well at a large scale

Cons:

- Low-level and verbose
- Requires coordinating multiple functions
- Harder for optimizers to improve automatically

Because of these drawbacks, many systems built higher-level declarative abstractions on top of MapReduce, including:

- SQL-on-Hadoop engines
- MongoDB’s aggregation pipeline

---

## Graph Data Models

Graph data model is usually the most suitable model for data with a lot of many-to-many relationships.

- As relationships become dense and interconnected, modeling them explicitly as a **graph** becomes more natural than forcing them into tables or nested documents.

---

A graph is made of two building blocks:

- **Vertices (nodes)**
  Represent entities such as people, web pages, locations, or events.

- **Edges (relationships)**
  Represent connections between entities, such as friendships, links, or routes.

---

Graphs are a natural fit for many domains:

- **Social graphs**
  People are vertices, and edges represent friendships or interactions.

- **Web graph**
  Web pages are vertices, hyperlinks are edges.

- **Transportation networks**
  Junctions are vertices, roads or railways are edges.

Because graphs are well-studied, powerful algorithms already exist:

- Shortest-path search (navigation systems)
- PageRank (web page importance)

---

Graphs are not limited to one type of entity. It can store different kinds of objects that can coexist in the same graph, connected in meaningful ways.

For example (as in large social networks):

- Vertices may represent:
    - People
    - Locations
    - Posts or comments
- Edges may represent:
    - Friendships
    - Attendance
    - Authorship

This allows the system to express rich semantics without rigid schemas or complex join tables.

---

### Property Graph Model (Conceptually)

- Vertices:
    - Have unique identifiers
    - Can store arbitrary key–value properties
    - Can have both incoming and outgoing edges
- Edges:
    - Have unique identifiers
    - Point from one vertex to another
    - Have a label describing the relationship type
    - Can also store properties

Important characteristics:

- Any vertex can connect to any other vertex
- Relationships are first-class citizens, not implicit joins
- Traversing relationships (both directions) is efficient
- Multiple relationship types can coexist in one graph

---

## Summary

This chapter provides an overview of **data models and query languages**, explaining why different models exist and why none is a universal solution.

The **relational model** was introduced to solve this problem and became the dominant approach for decades.

More recently, developers realized that not all applications fit well into relational tables, which led to **NoSQL systems**.

Each model is strong in its own domain.

Document and graph databases often avoid enforcing a strict schema:

- This makes applications easier to evolve as requirements change.
- In practice, applications still assume structure; the difference is whether the schema is enforced on write or interpreted on read.

Each data model comes with its own way of querying data:

- SQL for relational systems
- MapReduce and aggregation pipelines for some NoSQL systems
- Declarative graph query languages like Cypher, SPARQL, and Datalog
