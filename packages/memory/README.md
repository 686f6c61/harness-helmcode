---
description: "The memory package group: durable, user-editable notes that survive across sessions."
kind: "package-group"
---

# memory/ — persistent memory


## Summary

This group holds the persistent memory feature: keyed notes stored as local Markdown under the harness home, exposed to the model as one `memory` tool plus a prompt section that lists what is stored. Storage is deliberately plain — human-readable files a user can edit by hand — and fully local, with no network dependency.

## Table of Contents

- [Packages](#packages)
- [Dev Note](#dev-note)

<a id="packages"></a>
## Packages

| Package | Role |
|---|---|
| [`memory-tool/`](memory-tool/README.md) | The `memory` tool (read, write, delete) and the `tool:memory` prompt section listing stored keys |

<a id="dev-note"></a>
## Dev Note

None.
