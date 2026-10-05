---
description: "The GitHub connector: one model-facing `github` tool over the REST API for searching, reading, and (with write access) commenting on issues and pull requests, with the token resolved from the credential store."
kind: "package-reference"
---

# @deepseek-ai/dsh-github-connector


## Summary

`dsh-github-connector` lets the model work GitHub issues and pull requests through one `github` tool: search issues and PRs, read one by `owner/repo/number`, list a repository's PRs, and — when the deployment enables writes — comment. Requests go to the GitHub REST API with a token resolved per call from the credential store under a configurable reference (default `GITHUB_TOKEN`), so the token never sits in config or prompts. Without write access the comment action reports denial instead of failing mid-call. The package is intentionally narrow: read-heavy triage, not repository administration.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Load the package in a composition that mounts the tools and credentials services, and store a GitHub token in the credential store under the configured reference.

### When to choose it

Choose it for issue triage and PR review flows: the model can find the relevant issue, read its thread, and draft or post a comment. A deployment that only reads public repositories can point `apiBaseUrl` at a mirror and still needs a token for meaningful rate limits.

### Minimal configuration

```yaml
- name: '@deepseek-ai/dsh-github-connector'
```

| Field | Default | Meaning |
|---|---|---|
| `tokenRef` | `GITHUB_TOKEN` | Credential store reference resolved per request |
| `apiBaseUrl` | `https://api.github.com` | REST root; point at a mirror to relocate |
| `allowWrites` | `false` | Enables the `issue-comment` action |

The generated [configuration catalog](../../../docs/config-catalog.md) is the exhaustive source for every accepted field.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

No runtime invariant companion is published: the connector registers one schema-fixed tool and keeps no event sequence or mutable data relation of its own.

One `githubRequest` helper owns method, path, JSON body, and token header, so every action shares authentication and error mapping; responses are narrowed to plain data (`isPullRequest` separates PRs from issues in search results) and formatted into stable text (`formatIssue`, `formatIssueList`) before returning. The tool's output schema is a single `message` string with a text render, which keeps replay and UI presentation trivial. Search actions map the query straight to GitHub's search API; get actions validate `owner/repo/number` before any request is made; `issue-comment` requires `allowWrites` and returns a denial result otherwise.

</details>

-----

<a id="model-experience"></a>
## Model Experience

### Tool schemas

#### What the model sees

The model sees the generated [`github` schema](../../../docs/tool-catalog.md#deepseek-aidsh-github-connector): one tool whose `action` enum names the six operations and whose schema documents which arguments each action requires (query for searches, `owner/repo/number` for reads and comments, `body` for comments, `state` for `pr-list`).

#### Token effect

Fixed schema cost per request while the tool is registered.

#### KV Cache effect

Prefix-stable while the tool stays registered; unloading the package removes the schema.

### Tool result

#### What the model sees

Results are plain text: formatted issue or PR listings (title, number, state, author), a formatted single-issue view with body, or a confirmation line for a posted comment. Denials (`issue-comment` without write access), missing tokens, and GitHub API errors return as error result text the model can read and report.

#### Token effect

Listing results are data-dependent and resent until compaction; `formatIssueList` bounds each entry to one line and the list to one page of GitHub results.

#### KV Cache effect

Append-only; newly visible results follow the reusable request prefix and do not invalidate existing entries.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define when the package is a poor fit. They are current package constraints.

- **Six actions, not a GitHub client** — no repository creation, label editing, review submission, or reaction surface; new operations are added per concrete need, each as a new `action` value.
- **Pagination is one page deep** — search and list actions return GitHub's first page; a `page` argument is deferred until a real triage flow outgrows it.
- **One token, one scope** — every call uses the same credential reference; per-repository token separation is deferred and would need a credential-selection story first.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is working context for maintainers: open questions and undecided directions. It is explicitly non-authoritative — shipped behavior, limits, and rationale live in the sections above.

#### Future: PR review actions

Review submission (approve/request-changes) is the most requested write; it is deferred behind `allowWrites` maturation because a wrong review is user-visible in ways a comment is not.

</details>
