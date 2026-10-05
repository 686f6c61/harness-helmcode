# harness-helmcode

English | [Español](README.es.md)

Helmcode is the NaN Builders zero-log agent harness: a fork of the DeepSeek Harness with the DeepSeek dependency, telemetry, and account system removed. You bring the model provider — Anthropic, OpenAI, Kimi, Zai/GLM, or any custom gateway speaking the OpenAI or Anthropic protocols — and nothing leaves your machine except the requests you configure yourself.

## Quick start

```sh
npx harness-helmcode web
```

That installs the harness CLI and boots the local Web UI. Open the printed URL, go to **Settings → Models**, and add your provider with its API key. The key is stored locally (`$DSH_HOME/.credentials.yaml`); there is no login, no account, and no telemetry.

## What you get

- Multi-provider models through `llm-pi-ai` — no default provider, no DeepSeek
- Persistent memory, filesystem checkpoints, web search (Exa / Perplexity / Brave), a GitHub connector, and one-click plugin discovery (`dsh plugin search`, `dsh plugin add`)
- Sessions as local event logs; no log of any kind leaves the machine

## Links

- Repository: <https://github.com/686f6c61/harness-helmcode>
- Documentation: <https://nan-harness.686f6c61.dev>
- Contributing: the project looks for contributors and co-authors — see the repository README.
