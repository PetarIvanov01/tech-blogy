---
title: "React Practical Questions"
description: ""
pubDate: 2026-04-14
slug: "interview-questions-react-practical-questions"
tags: ["interview-questions", "react", "frontend"]
draft: false
series: "Interview Questions"
seriesOrder: 1
---

## Questions

### **What is React and how do the core concepts work?**

React is a tool (some people argue whether it’s a library or framework; I don’t see much value in arguing such things) used for creating client-side applications. It allows declaratively defining logic and interacting with state. The React core concept is to connect the UI and State, where each change of the state updates the UI.

It has the concept of render, where once the tree of components is built, it is rendered on the screen. React allows us to hook up to certain lifecycle events, such as component mount, update, and unmount (typically done using Hooks like `useEffect` in modern React).

Another concept is the Virtual DOM, which is a lightweight representation of the real DOM. It builds it from the output of the React components (JSX) and keeps track of them and their state. When state changes, React schedules a re-render and creates a new Virtual DOM tree.

Reconciliation is a process where, when an update happens, the virtual DOM uses the current Fiber Tree and the new one with the updates, and has to diff them to know which part of the tree has to be updated. Then the current fiber tree is being replaced with the new one.

### **What is the Context API and how does it work?**

In React, when children want to use a state defined by their parent, the parent has to pass it as “props”. When we have a deep component tree, and components that are deep down in the tree need to use state from the top-most parent, we have to propagate it through all of the components; this is called “prop drilling”. To tackle this, we can use the Context API. Basically, we have to first create the context and provide default values, then we have to wrap the whole branch with it. From that point, every child can use another API called “useContext” hook, passing the created Context, and is able to use the state. This removes the need to prop drill, because we can just pull out the state in the exact place on the tree.

### **What is useState and how does it work?**

`useState` is one of the most valuable hooks that functional React provides. It’s a hook that allows us to create a state, which will be tracked by React. The hook returns the state and a setter function. The setter function is used to both update the state, but more importantly, to tell React that a re-render has to happen because the state has changed, thus the UI has to change.

The updates are asynchronous, which allows React to batch them and update the tree in one operation, which makes it very performant and non-blocking.

### **What is useEffect and how does it work?**

`useEffect` is a hook that allows us to intercept the lifecycle of a component. It accepts two arguments:

- Function, used to execute logic that should happen, either on initial render or on each re-render. The function can return another function, which is called when the component is unmounted; it’s used mostly for some clean-up logic.

- Dependency array (optional) - If not provided, the function is executed each time a render/re-render happens. If the array is empty, the function is going to run only when mounting the component, and if we have state inside the array, the function will be called when that state changes, whether it’s value or reference.

### **What is React.memo and how does it work?**

`React.memo` is a higher-order function that accepts a component and returns a memoized version. Basically, the newly returned component is going to re-render only when the props have changed, so even if the parent updates, that memoized component won’t re-render if its props haven’t changed. It also allows us to define which props should be tracked and only if they change to update the component. The comparison of props is shallow, so it checks for equal reference and values for primitives.

### **What is useCallback and how does it work?**

`useCallback` is a hook that accepts a function and a dependency array. It memoizes the whole function, making it stable across re-renders, and it’s going to update the reference only when the state in the dependency array has changed.

### **What is useMemo and how does it work?**

`useMemo` is a hook that accepts a function and a dependency array. It memoizes the output of the function, and it’s going to recompute it only when the state in the dependency array has changed.

### **Why are hooks called useSomething?**

This comes from the so-called `Rules of React,` a set of rules/ conventions that React partially enforces us to follow in order to have the best experience. The `use` naming allows React and tools like linters to identify Hooks and enforce rules such as calling them only at the top level of components or other Hooks.

### **What are controlled components?**

In a controlled component, the input’s value is stored in React state, and any changes are handled through an `onChange` handler that updates that state. This creates a **single source of truth**, where React fully controls the form element. Such components are: `input`, `select`, and `textarea` elements, where their value is tied to the state and updated via setters.

### **What are uncontrolled components?**

Instead of using React state and `onChange` handlers, we can use `useRef` to directly access the DOM element and read its value when needed, such as on form submission.

### **What is data fetching in React and how do you design it?**

Data fetching usually happens using the `useEffect` hook, because the fetching is async and React doesn’t allow to block the initial render, thus we have to schedule re-render with the new data using setter inside the `useEffect`.

However, nowadays we reach out to data fetching libraries such as React-Query, which gives use error, loading states and better primitives to perform data fetching. Also, we the newer versions of React we can use the `use` function to resolve promises, however, we have to wrap the component inside a `Suspense` component and provide a fallback component.

### **How do you handle loading states?**

Loading states are usually handled via another `useState` state, initially set to true, and updating the value to false when the promise or work is done.

### **How do you handle error states?**

While fetching, we have to wrap the promise inside a try/catch block and handle the errors/ show them to the user by updating another setter state.

### **What is caching in data fetching?**

Caching is when storing the results of the fetch on the client side, next to a key. Before doing the fetch, first check the cache, and if we have a cache miss, fetch the data and store the result in the cache. This way, we reduce the network calls and latency. Caching is usually handled by libraries like `React Query` or `SWR`. There `cache` function provided by React that can also be used to store the final output of a function.

### **What is request deduplication?**

Request deduplication is the process of preventing multiple identical network requests from being executed at the same time.

### **How do retries work in data fetching?**

Usually, the data fetching library provides a property we can use to specify how many retries to attempt when the fetch fails. We can also add exponential backoff. It’s not preferred to retry fetches that return 4** status code because they are not failing because of network issues; instead, we retry only fetches that return 5** status code.

### **How do you design data fetching effectively?**

We have to ensure the promise is wrapped inside a try/catch; we track the loading, error, and resolve states. Also, we have to ensure no duplicate requests occur. Because of the complexity that comes with designing data fetching effectively, React mentions in their docs that `useEffect` is not a good way for data fetching and suggest us to opt for libraries.

### **What is React concurrency?**

After React 18v, the team introduced the new mode of rendering. Previously, all of the rendering and state updates happened synchronously, which doesn’t scale well since it starts blocking the UI, and we as developers can not prioritize work and state changes.

The new model is asynchronous, meaning there are no blocking issues anymore. Also, React can now prioritize and pause work; for example, changes that happen by the user’s click, or like, are given the highest priority, and the UI has to update immediately.

### **What is useTransition?**

`useTransition` is a hook used to mark certain state updates as non-urgent, allowing React to prioritize more important updates like user interactions. It returns a loading state (usually called `isPending`) and a function (`startTransition`). The `startTransition` function is used to wrap state updates that can be deferred.

When a state update is wrapped inside `startTransition`, React treats it as low-priority work. This means it can delay or interrupt that update if more urgent updates occur, such as typing or clicking.

### **What is interruptible rendering?**

Instead of rendering the entire UI in a single blocking operation, React breaks the work into smaller parts. This allows it to interrupt an ongoing render if something more important happens, such as a user interaction.

### **What causes a re-render in React?**

A re-render in React happens when a component is executed again to produce the newly updated UI.

There are several causes for re-renders:

- State changes - when a component updates its own state using `useState` or similar hooks, it triggers a re-render of that component.

- Props changes - when a parent component re-renders, all of its children will also re-render, even if their props haven’t changed, unless we are not using `React.memo` .

- Context changes - when a context value changes, all components that consume that context will re-render.

- Hooks and state from external sources - if we are using Redux, Zustand, or other state management libraries, they can trigger re-render when their state updates.

### **How do props trigger updates?**

Because the direction of state propagation is unidirectional. When parent component re-renders, it may pass new prop values to its children. If those props have changed (by reference or value), React will re-render the child component to reflect the updated data.

In many cases, props are derived from the parent’s state, so when the state updates, new props are passed down, causing child components to update as well.

Even if the props have not changed, a child component may still re-render when the parent re-renders, unless optimizations like `React.memo` are used to prevent unnecessary updates.

### **How does state trigger updates?**

State triggers updates in React through hooks like `useState`, where the setter function is used to schedule a re-render with a new state value.

When the setter function is called, React does not update the state immediately. Instead, it schedules an update and re-renders the component with the new state. This process allows React to optimize performance by batching multiple state updates into a single render.

State updates are also compared using reference equality, so if the new state value is the same as the previous one, React may skip the re-render.

### **How does React diff the Virtual DOM?**

On each update, React builds a new tree with the components marked as dirty where the update has happened. Then it performs shallow comparison between the two trees for each node. When it reaches the nodes that are different, it marks the whole branch for update. It also compares the type of elements, for example, if we have a div and then a span, React will unmount the div and mount the span. Another check is made for the key property; if it has changed, React remounts the component.

### **Why do keys matter in lists?**

Keys are used to uniquely identify elements between renders in lists. They help React determine which items have changed, been added, or been removed when a list is updated.

During reconciliation, React uses keys to match elements in the previous render with elements in the next render. This allows React to update only the necessary parts of the UI instead of re-creating the entire list.

### **When should you lift state?**

Lifting state is usually necessary when components that are siblings need to share one state value. Because the data flow is unidirectional, we don’t have any other option but to lift the state.

### **When should you pass callbacks instead of state?**

We pass callbacks to child components when we want the child to communicate back to the parent.

Since the data flow in React is unidirectional (from parent to child), a child cannot directly modify the parent’s state. Instead, the parent passes a callback function (often wrapping a state setter) down to the child, and the child calls that function when something happens.

### **How do you design reusable components?**

We need to abstract values and behavior using props, so the component does not rely on hardcoded data and can be used in different contexts. Also, the component should have a narrow, single responsibility, meaning it should only handle one clear task of UI or logic.
The component should be decoupled from any external state.

### **What errors should you catch in React?**

We can catch both sync and async errors. For sync errors, we can use the error boundary component and wrap the part where this sync error could occur. For async ones, we have to wrap the logic with try/ catch and handle the error in the catch.

### **What fallback UIs can you design?**

Fallback UIs in React are UI states that are shown when the main content can not be rendered directly or can not be rendered at all. They are important for maintaining a good UX and avoiding blank or broken pages.

When implementing components, it’s important to consider all possible states they can be in.

Often fallbacks scenarios are:

- Loading states - shown while data or components are being loaded (spinners or skeleton loaders).

- Error states - shown when something goes wrong, often handled using Error Boundaries to prevent the entire app from crashing.

- Empty states - when there is no data to display (rendering a list of items, but there are no items to render)

- Auth fallbacks - when a user does not have access to a certain page, we can show “Access denied” or redirect him to login.

- Loading components lazily - using Suspense to show a fallback UI while the component is being dynamically loaded.

All of these states can be implemented using conditional rendering, Suspense, and ErrorBoundaries.

### **What are smart components?**

Components having certain logic inside.

### **What are dumb components?**

Components that are used only for visual appearance. No logic inside.

### **What is unit testing in React?**

It’s quite easy to do unit testing in React, since the model has the concept of a component, we can just take each component and test its behaviour in isolation.

### **What is integration testing in React?**

Integration testing in React is the process of testing how multiple components work together as a system.

### **What should not be tested in React?**

Probably, any third-party code, stylings, and any APIs provided by React.
