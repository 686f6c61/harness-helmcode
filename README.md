# Helmcode Harness

English: [README.en.md](README.en.md) · Español: [README.md](README.md)

![CI Desktop](https://github.com/686f6c61/harness-helmcode/actions/workflows/desktop-packages.yml/badge.svg)

![Licencia](https://img.shields.io/badge/licencia-NaN%20Community-blue.svg)

![npm harness-helmcode](https://img.shields.io/npm/v/harness-helmcode)

**Helmcode Harness** es un harness de agentes open source y zero-log creado por [686f6c61](https://github.com/686f6c61) y mantenido por la comunidad [NaN Builders](https://nan.builders/).

Nace como **fork del [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)** de DeepSeek AI, que publicó su código bajo licencia MIT: ese crédito y esa licencia se respetan aquí, y sobre esa base el proyecto se reconstruyó con una regla innegociable, **cero telemetría**. Quitamos los adaptadores propietarios, la cuenta, la analítica y todos los canales de envío de datos, y lo verificamos línea a línea: nada sale de tu máquina salvo las peticiones que tú provocas, es decir, hablar con el proveedor LLM que elijas, buscar en la web cuando lo pides o llamar a la API de GitHub que configures.

El resto es tuyo: eliges proveedor y clave en la primera ejecución, o usas la ruta `nan-builders` servida por los servidores de NaN. Puedes conectarte a **Claude (Anthropic), OpenAI, Bedrock (AWS), Azure, Kimi/Moonshot, GLM (Zai), Google Gemini/Vertex, Mistral, OpenRouter, Groq, Cloudflare y GitHub Copilot**, o a cualquier gateway propio que hable OpenAI o Anthropic (la lista completa de proveedores del catálogo está en la [guía de proveedores](docs/user/guide/providers.es.md)). La memoria recuerda tu contexto entre sesiones, los checkpoints hacen reversible cada cambio del agente y los plugins se instalan en un clic.

Está construido sobre una arquitectura **everything-is-a-plugin** impulsada por [Cordis](https://github.com/cordiverse/cordis), cuyo paradigma se describe en [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

- Documentación: [nan-harness.686f6c61.dev](https://nan-harness.686f6c61.dev)
- Código: [github.com/686f6c61/harness-helmcode](https://github.com/686f6c61/harness-helmcode)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

> **Estamos buscando coautores, colaboradores y contributors.** Código, documentación, traducciones, plugins o revisiones: si quieres empujar un harness open source, hay sitio. Los contributors sostenibles pasan a co-autores del proyecto.

## Qué hemos quitado de DeepSeek (cero telemetría)

El fork elimina por completo la dependencia de DeepSeek y todo canal que enviara datos fuera de la máquina:

- **Adaptadores y cuenta**: `llm-deepseek`, `llm-deepseek-api-key`, `llm-deepseek-account`, `deepseek-account`, `deepseek-account-platform` (login por navegador, saldos, bonos) y `deepseek-llm-api-extensions`.
- **Telemetría**: exportadores OTel (`session-telemetry-otel`, `host-product-telemetry-otel`), analítica de producto (`client-product-analytics`) y el campo heredado `telemetryDisabledEnv`.
- **Subidas de registro**: `session-log-deepseek` (sufijo `dsh_session_log`) y `plugin-package-inventory-deepseek` (`dsh_plugin_packages`).
- **Búsqueda server-side de DeepSeek** (`web-search-deepseek`) y su tarjeta de ajustes.
- **Interfaces de cuenta y registro**: `ui-settings-account`, `ui-settings-session-log`, bienvenidas con login, avisos de bonos e identificador anónimo de usuario.
- **Valores por defecto del fabricante**: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` y rutas de login de plataforma.

## Qué hemos añadido

- **Modelos multi-proveedor sin proveedor por defecto**: tú eliges la ruta (Anthropic, OpenAI, Kimi/Moonshot, Zai/GLM o cualquier gateway propio) vía `llm-pi-ai` (`openai-completions`, `openai-responses`, `anthropic-messages`). La ruta por defecto de la composición la sirven **los servidores de NaN** (`nan-builders`).
- **Búsqueda web en la primera ejecución y sin clave**: proveedor DuckDuckGo keyless en el bundle base; **Brave** como mejora opt-in con su propia tarjeta de ajustes.
- **Memoria persistente entre sesiones** (tool `memory` + sección en el prompt) y **checkpoints de ficheros** para deshacer cambios (tool `checkpoint`).
- **Conector GitHub**: buscar y leer issues y pull requests, y comentar de forma opt-in.
- **Descubrimiento e instalación de plugins en un clic**: `dsh plugin search` / `dsh plugin add` y panel «Descubrir plugins» en el Plugin Manager.
- **Superficies Web, Desktop (macOS/Windows), SDK y ACP** sobre una misma composición, con documentación bilingüe (español e inglés) y CI que empaqueta ambas plataformas.

<a id="run"></a>
## Personalización

- **Tu proveedor, tu clave, tu ruta**: nada viene preligado a un fabricante; el proveedor se elige en la primera ejecución y se cambia cuando quieras.
- **Memoria entre sesiones**: la tool `memory` guarda decisiones, estilo y contexto del proyecto, y el prompt del sistema los lista automáticamente en la sesión siguiente.
- **Ajustes por plugin y por fila** en el Plugin Manager, presets de agente y un catálogo de modelos editable (ventana de contexto, effort, modalidades).

## Zero telemetría: qué sale y qué no

Sin switches que apagar: los canales se **eliminaron del código**, no se desactivaron. Lo único que sale de la máquina es lo que tú provocas de forma explícita:

| Sale solo si tú lo pides | Nunca sale |
|---|---|
| Peticiones al proveedor LLM que elijas | Sesiones y su historial |
| Búsquedas web que el agente ejecuta a tu orden | Memoria y checkpoints |
| Llamadas a la API de GitHub que configures | Credenciales (almacén local) |
| | Telemetría: no existe ningún canal |

## Optimizado para el flujo de usuarios NaN

- **Ruta por defecto `nan-builders`**, servida por los servidores de NaN: inferencia de la comunidad sin configurar nada más.
- **Primer arranque en un comando** (`npx harness-helmcode web`) y búsqueda usable al instante, sin claves.
- **Memoria y checkpoints evitan repetir trabajo**: el contexto persiste entre sesiones y todo cambio del agente es reversible.
- **Plugins en un clic**: descubrir, instalar y activar sin salir del Plugin Manager.

## Ejecutar

### Desde npm

Instala Node.js y ejecuta:

```sh
npx harness-helmcode web
```

Arranca la Web UI en `http://127.0.0.1:3080` y la abre en tu navegador (usa `--no-open` para no abrirla). Guía completa: [Web UI](docs/user/guide/index.md).

### Desde el código

```sh
git clone https://github.com/686f6c61/harness-helmcode.git
cd harness-helmcode
pnpm install
pnpm run build
pnpm dsh web
```

### Escritorio

`pnpm --filter @deepseek-ai/dsh-desktop run package:mac:arm64:dir` (macOS) y `package:win:x64:unsigned` (Windows, requiere host Windows) generan los paquetes; el workflow **Desktop packages** los construye por push.

## Comunidad y soporte

- Feedback y bugs: [GitHub Discussions](https://github.com/686f6c61/harness-helmcode/discussions).
- Plugins: añade el topic [`dsh-plugin`](https://github.com/topics/dsh-plugin) a tu repositorio.
- Comunidad: [Discord de Helmcode](https://discord.gg/4MrtZUhpxg).
- Changelog público: [CHANGELOG.md](CHANGELOG.md).

## Contribuir

**Buscamos coautores, colaboradores y contributors** — código, documentación, traducciones, plugins o revisiones; los contributors sostenibles pasan a co-autores. Empieza por [CONTRIBUTING.md](CONTRIBUTING.md) (también en [inglés](CONTRIBUTING.en.md)). Para agentes hay [AGENTS.md](AGENTS.md); el desarrollo se documenta en [docs/development.es.md](docs/development.es.md) y [docs/architecture.md](docs/architecture.md), y `make help` lista los comandos.

## Seguridad

Lee el [aviso de seguridad](SAFETY.md) antes de ejecutar el proyecto; está en _developer preview_ y habrá cambios incompatibles.

## Licencia

**Licencia NaN Community**: uso libre para personas, fines personales, educativos, de investigación y para la comunidad NaN. **El uso empresarial o comercial por organizaciones requiere licencia comercial** del mantenedor ([contacto](https://github.com/686f6c61/harness-helmcode/discussions)).

El código heredado del DeepSeek Harness original sigue siendo MIT de sus autores y está disponible upstream; los textos completos están en [LICENSE](LICENSE). Dependencias de terceros en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Cita del proyecto:

```bibtex
@misc{helmcode2026,
  title={Helmcode Harness: Everything is a Plugin},
  author={NaN Builders},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/686f6c61/harness-helmcode}},
}
```
