# Petar I

Astro-based technical blog with Markdown content collections.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the production site into `dist/` |
| `npm run preview` | Preview the production build |

## Writing Posts

Posts live in `src/content/blog` as Markdown files.

Required frontmatter:

```yaml
---
title: "Post title"
description: "Short summary for listings and metadata."
pubDate: 2026-05-27
tags: ["backend", "systems"]
---
```

## Markdown Features

### Code Blocks

Code blocks are rendered with Expressive Code. Use normal fenced code blocks:

````md
```yaml title="deployment.yaml" {3-5}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-api
```
````

### Callouts

Use directive blocks for notes, tips, warnings, and cautions:

```md
:::note
This is useful context.
:::

:::warning title="Production warning"
Check the failure mode before relying on this pattern.
:::
```

### Heading Links

Headings automatically receive stable IDs and hoverable anchor links.
