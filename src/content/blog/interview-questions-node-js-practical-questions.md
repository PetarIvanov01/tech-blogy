---
title: "Node.js Practical Questions"
description: ""
pubDate: 2026-04-20
slug: "interview-questions-node-js-practical-questions"
tags: ["interview-questions", "nodejs", "backend"]
draft: false
series: "Interview Questions"
seriesOrder: 3
---

## Questions

### **What is Node.js and how is it different from a browser JavaScript runtime?**

Node.js is a JS runtime environment that allows JS code to be executed outside of the browser, typically on the server or directly as a standalone script.

Its built on the V8 JS engine and provides additional APIs for interacting with the OS, such as working with the file system, handling network requests, and managing processes.

The main difference between Node and the browser is the environment and the available APIs:

- In the browser, JS runs in a sandboxed env and has access to the DOM, window object, and other browser-specific features.

- In Node.js, it runs in the OS environment and has access to low-level APIs like the file system, sockets, processes, etc.

### **How does Node.js achieve non-blocking I/O?**

Node.js follows a non-blocking I/O model, meaning any I/O operations do not block/hold the main thread. It uses the event loop, together with `libuv` and the operating system, to handle I/O efficiently.

When an I/O operation (file read, network request) is initiated, the task is offloaded to either the OS (for non-blocking network I/O) or libuv (for operations like accessing a file).

Once the operation completes, a callback or promise resolution is queued.

When we want to perform I/O for filesystem-related work, for example, reading from a file, we have two options without blocking: we can use the `fs/promises` library or the `fs` library and pass callbacks.

In both scenarios, the work is sent to `libuv`, which has already “pre-warmed” threads in a `thread pool` to handle these I/O operations. These threads are blocked, while the main thread is not. After the thread is done, it sends a `callback` with the result to the event loop inside the `macrotask queue`, and it sits there until it’s placed onto the call stack by the event loop.

### **What is the event loop in Node.js and how does it work?**

The event loop in Node.js is responsible for handling asynchronous operations in a single-threaded environment. It is implemented using `libuv` and works in phases.

The main phases of the event loop include:

- timesr (setTimeout, setInterval)

- I/O callbacks

- idle/prepare

- poll (new I/O events)

- check (setImmediate runs here)

- close callbacks (process.exit, socket.on(”close”), etc.)

Node.js also has microtask queues that are processed after each phase:

- Promise microtask queue

- process.nextTick queue (runs before other microtasks and has higher priority)

### **What is the difference between the Node.js event loop and the browser event loop?**

In **Node.js**, the event loop is divided into multiple phases, implemented by libuv. Each phase handles a specific type of callback:

- timers (setTimeout, setInterval)

- I/O callbacks

- idle/prepare

- poll (new I/O events)

- check (setImmediate runs here)

- close callbacks (process.exit, socket.on(”close”), etc.)

Node.js also has microtask queues that are processed after each phase:

- Promise microtask queue

- process.nextTick queue (runs before other microtasks and has higher priority)

In the browser, the event loop is simpler and is generally described in:

- macrotask queue - setTimeout/Interval

- microtask queue - Promises, Events

The browser processes one task from the macrotask queue, then executes all microtasks, and then may perform rendering before continuing.

### **What are the phases of the Node.js event loop?**

- timers (setTimeout, setInterval)

- I/O callbacks

- idle/prepare

- poll (new I/O events)

- check (setImmediate runs here)

- close callbacks (process.exit, socket.on(”close”), etc.)

Node.js also has microtask queues that are processed after each phase:

- Promise microtask queue

- process.nextTick queue (runs before other microtasks and has higher priority)

### **What is the role of libuv in Node.js?**

It implements the event loop that Node.js uses. It handles I/O related work such as opening sockets, networking, and file-system I/O using a thread pool or OS features directly.

### **What is the call stack in Node.js and how does it interact with the event loop?**

The call stack is a stack data structure (LIFO) used to execute functions synchronously on the main thread. Each time a function is called, it’s placed onto the call stack, which starts executing it synchronously. If the function has logic that is CPU-intensive, the call stack will block the main thread.

Also, when the event loop sees that we have callbacks in the micro or macro task queue, it’s going to push these callbacks on the call stack so the main thread can continue processing.

### **What are worker threads and when should you use them instead of the event loop?**

Worker threads are a built-in module in Node.js that enables true parallel code execution. Since JavaScript is executed on a single thread, we can not have multiple threads executing one thing at once. However, using worker threads, we can spawn a thread, pass it certain logic to be executed, for example, a CPU-heavy task, and let it work off the main thread.

### **What is the difference between callbacks, promises, and async/await?**

Callbacks are functions passed as arguments to be executed when the async operation completes.

Promises are objects that may include a value somewhere in the future. It allows chaining of async operations.

Async/Await is a syntactic sugar over promises, and provides a simple way of writing async code, because it looks more synchronous.

### **How are microtasks and macrotasks handled in Node.js?**

Both queues are processed via the event loop. The macrotask queue is processed in different phases (timers, I/O), while the microtask is processed immediately when there are operations in the queue.

Node.js has two microtask queues:

- **`process.nextTick`\*\*** queue\*\*

- **Promise microtask queue** (`.then`, `catch`, `finally`)

The `process.nextTick` queue has higher priority and is executed before the Promise microtask queue.

### **What happens when you mix synchronous and asynchronous code in Node.js?**

When synchronous and asynchronous code are mixed in Node.js, synchronous code is executed first on the call stack, while asynchronous operations are executed later via the event loop.

Node.js is single-threaded for JavaScript execution, so it does not block when async operations like I/O or timers are encountered. Instead, these operations are handled in the background, and their results are queued for later execution.

So, even if we have async work, the sync one will always run before it, even if the async operation was initiated earlier.

If the results from the async work are not handled, the operation still executes.

### **How does Node.js handle errors in async code?**

It depends on which way of async is used, if callbacks are used, most often the callback accepts the error as first argument, making it necessary to be handled.

If Promises are used, we have a catch method that is used to “catch” the error. If we are using async/await, the error will be thrown as an exception so we have to handle it with try/catch.

### **What is an unhandled promise rejection and why is it dangerous?**

An unhandled promise rejection occurs when a Promise is rejected but no error handler (such as `.catch()` or `try/catch` with async/await) is used to handle it. This is dangerous because it can lead to silent failures in the applications, where errors are ignored, but the program continues running in a bad state. There are events that we can listen to during the process, for this type of rejection.

### **What is the difference between process.nextTick() and Promises in scheduling?**

`process.nextTick()` has the highest priority among all asynchronous operations in Node.js. It is executed immediately after the call stack becomes empty, before any Promise, and before the event loop continues to the next phase.

### **How does garbage collection work in Node.js?**

Node.js uses the V8 engine to handle garbage collection of objects. The algorithm used for GC is called `mark-and-sweep` , and it has the concept of reachable and unreachable objects.

Reachable objects are objects that are still referenced/used somewhere in the code, for example, objects that are within closures.

Unreachable objects are objects that are no longer used by the program, thus its collected by the GC.

The GC works on two phases:

- Mark phase - in this phase, the GC goes through the memory graph starting from the root reference and marks all objects that are being used in the current cycle.

- Sweep - collects/frees the memory of objects that are no longer marked.

There are optimizations like young and old object generations, where the young objects are temporary variables that are allocated and freed frequently, while the old objects are objects that have resisted multiple GC cycles.

### **What causes memory leaks in Node.js applications?**

Memory leaks can occur mainly because objects that are no longer needed are still referenced in memory, which prevents them from being GC-ed. When they accumulate over time, the memory usage increases a lot, which can degrade the overall performance and cause the program to crash.

### **How would you debug a memory leak in Node.js?**

We can monitor the memory usage and use heap snapshots to identify objects that are continuously growing and not being GC-ed.

Examples of memory leaks:

1. Storing user sessions in memory without eviction causes memory leaks over time.

2. Adding event listeners per request and never removing them from the listeners array.

3. Closures retain references to their outer scope. If a closure is still referenced, everything it captured (including large objects) stays in memory

4. Timers keep references to their callback functions. As long as the timer is active, those references (and their captured data) cannot be collected.

5. Pending promises retain their state and any referenced data until they resolve or reject, keeping memory alive longer than expected.

```javascript
function createPromise() {
  const largeData = new Array(1_000_000).fill("data");

  return new Promise(() => {
    // never resolve or reject
  });
}

// `largeData` stays in memory indefinitely because the promise never settles.
```

### **How does Node.js handle CPU-intensive tasks?**

Node handles CPU-intensive tasks using different mechanisms. Since JS runs on a single thread, we don’t want to block that thread. For that purpose, we can use worker threads and outsource that work or even parallelize work for better performance.

Some of the CPU-intensive tasks that happen in built-in modules, such as `crypto,` some hashing functions have direct C++ bindings and run native code directly. Others can use the `libuv` library to outsource the thread pool.

### **What is blocking code in Node.js and why is it dangerous?**

Blocking code is when a synchronous operation runs on the main thread and prevents the event loop from processing other tasks. Such code can be complex hashing operations, lots of loop iterations, or just heavy CPU work. It’s dangerous because Node.js runs JavaScript on a single thread, and if we block that thread, the program becomes unresponsive. If, for example, that program is a web server, it’s not going to accept new requests and won’t be able to process them at all.

### **How do you monitor memory and performance in production Node.js applications?**

We can collect metrics such as memory usage, CPU usage, request/response times (if its a web server). Typically, we are using tools such as Prometheus to collect and store metrics, and Grafana to visualize them through dashboards.

We also collect logs, which could help to debug errors. Logs are usually stored and analyzed using log management systems that allow searching, filtering, and aggregation such as ElasticSearch.

### **What is the difference between process.nextTick() and setImmediate()?**

Callbacks scheduled by `process.nextTick()` will run immediately when the call stack becomes empty and just before any Promises or callbacks from the other phases run.

Callbacks scheduled by `setImmediate` will run in the next event loop cycle after any I/O work has completed.

### **How does the cluster module work and when would you use it?**

The cluster module is used when we want to spawn a new process within the current one and perform some code execution. The process has its own global scope, memory, and event loop. It can also utilize the multiple cores of the CPU for better performance.

Because JS runs on a single thread, it can use one CPU core. If we spawn many child processes, we can perform multi-core CPU operations to improve the performance a lot. Also, these processes can be managed by the primary one.

### **How does Node.js scale across multiple CPU cores?**

Node.js runs JS on a single thread, meaning it uses one CPU core by default. If we want to scale a Node.js application across multiple CPU cores, we have to use the cluster module or the `child_processes` module to spawn more processes that will utilize the CPU to maximum.

### **What are streams in Node.js and why are they important?**

Streams are datasets that come continuously until the whole dataset is exhausted, and there are no more chunks of data to come. They are important because allows us to handle bigger datasets, process them, and perform various operations without needing to store all the data in memory at once. The data comes in chunks after we have attached handlers and listeners to the stream.

Stream types:

**Readable **- this type of stream is used to read sequentially from a source of data. It can be used to read the standard input, incoming messages from HTTP requests, and content from files.

**Writable **- used when creating files, uploading data, or any task that involves writing data in chunks sequentially. This stream often uses a readable stream, taking the input and writing it to another source. Such Node.js streams are - `process.stdout` (standard output), `fs.WriteStream`

**Duplex **- Implements both readable and writable stream interfaces. `Socket` class from the `net` module is an example of a duplex stream. It can listen for `data` (a readable stream) and use `write` to send out data via writable stream.

**Transform **- Special Duplex Stream used to transform the input from a readable stream in some way, for example we can compress it and write it somewhere else using writable.

### **What is backpressure and how do streams handle it?**

Backpressure is when the consumer can not keep up with the producer sending chunks. There is a property called `highWaterMark` that is used to define the buffer limit. When it’s exceeded, backpressure is applied at a lower level to ensure that the handler can continue processing the stream efficiently.

When we use the `write` method, it may return false, indicating that the buffer is full and backpressure is needed.

The `drain` event is emitted to resume the incoming data flow when a backpressure was perfromed.

The `pipe` method is used to connect a readable stream to a writable stream. When using this method, we have to be careful because if the logic that is used within the pipe method throws an error, the read stream will still stream data, causing a memory leak.

### **How do you design Node.js services to be stateless?**

We have to extract all in-memory data that is being stored into a persisted storage, such as a database, outside of the service. To be stateless, the service shouldn’t be bothered with storing user sessions or other user-related information in memory.

### **What are common security risks in Node.js applications and how do you mitigate them?**

One common risk is SQL injections, where attackers inject malicious SQL queries through user input that is directly included in database queries. This can allow unauthorized access to modify and delete data. This can be prevented using parameterized queries or prepared statements, and by avoiding raw query concatenation without synitization.

No authentications and authorizations. This can be addressed using JWT tokens or session-based auth and role-based control.

Storing passwords in plain-text, not hashing them, and not using enough salt in the hashing makes them easy to decrypt.

Node applications often rely on npm packages; it’s possible some of them contain known security flaws if left unupdated. Regularly running `npm audit` and integrating a tool like `Snyk` into the CI/CD pipeline helps catch and resolve vulnerable packages before they can be exploited.

### **How would you design a production-ready Node.js API?**

First, we need an orchestrator like Kubernetes to manage the Node process, so that if it crashes, it gets automatically restarted without manual intervention. To ensure no single point of failure, we need multiple instances of that Node process to run behind a load balancer.

The application should be stateless, with any important data stored in persistent storage. It should also expose health check endpoints so the orchestrator can determine if an instance is healthy and ready to receive traffic.

The API should have proper input validation, authentication, and authorization to protect itself. Logging and monitoring should be used to track errors and system performance.

### **What happens when a Node.js process crashes, and how do you design for recovery?**

When a Node.js process crashes, it immediately stops execution, dropping any in-flight requests and losing all in-memory state. Recovery depends on external systems (orchestrator) and the system design.

In production, Node.js applications are typically managed by an orchestrator like Kubernetes. When a crash occurs, the orchestrator automatically restarts the instance.

When an instance is being stopped or restarted, it should finish handling its current requests rather than dropping them, and explicitly close all connections it has opened, such as database connections, external caches like Redis, and any other external resources.

To improve the resilience and recovery we have to:

- Make our Node.js service stateless, moving any critical state to persistent storage, which will also make it easier to scale horizontally.

- Expose readiness/liveness endpoints so the orchestrator can detect unhealthy instances and restart or replace them.

- When stopping a process, we have to handle all in-flight connections and also gracefully close connections to databases, caches, and message queues.

### **How do you handle graceful shutdown in Node.js?**

We can use the events emitted when a Node.js program is being stopped, `SIGINT/SIGTERM`, to clean up connections or perform other final logic before shutting down the process.

### **How do you manage configuration and secrets in production Node.js systems?**

In production, secrets and configurations are typically managed using environment variables that are being injected by the orchestrator for example.

Secrets, credentials, and tokens can be stored in secret managers like AWS Secrets Manager or vault systems. They are meant to provide secure storage, access control, and secret rotation to reduce the risk if credentials are compromised.
