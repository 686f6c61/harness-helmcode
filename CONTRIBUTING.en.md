# Contributing to Helmcode Harness

English: [CONTRIBUTING.en.md](CONTRIBUTING.en.md) · Español: [CONTRIBUTING.md](CONTRIBUTING.md)

Thanks for your interest in Helmcode Harness! This is the zero-log agent harness built by the [NaN Builders](https://nan.builders/) community: install and use it, and nothing leaves your machine except what you provoke (talking to your LLM provider, web search, or the GitHub API you configure).

**We are looking for co-authors, collaborators, and contributors.** Code, documentation, translations, plugins, or reviews — everything counts, and sustained contributors become co-authors of the project.

## Getting started

You need Node.js (`^22.19.0` or `>=24`) and [pnpm](https://pnpm.io/). Then:

```sh
git clone https://github.com/686f6c61/harness-helmcode.git
cd harness-helmcode
pnpm install
pnpm run build
pnpm dsh web
```

The Web UI starts at `http://127.0.0.1:3080`. First run asks for a provider and key (or use the community `nan-builders` route). The user guide lives at [docs/user/guide/index.md](docs/user/guide/index.md) and development docs at [docs/development.md](docs/development.md).

## What to contribute

- **Bugs and proposals**: open them in [GitHub Discussions](https://github.com/686f6c61/harness-helmcode/discussions) with reproduction steps. Search for a similar one first.
- **Code**: fixes and improvements via pull request (flow below). Hot areas right now: providers (`packages/llm/llm-pi-ai`), the base bundle tools, and the Web/Desktop surfaces.
- **Optimization**: cold start, token usage, memory, tool latency, and bundle size are first-class metrics; a PR that reduces any of them is gold.
- **New plugins and tools**: ship your own plugins (topic [`dsh-plugin`](https://github.com/topics/dsh-plugin)) or propose tools and providers for the base bundle; the Plugin Manager discovers and installs them in one click.
- **Skills**: new embedded skills, improvements to existing ones, and their invocation metadata; skills live in `packages/preset/agent-preset/skills/` and are exposed through the `skill` tool.
- **Documentation and translations**: the documentation is bilingual (Spanish and English, one to one); if you improve one page, take the other along.
- **Reviews**: reviewing pull requests and reproducing bugs is first-class contribution.

## Project rules

- **Zero telemetry, non-negotiable**: no data-egress channels, analytics, or network calls the user did not provoke. This rule outweighs any feature.
- **No secrets in the repo**: no real keys or credentials are ever committed; tests use fake values and credentials travel through the local store or the environment.
- **License**: your contributions are covered by the project's [NaN Community license](LICENSE); inherited DeepSeek Harness code remains MIT upstream.

## Quality and CI

Before opening the pull request, leave green the same checks Actions will demand:

```sh
pnpm exec tsx scripts/ci-simulate.ts --quick   # static gates + workflow lint
pnpm exec vitest run packages/your-package/tests # tests for the area you touched
```

The [`scripts/ci-simulate.ts`](scripts/ci-simulate.ts) simulator runs exactly what GitHub Actions runs; without `--quick` it repeats the full PR pass (static, typecheck, lint, and the whole unit suite). Simulator green = Actions green.

A pull request is expected to bring:

- **Tests** covering the change (the repo enforces coverage; tests live in `tests/` beside the package).
- **Up-to-date documentation**: touching configuration or visible surfaces means the generated catalogs and bilingual pages are updated in the same PR (the doc gates tell you the exact command).
- **One change per PR**, with a title in English or Spanish and a description that explains the why.

## Process

1. Comment on the Discussion or issue that you are taking the topic on (avoids duplicated effort).
2. Fork, create a short branch (`feat/my-thing` or `fix/my-fix`), and open the PR against `main`.
3. The PR CI must be green; a maintainer will review and propose adjustments if needed.
4. Recurring contributors get write access and, over time, co-authorship of the project.

## Pull request structure

Opening the PR auto-loads the [repository template](.github/pull_request_template.md). We fill it like this:

- **Title**: `type(area): summary` — types `feat`, `fix`, `docs`, `refactor`, `test`, `chore` (e.g. `feat(llm-pi-ai): add effort to gemma4`).
- **Motivation**: one line on the problem you solve, with the `Fixes #NN` or `Related #NN` reference to the Discussion/issue.
- **Changes**: high-level changes to commands, configuration, API, protocol, or persistence format; and to user-, model-, or system-observable behavior. If none, `None`.
- **Testing**: one entry per verification method (tests, commands, manual steps), each with reproducible evidence in a collapsible `Proof` block.
- **Final checklist**: tests covering the change, docs and generated catalogs up to date, simulator green, zero telemetry.

### AI-assisted PRs: welcome — from people, not bots

This project is **e/acc**: writing code with agents is part of the craft, and AI-assisted PRs are welcome with no penalty. Tools like **Codex, Claude, Cursor, Copilot, Windsurf, Gemini, Aider, Cline, OpenCode, or Helmcode itself** count as extending your keyboard, not replacing you.

What is **not** accepted are bots: automated, anonymous, or farm accounts mass-firing PRs with no identifiable person behind them to defend the work. Every PR comes from a personal GitHub account, from someone with a name and presence who shows up for the review.

And one clear credit rule: **agents are not contributors**. Claude, Codex, Cursor, or any model never enter the contributors or co-authors list, never sign commits as authors (no AI `Co-authored-by` trailers); credit for the work belongs to the person who directs, verifies, and owns every line. We accelerate with the tool; authorship is human.

Two honest conditions: state in the description which agent or model you used and what you verified yourself on top, and accept that a human reviews every line before merge. The bar is identical for everyone — green tests, up-to-date docs, and the telemetry rules — whether the code comes from a human keyboard or a well-directed agent.

## Community

- [GitHub Discussions](https://github.com/686f6c61/harness-helmcode/discussions) for questions, proposals, and plugins.
- [Helmcode Discord](https://discord.gg/4MrtZUhpxg) for day-to-day chat.
- Security: read [SAFETY.md](SAFETY.md) and report vulnerabilities privately first.
