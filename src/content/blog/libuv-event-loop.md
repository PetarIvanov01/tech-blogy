---
title: "libuv, Node.js, Event Loops, OS Sleeping, and the Worker Pool"
description: "A practical mental model for libuv, Node.js event loops, OS sleeping, filesystem I/O, streams, backpressure, worker threads, and the libuv worker pool."
pubDate: 2026-06-02
tags: ["nodejs", "libuv", "event-loop", "backend", "systems"]
---

This summary wraps together the questions and answers from our discussion about libuv, Node.js, the event loop, OS notification APIs, sleeping threads, filesystem I/O, streams, backpressure, worker threads, and multiple event loops.

The goal is to preserve the mental model in one place so you can quickly rebuild the whole picture later.

---

## 1. libuv in one sentence

**libuv is a user-space, cross-platform event-loop library that gives Node.js a unified API over different operating-system mechanisms.**

Your code does not directly use Linux `epoll`, macOS/BSD `kqueue`, or Windows IOCP. Instead, Node.js uses libuv, and libuv maps its own `uv_*` APIs to the best mechanism available on the current OS.

<div class="flow-stack">
  <div class="flow-node">JavaScript</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node.js C++ bindings</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">OS-specific APIs</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Kernel</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Hardware</div>
</div>

Examples:

<div class="flow-map">
  <div class="flow-row">
    <span class="flow-label">Linux</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>epoll, pthreads, sockets, filesystem syscalls</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">macOS</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>kqueue, pthreads, sockets, filesystem syscalls</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">Windows</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>IOCP, Winsock, Windows threads</span>
  </div>
</div>

libuv itself lives in **user space**. It cannot directly receive hardware interrupts, schedule CPU threads, or access kernel internals. It asks the kernel to do those things through system calls.

---

## 2. Event loop stages and the poll timeout

The event loop repeatedly goes through phases/stages:

```text
Run timers
Run pending callbacks
Run idle/prepare callbacks
Poll for I/O
Run check callbacks
Run close callbacks
Repeat
```

The **poll timeout** answers this question:

> How long can the event loop safely sleep while waiting for OS events?

The loop cannot simply sleep forever, because timers might need to fire. But it also should not spin constantly, because that would waste CPU.

So before entering the poll phase, libuv calculates a timeout based on active work.

### Example: only a TCP server, no timers

```text
TCP server active
No timers
No idle handles
```

libuv can tell the OS:

```text
Sleep until some I/O happens.
```

Conceptually:

```c
epoll_wait(..., timeout = infinite);
```

The event loop thread consumes almost no CPU while waiting.

---

### Example: a timer expires in 5 seconds

```text
Timer expires in 5000 ms
TCP socket also active
```

libuv cannot sleep forever. It asks the OS:

```text
Wake me when either:
1. I/O happens
2. 5000 ms passes
```

Conceptually:

```c
epoll_wait(..., timeout = 5000);
```

If a socket event happens after 300 ms, the OS wakes the loop early.  
If nothing happens, the timeout expires and the loop wakes to run the timer.

---

### Example: an idle handle is active

If an active idle handle exists, libuv should not sleep:

```text
poll timeout = 0
```

That means:

```c
epoll_wait(..., timeout = 0);
```

The OS returns immediately, and the loop continues running.

---

## 3. Does libuv "sleep without blocking"?

This is the subtle but important point:

> libuv **does block the event-loop thread** during the poll phase, but it blocks it in the kernel in a way that does **not consume CPU**.

Blocking is not always bad.

Bad version:

```c
while (1) {
    check_for_events();
}
```

This is busy-waiting. It burns CPU.

Good version:

```c
epoll_wait(...);
```

This enters the kernel and says:

> Put this thread to sleep until something relevant happens.

While sleeping:

```text
The thread is not executing instructions
The scheduler removes it from the CPU
Other threads/processes may run
CPU usage for that thread is basically zero
```

So the event loop blocks, but it does not waste CPU.

---

## 4. How OS notification works

Modern operating systems expose APIs that allow a program to register interest in events.

Examples:

<div class="flow-map">
  <div class="flow-row">
    <span class="flow-label">Linux</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>epoll</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">macOS/BSD</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>kqueue</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">Windows</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>IOCP</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">Older Unix</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>select/poll</span>
  </div>
</div>

The program says:

```text
I am interested in this socket.
Wake me when it becomes readable or writable.
```

The OS does not call JavaScript directly. Instead, the system call returns.

<div class="flow-stack">
  <div class="flow-node">Event occurs</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Kernel records it</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Sleeping thread becomes runnable</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Scheduler eventually runs the thread</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">epoll_wait()/kevent()/IOCP call returns</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv dispatches callbacks</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node.js runs JavaScript callback</div>
</div>

---

## 5. What does "sleeping thread becomes runnable" mean?

The OS scheduler sees threads in states.

A simplified model:

```text
RUNNING
    The thread is currently executing on a CPU core.

RUNNABLE
    The thread is ready to run, but waiting for CPU time.

SLEEPING / BLOCKED / WAITING
    The thread cannot continue until some event happens.
```

When the event loop calls something like:

```c
epoll_wait(...);
```

and no events are available, the kernel puts the thread into a sleeping state.

That means:

```text
Thread removed from runnable queue
Thread gets no CPU time
Kernel remembers what it is waiting for
```

Later, when an event happens:

<div class="flow-stack">
  <div class="flow-node">Network packet arrives</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Socket becomes readable</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Kernel sees that the libuv thread was waiting for this</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Thread state changes from SLEEPING to RUNNABLE</div>
</div>

Important distinction:

```text
RUNNABLE does not mean RUNNING.
```

It only means the thread is eligible to run. The scheduler still has to pick it and place it on a CPU core.

---

## 6. Is sleeping basically saving thread state and context switching?

Yes, that is the right mental model.

When the thread enters a blocking syscall and the kernel decides it must sleep:

```text
1. The kernel saves the thread's execution context.
2. The thread is marked sleeping/waiting.
3. It is removed from the runnable queue.
4. The scheduler chooses another runnable thread.
5. A context switch happens.
```

The saved state includes things like:

```text
Instruction pointer
Stack pointer
CPU registers
CPU flags
Scheduling state
Wait reason
```

The thread's stack and heap remain in memory. It is not "frozen to disk" or anything heavy like that.

Later:

<div class="flow-stack">
  <div class="flow-node">Event happens</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Thread marked runnable</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Scheduler picks it</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Kernel restores its CPU state</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">System call returns</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv continues</div>
</div>

To libuv, it simply looks like:

```c
epoll_wait(...)
```

returned.

---

## 7. Sockets vs files: they are handled differently

This was one of the most important distinctions.

### Sockets

Network sockets usually work well with readiness notification APIs:

<div class="flow-stack">
  <div class="flow-node">Socket becomes readable</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">epoll/kqueue/IOCP reports event</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">event loop wakes</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv callback</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node.js callback</div>
</div>

This is the classic event-driven model.

---

### Regular files

Regular filesystem reads are different.

On many platforms, reading a normal file can block. The OS generally does not provide the same style of readiness notification for regular disk file reads as it does for sockets.

So libuv usually handles filesystem operations through its **worker thread pool**.

<div class="flow-stack">
  <div class="flow-node">Node.js</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv filesystem request</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">queue work item</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">worker thread performs blocking read()</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">worker thread finishes</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">worker notifies event loop</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node.js callback runs</div>
</div>

So for filesystem I/O, the event loop itself is not sitting in `epoll_wait()` waiting for the file to become readable in the same way it would for a socket.

Instead:

```text
Filesystem I/O is often moved to the worker pool.
```

---

## 8. The worker pool executes jobs, not resources

This was another key insight.

The worker thread does not "own" a file.

It does not attach itself to a file stream for the lifetime of that stream.

Instead:

```text
Worker thread takes one job
Worker thread executes that job
Worker thread reports completion
Worker thread returns to the pool
```

Example:

```text
Read fileA offset 0
Read fileB offset 0
Read fileA offset 65536
Close fileB
Read fileC offset 0
```

Any available worker can execute any job.

A possible schedule:

<div class="flow-map">
  <div class="flow-row">
    <span class="flow-label">Worker 1</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>read a.txt chunk 1</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">Worker 2</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>read b.txt chunk 1</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">Worker 3</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>read a.txt chunk 2</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">Worker 1</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>close b.txt</span>
  </div>
</div>

The worker pool is job-based.

The file stream state lives higher up in Node.js.

---

## 9. What happens with `fs.readFile()`?

When you use:

```js
fs.readFile("big-file.bin", (err, data) => {
  // callback receives whole file
});
```

the operation is conceptually one high-level request.

From JavaScript's point of view:

```text
No chunks are delivered while reading.
One callback runs when the full data is ready.
```

For a very large file, this can be dangerous:

```text
Large memory usage
Long delay before callback
Possible process crash if file is too big
```

So `fs.readFile()` is not the best choice for huge files.

---

## 10. What happens with `fs.createReadStream()`?

For large files, streams are the better model.

Example:

```js
const stream = fs.createReadStream("huge-file.bin");

stream.on("data", chunk => {
  console.log(chunk.length);
});
```

Now the file is read incrementally.

Conceptually:

```text
Read 64 KB
Emit chunk

Read next 64 KB
Emit chunk

Read next 64 KB
Emit chunk
...
```

Each chunk corresponds to a separate filesystem read operation.

---

## 11. Does the worker thread keep pushing chunks forever?

No.

For streams, the worker thread does not autonomously keep reading the file and pushing chunks into JavaScript.

The model is closer to:

<div class="flow-stack">
  <div class="flow-node">Node asks for a read</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv worker reads one chunk</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">worker reports completion</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node receives chunk</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node decides whether to ask for another read</div>
</div>

So:

> If Node does not submit another read request, the worker thread will not start reading the next chunk for that stream.

The worker thread is not in control of the stream. Node is.

---

## 12. Pull-based reading and backpressure

Streams use **backpressure**.

Node keeps an internal buffer. The size threshold is controlled by `highWaterMark`.

For file read streams, the default chunk size is commonly 64 KB.

```js
const stream = fs.createReadStream("huge-file.bin", {
  highWaterMark: 64 * 1024
});
```

The logic is roughly:

<div class="flow-map">
  <div class="flow-stack">
    <div class="flow-node">Buffer below highWaterMark</div>
    <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
    <div class="flow-node">Node schedules another uv_fs_read()</div>
  </div>
  <div class="flow-stack">
    <div class="flow-node">Buffer at/above highWaterMark</div>
    <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
    <div class="flow-node">Node stops scheduling more reads</div>
  </div>
  <div class="flow-stack">
    <div class="flow-node">Consumer drains buffer</div>
    <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
    <div class="flow-node">Node schedules another read</div>
  </div>
</div>

This prevents unbounded memory growth.

So stream reading is not worker-side pushing. It is:

```text
Demand-driven pulling with backpressure.
```

---

## 13. Who controls the file offset?

Node's stream layer controls the read position.

For a stream, Node tracks state like:

```text
current offset
start
end
highWaterMark
bytesRead
```

Each time Node wants another chunk, it submits a read request with a specific offset.

Conceptually:

```text
read fd at offset 0, length 64 KB
read fd at offset 65536, length 64 KB
read fd at offset 131072, length 64 KB
...
```

The libuv worker receives a specific job:

```text
Read N bytes from file descriptor FD at offset X.
```

After the read finishes, Node updates its stream state:

```text
offset += bytesActuallyRead
```

The ownership is:

```text
Node.js ReadStream
    owns stream state and next offset

libuv fs request
    carries one offset for one operation

worker thread
    executes that one read operation
```

---

## 14. What happens when the file is closed?

Closing the file is just another filesystem operation.

It is not the thing that "returns the worker thread to the pool," because the worker thread already returns to the pool after every individual job.

For a stream:

<div class="flow-map">
  <div class="flow-row-inline">
    <span>open file</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker job</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker returns to pool</span>
  </div>
  <div class="flow-row-inline">
    <span>read chunk 1</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker job</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker returns to pool</span>
  </div>
  <div class="flow-row-inline">
    <span>read chunk 2</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker job</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker returns to pool</span>
  </div>
  <div class="flow-row-inline">
    <span>read chunk 3</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker job</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker returns to pool</span>
  </div>
  <div class="flow-row-inline">
    <span>close file</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker job</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker returns to pool</span>
  </div>
</div>

The file descriptor is tracked by Node's stream object.

The worker only temporarily handles concrete operations like:

```text
open
read
close
```

---

## 15. Are files the only thing using the worker pool?

No.

The worker pool is commonly used for operations that may block or are CPU-heavy.

Examples:

```text
Filesystem I/O
DNS lookups via getaddrinfo/getnameinfo
Crypto operations
Compression / zlib
Custom work scheduled with uv_queue_work()
```

In Node.js terms:

<div class="flow-map">
  <div class="flow-row">
    <span class="flow-label">fs.readFile()</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker pool</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">fs.createReadStream</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker pool per read job</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">dns.lookup()</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker pool</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">crypto.pbkdf2()</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker pool</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">zlib.gzip()</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>worker pool</span>
  </div>
</div>

But typical TCP/UDP socket I/O does not use the worker pool in the same way.

<div class="flow-map">
  <div class="flow-row">
    <span class="flow-label">net.createServer()</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>event loop / OS polling</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">socket.on(&quot;data&quot;)</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>event loop / OS polling</span>
  </div>
  <div class="flow-row">
    <span class="flow-label">setTimeout()</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>event loop timer logic</span>
  </div>
</div>

A useful rule:

> If the OS can notify libuv when a resource is ready, libuv can use the event loop. If the operation would block or burn CPU, libuv often moves it to the worker pool.

---

## 16. Does Node.js have only one event loop?

The precise answer is:

> A typical Node.js main thread has one event loop. But a Node.js process can have multiple event loops when using Worker Threads.

libuv itself supports multiple loops:

```c
uv_loop_t loop1;
uv_loop_t loop2;

uv_loop_init(&loop1);
uv_loop_init(&loop2);
```

You can run different loops on different native threads.

But Node.js normally uses this structure:

```text
Main Thread
    V8 isolate
    JavaScript execution
    Event loop
```

The reason is mostly simplicity and safety.

JavaScript code in a given V8 isolate is single-threaded. That avoids shared-state race conditions.

If multiple event loops executed callbacks against the same JavaScript heap, code like this would become dangerous:

```js
counter++;
```

Two loops could mutate the same state at the same time.

So Node's model is:

<div class="flow-stack">
  <div class="flow-node">One JavaScript execution context</div>
  <span class="flow-icon flow-icon-link" aria-hidden="true"></span>
  <div class="flow-node">One event loop</div>
</div>

---

## 17. Worker Threads and multiple event loops

Modern Node.js supports Worker Threads.

With workers, the architecture becomes:

```text
Main Thread
    V8 Isolate A
    Event Loop A

Worker Thread 1
    V8 Isolate B
    Event Loop B

Worker Thread 2
    V8 Isolate C
    Event Loop C
```

Each worker has its own:

```text
JavaScript execution context
V8 isolate
event loop
microtask queue
timers
```

So Node can have multiple event loops, but not multiple event loops freely sharing one JavaScript execution context.

---

## 18. Why not multiple event loops in one thread?

A single OS thread can only run one instruction stream at a time.

If one thread had multiple event loops:

```text
Thread
    +-- Loop A
    +-- Loop B
```

something would need to schedule between them:

```text
Run Loop A
Run Loop B
Run Loop A
Run Loop B
```

But that becomes another event loop above the event loops.

Usually, it gives no benefit.

One event loop can already manage many resources:

```text
1 event loop
    10 sockets
    100 timers
    1000 streams
    100000 connections
```

The event loop is not one-loop-per-resource. It is one loop managing many handles.

---

## 19. Final mental model

Here is the whole picture:

<div class="flow-stack">
  <div class="flow-node">JavaScript code</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node.js APIs</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node C++ bindings</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv</div>
</div>
<div class="flow-map">
  <div class="flow-node">
    <span class="flow-label">libuv has:</span>
    <ul class="flow-list">
      <li>event loop</li>
      <li>handles</li>
      <li>requests</li>
      <li>worker thread pool</li>
      <li>OS-specific backend</li>
    </ul>
  </div>
</div>

For sockets:

<div class="flow-stack">
  <div class="flow-node">Socket registered with OS</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">event loop sleeps in poll</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">kernel wakes event loop when socket is ready</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv dispatches callback</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node runs JS callback</div>
</div>

For filesystem streams:

<div class="flow-stack">
  <div class="flow-node">Node stream decides it wants data</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node submits read request with offset and size</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv queues job to worker pool</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">worker performs blocking read</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">worker reports completion</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">event loop wakes</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node receives chunk</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">JS consumes chunk</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">Node decides whether to request another chunk</div>
</div>

For sleeping:

<div class="flow-stack">
  <div class="flow-node">event loop calls OS wait function</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">kernel saves thread state</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">thread marked sleeping</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">thread removed from runnable queue</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">CPU runs something else</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">event or timeout happens</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">thread marked runnable</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">scheduler runs it</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">OS wait function returns</div>
  <span class="flow-icon flow-icon-down" aria-hidden="true"></span>
  <div class="flow-node">libuv continues</div>
</div>

For worker pool jobs:

```text
Worker does not own a resource.
Worker owns one job at a time.

open job
read job
read job
close job
crypto job
dns job
zlib job
```

For Node event loops:

<div class="flow-map">
  <div class="flow-row-inline">
    <span>One main JS thread</span>
    <span class="flow-icon flow-icon-right" aria-hidden="true"></span>
    <span>one main event loop</span>
  </div>
  <div class="flow-node">
    <span class="flow-label">Worker Threads:</span>
    <ul class="flow-list">
      <li>each worker thread has its own JS context and event loop</li>
    </ul>
  </div>
</div>

---

## 20. The shortest possible version

If you only remember one thing, remember this:

> libuv is a user-space abstraction over OS event mechanisms and blocking-operation offloading. The event loop sleeps efficiently by letting the kernel block the thread until an event or timeout occurs. Network I/O usually uses OS readiness/completion notifications. Filesystem I/O usually goes through the worker pool. Node streams do not let workers push data endlessly; Node submits read jobs as needed, tracks offsets, and applies backpressure. A typical Node main thread has one event loop, while Worker Threads can have their own separate event loops.

---

## 21. Vocabulary recap

| Term | Meaning |
| --- | --- |
| Event loop | The loop that waits for events and dispatches callbacks |
| Poll timeout | How long the loop can sleep while waiting for I/O |
| Blocking syscall | A system call that may put the thread to sleep |
| Sleeping thread | A thread waiting for an event, not consuming CPU |
| Runnable thread | A thread ready to run but not necessarily currently running |
| Running thread | A thread currently executing on a CPU |
| Context switch | Saving one thread's CPU state and running another thread |
| epoll/kqueue/IOCP | OS-specific event notification mechanisms |
| Worker pool | A group of native threads used for blocking/expensive jobs |
| Backpressure | Flow-control mechanism that prevents unlimited buffering |
| highWaterMark | Stream buffer threshold that affects when more data is requested |
| V8 isolate | A separate JavaScript engine instance/context |
| Worker Thread | A Node.js thread with its own JS context and event loop |

---
