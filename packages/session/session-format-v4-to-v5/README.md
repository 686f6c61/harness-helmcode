---
description: "The Session V4 to V5 migration package: header re-stamp and identity event pass over a vocabulary that loses its two DeepSeek-only event roots."
kind: "package-reference"
---

# @deepseek-ai/dsh-session-format-v4-to-v5

## Summary

This package declares the adjacent Session V4→V5 migration. V5 is the V4 vocabulary minus the two DeepSeek-only event roots (`session-log-deepseek/delivery-accepted`, `web/deepseek-search-llm-request`); framing, header fields, and every surviving event shape are unchanged. The migration therefore re-stamps the header and passes events through with identity sequence mapping, and refuses the removed roots rather than dropping them: Helmcode's V4 writers never emitted them, so an occurrence means a foreign lineage that silent removal would launder. No runtime invariant companion is published because this package owns no observable beyond the migration it declares.

## Table of Contents

- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="model-experience"></a>
## Model Experience

Indirectly, through the restore path that composes this edge into the migration chain: sessions written before the advance read as current after it, and nothing this package adds reaches a model request.

#### KV Cache effect

None. Migration runs at restore time on stored bytes; it changes no prompt section, tool schema, or result text.

## Known Limitations and Deferred Work

- **Refusal over laundering** — a V4 artifact carrying the removed roots fails the migration instead of losing them; a lossy "drop and continue" mode is deferred until a real corpus needs it.
- **Child evidence stays on the V3→V4 edge** — `subagent/catalog` events pass through unchanged, so no per-parent child evidence binds to this edge; the `createSessionFormatCatalogWithChildren` helper still owns only the V3→V4 hop.

<a id="dev-note"></a>
### Dev Note

None.
