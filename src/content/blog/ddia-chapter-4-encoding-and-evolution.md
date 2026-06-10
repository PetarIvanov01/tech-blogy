---
title: "DDIA Chapter 4: Encoding and Evolution"
description: "Notes from DDIA Chapter 4 on encoding formats, schema evolution, dataflow, and compatibility between systems."
pubDate: 2026-06-04
slug: "ddia-chapter-4-encoding-and-evolution"
tags: ["ddia", "databases", "distributed-systems", "systems-design", "encoding", "schema-evolution"]
draft: false
series: "DDIA"
seriesOrder: 4
---
> DDIA series: Chapter 4 - Encoding and Evolution
> Part 1: Foundations of Data Systems

Applications and services can change over time. Engineers can make newer features, refactor old code, business circumstances may change, etc. That’s why it’s good for our system to be able to “evolve”, as we talked in the first chapter about “evolvability”, the system should be easy to change and adapt to the newer code.

In relational databases, data is schema-based. Early in development, the schema may be simple, but over time it often changes. These changes are typically handled using schema migrations, which update the database structure while preserving existing data. In document-oriented databases, there is no strictly enforced schema. Instead, the responsibility shifts to the application, which must be able to handle missing, optional, or newly added fields.

When it comes to backend services, a common deployment strategy is the rolling update. In this approach, new versions of a service are gradually deployed alongside older versions. Some nodes run the new code while others still run the old one, allowing the system to remain available and making it possible to roll back if problems occur. During this period, multiple versions of the same service may be active at the same time.

On the client side, the situation is more constrained. Users may choose not to update their applications immediately, or may not be able to update at all. As a result, servers often need to support many versions of client software simultaneously.

Because of these factors, real-world systems frequently operate with a mix of older and newer versions of services, clients, and data formats. This makes backward and forward compatibility essential goals.

**Backward compatibility** means that newer code can read data written by older versions of the system. This is usually easier to achieve, since developers can design new versions to understand and correctly interpret existing data formats. **Forward compatibility** means that older code can safely read data written by newer versions. This is more challenging, as older code must be able to ignore unknown fields or handle data it does not fully understand, without breaking.

## Formats of Encoding Data

As developers, when we think about data, we usually think in terms of its in-memory representation - how it lives in RAM. This includes structures such as objects, arrays, pointers, or other language-specific data structures.

However, when data needs to be stored on disk or sent over the network, it cannot remain in this in-memory form. It must first be translated into a sequence of bytes. This process is called serialization (or encoding). Serialization takes an in-memory data structure and converts it into a byte representation that can be written to disk or transmitted over the network.

On the receiving side, the reverse process takes place. The raw bytes are interpreted and converted back into an in-memory representation that the program can work with. This process is called deserialization (or decoding).

### JSON, XML, and Binary variants

**JSON**, **XML**, and **CSV** are the most common language-independent data formats. They are widely supported, human-readable, and easy to exchange between systems written in different programming languages. **JSON** is especially popular due to its simplicity and native support in web environments, while **XML** is often seen as verbose and complex. **CSV** is even simpler, but also more limited.

All three formats share some important limitations. Number handling is often ambiguous: **XML** and **CSV** cannot distinguish numbers from numeric strings without an external schema, and **JSON** does not clearly separate integers from floating-point numbers or define numeric precision. This can lead to data loss when working with large numbers.

Another limitation is binary data. **JSON** and **XML** are designed for text and do not natively support raw binary values, so binary data must be encoded using formats like **Base64**, which increases size and adds extra complexity.

Despite these drawbacks, these formats are “good enough” for many use cases, especially for data interchange between different systems or organizations.

### Thrift and Protocol Buffers

These are binary encoding libraries based on the same principle. They require a schema for any data that is encoded. To be able to transfer the incoming data to an in-memory representation for a particular programming language, we have to use the code generation tool for each protocol, which takes a schema and translates that schema to in-memory structure.

In these protocols, each field in the schema is described with the type of information that is storing, whether is required, and the length of the value if it’s a string. The difference here is that we have a schema definition that maps the field name to a number, so it won’t need to keep all of the repeated field names more than once.

![DDIA Chapter 4 figure 1](/images/ddia/chapter-4-encoding-and-evolution/1.png)

![DDIA Chapter 4 figure 2](/images/ddia/chapter-4-encoding-and-evolution/2.png)

1. Thrift schema representation
2. Protocol Buffers schema representation

Both formats use numeric tags to map the field names in the schema to the actual encoded data. When data is sent over the wire, these tag numbers are used instead of field names, which keeps the encoded data compact.

If newer code sends more fields than the schema of the reader knows about, the extra fields will simply be ignored. They are still present in the encoded message, but since the reader doesn’t recognize their tag numbers, it skips them.

Because of this, field names in the schema can be changed without any issues. What must not be changed are the tag numbers, since all existing data relies on them to understand what each value represents.

We can safely add new fields to the schema by assigning them new tag numbers. If old code reads data written by newer code, it will see tag numbers it doesn’t know and ignore those fields. This gives us forward compatibility, where older code can read data produced by newer code.

Backward compatibility is also preserved, because newer code can always read old data as long as the tag numbers keep their original meaning.

Removing fields is trickier. Removing optional fields is usually safe, but removing required fields can break compatibility. For that reason, fields are often deprecated and left unused instead of being fully removed.

---

### Datatypes

Changing the datatype of a field is possible, but it has to be done carefully. It can break forward compatibility if older code reads data written with the new schema and interprets it using the old datatype.

For example, if we change a field from `int32` to `int64`, newer code may write values that no longer fit into 32 bits. When older code reads that data, it will still try to interpret the value as an `int32`, which can lead to incorrect values or truncation.

Because of this, datatype changes should be avoided unless the new type is guaranteed to be compatible with the old one, or the system is prepared to handle mixed versions safely.

---

### Dataflow Through Services: REST and RPC

When processes need to communicate over the network, they usually follow a client-server model. A server exposes an API (a service), and clients make requests to it. This is how web applications work, but the same idea also applies when one backend service talks to another, as in microservices architectures.

Services are similar to databases in that they accept and return data, but unlike databases, they expose a fixed, application-specific API. Clients can only perform operations that the service explicitly allows, which helps with encapsulation and evolution.

When HTTP is used as the transport, we call this a web service. Web services are used in several contexts:

- client applications talking to backend servers,
- internal service-to-service communication,
- communication between systems owned by different organizations.

---

Two common approaches for web services are REST and SOAP.

- **REST** is a design style built on top of HTTP. It uses simple data formats (often JSON), URLs to identify resources, and standard HTTP features like caching and authentication.
- SOAP, on the other hand, is an XML-based protocol with a large and complex ecosystem, heavy tooling requirements, and strong reliance on code generation. While still used in some enterprises, SOAP has largely fallen out of favor compared to REST.

### RPC and Its Trade-offs

Many service frameworks are based on remote procedure calls **(RPC)**, where calling a remote service is made to look like calling a local function. While this sounds convenient, it hides important differences:

- Network calls are unpredictable and can fail in ways local calls cannot.
- Requests may time out, leaving it unclear whether they were executed.
- Retrying requests can cause operations to run multiple times.
- Network calls are much slower and more variable than local calls.

Because of this, pretending that a remote call is the same as a local function call often leads to subtle bugs.

Modern RPC frameworks (such as gRPC, Thrift, or Avro RPC) acknowledge these differences more explicitly. They support asynchronous calls, streaming, and service discovery, and often use efficient binary encodings. They are commonly used for internal service-to-service communication, where performance matters and the environment is controlled.

### REST vs RPC

**RESTful APIs** remain the most common choice for public APIs because they are easy to experiment with, widely supported, and work well with existing infrastructure and tools. RPC frameworks are more common inside organizations, where tighter control over clients, schemas, and deployments is possible.

Regardless of the approach, services must be designed with backward and forward compatibility in mind, since different versions of clients and servers often run at the same time. If compatibility-breaking changes are unavoidable, services typically expose multiple API versions side by side.

---

### Message-Passing Dataflow

A process sends a message with low latency, similar to RPC, but instead of using a direct network connection, the message goes through a message broker. The broker temporarily stores the message and delivers it to one or more consumers.

**Message Brokers**

A message broker (also called a message queue or middleware) acts as an intermediary between senders and receivers. Using a broker has several advantages compared to direct RPC:

- It can buffer messages if the consumer is unavailable or overloaded.
- It can redeliver messages if a consumer crashes, preventing message loss.
- The sender does not need to know the network location of the receiver.
- A single message can be delivered to multiple consumers.
- The sender and receiver are loosely coupled; the sender only publishes messages.

---

Message-passing is usually one-way. The sender does not wait for a response and does not know when the message is processed. Replies are possible, but they are typically sent on a separate queue or topic, making the communication asynchronous.

Producers send messages to a named queue or topic, and the broker ensures delivery to one or more consumers. There can be many producers and many consumers for the same topic.

Message brokers do not enforce a data model. A message is just a sequence of bytes plus metadata, so any encoding format can be used. Using backward- and forward-compatible encodings allows publishers and consumers to evolve independently.

## Summary

This chapter focused on how data is encoded into bytes for storage and network communication, and how these choices affect system evolution and deployment.

To support rolling upgrades, systems must handle multiple versions of code running at the same time. This requires data encodings that provide backward compatibility (new code reads old data) and forward compatibility (old code reads new data).

We compared several encoding formats:

- Language-specific formats are limited and often break compatibility.
- Text formats like JSON, XML, and CSV are flexible but weakly typed and rely on conventions.
- Binary, schema-based formats (Thrift, Protocol Buffers, Avro) offer efficient encoding with well-defined compatibility rules.

We also saw where these encodings are used:

- Databases
- RPC and REST APIs
- Asynchronous message-passing systems
