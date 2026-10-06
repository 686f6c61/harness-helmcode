# Changelog — Helmcode Harness

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). English summary below.

## [0.1.3] — 2026-10-06

Segunda versión pública, y la primera con toda la casa en orden: CI completamente en verde con la cobertura de calidad como barrera bloqueante, el lane de tests de la web a cero fallos, y las apps de escritorio construidas desde exactamente este estado. Nada sale de tu máquina salvo lo que provocas (LLM, búsqueda, GitHub) — igual que en 0.1.0.

### Descargas

- **macOS (Apple Silicon)**: `Helmcode-desktop-v0.1.3-mac-arm64.zip` — descomprime y arrastra `Helmcode.app` a Aplicaciones. El bundle va sin firmar: en la primera apertura, clic derecho → «Abrir» (o `xattr -dr com.apple.quarantine Helmcode.app`).
- **Windows (x64)**: `Helmcode-desktop-v0.1.3-win-x64-setup.exe` — instalador NSIS sin firmar; SmartScreen avisará por no llevar firma de editor.
- **SHA256SUMS.txt**: checksums SHA-256 de ambos ficheros. Verifica tu descarga antes de ejecutarla (`sha256sum -c SHA256SUMS.txt` o `shasum -a 256 -c SHA256SUMS.txt`).

### Qué hay en este código

- **La app completa**: escritorio macOS/Windows sobre el runtime del harness (agent loop, herramientas, plugins, memoria persistente, checkpoints reversibles, búsqueda web, conector GitHub), superficie web embebida, SDK y ACP. Ruta de modelos `nan-builders` (OpenAI-completions contra `api.nan.builders`), configurable desde la página Modelos con cualquier proveedor del catálogo.
- **Zero-log verificado**: sin telemetría, sin subidas de registro de sesión, sin cuenta. El triage formal del escaneo de seguridad Mimosa (738 hallazgos estáticos) queda documentado como nota de proceso: heurísticas de taint sobre funciones declaradas del harness, duplicados en bundles y falsos positivos de credenciales i18n; ningún hallazgo corresponde a código introducido por el fork.

### CI

- **Cobertura de calidad bloqueante**: el job particionado de cobertura pasa de consultivo a bloqueante con la brecha cerrada (30 ficheros por debajo de la barra → 0). Última corrida: las 6 tareas en verde.
- **Lane de consumers de la web a cero fallos**: de ~131 pruebas rotas (superficies que el fork rediseñó o retiró) a 156 ficheros / 568 tests en verde, reescritura escenario a escenario contra la UI actual y retiro justificado de las specs que cubrían superficies eliminadas (adaptador `llm-deepseek`, onboarding de cuenta, telemetría de feedback).
- **Worker preview arreglado**: el pack de la imagen vfs fallaba por `node:querystring` en la búsqueda de plugins (ahora `URLSearchParams`, web-seguro) y el stub de pi-ai del worker no cubría los símbolos que la ruta NaN lee al montar; el preview arranca y las rutas de petición siguen fallando loud.
- **Smokes real-host sobre la ruta del fork**: los tres smokes keyless del CLI y el escenario de reinicio del servidor redirigen la ruta nan-builders a su mock OpenAI-completions mediante profile patches del CLI; el mock de pruebas habla el dialecto que la ruta habla de verdad.
- **Flake de timing**: ventanas de espera de 20 ms → 250 ms en el harness de snapshots bajo carga instrumentada.
- **Higiene**: baseline de `no-unknown-casts` resincronizada (1408 aserciones registradas en 541 ficheros), exclusiones de cobertura y mapeos de `tsconfig.base` sin entradas muertas, y el golden del chip de Plan en español commiteado.

### English

Second public release, first with the house in order: CI fully green with partitioned quality coverage as a blocking gate, the web consumer test lane at zero failures (156 files / 568 tests), and both desktop apps built from exactly this state. Zero-log unchanged — nothing leaves your machine except what you provoke (LLM, search, GitHub). Downloads: unsigned macOS (Apple Silicon) `.app` zip and Windows NSIS installer, both with SHA256 checksums. Engineering highlights: the vfs worker preview pack is fixed (`node:querystring` → `URLSearchParams`; the pi-ai worker stub now covers every symbol the NaN route reads at mount), real-host keyless smokes drive the fork's OpenAI-completions route through CLI profile patches, and the Mimosa static-scan triage (738 findings) is documented as a process note.

[0.1.3]: https://github.com/686f6c61/harness-helmcode/releases/tag/desktop-v0.1.3
[0.1.0]: https://github.com/686f6c61/harness-helmcode/releases/tag/v0.1.0

## [0.1.0] — 2026-10-04

Primera versión pública. Fork del DeepSeek Harness reconstruido zero-log: instalas y usas, y nada sale de tu máquina salvo lo que provocas (LLM, búsqueda, GitHub).

### Añadido

- Modelos multi-proveedor sin proveedor por defecto (Anthropic, OpenAI, Kimi, GLM, gateways propios vía `llm-pi-ai`); ruta por defecto `nan-builders` servida por los servidores de NaN. El id de cable del modelo por defecto es `deepseek-v4-flash`, el que la API del cluster sirve realmente bajo el nombre visible DeepSeek V4.1 Flash.
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
- Los e2e del bin construido redirigen la ruta `nan-builders` al mock HTTP con un overlay `--patch` propio (reemplazo declarativo del perfil); el parche base mantiene la URL literal del cluster.
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
