## Motivation

<!-- One line on the problem being solved. Reference the Discussion/Issue with Fixes #NN or Related #NN. -->

## Changes

<!-- High-level changes to commands, configuration, API, protocol, or persistence format; write None if none. -->
<!-- High-level changes to user-, model-, or system-observable behavior; write None if none. -->

## Testing

<!-- One entry per verification method. Keep the method visible and put reproducible evidence in its Proof block. -->

- <!-- Command or steps, and the behavior they cover. -->

  <details>
  <summary>Proof</summary>

  <!-- Test output, screenshots, screen recordings, logs, or other reproducible evidence. -->

  </details>

## Checklist

- [ ] Tests cover the change (or the description explains why none are needed).
- [ ] Docs and generated catalogs are updated (`pnpm run gen-*` as the doc gates indicate).
- [ ] `pnpm exec tsx scripts/ci-simulate.ts --quick` is green locally.
- [ ] Zero telemetry preserved: no new network egress, secrets, or DeepSeek-era channels.
- [ ] If this PR was generated with AI assistance, say so (agent/model) — AI PRs are welcome; a human owns every merged line.
