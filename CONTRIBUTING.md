# Contribuir a Helmcode Harness

English: [CONTRIBUTING.en.md](CONTRIBUTING.en.md) · Español: [CONTRIBUTING.md](CONTRIBUTING.md)

¡Gracias por interesarte en Helmcode Harness! Este es el harness de agentes zero-log de la comunidad [NaN Builders](https://nan.builders/): instalas y usas, y nada sale de tu máquina salvo lo que provocas (hablar con tu proveedor LLM, buscar en la web, llamar a la API de GitHub que configures).

**Buscamos coautores, colaboradores y contributors.** Código, documentación, traducciones, plugins o revisiones: todo suma, y los contributors sostenibles pasan a co-autores del proyecto.

## Cómo empezar

Necesitas Node.js (`^22.19.0` o `>=24`) y [pnpm](https://pnpm.io/). Después:

```sh
git clone https://github.com/686f6c61/harness-helmcode.git
cd harness-helmcode
pnpm install
pnpm run build
pnpm dsh web
```

La Web UI arranca en `http://127.0.0.1:3080`. La primera ejecución te pide proveedor y clave (o usas la ruta `nan-builders` de la comunidad). La guía de usuario está en [docs/user/guide/index.es.md](docs/user/guide/index.es.md) y el desarrollo, en [docs/development.es.md](docs/development.es.md).

## Qué contribuir

- **Bugs y propuestas**: ábrelos en [GitHub Discussions](https://github.com/686f6c61/harness-helmcode/discussions) con pasos de reproducción. Antes, busca si ya existe uno similar.
- **Código**: correcciones y mejoras vía pull request (ver flujo abajo). Las áreas calientes ahora mismo son los proveedores (`packages/llm/llm-pi-ai`), las tools del bundle base y las superficies Web/Desktop.
- **Optimización**: arranque en frío, consumo de tokens, memoria, latencia de tools y tamaño del empaquetado son métricas de primera clase; un PR que reduzca cualquiera de ellas es oro.
- **Nuevos plugins y tools**: crea plugins propios (topic [`dsh-plugin`](https://github.com/topics/dsh-plugin)) o propón tools y proveedores para el bundle base; el Plugin Manager los descubre e instala en un clic.
- **Skills**: nuevas skills embebidas, mejoras a las existentes y sus metadatos de invocación; las skills viven en `packages/preset/agent-preset/skills/` y se exponen con la tool `skill`.
- **Documentación y traducciones**: la documentación es bilingüe (español e inglés, par a par); si mejoras una página, lleva la otra junto a ella.
- **Revisiones**: revisar pull requests y reproducir bugs es contribución de primera clase.

## Reglas del proyecto

- **Cero telemetría, inamovible**: no se añaden canales de envío de datos, analytics ni llamadas de red que el usuario no provoque. Esta regla pesa más que cualquier funcionalidad.
- **Sin secretos en el repo**: ninguna clave ni credencial real se compromete jamás; las pruebas usan valores de mentira y las credenciales viajan por el almacén local o el entorno.
- **Licencia**: tus contribuciones se acogen a la [licencia NaN Community](LICENSE) del proyecto; el código heredado del DeepSeek Harness permanece MIT upstream.

## Calidad y CI

Antes de abrir el pull request, deja en verde lo mismo que exigirá Actions:

```sh
pnpm exec tsx scripts/ci-simulate.ts --quick   # gates estáticos + lint de workflows
pnpm exec vitest run packages/tu-paquete/tests # los tests del área que toques
```

El simulador [`scripts/ci-simulate.ts`](scripts/ci-simulate.ts) ejecuta exactamente los comandos que corre GitHub Actions; sin `--quick` repite la pasada completa de PR (static, typecheck, lint y la suite unitaria entera). Simulador verde = Actions verde.

En el pull request se pedirá:

- **Tests** que cubran el cambio (el repo exige cobertura; los tests van en `tests/` junto al paquete).
- **Documentación al día**: si tocas configuración o superficies visibles, los catálogos generados y las páginas bilingües se actualizan en el mismo PR (los gates de docs te guían con el comando exacto).
- **Un cambio por PR**, con el título en inglés o español y la descripción clara del porqué.

## Proceso

1. Comenta en la Discussion o issue que vas a trabajar el tema (evita duplicar esfuerzo).
2. Haz fork, crea una rama corta (`feat/mi-cosa` o `fix/mi-arreglo`) y envía el PR contra `main`.
3. El CI de la PR debe quedar verde; un mantenedor revisará y propondrá ajustes si hacen falta.
4. Los contributors recurrentes reciben acceso de escritura y, con el tiempo, co-autoría del proyecto.

## Estructura del pull request

Al abrir el PR se carga la [plantilla del repo](.github/pull_request_template.md) automáticamente. La rellenamos así:

- **Título**: `tipo(área): resumen` — tipos `feat`, `fix`, `docs`, `refactor`, `test`, `chore` (p. ej. `feat(llm-pi-ai): añadir effort a gemma4`).
- **Motivation**: una línea con el problema que resuelves y la referencia `Fixes #NN` o `Related #NN` a la Discussion/issue.
- **Changes**: cambios de alto nivel en comandos, configuración, API, protocolo o formato de persistencia; y los de comportamiento observable por usuario, modelo o sistema. Si no hay, `None`.
- **Testing**: una entrada por método de verificación (tests, comandos, pasos manuales), cada una con su evidencia reproducible en un bloque `Proof` plegable.
- **Checklist final**: tests que cubren el cambio, docs y catálogos generados al día, simulador en verde y cero telemetría.

### PRs con IA: bienvenidos — de personas, no de bots

Este proyecto es **e/acc**: programar con agentes es parte del oficio, y los PR escritos con ayuda de IA son bienvenidos sin penalización. Herramientas como **Codex, Claude, Cursor, Copilot, Windsurf, Gemini, Aider, Cline, OpenCode o el propio Helmcode** cuentan como extender tu teclado, no como reemplazarte.

Lo que **no** se acepta son bots: cuentas automatizadas, anónimas o de granja que disparan PRs en lote sin una persona identificable detrás que los defienda. Cada PR sale de una cuenta personal de GitHub, de alguien con nombre y presencia que participa en la revisión.

Y una regla de crédito clara: **los agentes no son contributors**. Claude, Codex, Cursor o el modelo que sea no entran en la lista de contributors ni de co-autores, ni firman commits como autores (`Co-authored-by` de IA fuera); el crédito del trabajo es de la persona que dirige, verifica y asume cada línea. Aceleramos con la herramienta; la autoría es humana.

Dos condiciones honestas: declara en la descripción qué agente o modelo usaste y qué verificaste tú por encima, y asume que una persona humana revisa cada línea antes del merge. La barra es idéntica para todos —tests en verde, docs al día y las reglas de telemetría—, venga el código de un teclado humano o de un agente bien dirigido.

## Comunidad

- [GitHub Discussions](https://github.com/686f6c61/harness-helmcode/discussions) para dudas, propuestas y Plugins.
- [Discord de Helmcode](https://discord.gg/4MrtZUhpxg) para el día a día.
- Seguridad: lee [SAFETY.md](SAFETY.md) y reporta vulnerabilidades en privado antes que públicamente.
