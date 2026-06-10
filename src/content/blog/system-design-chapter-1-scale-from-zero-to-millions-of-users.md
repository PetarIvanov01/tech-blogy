---
title: "System Design Chapter 1: Scale From Zero To Millions Of Users"
description: "Notes from System Design Interview Chapter 1 on scaling from a single server to distributed systems, load balancing, caching, and databases."
pubDate: 2026-03-01
slug: "system-design-chapter-1-scale-from-zero-to-millions-of-users"
tags: ["system-design", "scalability", "architecture"]
draft: false
series: "System Design Interview"
seriesOrder: 1
---

> System Design Interview series: Chapter 1 - Scale From Zero To Millions Of Users
> Summarizing chapters

## Starting from a simple system

As far as I can remember, within this chapter he is talking about moving toward designing a system that can handle a lot of load, starting from a simple system and ending with a complex, distributed, scaled system.

First, he started with very few components:

- **DNS**
- **Web Server**
- **Client**

At this point, we have a simple monolithic system with only one server.

The flow is the following:

We have a page that the user requests using an HTTP call to our server.

- First, a request to the **DNS** is made so it can retrieve the IP address of the server, after which the server is called and the HTML page is returned to the client. (The client can receive other types of data as well, such as **JSON**, **CSS**, images, and so on, from the web server.)

However, at some point the user base is going to grow and we will need data persistence on disk, so we have to add a relational database to the system.

The database is used for write/read operations and, so far, it is a single instance.

Now the flow is as follows:

- The client makes a request.
- The browser asks the DNS to retrieve (it can be cached) the IP address of the server.
- Using the IP address and the request path, we call the server to return user data at `/api/users`.
- The server reads from the database (using request/response) and returns the user JSON as a response to the client.

He (the author) also talked about how to choose the right database, like **relational**, **NoSQL**, **row-based**, **column-based**, and others that are more like key-value stores, such as **Redis**.

Most of the time, a relational one is the right choice, mostly because it’s very battle-tested. However, other databases such as NoSQL can be a good fit when we don’t have relations in our data, when it’s not structured, or when we need to store data in formats like JSON or XML.

---

## Vertical vs Horizontal scaling

Both terms are used when we talk about improving the components of the system, the traffic they can handle, the load, and so on.

**Vertical** means we are improving the machine (where the server(s) are hosted) by adding more CPU, RAM, disk space, and so on—i.e., hardware improvements.

The big advantage is that it’s simple to do compared to the second approach, but it has serious limitations, such as:

It’s bound to a certain limit of adding more hardware.

It’s a single point of failure, meaning if the server on that machine goes down for some reason, we don’t have another server to support the traffic.

In the example above, our server is just one, which means that if it stops working, we cannot support our user traffic at all. That’s why horizontal scaling is the preferred option.

---

## Load balancing

After this, the author introduced the **load balancer** into the system, because we are going to scale our web servers horizontally, so we need a way to route traffic between these new server instances.

A **Load Balancer** is another server that stays in front of the web servers and has its own IP address, which is public to the DNS, whereas the web servers use private IP addresses and the load balancer communicates with them over a local network.

This has an advantage because now our servers are more secure, since users are not communicating with them directly but via the load balancer, where we can also add DDoS protection at some point.

After adding the load balancer and another server instance, the flow is as follows:

- The client makes a request to `/api/users`.
- The browser gets the IP address of the load balancer from the DNS.
- The request is sent to the load balancer with the intent to reach a server and receive a response.
- The load balancer, using a certain algorithm, picks one of the servers and sends the request there.
  - It can use round-robin for evenly distributing requests.
  - It can use a weighted algorithm to send the request to the server that is not under heavy load.

Now, if our system is under heavy load, it can automatically (the author did not describe how this is achieved) scale horizontally by adding more servers, and the load balancer will route the requests accordingly.

---

## Database replication

So far, we have a **load balancer** and the ability to scale our servers. However, we still have only one database, so we are going to partition it using a **master/slave** approach, where we have a master replica that is write-only and multiple slaves that are read-only.

As the author said, this is a common approach when it comes to database partitioning.

The slaves sync with the master by reading from it, and if one of the slaves goes down, the others will handle the load until a new slave is ready. If the master goes down for some reason, the system can temporarily promote one of the slaves to become the master until the original one is healthy again. However, this is more complex, as the author mentioned.

Using this approach, we improve **performance** since we can read from multiple slaves in parallel. We also improve **reliability** because we have more than one replica, so even if one of them fails, the others will continue executing queries.

There was also something related to the slaves being in different locations, which means we are improving data availability because it’s more distributed and users from different regions will have lower latency.

---

## Cache layer

The system so far is well scaled; however, we can reduce reads from our database by introducing a **cache layer** between the server and the database.

So, if a user makes a request to get some data from the database, we first check the cache to see if the data is available. If it’s not, we hit the database, store the result in the cache, and return it to the user. This way, when the user sends another request for the same resource, we won’t hit the database again.

By introducing a cache layer, we reduce database reads/load and reduce response latency because hitting the cache is much faster than hitting the database.

We should consider adding a cache layer when we experience a lot of reads and fewer writes for specific endpoints. Since the data is stored in memory, it’s not ideal for persistence, because if the cache layer stops, the data is lost.

It’s good practice to add a **TTL** (time to live) to cached data so that when the TTL expires, we route the request to the database and obtain fresh data. This ensures the cache is not working with stale data, although it must be configured carefully.

---

## CDN

After adding a cache layer, the next step is almost the same logic but between the client and the web server, by adding a **CDN** (Content Delivery Network). This is where we store images, CSS, HTML, and other static content. This improves response time (for example, by reducing the latency of the initial request). CDNs are often located far from the server, which, as mentioned, lowers latency and improves availability.

Again, the **CDN** stores files/data with a certain **TTL** so it can revalidate the cache when resources expire.

---

## Stateful vs stateless web servers

The next topic was defining **stateful** and **stateless** web servers.

When we are talking about a distributed system, it’s best for our servers to be **stateless** so they can be scaled without additional considerations.

What I mean is: if we have a server that stores user sessions in memory and we try to scale by spawning more server instances, the load balancer must know which server has the user session so it can route requests to that specific server. It’s much easier to remove state from these servers so the load balancer doesn’t need such logic.

We can use a shared data store, such as a database, to store sessions. This shared store can be a key-value store for faster queries, such as **Redis**.

---

## Data centers, queues, and sharding

After that, the author explained that running the system across different data centers is a good option to improve **redundancy**. If one data center goes down, another one can pick up the load.

He also talked about adding a **message queue** to the system for asynchronous work. This is useful when we have a service that performs a lot of work, so we can process it asynchronously, unblocking the service that initiated the request. The components are a **producer** and a **consumer**, where the producer emits an event, and consumers process it afterward.

There was also something about **database sharding**, where we shard the data across multiple database servers, each storing different parts of the data.

## Key takeaways

That’s basically what I remember from that chapter. The important parts were:

- Improve reliability and redundancy in every system component (servers, database, cache).
- Make web servers stateless.
- Utilize CDNs for static assets and cache layers to reduce database reads and improve latency.
- Support multiple data centers.
- Have monitoring and logging for all components.
