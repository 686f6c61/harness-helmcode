# Helmcode Harness

English (this document) | **[Español](README.md)**

![Desktop CI](https://github.com/686f6c61/harness-helmcode/actions/workflows/desktop-packages.yml/badge.svg)
![License](https://img.shields.io/badge/license-NaN%20Community-blue.svg)
![npm harness-helmcode](https://img.shields.io/npm/v/harness-helmcode)

**Helmcode Harness** is an open source, zero-log agent harness created by [686f6c61](https://github.com/686f6c61) and maintained by the [NaN Builders](https://nan.builders/) community.

It began as a **fork of the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)** by DeepSeek AI, whose code was published under the MIT license: that credit and license are respected here, and on top of that base the project was rebuilt under one non-negotiable rule, **zero telemetry**. We removed the proprietary adapters, the account system, analytics, and every data egress channel, and verified it line by line: nothing leaves your machine except requests you trigger, meaning talking to the LLM provider you choose, searching the web when you ask, or calling the GitHub API you configure.

Everything else is yours: pick provider and key on first run, or use the `nan-builders` route served by the NaN servers. You can connect **Claude (Anthropic), OpenAI, Bedrock (AWS), Azure, Kimi/Moonshot, GLM (Zai), Google Gemini/Vertex, Mistral, OpenRouter, Groq, Cloudflare, and GitHub Copilot**, or any custom gateway speaking OpenAI or Anthropic (the full catalog provider list is in the [providers guide](docs/user/guide/providers.md)). Memory keeps your context across sessions, checkpoints make every agent change reversible, and plugins install in one click.

It is built on an **everything-is-a-plugin** architecture powered by [Cordis](https://github.com/cordiverse/cordis), whose paradigm is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

- Documentation: [nan-harness.686f6c61.dev](https://nan-harness.686f6c61.dev)
- Source: [github.com/686f6c61/harness-helmcode](https://github.com/686f6c61/harness-helmcode)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

> **We are looking for co-authors, collaborators, and contributors.** Code, documentation, translations, plugins, or reviews: if you want to push an open source harness forward, there is room. Sustained contributors become project co-authors.

## What we removed from DeepSeek (zero telemetry)

The fork fully removes the DeepSeek dependency and every channel that sent data off the machine:

- **Adapters and account**: `llm-deepseek`, `llm-deepseek-api-key`, `llm-deepseek-account`, `deepseek-account`, `deepseek-account-platform` (browser login, balances, bonuses), and `deepseek-llm-api-extensions`.
- **Telemetry**: OTel exporters (`session-telemetry-otel`, `host-product-telemetry-otel`), product analytics (`client-product-analytics`), and the legacy `telemetryDisabledEnv` field.
- **Log uploads**: `session-log-deepseek` (the `dsh_session_log` suffix) and `plugin-package-inventory-deepseek` (`dsh_plugin_packages`).
- **DeepSeek server-side search** (`web-search-deepseek`) and its settings card.
- **Account and log UI surfaces**: `ui-settings-account`, `ui-settings-session-log`, sign-in welcome flows, bonus notices, and the anonymous user identifier.
- **Vendor defaults**: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, and platform login routes.

## What we added

- **Multi-provider models with no default provider**: pick your route (Anthropic, OpenAI, Kimi/Moonshot, Zai/GLM, or any custom gateway) via `llm-pi-ai` (`openai-completions`, `openai-responses`, `anthropic-messages`). The composition's default route is served by **the NaN servers** (`nan-builders`).
- **First-run keyless web search**: keyless DuckDuckGo provider in the base bundle; **Brave** as an opt-in upgrade with its own settings card.
- **Persistent cross-session memory** (the `memory` tool + prompt section) and **filesystem checkpoints** to undo changes (the `checkpoint` tool).
- **GitHub connector**: search and read issues and pull requests, with opt-in commenting.
- **One-click plugin discovery and install**: `dsh plugin search` / `dsh plugin add` and the Plugin Manager discovery panel.
- **Web, Desktop (macOS/Windows), SDK, and ACP surfaces** over one composition, bilingual documentation (English and Spanish), and CI packaging for both platforms.

## Personalization

- **Your provider, your key, your route**: nothing is pre-bound to a vendor; you pick the provider on first run and change it whenever.
- **Cross-session memory**: the `memory` tool stores decisions, style, and project context, and the system prompt lists them automatically next session.
- **Per-plugin and per-row settings** in the Plugin Manager, agent presets, and an editable model catalog (context window, effort, modalities).

## Zero telemetry: what leaves and what never does

There are no switches to turn off: the channels were **removed from the code**, not disabled. The only traffic leaving the machine is what you explicitly trigger:

| Leaves only when you ask | Never leaves |
|---|---|
| Requests to the LLM provider you chose | Sessions and their history |
| Web searches the agent runs on your order | Memory and checkpoints |
| GitHub API calls you configure | Credentials (local vault) |
| | Telemetry: no channel exists |

## Built around the NaN user flow

- **Default `nan-builders` route**, served by the NaN servers: community inference with zero extra setup.
- **First run in one command** (`npx harness-helmcode web`) and instant, keyless search.
- **Memory and checkpoints avoid repeated work**: context persists across sessions and every agent change is reversible.
- **One-click plugins**: discover, install, and enable without leaving the Plugin Manager.

## Run

### From npm

Install Node.js, then run:

```sh
npx harness-helmcode web
```

It starts the Web UI at `http://127.0.0.1:3080` and opens it in your browser (`--no-open` skips that). Full guide: [Web UI](docs/user/guide/index.md).

### From source

```sh
git clone https://github.com/686f6c61/harness-helmcode.git
cd harness-helmcode
pnpm install
pnpm run build
pnpm dsh web
```

### Desktop

`pnpm --filter @deepseek-ai/dsh-desktop run package:mac:arm64:dir` (macOS) and `package:win:x64:unsigned` (Windows, requires a Windows host) produce the packages; the **Desktop packages** workflow builds both on push.

## Community and support

- Feedback and bugs: [GitHub Discussions](https://github.com/686f6c61/harness-helmcode/discussions).
- Plugins: add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your repository.
- Community: [Helmcode Discord](https://discord.gg/4MrtZUhpxg).
- Public changelog: [CHANGELOG.md](CHANGELOG.md).

## Contributing

**We are looking for co-authors, collaborators, and contributors** — code, docs, translations, plugins, or reviews; sustained contributors become co-authors. Start with [CONTRIBUTING.en.md](CONTRIBUTING.en.md) (also available [in Spanish](CONTRIBUTING.md)). Agents should read [AGENTS.md](AGENTS.md); development lives in [docs/development.md](docs/development.md) and [docs/architecture.md](docs/architecture.md), and `make help` lists the commands.

## Security

Read the [safety notice](SAFETY.md) before running the project; it is in _developer preview_ and there will be compatibility-breaking changes.

## License

**NaN Community License**: free for individuals, personal, educational, research, and NaN community use. **Enterprise or commercial use by organizations requires a commercial license** from the maintainer ([contact](https://github.com/686f6c61/harness-helmcode/discussions)).

The code inherited from the original DeepSeek Harness remains MIT by its authors and is available upstream; full texts are in [LICENSE](LICENSE). Third-party dependencies are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Project citation:

```bibtex
@misc{helmcode2026,
  title={Helmcode Harness: Everything is a Plugin},
  author={NaN Builders},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/686f6c61/harness-helmcode}},
}
```
