---
description: "The keyless DuckDuckGo search provider for ctx.web: web search that works on first run with no API key, by rendering the lite HTML endpoint."
kind: "package-reference"
---

# @deepseek-ai/dsh-web-search-duckduckgo


## Summary

With `dsh-web-search-duckduckgo`, the harness searches the web with no API key at all: the provider queries DuckDuckGo's lite HTML endpoint and parses the result list, so `web_search` works on the very first run of an install-and-use deployment. It registers as always available, which makes it the natural default or last-fallback search backend. Results carry titles, URLs, and portable snippets; DuckDuckGo returns no generated answer, so results carry no `content`. The model-facing `web_search` tool lives in `dsh-tool-web`.

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

Load the provider in a composition that already mounts the web service; it registers as the `duckduckgo` search provider and, being keyless, is usable immediately — when it is the only search backend, `ctx.web.search()` resolves it automatically.

### When to choose it

Choose this provider when search must work out of the box: no credential store entry, no environment variable, no subscription. Compositions that also mount a keyed provider (for example `dsh-web-search-brave`) can pin that one with `searchProvider` and keep this package as the keyless default.

### Minimal configuration

```yaml
- name: '@deepseek-ai/dsh-web'
- name: '@deepseek-ai/dsh-web-search-duckduckgo'
```

The package takes no credential fields. Timeout and result-size budgets are owned by the web service and the `web_search` tool, not by this provider.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

No runtime invariant companion is published: the provider holds no event sequence or mutable relation; every search flows through the ctx.web service it registers into.

The provider renders `https://lite.duckduckgo.com/lite/` with the query and parses the HTML result table with a deliberately regex-free parser: string splitting and `indexOf` scanning locate result rows, `stripMarkup` removes inline tags from titles and snippets, and `unwrapResultUrl` decodes DuckDuckGo's `uddg` redirect parameter into the real target URL. A no-results marker page is detected before parsing so an empty result set returns cleanly instead of an error. Because the endpoint always accepts anonymous requests, the provider's `available()` is constant.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Web subsystem](../../../docs/subsystems/web.md) — the exhaustive search request/result vocabulary and error codes.
- [Web package map](../README.md) — the web package family and each role.
- [dsh-web](../web/README.md) — the web service this provider registers into.
- [dsh-tool-web](../tool-web/README.md) — the model-facing `web_search` tool that renders this provider's sources.
- [dsh-web-search-brave](../web-search-brave/README.md) — the keyed provider for deployments that hold a search subscription.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through `dsh-tool-web`, which retains this provider's count-bounded URLs, titles, and stripped snippets or its exact failure text under the consumer's error wrapper.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define when the provider is a poor fit. They are current package constraints.

- **The parser tracks an HTML page, not a contract** — DuckDuckGo can change the lite endpoint's markup without notice; a shape change surfaces as empty or degraded results until the parser is updated, and there is no schema to validate against.
- **Anonymous search is rate-limited by the endpoint** — heavy automated use can be throttled or challenged; the provider maps failures to structured `WebError`s but does not retry, rotate identities, or queue.
- **No answer field and no localization controls** — results carry no generated answer, and region or language parameters stay unexposed until the provider-neutral service grows fields for them.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is working context for maintainers: open questions and undecided directions. It is explicitly non-authoritative — shipped behavior, limits, and rationale live in the sections above.

#### Future: parser drift alarm

A canary spec asserting marker strings from the live endpoint could catch markup drift before users do; it is deferred until the project decides how directly community CI may depend on an outside endpoint.

</details>
