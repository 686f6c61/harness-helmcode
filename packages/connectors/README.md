---
description: "The connectors package group: outbound API connectors that expose external services to the model as tools."
kind: "package-group"
---

# connectors/ — outbound service connectors


## Summary

This group holds outbound connectors: packages that turn an external service's API into model-facing tools with credentials resolved from the credential store. Each connector owns its provider contract — actions, schemas, error rendering — and stays narrow on purpose: triage and read-heavy flows first, writes only behind explicit configuration.

## Table of Contents

- [Packages](#packages)
- [Dev Note](#dev-note)

<a id="packages"></a>
## Packages

| Package | Role |
|---|---|
| [`github/`](github/README.md) | One `github` tool over the REST API: search and read issues and PRs, comment with write access |

<a id="dev-note"></a>
## Dev Note

None.
