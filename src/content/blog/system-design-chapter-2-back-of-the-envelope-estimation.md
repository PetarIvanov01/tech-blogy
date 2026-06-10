---
title: "System Design Chapter 2: Back-of-the-envelope Estimation"
description: "Notes from System Design Interview Chapter 2 on estimation, capacity planning, QPS, storage, bandwidth, and system scale."
pubDate: 2026-03-02
slug: "system-design-chapter-2-back-of-the-envelope-estimation"
tags: ["system-design", "estimation", "capacity-planning"]
draft: false
series: "System Design Interview"
seriesOrder: 2
---
> System Design Interview series: Chapter 2 - Back-of-the-envelope Estimation
> Summarizing chapters

Back-of-the-envelope estimation is a technique used in system design to make estimates such as:

- How many requests/queries per second are made by our user base.
- How much data we are going to store, and for how long.
- What our MAU/DAU is (monthly/daily active users).

We gather this information so we can later estimate how scalable our system should be, how performant it should be, how much data storage we need, and so on.

There are three concepts in the book that the author emphasizes:

- Powers of two
- The approximate latency of different operations
- Availability numbers

“Powers of two” is a data sheet that shows approximately how many bytes different storage units represent, so we can calculate an approximate number of data units the system/database should support.

We have 8 bits, which is equal to 1 byte. After that, all other units are compared to bytes. For example:

|  | Approximate bytes/value | One data unit |
| --- | --- | --- |
|  | 1000 | 1 KB |
|  | 1 Mil | 1 MB |
|  | 1 Billion | 1 GB |
|  | 1 Tril | 1 TB |
|  | 1 Quadril | 1 PT |

After watching the video, I also learned that it’s easier to use powers, so we basically have:

1000 = 10^3 = 1 KB

1 Mil = 10^6 = 1 MB

1 Bil = 10^8 = 1 GB

1 Tril = 10^12 = 1 TB

1 Quadril = 10^15 = 1 PT

This way, it is much easier to simplify the calculations. I think this uses scientific notation, but I am not very familiar with this term.

---

Latency of different operations, again it’s a sheet with different operations and how much time they cost. I did not remember all of them yet.

| Operation | Time |
| --- | --- |
| L1 (Hitting the l1 cache of the cpu) | 0.5 nano seconds |
| Branch misspredict (the cpu tries to guess the conditional but it fails so it throws away the computed work and continues from the correct branch of the condition) | 5 nano seconds |
| Mutex lock/unlock (probably it’s a lock when it comes to using threads within the cpu, not some destributed lock) | 150 nano seconds |
| Compress 1 KB data with “something” | 10500 nano seconds |
| Read 1 MB from array in memory  | 200 000 nano seconds  |
| Read from disk  | 10 ms |
| Send CA packet (probably cartificate of authoritiy to validate be able to use HTTPS; security) between USA and Europe | 200 ms |

Some notes that the author made are:

- Compressing data before sending through the wire is faster since we send less memory.
- Avoid frequent reads from disk when possible
- It takes a bit of time to make requests between data centers (this probably should guide me to use some technique to minimize round-trips between data centers such as CDNs)

---

Availability numbers

Another sheet that outlines how much the “nine” matters when it comes to how available a system is.

| Percentage of Availability | Downtime per year (aproximated) |
| --- | --- |
| 99.9 % | 3,5 days |
| 99,99 % | 8 hours |
| 99.999 % | 50 min |
| 99.9999 % | 5 min |

Basically, the more nines is better.

---

These were the main concepts of the chapter, after that the author showed a real example, which I did not remember exactly.
Instead, I will ask GPT to generate an example without asking for a solution, also I will show the prompt and response down below. Also, I won’t give him my answer so I won’t see if it’s correct and you can judge my real knowledge.

---

 Prompt:

:::note
I am currently preparing to become better at System Design interviews. I am reading a book called "System Design Interview" by Alex Hu. Yesterday, I read the second chapter, "Back of the envelope estimation" and now I have made a summary of the chapter. I want you to help me test my ability to calculate such estimations using the methods from the book, so please provide a good example.
:::

GPT Response:

:::note
Your Task:

Using back-of-the-envelope estimation, calculate the following:

1. Traffic Estimation

Assume:

The service has 100 million daily active users (DAU).

On average, each user creates 0.2 new shortened URLs per day.

Each user clicks shortened URLs 5 times per day.

Estimate:

Number of new URLs created per day

Number of read (redirect) requests per day

Average read requests per second (QPS)

Peak QPS, assuming peak traffic is 5× average

1. Storage Estimation

Assume:

Each shortened URL record stores:

Short URL: 7 bytes

Long URL: 100 bytes

Metadata (timestamps, user ID, etc.): 100 bytes

The service retains data for 5 years

No deletions

Estimate:

Storage required per URL

Total number of URLs stored after 5 years

Total storage required

---

How I Recommend You Solve It

Follow Alex Xu’s approach:

Write down assumptions clearly

Round numbers aggressively

Solve step by step

Focus on order of magnitude, not precision
:::

My answer:

1. Traffic Estimations
- 100 mil DAU * 0.2 = 20 mil DAU are creating a shortened URL
- 100 mil DAU * 5 = 500 mil DAU are clicking a shortened URL

1 Day = 24 hours * 60 min * 60 seconds = 24 * 3600 = 86 400 seconds per day

Average read requests per second would be clicking a shortened URL probably.

- We have 500 mil reads per day ⇒ 500 Mil / 86 400 ⇒ around 5787 average RPS
- Peak is 5787 * 5 ⇒ around 28935 RPS
1. Storage Estimations
- metadata + short URL + long URL = 207 bytes stored per short URL

To calculate the number of URLs stored after 5 years, I need how many URLs are created for this amount of time:

- 20 Mil URL per Day (comes from the calculation above that 20 mil users per day create one shortened URL)
    - 20 mil URL per day * 365 * 5 = 3.65 * 10^10 URLs for 5 years = 3.65 * 10^10 URLs
- 365 Bil URLs * 207 ⇒
    - 365 bil URLs * 207 bytes ⇒
        - 3.65 * 10^10 * 2.07 * 10^2 ⇒
            - 3.65 * 2.07 * 10^12 ⇒
                - 7.5(around) * 10^12 ⇒ 7.5 Terabytes of storage would be needed for 5 years persistance

---

Overall as final notes of the author, I don’t have to be very precise in the calculations, I can round numbers. Also, it’s a good practice to write the units of every number, like KB, MB, DAU, MAU and so on.
