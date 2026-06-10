---
title: "System Design Chapter 5: Design Consistent Hashing"
description: "Notes from System Design Interview Chapter 5 on consistent hashing, data distribution, virtual nodes, and rebalancing."
pubDate: 2026-03-05
slug: "system-design-chapter-5-design-consistent-hashing"
tags: ["system-design", "consistent-hashing", "distributed-systems"]
draft: false
series: "System Design Interview"
seriesOrder: 5
---
> System Design Interview series: Chapter 5 - Design Consistent Hashing
> Summarizing chapters

## Overview

In a distributed environment, when having multiple horizontally scaled services, consistent hashing is used to map the incoming requests to a certain server using different hash functions and other techniques.

## The problem with rehashing

One simple design for hashing would be to use the following formula `serverIndex = hashFn(key) % N` where `N` is the number of available servers. This way, we can ensure that requests will be distributed evenly across all servers. This design works well and is simple if the number of servers won’t change. However, in the real world, services could be added or removed due to scaling down or up, which means a new `serverIndex` should be recomputed because the module operation would give a different value for the same hash key, which is bad because users would be routed to different services.

The main issue with this approach is that when N changes, most keys are remapped to different servers. This is problematic for stateful systems such as caches or session stores, where remapping keys causes cache misses and increases load on backend systems.

## Consistent hashing

Consistent hashing ensures that when the number of servers changes, only a fraction of keys (average k / n, where k is the number of keys and n is the number of servers) need to be remapped.

The key advantage of consistent hashing is that it minimizes key movement when servers are added or removed. Instead of remapping all keys, only a small portion of keys in the hash ring are remapped, while the others remain on the same servers.

The hash function produces values within a fixed numeric range. This range defines the boundaries of the hash space. By connecting the two ends of this range, we form a circular structure called a **hash ring**, on which both servers and keys can be placed.

Consistent hashing is useful for stateful architectures, such as distributed caches or databases, where data or sessions are tied to specific servers. In stateless systems, where any instance can handle any request, some load-balancing strategies are more suitable.

## Hash servers

By hashing a server’s IP address or name, we can map the server to a position on the hash ring.

In consistent hashing, the problem with rehashing doesn’t exist because there is no module operation here. Each key is hashed and placed directly on the ring, and the server responsible for that key is the first server encountered when moving clockwise from the key’s position.

When a new server is added to the hash ring, only a subset of keys needs to be remapped. Specifically, the new server is responsible for the keys that fall between its position and the previous server in the counterclockwise direction.

For example, if `server4` is added between `server3` and `server0` on the ring, then all keys that were previously mapped to `server0` and lie between `server3` and `server4` will be remapped to `server4`. This way, we won’t be remapping all of the keys, only those that were between 4 and 0.

When a server is removed from the hash ring, only the keys that were mapped to that server need to be remapped. These keys are reassigned to the next server in the clockwise direction.

For example, if `server4` is removed, all keys that were previously mapped to `server4` will be remapped to `server0`, assuming `server0` is the next server clockwise on the ring.

There are two main problems with the basic approach to consistent hashing:

1. Because servers can be added or removed at arbitrary positions on the hash ring, the hash space is not evenly divided. As a result, some servers may be responsible for much larger portions of the ring than others.
2. When partitions are uneven, some servers handle significantly more keys than others, creating hotspots and underutilized nodes.

Virtual nodes are used to improve load balancing in consistent hashing. Instead of placing each server only once on the hash ring, each server is represented by multiple virtual nodes placed at different positions.

This way, a server is responsible for multiple smaller partitions across the ring rather than a single large one. As a result, the load is spread more evenly, and it becomes less likely for a server to receive a disproportionately large number of keys.

For example, `server0` may be represented by virtual nodes `server0_0`, `server0_1`, and `server0_2`. Although these virtual nodes appear as separate points on the ring, they all map back to the same physical server.

When a key is hashed and placed on the ring, we move clockwise to find the first virtual node. The physical server associated with that virtual node is responsible for handling the key.

One downside is that more space is needed to store all of these virtual nodes on the hash ring.
