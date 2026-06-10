---
title: "DDIA Chapter 1: Reliable, Scalable, and Maintainable Applications"
description: "Notes from DDIA Chapter 1 on reliability, scalability, maintainability, and the foundations of data-intensive applications."
pubDate: 2026-06-01
slug: "ddia-chapter-1-reliable-scalable-and-maintainable-applications"
tags: ["ddia", "databases", "distributed-systems", "systems-design", "reliability", "scalability", "maintainability"]
draft: false
series: "DDIA"
seriesOrder: 1
---
> DDIA series: Chapter 1 - Reliable, Scalable, and Maintainable Applications
> Part 1: Foundations of Data Systems

This chapter starts by explaining how data-intensive applications are built, such as:

- Database - Storing data on disk; applications are using it for reads/writes.
- Caches - Used to store a result from heavy computational work to improve the time for reads.
- Search indexes - Used to improve the reads within databases.
- Stream processing - Sending messages asynchronously to be processed by another processes.
- Batch processing - Processing of accumulated data periodically.

Most real-world applications are **compositions of these building blocks**, not just a single database.

Then the chapter familiarizes us with - **Reliability, Scalability, Maintainability.** Let’s look at them.

## Reliability

What does **reliability** mean from a software perspective?

- It performs well by providing the intended use case under heavy load.
- Allows users to make mistakes and tolerate using the software in not intended ways.
- The system does not allow unauthorized access and prevents system abuse.

The author understands these points as - **Reliable** software works correctly and keeps working correctly even when things go wrong.

These moments where something goes wrong are called **“faults”;** systems that can handle faults well, not allowing the system to completely go down, are called **fault-tolerant** or **resilient.**

There is a difference between **faults** and **failures.**

- **Fault** — A component deviates from its expected behavior (e.g., disk crash, bug, bad input).

- **Failure** — The system as a whole stops providing the required service to the user.

A **fault may or may not lead to a failure**. Fault-tolerance is about preventing that transition.

As it’s expected, it’s impossible to design completely fault-tolerant systems, but by implementing certain techniques, we can reduce the probability of a fault becoming a failure.

### Hardware Faults

These are hard disk crashes, faulty RAM, power going out, etc.

(I did not remember or understand most of the things in this part of the chapter, so I am going to pick most of the information from the book directly to stay as a reference)

Disks may be set up in a RAID configuration, servers may have dual power supplies and hot-swappable CPUs, and data-centers may have batteries and diesel generators for backup power.

When one component dies, the redundant component can take its place while the broken com‐
ponent is replaced.

Until recently, redundancy of hardware components was sufficient for most applications, since it made total failure of a single machine fairly rare. As long as you can restore a backup onto a new machine fairly quickly, the downtime in case of failure is not catastrophic in most applications. Thus, multi-machine redundancy was only required by a small number of applications for which high availability was absolutely essential.

### Software Errors

Starting with systematic errors - These are faults that are periodic but hard to anticipate; they can damage the hardware and result in failures in the long term. Some examples from the book are:

- A software bug that, when bad input is provided, wipes out server instances.
- Processes that keep running when they are not supposed to eat up RAM, CPU time, or network bandwidth may cause service failures.
- Critical service becomes slow, return corruped responses, or does not respond at all.
- A fault cascade into service faults, which can turn into system failures.

There is no solution or complete prevention for these errors, but there are things that can help work through them.

- Testing service logic functionality.
- Writing the software and allowing the processes to crash and restart, taking them into account.
- Measuring and monitoring.

### Human Errors

Book reference (page 9):

> “… one study of large internet services found that configuration errors by operators were the leading cause of outages, whereas hardware faults (servers or network) played a role in only 10–25% of outages.”

The paragraph shows us that even if humans most likely have built the software with good intentions there can still become the main contributor to server faults and failures.

There are points mentioned in the book that can help reduce these kinds of errors:

- Having well-designed abstractions and APIs can help reduce unintended use of the software.
- Decouple critical parts of the system with components where users are making the most mistakes.
- Test the business logic, write Unit tests, end-to-end tests, and integration to verify full workflows and different scenarios.
- Track metrics and monitor the state of critical parts of the system. Monitoring can help us prevent and catch faults in early stages.

---

## Scalability

A system may be reliable now, when, for example, the scale of the system is to handle 10 000 users, but it can degrade when the load increases rapidly.

**Scalability** is the ability of a system to **handle increased load by adding resources** while maintaining acceptable performance.

This does not mean we can easily compare different systems and label one of them as more scalable than the other. We have to be considerate when a system grows in a certain direction, how we are handling that, or what components we improve in order to handle more load.

**What is Load and load parameters?**

These are some of the parameters that we can use to predict the load or take informed decisions when deciding how and where to improve the system:

- Requests per second to a web server.
- Ratio of reads to writes in a database.
- Number of simultaneously active users in a chat room/ DAU.
- Cache hits/ misses.

Book reference (page 11):

> To make this idea more concrete, let’s consider Twitter as an example, using data
> published in November 2012. Two of Twitter’s main operations are:
> **Post tweet:**
> - A user can publish a new message to their followers (4.6k requests/sec on aver‐
> age, over 12k requests/sec at peak).
> **Home timeline**
> - A user can view tweets posted by the people they follow (300k requests/sec).

Simply handling 12,000 writes per second (the peak rate for posting tweets) would be fairly easy. However, Twitter’s scaling challenge is not primarily due to tweet volume, but due to fan-out - each user follows many people, and each user is followed by many people.

In the book, the authors give an example of how Twitter handles this “fan-out” functionality by showing the two options where they are using the hybrid one. I have described parts of these problems and options in [Design A News Feed System](/blog/system-design-chapter-11-design-a-news-feed-system/). I will use it as a reference.

**Performance**

This part here was very confusing, so I will just spill out what I remembered.

**Throughput -** The number of requests processed per second.

**Latency -** The time it takes for a request to be initiated and for a response to be retrieved.

The latency can vary from request to request, as different reasons can be:

- Cache miss when reading a record.
- Network issues such as TCP head-of-line blocking.
- Reading from Disk
- Heavy CPU work.

For the latency, there is a metric called  “p{number percent}” that showcases how much of {number percent} requests are below a certain latency and also shows how many requests are taking more time than the average latency, basically the outliers.

**P50** tells you what a *typical* request sees; **tail percentiles reveal the worst-user experience**, which often dominates perceived performance.

However this is not enough when it comes to finding the outliers and how much worse a request latency can become.

Usually, **P99.{number of 9s} is used to find the outliers.** For example, if the normal latency is 200 ms and we have **P99.9** with 100 000 request/day, this means 10 requests/day take more than the normal latency. (slower)

**Coping with Load**

The gist here is that there is no one way of coping with load; we can go in the direction of horizontally scaling all of our services, or increasing the hardware, beefing up the machines (vertical scaling). However, the author here notes that the best is something between both worlds.

Also, notes that while distributing load across stateless services is easy because we don’t have to thing for persisting data on these services, having horizontally scaling statefull ones is kinda pain, thus we can beef up the one statefull node until we are either forced or if it’s not cost-efficient and horizontally scale it.

### Maintainability

The cost of the software does not come from the initial development, but in its ongoing development and maintenance, which includes fixing bugs, adding features, keeping legacy parts backward compatible, repaying technical debt, etc.

We will see how to minimize these problems by following these three concepts:

1. **Operability -** Make it easy for the operations team to keep the system running smoothly
2. **Simplicity** - Make it easy for new engineers to understand the system by removing as much
complexity as possible from the system.

3. **Evolvability -** Make it easy for engineers to make changes to the system in the future, adapting
it for unanticipated use cases as requirements change. Also known as extensibility, modifiability, or plasticity.

**Operability**

Book reference (19 page):

“It has been suggested that “good operations can often work around the limitations of
bad (or incomplete) software, but good software cannot run reliably with bad opera‐
tions”.

The engineers who develop the software are responsible for ensuring that the component works correctly in the system.

Good operability expects engineers to handle and utilize:

- Monitoring the health of the system and quickly restoring service if it goes into a
bad state.

- Tracking down the cause of problems, such as system failures or degraded performance.
- Keeping software and platforms up to date, including security patches.
- Understanding how different systems affect each other, so that a problematic
change can be avoided before it causes damage.

- Defining processes that make operations predictable and help keep the production environment stable.

Engineers should keep the documentation up-to-date as new developers come that will make their life much easier.

**Simplicity**

Book Reference (21 page):

“Making a system simpler does not necessarily mean reducing its functionality; it can
also means removing *accidental* complexity.”

Such complexity adds unnecessary abstractions. We as developers have to be careful when introducing abstractions, as they might not be needed and become a big burden.

Another issue is having different components in the system tightly coupled to each other, making them hard to reason about, hard to track errors, and make changes.

**Evolvability**

System requirements almost never stay stable over time. New use cases appear, business priorities change, platforms evolve, and system growth often forces architectural changes.

To cope with this constant change, systems must be easy to modify and adapt. Technical practices such as **test-driven development (TDD)** and **refactoring** support continuous improvement.

**Evolvability** refers to how easily a data system can be changed to meet new requirements. It is strongly connected to:

- **Simplicity** — simpler systems are easier to reason about and change.
- **Good abstractions** — clear boundaries allow parts of the system to evolve independently.

Evolvability is also known as **extensibility, modifiability, or plasticity**, and represents **agility at the data-system level**, not just within a single application.
