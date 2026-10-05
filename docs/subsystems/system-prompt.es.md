# Ensamblado del prompt del sistema

[English](system-prompt.md) | Español

El [paquete system-prompt](../../packages/core/system-prompt) posee los datos intercambiados entre los contribuidores de prompts y una llamada de ensamblado. El [README](../../packages/core/system-prompt/README.md) del paquete documenta el comportamiento de registro, ordenación, ámbito y renderizado; esta página registra los tipos exactos compartidos entre paquetes que los plugins implementan o pasan.

Fuente: [`packages/core/system-prompt/src/index.ts`](../../packages/core/system-prompt/src/index.ts).

## Contexto de ensamblado

`AssembleContext` identifica la capa de ámbito que resuelve un ensamblado y puede llevar la señal de control explícita de esa solicitud. Es extensible por fusión: `dsh-agent` añade el campo opcional `agent` en vivo, y `assembleContextFor(agent, signal)` establece los campos explícitos a la vez. Un ensamblado básico no tiene ámbito ni señal.

```ts type-equiv
/** Merge-extensible context for one prompt assembly. */
interface AssembleContext {
  /**
   * Scope whose providers and waterfall listeners participate. When absent,
   * only global providers and subject-less listeners participate.
   */
  scope?: ScopeKey
  /** Explicit control signal for the turn that requested this assembly, when any. */
  signal?: AbortSignal
}
```

## Resultado del proveedor de tools

`ToolProviderResult.schemas` es el conjunto visible para el modelo del ensamblado actual. `knownNames` es el universo de nombres previo a la restricción que el proveedor usa para distinguir un error tipográfico en un nombre configurado de un tool conocido que está oculto deliberadamente en este ámbito.

```ts type-equiv
/** Tool schemas visible in one assembly and their pre-restriction name set. */
interface ToolProviderResult {
  /** The schemas this provider contributes to THIS assembly. */
  readonly schemas: readonly ToolSchema[]
  /** The pre-restriction name universe for config validation (defaults to `schemas`' names). */
  readonly knownNames?: readonly string[]
}
```

## Secciones del prompt

Los símbolos exportados `PERSONA_PREFIX_SECTION` (`deployment:persona-prefix`) y `PERSONA_SUFFIX_SECTION` (`deployment:persona-suffix`) nombran los slots compartidos por la configuración global y las contribuciones con ámbito. Sus entradas `PromptSectionOrderName` son `DEPLOYMENT_PERSONA_PREFIX` y `DEPLOYMENT_PERSONA_SUFFIX`; el [README del paquete](../../packages/core/system-prompt/README.md#configure-the-prompt) posee su colocación y la configuración de sus plantillas.

`PromptSection` es un contrato de registro de solo lectura dentro del mismo proceso. Su texto puede ser estático o resolverse a partir del contexto de ensamblado actual. Las secciones se ordenan por orden ascendente y luego por nombre en unidades de código; los contribuidores del repositorio resuelven la asignación nombrada propiedad del servicio mediante `getSectionOrder()`. Los contribuidores de contexto de runtime resuelven su asignación independiente mediante `getContextOrder()`. Una sección `complete` efectiva se convierte en la única sección del prompt tras el ensamblado cooperativo. agent-loop renderiza las secciones ensambladas con `renderPrompt` y confirma el texto como un nodo de superficie `system/message`: se anexa como nodo de superficie 0 en el primer paso y luego se reemplaza en el mismo lugar cuando cambia el texto renderizado o, cuando la llamada preparada declara `systemPromptUpdate: 'in-history'`, se anexa tras el historial en caché para las actualizaciones no vacías de una serie continua, de modo que el prompt llega al modelo como un mensaje del historial derivado y no como un campo de la solicitud ([decisión](../../.agents/notes/implemented/architecture/2026-09-02-system-prompt-as-surface-node.md); [regla de decisión](../../packages/core/agent-loop/README.md#understand-the-implementation)).

```ts type-equiv
/** One contributed section of the system prompt (registry input). */
interface PromptSection {
  /** Unique name — a duplicate registration throws (see {@link SystemPrompt.section}). */
  readonly name: string
  /**
   * Sections are concatenated in ascending order. Equal orders use code-unit
   * name order.
   */
  readonly order: number
  /**
   * Static text or a provider evaluated at each assembly with that assembly's
   * {@link AssembleContext}. The text may reference `{{variable}}`s — they are
   * interpolated later, by {@link renderPrompt}, unless `interpolate` is false.
   */
  readonly text: string | ((context: AssembleContext) => string)
  /** Whether to interpolate prompt variables. Defaults to true; false preserves literal text. */
  readonly interpolate?: boolean
  /**
   * Treat this contribution as the complete system prompt. Assembly still
   * runs the cooperative waterfall so tools, contexts, and variables can be
   * resolved, then restores this exact section as the sole prompt section.
   * More than one effective complete section makes assembly fail.
   */
  readonly complete?: boolean
}
```

## Contexto dinámico del prompt

`PromptContext` es la contraparte segura para la caché de `PromptSection`. El ensamblado resuelve y ordena estas contribuciones, mientras que agent-loop registra su snapshot actual completo tras el historial de modelo retenido solo cuando cambió o la compactación (compaction) lo eliminó.

```ts type-equiv
/** Dynamic model context materialized as a durable user-role snapshot. */
interface PromptContext {
  /** Unique name — a duplicate registration throws (see {@link SystemPrompt.context}). */
  readonly name: string
  /** Contexts are joined in ascending order. */
  readonly order: number
  /** Static text or a provider evaluated for each assembly. Empty text contributes nothing. */
  readonly text: string | ((context: AssembleContext) => string)
}
```

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsystemprompt--systemprompt"></a>

### `ctx.systemPrompt` — `SystemPrompt`

Registry service for the prompt inputs assembled before each model step.

```ts cordis-catalog
/**
 * Register an ordered prompt section in the calling context's scope. A scoped
 * section shadows a global section with the same name; duplicates within one
 * layer and non-finite orders throw. Registration and disposal emit
 * `system-prompt/change`.
 * @param section - the section to register.
 * @returns the exact Cordis effect disposer.
 */
section(section: PromptSection): () => void

/**
 * Resolve the centrally owned placement of a repository prompt section.
 * @param name - stable section placement name.
 * @returns the section's numeric sort order.
 */
getSectionOrder(name: PromptSectionOrderName): number

/**
 * Resolve the centrally owned placement of a repository runtime context.
 * @param name - stable context placement name.
 * @returns the context's numeric sort order.
 */
getContextOrder(name: PromptContextOrderName): number

/**
 * Register ordered dynamic context in the calling context's scope. Scoped
 * entries shadow global entries with the same name.
 * @param context - the context contribution to register.
 * @returns the exact Cordis effect disposer.
 */
context(context: PromptContext): () => void

/**
 * Suppress every dynamic runtime-context contribution in the calling
 * context's scope without changing the services that own or enforce those
 * facts. Multiple suppressors remain independently disposable.
 * @returns the exact Cordis effect disposer.
 */
suppressRuntimeContext(): () => void

/**
 * Register a tool-schema provider in the calling context's scope. Global and
 * matching scoped providers both contribute; returning the reserved
 * {@link TOOL_ORDER_REST} name makes assembly fail.
 * @param provider - evaluated for each assembly with its context.
 * @returns the exact Cordis effect disposer.
 */
tools(provider: (context: AssembleContext) => ToolProviderResult): () => void

/**
 * Register a prompt variable in the calling context's scope. Scoped values
 * shadow globals; invalid or duplicate names throw. A provider may return
 * `undefined`, but rendering a section that references that value then fails.
 * @param name - the `[a-z][a-z0-9_]*` reference name.
 * @param provider - evaluated for each assembly.
 * @returns the exact Cordis effect disposer.
 */
variable(name: string, provider: (context: AssembleContext) => string | undefined): () => void

/**
 * Assemble global and scoped providers, detach tool parameters, apply
 * canonical ordering, then run the assembly waterfall. Scoped sections and
 * variables shadow globals. The returned waterfall value is authoritative
 * except that an effective complete section is restored afterwards as the
 * sole prompt section.
 * @param context - the optional scope and plugin-defined assembly fields.
 * @returns the post-waterfall assembly with any complete prompt enforced.
 */
async assemble(context: AssembleContext = {}): Promise<PromptAssembly>
```

Source: [`packages/core/system-prompt/src/index.ts`](../../packages/core/system-prompt/src/index.ts)

<a id="system-prompt-events"></a>

### `system-prompt/*` events

<a id="system-promptassemble--waterfall"></a>

#### `system-prompt/assemble` — waterfall

Expert waterfall over the assembled sections, contexts, tools, and variables. Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): scoped listeners receive only that scope's assemblies. The returned value is authoritative. A supplied signal controls only this explicit assembly request and must not be retained to control later turns. A registered complete section is restored after this waterfall, so listeners cannot add to or replace that scope's system prompt.

```ts cordis-catalog
/**
 * Expert waterfall over the assembled sections, contexts, tools, and variables.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): scoped listeners
 * receive only that scope's assemblies. The returned value is authoritative.
 * A supplied signal controls only this explicit assembly request and must not
 * be retained to control later turns. A registered complete section is
 * restored after this waterfall, so listeners cannot add to or replace
 * that scope's system prompt.
 * @param assembly - the mutable assembly built from registered providers.
 * @param context - the caller's per-assembly context.
 * @mode waterfall
 */
'system-prompt/assemble'(this: Scoped<SystemPrompt>, assembly: PromptAssembly, context: AssembleContext, next: () => Promise<PromptAssembly>): Promise<PromptAssembly>
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/system-prompt/src/index.ts`](../../packages/core/system-prompt/src/index.ts)

<a id="system-promptchange--emit"></a>

#### `system-prompt/change` — emit

Emitted when any prompt provider changes. This registry notification is unfiltered because a global change affects every scope.

```ts cordis-catalog
/**
 * Emitted when any prompt provider changes. This registry notification is
 * unfiltered because a global change affects every scope.
 * @mode emit
 */
'system-prompt/change'(): void
```

Source: [`packages/core/system-prompt/src/index.ts`](../../packages/core/system-prompt/src/index.ts)
<!-- END GENERATED cordis-surface -->
