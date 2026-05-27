# Kubernetes Notes

## What Problem Kubernetes Solves

Containers solve the "it works on my machine" problem by packaging the application together with its dependencies. That still leaves another problem: how do we run many containers reliably in production?

If we run containers manually on one or more virtual machines, we quickly run into operational issues:

1. We must start, stop, restart, and monitor containers ourselves.
2. We must decide where each container should run.
3. We must handle scaling when traffic increases.
4. We must recover when a container or machine fails.
5. We must roll out new versions without unnecessary downtime.

Kubernetes solves these problems by acting as a container orchestrator. Instead of managing individual containers manually, we describe the desired state and Kubernetes works to keep the cluster in that state.

Example:

- "I want 3 replicas of my API running."
- "The app should receive traffic only when it is healthy."
- "If one Pod dies, create another one."
- "Expose the app internally or externally."

That is the main Kubernetes idea:

- we declare what we want
- Kubernetes continuously tries to make reality match that desired state

---

## Core Building Blocks

### Cluster

A `Cluster` is the full Kubernetes environment. It is made of machines called `Nodes`.

### Node

A `Node` is a machine, virtual or physical, with CPU, memory, disk, and network resources.

There are two major categories:

- `Control Plane` nodes: manage the cluster
- `Worker` nodes: run application workloads

### Pod

A `Pod` is the smallest deployable unit in Kubernetes. A Pod usually contains one main container, but it can contain more than one container if those containers need to live and work together closely.

Important:

- Containers in the same Pod share the same network namespace.
- They can talk to each other over `localhost`.
- They can also share storage volumes.

Example:

- One Pod runs `my-api`
- Another Pod runs `postgres`

Even if each Pod contains one container, Kubernetes still manages Pods, not raw containers.

---

## High-Level Architecture

```text
kubectl -> API Server -> etcd
                     -> Scheduler
                     -> Controller Manager
                     -> Worker Nodes
                           -> kubelet
                           -> kube-proxy
                           -> Pods
```

`kubectl` is the client tool we use from our machine. Most operations go through the Kubernetes API.

---

## Control Plane Components

### `kubectl`

`kubectl` is the command-line tool used to communicate with the cluster.

Examples:

```bash
kubectl get pods
kubectl get nodes
kubectl apply -f deployment.yaml
kubectl describe pod my-pod
kubectl logs my-pod
```

To connect to a cluster, `kubectl` uses a `kubeconfig` file with cluster endpoint information, users, and credentials.

### API Server

The `API Server` is the main entry point to the cluster. All cluster operations go through it.

Examples:

- `kubectl apply -f app.yaml` sends a request to the API server
- controllers watch the API server for changes
- the scheduler reads pending Pods from the API server

If you remember one thing, remember this:

- Kubernetes components mostly communicate through the API server

### `etcd`

`etcd` is a distributed, strongly consistent key-value store. It stores the cluster state.

Examples of data stored there:

- which Nodes exist
- which Pods exist
- desired replica counts
- ConfigMaps and Secrets
- Service definitions

If the cluster state must be remembered, it is typically stored in `etcd`.

### Scheduler

The `Scheduler` decides on which Node a newly created Pod should run.

It looks at factors such as:

- available CPU and memory
- Pod constraints
- taints and tolerations
- affinity and anti-affinity rules

Important:

- the scheduler chooses a Node
- it does not actually run the container itself

### Controller Manager

The `Controller Manager` runs controllers that continuously compare desired state with actual state and fix differences.

Examples:

- Deployment controller: ensures the right number of Pods exist
- ReplicaSet controller: keeps the requested number of Pod replicas running
- Node controller: reacts when Nodes go down
- Job controller: tracks one-time task completion

This is one of the most important Kubernetes patterns:

- controller sees current state
- controller knows desired state
- controller acts until both match

---

## Worker Node Components

### `kubelet`

Each Node runs a `kubelet`. It is the agent on the Node that talks to the control plane.

Responsibilities:

- watches for Pod specs assigned to its Node
- makes sure containers are started and kept running
- reports Pod and Node status back to the cluster

The `kubelet` does not decide where the Pod should go. The scheduler decides that first.

### Container Runtime

The container runtime actually runs the containers.

Examples:

- `containerd`
- `CRI-O`

The kubelet asks the runtime to pull images and start containers.

### `kube-proxy`

`kube-proxy` helps implement Service networking on each Node.

It makes sure traffic sent to a Service can be forwarded to the correct Pods.

---

## Kubernetes Is Declarative

Kubernetes is usually managed through YAML `manifest` files.

A manifest describes the desired state of an object.

Example:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
```

Apply it with:

```bash
kubectl apply -f pod.yaml
```

Read manifests as:

- `apiVersion`: which API version this object uses
- `kind`: what object we are creating
- `metadata`: name, labels, annotations
- `spec`: desired state

---

## Labels and Selectors

`Labels` are key-value metadata attached to objects. They are extremely important because many Kubernetes objects find other objects through labels.

Example labels:

```yaml
metadata:
  labels:
    app: my-api
    env: prod
```

A `Selector` matches objects with certain labels.

Example:

- a Service selects Pods with `app: my-api`
- a Deployment manages Pods with matching labels

Without labels and selectors, many Kubernetes objects would not know what to manage or route traffic to.

---

## Pods

Pods are ephemeral. That means they are not meant to be treated like long-lived pets.

If a Pod dies, Kubernetes often replaces it with a new Pod rather than repairing the old one.

Important Pod facts:

- Pod IPs are not stable long-term
- Pods can be recreated
- Pods should be stateless unless persistent storage is used

Example Pod use case:

- a single `nginx` container for quick testing

In real applications, you usually do not create Pods directly. You create a higher-level object such as a `Deployment`.

---

## ReplicaSet

A `ReplicaSet` ensures that a certain number of identical Pod replicas are running.

Example:

- desired replicas: `3`
- if 1 Pod crashes, ReplicaSet creates another

Usually, we do not manage ReplicaSets directly. A `Deployment` manages them for us.

---

## Deployments

A `Deployment` is the standard way to run stateless applications.

It provides:

- multiple replicas
- rolling updates
- rollbacks
- declarative scaling

When you create a Deployment:

1. the Deployment creates a ReplicaSet
2. the ReplicaSet creates Pods
3. Kubernetes keeps that replica count running

Example Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
        - name: api
          image: my-api:1.0.0
          ports:
            - containerPort: 8080
```

Scale it:

```bash
kubectl scale deployment my-api --replicas=5
```

Rolling update example:

```bash
kubectl set image deployment/my-api api=my-api:1.1.0
```

Rollback example:

```bash
kubectl rollout undo deployment/my-api
```

---

## Services

Pods are short-lived and their IPs can change. A `Service` gives a stable way to reach a set of Pods.

A Service usually selects Pods by label.

Example:

- Pods labeled `app: my-api`
- Service forwards traffic to those Pods

### `ClusterIP`

Default service type. Exposes the app inside the cluster only.

Common use case:

- frontend Pod talks to backend Pod through an internal Service

### `NodePort`

Exposes the Service on a port on each Node.

Common use case:

- basic testing from outside the cluster

### `LoadBalancer`

Used mainly in cloud environments. Provisions an external load balancer that sends traffic to the Service.

Common use case:

- expose a public web app

Example Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api-service
spec:
  selector:
    app: my-api
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

This means:

- clients call the Service on port `80`
- traffic is forwarded to matching Pods on port `8080`

---

## Probes

Probes are health checks for containers.

The two most important ones are:

1. `livenessProbe`
2. `readinessProbe`

There is also a third one:

3. `startupProbe`

### `livenessProbe`

Checks whether the container is still alive.

If it fails repeatedly, Kubernetes restarts the container.

Use it when:

- the app is stuck or deadlocked
- the process is running but no longer functioning correctly

### `readinessProbe`

Checks whether the container is ready to receive traffic.

If it fails:

- the container is not killed
- the Pod is removed from Service endpoints temporarily

Use it when:

- the app needs time to load data
- the app depends on a database connection

### `startupProbe`

Useful for slow-starting applications.

It gives the application more time to start before liveness checks begin.

Example:

```yaml
containers:
  - name: api
    image: my-api:1.0.0
    ports:
      - containerPort: 8080
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 20
```

Practical difference:

- readiness controls traffic
- liveness controls restart

---

## ConfigMaps

A `ConfigMap` stores non-sensitive configuration outside the container image.

This is useful because containers should be reusable and environment-independent.

Examples of data stored in ConfigMaps:

- application settings
- feature flags
- `nginx.conf`
- environment-specific values

ConfigMaps can be consumed as:

- environment variables
- files mounted through volumes

Example ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  APP_ENV: production
  LOG_LEVEL: info
```

Use it in a Deployment:

```yaml
envFrom:
  - configMapRef:
      name: api-config
```

Important:

- ConfigMaps are for non-sensitive data
- Secrets are for sensitive data

---

## Secrets

A `Secret` stores sensitive data such as:

- passwords
- API tokens
- database connection credentials

It can also be mounted as files or exposed as environment variables.

Important clarification:

- Secrets are not magically encrypted by default in every setup
- they are only base64-encoded in the manifest
- stronger protection depends on cluster configuration

---

## Namespaces

`Namespaces` logically separate resources inside the same cluster.

Common use cases:

- separate teams
- separate environments like `dev`, `staging`, `prod`
- avoid naming collisions

Examples:

```bash
kubectl get pods -n kube-system
kubectl get services -n default
```

The `kube-system` namespace contains many internal Kubernetes components.

---

## Requests and Limits

Containers can declare resource needs.

- `requests`: minimum resources the scheduler uses when placing the Pod
- `limits`: maximum resources the container is allowed to use

Example:

```yaml
resources:
  requests:
    cpu: "200m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

This matters because:

- scheduling decisions depend on requests
- limits help prevent one container from consuming too much

---

## Volumes and Persistent Storage

Containers are ephemeral, so data written inside the container filesystem can disappear when the Pod is recreated.

Volumes let Pods access storage.

Important distinction:

- a regular Pod restart may keep some Pod-level volume data
- a Pod replacement can still lose data unless persistent storage is configured

For stateful apps, Kubernetes typically uses persistent volumes.

Key objects:

- `PersistentVolume` (`PV`)
- `PersistentVolumeClaim` (`PVC`)

Simple idea:

- PV = actual storage resource
- PVC = request for storage by a Pod

---

## Ingress

`Ingress` manages external HTTP/HTTPS access to Services, usually with routing rules.

Example use case:

- `/api` goes to the API Service
- `/` goes to the frontend Service

Ingress sits above Services and usually requires an Ingress Controller such as NGINX Ingress.

---

## Useful Mental Model

Think of Kubernetes in layers:

1. `Pod` runs containers
2. `ReplicaSet` keeps the right number of Pods
3. `Deployment` manages updates for stateless apps
4. `Service` gives stable networking to Pods
5. `Ingress` exposes HTTP/HTTPS routes from outside

And behind all of this:

- the control plane watches desired state
- worker nodes run workloads
- controllers continuously reconcile differences

---

## Common Interview-Level Clarifications

### Pod vs Container

- container = the running process packaged as an image
- Pod = Kubernetes wrapper around one or more containers

### Deployment vs ReplicaSet

- ReplicaSet keeps N Pods alive
- Deployment manages ReplicaSets and rollout strategy

### Service vs Ingress

- Service exposes Pods inside the cluster or at the network level
- Ingress provides HTTP/HTTPS routing rules to Services

### Readiness vs Liveness

- readiness decides if traffic should reach the Pod
- liveness decides if the container should be restarted

### ConfigMap vs Secret

- ConfigMap = non-sensitive configuration
- Secret = sensitive configuration

---

## Minimal End-to-End Example

This example shows how a Deployment and Service work together.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo-api
  template:
    metadata:
      labels:
        app: demo-api
    spec:
      containers:
        - name: api
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: demo-api-service
spec:
  selector:
    app: demo-api
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

What happens:

1. Deployment asks for 2 Pods
2. ReplicaSet creates and maintains those 2 Pods
3. Service finds Pods with label `app: demo-api`
4. Other Pods can call `demo-api-service` inside the cluster

---

## Summary

Kubernetes is a system for running containers reliably at scale.

The most important ideas are:

- everything is described as desired state
- Pods are the basic workload unit
- Deployments manage stateless app replicas and rollouts
- Services provide stable access to Pods
- probes control health and traffic readiness
- ConfigMaps and Secrets externalize configuration
- the control plane continuously reconciles cluster state
