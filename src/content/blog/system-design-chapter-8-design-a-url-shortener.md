---
title: "System Design Chapter 8: Design A URL Shortener"
description: "Notes from System Design Interview Chapter 8 on URL shortener requirements, APIs, hashing, redirects, and storage design."
pubDate: 2026-03-08
slug: "system-design-chapter-8-design-a-url-shortener"
tags: ["system-design", "url-shortener", "architecture"]
draft: false
series: "System Design Interview"
seriesOrder: 8
---
> System Design Interview series: Chapter 8 - Design A URL Shortener
> Summarizing chapters

### Step 1: Understand the problem and define the scope

Let’s first obtain more information by asking questions about the problem.

1. Can you explain and give an example of how a URL shortener works?
    1. We have an original URL like `https://facebook.com/my-profile/32132139012` the service should generate a shorter URL and persist the mapping between them.
2. How much traffic we expect?
    1. 100 milion URLs are generated per day.
3. How long the shortened URL should be?
    1. length of 7 chars.
4. What kind of char can be used to generate the shortened URL?
    1. Digits from 0-9, lowercase and uppercase case English letters.

The logic that the service will implement is:

- Accept a long URL and create a shorter version
- Redirects from the shortened version to the origin URL

We also can use back of the envelope technique to gather more information about the scale.

- Writes: 100 million generated URLs/day
- Writes/second: 100 million / 24 / 3600 = 1160
- Reads: Assume the ratio for read/write is 10:1, so read are 1160 * 10 = 11600 reads/second
- Average URL length is 100 chars
- If the URL shortener is going to run for 5 years, we get 100 million * 365 * 5 = 182.5 billion records

---

### Step 2: Propose high-level design and agree on it

First we have to define the API Endpoints that the service will expose.

For this service, we need only two API endpoints:

1. POST /api/v1/url/shorten
2. GET /api/v1/{shortUrl}
- The POST endpoint accepts a long URL and returns a shortened URL.
- The GET endpoint redirects the client to the original URL using an HTTP redirect status code (301 or 302).

---

**URL Redirects**

There are two status codes used to redirect the client:

- **301** - Redirects the client to the URL in the `Location` response header. The browser caches this URL, so subsequent requests will not reach the server; instead, the browser will use the cached long URL. (Permanently moved)
- **302** - Redirects the client to the URL in the `Location` header, but the browser won’t cache it, so future requests will still hit the service. (Temporarily moved)

---

**URL Shortening**

To shorten a long URL, we need additional logic. One approach is to use a hash function that takes the long URL as input and generates a hash. The problem with this approach is that we cannot control the length of the hash output. In our case, we need only the first 7 characters. If we simply take the first 7 characters, we may end up with duplicate shortened URLs.

### Step 3: Design deep dive

Let’s define the table schema that will be used in the database.

We need:

- Primary key
- Short URL
- Long URL

If we use a hash function, we need to consider the length of the output. The value it produces consists of characters in [0-9, a-z, A-Z], which gives 62 possible characters. If the shortened URL length is 7, then we can generate 62^7 combinations, which is a lot.

The larger the length, the more unique combinations we get.

Since the hash output is typically longer than what we need, we would slice it to the desired length. However, this increases the likelihood of duplicates. To handle this, we need collision resolution.

Collision resolution means that when we generate a duplicate hash value, we append some string to the URL and re-run the hash function. This operation is recursive, so if we get another duplicate, we try again until we produce a unique value.

**Another approach is** to use Base62 conversion. Since we have 62 possible characters, we can use them as the digits of a base-62 number system and encode an ID. For example:

Base is 62, with the following mappings:

- 0 - 0, … 9 - 9
- 10 - a, … 35 - z
- 36 - A, … 61 - Z

Example: given the base-10 number 11157

We repeatedly divide by 62 and convert the remainder using our mapping:

- 11157 / 62 → Remainder: 59 → Char: X
- 179 / 62 → Remainder: 55 → Char: T
- 2 / 62 → Remainder: 2 → Char: 2

We end up with: **2TX**

---

Both approaches are fine and can get the job done.

**Hash + collision resolution**

- Fixed short URL length
- There is no need to have ID generator, the hash function creates the hash value
- Collisions are expected and should be handled
- It does not depend on anything, so the tracking of the next short URL is not possible

**Base 62 conversion**

- The length of the short URL is not fixed.
- Needs to have ID generator.
- Impossible to have collision because ID is unique (auto-incremented)
- Easy to track the next one if we know the previous ID.

---

**How shortening works**

For this we are going to use BASE 62 conversion.

1. Request comes with the long URL as input
2. Checks whether the DB has the longURL
3. If it is in the DB, we take the shortURL and return it to the client.
4. If not, the long URL is new and we would need to generated an unique ID
    1. Convert the ID to shortURL with base 62 conversion
    2. Create a new entry in the database with the ID, long and short URLs

If we need to scale the service, we would need to create destributed ID generator that will handle the global generation of IDs.

---

**How redirecting works**

1. Client clicks on a short URL - https://tinyurl.com/321dsa
    1. (If the URL was previously requested and the response status was 301, the browser will use its cached long URL)
2. The request is forwarded to the load balancer
3. If we have caches, the services will check whether the shortURL is in the cache. If yes - return, otherwise fetch from the database.
4. If it’s not in the database, nothing is returned as the client probably has used an invalid shortURL.
5. If it’s there, return the longURL with either 301 or 302.

---

### Step 4 - Wrap up

We looked at the API design, data schema, hash functions/ base 62 conversion, shortening, and redirecting.

If there is more time, other talking points could be:

- Rate limiting the number of requests, as the users could potentially DDOs our services
- Scalling the server as our design is stateless
- Scalling the database with replication and sharding.
