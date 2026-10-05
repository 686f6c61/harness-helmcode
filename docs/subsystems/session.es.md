# Sesiones

[English](session.md) | Español

El modelo en memoria y de origen de eventos de [dsh-session](../../packages/core/session). Una `Session` es un **registro de solo anexado** de `SessionEvent`s tipados: la única fuente de verdad de toda la historia de interacción de un agent (agente). La historia de mensajes del LLM (modelo de lenguaje grande) se *deriva* del registro, nunca se almacena por separado; la reproducción es re-derivación a partir de los mismos eventos. Cómo se hace **durable** el registro (el seam de persistencia, los backends, la recuperación tras fallo) es el asunto hermano en [persistence.md](persistence.es.md).

Fuente: [`packages/core/session/src/types.ts`](../../packages/core/session/src/types.ts)

## `SessionEventMap`: el vocabulario de eventos

Los tipos de evento de solo anexado. Extensible por merge: un plugin declara tipos de evento extra mediante fusión de declaraciones; por ejemplo, el [seam de compactación (compaction)](compaction.es.md) añade `compaction/start` / `compaction/summary` / `compaction/end`, y `@deepseek-ai/dsh-hook-protocol` añade los registros solo de log `hook/invoked` / `hook/result` para un puente de hooks. Al igual que `compaction/*`, estos NO son `SurfaceEventType` (sin `surfaceOp`). El [catálogo de eventos del registro de persistencia](../persistence-catalog.es.md) generado enumera cada miembro (núcleo y fusionados) con su payload, insignia de superficie y sitio de declaración.

```ts type-equiv
/** A user-role specialization of the shared message representation. */
interface UserMessage extends MessageBase {
  readonly role: 'user'
}
```

```ts type-equiv
/**
 * The merge-extensible, append-only source of truth for an agent interaction.
 * Message history is derived from this log. Every event is lossless JSON and
 * sequence numbers stay contiguous. Assistant attempt events embed their exact
 * compact raw streams so persistence stores one durable settlement per attempt.
 */
interface SessionEventMap {
  /**
   * Opens turn `turn` before the loop claims queued input or runs pre-step.
   * Rejection, empty input, cancellation, or failure may close it with no
   * step; otherwise the following identified `user/message` event or batch
   * records the messages entering the step.
   */
  'turn/start': { turn: number }
  /**
   * Closes turn `turn` with the {@link TurnEndReason} that ended it. A turn
   * with no entered step has no `step/start` or `step/end`. The loop does not await a
   * flush at turn boundaries: `dsh-session-checkpoint-policy` owns the
   * per-request durability checkpoint, and consumers that read storage after
   * `whenIdle()` flush themselves. Success commits the turn; rejection is
   * reported live and does not prevent later work.
   */
  'turn/end': { turn: number; reason: TurnEndReason }
  /** Opens step `step` of turn `turn` — one model call plus the tool executions it requested. */
  'step/start': { turn: number; step: number }
  /** Closes step `step` of turn `turn`. */
  'step/end': { turn: number; step: number }
  /**
   * A user-role message on the model-visible surface: a direct human prompt
   * (the queued message claimed for this turn), a synthetic `agent.inject()`
   * context (file-change notices, subdir AGENTS.md, skill content, cron
   * notifications, …), or an entered goal continuation round. All three
   * project their `content` verbatim; `source` tells them apart.
   */
  'user/message': UserMessage
  /** An incremental agent session change admitted at the named turn and step. */
  'developer/message': {
    turn: number
    step: number
    message: DeveloperMessage
    /** Earlier request/header defining every tool addition; required exactly when additions are present. */
    headerSeq?: SessionSeq
  }
  /**
   * The rendered system prompt on the model-visible surface. The loop appends
   * the first one as surface node 0 before the step's first `user/message`.
   * A prepared in-history route can append nonempty changes in a continuing
   * series. An incapable route or new series normalizes text to the first system
   * node. Normalization empties nonempty later nodes, then rewrites the head if
   * needed, through logged per-node replacements. An empty rendering always
   * clears all active system nodes, leaving no older instructions model-visible.
   * Empty later nodes are dormant and project to no message; an empty head with
   * no active later node records "no system prompt". Restored nonempty text follows
   * the same route and series rule; empty nodes never restore older text.
   */
  'system/message': { turn: number; step: number; message: SystemMessage }
  /**
   * Assembled assistant message for one step (derived history uses this).
   * Carries the step's `usage` when the adapter reported token accounting, so
   * the model output and its accounting travel together (there is no separate
   * usage record). `usage` is absent when the adapter reported none. A turn
   * cancelled mid-stream finalizes its delivered text/reasoning prefix as this
   * event with `interrupted: true`; undispatched tool calls are absent. The
   * marker distinguishes that prefix without re-deriving interruption from turn
   * boundaries. An aborted turn with no such event streamed no visible content.
   */
  'assistant/message': {
    turn: number
    step: number
    message: AssistantMessage
    /** Exact timed model stream, compacted without joining delta boundaries. */
    stream: AssistantStreamRecord[]
    usage?: TokenUsage
    interrupted?: true
  }
  /**
   * One model attempt that committed no surface message. The embedded stream
   * preserves a failed, retried, cancelled, or stream-error attempt that
   * reached settlement without fabricating model-visible history.
   */
  'assistant/attempt': { turn: number; step: number; stream: AssistantStreamRecord[] }
  /**
   * The model requested one tool invocation: `name` with the raw `arguments`
   * JSON string exactly as the model produced it (unparsed). `callId` pairs the
   * call with its `tool/result`.
   */
  'tool/call': { turn: number; step: number; callId: ToolCallId; name: string; arguments: string }
  /**
   * A completed tool call's model-facing result, optional internal failure
   * identity and user-facing reason, and optional tool-private `meta`
   * presentation payload. The reason remains outside the model-facing message.
   * `meta` is
   * opaque to the core (the producing tool owns its shape and reads it back in
   * `presentResult`) but MUST be JSON-serializable: `Session.append`
   * runtime-validates all event data with `isJsonValue`, so a non-serializable
   * `meta` is rejected at the source, and the durable log reproduces the
   * identical card on replay. Absent
   * unless the tool attaches one (e.g. `dsh-tool-fs` carries its result-time
   * contextual diff here).
   */
  'tool/result': {
    turn: number
    step: number
    message: ToolResultMessage
    /**
     * Optional failure identity and raw user-facing reason, outside model content;
     * allowed only when the message has `isError: true`.
     */
    error?: { name: string; code: string; reason?: string }
    meta?: JsonValue
  }
  /**
   * Full header for the next request, appended inside its step before dispatch.
   * It is log-only; the latest snapshot reconstructs the request header.
   */
  'request/header': {
    header: EpochHeader
    reason: RequestHeaderReason
    /** This request begins a distinct model-message series, independently of the header reason. */
    startsSeries?: true
  }
  /**
   * Route metadata for the next request, logged only when the route, capacity,
   * or system prompt update mode changes. It does not participate in request
   * reconstruction or header equality. Prompt admission uses the bound prepared
   * call's capability, not this snapshot from an earlier request.
   */
  'request/context': RequestContext
  /**
   * Separates inherited or restored history from later lifecycle-owned work.
   * This log-only marker need not be at {@link Session.firstLiveSeq}: a fork
   * seed can already contain its tagged marker and child-owned synthetic
   * closers before construction.
   *
   * A fresh fork child owns one `{ inherited: true }` marker at its exact
   * inherited-prefix cut, even when that prefix ends in an ancestor marker.
   * `buildForkSeed` appends that marker before any synthetic closers; the
   * `Session` constructor supplies it when given only the inherited prefix.
   * The last tagged marker is the current Session's cut; untagged markers
   * keep ordinary restore and replay lifecycle boundaries.
   *
   * Only the `Session` constructor and `buildForkSeed` may create this marker.
   * The invariant companion deliberately constrains nothing here, so a plugin
   * appending one would silently classify every live bracket before it as seed history.
   *
   * An owner of a standalone open/close bracket (`compaction/start` …
   * `compaction/end`) reads it because seed history and live work are otherwise
   * byte-identical: an unmatched opening marker before this event belongs to
   * an ended lifecycle, whatever ended it. NOT a liveness signal about other
   * writers — a concurrently live session holds its own boundary elsewhere,
   * so tolerating concurrent writers needs a signal beyond the log.
   */
  'session/end-seed': { inherited?: true }
}
```

`UserMessage` es el valor identificado y congelado de rol user compartido por los prompts ordinarios, el contexto inyectado, el steering (guía a mitad de camino) y los eventos vivos del buzón. Los envoltorios de evento solo añaden datos de posición o resultado locales al evento; el agent loop (bucle de agent) solo añade estado de enrutado propiedad del driver mientras un ítem permanece pendiente.

<a id="the-request-header-event-requestheader"></a>

### El evento de cabecera de solicitud: `request/header`

El sobre de la solicitud (el `EpochHeader`: config de llamada + marcadores para valores por defecto suministrados por el adaptador + schemas de tool ensamblados) es estado de sesión registrado, así que cada solicitud de conversación es una función pura del registro (la Agent Note de reconstructibilidad). El prompt del sistema renderizado no forma parte de la cabecera: es historia derivada, el evento `system/message` en el nodo de superficie 0 y cualquier nodo de sistema posterior en la historia ([decisión](../../.agents/notes/implemented/architecture/2026-09-02-system-prompt-as-surface-node.md)), así que un cambio de prompt reemplaza o añade un nodo de sistema y deja la cabecera sin cambios. Un snapshot completo de `request/header` con razón `'initial'` o `'resume'` registra cada frontera de instancia del loop; una solicitud cambiada añade un snapshot con razón `'change'`; y un sobre sin cambios que comienza una serie de mensajes explícitamente declarada o que sigue a un reemplazo de superficie añade un snapshot con razón `'series'`. Un snapshot `'initial'`, `'resume'` o `'change'` porta `startsSeries: true` cuando esa solicitud también comienza una serie; la razón `'series'` ya registra ese hecho. Los turnos posteriores ordinarios de solo anexado, los pasos adicionales y los reintentos en la misma serie de mensajes de modelo heredan el último snapshot. `foldRequestHeader(events)` reconstruye la cabecera seleccionando el último snapshot. El evento no es un `SurfaceEventType`: no produce ningún mensaje LLM.

```ts type-equiv
/**
 * Logged request state outside derived history: call config and tools. The
 * system prompt is derived history — surface node 0, a `system/message` event.
 * The latest full `request/header` snapshot reconstructs the header; canonical
 * empty optional fields are absent.
 */
interface EpochHeader {
  /** The conversation's call configuration (provider, model, reasoning effort, and sampling scalars). */
  config: LlmCallConfig
  /** Effective config fields materialized from the exact adapter rather than proposed by a caller. */
  adapterDefaults?: LlmCallConfigAdapterDefaults
  /** Assembled tool schemas; absent for a tool-less request. */
  tools?: ToolSchema[]
  /** Retired request text; system prompts belong to system/message events.
   * @persistenceReserved
   */
  system?: never
}
```

La aceptación de eventos actual exige un `request/header.header` canónico: cualquier campo `system` está prohibido, y `tools: []` y `adapterDefaults: {}` deben omitirse. El contenido de mensaje de sistema de solo espacios en blanco, `config.stop: []` y las extensiones anidadas permanecen sin cambios. La siembra, el anexado y las lecturas de persistencia actuales rechazan las cabeceras no canónicas en lugar de normalizarlas silenciosamente; [la decisión del sobre V3](../../.agents/notes/implemented/architecture/2026-09-06-v3-canonical-session-envelopes.md) posee la conversión histórica. Los registros v0 heredados que contienen `request/header-delta` o su razón `fallback` de snapshot completo se rechazan en lugar de reproducirse incompletos.

### El evento de capacidad de ruta: `request/context`

Los metadatos de contexto de la ruta a la que se resolvió una solicitud son estado registrado separado, anexado junto a `request/header` dentro del mismo paso y solo cuando el proveedor, el modelo, la capacidad o el modo `systemPromptUpdate` difiere del registro anterior. Permanece fuera de `EpochHeader` porque ese tipo es el contrato de reconstrucción comparado campo a campo por `headerEquals`: la capacidad y el modo de actualización describen una ruta, no una entrada de solicitud, así que plegarlos dentro dejaría que un cambio de ruta se registrara como un `change` de sobre de solicitud y arrastraría metadatos del adaptador al invariante de reconstrucción del loop. Al igual que `request/header`, no es un `SurfaceEventType` y no produce mensaje LLM. `session.requestContext()` pliega incrementalmente el último registro; el agent loop lee el `systemPromptUpdate` de ese registro cuando decide si un prompt del sistema cambiado reemplaza el último nodo de sistema o se anexa tras la historia cacheada ([regla de decisión](../../packages/core/agent-loop/README.md#understand-the-implementation)). Una ruta cuyo adaptador no anuncia capacidad se registra con `contextWindow` ausente, de modo que el nuevo registro limpia la capacidad de una ruta anterior; una ruta sin modo de actualización declarado limpia igualmente el `systemPromptUpdate` de una ruta anterior.

```ts type-equiv
/** Registration-bound metadata for one resolved model route. */
interface RequestContext {
  /** Registered provider route the metadata belongs to. */
  provider: string
  /** Provider-owned model id the metadata belongs to. */
  model: string
  /** Maximum combined request and response context in tokens, when advertised. */
  contextWindow?: number
  /** `'in-history'` when the route reads the latest `system` message at any position as the effective system prompt. */
  systemPromptUpdate?: SystemPromptUpdate
}
```

## `SessionEvent<T>`: una entrada del registro

Una unión discriminada propia sobre `type` (no uniones `type`/`data` independientes), de modo que `switch (event.type)` estrecha `event.data` sin casts. `seq` es la posición monótona en el registro (`seq = log.length`); `time` es epoch ms.

```ts type-equiv
/** Sequence number of one existing event in a Session log. */
type SessionSeq = BrandedNumber<'SessionSeq'>
```

```ts type-equiv
/** A Session log gap, prefix length, or read offset, which may equal the event count. */
type SessionLogOffset = BrandedNumber<'SessionLogOffset'>
```

```ts type-equiv
/** Inclusive Session event watermark, or `-1` before any event exists. */
type SessionSeqCursor = SessionSeq | -1
```

```ts type-equiv
/** One existing Session event position, or explicit absence. */
type OptionalSessionSeq = SessionSeq | null
```

`SessionSeq(value)` y `SessionLogOffset(value)` admiten solo enteros seguros no negativos y rechazan el cero negativo. Añaden marcas en tiempo de compilación sin cambiar el número serializado; la aritmética devuelve un `number` ordinario que los llamantes deben volver a admitir mediante el constructor para su rol previsto.

```ts type-equiv
/**
 * One immutable entry in the session log.
 *
 * A proper discriminated union over `type` (not independent `type`/`data`
 * unions), so `switch (event.type)` narrows `event.data` without casts.
 *
 * The {@link sourceEventSeqs} and {@link surfaceOp} fields are conditional:
 * they only exist on {@link SurfaceEventType} variants (`system/message`, `user/message`,
 * `assistant/message`, `tool/result`).
 * Non-surface events (boundary markers, attempts, errors) never carry
 * surface metadata — the compiler enforces this at `Session.append()`
 * call sites.
 */
type SessionEvent<T extends SessionEventType = SessionEventType> = {
  [K in SessionEventType]: {
    type: K
    /** Monotonic sequence number within the session. */
    seq: SessionSeq
    /** Unix epoch milliseconds. */
    time: number
    data: SessionEventMap[K]
    /**
     * Marks an event a reader may safely skip when it does not recognize
     * `type`. Absent means required: a reader meeting an unrecognized type
     * without this marker MUST refuse to reconstruct the session instead of
     * silently dropping the event, because an unrecognized required event may
     * change how the rest of the log is interpreted. A writer sets `true` only
     * on purely informational records whose loss cannot affect reconstruction;
     * defaulting to required means a forgotten marker over-refuses (an
     * inconvenience) rather than silently resuming a gutted session.
     */
    ignorable?: true
  } & (K extends SurfaceEventType ? SurfaceIntent<K> : {
    surfaceOp?: never
    sourceEventSeqs?: never
  })
}[T]
```

`SessionEventType = keyof SessionEventMap`. Como `SessionEventMap` es extensible por merge, los switch sobre `SessionEvent` NO deben usar `assertNever`: una variante añadida por un plugin es un valor desconocido válido; hay que manejar los casos conocidos y caer por `default`.

Todo evento de superficie requiere `surfaceOp`; los eventos conocidos de solo registro prohíben ambos campos de metadatos de superficie. Los sobres nativos desconocidos u obsoletos marcados como ignorables permanecen opacos. `assistant/message` incrusta su flujo del proveedor y prohíbe `sourceEventSeqs`. Los eventos de superficie de sistema, usuario y tool pueden citar un conjunto completo no vacío de eventos anteriores únicos cuando la atribución de origen o la cobertura de reemplazo lo requiere. Un `tool/result` puede portar `data.error` solo cuando su mensaje tiene `isError: true`; la identidad de fallo permanece opcional para los resultados fallidos.

<a id="surface-types"></a>

## Tipos de superficie

Los tipos que producen mensajes (`SurfaceEventType`: `system/message`, `developer/message`, `user/message`, `assistant/message`, `tool/result`) portan metadatos de superficie que declaran cómo se unen a la superficie derivada ordenada. `system/message` contiene el prompt del sistema renderizado: el loop anexa el primero como nodo de superficie 0 y, cuando el prompt cambia, reemplaza exactamente el último nodo de sistema o anexa uno nuevo en una ruta en historia; el pliegue de superficie rechaza cualquier otro reemplazo que cubra un `system/message` en el nodo 0, mientras que un nodo de sistema posterior es historia ordinaria que un reemplazo de compactación puede solapar. Véase la [Agent Note de superficie de sesión](../../.agents/notes/implemented/architecture/2026-06-18-session-surface.md).

### `SurfaceEventType`: el subconjunto de tipos de evento que producen mensajes

```ts type-equiv
/**
 * The subset of {@link SessionEventType} values whose events produce LLM
 * messages and are eligible to appear on the ordered surface. Only these
 * event types may carry {@link SurfaceOp}; system, user, and tool events may also cite
 * earlier sources through {@link SessionEvent.sourceEventSeqs}.
 */
type SurfaceEventType =
  | 'system/message'
  | 'developer/message'
  | 'user/message'
  | 'assistant/message'
  | 'tool/result'
```

### `SurfaceOp`: cómo entró un evento en la superficie

```ts type-equiv
/**
 * How a session event entered the ordered surface. Only valid on
 * {@link SurfaceEventType} events.
 *
 * - `'append'`: added to the tail — normal path for user/assistant/tool
 *   messages.
 * - `{ op: 'replace', startSeq, endSeq }`: replaces surface nodes from `startSeq`
 *   (inclusive) through `endSeq` (inclusive) with this node. Both must exist as
 *   surface nodes in the current surface. `startSeq === endSeq` replaces a single
 *   node. The node's {@link SessionEvent.sourceEventSeqs} must include every
 *   shadowed surface node. Used by compaction; any surface-replacing producer
 *   may use it.
 */
type SurfaceOp =
  | 'append'
  | { op: 'replace'; startSeq: SessionSeq; endSeq: SessionSeq }
```

`'append'` es la ruta normal de anexado al final. `replace` contiene exactamente `op`, `startSeq` y `endSeq`, sin alias ni claves extra. Solapa el tramo inclusivo entre esas secuencias de eventos de superficie actuales e inserta el nuevo evento en su lugar; extremos iguales reemplazan una entrada. Los extremos deben preceder al evento reemplazante, pero su orden relativo es el orden de superficie, no el orden numérico de secuencia.

### `SurfaceIntent`: el parámetro de `session.append()`

```ts type-equiv
/**
 * Surface placement and cited source-event seqs for {@link Session.append}. Required on
 * message-producing events and forbidden on log-only events.
 */
type SurfaceIntent<T extends SurfaceEventType = SurfaceEventType> = {
  surfaceOp: SurfaceOp
} & (T extends 'assistant/message' ? {
  /** Assistant messages embed their provider stream instead of citing source events. */
  sourceEventSeqs?: never
} : {
  /** Complete non-empty set of known earlier source-event seqs. */
  sourceEventSeqs?: SessionSeq[]
})
```

Obligatorio para los eventos `SurfaceEventType`: todo evento que produce mensajes debe declarar cómo se une a la superficie, la única fuente de historia de modelo derivada. Un transcript (transcripción) orientado a humanos es la otra proyección y lee en su lugar los eventos de origen de anexado del registro, porque la superficie solapa deliberadamente los tramos que un reemplazo resume (`isAppendSurfaceEvent` en [dsh-session](../../packages/core/session/README.md)). Los tipos que no son de superficie lo rechazan en tiempo de compilación.

`assistant/message` no puede portar `sourceEventSeqs`; su `stream` posee la evidencia exacta del proveedor. Los demás eventos de superficie omiten el campo cuando no citan ningún evento anterior y usan una lista completa no vacía cuando sí lo hacen.

<a id="plugin-owned-message-projections"></a>
### Proyecciones de mensajes propiedad de plugins

Los plugins que cambian contenido marcan su declaración de evento con `@messageProjection` y registran una definición pura mediante `ctx.sessions.registerMessageProjection()`. Session valida la decisión completa mediante esa definición antes del commit, aplica sus actualizaciones de mensaje inmutables y avanza `contentGeneration`. Rechaza los intérpretes ausentes, también en la restauración y el plegado separado; descargar una definición usada bloquea las lecturas cacheadas. Los lectores separados pasan definiciones explícitas a `foldSurface(events, projections)` y aplican los `projectedMessages` mediante `deriveEventMessage()`. El catálogo de formatos instalado ensambla definiciones propias para lectores offline. El [plugin image-offload](compaction.es.md#image-offload) posee su evento específico de imágenes y su interpretación.

```ts type-equiv
/** Readonly history immediately before a message-projection event. */
interface SessionMessageProjectionContext {
  /** Current message-producing event sequences in model-visible order. */
  nodes: readonly SessionSeq[]
  /** Contiguous event window; entries at or beyond the candidate seq are not committed inputs. */
  events: readonly SessionEvent[]
  /** Absolute sequence of the window's first event. */
  baseSeq: SessionLogOffset
  /** Previously projected messages keyed by their original event sequences. */
  messages: ReadonlyMap<SessionSeq, Message>
}
```

```ts type-equiv
/** Pure interpretation of one plugin-owned event that changes existing message content. */
interface SessionMessageProjection<T extends SessionEventType = SessionEventType> {
  /** Event interpreted by this definition; declare it with `@messageProjection` in SessionEventMap. */
  type: T
  /**
   * Validate the complete durable decision before returning any updates. Preserve
   * message identities and publish immutable copies without mutating the input.
   * @param event - candidate event, not yet applied to the supplied history.
   * @param context - history preceding this decision.
   * @returns changed current messages keyed by their original sequences.
   * @throws when the durable decision cannot be applied to this history.
   */
  project(event: SessionEvent<T>, context: SessionMessageProjectionContext): ReadonlyMap<SessionSeq, Message>
}
```

### `SessionSurface`: la proyección viva de superficie de solo lectura

`Session.surface` devuelve la vista `SessionSurface` estable de la sesión. El mismo gestor incremental valida los candidatos de anexado antes del commit y avanza esta proyección a partir de los eventos cometidos; los llamantes pueden observar la pertenencia y la generación de reemplazo, pero no pueden invocar la validación.

`SurfaceManager(log, baseSeq?, projections?)` puede en su lugar plegar una ventana cargada contigua cuyo primer evento tiene la secuencia absoluta `baseSeq`. Cada evento permanece contiguo en ese espacio de secuencia absoluta, y un reemplazo que cruza la cabeza de la ventana falla porque su tramo declarado está ausente.

```ts type-equiv
/** Readonly live projection of the message-producing session events. */
interface SessionSurface {
  /** Current surface event sequences in model-visible order. */
  readonly nodes: readonly SessionSeq[]
  /** Monotonic count of committed positional replacements. */
  readonly replaceGeneration: number
  /** Monotonic count of committed replacements and plugin-owned message changes. */
  readonly contentGeneration: number
}
```

### `SurfaceFoldReplacement` y `SurfaceFoldResult`: una reproducción completa de la superficie

`foldSurface(events, projections)` devuelve las secuencias de eventos actuales separadas junto con las secuencias reales solapadas por cada tramo de reemplazo declarado. El gestor vivo usa las mismas transiciones sin retener el historial de reemplazos. Su `replaceGeneration` se incrementa con cada reemplazo cometido para que los consumidores incrementales puedan distinguir el crecimiento puro de cola de una reescritura.

```ts type-equiv
/** One replacement operation observed while folding a session surface. */
interface SurfaceFoldReplacement {
  /** Seq of the event that replaced the prior surface range. */
  seq: SessionSeq
  /** Declared inclusive start seq of the replaced surface range. */
  start: SessionSeq
  /** Declared inclusive end seq of the replaced surface range. */
  end: SessionSeq
  /** Actual surface entries removed by the operation, in surface order. */
  shadowedSeqs: SessionSeq[]
}
```

```ts type-equiv
/** Complete result of replaying the surface operations in a session log. */
interface SurfaceFoldResult {
  /** Current surface event sequences in model-visible order. */
  nodes: SessionSeq[]
  /** Replacement operations in event order. */
  replacements: SurfaceFoldReplacement[]
  /** Immutable projected messages, keyed by their original event sequences. */
  projectedMessages: ReadonlyMap<SessionSeq, Message>
}
```

## API pública de `Session`

La declaración sin cuerpos mantiene sincronizados con la fuente la factoría separada, los accesores de estado, el método de anexado y las proyecciones de historia de la clase plana. Las operaciones del almacén permanecen en la sección generada [`ctx.sessions`](#ctxsessions--sessionstore).

```ts public-api
/**
 * An event-sourced session: an append-only log of {@link SessionEvent}s.
 *
 * Plain class (not a Service) — create live instances via
 * `ctx.sessions.create()` and detached instances via {@link create}.
 * Seeding with an existing event log replays/forks a session.
 * @typert object
 */
declare class Session {
  /** The ordered surface over this session's event log. */
  get surface(): SessionSurface;
  /**
   * Detached, deep-frozen creation metadata (format version, cwd, lineage,
   * and whether fork history exists). Supplied by the store via `ctx.sessions.create()`. When a
   * `Session` is created without a store-owned header, a minimal header is
   * synthesized (stamped with the current {@link SESSION_FORMAT_VERSION}) so
   * `session.header` is always present. Kept out of the event log — it is a
   * storage concern, not replayable conversation state.
   */
  readonly header: SessionHeader;
  /** Number of leading events inherited from this Session's fork parent. */
  readonly inheritedEventCount: SessionLogOffset;
  /** The session identity, derived from its durable header's single copy. */
  get id(): SessionId;
  /**
   * The constructor seed length (0 without one), before any marker appended
   * during construction. Seed events never publish on `session/event`. A
   * marker appended before the store attaches occupies this seq without
   * publishing either; otherwise this seq is available for the next append.
   *
   * This in-process offset is not persisted. A fork seed can already contain
   * the child's inherited marker and synthetic closers, so its child-owned
   * history starts at {@link inheritedEventCount}, before this offset. A
   * resumed Session's seed contains its full stored log, while its inherited
   * count keeps the durable fork cut. Consumers needing complete canonical
   * history start at seq 0.
   */
  readonly firstLiveSeq: SessionLogOffset;
  /**
   * First event produced for this object lifecycle. A new fork includes its
   * child-owned seed marker and closers; a restored Session starts after its
   * complete stored prefix. This in-process capture offset is not persisted.
   */
  readonly firstLifecycleSeq: SessionLogOffset;

  /**
   * Create a detached session by validating and snapshotting borrowed seed
   * events and storage metadata.
   * @param id - session identity.
   * @param seed - optional borrowed replay or fork events.
   * @param header - optional borrowed storage metadata.
   * @param inheritedEventCount - exact fork-inherited prefix length for a seeded header.
   * @param projections - pure interpreters for plugin-owned message changes.
   * @returns a detached session.
   * @throws when a seed event requires a missing message interpreter or fails validation.
   */
  static create(
    id: SessionId,
    seed?: readonly SessionEvent[],
    header?: SessionHeader,
    inheritedEventCount?: SessionLogOffset,
    projections?: readonly SessionMessageProjection[],
    ): Session;
  /**
   * Restore a detached session by adopting an independently owned or deeply frozen seed.
   * Runtime-required event fields, event envelopes, sequence continuity, surface
   * transitions, and header fields are validated without copying or freezing events.
   * Embedded Assistant streams remain opaque until a stream consumer or storage
   * verifier reads them.
   * @param id - restored session identity.
   * @param seed - independently owned or deeply frozen events.
   * @param header - independently owned storage metadata.
   * @param inheritedEventCount - exact fork-inherited prefix length decoded from storage.
   * @param eventState - aliasing state carried from the operation that produced the seed.
   * @param projections - pure interpreters for plugin-owned message changes.
   * @returns a restored detached session.
   * @throws when a seed event requires a missing message interpreter or fails validation.
   */
  static fromRestore(
    id: SessionId,
    seed: readonly SessionEvent[],
    header: SessionHeader,
    inheritedEventCount: SessionLogOffset,
    eventState: SessionSeedEventState,
    projections?: readonly SessionMessageProjection[],
    ): Session;
  /**
   * Return the immutable event stored at one exact sequence number.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @param seq - event sequence number.
   * @returns the accepted event, or undefined when the log does not contain it.
   */
  eventAt(seq: SessionSeq): SessionEvent | undefined;
  /**
   * Materialize an immutable snapshot of a half-open event sequence range.
   * A full current snapshot is reused until the next append; every previously
   * returned snapshot remains stable after later appends.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @param fromSeq - non-negative inclusive sequence number; defaults to the log start.
   * @param toSeqExclusive - non-negative exclusive sequence number; defaults to the current end.
   * @returns a frozen array of the selected deeply frozen events.
   */
  snapshotEvents(
    fromSeq: SessionLogOffset = SessionLogOffset(0),
    toSeqExclusive: SessionLogOffset = this.seq,
    ): readonly SessionEvent[];
  /**
   * Return this Session's events after its fork-inherited prefix.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @returns a fresh array containing child-owned events in log order.
   */
  ownEvents(): readonly SessionEvent[];
  /**
   * Whether one existing event position is outside the fork-inherited prefix.
   * @param seq - event position in this Session.
   * @returns true when the event belongs to this Session rather than its parent.
   */
  isOwnSeq(seq: SessionSeq): boolean;
  /** The next event's sequence number — always the log length (the `seq = log.length` contiguity contract). */
  get seq(): SessionLogOffset;
  /**
   * Append one typed event to the log and synchronously notify observers via
   * the store-owned, module-private publication hooks. The hot path never blocks
   * on I/O — persistence plugins buffer asynchronously. Once the event enters
   * the log, the append is committed: observer failures are logged and
   * contained per listener, so they do not change the return value or prevent
   * later listeners from observing the same accepted event.
   *
   * @param type - The event type (key of {@link SessionEventMap}).
   * @param data - The event payload; must be JSON-serializable.
   * @param opts - Surface metadata: `surfaceOp` controls how the event enters
   *   the ordered surface; `sourceEventSeqs` lists the seq numbers of earlier
   *   events this one derives from. REQUIRED for
   *   {@link SurfaceEventType} events (every message-producing event must
   *   declare how it joins the surface, the sole source of derived model
   *   history) and
   *   rejected by the compiler for non-surface types like `turn/start` or
   *   `assistant/attempt`. Assistant messages embed their exact provider
   *   stream and cannot cite top-level source events.
   * @returns the logged event — its assigned `seq`/`time` plus the SNAPSHOT of
   *   `data` that entered the log, so reading `event.data` back sees the logged
   *   value, never the caller's still-mutable input.
   * @throws if `data` or surface metadata is not losslessly JSON-serializable
   *   (BigInt, function, symbol, undefined, negative zero, non-finite number,
   *   circular reference, sparse array, or an exotic object such as
   *   Map/Set/Date/class instance), or when the candidate violates the
   *   request-header empty-field or tool-error consistency rules, or the
   *   canonical surface contract (marker shape and eligibility, unique
   *   earlier source-event references, positional replacement validity, and complete
   *   shadowed-node coverage). One iterative pass reads, validates, and
   *   copies each nested value once, so a stateful getter cannot supply one value
   *   to validation and another to storage. The event log is the durable source
   *   of truth, so a bad event fails at the append site rather than later during
   *   a backend flush. A synchronous internal dispatch validation failure or an
   *   append reentered while this acceptance/publication boundary is open also
   *   rejects before the log changes.
   */
  append<T extends SessionEventType>(
    type: T,
    data: SessionEventMap[T],
    ...opts: T extends SurfaceEventType ? [opts: SurfaceIntent<T>] : []
    ): SessionEvent<T>;
  /**
   * The {@link EpochHeader} in force after the log's last header event — the
   * header the NEXT request will be compared against — or undefined before
   * the first `request/header` snapshot. The live, incrementally-maintained
   * form of `foldRequestHeader(session.snapshotEvents())`: each header event is folded
   * once, when first seen, so a per-step read costs O(new events).
   * @returns the folded header, or undefined when no header event exists yet.
   */
  requestHeader(): EpochHeader | undefined;
  /**
   * Return the latest resolved route metadata, or `undefined` before the first
   * `request/context` event. Each event is folded once.
   * @returns the latest immutable route metadata.
   */
  requestContext(): RequestContext | undefined;
  /**
   * Fold unseen committed events into capability-independent tool history.
   * Initial access reconstructs inherited history; later reads consume only new events.
   * @returns an immutable snapshot for LLM request projection, including historical addition definitions.
   */
  toolHistory(): ToolHistory;
  /**
   * Derive the LLM message history by walking the ordered sequences of
   * message-producing events maintained by `surfaceOp` markers. The
   * surface is the single source of derived history: every message-producing
   * append records its `surfaceOp`, so a raw event with no marker (a chunk, a
   * turn boundary) is correctly absent, and a compaction `replace` deletes the
   * shadowed nodes from the derivation. The projection rules are
   * {@link deriveEventMessage}, with logged message projections applied
   * without changing node membership or message identity.
   *
   * CACHED: pure tail growth costs O(new nodes); a replacement or message projection
   * ({@link SessionSurface.contentGeneration}) rebuilds. The returned array is
   * a fresh snapshot per call (later appends never grow an array a caller
   * already holds); the `Message` objects in it are SHARED and **deep-frozen**.
   * Unchanged content reuses frozen event data; projected blocks are frozen
   * derived copies. Consumers cannot mutate the log through either form.
   * @returns a fresh array of the shared, frozen derived history.
   */
  deriveMessages(): Message[];
  /**
   * Project one event with all committed message projections applied.
   * The original durable event remains unchanged.
   * @param event - the event to project.
   * @returns the derived message, or null when the event produces none.
   */
  deriveEventMessage(event: SessionEvent): Message | null;
}
```

## Historia derivada: `deriveMessages()` y `deriveEventMessage()`

`Session.deriveMessages()` proyecta el registro de eventos en el `Message[]` que ve el modelo: cacheado (cada nodo de superficie se proyecta una vez, al verse por primera vez; una reescritura de superficie reconstruye) y congelado (un array nuevo por llamada sobre mensajes compartidos y profundamente congelados, de modo que mutar la historia registrada a través de una proyección es irrepresentable). `deriveEventMessage(event)` es la función pura por nodo que aplica el pliegue: pública para que los reconstructores externos y el invariante de desarrollo proyecten un prefijo de registro con exactamente las mismas reglas y no puedan discrepar con la caché. Las reglas de proyección:

- `user/message` → un mensaje de usuario que porta el `content` exacto; un sobre opcional permanece como metadato de presentación solo de registro.
- `assistant/message` → un mensaje de asistente con el proveedor y el modelo que lo produjeron más estado de reproducción opcional privado del adaptador. Su flujo compacto incrustado es evidencia de reproducción, uso e UI, no un segundo mensaje. Un `assistant/message` de **contenido vacío** también se salta: un paso cortado por max-tokens sin contenido sigue registrando un `assistant/message` para conservar su flujo, uso, proveedor y modelo, pero un turno de asistente sin contenido no debe entrar en el transcript del proveedor.
- `tool/result` → un mensaje de rol tool de primera clase que porta el contenido de su resultado y la identidad de la llamada a tool.
- `user/message` (contexto inyectado, es decir, fuente no `user`) → un mensaje de rol usuario que porta su `content` literal en su posición cronológica; su fuente tipada nombra al productor y porta cualquier dato específico del productor.

Todo lo demás (`turn/*`, `step/*`, `assistant/attempt`, el `llm/retry` propiedad de plugins) es estructural y no se proyecta en un mensaje. La contabilidad de tokens expande el flujo incrustado en cada `assistant/message` o `assistant/attempt`, mientras que el `usage` de nivel superior del mensaje permanece como la autoridad del mensaje cometido cuando está presente. Por tanto, un intento fallido de solicitud de modelo conserva su uso del proveedor sin fabricar un mensaje de asistente. La validación lógica actual rechaza las cabeceras de solicitud y los mensajes de asistente que omiten proveedor/modelo en lugar de adivinar una ruta; las representaciones históricas soportadas se normalizan y validan por su frontera de formato adyacente antes de que exista una Session actual.

## API de fork de sesiones vivas

`ctx.sessions.create(id, { seed, meta })` es la primitiva de bajo nivel de reproducción/fork. Para los forks ordinarios de sesiones vivas, `SessionStore` expone una API de política:

- `fork(source, boundary?, childSessionId?)` acepta un objeto `Session` vivo o un `SessionId` vivo, selecciona los eventos de origen hasta la frontera `SessionSeq` inclusiva (por defecto: el último evento actual), exige que el prefijo seleccionado termine fuera de un turno abierto, y luego crea una sesión hija viva con eventos semilla clonados en profundidad, `parentSession`, `isSeeded: true`, el `inheritedEventCount` exacto y el `cwd` heredado.

Una `boundary` explícita permite a los llamantes hacer fork desde cualquier posición estable entre turnos, incluido un `turn/end` anterior o un evento posterior independiente de solo registro, aunque el origen tenga eventos más nuevos o un turno abierto en curso. La API rechaza un prefijo que termina dentro de un turno abierto en lugar de recortarlo silenciosamente. La comprobación de sanidad más amplia de la relación de ejecución permanece en el plugin `dsh-invariants` existente y en la ruta de reparación de persistencia en lugar de duplicarse en `fork()`. `dsh-subagent-fork-in-process` conserva su recorte de prefijo completado porque la delegación en tiempo de tool suele empezar con el turno padre abierto; la ramificación ordinaria de sesiones debería hacer explícita la frontera solicitada.

<a id="why-a-turn-ended-turnendreasonmap"></a>

## Por qué terminó un turno: `TurnEndReasonMap`

`turn/start` no tiene campo de disparador. El lote de `user/message` registrado anota lo que entró en cada paso, `llm/retry` registra la recuperación de la solicitud, y la inyección en reposo permanece pendiente hasta que una entrega despertadora alcanza un pre-paso posterior. Los turnos vivos conservan la [`AgentCancelCause`](core.es.md#the-agent-handle) tipada que detuvo el driver; la persistencia usa la causa adicional `{ kind: 'legacy' }` solo al importar un registro de cancelación grueso soportado que no almacenó a su llamante.

```ts type-equiv
/** Durable cancellation cause, including imports whose original coarse record carried no cause. */
type TurnEndCancelCause = AgentCancelCause | { readonly kind: 'legacy' }
```

```ts type-equiv
/**
 * Why a turn ended. Merge-extensible sum type.
 */
interface TurnEndReasonMap {
  completed: { kind: 'completed' }
  /** A cancellation request interrupted the live turn. */
  aborted: { kind: 'aborted'; reason: TurnEndCancelCause }

  blocked: { kind: 'blocked' }
  /**
   * The turn failed. `error` is always a structured failure: the `LlmError`
   * facts verbatim, or `{ message: errorChain(error), code: 'UNKNOWN' }`
   * flattened from any other error.
   */
  error: { kind: 'error'; error: LlmFailure }
  /** At least one step reached its output-token ceiling, even if a plugin continued the turn. */
  'max-tokens': { kind: 'max-tokens' }
  /**
   * A crash-orphaned turn was closed after the fact: agent-loop resume appends
   * this closer for a stored log whose last turn never ended, and session-query
   * synthesizes it on cold reads. The loop never emits this marker live, and
   * the events recorded before the crash remain intact.
   */
  interrupted: { kind: 'interrupted' }
  /**
   * Fork-seed construction closed a turn that was still open at the fork
   * boundary in the source session. Only fork seeds carry this marker — the
   * loop never emits it — and the source events before the boundary remain
   * intact in the child.
   */
  forked: { kind: 'forked' }
}
```

`max-tokens` refleja el `FinishReason` homónimo de la llamada al modelo: cualquier paso `max-tokens` en un turno hace que todo el turno termine `max-tokens` en lugar de `completed` (el hecho de haberse cortado gana a una continuación posterior), de modo que un consumidor puede distinguir una parada limpia de una truncada. La cancelación y los errores siguen siendo resultados distintos. El loop no emite ni `interrupted` ni `forked` en vivo: la recuperación tras fallo sintetiza `interrupted` (véase [persistence.md](persistence.es.md)), mientras que la construcción de semillas de fork sintetiza `forked`. El mapa es extensible por merge.

## Cerramiento de ejecución y eventos independientes

Un turno encierra una ejecución del loop de modelo, no todo el registro de la sesión. AgentLoop registra los eventos `user/message` inyectados solo desde los lotes de pre-paso que entran dentro de un turno; los eventos de solo registro propiedad de plugins pueden seguir apareciendo entre `turn/end` y el siguiente `turn/start`, consumiendo seqs de evento sin incrementar los números de turno. La persistencia admite cada evento aceptado contiguo en un lote durable acotado, mientras que la reparación tras fallo solo cierra un turno final genuinamente abierto. Un productor que necesita una barrera de durabilidad inmediata espera explícitamente `ctx.sessions.flush(session)`.

El compañero opcional `dsh-session/invariant` aplica las relaciones que posee el núcleo: numeración de turnos y pasos, cerramiento de eventos de ejecución y emparejamiento llamada/resultado de tool dentro del mismo paso. Las relaciones de eventos extensibles por merge pertenecen al plugin que las declara, así que el núcleo no rechaza un evento desconocido solo porque no haya ningún turno abierto. Véase [la decisión de eventos independientes](../../.agents/notes/implemented/simplification/2026-07-28-remove-synthetic-log-only-turns.md).

## La frontera de fin de semilla: `session/end-seed`

`buildForkSeed` anexa `session/end-seed { inherited: true }` en el corte exacto del prefijo heredado antes de añadir los cierres sintéticos de fork. El constructor de `Session` conserva ese marcador preparado o anexa uno cuando solo recibe el prefijo heredado. Una restauración conserva el marcador etiquetado y anexa un `session/end-seed {}` ordinario solo cuando su semilla almacenada completa no termina ya en un marcador. Ambas formas son solo de registro y no producen mensaje; solo el constructor y `buildForkSeed` pueden crearlas.

Para el linaje de fork, localizar el ÚLTIMO marcador cuyo payload porta `inherited: true`; la decodificación del formato actual lo exige exactamente cuando `SessionHeader.isSeeded` es true y deriva `inheritedEventCount` de su seq. Para la propiedad del ciclo de vida, localizar el último `session/end-seed` de cualquiera de las formas. Reabrir una semilla que ya termina en cualquier marcador no anexa otro marcador ordinario.

Existe porque la historia semilla y el trabajo vivo son por lo demás idénticos byte a byte, lo que derrota a cualquier plugin que posea un corchete de apertura/cierre independiente: un `compaction/start` sin pareja se lee igual tanto si el escritor cayó a mitad de la compactación como si está compactando ahora mismo. Un marcador de apertura anterior a `session/end-seed` vino de la semilla del constructor y pertenece a un ciclo de vida terminado, sea lo que sea que lo terminó (un fallo, un proceso sucesor o un fork desde un padre aún en ejecución), así que su propietario puede tratarlo como muerto. Eso solo cubre los corchetes que *esta* sesión heredó: una sesión viva concurrente que mantiene un corchete abierto sobre la misma historia tiene su propia frontera en otro lugar, así que tolerar escritores concurrentes necesita una señal de vivacidad más allá del registro. El núcleo escribe la frontera y no lee nada de ella: el vocabulario de un corchete permanece con su plugin propietario, razón por la que la reparación tras fallo cierra fronteras de turno/paso/tool y nunca `compaction/*`.

Los consumidores que ordenan las sesiones por actividad humana excluyen esta frontera: levantar una sesión no es trabajo, así que ordenar por la cola del registro haría flotar hacia arriba toda sesión abierta.

## Eventos solo de registro contribuidos por plugins

Un plugin puede fusionar por declaración tipos extra de `SessionEventMap`. Estos son **solo de registro**: NO son `SurfaceEventType` (no portan `surfaceOp` y no aportan nada a la historia derivada). Su propietario decide si pertenecen a un turno de ejecución abierto o pueden situarse entre turnos, y aplica cualquier relación en su propio compañero invariante. El [catálogo de eventos del registro de persistencia](../persistence-catalog.es.md) generado enumera cada evento del núcleo y contribuido por plugins; la semántica `compaction/*` del seam de compactación se trata en [compaction.md](compaction.es.md).

Cuando varios eventos de una misma familia propiedad de un plugin se ensamblan en un único nodo de Conversation del cliente web, cada evento de inicio, actualización, resultado, recurso o interrupción de esa familia porta o deriva independientemente el mismo id de negocio estable. Este requisito se aplica a familias de nodos correlacionadas, no a cada evento de sesión; permite al cliente agrupar cada evento sin adivinar por adyacencia ni escanear la historia. Véase el [subsistema Conversation](conversation.es.md).

Los pares `hook/invoked` / `hook/result` de los puentes de hooks (de `@deepseek-ai/dsh-hook-protocol`) se correlacionan por `handlerId`. `UserPromptSubmit`, `PreToolUse`, `PostToolUse` y `Stop` se disparan dentro del turno abierto del loop, así que sus registros `hook/*` están encerrados en el turno por construcción. `SessionStart` no recibe ningún registro `hook/*` porque se ejecuta antes del turno 1; su contexto permanece pendiente en el buzón hasta que una entrega despertadora abre un turno.

## Contrato de durabilidad

En qué confía un backend de persistencia: el registro durable persiste cada evento sin pérdidas, y cada intento del asistente es un `assistant/message` o `assistant/attempt` cuyo flujo compacto incrustado preserva los fragmentos temporizados originales. `seq` permanece contiguo a través de estos asentamientos y de todos los eventos intercalados. Un backend puede elegir su propio encuadre de almacenamiento para un lote de eventos siempre que el `read()` de un identificador devuelva los eventos anexados exactos; el JSONL actual escribe una fila por evento (véase [persistence.md](persistence.es.md)). Todo `event.data` debe ser serializable en JSON; `Session.append` lo aplica en el origen (lanzando ante datos no serializables), así que un evento malo nunca entra en el registro y `session.snapshotEvents()` siempre es igual a lo que un backend puede persistir. Añadir un tipo de evento que porta datos no serializables, corrompe el anidamiento de ejecución del núcleo o viola la relación declarada por su propietario es un cambio rupturista del formato en disco.

Los backends que consumen este contrato están en [persistence.md](persistence.es.md).

## Catálogo remoto y apertura del espacio de trabajo

`ModelCatalog` es el directorio de modelos de la generación Host devuelto por `session/modelCatalog`: porta el valor por defecto del despliegue, los ids de proveedor enrutables, los grupos de proveedores exitosos y los fallos de proveedor aislados. No se deriva de una sesión y permanece separado de las proyecciones de sesión.

`SessionOpenWorkspacePathRequest` porta una `path` absoluta o resuelta en el espacio de trabajo; el `action: "reveal"` opcional selecciona la navegación del gestor de archivos en lugar de la apertura con la aplicación por defecto. `SessionOpenWorkspacePathValue` confirma que el host aceptó el traspaso nativo. Un cliente consciente de la sesión resuelve las rutas relativas contra el cwd de su sesión actual cuando se conoce; el controlador entrega la ruta al abridor sin cambios e informa de las solicitudes inválidas, la cancelación y los fallos del abridor mediante el vocabulario de errores Remote de sesión.

El `application` opcional selecciona un manejador de archivos registrado sin cambiar el valor por defecto del sistema; `workspacePathApplications({ path })` devuelve los manejadores actuales, nombres, iconos y la selección por defecto tras la verificación de la ruta por el host.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsessioncontroller--sessioncontroller"></a>

### `ctx.sessionController` — `SessionController`

Host service backing the generated `ctx.remote.session` namespace.

```ts cordis-catalog
/**
 * Resolve or resume one ordinary Session for another Host API domain.
 * @param sessionId - Session identity whose Agent owns the operation.
 * @returns the live Agent or the stable Session-domain failure.
 */
resolveAgent(sessionId: SessionId): Promise<ApiSessionAgentResult>

/**
 * Inspect one attached or persisted Session without activating its Agent.
 * @param sessionId - durable Session identity.
 * @param signal - optional caller cancellation for persistence reads.
 * @returns the current attached state or persisted header and event prefix.
 */
inspect( sessionId: SessionId, signal?: AbortSignal, ): Promise<SessionInspection>

/**
 * Read all visible Session rows without resuming an Agent.
 * @param _request - reserved empty list request.
 * @param signal - cancellation for persistence reads.
 * @returns visible Session summaries ordered by activity.
 */
@Remote('list') async list(_request: SessionListRequest, signal: AbortSignal): Promise<SessionListValue>

/**
 * Search visible Session content without resuming an Agent.
 * @param request - literal message-content query.
 * @param signal - cancellation for list and search reads.
 * @returns authorized bounded Session search results.
 */
@Remote('search') search(request: SessionSearchRequest, signal: AbortSignal): Promise<SessionSearchValue>

/**
 * Create or idempotently adopt one ordinary Session.
 * @param request - requested identity, location, and Agent preset.
 * @returns the Session identity and resolved preset when configured.
 */
@Remote('create') create(request: SessionCreateRequest): Promise<SessionCreateValue>

/**
 * Select one Session-local model after explicitly resuming the Session; save the default in the background.
 * @param request - Session identity and requested model selection.
 * @returns the normalized selection installed for the Session, without waiting for default persistence.
 */
@Remote('selectModel') selectModel(request: SessionSelectModelRequest): Promise<SessionSelectModelValue>

/**
 * Select the first available account model after login when no provider API key is configured.
 * @returns after saving the first available model or retaining the existing default.
 */
@Remote async initializeDefaultModel(): Promise<void>

/**
 * Describe every currently routable model for Host-generation selectors.
 * @returns provider-grouped models, the deployment default, and isolated provider failures.
 */
@Remote('modelCatalog') modelCatalog(): Promise<ModelCatalog>

/**
 * Report whether this deployment can hand a Session workspace path to a native desktop.
 * @returns true when the matching open operation is available.
 */
@Remote canOpenWorkspacePath(): boolean

/**
 * Describe the serving desktop for authenticated file-action routes.
 * @returns Host name, configured availability, and platform-specific file-manager behavior.
 */
workspaceDesktop(): { name: string; available: boolean; fileManager: 'finder' | 'explorer' | 'directory' | null }

/**
 * Verify one path through the composed filesystem and open it on the Host desktop.
 * @param request - path after best-effort Session workspace resolution.
 * @param signal - caller lifetime; abort terminates the native command.
 * @returns confirmation after the native opener accepts the path.
 * @throws RemoteError when the request is invalid, has no verified Host mapping, is cancelled, or the opener fails.
 */
@Remote('openWorkspacePath') async openWorkspacePath( request: SessionOpenWorkspacePathRequest, signal: AbortSignal, ): Promise<SessionOpenWorkspacePathValue>

/**
 * Query current file handlers on the serving desktop without activating an Agent.
 * @param request - file path in Host filesystem syntax.
 * @param signal - caller lifetime, propagated to filesystem and desktop queries.
 * @returns OS application names, icons, and default selection; empty when desktop opening is unavailable.
 * @throws RemoteError when the path is invalid, the query is cancelled, or native discovery fails.
 */
@Remote('workspacePathApplications') async workspacePathApplications( request: { readonly path: string }, signal: AbortSignal, ): Promise<readonly SessionWorkspacePathApplication[]>

/**
 * Rename one Session after explicitly resuming it.
 * @param request - Session identity and proposed title.
 * @returns the accepted title and durable event sequence.
 */
@Remote('rename') rename(request: SessionRenameRequest): Promise<SessionRenameValue>

/**
 * Fork one cold-readable exact event prefix into a new Session. An omitted
 * boundary selects the latest completed-turn prefix; an open cut receives
 * synthetic fork closers.
 * @param request - source Session and optional exact inclusive event boundary.
 * @returns the new Session identity.
 */
@Remote('fork') fork(request: SessionForkRequest): Promise<SessionForkValue>

/**
 * Admit one prompt after explicitly resuming its Session.
 * @param request - Session identity, prompt content, source metadata, and delivery mode.
 * @param signal - caller cancellation before prompt admission begins.
 * @returns acknowledgement that the Agent accepted the prompt.
 */
@Remote('prompt') prompt(request: SessionPromptRequest, signal: AbortSignal): Promise<SessionPromptValue>

/**
 * Read one image proven reachable from the addressed Session log.
 * @param request - Session and attachment identities used for authorization.
 * @returns the durable attachment reference and base64-encoded bytes.
 */
@Remote('attachment') attachment(request: SessionAttachmentRequest): Promise<SessionAttachmentValue>

/**
 * Mutate one still-pending queue occurrence, resuming a cold Agent first.
 * @param request - Session, queue item, and requested mutation.
 * @returns acknowledgement that the queue mutation was applied.
 */
@Remote('updateQueue') updateQueue(request: SessionUpdateQueueRequest): Promise<SessionUpdateQueueValue>

/**
 * Cancel one active Agent turn without dropping its pending inbox.
 * @param request - Session whose active Agent turn is cancelled.
 * @returns acknowledgement that cancellation was requested.
 */
@Remote('cancel') cancel(request: SessionCancelRequest): SessionCancelValue

/**
 * Read one cold-safe, message-aligned Session history page.
 * @param request - durable address, backward cursor, and page budget.
 * @param signal - cancellation for persistence reads.
 * @returns one chronological page.
 */
@Remote('page') page(request: SessionPageRequest, signal: AbortSignal): Promise<SessionPage>

/**
 * Follow one Session log from its opening or resume cursor.
 * @param request - durable address and last committed sequence already held by the caller.
 * @param signal - cancellation owned by the Remote stream carrier.
 * @returns a complete opening snapshot followed by gap-free durable event
 *   frames and optional cursorless assistant-stream frames.
 */
@Remote({ mode: 'stream' }) follow(request: SessionFollowRequest, signal: AbortSignal): AsyncIterable<SessionFollowFrame>

/**
 * Read all registered projections without activating an Agent.
 * @param request - Session whose current values are required.
 * @param signal - cancellation for the Session observation.
 * @returns complete baseline, or null when the Session does not exist.
 */
@Remote('projections') async projections(request: SessionProjectionsRequest, signal: AbortSignal): Promise<SessionProjectionsValue>

/**
 * Stream a complete live-control baseline followed by replacement frames.
 * @param signal - cancellation owned by the Remote stream carrier.
 * @returns one complete baseline followed by live replacement frames.
 */
@Remote({ mode: 'stream' }) control(signal: AbortSignal): AsyncIterable<SessionControlFrame>
```

Types: [SessionId](core.es.md) · [SessionInspection](persistence.es.md) · [SessionSearchRequest](session-query.es.md)

Source: [`packages/api/session-controller/src/index.ts`](../../packages/api/session-controller/src/index.ts)

<a id="ctxsessions--sessionstore"></a>

### `ctx.sessions` — `SessionStore`

In-memory session store (`ctx.sessions`).

Persistence is intentionally not implemented here — the agent lifecycle attaches a session-log writer to each published session's write handle; a session published outside that lifecycle persists nothing.

```ts cordis-catalog
/**
 * Register one event interpreter for live creation, restore, and fork.
 * Disposing the contribution makes sessions that used it refuse further derivation.
 * @param projection - pure definition owned by the event's plugin.
 * @returns the fiber-owned disposer.
 * @throws when another definition already owns this event type.
 */
registerMessageProjection(projection: SessionMessageProjection): () => Promise<void>

/**
 * Create a session owned by the calling fiber: disposing that fiber stops
 * event notification and removes the session from the store. `options.seed`
 * populates the session with a copy of those events (replay/fork);
 * `options.meta` attaches creation metadata (validated absolute `cwd`, seed
 * and parent lineage, and delegation depth) as the immutable
 * {@link SessionHeader} (the store fills `version`/`id`/`createdAt`).
 *
 * For an agent whose session must be torn down IN ORDER with its loop (so the
 * loop's final events are published before the store attachment ends), do NOT use this
 * — fold the session lifecycle into the agent's own effect via
 * {@link prepare} + {@link enter} + {@link announce} (see
 * `dsh-agent-loop`'s creation transaction).
 *
 * @param id - the session id; omitted, the store mints `session-<n>`.
 * @param options - seed events and/or creation metadata for the header.
 * @returns the live session, already entered and announced.
 * @throws if a session with `id` already exists, metadata is not a plain
 *   lossless-JSON record with valid scalar fields, or `meta.cwd` is a
 *   non-absolute path (storage backends key directories off it).
 */
create(id?: SessionId, options?: CreateSessionOptions): Session

/**
 * Build a session WITHOUT entering it into the store — validate the id/cwd and
 * construct the {@link Session} (with its immutable {@link SessionHeader}).
 * Pairs with {@link enter} + {@link announce}: a caller that owns a composite
 * `ctx.effect` (the agent factory) folds the session lifecycle into that ONE
 * effect so a fiber unload tears the session + agent down as a single ORDERED
 * chain rather than as racing sibling effects — which would remove the publication hooks
 * before the driver's closing events commit, dropping them.
 *
 * @param id - the session id; omitted, the store mints `session-<n>`.
 * @param options - seed events and/or creation metadata for the header. With
 *   `eventState`, every seed event is either independently owned or any
 *   shared value is deeply frozen; {@link Session.fromRestore} validates and
 *   adopts those values without copying or freezing them.
 * @returns the constructed session, NOT yet in the store.
 * @throws if a session with `id` already exists, metadata is not a plain
 *   lossless-JSON record with valid scalar fields, or `meta.cwd` is a
 *   non-absolute path.
 */
prepare(id?: SessionId, options?: PrepareSessionOptions): Session

/**
 * Enter a {@link prepare}d session into the store: install the module-private
 * append publication hooks and add it to the store. Returns the DETACH
 * disposer (hooks + store removal). Does NOT emit `session/created` —
 * the caller yields this disposer inside its effect and THEN calls
 * {@link announce}, so a throwing `session/created` listener rolls the attach
 * back instead of leaking it.
 *
 * Re-checks the id for a duplicate: `prepare` and `enter` are public
 * cross-package primitives and a caller may interleave arbitrary work (or
 * another create) between them, so a stale prepared session must NOT overwrite
 * a live store entry of the same id — its detach disposer would later delete
 * the REAL session. The {@link create} convenience and the agent factory call
 * the two back-to-back so they never trip this, but the public API cannot
 * assume that.
 *
 * @param session - a {@link prepare}d session not yet in the store.
 * @returns the detach disposer (publication hooks + store removal). When called from
 *   a synchronous `session/created` listener, removal and disposal wait until
 *   that creation dispatch unwinds.
 * @throws if a session with this id is already in the store.
 */
enter(session: Session): () => void

/** Emit `session/created` exactly once for an {@link enter}ed session (with
 * the carrier {@link enter} captured). Separate from {@link enter} so the
 * caller can yield the detach disposer first (rollback safety — see
 * {@link enter}).
 * @param session - the entered session to announce to listeners.
 * @throws if the session is not live or its announcement already began,
 *   including a reentrant call from a creation listener. */
announce(session: Session): void

/**
 * Dispatch the awaited `session/flush` durability checkpoint for `session`,
 * with the carrier captured at {@link enter}. THE flush entry point: the
 * store owns the carrier, so callers (the checkpoint policy's per-request
 * barrier, goal-round-driver's idle checkpoint, teardown drains, and consumers
 * that flush themselves before reading storage) must come through here
 * rather than dispatch a raw `ctx.parallel('session/flush', …)` — one owner,
 * one spelling, and the scoped-dispatch invariant can pin it.
 * @param session - the session whose buffered events must reach durable storage.
 * @returns whether at least one durability listener participated, after every
 *   listener has settled successfully.
 * @throws the first registered listener failure after every listener settles.
 */
async flush(session: Session): Promise<boolean>

/**
 * Look up a live session.
 * @param id - the session id to look up.
 * @returns the session, or undefined when no live session has that id.
 */
get(id: SessionId): Session | undefined

/**
 * All live sessions, in creation order.
 * @returns a fresh array; mutating it does not affect the store.
 */
list(): Session[]

/**
 * Create a live child session from an exact prefix of a live source.
 * `boundary` is an inclusive source event seq; omitted means the source's
 * current last event. An open tail receives synthetic tool results and
 * step/turn closers with the forked cause. Closed steps and turns remain
 * unchanged, including any failed tool calls already missing results.
 * `inheritedEventCount` counts only copied source events, excluding these closers.
 *
 * @param source - Live source session object or id.
 * @param boundary - Inclusive source event seq to fork through; omitted means
 *   the source's current last event, and omitted on an empty source forks an
 *   empty child.
 * @param childSessionId - Optional child session id; omitted delegates to
 *   `SessionStore`'s id policy.
 * @returns The created live child session.
 */
fork(source: SessionForkSource, boundary?: SessionSeq, childSessionId?: SessionId): Session
```

Types: [CreateSessionOptions](persistence.es.md) · [PrepareSessionOptions](persistence.es.md) · [SessionId](core.es.md)

Source: [`packages/core/session/src/index.ts`](../../packages/core/session/src/index.ts)

<a id="api-session-events"></a>

### `api-session/*` events

<a id="api-sessionactivity--emit"></a>

#### `api-session/activity` — emit

One user-authored durable message advanced Session list activity.

```ts cordis-catalog
/**
 * One user-authored durable message advanced Session list activity.
 * @mode emit
 * @param sessionId - addressed Session identity.
 * @param updatedAt - durable message time used for list ordering.
 */
'api-session/activity'(sessionId: SessionId, updatedAt: number): void
```

Types: [SessionId](core.es.md)

Source: [`packages/api/session-controller/src/types.ts`](../../packages/api/session-controller/src/types.ts)

<a id="api-sessionadded--emit"></a>

#### `api-session/added` — emit

A Session became visible or its Agent was created or disposed. Consumers upsert the summary and replace its current running and availability state.

```ts cordis-catalog
/**
 * A Session became visible or its Agent was created or disposed.
 * Consumers upsert the summary and replace its current running and availability state.
 * @mode emit
 * @param summary - current list row for the Session.
 */
'api-session/added'(summary: SessionSummary): void
```

Source: [`packages/api/session-controller/src/types.ts`](../../packages/api/session-controller/src/types.ts)

<a id="api-sessionerror--emit"></a>

#### `api-session/error` — emit

One Agent failed outside a durable turn position.

```ts cordis-catalog
/**
 * One Agent failed outside a durable turn position.
 * @mode emit
 * @param sessionId - Agent and Session identity.
 * @param message - user-safe failure chain.
 */
'api-session/error'(sessionId: SessionId, message: string): void
```

Types: [SessionId](core.es.md)

Source: [`packages/api/session-controller/src/types.ts`](../../packages/api/session-controller/src/types.ts)

<a id="api-sessionremoved--emit"></a>

#### `api-session/removed` — emit

A Session left the live Host registry.

```ts cordis-catalog
/**
 * A Session left the live Host registry.
 * @mode emit
 * @param sessionId - removed Session identity.
 */
'api-session/removed'(sessionId: SessionId): void
```

Types: [SessionId](core.es.md)

Source: [`packages/api/session-controller/src/types.ts`](../../packages/api/session-controller/src/types.ts)

<a id="api-sessionstatus--emit"></a>

#### `api-session/status` — emit

One Agent changed running state.

```ts cordis-catalog
/**
 * One Agent changed running state.
 * @mode emit
 * @param sessionId - Agent and Session identity.
 * @param running - whether the Agent is running.
 */
'api-session/status'(sessionId: SessionId, running: boolean): void
```

Types: [SessionId](core.es.md)

Source: [`packages/api/session-controller/src/types.ts`](../../packages/api/session-controller/src/types.ts)

<a id="session-events"></a>

### `session/*` events

<a id="sessioncreated--emit"></a>

#### `session/created` — emit

Creation announcement during session publication. A synchronous throw vetoes and rolls back with a paired disposal; detach requested during dispatch is deferred. A returned-promise rejection is logged but cannot retroactively veto this synchronous boundary. Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only sessions entered through that agent's context.

```ts cordis-catalog
/**
 * Creation announcement during session publication. A synchronous throw vetoes and rolls
 * back with a paired disposal; detach requested during dispatch is deferred.
 * A returned-promise rejection is logged but cannot retroactively veto this
 * synchronous boundary.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners
 * receive only sessions entered through that agent's context.
 * @param session - the session just entered and announced.
 * @dshScopeScan unsupported
 * @mode emit
 */
'session/created'(this: Scoped<Session>, session: Session): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/session/src/index.ts`](../../packages/core/session/src/index.ts)

<a id="sessiondisposed--emit"></a>

#### `session/disposed` — emit

Emitted once when an announced session leaves the store, including publication rollback, but never for an entry whose creation announcement did not begin. Listener failures are logged and contained. Scope-filtered dispatch (`@deepseek-ai/dsh-scope`) reuses the owner scope.

```ts cordis-catalog
/**
 * Emitted once when an announced session leaves the store, including
 * publication rollback, but never for an entry whose creation announcement
 * did not begin. Listener failures are logged and contained.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`) reuses the owner scope.
 * @param session - the session that is no longer live in the store.
 * @dshScopeScan unsupported
 * @mode emit
 */
'session/disposed'(this: Scoped<Session>, session: Session): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/session/src/index.ts`](../../packages/core/session/src/index.ts)

<a id="sessionevent--emit"></a>

#### `session/event` — emit

Post-commit, fire-and-forget append feed. The listener snapshot resolves before the log push, but callbacks run after it; observer failures are logged and contained without making the committed append fail. Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only events from sessions entered through that agent's context.

```ts cordis-catalog
/**
 * Post-commit, fire-and-forget append feed. The listener snapshot resolves
 * before the log push, but callbacks run after it; observer failures are
 * logged and contained without making the committed append fail.
 * Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners
 * receive only events from sessions entered through that agent's context.
 * @param session - the session whose log grew.
 * @param event - the appended event, exactly as recorded.
 * @dshScopeScan unsupported
 * @mode emit
 */
'session/event'(this: Scoped<Session>, session: Session, event: SessionEvent): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/session/src/index.ts`](../../packages/core/session/src/index.ts)

<a id="sessionflush--parallel"></a>

#### `session/flush` — parallel

Awaited parallel durability checkpoint: every listener runs and the caller awaits all of them, with no waterfall veto. Scope-filtered dispatch (`@deepseek-ai/dsh-scope`) reuses the session's owner scope.

```ts cordis-catalog
/**
 * Awaited parallel durability checkpoint: every listener runs and the
 * caller awaits all of them, with no waterfall veto. Scope-filtered dispatch
 * (`@deepseek-ai/dsh-scope`) reuses the session's owner scope.
 * @param session - the session whose buffered events must reach durable storage.
 * @dshScopeScan unsupported
 * @mode parallel
 */
'session/flush'(this: Scoped<Session>, session: Session): Promise<void> | void
```

Types: [Scoped](scope.es.md)

Source: [`packages/core/session/src/index.ts`](../../packages/core/session/src/index.ts)
<!-- END GENERATED cordis-surface -->
