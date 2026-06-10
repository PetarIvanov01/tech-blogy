---
title: "JavaScript Practical Questions"
description: ""
pubDate: 2026-04-14
slug: "interview-questions-js-practical-questions"
tags: ["interview-questions", "javascript", "frontend"]
draft: false
series: "Interview Questions"
seriesOrder: 2
---

## Questions

### **What are the different data types in JavaScript?**

There are two data types in JavaScript:

- Primitives - String, Numbers, Symbols, Booleans, BigInt, undefined, null

- Reference - Objects, Functions, Arrays

Primitives are immutable, while the reference data types return a pointer to the actual memory space where the object is allocated, thus allowing us to modify it.

### **What is the difference between var, let, and const?**

Var, let, and const are keywords in JavaScript that allow us to create variables and give them names.

Var is globally/ function scoped, meaning we can access it outside of the global or function scope, however if we access the variable before giving it a value, we will get undefined.

Let and const are keywords introduced more recently in the language than var. They are scoped to the innermost scope where they are defined. If we attempt to use one of them before initialization, we will get a runtime reference error.

Variables defined with let can be re-initialized to new data types. However, variables defined with const can not be re-initialized to new data types. If the data type is a reference type, we can still modify the properties to other data types.

### **Explain how JavaScript hoisting works.**

Function declarations in JavaScript can be invoked before they are defined because they are hoisted “on top of the file” at compile time. The JS program executes in two steps:

- Creation phase - First, it goes top to bottom and allocates spaces for functions and var variables (initializing them). (let and const are also hoisted; however, they are placed in the so-called “temporarily dead zone, not allowing for their usage before initialization)

- Execution phase - Second, it actually executes the code, having already the pointers to them.

### **What is the event loop in JavaScript?**

JavaScript is single-threaded, meaning it has one call stack to execute code. However, it can handle asynchronous operations using the event loop.

The event loop coordinates execution between:

- **Call stack** – where synchronous code runs

- **Web APIs / Node APIs** – handle async operations (timers and network)

- **Microtask queue** – high-priority tasks (Promises, queueMicrotask)

- **Macrotask queue (task queue)** – lower-priority tasks (e.g., `setTimeout`, `setInterval`)

Execution flow:

1. Run all synchronous code on the call stack

2. Process all microtasks

3. Process one macrotask

4. Repeat

Microtasks (like Promises) are always executed **before** macrotasks.

### **What are closures and how do they work?**

Closures are a feature created by the scope, which allows variables defined in the outer scope to be used and persist across the lifetime of code defined in the inner scope. However, the opposite is not allowed.

We can access variables defined in an outer function scope inside an inner function scope, even though the outside has been removed from the call stack. Inside the execution context of each function, there is a property that points to the outer context of the outer function, allowing us to point to the variables there.

### **What is the difference between == and === in JavaScript?**

“==” operator tries to coerce the values on both hands to one primitive data type before comparing them, thus making 2 == “2” to evaluate → **true**

“===” operator compares the data type and value without coercing them. More strict comparison.

### **What is the purpose of use strict?**

“Use strict” is a directive used to enforce stricter rules in the environment in which JS runs. It removes some of the features that are allowed in a non-strict environment, such as declaring global variables without a keyword identifier and duplicate parameters.

### **Explain the difference between null and undefined.**

Both are primitive types and are used to represent “nothing”; however, null is used to explicitly say there is nothing, whereas undefined comes implicitly.

### **What are first-class functions in JavaScript?**

First-class functions mean that functions can be assigned to variables, can be passed around to other functions, and can be returned by other functions, just like variables can.

### **What is a promise and how does it work?**

Promise is an Object provided by the JavaScript API. It allows us to create code that can run asynchronously without blocking the order of execution. The Promise class accept a function with two functions as parameters:

- resolve (when being called in the executor function, it returns the value and put the promise in fulfilled state)

- reject (when being called in the executor function, it returns the value passed to it, and puts the promise in the rejected state)

While it’s running, the promise is in a pending state.

### **What is async/await and how does it differ from promises?**

async/await is syntactically sugared code over the Promise API. It’s introduced in later versions of EcmaScript and allows us to write more human-readable and reasonable code using async when creating functions and await to resolve a promise (this operation blocks the execution until we get either success or error as a response)

### **What is the difference between synchronous and asynchronous code?**

Synchronously defined code is executed in order, and each operation blocks the thread until it completes. Asynchronous code is sent out to the event loop and other APIs provided by Node.js or the browser, which handles its execution by using worker threads. When it’s done, the result is placed in some of the task queues and waits to be put on the call stack by the event loop.

### **What are arrow functions and how are they different from regular functions?**

Arrow functions are a different syntax to define functions - (args) ⇒ { /_ body of the function _/}, we can omit the brackets and write the body in one line, returning whatever the body returns.

They do not have context, and are using the context of the outer function declaration or the global scope.

### **What is the this keyword and how does it behave in different contexts?**

“this” represents the context in which a function is being executed. When using “this” in global scope, it refers to the global/window object depending on the environment we are running in.

All regular functions have their own “this” context, except arrow functions, which don’t have one. Their “this” points to the outer scope, whether global or function scope.

functions can be invoked with a different object using methods, like call, apply, and bind.

### **What is function binding and how do call, apply, and bind differ?**

Function binding is the ability to control the value of `this` when a function is executed. `this` is determined by how a function is called. We can use `call`, `apply`, and `bind` to explicitly change the context (`this` ) of a function.

- `call` invokes the function immediately and accepts arguments one by one; the first argument is the `this` object, and the next are passed as arguments, one by one, to the function.

- `apply` is the same as call, except the arguments are passed inside an array, rather than one by one

- `bind` accepts `this` context as the first argument and also accepts more arguments passed one by one; however, it does not call the function, instead creates a new one with the context and arguments

Note: Because arrow functions don’t have their own `this`, these methods do not affect them.

### **What are template literals?**

Template literals or “`” (backticks) are a way to create multi-line string literals, interpolate variables in them using ${} syntax, and create complex string objects.

### **What is the difference between prototypal inheritance and classical inheritance?**

Prototypal inheritance is a model used in JavaScript where objects inherit directly from other objects via the prototype chain, while classical inheritance is based on classes and instances.

### **What are ES6 modules and how do you import/export them?**

ES6 modules is the new module system defined in EcmaScript 6, which allows us to separate code in multiple files, and import/export logic from them into other parts of the application. The modules can be analyzed before execution, which makes the tree shaking easier.
We can export in two ways:

- Default export → export value/function/object;

- Named export → export { [key]: value/function/object }

Then we can import:

- Default import: Name the imported thing as you like

- Named import: Destructure the import to access the named values

### **What is the spread operator and how is it used?**

The spread operator is used to expand the object/array/string into another object/array/string. It is commonly used to create shallow copies, merge structures, and pass values as individual arguments to function calls.

### **What is the rest parameter and how is it different from the spread operator?**

While spread is used to expand structures, rest is used to combine multiple arguments inside the function parentheses into an array of them. Also, it can be used in conjunction with spread to first spread an object, access one of its elements/keys, and then use the rest operator to combine the rest of them into one structure.

### **What are higher-order functions?**

A higher-order function is a function that either takes another function as an argument or returns a function, or both.

### **What is event delegation?**

Event delegation is a technique where a single event listener is attached to a parent element instead of adding listeners to multiple child elements. This works because events are bubbling up to the parent, where it stops and are being handled.

### **What is a callback function and what problems can it create?**

Callback functions are functions passed as arguments to another function, which at some point will call them back, passing certain parameters. Before we had promises, callbacks were used for asynchronous work.

Basically, when the async function is ready with the response, it can call back us via the callback function, passing it the response.

However, when we need to create multiple steps of function calls, each taking the result from the previous, we would need to nest them one into another, creating callback hell, where we have multiple nested function invocations, making it harder to read and debug.

### **What are JavaScript generators?**

Generators are functions defined with the `function*` keyword that return an iterator object. They can yield multiple values using the keyword yield, which basically pauses the execution up to that point, and using the .next() method, we can resume from the last yield and continue with the next value to yield.

### **What are symbols in JavaScript?**

Symbols in JS are primitive type data that create unique values even with the same initializer value.

### **What are weak maps and weak sets?**

Collections used to store objects with weak reference, making them easier to be garbage collected if they are not referenced anywhere else. They miss some of the features that are in normal maps/sets. They can not be iterated and don’t have size property.

### **What are the new features introduced in ES6?**

Pff, they are a lot, let and const keywords, arrow functions, destructuring, rest, and spread operator, classes, import/export, promises.

### **What is the difference between map, filter, and reduce?**

Map creates a new array by applying a function to each element, returning a transformed value for every element

Filter calls a function for each value, and if the function returns true, it adds the value to the new array; otherwise, it’s skipped.

Reduce accepts two arguments: a function with two parameters (accumulator and the current value), and an initial point. The final value is the computed result of each call.

### **What is a promise chain?**

A promise chain is a sequence of `then` and `catch` calls to a promise. Each `then` returns a new Promise that is passed to the next in the chain.

### **What is the garbage collection process in JavaScript?**

Garbage collection is an automatic process handled by the JavaScript engine that manages the lifecycle of objects. It tracks references to objects to determine whether they are still accessible, and when to deallocate them from the heap and free memory.

It uses the `mark-and-sweep` algorithm, which is based on the concept of **reachability**.

Reachable means if an object can be accessed directly or indirectly from a set of root objects, such as global variables, objects in the current call stack, or closures.

Objects that are no longer reachable are considered **unreachable **and are ready to be GC-ed.

The GC works on two phases:

1. In the `mark` phase, the GC starts from the root objects and recursively marks all reachable objects.

2. In the `sweep` phase, it removes all unmarked (unreachable) objects from memory.

There are also optimizations like generational garbage collection, where objects are divided into young (newly created, short-lived, such as temporary variables, frequently cleaned) and old generations (survive multiple GC cycles, long-lived, such as app state and cached data, cleaned less often).

### **What are Web APIs and how do they relate to JavaScript?**

Web APIs are features provided by the Browser environment where JavaScript is being executed. Such APIs are: fetch, Navigation API, DOM, etc.

### **What is a service worker?**

A **web worker** is a browser feature that allows JavaScript to run in a separate background thread, independent of the main execution thread. It is mainly used to perform CPU-intensive tasks without blocking the UI, such as heavy computations or data processing.

Web workers have their own global execution context. They do not have access to the `window` object, and instead use `self` as their global scope. Communication between the main thread and the worker happens through message passing using `postMessage`, and both sides listen for messages via event handlers.

A **service worker** is a special type of web worker with a different purpose. Instead of performing computations, it acts as a network proxy between the web application, the browser, and the network.

It can intercept network requests and decide how to respond to them, for example, by serving cached responses or fetching from the network. They are often used for features like offline support, caching strategies, background sync, and push notifications.

### **What is the difference between localStorage and sessionStorage?**

LocalStorage persists data even after the browser is closed and is shared across all tabs of the same origin.

SessionStorage stores data only for the duration of a single tab session and is cleared when the tab is closed.

### **What are closures used for in real-world JavaScript?**

They are often used to encapsulate certain logic and behaviour, allowing inner functions to access the variables from the outer scope, even when the outer function is gone.

### **What is the prototype chain?**

Every object has an internal property called [`[prototype]]` that points to the prototype of its parent. For example, objects created by `{}` or with `new` their prototype points to the global Object class, which is why they have access to all methods that are otherwise defined in the Object class. It’s a chain because when a method or property is not found on the current object, its parent [prototype] is checked until it’s either found or not.

### **How does the browser parse and run JavaScript code?**

When the web page loads, the browser first starts parsing the HTML document and building the DOM tree.

While parsing HTML, when the browser encounters a JS file or script tag, it pauses HTML parsing (unless the script is markerd as async or defer) and fetches the JS code.

The JS engine (V8 or SpiderMonkey) then processes the code. First, it performs syntax analysis and parsing to convert the code into Abstract Syntax Tree (AST), which represents the structural meaning of the code.

The AST is then used by the engine to interpret or/and/or compile the code. Once compiled, the code is executed, and during execution, it can interact with and modify the DOM.

### **What is the difference between setTimeout and setInterval?**

Both are APIs to schedule a callback that will be triggered at some point in time. setTimeout it’s runs once after the second argument (milliseconds) elapses. setInterval schedules the callback repeatedly after the milliseconds elapse.

### **What is strict mode in JavaScript, and why is it used? (Duplicated with question 7)**

“Use strict” is a directive used to enforce stricter rules in the environment in which JS runs. It removes some of the features that are allowed in a non-strict environment, such as declaring global variables without a keyword identifier and duplicate parameters.

### **What is the difference between object copy by reference and by value?**

When we assign a primitive value to another variable, we allocate entirely new memory space for it. However, when we assign a reference object to another variable, the variable itself holds a pointer to the same memory space, thus allowing to modify the object using that variable, which will reflect in the first object itself.

### **What is event bubbling and event capturing?**

When we trigger an event, for example, we click a deeply nested button. First, the event is being propagated from the top-most element down to the button (capturing) and then bubbles up to the root.

### **What is debouncing and throttling?**

Debouncing is used, for example, when we have a search input and don’t want to trigger an API call for search on each keystroke, so we schedule a callback to be invoked after 300ms, for example, and if another keystroke occurs, we clear that callback and schedule a new one.

Throttling ensures a function is executed at most once every X milliseconds, no matter how many times the event is triggered.

### **What is the difference between mutable and immutable objects?**

A mutable object is an object whose properties can be changed after it is created.

An immutable (using `Object.freeze` method) object can not be altered once it is created.

### **What are microtasks and macrotasks in the event loop?**

These are queues used to store the final result of promises/async work. The microtask queue has a higher priority, meaning that if the call stack is empty and we have events in both queues, the event loop will first drain the microtask queue.

Macrotask queue stores callbacks from setTimeout, setInterval, setImmediate, and browser event handlers.

Microtask queue stores callbacks from Promises, async/await, queueMicrotask.

### **What is a promise's finally method and when is it used?**

It’s a method called at the end of the promise chain. It’s used mostly for some cleanup logic.

### **What are async iterators?**

They are the same as normal iterators, but instead of returning {value, done}, they return a promise that resolves to that object.

### **How does JavaScript handle errors? What are try/catch/finally?**

Code that could throw an error can be wrapped inside try/catch blocks, and the error can be handled inside the catch block. The finally block will run even if there is no error thrown.

### **What is destructuring assignment?**

Destructuring is a syntax that allows us to extract properties from objects or elements from an array.

### **What are default parameters in functions?**

We can assign values inside the function parameters, and if they are not provided as arguments on function invocation, the default value is used. Very handy feature.

### **What is the new keyword doing internally?**

The `new` keyword is used to instantiate a Class object. Internally, it creates an empty object, points the prototype to the prototype of the class, and calls the constructor method of that class.

### **What is a Proxy in JavaScript and what can it be used for?**

A proxy is an API in JavaScript that is used to intercept object operations and alter the behaviour.

### **What is the Reflect API?**

**Reflect is a built-in JavaScript object that provides a standardized, functional API for performing operations on objects.**

It includes methods such as `Reflect.get`, `Reflect.set`, `Reflect.deleteProperty`, and `Reflect.has`, which are the functional equivalents of common object operations like property access, assignment, deletion, and existence checks.

A key difference is that Reflect methods provide predictable return values. For example, when attempting to set a property on a frozen object, normal syntax (obj.age = 21) may fail silently or behave inconsistently, whereas `Reflect.set` explicitly returns a boolean indicating whether the operation was successful.

The main use case for Reflect is when using it in combination with the Proxy API. Using the Proxy, we can intercept operations like getting, setting, or deleting properties, and then use Reflect to forward those operations to the default behavior of the underlying object.

Reflect is mainly used for meta-programming scenarios and low-level object operation control, rather than typical application-level code.

### **What are JavaScript modules and why are they useful?**

JS modules are a way to split code into separate, reusable files, where each "module" has its own scope and can expose specific functionality using exports.

Modules are used to organize code by isolating the implementation details and preventing pollution of the global scope.

With ES6, JS introduces a standardized module system using `import` and `export`, which is now supported in modern browsers and widely used across environments. Before that, other patterns CommonJS(`require/ module.exports`) in Node.JS and AMD were used to achieve similar behavior.

One of the advantages of ES modules is that they can be statically analyzed, meaning the structure of `imports/exports` is known at build time. This enables optimizations like tree shaking, where unused code is removed from the final bundle by tools such as Webpack.

Modules improve code organization, reusability and maintainability, also enable better performance optimizations.

### **What is the difference between shallow copy and deep copy?**

When we make a shallow copy of a reference data type, the outermost object/array is a new one, if we have nested reference types, they still point to the same memory space as the ones in the previous object/array.

Deep copy ensures that all reference types in all levels are new ones.
