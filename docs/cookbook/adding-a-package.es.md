# Manual de referencia: añadir un paquete del espacio de trabajo

[English](adding-a-package.md) | Español

La lista de verificación archivo por archivo para un nuevo paquete `@deepseek-ai/dsh-<name>`. Esta lista está validada contra los paquetes bash y adapter como plantillas; si diverge de ellos, corregirla aquí.

## 1. Crear el paquete

```
packages/<group>/<pkg>/
  package.json     # copy from packages/core/tools, adjust name/description/deps
  tsconfig.json    # extends ../../../tsconfig.base.json, rootDir src,
                   # outDir lib/types, references: ../../../vendor/cosmokit,
                   # ../../../vendor/cordis (+ ../../../vendor/schemastery if
                   # you use Config, + ../../<group>/<dep> for each dsh dep)
  src/index.ts     # service default export or plugin (name/inject/apply/Config)
  locale/en.json   # optional display metadata: meta.title and meta.description
  locale/zh.json   # translations using the same fields
  README.md        # service API, events, extension points, design notes,
                   # + gated Model Experience context blocks or short form
                   # + the gated "Known Limitations and Deferred Work" section
                   # (or a whitelist entry in scripts/verify-package-readme-limitations.ts)
```

Elegir un grupo existente cuando alguno coincida con el rol del paquete (`core`, `llm`, `shell`, `compaction`, `subagent`, `todo`, `session`, `client`/`host`, `util` o `test-support`). Un grupo nuevo está permitido, pero es un contenedor puro: sin `package.json`, sin archivos fuente, y los paquetes siguen situándose exactamente un nivel por debajo de él.

Invariantes de package.json (aplicadas por `pnpm run constraints` / `scripts/check-workspace-constraints.ts`): `private: true`, un `version` igual al del `package.json` raíz, `type: module`, `main: "lib/index.js"`, `types: "lib/types/index.d.ts"`, `exports["."].types: "./lib/types/index.d.ts"`, `exports["."].default: "./lib/index.js"`, `@deepseek-ai/cordis` tanto en peerDependencies como en devDependencies (mismo rango). Reflejar cada dependencia de pares (peer dependency) de dsh en devDependencies. `@deepseek-ai/schemastery` va en `dependencies` (es un validador en runtime), igual que en agent-loop. La lista `files` contiene exactamente `lib/index.js`, `lib/types/**/*.d.ts` y los artefactos en runtime específicos del paquete que la puerta reconoce; un paquete que publica `./invariant` incluye también `lib/invariant.js`. Un paquete cuya exportación en runtime apunta al árbol emitido incluye también `lib/types/**/*.js`. No publicar `src`, declaration maps, JS maps ni archivos de declaración raíz obsoletos. Los paquetes de aplicaciones CLI con un `bin` de paquete incluyen `lib/bin.js` inmediatamente después de `lib/index.js` en `files`.

Los imports relativos dentro del paquete usan especificadores `.ts` explícitos en el fuente (por ejemplo, `export * from './types.ts'`). El compilador los reescribe a `.js` en el JS emitido y deja los especificadores `.ts` explícitos en las declaraciones, que los consumidores estándar de TypeScript NodeNext/Node16 resuelven a los archivos `.d.ts` hermanos.

## 2. Registrarlo en las configuraciones raíz

| Archivo | Cambio |
|---|---|
| `tsconfig.base.json` | sin edición para un grupo existente; para un grupo nuevo, añadir un candidato `./packages/<group>/*/src` al comodín `@deepseek-ai/dsh-*` |
| `tsconfig.host.json` (paquete Host) o `tsconfig.client.json` (paquete Client) | añadir `{ "path": "./packages/<group>/<pkg>" }` a `references`: un paquete ordinario pertenece exactamente a un agregado, nunca a ambos. `api/remotes` usa una división específica del repositorio porque el Host genera un contrato que el Client consume en una fase posterior; los paquetes nuevos no deben copiarla ([layout](../development.es.md#typescript-project-layout)) |

Un paquete `packages/client/*` además extiende `tsconfig.base.client.json` en lugar de `tsconfig.base.json`, y un paquete de plugin de cliente declara `dsh.client` en package.json, exporta `./client` y llama al preset compartido de tsdown (`packages/client/tsdown.client.ts`); véase [packages/client/AGENTS.md](../../packages/client/AGENTS.md) para el contrato del lado cliente.

Cubierto automáticamente por globs o por descubrimiento de manifests de paquete, sin ediciones necesarias: los workspaces del `package.json` raíz, `scripts/publint-all.ts`, `tsdown.config.ts`, `.oxlintrc.json`, `scripts/check-workspace-constraints.ts`.

## 3. Decidir la topología del paquete

Para una capacidad intercambiable, separar los roles Service Definition / Service Provider / Consumer en paquetes cuando evolucionan de forma independiente (véase docs/architecture.md § «Capability seams»: el trío shell es la plantilla). Un plugin de propósito único sigue siendo un solo paquete.

### Nombrar el rol que existe

Nombrar la responsabilidad estable actual. No nombrar la primera implementación, una posible expansión futura ni la clase base de Cordis. Un paquete de interfaz nombra la capacidad. Un paquete de implementación añade el mecanismo, protocolo, entorno o proveedor que lo distingue. Usar `local` solo cuando la ejecución en el mismo anfitrión forma parte del contrato.

Usar una clave `ctx` en singular para un motor, runtime, política, controlador, resolvedor, almacén o configuración actual. Usar una clave en plural para un registry o un servicio que posee varios miembros nombrados. El rol de la clase y el número de la clave deben concordar. No reutilizar una misma clave de `Context` de Cordis para declaraciones incompatibles de host y cliente. El declaration merging de TypeScript ve ambas caras aunque usen contextos en runtime separados. Añadir el sufijo de rol cuando el plural natural ya pertenece a otra cara.

| Palabra | Usarla cuando | No usarla cuando |
|---|---|---|
| `Controller` | Acepta comandos o intención del usuario y cambia un estado de dominio o de presentación existente. | Ejecuta trabajo arbitrario, posee una flota de proveedores o solo convierte valores para presentación. |
| `Store` | Posee un conjunto de datos y ofrece principalmente operaciones CRUD, de snapshot o de suscripción sobre esos datos. | Valida una máquina de estados, arbitra autoridad, despacha trabajo o posee la precedencia de proveedores. Un map no convierte una clase en un almacén. |
| `Directory` | Expone entradas y metadatos para descubrimiento o selección. | Los productores registran en él implementaciones arbitrarias, o los llamantes ejecutan trabajo a través de él. |
| `Presenter` | Es una conversión pura de valores de dominio o argumentos de tool a intención de renderizado. | Realiza E/S, se suscribe, muta estado o posee ciclo de vida. |
| `Registry` | Posee un conjunto dinámico de registros nombrados, incluidos búsqueda, reglas de duplicados o precedencia, ciclo de vida y liberación. | Su contrato principal es despacho, ejecución, cancelación, política u orquestación. |
| `Runtime` | Ejecuta trabajo en vivo y posee despacho, cancelación, coordinación de proveedores o ciclo de vida de operaciones entre llamadas. | Solo almacena registros, devuelve un catálogo, resuelve un valor o mantiene configuración. |
| `Resolver` | Calcula o localiza una respuesta a partir de las entradas suministradas sin poseer el ciclo de vida de esa respuesta. | Posee una colección mutable o una ejecución de larga duración. |
| `Binder` | Vincula una interfaz declarada al contexto o ciclo de vida del llamante y devuelve el valor vinculado. | Posee el valor como colección, controla su estado de dominio o solo convierte datos. |
| `Engine` | Implementa un algoritmo de dominio o un modelo de ejecución con estado. | Solo selecciona un proveedor o reenvía a través de un límite de protocolo. |
| `Policy` | Decide qué está permitido, seleccionado, limitado u observado. | Ejecuta el mecanismo que la decisión permite. |
| `Executor` | Ejecuta una solicitud explícita o una especificación resuelta en una capacidad. | Posee un ciclo de vida de aplicación amplio o un catálogo de proveedores. |
| `Gateway` | Adapta un límite de proceso, red, RPC o API. | Solo registra servicios del mismo proceso o almacena metadatos. |
| `Provider` | Suministra una implementación de una definición de capacidad. Añadir un calificador de mecanismo o proveedor cuando pueden existir varias. | Es la definición de la capacidad, el registry de proveedores o el runtime consumidor. |
| `Backend` | Implementa persistencia, transporte o ejecución reemplazables de nivel inferior tras una interfaz definida. | Es un servicio orientado al usuario o una única referencia a un recurso en vivo devuelta. |
| `Handle` | Hace referencia a un recurso en vivo y controla u observa ese recurso. | Crea y gestiona el pool completo de recursos. |
| `Config` | Posee un valor de configuración resuelto o un registro estrictamente delimitado y su contrato de actualización. | Almacena una colección general, ejecuta trabajo o expone settings no relacionados. |
| `Service` | Posee un servicio de dominio cohesivo que ningún rol más preciso de la lista anterior enuncia con honestidad. | El nombre existe solo porque la clase extiende `Service` de Cordis. |

Usar `SDK` solo para el protocolo cliente/servidor JSON-RPC que usan los SDK de Python y TypeScript soportados. DeepSeek Harness en sí es un agent harness (framework de agents), no un proyecto SDK. Usar la grafía de producto canónica `Typert`, nunca `TypeRT` ni `typeRT`.

<a id="4-write-the-package-readme"></a>

## 4. Escribir el README del paquete

Mantener primero la API de servicio, la configuración, los eventos, los puntos de extensión y las notas de diseño específicos del paquete. Elegir el `kind` del frontmatter entre las cuatro etiquetas kind de la [referencia de metadatos de dsh-doc](../../.agents/skills/dsh-doc/references/metadata-links-i18n.md#the-kind-system) (group, reference, library o bundle), según la posición del paquete en el repositorio y la forma de su entrada; cada kind selecciona una plantilla de README. La sección de limitaciones registra las carencias duraderas para el consumidor y las restricciones no obvias del mantenedor que posee este paquete; la limpieza ordinaria se queda en su TODO del fuente o en su Agent Note. Una frase indirecta de Model Experience puede nombrar al consumidor que hace visible la contribución de este paquete, pero no repite la implementación de ese consumidor. Terminar el README de un paquete con esta secuencia canónica:

````markdown
## Model Experience

### Request context and condition

#### What the model sees

The exact data-dependent fields, an anchored generated-catalog link, or an introduction to the verbatim literal below.

##### Verbatim text for this field, when needed

```markdown
Stable system-prompt prose of any length, or another long non-generated literal, copied exactly from source.
```

#### Token effect

Fixed, conditional, retained, replaced, capped, or zero-direct token effect.

#### KV Cache effect

Append-only, prefix-stable, replacing, or independent behavior, including the exact conditions that may invalidate reuse.

## Known Limitations and Deferred Work

- **Consumer-visible gap** — exact missing operation or case, its consequence, and any maintainer constraint.
````

Rellenar Model Experience a partir de la implementación. Usar un H3 por cada entrada de contexto de modelo directa, condicional, limitada, de ciclo de vida o auxiliar, con los tres campos H4 ordenados mostrados arriba y un párrafo en prosa bajo cada uno. Citar el texto estable que posee el paquete: la prosa del prompt del sistema va en un H5 titulado más una cerca `markdown` bajo el campo que la introduce (normalmente `What the model sees`); otros literales cortos se quedan en línea con placeholders nombrados, y otros literales largos usan la misma forma anidada. Resumir solo texto dependiente de datos o perteneciente al proveedor. Una entrada de schema de tool enlaza a su sección anclada en el [catálogo de tools](../tool-catalog.es.md) generado y enuncia solo los deltas ausentes allí. Mantener separadas las entradas de prompt y de schema cuando el alcance puede ocultar una sin la otra. En `KV Cache effect`, distinguir el crecimiento de solo anexado, un prefijo repetido estable, el reemplazo de tokens de solicitudes anteriores y una solicitud de modelo independiente, y luego nombrar los cambios pertenecientes al paquete que pueden invalidar la reutilización. «No invalida» significa que el paquete preserva un prefijo ya reutilizable; la disponibilidad y el desalojo de la caché del proveedor quedan fuera del contrato del paquete. El [estándar de prosa](../../.agents/skills/dsh-prose-standard/SKILL.md) gobierna la completitud y la propiedad; el verificador aplica la estructura de secciones requerida.

Un paquete sin efecto de contexto o con una única ruta perteneciente al consumidor usa la frase auditada `None, as ` o `Indirectly, through ` de [`SENTENCE_MODEL_EXPERIENCE`](../../scripts/verify-package-readme-model-experience.ts), seguida de un H4 `KV Cache effect` y un párrafo no vacío; un paquete genérico agnóstico de modelo puede en su lugar unirse a `NO_MODEL_EXPERIENCE_SECTION`. No expandir ninguno de los dos casos en una descripción del trabajo de otro paquete. La [lista blanca](../../scripts/verify-package-readme-limitations.ts) de limitaciones es independiente. El [Agent Note de Model Experience](../../.agents/notes/implemented/process/2026-07-12-package-model-experience-contract.md) registra la justificación.

<a id="plugin-display-metadata"></a>

## 5. Añadir metadatos opcionales de presentación del plugin

Para un plugin de paquete npm, definir su título y descripción en `locale/en.json`. Otros archivos de idioma, como `locale/zh.json`, usan los mismos campos:

```json
{
  "meta": {
    "title": "Workspace Tools",
    "description": "Tools for your workspace."
  }
}
```

Fusionar estas entradas en `package.json`, conservando las exportaciones en runtime y los archivos de publicación existentes:

```json
{
  "exports": {
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "files": ["locale/*.json"]
}
```

Mantener los archivos de idioma juntos en `locale/`, con `en.json` como entrada de descubrimiento. Los campos son opcionales; los valores presentes deben ser cadenas no vacías. Los archivos o campos ausentes permiten fallback, mientras que un JSON malformado o campos inválidos producen un diagnóstico por plugin.

Cada campo hace fallback de forma independiente antes del formateo de nombres específico de cada vista, usando primero la cadena de idiomas del locale existente:

- Título: `meta.title` del locale → `package.json.name` → nombre completo del plugin de Cordis.
- Descripción: `meta.description` del locale → `package.json.description` → sin descripción.

Exportar `<package name>/locale/en.json` para la búsqueda de locales; exponer `<package name>/package.json` para el fallback de campos de paquete o una declaración de icono.

Para una imagen en las tarjetas de paquetes de composición, los detalles y las filas de componentes, establecer `"icon": "./icon.svg"` de nivel superior en ese manifest exportado e incluir la imagen en `files`. La ruta es relativa al directorio del manifest que la declara, también para manifests de plugin exportados de forma independiente. Se admiten archivos SVG, PNG, JPEG (`.jpg`/`.jpeg`) y WebP de hasta 256 KiB. Se rechazan rutas absolutas, URL, rutas fuera de ese directorio y symlinks que resuelven fuera de él. Las imágenes no necesitan una exportación separada y deben ser autocontenidas; el SVG se renderiza como imagen, no como HTML en línea. El Host devuelve una data URL sin activar el plugin. Las declaraciones inválidas o los archivos ilegibles producen un diagnóstico de metadatos conservando el texto válido; las imágenes ausentes o indecodificables usan la ilustración por defecto del panel.

Las tarjetas y los detalles de paquetes de composición instalados, las listas de componentes y los detalles de configuración, y el inventario de plugins de Configuración muestran estos metadatos, incluidos los plugins desactivados y los de preset. Las lecturas no activan plugins.

Solo Configuración acorta los fallbacks literales de nombre de paquete y nombre de módulo eliminando el scope de npm y los prefijos Cordis/DSH; Plugin Manager conserva los nombres completos. Los títulos y descripciones de locale permanecen sin cambios. Una página de configuración de fila puede usar su resumen registrado cuando el plugin no tiene descripción de presentación.

La vista Install sigue usando la información del registry de npm de `pnpm view`, no los metadatos de locale.

Verificar el resultado:

1. Ejecutar `pnpm run verify-package-meta` desde la raíz del repositorio para comprobar campos, exportaciones de recursos y cobertura de publicación.
2. Cambiar las entradas aplicables de Plugin Manager y Configuración de un plugin instalado entre inglés y chino; comprobar el título, la descripción, el fallback por campo y los nombres técnicos compactos exclusivos de Configuración.

Véase el [Agent Note de metadatos de plugin](../../.agents/notes/implemented/architecture/2026-09-18-localized-package-metadata.md) para la propiedad de los recursos y la justificación de la no activación.

## 6. Verificar

```sh
pnpm install        # registers the workspace
pnpm run doc-sync
pnpm run constraints && pnpm run typecheck && pnpm run lint
pnpm run build && pnpm run hygiene
```

Seguir la [política de testing del repositorio](../testing.es.md) para las comprobaciones de comportamiento y la cobertura que requiere el nuevo paquete.
