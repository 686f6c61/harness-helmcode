---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-04-deepseek-legacy-event-removal

English | [Español](2026-10-04-deepseek-legacy-event-removal.es.md)

## Summary

Helmcode removes the two DeepSeek-only session-log event roots: `event:session-log-deepseek/delivery-accepted` and `event:web/deepseek-search-llm-request`. They recorded upstream DeepSeek delivery and search telemetry that the Helmcode zero-log composition never emits, so their writers were deleted with the rest of the DeepSeek stack.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-10-04-deepseek-legacy-event-removal
baseline: false
changes:
  - root: "SessionHeader"
    previous: "2026-09-16-session-format-v4"
    after: "22c6899a78214dd841c266348ae997027ef391174ddb21127f1b71dc1b362824"
    decision: version-bump
  - root: "event:session-log-deepseek/delivery-accepted"
    previous: "2026-09-11-initial"
    after: null
    decision: version-bump
  - root: "event:web/deepseek-search-llm-request"
    previous: "2026-09-11-initial"
    after: null
    decision: version-bump
```

<a id="compatibility"></a>
## Compatibility

The removal changes which event roots a v4 writer could produce, so the Session writer advances from format 4 to format 5. Reading is unaffected: sessions written by format 4 runtimes never contain these roots under Helmcode, and the historical format references remain readable through the existing per-version readers. No surviving root changes shape in a breaking way — every other transition in this record is an additive attribution kind, an optional property, or a payload version.

<a id="verification"></a>
## Verification

`pnpm run verify-persistence-changes` passes with the format 5 writer, the refreshed `docs/persistence-schema.json`, and this acknowledgement; `pnpm run verify-persistence-releases` and `verify-persistence-formats` pass after their --write refresh; the session persistence suites (generation, lease, migration, native-source admission) pass against the bumped SESSION_FORMAT_VERSION.

<a id="dev-note"></a>
## Dev Note

None.
