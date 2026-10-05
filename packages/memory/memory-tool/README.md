---
description: "The persistent memory tool: keyed notes stored as local Markdown that survive across sessions, surfaced to the model with a prompt section that lists what is stored."
kind: "package-reference"
---

# @deepseek-ai/dsh-memory-tool


## Summary

`dsh-memory-tool` gives the model a `memory` tool for durable notes: read, write, and delete named entries stored as local Markdown files under the harness home, so facts the user states once — preferences, project names, standing decisions — survive into later sessions. The tool is intentionally tiny: entries are keyed, human-readable files a user can edit by hand, not a database. A system-prompt section lists the currently stored keys so the model knows what it remembers without reading every note, and contributes nothing while nothing is stored.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Load the package in any composition that mounts the tools service; it registers the `memory` tool and the memory prompt section. The base composition mounts it so memory works out of the box.

### When to choose it

Choose it when the user's context should outlive sessions: name and role notes, project vocabularies, standing preferences. A deployment that treats every session as stateless can omit the package; nothing else depends on it.

### Minimal configuration

```yaml
- name: '@deepseek-ai/dsh-memory-tool'
```

Notes live under a `memory/` directory inside the harness home, one Markdown file per key. The generated [configuration catalog](../../../docs/config-catalog.md) is the exhaustive source for every accepted field.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

No runtime invariant companion is published: the only mutable relation is the memory note directory under the harness home, owned and read by this package itself.

The tool injects `tools` and `systemPrompt`. Writes are keyed and atomic: each entry becomes one Markdown file whose name derives from the key, so a user editing notes by hand sees exactly what the model wrote. Keys are validated before use, reads return the note text verbatim, and deletes remove the file. The prompt section (`tool:memory`) renders the sorted list of stored keys with a standing instruction to check memory before asking the user for facts it may already have; it renders nothing when the store is empty, so a fresh install carries no memory overhead at all.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Memory package map](../README.md) — the package family and each role.
- [Generated configuration catalog](../../../docs/config-catalog.md) — every accepted config field and its source declaration.
- `dsh-tools` — the tool contract (`defineTool`) this package registers through.

-----

<a id="model-experience"></a>
## Model Experience

### System prompt

#### What the model sees

While at least one note is stored, a `tool:memory` section lists the stored keys (never their contents); with an empty store the section contributes nothing.

##### Memory section (verbatim template)

```markdown
Persistent memory notes are stored on this machine and survive across sessions. The notes currently recorded (read one with the memory tool before relying on it):
- <stored key>
- <stored key>
```

#### Token effect

One short section, growing only with the number of stored keys — never with the notes' contents, which enter context only when the model reads a note.

#### KV Cache effect

Prefix-stable while the key set is unchanged; writing or deleting a note invalidates reuse from the section onward.

### Tool schemas

#### What the model sees

The model sees the generated [`memory` schema](../../../docs/tool-catalog.md#deepseek-aidsh-memory-tool): `read`, `write`, and `delete` actions over string keys; note text is a write-only argument the model supplies, never a schema default.

#### Token effect

Fixed schema cost per request while the tool is registered.

#### KV Cache effect

Prefix-stable while the tool stays registered; unloading the package removes the schema and the prompt section together.

### Tool result

#### What the model sees

Results are short confirmations or the verbatim note text for a read. Errors — unknown key, invalid key, failed filesystem write — return as plain error result text the model can read and react to.

#### Token effect

Note text is resent in history until compaction, bounded by the note sizes themselves.

#### KV Cache effect

Append-only; newly visible results follow the reusable request prefix and do not invalidate existing entries.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define when the package is a poor fit. They are current package constraints.

- **Retrieval is by key, not by meaning** — the model must already know (from the key list or conversation) which note to read; semantic search over note contents is deferred and would need an embedding backend, which the zero-setup default deliberately avoids.
- **Notes are plain text, unencrypted** — memory files live in the user's harness home like any other local file; secrets do not belong in notes.
- **No namespacing or per-project scoping yet** — all notes share one store; project separation is deferred until a deployment case demands it.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is working context for maintainers: open questions and undecided directions. It is explicitly non-authoritative — shipped behavior, limits, and rationale live in the sections above.

#### Future: semantic retrieval

Keying by meaning (embeddings over note contents, likely served by the NaN cluster's embedding endpoint) stays deferred: it would add a network dependency and a cost surface to what is currently a fully local, zero-setup package.

</details>
