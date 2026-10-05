# Core

[English](core.md) | Español

El subsistema **core** es [`packages/core`](../../packages/core/README.md): los paquetes que arranca toda composición — el registro de sesión de origen de eventos, el ensamblado del prompt del sistema, el registry de tools, los tipos de agent y el bucle concreto que los impulsa. Esta página explica lo que declara el par `agent`/`agent-loop` (cómo se crea un agent y quién lo posee, y los contratos de entrega, cancelación e interceptación del handle `Agent`), más los dos patrones de tipos que sigue todo subsistema. Las páginas dedicadas del grupo y el resto de la carpeta están indexadas en el [README de subsistemas](README.es.md).

## La espina dorsal, paquete a paquete

Un turno fluye por los seis paquetes en un solo bucle: el driver de [`agent-loop`](../../packages/core/agent-loop) reclama un prompt encolado, abre un turno en el [registro de sesión](session.es.md) (`ctx.sessions`), ensambla el prefijo de la solicitud a través de [system-prompt](system-prompt.es.md) (`ctx.systemPrompt`) y deriva el historial del registro, transmite la respuesta del modelo en flujo a través del [seam de LLM (modelo de lenguaje grande)](llm-streaming.es.md), despacha las llamadas a tool a través del [registry de tools](tools.es.md) (`ctx.tools`), y anexa cada hecho visible para el modelo de vuelta al registro antes de que el siguiente paso derive de él. El vocabulario de conversación que el bucle mueve (`Message`, `ContentBlock`, `StreamChunk`, la solicitud al modelo) lo declara [`packages/llm`](../../packages/llm/README.md) y está documentado en [llm-streaming.md](llm-streaming.es.md).

| Paquete | Posee | Página |
|---|---|---|
| `session/` | El registro `SessionEvent` de solo anexado y el almacén en memoria: la fuente de verdad (`ctx.sessions`) | [session.md](session.es.md) |
| `system-prompt/` | Ensamblado de secciones de prompt y schemas de tool (`ctx.systemPrompt`) | [system-prompt.md](system-prompt.es.md) |
| `tools/` | El registry de tools con ámbito y el pipeline de ejecución protegido (`ctx.tools`) | [tools.md](tools.es.md) |
| `agent/` | La interfaz `Agent`, el registry en vivo, el ámbito de iniciador y el vocabulario de eventos `agent/*` (`ctx.agents`) | esta página |
| `agent-loop/` | El driver concreto que implementa el contrato público `Agent` (`ctx.agentLoop`) | esta página |
| `scope/` | La primitiva de registro con ámbito sobre la que los registries y el bucle construyen el ámbito por agent | [scope.md](scope.es.md) |

`scope/` es el único paquete que no es servicio: una biblioteca sin dependencias (`createScope`/`scopeOf`/`scopeTarget`) que se sitúa por debajo de `session/` y `system-prompt/` en el grafo de módulos precisamente para que puedan consumirla sin ciclo. `agent-loop` es la única implementación concreta del contrato público `Agent` y vive aquí porque es el bucle de producto por defecto del harness; ejecuta cada driver dentro de `ctx.agents.withInitiator()`. Los plugins de extensión dependen de `agent`, incluso cuando necesitan el Agent iniciador, y nunca de `agent-loop` directamente, de modo que el bucle sigue siendo intercambiable. [`dsh-base`](../../packages/bundle/base/README.md) es la composición de producto por defecto, mientras que [`dsh-sdk-minimal`](../../packages/bundle/sdk-minimal/README.md) declara un árbol independiente más pequeño.

<a id="creation-and-ownership"></a>

## Creación y propiedad

Los consumidores crean agents a través de `ctx.agents` (`create()` construye una sesión y un agent nuevos bajo un `SessionId` suministrado por el llamante, `resume()` carga primero una sesión persistida) o declarativamente a través de las entradas de configuración del bucle. La creación programática devuelve el handle del propietario:

Fuente: [`packages/core/agent/src/index.ts`](../../packages/core/agent/src/index.ts)

```ts type-equiv
/**
 * An owned agent plus its disposer, returned by {@link AgentRegistry.create} /
 * {@link AgentRegistry.resume}. The disposer is a CAPABILITY: among consumers,
 * only the holder can tear this agent down. The registered factory provider is
 * also a structural owner because the scoped agent depends on that provider's
 * service API; provider unload stops and drains every live handle it made.
 * `dispose()` stops the loop, awaits its exit, unregisters the agent, removes
 * its session from the store, and finally unwinds its scoped world.
 *
 * `ctx.agents.get(id)` still returns a bare {@link Agent} — the handle is
 * exposed only to the consumer owner that created it; the structural provider
 * reaches the same teardown internally. Config-created agents (the loop's own
 * startup) are owned by the loop fiber and never need a handle.
 */
interface AgentHandle {
  agent: Agent
  dispose(): Promise<void>
}
```

`CreateAgentOptions` porta la identidad compartida y todo lo que un agent nuevo necesita antes de la publicación: un `parentAgent` en vivo opcional, metadatos de sesión (`meta`: `cwd` validado, linaje de fork, la marca `isSeeded`, la clasificación de origen, la profundidad de delegación y `agentPreset`), el corte exacto del fork en el campo hermano `inheritedEventCount`, un prefijo de reproducción `seed` opcional, `AgentOptions` por agent, una `signal` de cancelación solo de creación y `setup`. `ResumeAgentOptions` es la contraparte de identidad persistida: `resumeSessionId`, `parentAgent`, `agentOptions`, `signal` y `setup`. El callback `setup` (`AgentSetup`) recibe `(agentCtx, agent)` mientras ambos ids aún no están publicados: el context posee los registros con ámbito, mientras que el Agent explícito suministra la Session hija exacta sin una propiedad inversa en el Context. Todo lo registrado a través de `agentCtx` existe antes de `agent/created` y del primer ensamblado del prompt. Setup puede devolver un commit síncrono que se invoca inmediatamente antes de la publicación; un rechazo de setup, un throw del commit o el dispose del propietario revierten la transacción sin publicar ninguno de los ids.

`AgentFactory` es la interfaz de creación detrás del registry: el bucle registra su factoría vía `ctx.agents.setFactory()`, de modo que los consumidores usan `ctx.agents` sin depender del paquete del bucle concreto. Un creador de hijos en runtime establece `options.parentAgent`; el registry pasa las opciones y el Context del llamante a la factoría sin derivar uno del otro. Las firmas exactas de `create`/`resume` y los contratos de reversión están en la [sección generada](#ctxagents--agentregistry) de abajo.

<a id="the-agent-handle"></a>

## El handle del agent

`Agent` es la superficie contra la que programa todo plugin (UI, hooks, orquestadores); `ctx.agents.get(id)` la devuelve, y el [ámbito de iniciador](#initiating-agent) la porta. La implementación concreta es interna al paquete dsh-agent-loop; nada fuera del bucle depende de ella. El método unificado `send` expone directamente el enrutado de destino y despertar; `followup`, `steer` e `inject` son alias de preset fijo.

Fuente: [`packages/core/agent/src/types.ts`](../../packages/core/agent/src/types.ts)

```ts type-equiv
/** Public live-agent handle; the runtime face augments its live capabilities. */
interface Agent {
  /** Session-backed Agent identity. */
  readonly id: SessionId
  /** The provider route and model this agent's requests use. */
  readonly options: AgentOptions
  /** The live session this agent drives; its log is the durable source of truth. */
  readonly session: Session
  /** Agent-owned access to durable pending work. */
  readonly inbox: Inbox
  /** The current lifecycle state, mirrored on every `agent/status` transition. */
  readonly status: AgentStatus
  /** Agent-scoped context; its contributions are agent-local, unwind on disposal, and reject registration afterward. */
  readonly ctx: Context

  /**
   * Clear queued and steering work — unless `keepInbox` — and abort the active
   * turn or between-turn task. The first cause wins for that activity. With no
   * active activity, cancellation is a no-op and does not arm later work.
   * @param cause - the stable caller intent carried by the active operation signal.
   * @param options - cancellation options; `keepInbox` preserves pending work.
   */
  cancel(cause: AgentCancelCause, options?: CancelOptions): void

  /**
   * Resolve after the current whole-agent activity reaches quiescence. This
   * follows replacement work started before the observed driver retires,
   * but does not identify the settlement of any particular message.
   * @returns fulfillment after no active driver or maintenance task remains.
   */
  whenIdle(): Promise<void>

  /**
   * Run one non-turn maintenance task from the true idle phase. The task starts
   * synchronously after claiming that phase; later waking input remains in the
   * inbox until the task settles, while public status stays `idle`.
   * `whenIdle()` follows both the task and any waking work released behind it.
   * @param task - operation whose fulfillment or rejection is preserved, with a signal aborted by {@link cancel}.
   * @throws synchronously when turn-driving or another maintenance task already owns the agent.
   * @returns the task promise.
   */
  runMaintenance<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T>

  /**
   * Route identified input to an inbox boundary and optionally wake the driver.
   * Waking input submitted after active cancellation is queued for the next
   * turn and runs when the aborted activity converges to idle; a `disposed`
   * cancel leaves it parked. A wake submitted while already idle always opens
   * its turn boundary, even when its message is cleared before the driver
   * claims ([cancel-convergence wake latch](../../../../.agents/notes/implemented/bug-fix/2026-08-07-cancel-convergence-wake-latch.md)).
   * @param message - identified content and the source that supplied it.
   * @param target - the preferred next-turn or next-step inbox boundary.
   * @param wakeup - whether delivery may wake the driver.
   */
  send(message: UserMessage, target: InboxTarget, wakeup: boolean): void

  /**
   * Queue an ordinary follow-up turn and wake the driver. The item becomes the
   * sole ordinary message of its own turn.
   * @param message - identified prompt content and the source that supplied it.
   */
  followup(message: UserMessage): void

  /**
   * Submit steering for the nearest step. An idle driver starts a turn;
   * a running driver consumes it at its next step boundary.
   * A rejected step leaves steering parked in the inbox until the next
   * wake; cancellation or disposal may discard pending steering.
   * @param message - identified steering content and the source that supplied it.
   */
  steer(message: UserMessage): void

  /**
   * Queue model-facing context for the next pre-step without waking the
   * driver. A running driver claims it at the nearest later step boundary;
   * idle drivers leave it pending until follow-up or steering
   * wakes them. It may miss a request whose pre-step already claimed its
   * batch. Cancellation or disposal may discard pending context.
   * @param message - identified injected context and the source that supplied it.
   */
  inject(message: UserMessage): void
}
```

```ts type-equiv
/**
 * An agent's lifecycle state, emitted on every transition as `agent/status`:
 * `idle` means no driver is active; `running` begins when waking input starts
 * cancellable pre-step processing and lasts while the driver drains,
 * closes, or checkpoints turns. Disposal removes the agent from its registry;
 * it is not a third observable status.
 */
type AgentStatus = 'idle' | 'running'
```

```ts type-equiv
/** One process-local live assistant streaming publication. */
type AssistantStreamFrame =
  | {
    readonly type: 'start'
    readonly attemptId: LlmAttemptId
    /** Monotone within one attached Agent lifecycle; replacement restarts at 1. */
    readonly revision: number
    readonly turn: number
    readonly step: number
  }
  | {
    readonly type: 'chunk'
    readonly attemptId: LlmAttemptId
    readonly revision: number
    /** Dense zero-based position within the attempt. */
    readonly index: number
    /** Safe-integer timestamp reused by the durable embedded stream. */
    readonly time: number
    readonly chunk: StreamChunk
  }
  | {
    readonly type: 'end'
    readonly attemptId: LlmAttemptId
    readonly revision: number
    /** Number of chunk frames emitted by this attempt. */
    readonly index: number
    /** Durable settlement committed before this notification, or live abandonment without one. */
    readonly outcome:
      | {
        readonly kind: 'committed'
        readonly eventType: 'assistant/message' | 'assistant/attempt'
        readonly seq: SessionSeq
      }
      | { readonly kind: 'abandoned' }
  }
```

`running` describe el intervalo de drenado de todo el driver y puede abarcar turnos encolados consecutivos; no demuestra que un turno siga abierto. El dispose elimina el agent del registry y emite `agent/disposed`; no es un valor de estado terminal. `followup()` no devuelve ningún handle: su `MessageId` identifica los hechos durables de inserción, reclamación y descarte en el inbox, no una salida de assistant posterior ni el final de un turno. `whenIdle()` observa el agent completo, así que los llamantes solo pueden llamar run a un intervalo de recibo a reposo cuando poseen explícitamente ese intervalo ([decisión](../../.agents/notes/implemented/architecture/2026-07-30-followup-enqueue-and-owned-runs.md)).

```ts type-equiv
/** Merge-extensible agent creation options. Persona belongs to system-prompt sections. */
interface AgentOptions {
  /** Provider route (must have a registered adapter at call time). */
  provider?: string
  /** Model id interpreted by the selected provider adapter. */
  model?: string
  /** Adapter-owned reasoning effort for the selected provider/model route. */
  reasoningEffort?: ReasoningEffortId
  /** Maximum output tokens for each conversation-model request. */
  maxTokens?: number
}
```

El despacho requiere `provider` y `model` tras `agent/request`. Un `reasoningEffort` explícito siembra la primera solicitud en esa ruta; la resolución de modelo exacto lo valida, mientras que omitirlo permite que se materialice el valor por defecto del adaptador. Cuando está presente, `maxTokens` debe ser un entero seguro positivo y limita cada solicitud al modelo de conversación; omitirlo permite que el valor por defecto del adaptador de modelo exacto se materialice antes de la cabecera de la solicitud, o si no deja el comportamiento del proveedor sin cambios. Una sección de prompt `deployment:persona-prefix` con ámbito de agent puede sombrear la persona global por defecto.

El inbox es el vocabulario de entrega: dos listas ordenadas de mensajes pendientes que el agent posee como proyección durable:

```ts type-equiv
/** Agent-owned access to pending work; concrete storage belongs to the driver. */
interface Inbox {
  /** Prompts awaiting individual turns. */
  readonly nextTurn: readonly UserMessage[]
  /** Input awaiting the next step boundary. */
  readonly nextStep: readonly UserMessage[]

  /** Durably cancel all pending input, clearing next-step before next-turn. */
  clear(): void

  /**
   * Append one message to a pending list.
   * @param target - pending list to extend.
   * @param message - message to append.
   */
  append(target: InboxTarget, message: UserMessage): void

  /**
   * Prepend one message to a pending list.
   * @param target - pending list to extend.
   * @param message - message to prepend.
   */
  prepend(target: InboxTarget, message: UserMessage): void

  /**
   * Replace one pending message in place.
   * @param messageId - identity of the pending message to replace.
   * @param newMessage - replacement message.
   * @returns whether the message was still pending.
   */
  replace(messageId: MessageId, newMessage: UserMessage): boolean

  /**
   * Remove one pending message.
   * @param messageId - identity of the pending message to remove.
   * @returns whether the message was still pending.
   */
  remove(messageId: MessageId): boolean

  /**
   * Apply standard splice semantics and durably record the normalized result.
   * @param target - pending list to mutate.
   * @param start - splice position.
   * @param deleteCount - maximum number of messages to remove.
   * @param inserted - messages to insert at the resolved position.
   * @returns messages removed by the splice.
   */
  splice(
    target: InboxTarget,
    start: number,
    deleteCount: number,
    inserted: UserMessage[],
  ): UserMessage[]
}
```

```ts type-equiv
/** One of the two ordered pending-message lists owned by an agent. */
type InboxTarget = 'next-turn' | 'next-step'
```

Cada aparición pendiente es su `UserMessage`; `MessageId` es la única identidad. Los métodos estructurales de `Inbox` registran mutaciones durables normalizadas `agent/inbox/spliced` y rechazan ids pendientes duplicados. `replace(messageId, newMessage)` y `remove(messageId)` localizan el mensaje pendiente en ambas listas; el reemplazo puede cambiar la identidad y emite el mensaje antiguo como descartado seguido del nuevo como insertado. Las eliminaciones ordinarias y `clear()` son cancelaciones. En una frontera de paso, el `ReactLoopInbox` interno del paquete dsh-agent-loop elimina el lote propuesto (toda la entrada `next-step` más, en una frontera de turno, un mensaje `next-turn`) mediante splices de pura eliminación sin notificaciones de descarte, y después emite notificaciones de reclamación por mensaje. La detección de pendientes y la reclamación, exclusivas del bucle, no forman parte de `Agent.inbox`. El servicio `AgentLoop` registra la proyección estándar `inbox` antes de publicar su factoría; su celda es el único estado en vivo, y el mismo pliegue sirve a los consumidores en frío incluso cuando no existe ningún Agent. El pliegue rechaza coordenadas de splice inseguras o fuera de rango e identidades duplicadas en ambas listas, identificando el historial durable mal formado por seq de evento. Los consumidores que siguen un mensaje usan las notificaciones exactas `agent/inbox/inserted`, `claimed` y `discarded`.

Cancelación:

```ts type-equiv
/** Options for {@link Agent.cancel}. */
interface CancelOptions {
  /**
   * Preserve queued and steering inbox items instead of discarding them. The
   * active turn is still aborted, but un-started and pending work survives for a
   * later turn and no canceled inbox splice is logged.
   */
  keepInbox?: boolean | undefined
}
```

```ts type-equiv
/** Why an active agent driver was cancelled. */
type AgentCancelCause =
  | { readonly kind: 'user' }
  | { readonly kind: 'parent' }
  | { readonly kind: 'hook'; readonly reason: string }
  | { readonly kind: 'disposed' }
```

La causa es una entrada del mismo proceso forzada por TypeScript. Un tenedor de cancelación activo expone ese mismo objeto como el `AbortSignal.reason` solo de runtime; una señal no concede a los listeners cooperantes ninguna autoridad de clasificación. El `turn/end` durable registra el resultado como `{ kind: 'aborted', reason: TurnEndCancelCause }`, de modo que la causa de la cancelación aterriza en el resultado terminal.

La [taxonomía de eventos](../architecture.es.md#events) es dueña de los contratos de ciclo de vida, puntos de control y waterfall de `agent/*`. Las fronteras de turno y paso son eventos de sesión durables, no emits del agent.

<a id="initiating-agent"></a>

## Agent iniciador

El iniciador local al proceso que porta `ctx.agents` es el `Agent` exacto de arriba, no un marco separado ni una identidad copiada. La presencia ambiental no es prueba de vida ni autorización; la [decisión del ámbito de iniciador](../../.agents/notes/implemented/architecture/2026-07-15-agent-initiator-scope.md) define su tiempo de vida y sus reglas de ámbito.

<a id="interception-decisions"></a>

## Decisiones de interceptación

Las decisiones pre-step usan el mismo tipo `UserMessage` identificado que la entrada durable de rol usuario. El lote ingresado es autoritativo y conserva el `id` y el `source` de cada mensaje. Los puentes de hooks mapean sus campos de decisión nativos sobre este resultado tipado.

Fuente: [`packages/core/agent/src/types.ts`](../../packages/core/agent/src/types.ts)

`agent/pre-step` recibe un payload que porta el lote reclamado exclusivo (`messages`), las coordenadas del paso propuesto (`turn`, `step`) y la `signal` de cancelación del turno actual. La propuesta inicial se ejecuta dentro de un turno abierto antes de cualquier paso; una continuación de tool puede enviar un lote reclamado vacío entre pasos:

Devuelve una `PreStepDecision`. Reject no abre ningún paso. Enter suministra el lote completo de mensajes que se anexa tras `step/start`; los mensajes reclamados que la decisión final omite permanecen eliminados, mientras que la entrada insertada después de la reclamación sigue pendiente:

```ts type-equiv
/** Whether and with which messages the loop enters a proposed step. */
type PreStepDecision =
  | { kind: 'reject' }
  | {
    kind: 'enter'
    messages: UserMessage[]
    /** Start a distinct model-message series before this step's admitted messages. */
    startsRequestSeries?: true
  }
```

`agent/request-error` se ejecuta después de que un paso de modelo fallido se cierra y antes de que su turno se cierre. Los listeners pueden reparar estado durable o esperar trabajo de política mientras la señal del turno fallido sigue viva. Un listener que se hace cargo devuelve `{ kind: 'retry' }` sin llamar a `next()`; el `undefined` por defecto deja el fallo terminal.

```ts type-equiv
/** Action returned by a listener that owns model-request recovery. */
type RequestErrorAction = { kind: 'retry' } | undefined
```

`agent/pre-step` es la única cadena de listeners waterfall antes de la derivación de la solicitud. `agent/turn-stopping` se ejecuta cuando un turno no tiene continuación de tool ni de steering (guía a mitad de camino), antes de un último drenado de steering.

`agent/created` porta un `SessionStartSource` (por qué comenzó el ciclo de vida de la sesión; un bridge indexa su matcher de SessionStart sobre él):

```ts type-equiv
/** Why a session lifecycle began; seeded creates are `startup`, while persisted loads are `resume`. */
type SessionStartSource = 'startup' | 'resume' | 'clear' | 'compact'
```

## Sesiones

Una `Session` es un **registro de solo anexado** de `SessionEvent` tipados: la fuente de verdad. El historial de mensajes del LLM se *deriva* del registro (`deriveMessages()`), no se almacena por separado. Cada entrada porta un `seq` monótono, un `time` y un payload `data` discriminado por `type`; las variantes de superficie también pueden listar eventos anteriores citados en `sourceEventSeqs` y portar un `surfaceOp`.

Los campos condicionales exactos del sobre `SessionEvent`, las trece variantes de eventos del core (`turn/start`, `turn/end`, `step/start`, `step/end`, `user/message`, `system/message`, `assistant/message`, `assistant/attempt`, `tool/call`, `tool/result`, `request/header`, `request/context`, `session/end-seed`), las reglas de proyección de `deriveMessages()`, las razones de `TurnEndReason` y las reglas de recinto de ejecución y de eventos independientes están en **[session.md](session.es.md)**. Cómo se hace durable el registro (la interfaz `SessionPersistence`, el proveedor JSONL, el punto de control `session/flush`, la recuperación tras fallo y `SessionHeader`) está en **[persistence.md](persistence.es.md)**.

## `ToolDefinition`

El único tipo de autoría de pipeline que es core: lo que *es* toda tool registrada — un `ToolSchema` orientado al modelo más una función `execute` y callbacks opcionales de contenido final y de UI. Un autor de tools rara vez lo construye a mano (el DSL `defineTool` lo construye con argumentos tipados), pero es el contrato que el registry retiene y a través del cual el bucle despacha.

Sus campos completos, el DSL de schemas tipados `defineTool`/`ValueSchemaSpec`/`ParameterSchemaSpec`, los tipos waterfall `ToolExecution`/`ToolExecutionResult` y los tipos de UI de presentación de tools están en **[tools.md](tools.es.md)**.

## Patrones de tipos de todo el repositorio

Dos patrones recurren en todos los subsistemas y se documentan una sola vez, aquí.

<a id="the-map--derived-union-pattern"></a>

### El patrón `…Map → unión derivada`

Casi todo tipo suma extensible del harness sigue un patrón: una interfaz indexada por una etiqueta discriminante (el `…Map`), de la que se deriva la unión con `keyof`. Los plugins añaden variantes mediante **declaration merging**, sin editar el paquete propietario.

```ts ignore-check
// The pattern, schematically:
interface ThingMap {
  'a': { kind: 'a'; /* … */ }
  'b': { kind: 'b'; /* … */ }
}
type ThingKind = keyof ThingMap          // 'a' | 'b'
type Thing = ThingMap[keyof ThingMap]    // the discriminated union

// A plugin extends it without touching the source package:
declare module '@deepseek-ai/dsh-llm' {
  interface ThingMap {
    'c': { kind: 'c'; /* … */ }
  }
}
```

Cinco maps canónicos usan este patrón; un autor de plugins extiende estos:

| Map | Paquete | Deriva | Catálogo |
|---|---|---|---|
| `ContentBlockMap` | dsh-llm | `ContentBlock` | [llm-streaming.md](llm-streaming.es.md#content-blocks-and-messages) |
| `MessageSourceMap` | dsh-llm | `MessageSource` | [llm-streaming.md](llm-streaming.es.md#content-blocks-and-messages) |
| `FinishReasonMap` | dsh-llm | `FinishReason` | [llm-streaming.md](llm-streaming.es.md#the-model-request-and-result) |
| `TurnEndReasonMap` | dsh-session | `TurnEndReason` | [session.md](session.es.md) |
| `SessionEventMap` | dsh-session | `SessionEvent` | [session.md](session.es.md) |

Dos uniones discriminadas grandes son las que más `switch` hacen los consumidores: **`StreamChunk`** (el protocolo de streaming) y **`SessionEvent`** (la entrada del registro). Según la convención del repositorio, hacer `switch` sobre la etiqueta (no encadenar `if`), de modo que cada brazo estrecha y una etiqueta con errata no compila.

### Branded IDs

Los IDs que se pasan entre paquetes llevan **marca**: estructuralmente son cadenas, pero no intercambiables a nivel de tipos (un `SessionId` no puede pasarse donde se espera un `ToolCallId`). La construcción usa el helper compartido `brandString<T>()` o una factoría validadora definida por el propietario; la comparación, el registro y JSON se comportan como cadenas ordinarias.

La primitiva `Branded<B>` y su constructor sin estado viven en [dsh-brand](../../packages/util/brand), que no tiene dependencia de ninguna capacidad del harness. `brandString<T>()` aplica una marca de cadena solo en tiempo de compilación.

Fuente: [`packages/util/brand/src/index.ts`](../../packages/util/brand/src/index.ts)

```ts type-equiv
/** A string carrying a compile-time-only brand `B`. */
type Branded<B extends string> = string & { readonly [BRAND]: B }
```

Los dos IDs del core son `ToolCallId` (correlaciona una llamada a tool con su resultado; dsh-llm) y `SessionId` (la identidad compartida del agent en vivo y de la sesión durable; dsh-session). Los paquetes de capacidades también marcan sus propios ids, como `JobId` en [jobs.md](jobs.es.md).

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxagentdefaultmodel--agentdefaultmodelconfig"></a>

### `ctx.agentDefaultModel` — `AgentDefaultModelConfig`

Owns the default model selection independently of any Host or transport. Each operation reads the owning Config references.

```ts cordis-catalog
/**
 * Read the current default model selection.
 * @returns a detached provider, model, and optional reasoning selection.
 */
currentSelection(): ModelSelection

/**
 * Save the complete default model selection. A deployment without a configuration
 * editor keeps its composition entry. Saves commit in submission order; a failed
 * save rejects its caller without blocking later saves.
 * @param next - resolved selection accepted by an entry point.
 * @returns fulfillment after the optional profile write settles.
 */
async saveSelection(next: ModelSelection): Promise<void>
```

Source: [`packages/core/agent-default-model/src/index.ts`](../../packages/core/agent-default-model/src/index.ts)

<a id="ctxagentloop--agentloop"></a>

### `ctx.agentLoop` — `AgentLoop`

Concrete agent factory and driver service.

```ts cordis-catalog
/**
 * Create an agent and session under one caller-supplied identity, owned by
 * the accessing fiber. Constructor-driven config calls mint a fresh combined
 * id before entering this boundary. When a persistence backend is mounted,
 * the session's durable identity and any seed are stored before publication.
 * @param id - shared agent/session identity.
 * @param options - concrete loop options.
 * @param meta - optional fresh-session workspace metadata.
 * @returns the published running agent.
 */
async create(id: SessionId, options: AgentOptions = {}, meta: Pick<SessionHeader, 'cwd'> = {}): Promise<Agent>

/**
 * Create an owned agent on a caller-supplied session id.
 * @param ownerCtx - caller context that structurally owns the lifecycle.
 * @param options - identities, optional live parent, session seed/metadata, loop options, setup, and cancellation.
 * @returns the published handle.
 */
async createAgent(ownerCtx: Context, options: CreateAgentOptions): Promise<AgentHandle>

/**
 * Resume an owned agent from the configured persistence service.
 * @param ownerCtx - caller context that owns load, setup, and the live lifecycle.
 * @param options - persisted identity, optional live parent, loop options, setup, and cancellation.
 * @returns the published handle.
 */
async resume(ownerCtx: Context, options: ResumeAgentOptions): Promise<AgentHandle>
```

Types: [SessionHeader](persistence.es.md)

Source: [`packages/core/agent-loop/src/index.ts`](../../packages/core/agent-loop/src/index.ts)

<a id="ctxagentpresets--agentpresetregistry"></a>

### `ctx.agentPresets` — `AgentPresetRegistry`

Registry of YAML-declared presets and the revisions live Agents retain.

```ts cordis-catalog
/** Register and eagerly load a definition; activation failure remains visible in the roster.
 * @param definition Parsed configuration supplied by the declaring plugin.
 * @returns Definition disposer after activation or its diagnostic settles; the declaring plugin owns it.
 */
async register(definition: PresetDefinition): Promise<() => Promise<void>>

/** Read every declared preset, including activation failures.
 * @returns Display metadata and loading diagnostics.
 */
async list(): Promise<AgentPreset[]>

/** Read the selection roster.
 * @returns Current presets, each marked when it is the default.
 */
@Remote('list') async remoteExportList(): Promise<AgentPresetRoster>

/** Resolve an identity without starting an Agent.
 * @param id Explicit preset or the current default.
 * @returns Current metadata, including failure when activation failed.
 */
async resolve(id?: string): Promise<AgentPreset>

/** Read one declaration's child plugin list as YAML, for viewing only.
 * @param agentPreset Preset identity.
 * @returns The declared composition beside its published metadata.
 */
@Remote('read') readDocument(agentPreset: string): Promise<AgentPresetDocument>

/** Bind an unpublished Agent to the current preset revision.
 * @param ctx Agent context from its setup callback.
 * @param id Requested preset, or the default.
 * @returns Bound preset identity.
 */
async mount(ctx: Context, id?: string): Promise<AgentPreset>

/** Join a child to the exact revision retained by its parent.
 * @param ctx Child Agent context.
 * @param parent Parent Agent context.
 * @returns Inherited preset id, or undefined in a preset-free composition.
 */
composeFrom(ctx: Context, parent: Context): string | undefined

/** Read the preset a live Agent uses.
 * @param ctx Agent context.
 * @returns Its preset id, if bound.
 */
composedPreset(ctx: Context): string | undefined

/** Read a service supplied inside an Agent's isolated preset group.
 * @param agent Agent whose composition is queried.
 * @param name Cordis service name.
 * @returns The service, or undefined.
 */
serviceFor<K extends string & keyof Context>(agent: { ctx: Context }, name: K): Context[K] | undefined

/** Rebind a blank Agent; the caller owns the blank-session check.
 * @param ctx Agent context.
 * @param id Requested preset.
 * @returns The bound identity.
 */
async recompose(ctx: Context, id: string): Promise<AgentPreset>

/** Select a preset before a session starts its first turn.
 * @param agent Target Agent.
 * @param agentPreset Requested identity.
 * @returns Committed preset identity.
 */
@Remote('select') async select(agent: Agent, agentPreset: string): Promise<string>

/** Read current registrations for cold transcript presentation.
 * @param id Preset identity or the default.
 * @returns A revision lease; dispose it after the scoped read completes.
 */
async acquireScope(id?: string): Promise<{ key: ScopeKey } & AsyncDisposable>

/** Read plugin rows without creating an Agent.
 * @returns Current declaration metadata and activation states.
 */
compositionInventory(): Promise<AgentPresetComposition[]>
```

Types: [ScopeKey](scope.es.md)

Source: [`packages/preset/agent-preset-registry/src/index.ts`](../../packages/preset/agent-preset-registry/src/index.ts)

<a id="ctxagents--agentregistry"></a>

### `ctx.agents` — `AgentRegistry`

Agent service (`ctx.agents`): tracks live agents and carries the initiating Agent through one process-local asynchronous driver chain. Agent *creation* is provided by whichever plugin implements the AgentFactory (`@deepseek-ai/dsh-agent-loop`), registered via setFactory.

Initiator methods provide same-process causal attribution only. Ambient presence is neither liveness proof nor authorization; subjects and owners remain explicit, as does identity at worker, process, persistence, and wire boundaries. Returned Promise boundaries drain during teardown, except a nested lineage that starts an owning-fiber unload is excluded from its own drain.

```ts cordis-catalog
/**
 * Read the Agent that initiated the inherited asynchronous driver chain.
 * Use this optional form for logging, tracing, metrics, or host attribution
 * that also supports agentless calls. When a parent creates a child, setup
 * reports the causal parent while the setup callback's Agent parameter
 * identifies the child.
 * @returns the inherited Agent, or `undefined` outside an initiator boundary
 *   and inside an explicit clearing boundary.
 * @throws when this service instance has been disposed.
 */
currentInitiator(): Agent | undefined

/**
 * Read the initiating Agent and fail when no initiator boundary is active.
 * Use this for private helpers contractually below a driver, or for a
 * deployment-owned outbound request whose contract forbids agentless calls.
 * Generic or direct-call paths use optional lookup or explicit request fields.
 * @returns the inherited Agent.
 * @throws when no initiator is active or this service instance has been disposed.
 */
requireInitiator(): Agent

/**
 * Run an operation with one exact Agent as its process-local initiator. The
 * exact synchronous value or Promise returned by the operation is preserved.
 * Custom drivers and test harnesses wrap their complete returned foreground
 * lifetime.
 * A queue or wire receiver may establish this boundary only after validating
 * explicit identity and resolving the exact live Agent; this method does neither.
 * Detached work remains owned by the subsystem that starts it.
 * @param agent - initiating Agent to inherit; presence is neither liveness proof nor authorization.
 * @param operation - synchronous or asynchronous operation to invoke.
 * @returns the exact value returned by `operation`.
 * @throws when the initiator scope is closing/disposed, or when `operation` throws.
 */
withInitiator<T>(agent: Agent, operation: () => T): T

/**
 * Run an operation inside a boundary that hides any inherited initiating
 * Agent. The exact synchronous value or Promise is preserved.
 * Use this while creating lazy shared timers, queue pumps, pool maintenance,
 * watchers, or exporters so they do not inherit the first Agent that happens
 * to initialize them. It clears only initiator attribution, not explicit
 * fields, and does not own or drain detached resources.
 * @param operation - synchronous or asynchronous operation to invoke without an initiator.
 * @returns the exact value returned by `operation`.
 * @throws when the initiator scope is closing/disposed, or when `operation` throws.
 */
withoutInitiator<T>(operation: () => T): T

/**
 * Register the agent-creation factory (the loop calls this on construction,
 * effect-scoped). A traced Cordis service is canonicalized to its concrete
 * target; each create/resume call is then traced through that caller's
 * context so ownership follows the caller without stacking proxy layers.
 * Throws if a factory is already registered. Returns the disposer; on
 * dispose the factory slot is cleared.
 * @param factory - the loop-owned factory {@link create}/{@link resume} delegate to.
 * @returns the disposer that clears the factory slot. The exact
 *   Cordis effect disposer (single-shot): composite (generator) effects may
 *   yield it directly — exact identity nests the teardown in order.
 */
setFactory(factory: AgentFactory): () => void

/**
 * Create and publish a new agent through the registered factory.
 * Distinct from {@link register} (which records an already-constructed
 * agent): this constructs the agent and its session. Rejects if no factory is
 * registered or creation/setup fails. The resolved {@link AgentHandle} lets
 * the owner tear down exactly this agent.
 * @param options - shared identity, optional live parent, session seed/metadata, and agent options.
 * @returns the handle after setup, rollback-covered publication, and loop start complete.
 */
async create(options: CreateAgentOptions): Promise<AgentHandle>

/**
 * Load a persisted session and resume an agent on it through the registered
 * factory. Rejects if no factory is registered; the factory rejects if
 * session persistence is not configured or persistence/setup fails.
 * @param options - persisted identity, optional live parent, configuration, and setup.
 * @returns the handle after setup, rollback-covered publication, and loop start complete.
 */
async resume(options: ResumeAgentOptions): Promise<AgentHandle>

/**
 * Register a live agent with source `startup`. Rejects if the id is already registered or a
 * serial `agent/created` listener fails. Emits `agent/disposed`
 * when the calling fiber is disposed — both with the agent's scope carrier
 * (`scopeTarget(agent, agent)`): the subject is the agent in hand, so the
 * emits are scope-filtered regardless of which context invoked `register`
 * (calling through `agent.ctx` scopes EFFECTS; dispatch scoping always
 * requires passing the carrier). The entry is a runtime root; factory-backed
 * creation uses `options.parentAgent` for child ownership. Await the registration before using the agent.
 * @param agent - the already-constructed agent to record in the store.
 * @returns the awaitable Cordis effect disposer (single-shot; a repeat call
 *   returns undefined without awaiting an in-flight teardown). Exact
 *   identity is load-bearing: a composite (generator) effect that owns a
 *   teardown ORDER — the agent factory's lifecycle chain — must yield THIS
 *   function so Cordis nests the unregistration at that yield position;
 *   yielding a wrapper would leave it disposing as a concurrent sibling on
 *   owner unload, unregistering the agent (and emitting `agent/disposed`)
 *   while its final turn is still draining.
 */
register(agent: Agent): ReturnType<Context['effect']>

/**
 * Insert an already-constructed agent without announcing it. This is the
 * advanced ordered-lifecycle primitive used by the async agent factory: it
 * first completes setup while the agent is unpublished, then assigns the
 * returned detach closure into its pre-installed composite teardown before
 * calling {@link announce}. Ordinary callers use {@link register}.
 * @param agent - the prepared, unpublished agent.
 * @param owner - explicitly supplied live runtime owner, or
 *   undefined for a top-level runtime root. This is runtime ownership, not
 *   the resumed session's durable parent lineage.
 * @returns an idempotent closure that removes this exact entry and emits
 *   `agent/disposed` with listener failures contained. When called from a
 *   `agent/created` listener, removal and disposal wait until the serial
 *   creation dispatch settles.
 */
enter(agent: Agent, owner: Agent | undefined): () => void

/**
 * Announce an agent previously inserted with {@link enter}.
 * @param agent - the live inserted agent to announce.
 * @param source - fresh creation, resume, clear, or compaction source.
 * @param signal - optional factory initialization cancellation signal passed to listeners.
 * @returns completion of the serial creation listeners; a listener failure rejects.
 * @throws if `agent` is not the exact live registry entry for its id, or its
 *   creation announcement already began (including a reentrant call from a
 *   creation listener).
 */
async announce(agent: Agent, source: SessionStartSource, signal?: AbortSignal): Promise<void>

/**
 * Look up a live agent.
 * @param id - the shared agent/session id to look up.
 * @returns the agent, or undefined when no live agent has that id.
 */
get(id: SessionId): Agent | undefined

/**
 * Test whether a live agent was created through one exact parent agent's
 * scoped context. Runtime ownership is independent of durable session
 * lineage and remains unambiguous when unrelated providers reuse an id.
 * @param id - the candidate child agent's shared agent/session id.
 * @param owner - the expected runtime creator agent.
 * @returns true only while the exact child entry is live under that owner.
 */
isOwnedBy(id: SessionId, owner: Agent): boolean

/**
 * All live agents, in registration order.
 * @returns a fresh array; mutating it does not affect the registry.
 */
list(): Agent[]

/**
 * All live top-level agents in registration order. A top-level agent was
 * created without an owning agent context; durable session lineage does not
 * affect this runtime relation, so a resumed fork may still be a root.
 * @returns a fresh array; mutating it does not affect the registry.
 */
roots(): Agent[]
```

Source: [`packages/core/agent/src/index.ts`](../../packages/core/agent/src/index.ts)

<a id="agent-events"></a>

### `agent/*` events

<a id="agentassistant-stream--emit"></a>

#### `agent/assistant-stream` — emit

Process-local assistant-stream publication. Chunk frames are transient; the loop appends one final v2 `assistant/message` or `assistant/attempt` with the same stream before a committed end frame.

```ts cordis-catalog
/**
 * Process-local assistant-stream publication. Chunk frames are transient;
 * the loop appends one final v2 `assistant/message` or `assistant/attempt`
 * with the same stream before a committed end frame.
 * @param payload.agent - the agent whose attempt produced the frame.
 * @param payload.frame - one ordered start, chunk, or end publication.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode emit
 */
'agent/assistant-stream'(this: Scoped<Agent>, payload: { agent: Agent; frame: AssistantStreamFrame }): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentcreated--serial"></a>

#### `agent/created` — serial

An entered agent is ready for per-agent initialization after factory setup. Listeners run in order and are awaited before creation resolves. AgentLoop holds queued input until all listeners finish. A throw or rejection fails creation and skips later listeners. Disposal retains the scope and session until dispatch settles; listeners must not await agent.whenIdle() or their own owner's disposal.

```ts cordis-catalog
/**
 * An entered agent is ready for per-agent initialization after factory setup.
 * Listeners run in order and are awaited before creation resolves. AgentLoop
 * holds queued input until all listeners finish. A throw or rejection fails
 * creation and skips later listeners. Disposal retains the scope and session
 * until dispatch settles; listeners must not await agent.whenIdle() or their
 * own owner's disposal.
 * @param payload.agent - the newly registered agent with its live session and completed setup.
 * @param payload.source - fresh creation, resume, clear, or compaction source.
 * @param payload.signal - factory initialization cancellation signal, when provided.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode serial
 */
'agent/created'(this: Scoped<Agent>, payload: { agent: Agent; source: SessionStartSource; signal?: AbortSignal }): undefined | Promise<undefined>
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentdisposed--emit"></a>

#### `agent/disposed` — emit

An agent left the registry; AgentLoop emits this after driver quiescence and scoped-registration unwind, but before session detachment. Custom registry users own their driver-ordering contract.

```ts cordis-catalog
/**
 * An agent left the registry; AgentLoop emits this after driver quiescence
 * and scoped-registration unwind, but before session detachment. Custom
 * registry users own their driver-ordering contract.
 * @param payload.agent - the exact agent removed from the registry.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode emit
 */
'agent/disposed'(this: Scoped<Agent>, payload: { agent: Agent }): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agenterror--emit"></a>

#### `agent/error` — emit

A step or turn errored. The machine reports a failure here even when the error has no in-turn position for a durable record.

```ts cordis-catalog
/**
 * A step or turn errored. The machine reports a failure here even when
 * the error has no in-turn position for a durable record.
 * @param payload.agent - the agent whose turn errored.
 * @param payload.turn - the turn in which the failure surfaced.
 * @param payload.step - the step at which the failure surfaced.
 * @param payload.error - the failure, verbatim.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode emit
 */
'agent/error'(this: Scoped<Agent>, payload: { agent: Agent; turn: number; step: number; error: unknown }): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentinboxclaimed--emit"></a>

#### `agent/inbox/claimed` — emit

One message left the inbox inside its open turn. If the proposed step is rejected, the claimed message ends here: it is neither discarded nor re-emitted as a user/message, and the turn closes without a step.

```ts cordis-catalog
/**
 * One message left the inbox inside its open turn. If the proposed step
 * is rejected, the claimed message ends here: it is neither discarded nor
 * re-emitted as a user/message, and the turn closes without a step.
 * @param payload.agent - the agent whose inbox changed.
 * @param payload.message - the claimed message.
 * @param payload.turn - the owning turn.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode emit
 */
'agent/inbox/claimed'(this: Scoped<Agent>, payload: { agent: Agent; message: UserMessage; turn: number }): void
```

Types: [Scoped](scope.es.md) · [UserMessage](session.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentinboxdiscarded--emit"></a>

#### `agent/inbox/discarded` — emit

One message was discarded from the live inbox.

```ts cordis-catalog
/**
 * One message was discarded from the live inbox.
 * @param payload.agent - the agent whose inbox changed.
 * @param payload.message - the discarded message.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode emit
 */
'agent/inbox/discarded'(this: Scoped<Agent>, payload: { agent: Agent; message: UserMessage }): void
```

Types: [Scoped](scope.es.md) · [UserMessage](session.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentinboxinserted--emit"></a>

#### `agent/inbox/inserted` — emit

One message entered the live inbox.

```ts cordis-catalog
/**
 * One message entered the live inbox.
 * @param payload.agent - the agent whose inbox changed.
 * @param payload.message - the inserted message.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode emit
 */
'agent/inbox/inserted'(this: Scoped<Agent>, payload: { agent: Agent; message: UserMessage }): void
```

Types: [Scoped](scope.es.md) · [UserMessage](session.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentpre-step--waterfall"></a>

#### `agent/pre-step` — waterfall

Reject a proposed step or replace the messages that enter it. Calling `next()` preserves the current messages.

```ts cordis-catalog
/**
 * Reject a proposed step or replace the messages that enter it. Calling
 * `next()` preserves the current messages.
 * @param payload.agent - the agent proposing the step.
 * @param payload.messages - messages removed from the inbox for this step.
 * @param payload.turn - the turn that will own the step.
 * @param payload.step - the step proposed by the loop.
 * @param payload.signal - the current turn's cancellation signal.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode waterfall
 */
'agent/pre-step'(this: Scoped<Agent>, payload: { agent: Agent; messages: UserMessage[]; turn: number; step: number; signal: AbortSignal }, next: () => Promise<PreStepDecision>): Promise<PreStepDecision>
```

Types: [Scoped](scope.es.md) · [UserMessage](session.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentrequest--waterfall"></a>

#### `agent/request` — waterfall

Replace the frozen call configuration. `await next()` yields the config the machine would use (agent options on the first request, the logged header afterwards); return a replacement to switch. On step admission, this runs after assembly and `step/start`, before the system prompt and accepted user batch are committed. Cancellation here or during subsequent `prepareCall()` resolution commits neither. The prepared call capability governs prompt admission. Model-visible content must use logged channels; this waterfall cannot mutate messages.

```ts cordis-catalog
/**
 * Replace the frozen call configuration. `await next()` yields the config
 * the machine would use (agent options on the first request, the logged
 * header afterwards); return a replacement to switch. On step admission,
 * this runs after assembly and `step/start`, before the system prompt and
 * accepted user batch are committed. Cancellation here or during subsequent
 * `prepareCall()` resolution commits neither. The prepared call capability
 * governs prompt admission. Model-visible content must use logged channels;
 * this waterfall cannot mutate messages.
 * @param payload.agent - the agent making the model call.
 * @param payload.turn - the open turn number.
 * @param payload.step - the step whose request this is.
 * @param payload.signal - the current turn's explicit abort signal.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode waterfall
*/
'agent/request'(this: Scoped<Agent>, payload: { agent: Agent; turn: number; step: number; signal: AbortSignal }, next: () => Promise<LlmCallConfig>): Promise<LlmCallConfig>
```

Types: [LlmCallConfig](llm-streaming.es.md) · [Scoped](scope.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentrequest-error--waterfall"></a>

#### `agent/request-error` — waterfall

Handle one failed model-request attempt before the loop retries or closes its step. A listener returns `{ kind: 'retry' }` without calling `next()` when it owns recovery, or calls `next()` to delegate. The default `undefined` leaves the failure terminal.

```ts cordis-catalog
/**
 * Handle one failed model-request attempt before the loop retries or closes
 * its step. A listener returns `{ kind: 'retry' }` without calling `next()`
 * when it owns recovery, or calls `next()` to delegate. The default
 * `undefined` leaves the failure terminal.
 * @param payload.agent - the agent whose request failed.
 * @param payload.turn - the turn containing the failed request.
 * @param payload.step - the step containing the failed request attempt.
 * @param payload.provider - the provider selected for the failed request.
 * @param payload.failure - serializable facts normalized at the final adapter boundary.
 * @param payload.retryPolicy - the policy of the adapter registration that served the failed request.
 * @param payload.signal - the turn abort signal.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode waterfall
 */
'agent/request-error'(this: Scoped<Agent>, payload: { agent: Agent; turn: number; step: number; provider: string; failure: LlmFailure; retryPolicy: ResolvedRetryPolicy | undefined; signal: AbortSignal }, next: () => Promise<RequestErrorAction>): Promise<RequestErrorAction>
```

Types: [LlmFailure](llm-streaming.es.md) · [ResolvedRetryPolicy](llm-streaming.es.md) · [Scoped](scope.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentstatus--emit"></a>

#### `agent/status` — emit

Agent status changed (`idle` ⇄ `running`). A waking delivery enters `running` synchronously after reserving cancellation; `idle` means no driver remains scheduled or active.

```ts cordis-catalog
/**
 * Agent status changed (`idle` ⇄ `running`). A waking delivery enters
 * `running` synchronously after reserving cancellation; `idle` means no
 * driver remains scheduled or active.
 * @param payload.agent - the agent whose status flipped.
 * @param payload.status - the status just entered (the transition's destination).
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode emit
 */
'agent/status'(this: Scoped<Agent>, payload: { agent: Agent; status: AgentStatus }): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agentturn-stopping--serial"></a>

#### `agent/turn-stopping` — serial

The turn is about to close: the model owes no response (no live tool calls, no fresh steering). Awaited before the boundary commits — a listener that objects steers (`agent.steer(...)`) and the machine re-reads its inbox: fresh steering runs another step, none closes the turn. Data decides, so listener order cannot change the outcome. The inverse control (stop a tool loop early) is data too: a tool result carrying `concludesTurn` ends the turn at its step. The conclusion never short-circuits already-submitted next-step work: same-step `additionalContexts` or racing steering still runs, and the turn closes only when that inbox drains.

```ts cordis-catalog
/**
 * The turn is about to close: the model owes no response (no live tool
 * calls, no fresh steering). Awaited before the boundary commits — a
 * listener that objects steers (`agent.steer(...)`) and the machine
 * re-reads its inbox: fresh steering runs another step, none closes the
 * turn. Data decides, so listener order cannot change the outcome. The
 * inverse control (stop a tool loop early) is data too: a tool result
 * carrying `concludesTurn` ends the turn at its step. The conclusion
 * never short-circuits already-submitted next-step work: same-step
 * `additionalContexts` or racing steering still runs, and the turn
 * closes only when that inbox drains.
 * @param payload.agent - the agent whose turn is at its stop boundary.
 * @param payload.turn - the turn about to close.
 * @param payload.signal - the current turn's explicit abort signal.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @mode serial
 */
'agent/turn-stopping'(this: Scoped<Agent>, payload: { agent: Agent; turn: number; signal: AbortSignal }): Promise<void> | void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/agent/src/runtime-types.ts`](../../packages/core/agent/src/runtime-types.ts)

<a id="agent-loop-events"></a>

### `agent-loop/*` events

<a id="agent-loopconfig-start-failed--emit"></a>

#### `agent-loop/config-start-failed` — emit

A declarative agent entry failed before it could publish a live agent. Consumers that buffer work for the configured identity use this transient signal to reject that work instead of waiting forever. Normal factory teardown suppresses failures from the cancelled startup attempt.

```ts cordis-catalog
/**
 * A declarative agent entry failed before it could publish a live agent.
 * Consumers that buffer work for the configured identity use this
 * transient signal to reject that work instead of waiting forever. Normal
 * factory teardown suppresses failures from the cancelled startup attempt.
 * @param payload.sessionId - exact shared agent/session identity that failed startup.
 * @param payload.error - persistence, setup, or publication failure.
 * @mode emit
 */
'agent-loop/config-start-failed'(payload: { sessionId: SessionId; error: unknown }): void
```

Source: [`packages/core/agent-loop/src/index.ts`](../../packages/core/agent-loop/src/index.ts)

<a id="agent-preset-events"></a>

### `agent-preset/*` events

<a id="agent-presetselected--emit"></a>

#### `agent-preset/selected` — emit

One session committed a different agent preset to its durable log. Consumers invalidate only state derived from that session's composition.

```ts cordis-catalog
/**
 * One session committed a different agent preset to its durable log.
 * Consumers invalidate only state derived from that session's composition.
 * @mode emit
 * @param sessionId - the session whose composition changed.
 * @param agentPreset - the preset recorded by the committed selection.
 */
'agent-preset/selected'(sessionId: SessionId, agentPreset: string): void
```

Source: [`packages/preset/agent-preset-registry/src/types.ts`](../../packages/preset/agent-preset-registry/src/types.ts)
<!-- END GENERATED cordis-surface -->
