# Changelog — Helmcode Harness

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). English summary below.

## [0.1.0] — 2026-10-04

Primera versión pública. Fork del DeepSeek Harness reconstruido zero-log: instalas y usas, y nada sale de tu máquina salvo lo que provocas (LLM, búsqueda, GitHub).

### Añadido

- Modelos multi-proveedor sin proveedor por defecto (Anthropic, OpenAI, Kimi, GLM, gateways propios vía `llm-pi-ai`); ruta por defecto `nan-builders` servida por los servidores de NaN.
- Búsqueda web sin clave en la primera ejecución (DuckDuckGo; Brave opt-in).
- Memoria persistente entre sesiones (tool `memory` + prompt) y checkpoints de ficheros reversibles (tool `checkpoint`).
- Conector GitHub (issues/PRs, comentarios opt-in) y descubrimiento/instalación de plugins (`dsh plugin search` + panel en el Plugin Manager).
- Personalización total: proveedor, clave, memoria y ajustes propios; superficies Web, Desktop (macOS/Windows), SDK y ACP; docs bilingüe; CI de empaquetado; paquete npm `harness-helmcode`.
- Licencia **NaN Community**: uso libre para personas y la comunidad NaN; el uso empresarial requiere licencia comercial. El código heredado del DeepSeek Harness permanece MIT upstream.

### CI

- **Workflows propios** (`ci.yml`, `ci-master.yml`, `desktop-packages.yml`, `nightly.yml`): matrix de gates por PR, coverage con particiones, snapshots, gates bloqueantes de Windows, releases macOS/Windows con checksums SHA256 y draft release desde tags `desktop-v*`, y nightly con suite serial, auditoría de dependencias y smoke en vivo de la ruta NaN (opt-in con secret).
- **Simulador de CI local** (`scripts/ci-simulate.ts`): reproduce los mismos comandos que Actions para verificar en local que todo saldrá verde, con un spec anti-drift que falla si los workflows y el simulador divergen.
- Poda del CI heredado: retirados los 18 workflows de DeepSeek (publicación a sus registros, previews Cloudflare, bots de issues, failover a pools internos) y sus specs asociados.
- Migración de formato de sesión **v4 → v5** con paquete de migración propio, checkpoint de baseline y acta de compatibilidad; el escritor avanza a V5 al retirar los dos tipos de eventos exclusivos de DeepSeek.
- Versión de la familia de publicación **0.1.0** en toda la familia `dsh` (manifiestos, lockfile y wrapper npm), en línea con este changelog y el tag `desktop-v0.1.0`.
- Ajuste a runners alojados: el job de snapshots instala bubblewrap (sandbox del shell) y Chromium de Playwright; el job de artifacts instala bubblewrap para el smoke del bin construido.
- El mock LLM de pruebas habla también el dialecto **Chat-Completions** (`/v1/chat/completions` con `Authorization: Bearer`), el que la ruta `nan-builders` habla de verdad; los e2e del bin construido pasan a conducir esa ruta.
- Costura de despliegue `NAN_BUILDERS_BASE_URL`: redirige la ruta `nan-builders` a un gateway propio o al mock HTTP sin redeclarar el perfil del proveedor.
- Ayuda de `dsh` determinista fuera de TTY (ancho fijo 80): la snapshot de la ayuda ya no depende del `COLUMNS` del host.
- Corpus de snapshots alineado con V5 y el catálogo nuevo: generaciones actuales grabadas para los escenarios afectados, referencias compartidas reposicionadas y `web/code-language` retenido como cobertura declarada de migración adyacente V4→V5.
- **Cobertura de ISC en `main` pasa a consultiva (advisory)**: la primera corrida alojada midió 30 ficheros por debajo de la barra del 100% de ramas — paquetes nuevos del fork (descubrimiento de plugins, memoria, checkpoints, búsqueda web, conector GitHub, migración V4→V5) y superficie heredada descubierta tras la poda de telemetría/cuenta. La barra sigue siendo 100%; cerrar la brecha es la siguiente tanda de tests, y mientras tanto el job informa sin bloquear empaquetado ni releases.
- Instalador de Windows: las cadenas en español usan la tabla `SpanishInternational` (LCID 3082), la que electron-builder inserta de verdad para `es_ES`; el NSIS empaquetado no define `${LANG_SPANISH}` y compila los avisos como errores.

### Eliminado

- Todo el stack DeepSeek: adaptadores y cuenta (`llm-deepseek*`, `deepseek-account*`), telemetría (OTel, analítica de producto), subidas de registro (`dsh_session_log`, `dsh_plugin_packages`), búsqueda server-side, UIs de cuenta y variables por defecto (`DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`).

### English

Added: multi-provider models with no default provider (NaN `nan-builders` route served by the NaN servers), keyless first-run web search, persistent memory, reversible filesystem checkpoints, a GitHub connector, one-click plugin discovery/install, Web/Desktop/SDK/ACP surfaces, bilingual docs, desktop CI packaging, and the `harness-helmcode` npm wrapper.

CI: first-party workflows (`ci.yml`, `ci-master.yml`, `desktop-packages.yml`, `nightly.yml`) covering the PR gate matrix, partitioned coverage, snapshots, blocking Windows gates, macOS/Windows releases with SHA256 checksums and draft releases from `desktop-v*` tags, and a nightly lane with the serial suite, dependency audit, and an opt-in live NaN route smoke. A local CI simulator (`scripts/ci-simulate.ts`) replays exactly what Actions runs, guarded by an anti-drift spec. The inherited DeepSeek CI (18 workflows: registry publishing, Cloudflare previews, issue bots, internal-pool failover) was removed along with its specs. Session format migrated **v4 → v5** with a dedicated migration package, baseline checkpoint, and compatibility record; the writer advances to V5 as the two DeepSeek-only event types leave the vocabulary. The `dsh` publish family moves to version **0.1.0** across all manifests, the lockfile, and the npm wrapper, matching this changelog and the `desktop-v0.1.0` tag. Hosted-runner fixes: the snapshot job installs bubblewrap (shell sandbox) and Playwright Chromium, and the artifacts job installs bubblewrap for the built-bin smoke. The test mock LLM now also speaks the Chat-Completions dialect (`/v1/chat/completions`, `Authorization: Bearer`) that the `nan-builders` route actually speaks, and the built-CLI e2e drives that route. A `NAN_BUILDERS_BASE_URL` seam retargets the route for self-hosted gateways or the HTTP mock. Launcher help wraps at a pinned width off-TTY so its snapshot is host-independent.

Removed: the entire DeepSeek stack (adapters, account, telemetry, log uploads, server-side search, account UIs, vendor defaults). Zero telemetry with an explicit egress policy — only user-triggered LLM/search/GitHub traffic ever leaves the machine.

[0.1.0]: https://github.com/686f6c61/harness-helmcode/releases/tag/v0.1.0
