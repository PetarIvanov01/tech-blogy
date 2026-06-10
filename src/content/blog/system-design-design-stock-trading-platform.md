---
title: "System Design: Design Stock Trading Platform"
description: "Notes on designing a stock trading platform, covering trading flows, market data, consistency, latency, and order execution."
pubDate: 2026-03-16
slug: "system-design-design-stock-trading-platform"
tags: ["system-design", "trading", "architecture"]
draft: false
series: "System Design Interview"
seriesOrder: 16
---
> System Design Interview series: System Design: Design Stock Trading Platform
> Summarizing chapters

## Functional Requirements

Required:

- Buy and Sell stocks
- Use the real-time market data feed service

Optional:

- View portfolio (holdings, P&L)
- User account & balance

## Non-Functional Requirements

For the trading flow (Buy/Sell), I would prioritize strong consistency over availability, because any inconsistencies could lead to incorrect trades, double-spending, or overselling stocks and other unpredictable scenarios.

The system should be low on latency because stock prices change very quickly, and users expect their orders to execute at/close to the current market price.

---

(Thought) - I am not sure if the questions below are good enough or for the non-functional requirements stage.

- How is market data delivered to the system? Is it streaming or polling?
- What is the expected frequency and volume of market data updates?
- What is the acceptable delay between receiving market data and delivering it to users?

Are these questions useful? I could potentially use some of them in order to infer, for example, how the market data service will communicate with the other parts of the system.

Like, if the data is delivered via streaming, at high frequency, I can go for WebSocket communication. IDK

---

We prioritize consistency over availability, so if the service handling Buy/Sell is down, we will reject orders but still provide real-time data for read-only access.

The system should support 10M DAU.

We have, on average, 3 operations (Buy/Sell) per day.

To convert Q/s → 10M users × 3 ops/day = 30M ops/day → 30,000,000 / 86,400 ≈ 347 ops/sec

Peak load → 3 to 4 times higher in open markets ≈ 700 - 1500 ops/sec

The system should be durable for all buy/sell operations, meaning no loss of orders or trades.

Market data updates must be delivered with low latency and high throughput.

## High Level Architecture

![Design Stock Trading Platform figure 1](/images/system-design/design-stock-trading-platform/1.png)

1. The user places a trade (Buy/Sell)
2. Request goes to API Gateway
   1. authenticate the user
   2. rate limiting
   3. route to order service
3. Order service receives the request
   1. validates the input/ check user balance
4. Get latest market price
   1. Order service calls the Market Data Service to get the latest stock price (sync request)
5. Executes the trade
6. Store the operation in the database (order record, timestamp)
7. Respond to user (order confirmation, status)

---

Send real-time updates to clients

1. Market Data Service receives live price updates from external providers
2. Market Data Service publishes these updates to a pub/sub system (Kafka)
3. WS Gateway consumes updates from it
4. WS Gateway pushes updates to connected clients via WebSockets

---

## Deep Dive

Right now, the order service makes a synchronous call to get the latest stock price to execute the operation. To reduce latency and remove the dependency on synchronous calls, we can move to a push-based model where Order Service consumes price updates from Kafka.

![Design Stock Trading Platform figure 2](/images/system-design/design-stock-trading-platform/2.png)

1. Market Data Service sends the real-time price updates to Kafka topic
2. Kafka distributes the update to all consumers
3. Order service consumes the updates
   1. When a new price arrives, it stores it in the in-memory for fast access.
4. A user places an order
   1. Order service receives the request
   2. Instead of calling the Marked Data Service, it has the data in-memory wit the latest value
5. Order service executes the trade
6. Stores the result in the database
7. Return response to the client

---

The Order Service can be scaled horizontally by adding more instances behind a load balancer (handled by the API Gateway). Each instance consumes price updates from Kafka and maintains its own in-memory cache. The main bottleneck becomes the database, which can be scaled using sharding.

We choose Postgres because it provides strong consistency and ACID transactions, which are critical for such a system (financial) to ensure the correctness of trades.

## Wrap up (issues of the system)

If Kafka experiences lag or becomes unavailable, the Order Service may stop receiving updates, causing the cached prices to become stale.

At higher scale, the database can become a bottleneck due to high write throughput, requiring techniques like partitioning or sharding.

The system assumes immediate execution using the latest price and does not include a matching engine (I saw other designs have it), which limits support for more advanced trading features like limit orders.
