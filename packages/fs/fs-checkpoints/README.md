---
description: "Filesystem checkpoints: shadow capture on fs write and edit waterfalls, a content-addressed store, and one-step restore or discard per checkpoint."
kind: "package-reference"
---

# @deepseek-ai/dsh-fs-checkpoints


## Summary

`dsh-fs-checkpoints` makes every agent file mutation reversible. It listens on the `fs/write-intent` and `fs/edit-intent` waterfalls and shadow-captures the previous content of each file a tool is about to create, write, or edit, into a content-addressed store under the harness home. Every captured change becomes a checkpoint the UI can list, restore, or discard; the filesystem tools keep their exact model-facing behavior because the capture rides the existing waterfall, not the tools. Restore writes the captured bytes back and records the reversal as its own checkpoint.

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

Load the package in any composition that mounts the filesystem provider and the model-facing file tools; it starts capturing immediately, with no per-tool registration and no configuration required.

### When to choose it

Choose it whenever users should be able to undo agent edits: the base composition mounts it for exactly that reason. A headless deployment that keeps its own version control outside the harness can omit the package; the tools then mutate files directly with no capture step.

### Minimal configuration

```yaml
- name: '@deepseek-ai/dsh-fs'
- name: '@deepseek-ai/dsh-fs-local'
- name: '@deepseek-ai/dsh-fs-checkpoints'
- name: '@deepseek-ai/dsh-tool-fs'
```

The store root defaults to a `checkpoints/` directory inside the harness home. The generated [configuration catalog](../../../docs/config-catalog.md) is the exhaustive source for every accepted field.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

No runtime invariant companion is published: the only mutable relation is the checkpoint directory under the harness home, owned and read by this package itself.

`CheckpointStore` is content-addressed: capture hashes the previous bytes, stores them once, and records a metadata entry naming the absolute path, the capturing tool, and the captured generation. Capture runs inside the `fs/write-intent` and `fs/edit-intent` waterfalls, so every mutation path that honors the waterfalls — the shipped tools, and any third-party tool that follows the contract — is covered without touching the tools themselves. Paths inside the store are guarded: a capture whose target resolves inside the checkpoint root is refused, and the store root is canonicalized with `realpath` at creation so macOS `/private/var` symlink aliases compare like-for-like. `restore` writes the captured bytes back and records the reversal as a new checkpoint, so undo is itself undoable; `discard` removes one metadata entry and drops its bytes when the last reference goes.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Filesystem package map](../README.md) — the fs package family and each role.
- [dsh-fs](../fs/README.md) — the `ctx.fs` contract whose mutation waterfalls this package observes.
- [dsh-tool-fs](../tool-fs/README.md) — the model-facing write and edit tools whose changes become checkpoints.
- [Generated configuration catalog](../../../docs/config-catalog.md) — every accepted config field and its source declaration.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the filesystem tools, which own every model-visible rendering of the mutations this package captures; the checkpoint store itself adds no prompt section, schema, or result text.

#### KV Cache effect

None. Capture, restore, and discard touch files and UI state only; no prompt section, tool schema, or result text is added or invalidated.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define when the package is a poor fit. They are current package constraints.

- **Only waterfall-respecting mutations are captured** — a tool that writes files through its own process instead of the `fs/write-intent` / `fs/edit-intent` waterfalls bypasses capture entirely; shell commands that redirect into files are the common case.
- **Capture is whole-file, not delta** — every guarded mutation stores the full previous bytes, so repeated large-file edits pay repeated large copies; deduplication only helps when consecutive contents repeat.
- **No retention policy yet** — checkpoints accumulate under the store root until discarded or removed by hand; an age- or count-based pruning rule is deferred until the UI grows the surface to expose it.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is working context for maintainers: open questions and undecided directions. It is explicitly non-authoritative — shipped behavior, limits, and rationale live in the sections above.

#### Future: shell-write capture

Capturing shell redirections would need a post-hoc diff seam on the shell executor rather than the intent waterfalls; it is deferred because post-hoc capture cannot know the previous bytes and would have to stage copies before execution, which changes shell latency for every command.

</details>
