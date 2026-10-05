# Flujo de trabajo

[English](workflow.md) | Español

El seam workflow permite a un agent ejecutar un SCRIPT de orquestación escrito por el modelo que inicia subagents. Al igual que [subagent](subagent.es.md), es **una capacidad opcional**, no parte del agent loop (bucle de agent), así que sus tipos y operaciones viven aquí y no en [core.md](core.es.md). Como bash, permite que UNA implementación de motor por contexto provea `ctx.workflowEngine`; no hay registry de proveedores con nombre (un segundo motor reemplaza al primero mediante la configuración de plugins en lugar de ejecutarse a su lado).

Service Definition: [dsh-workflow](../../packages/workflow/workflow) (`ctx.workflowEngine` y el vocabulario siguiente). [dsh-workflow-ptc](../../packages/workflow/workflow-ptc) ejecuta la VM y los helpers a través del runtime de procesos PTC de Node compartido, bajo la política de archivos de la sesión que llama. Los consumidores son [dsh-tool-workflow](../../packages/workflow/tool-workflow) y el opt-in [dsh-tool-ralph](../../packages/workflow/tool-ralph). [Workflow sandbox reuse](../../.agents/notes/implemented/architecture/2026-09-13-workflow-ptc-sandbox-reuse.md) es dueño de las decisiones de ejecución; la [decisión de dynamic-workflows](../../.agents/notes/implemented/feature/2026-07-05-dynamic-workflows.md) es dueña de la semántica del script.

Fuentes: vocabulario seguro para navegador en [`packages/workflow/workflow/src/types.ts`](../../packages/workflow/workflow/src/types.ts), solicitud de Host e identificadores de ejecución en vivo en [`runtime-types.ts`](../../packages/workflow/workflow/src/runtime-types.ts).

## La solicitud de inicio

Lo que un llamante pide al iniciar una ejecución. El tool workflow ordinario construye esto a partir de la llamada `{ script, meta, args }` del modelo más el agent que llama; los consumidores especializados también pueden seleccionar un `subagentProvider` para todo el motor y bajar `maxTotalAgents` para la ejecución, pero el script no puede observar ni reemplazar ninguna de las dos políticas. `meta` y `args` son DATOS JSON planos (el motor valida `meta` contra su schema y rechaza de forma ruidosa ANTES de que nada se ejecute: nunca se evalúa texto del script para obtenerlo). `parent` es OBLIGATORIO: todo hijo que el script inicia se le atribuye, y cwd, linaje y profundidad pasan por el [seam subagent](subagent.es.md).

```ts type-equiv
/**
 * What a caller asks for when starting a workflow run. `meta` and `args` are
 * plain JSON data by the seam contract. `parent` is required because every
 * `agent()` spawned by the script is attributed to that live Agent.
 */
interface WorkflowStartRequest {
  /** The plain-JS script body (top-level await allowed; ends with `return <json-value>`). */
  script: string
  /** The workflow's identity block, as plain JSON data (shape-validated by the engine). */
  meta: WorkflowMeta
  /** Optional input exposed verbatim to the script as the `args` global. */
  args?: unknown
  /** Optional engine-wide child-provider override for this run. */
  subagentProvider?: string
  /** Optional per-run total-child ceiling. */
  maxTotalAgents?: number
  /** The agent on whose behalf the run executes (parent of every child). */
  parent: Agent
  /** Cancels the run when aborted. */
  signal?: AbortSignal
}
```

## La identidad del workflow: `WorkflowMeta`

El bloque de identidad que viaja como datos en la solicitud de inicio (el parámetro `meta` del tool; el vocabulario de campos coincide con el bloque meta de dynamic-workflows de Claude Code). `phases` es solo vocabulario de progreso: las llamadas `phase()` coinciden títulos para los observadores; no se implica ninguna estructura de ejecución.

```ts type-equiv
/**
 * The script's identity block, provided as plain JSON data alongside the
 * script body (the model-facing tool carries it as its `meta` parameter) and
 * validated by the engine before the body runs. `name`/`description` are
 * required; the rest is optional annotation. The field vocabulary matches the
 * Claude Code dynamic-workflows meta block.
 */
interface WorkflowMeta {
  /** Short kebab-case workflow name (display + persistence key). */
  name: string
  /** One-line description of what the workflow does. */
  description: string
  /** Optional guidance on when this workflow applies (shown in listings). */
  whenToUse?: string
  /** Optional phase declarations matched by `phase()` calls. */
  phases?: WorkflowPhase[]
}
```

## El resultado terminal: `WorkflowResult`

El resultado de una ejecución, resuelto por `WorkflowRun.result`. `value` es el valor de retorno materializado del script, datos JSON planos del realm del host (`null` cuando el script no devolvió nada), con significado solo para `completed`. `stopReason` es una unión CERRADA (propiedad del motor; los consumidores pueden agotarla): `completed` | `cancelled` | `error`. Una razón distinta de `completed` lleva el fallo en `error`, y el consumidor la mapea a un resultado de tool `isError` en lugar de informar salida parcial como éxito.

```ts type-equiv
/**
 * The outcome resolved by a live workflow run. `value` is
 * the script's materialized return value (plain host-realm JSON data; `null`
 * when the script returned `undefined`) — meaningful only for `completed`.
 * A non-`completed` reason carries the failure in `error`; the consumer maps
 * it to an `isError` tool result rather than reporting partial output.
 */
interface WorkflowResult {
  /** The script's return value (host JSON data; `null` for no return). */
  value: unknown
  /** Why the run settled. */
  stopReason: WorkflowStopReason
  /** The failure message (present iff `stopReason` is not `completed`). */
  error?: string
  /**
   * How many `agent()` calls the run accepted over its whole lifetime. On a
   * graceful settlement this is the script-side count (calls still queued for
   * a concurrency slot included); on a termination path (cancellation or
   * process failure) it degrades to the host-observed count — calls queued
   * inside a terminated script are unknowable then.
   */
  agentsStarted: number
}
```

## Una ejecución en vivo: `WorkflowRun`

El consumidor espera `result`, puede cancelar durante la ejecución y debe hacer dispose en todos los caminos. `result` nunca rechaza: un fallo del script resuelve con `stopReason: 'error'`, y una cancelación con `'cancelled'`. El motor PTC no tiene un plazo de tiempo total; aborta inmediatamente el proceso gestionado cuando se cancela. El dispose espera la limpieza del proceso y de los hijos según sus contratos de proveedor, sin un plazo de limpieza de workflow independiente.

```ts type-equiv
/**
 * Holder-owned live workflow. `result` never rejects; consumers may cancel
 * and must call idempotent `dispose()` to await script and child quiescence.
 */
interface WorkflowRun {
  readonly id: WorkflowRunId
  /** The validated meta block available before the script body runs. */
  readonly meta: WorkflowMeta
  readonly result: Promise<WorkflowResult>
  /** Cancel the run and its children. */
  cancel(reason?: string): void
  /** Cancel if needed and await script and child cleanup. */
  dispose(): Promise<void>
}
```

## Disciplina de fallos: `WorkflowError.fatal`

El uso incorrecto de un hook dentro de un script (argumentos inválidos, opciones de `agent()` desconocidas o diferidas, un schema fuera del [subconjunto de salida estructurada](../../packages/core/tools/README.md), un límite alcanzado, un fallo de inicio del seam, una cancelación) lanza un `WorkflowError` con `fatal: true`. Los combinadores `parallel()`/`pipeline()` RELANZAN los errores fatales en lugar de mapear el elemento a `null`: una opción mal escrita debe matar el script de forma ruidosa, nunca disolverse en algo que se lea como un fallo ordinario de hijo. El `null` por elemento se reserva para fallos de ejecución de hijo (una razón de parada distinta de `completed`) y errores ordinarios de script dentro de la etapa.

## Eventos

Los eventos `workflow/*` (`workflow/start`, `workflow/phase`, `workflow/log`, `workflow/agent-start`, `workflow/agent-end`, `workflow/end`; véase el [catálogo de eventos](#cordis-surface)) son emisiones **de solo observación** que transportan SNAPSHOTS DE DATOS: cada payload empieza con `WorkflowRunInfo` (id + meta), nunca el `WorkflowRun` en vivo, así que un suscriptor no puede obtener `cancel`/`dispose`, y `workflow/end` omite deliberadamente el valor del resultado (un listener que observa resultados no debe recibir un alias mutable del resultado del llamante). Cada emisión está contenida por listener: un suscriptor que lanza se registra en el log, nunca se propaga, y no puede dejar sin atender a los listeners registrados después; cada listener recibe su propio clon del payload, así que mutarlo no corrompe ni el motor ni a otros listeners; la contención refleja la de `subagent/start`/`subagent/end`.

## Registros durables de Chat

El consumidor `dsh-tool-workflow` de nivel superior proyecta hechos de visualización en la sesión padre que llama sin cambiar la propiedad de la ejecución. Escribe `tool-workflow/run-start` tras aceptarse una ejecución, empareja inicio y fin de miembro por `runId + seq`, y escribe `tool-workflow/run-end` solo cuando el resultado es conocido y el dispose alcanza la quiescencia. Las llamadas de transporte anidadas no escriben ningún registro. El primer fallo de append deshabilita las escrituras posteriores de esa ejecución, así que el log permanece vacío o como un prefijo continuo legal y el resultado del tool no cambia.

`dsh-tool-workflow/invariant` valida el mismo protocolo antes del commit en vivo y cuando se carga una sesión: un inicio por ejecución, secuencias de miembro positivas y únicas, finales de miembro emparejados, ninguna ejecución que termine con miembros abiertos y ninguna actualización tras el final de la ejecución. Un final de miembro o de ejecución ausente en la cola del log es evidencia válida de interrupción, no corrupción.

`dsh-client-ui-workflow-run` pliega los cuatro eventos a través del motor de Conversation Node en un único nodo de Chat `workflow-run` anclado en la secuencia de inicio de la ejecución, tras el nodo del tool workflow original. Los grupos de fase provienen solo de inicios de miembro reales y preservan las cadenas exactas, incluida la distinción entre una fase omitida y `''`. Las Locations cerradas convierten los hechos terminales ausentes en presentación de interrumpido. El [README del paquete UI](../../packages/client/ui-workflow-run/README.md) es dueño del comportamiento de disclosure, estado y navegación local dentro del mismo padre.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxworkflowengine--workflowengine-abstract-seam"></a>

### `ctx.workflowEngine` — `WorkflowEngine` (abstract seam)

Workflow Service Definition contract. Invalid requests throw before publication; a live run is holder-owned, its result never rejects, and disposal waits for script and child cleanup. Lifecycle listener failures are contained, and `workflow/end` fires exactly once as the result settles.

```ts cordis-catalog
/**
 * Parse and execute a workflow script.
 * @param request - the script, its `args`, the parent agent, and an
 *   optional cancel signal.
 * @returns the live run; its `result` resolves when the script settles.
 */
abstract start(request: WorkflowStartRequest): WorkflowRun
```

Source: [`packages/workflow/workflow/src/index.ts`](../../packages/workflow/workflow/src/index.ts)

<a id="workflow-events"></a>

### `workflow/*` events

<a id="workflowagent-end--emit"></a>

#### `workflow/agent-end` — emit

One `agent()` call settled (clean result, child failure, or run cancellation). Paired with Events['workflow/agent-start'] by `agent.seq`, exactly once per started call on every stop path — on an engine termination path the end is engine-synthesized with outcome `'cancelled'`.

```ts cordis-catalog
/**
 * One `agent()` call settled (clean result, child failure, or run
 * cancellation). Paired with {@link Events['workflow/agent-start']} by
 * `agent.seq`, exactly once per started call on every stop path — on an
 * engine termination path the end is
 * engine-synthesized with outcome `'cancelled'`.
 * @param info - the run's identity snapshot.
 * @param agent - the call identity plus its outcome.
 * @mode emit
 */
'workflow/agent-end'(info: WorkflowRunInfo, agent: WorkflowAgentEndInfo): void
```

Source: [`packages/workflow/workflow/src/index.ts`](../../packages/workflow/workflow/src/index.ts)

<a id="workflowagent-start--emit"></a>

#### `workflow/agent-start` — emit

One `agent()` call established a published child run. Paired with Events['workflow/agent-end'] by `agent.seq`. A call that never receives a published run from the provider emits neither event in this pair.

```ts cordis-catalog
/**
 * One `agent()` call established a published child run. Paired with
 * {@link Events['workflow/agent-end']} by `agent.seq`. A call that never
 * receives a published run from the provider emits neither
 * event in this pair.
 * @param info - the run's identity snapshot.
 * @param agent - the call's sequence number, label, phase, and child id.
 * @mode emit
 */
'workflow/agent-start'(info: WorkflowRunInfo, agent: WorkflowAgentInfo): void
```

Source: [`packages/workflow/workflow/src/index.ts`](../../packages/workflow/workflow/src/index.ts)

<a id="workflowend--emit"></a>

#### `workflow/end` — emit

A workflow run settled (any stop reason). Fired when WorkflowRun.result resolves. Paired with Events['workflow/start'].

```ts cordis-catalog
/**
 * A workflow run settled (any stop reason). Fired when
 * {@link WorkflowRun.result} resolves. Paired with
 * {@link Events['workflow/start']}.
 * @param info - the run's identity snapshot.
 * @param result - the outcome data (stop reason, error, agent count) —
 *   deliberately WITHOUT the result value (see {@link WorkflowResultInfo}).
 * @mode emit
 */
'workflow/end'(info: WorkflowRunInfo, result: WorkflowResultInfo): void
```

Source: [`packages/workflow/workflow/src/index.ts`](../../packages/workflow/workflow/src/index.ts)

<a id="workflowlog--emit"></a>

#### `workflow/log` — emit

The script emitted a narration line (a `log(message)` call).

```ts cordis-catalog
/**
 * The script emitted a narration line (a `log(message)` call).
 * @param info - the run's identity snapshot.
 * @param message - the logged message, verbatim.
 * @mode emit
 */
'workflow/log'(info: WorkflowRunInfo, message: string): void
```

Source: [`packages/workflow/workflow/src/index.ts`](../../packages/workflow/workflow/src/index.ts)

<a id="workflowphase--emit"></a>

#### `workflow/phase` — emit

The script entered a phase (a `phase(title)` call) — progress grouping for observers; no execution semantics.

```ts cordis-catalog
/**
 * The script entered a phase (a `phase(title)` call) — progress grouping
 * for observers; no execution semantics.
 * @param info - the run's identity snapshot.
 * @param title - the phase title, verbatim.
 * @mode emit
 */
'workflow/phase'(info: WorkflowRunInfo, title: string): void
```

Source: [`packages/workflow/workflow/src/index.ts`](../../packages/workflow/workflow/src/index.ts)

<a id="workflowstart--emit"></a>

#### `workflow/start` — emit

A workflow run started — the script's meta block validated, the body about to execute. Paired with Events['workflow/end'].

```ts cordis-catalog
/**
 * A workflow run started — the script's meta block validated, the body
 * about to execute. Paired with {@link Events['workflow/end']}.
 * @param info - the run's identity snapshot (id + meta).
 * @mode emit
 */
'workflow/start'(info: WorkflowRunInfo): void
```

Source: [`packages/workflow/workflow/src/index.ts`](../../packages/workflow/workflow/src/index.ts)
<!-- END GENERATED cordis-surface -->
