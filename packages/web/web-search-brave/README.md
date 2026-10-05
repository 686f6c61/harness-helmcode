---
description: "The Brave Search provider for ctx.web: how deployments mount vendor-native web search with an API key resolved from settings or the launch environment."
kind: "package-reference"
---

# @deepseek-ai/dsh-web-search-brave


## Summary

With `dsh-web-search-brave`, the harness searches the web through the Brave Search API and gets vendor-native results with snippets and publication dates. Choose it when a deployment has a Brave API key and wants Brave ranking. The key resolves per search from the package settings section or the launch environment, so mounting the provider never bakes a secret into configuration. Brave returns no generated answer, so results carry no `content` — only citeable sources. A result with no portable snippet is dropped. The model-facing `web_search` tool lives in `dsh-tool-web`.

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

Load the provider in a composition that already mounts the web service; it registers as the `brave` search provider, and `ctx.web.search()` resolves it when it is the only usable search backend — or pin it with `searchProvider: brave`.

### When to choose it

Choose this provider when the deployment holds a Brave Search subscription and wants Brave's index. Unlike the keyless DuckDuckGo provider, this one is available only while its credential reference resolves, so compositions that must search without any key should mount `dsh-web-search-duckduckgo` instead or as a fallback.

### Minimal configuration

```yaml
- name: '@deepseek-ai/dsh-web'
- name: '@deepseek-ai/dsh-web-search-brave'
```

| Field | Default | Meaning |
|---|---|---|
| `apiKeyEnv` | `BRAVE_API_KEY` | Credential reference the provider resolves per search |
| `count` | `8` | Result count requested from Brave (capped at Brave's own maximum) |
| `country`/`searchLang`/`uiLang` | unset | Brave market and language parameters, forwarded as given |

The settings section is volatile: editing it re-serves the next search without re-registering the provider. The generated [configuration catalog](../../../docs/config-catalog.md) is the exhaustive source for every accepted field and its JSDoc.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

No runtime invariant companion is published: the provider holds no event sequence or mutable relation; every search flows through the ctx.web service it registers into.

The provider sends `GET /res/v1/web/search` with the `X-Subscription-Token` header and an attribution header bumped with the package version. It strips the `<strong>` highlight markers from each `description` to derive the snippet, maps `page_age` to `publishedAt` only when the plan returns it, drops entries without a portable snippet, and omits `content` because Brave returns no generated answer. A thunk supplies the options so one settings-section change serves the next search without re-registering the provider; availability counts the credential resolver, not a probed key value.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Web subsystem](../../../docs/subsystems/web.md) — the exhaustive search request/result vocabulary and error codes.
- [Web package map](../README.md) — the web package family and each role.
- [dsh-web](../web/README.md) — the web service this provider registers into.
- [dsh-web-search-duckduckgo](../web-search-duckduckgo/README.md) — the keyless provider for compositions without any search key.
- [dsh-tool-web](../tool-web/README.md) — the model-facing `web_search` tool that renders this provider's sources.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through `dsh-tool-web`, which retains this provider's count-bounded URLs, titles, stripped snippets, and publication dates or its exact failure text under the consumer's error wrapper.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define when the provider is a poor fit. They are current package constraints.

- **It searches only while a key resolves** — a missing or unauthorized Brave key makes the provider unusable and `ctx.web` falls to other providers or fails; there is no cached-credential grace mode.
- **Result metadata is exactly what Brave returns** — no generated answer, and results without a non-blank snippet are dropped, so fewer sources than requested can return.
- **Brave plan limits apply unchanged** — query volume and monthly quotas are owned by the Brave subscription; the provider maps rejects and rate limits to structured `WebError`s but does not retry or queue.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is working context for maintainers: open questions and undecided directions. It is explicitly non-authoritative — shipped behavior, limits, and rationale live in the sections above.

#### Future: wider Brave control surface

Brave's filters (safesearch, freshness, spellcheck) stay unexposed until the provider-neutral service grows fields for them, so the family adds one coordinated control rather than a vendor-specific argument.

</details>
