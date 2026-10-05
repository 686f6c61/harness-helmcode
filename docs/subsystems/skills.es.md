# Skills

[English](skills.md) | Español

La [familia de capacidades de skill (habilidad)](../../packages/skill) incluye la Service Definition ([dsh-skill](../../packages/skill/skill), `ctx.skills`), el Service Provider local ([dsh-skill-filesystem](../../packages/skill/skill-filesystem)), proveedores empaquetados opcionales ([dsh-skill-badge](../../packages/skill/skill-badge), [dsh-skill-office](../../packages/skill/skill-office) y el proveedor de diagnóstico ACL de Windows en [dsh-sandbox-windows-acl](../../packages/sandbox/sandbox-windows-acl)) y el Consumer ([dsh-tool-skill](../../packages/skill/tool-skill)). El registry fusiona los catálogos de los proveedores a través de sus capas de host y por ámbito; los proveedores contribuyen skills locales o empaquetadas; el Consumer posee los catálogos inicial y de reemplazo además de la tool `skill` orientada al modelo. Las skills son instrucciones opcionales, no eventos de sesión, así que su vocabulario vive aquí y no en [core.md](core.es.md).

Fuente: [`packages/skill/skill/src/index.ts`](../../packages/skill/skill/src/index.ts), [`packages/skill/skill-filesystem/src/index.ts`](../../packages/skill/skill-filesystem/src/index.ts), [`packages/skill/skill-badge/src/index.ts`](../../packages/skill/skill-badge/src/index.ts), [`packages/skill/skill-office/src/index.ts`](../../packages/skill/skill-office/src/index.ts), [`packages/sandbox/sandbox-windows-acl/src/acl-skill.ts`](../../packages/sandbox/sandbox-windows-acl/src/acl-skill.ts) y [`packages/skill/tool-skill/src/index.ts`](../../packages/skill/tool-skill/src/index.ts).

## Registry de proveedores

`ctx.skills` combina proveedores locales, embebidos, remotos o de otro tipo. El registro es síncrono; la inicialización remota y el descubrimiento pertenecen al `list()` awaited. Los objetos de proveedor, las opciones y los candidatos se toman prestados como solo lectura, mientras que los campos semánticos se validan.

El registry está estratificado en host + por ámbito, la forma que el [registry de tools](tools.es.md) estableció sobre [dsh-scope](../../packages/core/scope): un registro se archiva en la capa del ámbito de su contexto llamante, de modo que las filas del host y los plugins del repositorio caen en la capa global, mientras que un plugin montado por la composición permanente de un preset de agent (agente) cae en la capa de ese preset, y los nombres de proveedor son únicos por capa en lugar de en todo el proceso. Una lectura fusiona la capa global con la cadena del ámbito que observa: la entrada de la capa más cercana gana un nombre de skill duplicado directamente, y el orden de rango siguiente decide los duplicados solo dentro de una capa. Las cachés de descubrimiento se indexan por la cadena de ámbitos resuelta, así que re-parentar un ámbito (una recomposición de sesión en blanco) es visible para la siguiente lectura sin una mutación del registry.

Dentro de una capa, los nombres duplicados se resuelven por rango, orden de proveedor y luego orden local; los resúmenes se ordenan por nombre. Un `list()` rechazado se registra y se omite de una observación incompleta, mientras que una observación explícitamente incompleta aporta candidatos utilizables sin hacer el resultado cacheable; los candidatos malformados fallan de fallo rápido. Cada factoría de proveedor recibe un control con ámbito de registro cuyo `invalidate()` limpia los catálogos completados solo mientras ese registro exacto permanece activo y cuya señal aborta ante un registro fallido o un dispose. Un descubrimiento en curso reintenta una vez cuando cambia su generación de proveedor; un segundo cambio devuelve los últimos candidatos, incompletos y sin cachear. Las mutaciones de proveedores y del runtime emiten el evento de invalidación sin filtrar `skills/change`; no porta diff, así que los consumidores vuelven a pedir `snapshot()` con sus propias opciones de búsqueda.

Un array devuelto por `SkillProvider.list()` es la forma abreviada de descubrimiento completo. `SkillProviderObservation` permite a un proveedor exponer candidatos que siguen siendo directamente cargables mientras informa de que la observación no es autoritativa.

```ts type-equiv
/** Provider candidates plus whether the current discovery is authoritative. */
interface SkillProviderObservation {
  /** Candidates available from the current provider discovery. */
  readonly candidates: readonly SkillCandidate[]
  /** Whether discovery completed and these candidates may be cached. */
  readonly complete: boolean
}
```

```ts type-equiv
/** Provider interface for one source of skills, such as local directories or a remote registry. */
interface SkillProvider {
  /** Unique provider name in the `ctx.skills` registry. */
  readonly name: string
  /**
   * List available skill candidates for the current lookup context. Provider
   * plugins register synchronously during `apply()`; remote initialization,
   * authentication, and discovery are awaited inside this method. Implementations
   * should settle promptly when `options.signal` aborts.
   * @param options - lookup options; `cwd` selects workspace-sensitive skills and `signal` cancels work.
   * @returns provider candidates as a complete-array shorthand, or an explicit
   *   observation when usable candidates came from incomplete discovery.
   */
  readonly list: (options: SkillLookupOptions) => Promise<readonly SkillCandidate[] | SkillProviderObservation>
  /**
   * Load a complete skill body for a previously listed candidate.
   * @param candidate - the winning candidate originally returned by this provider.
   * @param options - lookup options; `cwd` selects workspace-sensitive skills and `signal` cancels work.
   * @returns the full skill body, or `undefined` if it is no longer loadable.
   */
  readonly get: (candidate: SkillCandidate, options: SkillLookupOptions) => Promise<SkillDefinition | undefined>
}
```

```ts type-equiv
/** Registration-scoped lifecycle and invalidation capability borrowed by one provider. */
interface SkillProviderControl {
  /** Aborts if registration fails or when the exact provider registration is disposed. */
  readonly signal: AbortSignal
  /** Invalidate completed catalogs and notify consumers only while the exact registration remains active. */
  readonly invalidate: () => void
}
```

## Prioridad de descubrimiento local

El proveedor local distribuido escanea raíces en orden de rango:

| Rango | Fuente | Raíz |
|---|---|---|
| 100 | `project-dsh` | `<projectRoot>/.dsh/skills` |
| 200 | `project-agents` | `<projectRoot>/.agents/skills` |
| 300 | `custom` | `Config.customSkillDirs` |
| 400 | `user-dsh` | `<dshHome>/skills` |
| 500 | `user-agents` | `<agentsHome>/skills` |
| 600 | `bundled` | `Config.bundledSkillDir` cuando está configurado |

La raíz del proyecto es el ancestro más cercano que contiene `.git`; sin uno, se usa el cwd actual. Cuando `ctx.fs` está disponible, la búsqueda de la raíz git sondea `.git` a través del servicio de sistema de archivos, de modo que los espacios de trabajo remotos o en sandbox no caen de vuelta al límite del sistema de archivos del host. La raíz DSH de usuario salta su hijo `.system`. El proveedor local no sintetiza skills de sistema incorporadas; los despliegues suministran skills empaquetadas mediante raíces bundled configuradas o proveedores dedicados.

`dsh-skill-badge` registra un candidato `bundled` inmutable en `BUNDLED_SKILL_RANK` y expone su directorio de assets empaquetados mediante `resourceBase`. El CLI distribuido declara el plugin deshabilitado, así que habilitar su fila de composición es un opt-in explícito.

Chokidar vigila las raíces existentes ante adiciones y eliminaciones directas de bundles o entradas planas, además de cambios directos en entradas de skill. Una raíz ausente se sigue un segmento de ruta ausente cada vez desde su ancestro existente más cercano hasta que Chokidar puede engancharse. Los archivos de recursos bajo un bundle no son cambios de catálogo. Las observaciones de `write` y `edit` orientadas al modelo invalidan sincrónicamente el proveedor cuando su objetivo es relevante para el catálogo, mientras que el watcher del host cubre mutaciones de IDE, Git, shell y procesos externos. Los fallos del watcher hacen incompleta la observación actual sin ocultar los candidatos legibles de las cargas directas; los watchers con ámbito de proyecto usan una LRU acotada configurada.

## Identidad de skill

Los nombres de skill son kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). El proveedor local acepta bundles de directorio (`<name>/SKILL.md`) y archivos Markdown planos (`<name>.md`). El descubrimiento recursivo anidado `**/SKILL.md` no está soportado.

```ts type-equiv
/** Origin bucket for a skill contribution. The value is prompt-visible metadata, not precedence by itself. */
type SkillSource = 'project-dsh' | 'project-agents' | 'runtime' | 'user-dsh' | 'user-agents' | 'custom' | 'bundled' | (string & {})
```

## Resúmenes, candidatos y definiciones completas

`SkillSummary` es la forma de resumen neutra en invocación del registry. Los consumidores eligen qué entradas y campos renderizar; el catálogo de sesión del modelo usa solo el `name` y la `description` invocables por el modelo, nunca el cuerpo ni la ruta absoluta del archivo. `SkillInvocationPolicy` normaliza los dos controles de invocación independientes en booleanos positivos, y cada resumen, candidato y definición resuelta la porta sin convertir frontmatter arbitrario en el modelo de dominio.

```ts type-equiv
/** Invocation controls shared by skill discovery consumers. */
interface SkillInvocationPolicy {
  /** Whether model-facing catalogs and loaders include this skill. */
  readonly modelInvocable: boolean
  /** Whether human-facing command catalogs and loaders include this skill. */
  readonly userInvocable: boolean
}
```

```ts type-equiv
/** Invocation-neutral skill metadata returned by `ctx.skills.list()`. */
interface SkillSummary {
  /** Absolute instruction file path when supplied by the provider; absent for virtual skills. */
  readonly path?: string
  /** Kebab-case identifier used to address the skill. */
  readonly name: string
  /** Short routing description shown by discovery consumers. */
  readonly description: string
  /** Optional extra routing guidance. */
  readonly whenToUse?: string
  /** Resolved model and user invocation controls. */
  readonly invocation: SkillInvocationPolicy
  /** Discovery source that produced this winning skill. */
  readonly source: SkillSource
  /** Provider that owns this skill body. */
  readonly provider: string
  /** Provider-specific base for relative resources. */
  readonly resourceBase?: SkillResourceBase
}
```

`ctx.skills.list()` preserva las cuatro combinaciones de política. `isModelInvocable(skill)` e `isUserInvocable(skill)` leen el campo obligatorio correspondiente. Una skill solo para el modelo fija `{ modelInvocable: true, userInvocable: false }`, una skill solo para el usuario fija `{ modelInvocable: false, userInvocable: true }`, y fijar ambos campos a `false` deja la skill disponible solo mediante llamantes de confianza de `ctx.skills.get()`. El proveedor local lee las claves exactas de frontmatter en kebab-case `disable-model-invocation` y `user-invocable`, da por defecto `true` a los campos omitidos y proyecta cada skill parseada en esta política normalizada.

`SkillCatalogSnapshot` distingue la ausencia autoritativa del fallo transitorio de un proveedor o de un catálogo que siguió cambiando durante el descubrimiento. `skills` contiene los resúmenes ordenados y neutros en invocación recogidos en esa observación; `complete` es true solo cuando cada proveedor registrado completó sin una revisión de catálogo concurrente. Los snapshots incompletos no se cachean, lo que permite a cada consumidor conservar su último catálogo bueno filtrado y reintentar.

```ts type-equiv
/** One catalog observation plus whether discovery completed within a stable catalog revision. */
interface SkillCatalogSnapshot {
  /** Sorted invocation-neutral summaries collected in this observation. */
  readonly skills: SkillSummary[]
  /** Whether every registered provider completed without a concurrent catalog revision. */
  readonly complete: boolean
}
```

`SkillCandidate` es la forma de proveedor a registry. `locator` es estado opaco del proveedor; el registry solo lo almacena y se lo devuelve al `get()` del proveedor ganador.

```ts type-equiv
/** Provider catalog entry used by the registry to merge and later load skills. */
interface SkillCandidate extends SkillSummary {
  /** Lower ranks win duplicate skill names before provider registration order is considered. */
  readonly rank: number
  /** Opaque provider-owned handle passed back to `provider.get()`. */
  readonly locator: unknown
  /** Parsed optional metadata object from provider-specific skill frontmatter. */
  readonly metadata?: Readonly<Record<string, unknown>>
}
```

`SkillDefinition` es el resultado parseado completo devuelto por `ctx.skills.get()` y usado por la tool `skill`. `resourceBase` indica a la tool cómo renderizar la guía de recursos relativos para skills locales, de URL o gestionadas por el proveedor.

```ts type-equiv
/** Optional provider-specific base used by loaded skill bodies to resolve relative resources. */
type SkillResourceBase =
  | { readonly kind: 'directory'; readonly path: string }
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'opaque'; readonly description: string }
```

```ts type-equiv
/** Complete parsed skill definition, including the body loaded by `ctx.skills.get()`. */
interface SkillDefinition extends SkillSummary {
  /** Markdown instruction body after any provider-specific metadata removal. */
  readonly content: string
  /** Parsed optional metadata object from frontmatter. */
  readonly metadata?: Readonly<Record<string, unknown>>
}
```

Las entradas de skill en runtime pueden omitir los controles de invocación y la etiqueta de proveedor. El registry resuelve ambos valores por defecto una vez y luego usa la misma forma de definición completa y el mismo orden de recolección «el primero gana» que los proveedores. El disposer devuelto elimina la contribución e invalida las cachés de descubrimiento.

```ts type-equiv
/** Runtime skill contribution accepted by `ctx.skills.register()`. */
type SkillRegistration = Omit<SkillDefinition, 'invocation' | 'provider'> & {
  /** Invocation controls; omission permits both model and user surfaces. */
  readonly invocation?: SkillInvocationPolicy
  /** Provider label; omission uses the registry-owned runtime provider. */
  readonly provider?: string
}
```

## Búsqueda y configuración

La búsqueda de skills es sensible al cwd porque los proveedores pueden exponer skills locales del espacio de trabajo, y su señal opcional cancela el trabajo del proveedor para el llamante. Las lecturas del registry toman además el ámbito que observa (los consumidores pasan el agent llamante, que es su propia clave de ámbito) mediante `SkillViewOptions`; el registry consume `scope` para la selección de capas, y los proveedores leen solo su contrato `SkillLookupOptions` del mismo objeto de opciones prestado. La cancelación se comprueba antes y después de la selección del catálogo, incluidos los aciertos de caché, y compite tanto con el descubrimiento como con la carga de definiciones completas. Si no se encuentra raíz git, el proveedor local trata el propio cwd suministrado como raíz del proyecto.

Las definiciones completas no se cachean por el registry. Cada `get()` llama al proveedor ganador con el candidato seleccionado, así que el proveedor local relee el cuerpo actual. Una definición cuyo nombre ya no coincide con ese candidato se rechaza e invalida el proveedor exacto para redescubrimiento.

```ts type-equiv
/** Caller context used for cwd-sensitive and abortable provider work. */
interface SkillLookupOptions {
  /** Workspace selector for the current lookup. */
  readonly cwd?: string | undefined
  /** Abort discovery or loading work for the current caller. */
  readonly signal?: AbortSignal | undefined
}
```

```ts type-equiv
/**
 * Registry read options: provider lookup context plus the viewing scope.
 * The registry consumes `scope` to select layers; providers receive the same
 * borrowed options object and read only their {@link SkillLookupOptions}
 * contract from it.
 */
interface SkillViewOptions extends SkillLookupOptions {
  /** Viewing scope (the calling agent); omitted reads the global layer alone. */
  readonly scope?: ScopeKey | undefined
}
```

El registry solo posee su cota de caché de descubrimiento. El proveedor local posee las raíces del sistema de archivos (`dshHome`, `agentsHome`, `customSkillDirs` y los opcionales `bundledSkillDir`/`DSH_BUNDLED_SKILL_DIR`) además de los controles de habilitación, sondeo, estabilidad, symlink y capacidad de proyecto del watcher. El consumidor posee su cota de descripción de catálogo. Los valores por defecto exactos y la validación están en el [catálogo de configuración](../config-catalog.es.md) generado.

```ts type-equiv
/** Skill registry configuration. */
interface Config {
  /** Maximum number of completed cwd/provider catalogs kept in memory. */
  readonly collectCacheMaxEntries?: number
}
```

## Catálogo de sesión y contrato de la tool

`dsh-tool-skill` inyecta el `<system-reminder>` durable de rol user inicial en el primer `agent/pre-step` de una sesión viva que observa una vista completa no vacía. El catálogo contiene solo el `name` ordenado de cada skill y su `description` normalizada y escapada en XML; omite cuerpos, rutas, fuentes, proveedores y pistas de enrutado. El descubrimiento reenvía la señal de aborto del paso a través de `SkillLookupOptions`. `catalogDescriptionMaxLength` es la config del consumidor para la cota de descripción, con valor por defecto `500` y mínimo entero `3`.

Antes de cada paso de modelo posterior, el consumidor aplica la visibilidad exacta de tools y digiere las entradas renderizadas exactas entre las etiquetas `<available_skills>` de un snapshot completo. Deriva la línea base de comparación de las mismas entradas en el mensaje de catálogo visible reconocible más reciente originado por el plugin. Un digest cambiado añade un reemplazo completo durable mediante `agent.inject()`; borrar todas las skills añade un reemplazo vacío explícito. Los snapshots incompletos preservan la última vista buena del modelo. Si la compactación (compaction) oculta todos los mensajes históricos de catálogo, el siguiente snapshot completo restablece el catálogo actual; una vista vacía sin catálogo previo no emite nada. Estos mensajes de catálogo son historia de sesión, no World State.

La tool `skill({ name })` orientada al modelo valida el nombre kebab-case, encuentra el resumen en el catálogo neutro en invocación, lo rechaza antes de cargar salvo que `isModelInvocable` permita el acceso, luego relee la definición completa para el cwd del agent llamante y vuelve a comprobar la política antes de devolver el contenido. Informa de una skill no resuelta como desconocida o ya no disponible y devuelve un resultado de tool que contiene `<skill_content name="...">`, `<skill_resources>` y `<skill_instructions>`. `resourceBase` resuelve scripts, referencias y assets explícitamente referenciados solo según se necesita; el resultado cargado no enumera un directorio de skill. Por tanto, las ediciones solo del cuerpo cambian las llamadas a tool posteriores sin producir mensajes de catálogo ni reescribir resultados de tool anteriores.

## Catálogo de sesión del navegador

`SkillListRequest` direcciona una sesión por `sessionId`; `SkillListValue` devuelve las entradas invocables por el usuario con nombre, descripción, guía de uso opcional y disponibilidad de invocación por el modelo. `SessionSkillCatalog` lee el cwd de la sesión y el preset registrado sin activar un agent. Un agent vivo puede suministrar su registry con ámbito, mientras que una sesión fría usa el ámbito permanente del preset.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsessionskillcatalog--sessionskillcatalog"></a>

### `ctx.sessionSkillCatalog` — `SessionSkillCatalog`

Host service backing `ctx.remote.skills` without activating a cold Agent.

```ts cordis-catalog
/**
 * List the user-invocable skills visible to one Session composition.
 * @param request - Session identity whose cwd and preset select the catalog view.
 * @param signal - caller lifetime carried by the Remote transport; admitted catalog reads retain their existing completion semantics.
 * @returns user-invocable skill metadata without loading skill bodies.
 * @throws RemoteError when the Session cannot be inspected or no registry can serve it.
 */
@Remote async list(request: SkillListRequest, signal: AbortSignal): Promise<SkillListValue>
```

Source: [`packages/api/session-controller/src/skill-catalog.ts`](../../packages/api/session-controller/src/skill-catalog.ts)

<a id="ctxskills--skillregistry"></a>

### `ctx.skills` — `SkillRegistry`

Layered registry of skill providers, the host+per-scope shape the tools registry established. A registration files into the layer of its calling context's scope (scopeOf): host rows and repository plugins land in the global layer, while a plugin mounted by an agent preset's standing composition lands in that preset's layer. A read merges the global layer with the viewing scope's chain — the nearest layer's entry wins a duplicate name outright, and the rank order decides duplicates only within one layer. It exposes sorted invocation-neutral summaries and loads full skill bodies on demand.

```ts cordis-catalog
/**
 * Register a borrowed same-process provider synchronously during plugin
 * apply, into the calling context's layer: a scoped context (an agent
 * preset's standing mount) registers for that scope alone, an unscoped
 * context registers globally. Duplicate names within one layer and reserved
 * names throw; remote initialization belongs in `list()`. Fiber disposal
 * unregisters the provider and invalidates catalog caches.
 * @param create - synchronous factory receiving this registration's lifecycle and invalidation control.
 * @returns the exact Cordis effect disposer that unregisters this provider;
 *   composite effects may yield it directly to preserve teardown ordering.
 */
registerProvider(create: (control: SkillProviderControl) => SkillProvider): () => void

/**
 * Register a borrowed readonly runtime skill into the calling context's
 * layer. Project entries outrank runtime entries, which outrank user
 * entries, within one layer. Same-name runtime entries in one layer are
 * first-wins; a duplicate logs a warning and receives a no-op disposer so
 * it cannot remove the winner.
 * @param skill - the skill definition input; omitted invocation and provider fields receive defaults.
 * @returns the exact Cordis effect disposer, preserving composite teardown order and invalidating caches.
 */
register(skill: SkillRegistration): () => void

/**
 * List invocation-neutral skill summaries for a workspace. Consumers apply
 * model or user invocation policy at their operational boundary. Lookup
 * options and provider candidates are readonly same-process values borrowed
 * throughout discovery.
 * @param options - view options; `scope` selects the viewing agent's layers, `cwd` selects project roots, and `signal` cancels discovery.
 * @returns all sorted winning summaries.
 */
async list(options: SkillViewOptions = {}): Promise<SkillSummary[]>

/**
 * Observe the current invocation-neutral catalog and whether discovery completed within a stable revision.
 * Incomplete observations are never cached, allowing consumers to retain last-good state and
 * retry on their next request boundary.
 * @param options - view options; `scope` selects the viewing agent's layers, `cwd` selects project roots, and `signal` cancels discovery.
 * @returns sorted summaries plus discovery-completeness state.
 */
async snapshot(options: SkillViewOptions = {}): Promise<SkillCatalogSnapshot>

/**
 * Load and validate the winning candidate, passing its opaque discovery locator back to the
 * provider. Cancellation is rechecked after selection, including cache hits, and raced against
 * loading so an uncooperative provider cannot hang the caller.
 * @param name - kebab-case skill name.
 * @param options - view options; `scope` selects the viewing agent's layers,
 *   `cwd` selects workspace-sensitive skills, and `signal` cancels work.
 * @returns the full skill, including body content, or `undefined`.
 */
async get(name: string, options: SkillViewOptions = {}): Promise<SkillDefinition | undefined>
```

Source: [`packages/skill/skill/src/index.ts`](../../packages/skill/skill/src/index.ts)

<a id="skills-events"></a>

### `skills/*` events

<a id="skillschange--emit"></a>

#### `skills/change` — emit

A skill provider, runtime contribution, or provider-backed catalog may have changed. This is an unfiltered invalidation notification; consumers refetch the catalog for their own lookup options. Listener failures are contained and cannot veto the registry mutation.

```ts cordis-catalog
/**
 * A skill provider, runtime contribution, or provider-backed catalog may
 * have changed. This is an unfiltered invalidation notification; consumers
 * refetch the catalog for their own lookup options. Listener failures are
 * contained and cannot veto the registry mutation.
 * @mode emit
 */
'skills/change'(): void
```

Source: [`packages/skill/skill/src/index.ts`](../../packages/skill/skill/src/index.ts)
<!-- END GENERATED cordis-surface -->
