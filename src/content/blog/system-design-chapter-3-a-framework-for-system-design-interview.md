---
title: "System Design Chapter 3: A Framework For System Design Interview"
description: "Notes from System Design Interview Chapter 3 on approaching system design interviews with requirements, estimates, APIs, data models, and tradeoffs."
pubDate: 2026-03-03
slug: "system-design-chapter-3-a-framework-for-system-design-interview"
tags: ["system-design", "interviews", "architecture"]
draft: false
series: "System Design Interview"
seriesOrder: 3
---
> System Design Interview series: Chapter 3 - A Framework For Interview
> Summarizing chapters

The idea of this chapter was to provide a well-structured plan to follow in the interview. Since SD interviews could be less than an hour, I have to follow a structured plan so I can showcase the best of my abilities and also give a good impression to the interviewer.
I also assume that having a plan and following it is 100% better than having no plan. (my opinion)

The framework consists of 4 steps, which I will define below.

---

**Step 1. Understand the problem, collect requirements, discuss the scope of the system.**

In this step, the whole point is to gather as much of the most important information as possible so you can define the scope of the design.

For example, good questions would be to ask:

- What are the main features that the product should support?
- How many users will we have?
- What kind of data do we have to store?
- Is it a web app, or can it be run in a browser environment, or both?
- Do we have any existing components that we can reuse?
- In what timeframe does the company expect to scale up? (3 months, 6 months, 1 year)

Many other questions can probably come up throughout the process. However, I have to be specific and ask the most important ones, since the time for this step is limited, **at least 5-10 min.**

---

**Step 2. Create a high-level scope of the system design and discuss it with the interviewer until you both agree on it.**

In this step, the idea is to draw and discuss your ideas about what the system should look like with the interviewer. I have to take into account all the information from the previous step and define the structure, then ask questions to see whether the interviewer agrees with me. If we have any misalignment, I should fix it in this step, because later it’s too late.

In this step, I can also use the “back of the envelope” technique to quantify the requirements and learn more about what my system should be able to handle. However, I have to ask before going into that, since it’s time-consuming.

**Time: 10-15 min**

---

**Step 3. Deep into the design and focus on critical components.**

After we both agree on the high-level design that I sketched out, I have to dig into the more interesting parts. For example, I can talk about the communication protocols that are going to be used.

If we build a chat system, I probably have to explain and take into account the WebSocket protocol. However, I can also point out that since WebSocket servers are stateful, it’s harder to scale them up, and we might have to add more logic into our load balancer, and so on.

In a URL shortener, I can dig into the hashing function, how to handle collisions, and how the schema of the data will look in our database.

Basically, I have to focus on a specific component (best to be the most critical one, I guess) and define its structure, characteristics, and how it works.

**Off topic:** I heard somewhere that it is good to focus on the components that I have more knowledge about, since the interviewer might get interested and keep me on that component, basically where my strengths are.

For example, if I know more about databases than CDNs or load balancers, I have to focus on talking more about that here and keep the attention on that thing.

I am not sure if it’s a good idea. I have just heard it somewhere.

**Time: 15-25 min**

---

**Step 4. Wrap up.**

In this step, the discussion is more open. Still, I can outline:

- where the system can be improved if I had more time
- we can discuss what happens if errors occur in our system
- asking the interviewer what they would focus on to improve

Some Do’s and Don’ts from the author:

1. Ask more questions
2. Clarify requirements
3. Remove ambiguity
4. Don’t ASSUME anything or at least ask if you can assume something
5. Talk out loud about every decision, overall.
6. Work with the interviewer like it’s your teammate.
7. Don’t rush to a solution without making sure the points above have been discussed.

---
