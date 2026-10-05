# harness-helmcode

[English](README.md) | Español

Helmcode es el harness de agentes zero-log de NaN Builders: un fork del DeepSeek Harness sin la dependencia de DeepSeek, sin telemetría y sin sistema de cuentas. Tú eliges el proveedor de modelos — Anthropic, OpenAI, Kimi, Zai/GLM o cualquier gateway propio que hable los protocolos de OpenAI o Anthropic — y nada sale de tu máquina salvo las peticiones que tú configuras.

## Inicio rápido

```sh
npx harness-helmcode web
```

Instala el CLI del harness y arranca la Web UI local. Abre la URL impresa, entra en **Configuración → Modelos** y añade tu proveedor con su clave de API. La clave se guarda en local (`$DSH_HOME/.credentials.yaml`); no hay login, ni cuenta, ni telemetría.

## Qué incluye

- Modelos multiproveedor vía `llm-pi-ai` — sin proveedor por defecto, sin DeepSeek
- Memoria persistente, checkpoints de ficheros, búsqueda web (Exa / Perplexity / Brave), conector GitHub y descubrimiento de plugins en un clic (`dsh plugin search`, `dsh plugin add`)
- Sesiones como registros locales de eventos; ningún log sale de la máquina

## Enlaces

- Repositorio: <https://github.com/686f6c61/harness-helmcode>
- Documentación: <https://nan-harness.686f6c61.dev>
- Contribuir: el proyecto busca contributors y coautores — mira el README del repositorio.
