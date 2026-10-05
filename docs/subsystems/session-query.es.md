# Consulta de sesión

[English](session-query.md) | Español

Vocabulario de consulta sobre el corpus de sesiones lógico con preferencia por las vivas. El [paquete Service Definition](../../packages/session-query/session-query) posee las lecturas exactas, la precedencia de fuentes, el trazado de relaciones, la extracción semántica y los filtros independientes del proveedor, mientras que el [proveedor SQLite](../../packages/session-query/session-query-sqlite) posee el ciclo de vida concreto del índice de texto completo.

Fuente: [`packages/session-query/session-query/src/types.ts`](../../packages/session-query/session-query/src/types.ts)

## Registros lógicos

`SessionRecord` lo devuelve el listado entre corpus. Expone la disponibilidad de la fuente independientemente de la cabecera clonada con preferencia por la viva. `SessionEventRecord` es una proyección ligera del registro en bruto; la clasificación usa las mismas transiciones de `foldSurface()` que la derivación del historial del modelo.

```ts type-equiv
/** Whether an event is current model context, replaced context, or raw-log-only. */
type SessionEventSurface = 'current' | 'shadowed' | 'log-only'
```

```ts type-equiv
/** Lightweight identity and source availability for one logical session. */
interface SessionRecord {
  /** Cloned session header selected from the live-preferred corpus. */
  header: SessionHeader
  /** Whether the id currently exists in `ctx.sessions`. */
  live: boolean
  /** Whether the active persistence backend currently lists the id, including a created-but-unmaterialized session it already observes. */
  persisted: boolean
}
```

`SessionLogSnapshot` es el registro en bruto completo, separado y validado por reproducción, que usa la comprobación previa de resume. `SessionSurfaceSnapshot` es una observación de superficie de lectura exacta y no una suscripción retenida.

```ts type-equiv
/** One validated detached observation of a logical session's complete raw log. */
interface SessionLogSnapshot {
  /** Cloned session header selected from the same observation as `events`. */
  session: SessionHeader
  /** Exact number of fork-inherited events in the observed log. */
  inheritedEventCount: SessionLogOffset
  /** Cloned contiguous raw events after in-memory interrupted-turn balancing and replay validation. */
  events: SessionEvent[]
}
```

```ts type-equiv
/** One atomic live-preferred observation of a session's current model surface. */
interface SessionSurfaceSnapshot {
  /** Cloned session header selected from the same corpus observation as `events`. */
  session: SessionHeader
  /** Exact number of fork-inherited events in the observed log. */
  inheritedEventCount: SessionLogOffset
  /** Highest raw-log seq included in the observation, or `null` for an empty log. */
  capturedThroughSeq: OptionalSessionSeq
  /** Cloned current surface events in model-history order. */
  events: SurfaceEvent[]
}
```

`SessionTitleObservation` aplica la misma regla de observación atómica al fold del título, de modo que un consumidor de autorización puede validar la cabecera fuente que suministró el título. Las lecturas por lotes devuelven un `SessionTitleObservationResult` ordenado por cada id único solicitado: los fallos operativos permanecen locales a ese id, mientras que la cancelación rechaza la operación completa.

```ts type-equiv
/** Latest folded title bound to the same session-header observation. */
interface SessionTitleObservation {
  /** Cloned header selected with the event log used for the title fold. */
  session: SessionHeader
  /** Latest title snapshot, absent when the observed log has no title. */
  title?: SessionTitleSnapshot
}
```

```ts type-equiv
/** One ordered result from a batch title observation. */
type SessionTitleObservationResult =
  | {
    /** Requested session id. */
    sessionId: SessionId
    /** Successful atomic header/title observation. */
    status: 'fulfilled'
    /** Header and optional latest title from one logical source. */
    value: SessionTitleObservation
  }
  | {
    /** Requested session id. */
    sessionId: SessionId
    /** Operational failure isolated to this session. */
    status: 'rejected'
    /** Original failure from logical-source resolution or title folding. */
    reason: unknown
  }
```

```ts type-equiv
/** Lightweight metadata for one event within a logical session. */
interface SessionEventRecord {
  /** Session that owns the event. */
  sessionId: SessionId
  /** Monotonic event seq within the session. */
  seq: SessionSeq
  /** Discriminant of the session event. */
  type: SessionEventType
  /** Event timestamp in Unix epoch milliseconds. */
  time: number
  /** Event placement in the folded session surface. */
  surface: SessionEventSurface
}
```

## Filtros y documentos independientes del proveedor

Los arrays de filtros de sesión y de eventos se combinan con AND; los valores dentro de una cláusula de lista se combinan con OR. Los rangos son inclusivos. La cláusula `text` de eventos es un escaneo de expresión regular literal Unicode insensible a mayúsculas y flexible con los espacios en blanco sobre el texto semántico extraído, independiente de los proveedores de texto completo.

```ts type-equiv
/**
 * One logical-session predicate. A filter array is ANDed; `values` within a
 * clause are ORed.
 */
type SessionResultFilter =
  | { kind: 'id'; values: readonly SessionId[] }
  | { kind: 'cwd'; values: readonly (string | null)[] }
  | ({ kind: 'created-at' } & SessionResultRange)
  | { kind: 'parent'; values: readonly (SessionId | null)[] }
  | { kind: 'availability'; values: readonly SessionAvailability[] }
```

```ts type-equiv
/**
 * One event predicate. A filter array is ANDed; list-valued clauses are ORed.
 * Text is a literal, case-insensitive, whitespace-flexible semantic-text scan.
 */
type SessionEventResultFilter =
  | ({ kind: 'seq' } & SessionResultRange)
  | ({ kind: 'time' } & SessionResultRange)
  | { kind: 'type'; values: readonly SessionEventType[] }
  | { kind: 'surface'; values: readonly SessionEventSurface[] }
  | { kind: 'text'; text: string }
```

```ts type-equiv
/** Searchable semantic document derived from one session event. */
interface SessionEventSearchDocument extends SessionEventRecord {
  /** First-party semantic text used by scan filters and full-text indexes. */
  text: string
}
```

`ctx.sessionQuery.filterSessions(filters)` aplica `SessionResultFilter` al corpus lógico completo; `ctx.sessionQuery.filterEvents(sessionId, filters)` devuelve los documentos coincidentes en orden de seq ascendente. Los mensajes, las llamadas/resultados de tools, los todos y el detalle de fallos/estado contribuyen texto semántico; los bloques de razonamiento, los prompts bloqueados, los eventos estructurales y los fragmentos de stream no.

## Páginas de búsqueda de texto completo

El seam combinado `ctx.sessionQuery` tiene dos ámbitos de texto completo. `searchSessions()` agrupa el corpus por el evento coincidente más fuerte; `searchEvents()` busca en una sesión. Las solicitudes vinculan un cursor opaco a la consulta normalizada, los filtros de metadatos y el límite. El escaneo de texto de eventos está intencionadamente ausente de los filtros de metadatos del proveedor.

```ts type-equiv
/** Provider-owned opaque continuation token returned by session search. */
type SessionSearchCursor = Branded<'SessionSearchCursor'>
```

```ts type-equiv
/** Cross-session full-text search request. */
interface SessionSearchRequest {
  /** Full-text query interpreted as data, never executable FTS syntax. */
  query: string
  /** Logical-session predicates applied before event ranking. */
  sessionFilters?: readonly SessionResultFilter[]
  /** Event predicates applied before event ranking. */
  eventFilters?: readonly SessionEventMetadataFilter[]
  /** Maximum sessions in this page. */
  limit?: number
  /** Opaque cursor returned for the identical normalized request. */
  cursor?: SessionSearchCursor
}
```

```ts type-equiv
/** Within-session full-text search request. */
interface SessionEventSearchRequest {
  /** Session whose live-preferred logical log is searched. */
  sessionId: SessionId
  /** Full-text query interpreted as data, never executable FTS syntax. */
  query: string
  /** Event predicates applied before ranking. */
  filters?: readonly SessionEventMetadataFilter[]
  /** Maximum events in this page. */
  limit?: number
  /** Opaque cursor returned for the identical normalized request. */
  cursor?: SessionSearchCursor
}
```

```ts type-equiv
/** One cursor-paginated result page. */
interface SessionSearchPage<T> {
  /** Results for this page in contract-defined order. */
  items: readonly T[]
  /** Opaque continuation cursor, absent on the final page. */
  nextCursor?: SessionSearchCursor
}
```

A diferencia de los aciertos agrupados entre sesiones, una búsqueda dentro de una sesión también debe exponer la cabecera de destino observada aunque la página no contenga aciertos.

```ts type-equiv
/** Event-search results bound to the indexed target-session observation. */
interface SessionEventSearchPage extends SessionSearchPage<SessionEventSearchHit> {
  /** Cloned target header from the same indexed generation as `items`. */
  session: SessionHeader
}
```

```ts type-equiv
/** One event full-text search hit with a bounded plain-text excerpt. */
interface SessionEventSearchHit extends SessionEventRecord {
  /** Plain text excerpt selected around the match. */
  snippet: string
}
```

```ts type-equiv
/** One grouped cross-session hit, ranked by its strongest matching event. */
interface SessionSearchHit extends SessionRecord {
  /** Strongest matching event for this session. */
  bestMatch: SessionEventSearchHit
}
```

## Linaje de sesión

`SessionLineageTrace` porta los padres conocidos en orden del inmediato hacia afuera y un bosque de descendientes directos anidados recursivamente. El discriminante de completitud hace mutuamente excluyentes una raíz conocida y un padre ausente.

```ts type-equiv
/** Recursive descendant node in a session-lineage trace. */
interface SessionLineageNode {
  /** Detached logical-corpus record for this descendant. */
  session: SessionRecord
  /** Direct children, each carrying its own recursive descendants. */
  descendants: SessionLineageNode[]
}
```

```ts type-equiv
/** Known ancestry and descendants for one logical session. */
type SessionLineageTrace = {
  /** Detached record for the session that was traced. */
  target: SessionRecord
  /** Known parents from the immediate parent outward. */
  ancestors: SessionRecord[]
  /** Complete known descendant trees rooted at the target's direct children. */
  descendants: SessionLineageNode[]
} & (
  | {
    /** The complete parent chain is present in the logical corpus. */
    complete: true
    /** Detached record at the top of the complete lineage. */
    root: SessionRecord
  }
  | {
    /** The parent chain leaves the visible logical corpus. */
    complete: false
    /** First parent id that is not present in the logical corpus. */
    unresolvedParentId: SessionId
  }
)
```

## Lecturas acotadas de eventos

La solicitud direcciona un seq en bruto y recuentos de vecinos opcionales. El resultado porta un `SessionHeader` en lugar de marcas de disponibilidad para que un destino vivo conocido pueda permanecer independiente de la salud de la persistencia.

```ts type-equiv
/** Request for one event plus raw neighboring log context. */
interface SessionEventReadRequest {
  /** Session that owns the target event. */
  sessionId: SessionId
  /** Target event seq. */
  seq: SessionSeq
  /** Number of preceding raw events to include. */
  before?: number
  /** Number of following raw events to include. */
  after?: number
}
```

```ts type-equiv
/** Full target event and a bounded raw-log window. */
interface SessionEventWindow {
  /** Cloned header for the live-preferred source read. */
  session: SessionHeader
  /** Exact number of fork-inherited events in the observed log. */
  inheritedEventCount: SessionLogOffset
  /** Full cloned target event. */
  target: SessionEvent
  /** Full cloned events from `startSeq` through `endSeq`. */
  events: SessionEvent[]
  /** First seq included in `events`. */
  startSeq: SessionSeq
  /** Last seq included in `events`. */
  endSeq: SessionSeq
}
```

## Relaciones entre eventos

Las trazas de eventos distinguen el reemplazo posicional en superficie de los eventos citados como fuentes. Cada lista de seqs contiene enlaces directos excepto `replacementChain`, que sigue los reemplazantes inmediatos desde el destino hasta el reemplazo posicional final.

```ts type-equiv
/** Request for direct surface replacements and relationships to cited source events around one event. */
interface SessionEventTraceRequest {
  /** Session that owns the target event. */
  sessionId: SessionId
  /** Target event seq. */
  seq: SessionSeq
}
```

```ts type-equiv
/** Direct surface replacements and relationships to cited source events for one event. */
interface SessionEventTrace {
  /** Lightweight target record. */
  target: SessionEventRecord
  /** Immediate positional replacement event, when the target was shadowed. */
  replacedBy?: SessionSeq
  /** Positional replacers from the immediate replacement to the final replacement. */
  replacementChain: SessionSeq[]
  /** Surface nodes directly removed when the target itself performed a replacement. */
  replacedEventSeqs: SessionSeq[]
  /** Earlier events cited directly as sources, in their recorded order. */
  sourceEventSeqs: SessionSeq[]
  /** Later events that directly cite the target as a source, in log order. */
  derivedEventSeqs: SessionSeq[]
}
```

```ts type-equiv
/** Event relationships bound to the same session-header observation. */
interface SessionEventTraceObservation extends SessionEventTrace {
  /** Cloned header selected with the event log used for the trace. */
  session: SessionHeader
}
```

## Errores

La unión cerrada de códigos distingue la validación de solicitudes, los destinos ausentes, los registros de superficie malformados, el fallo del backend opcional, la búsqueda deshabilitada por el despliegue y los metadatos de fuente contradictorios.

```ts type-equiv
/** Stable machine-routable failure taxonomy for session reads, traces, and search. */
type SessionQueryErrorCode =
  | 'SESSION_QUERY_ABORTED'
  | 'SESSION_QUERY_CORRUPT_SESSION'
  | 'SESSION_QUERY_EVENT_NOT_FOUND'
  | 'SESSION_QUERY_INDEX_FAILED'
  | 'SESSION_QUERY_INVALID_CONFIG'
  | 'SESSION_QUERY_INVALID_CURSOR'
  | 'SESSION_QUERY_INVALID_FILTER'
  | 'SESSION_QUERY_INVALID_LIMIT'
  | 'SESSION_QUERY_INVALID_QUERY'
  | 'SESSION_QUERY_INVALID_LINEAGE'
  | 'SESSION_QUERY_INVALID_SURFACE'
  | 'SESSION_QUERY_INVALID_WINDOW'
  | 'SESSION_QUERY_PERSISTENCE_FAILED'
  | 'SESSION_QUERY_SEARCH_DISABLED'
  | 'SESSION_QUERY_SESSION_NOT_FOUND'
  | 'SESSION_QUERY_STALE_CURSOR'
  | 'SESSION_QUERY_SOURCE_CONFLICT'
```

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsessionquery--sessionqueryengine-abstract-seam"></a>

### `ctx.sessionQuery` — `SessionQueryEngine` (abstract seam)

Unified live-preferred session query service.

Exact reads, filters, and traces are backend-independent concrete behavior. A backend implements full-text observation, reconciliation, ranking, cursor generations, and query execution on the same `ctx.sessionQuery` service.

```ts cordis-catalog
/**
 * Observe one exact live or prepared Session without a persistence listing preflight.
 * @param sessionId - logical Session identity.
 * @param options - cancellation and projection selection for this read.
 * @returns a caller-owned observation lease.
 */
observeSession( sessionId: SessionId, options: SessionObservationOptions = {}, ): Promise<SessionObservation>

/**
 * Search the live-preferred logical corpus and group by session.
 * @param request - query text, metadata filters, page size, and cursor.
 * @param exec - optional cancellation control.
 * @returns session hits ranked by their strongest matching event.
 */
abstract searchSessions( request: SessionSearchRequest, exec?: SessionSearchExecContext, ): Promise<SessionSearchPage<SessionSearchHit>>

/**
 * Search events within one live-preferred logical session.
 * @param request - target session, query text, filters, page size, and cursor.
 * @param exec - optional cancellation control.
 * @returns matching event hits and their target header from one indexed generation.
 */
abstract searchEvents( request: SessionEventSearchRequest, exec?: SessionSearchExecContext, ): Promise<SessionEventSearchPage>

/**
 * List the complete logical corpus using live-preferred records.
 * @param signal - optional cancellation for persistence listing.
 * @returns deterministic newest-first cloned session records.
 */
listSessions(signal?: AbortSignal): Promise<SessionRecord[]>

/**
 * Read and replay-validate one complete logical session log without making it live.
 * @param sessionId - live or persisted session id to read.
 * @returns cloned header and complete raw event log from one observation.
 * @throws when persistence, header compatibility, or replay validation fails.
 */
async readSession(sessionId: SessionId): Promise<SessionLogSnapshot>

/**
 * Filter the complete logical corpus with provider-independent predicates.
 * @param filters - ANDed session metadata and availability clauses.
 * @param signal - optional cancellation for persistence listing.
 * @returns matching cloned records in deterministic newest-first order.
 */
async filterSessions( filters: readonly SessionResultFilter[], signal?: AbortSignal, ): Promise<SessionRecord[]>

/**
 * Fold the latest log-backed title from one live-preferred logical session.
 * @param sessionId - live or persisted session id to read.
 * @param signal - optional cancellation for source resolution and title folding.
 * @returns latest title snapshot, or `undefined` when the log has no title event.
 */
async readTitle( sessionId: SessionId, signal?: AbortSignal, ): Promise<SessionTitleSnapshot | undefined>

/**
 * Fold the latest title and return its source header from one corpus observation.
 * @param sessionId - live or persisted session id to read.
 * @param signal - optional cancellation for source resolution and title folding.
 * @returns cloned source header and optional latest title snapshot.
 */
async readTitleSnapshot( sessionId: SessionId, signal?: AbortSignal, ): Promise<SessionTitleObservation>

/**
 * Fold titles for unique sessions from one cancellable corpus observation.
 *
 * Results preserve first-occurrence input order. Operational failures stay
 * isolated per session, while cancellation rejects the complete operation.
 * @param sessionIds - live or persisted session ids to observe.
 * @param signal - optional cancellation shared by all source reads.
 * @returns one fulfilled or rejected result per unique requested id.
 */
async readTitleSnapshots( sessionIds: readonly SessionId[], signal?: AbortSignal, ): Promise<SessionTitleObservationResult[]>

/**
 * List lightweight raw-log event records for one logical session.
 * @param sessionId - live-preferred session id to read.
 * @returns event records in ascending seq order.
 */
async listEvents(sessionId: SessionId): Promise<SessionEventRecord[]>

/**
 * Scan first-party semantic event documents with provider-independent filters.
 * @param sessionId - live-preferred session id to scan.
 * @param filters - ANDed metadata and literal-text predicates.
 * @returns matching semantic documents in ascending seq order.
 */
async filterEvents( sessionId: SessionId, filters: readonly SessionEventResultFilter[], ): Promise<SessionEventSearchDocument[]>

/**
 * Read one session's complete current model surface from one corpus observation.
 * @param sessionId - live-preferred session id to read.
 * @returns cloned header, current surface, and the last sequence number included in the raw-log capture.
 * @throws when source resolution fails or the session surface is invalid.
 */
async readSurface(sessionId: SessionId): Promise<SessionSurfaceSnapshot>

/**
 * Trace known ancestry and descendants from one corpus observation.
 * @param sessionId - logical session id to trace.
 * @param signal - optional cancellation for persistence listing.
 * @returns a complete lineage or the first parent that could not be resolved.
 * @throws when corpus resolution fails, the target is absent, or its known ancestry cycles.
 */
async traceSession(sessionId: SessionId, signal?: AbortSignal): Promise<SessionLineageTrace>

/**
 * Trace one event's direct positional replacements and cited source events.
 * @param request - target session id and event seq.
 * @param signal - optional cancellation for persisted source resolution.
 * @returns source header, direct links, and the target's positional replacement chain.
 * @throws when source resolution fails, the target is absent, or surface/source-event validation fails.
 */
async traceEvent(request: SessionEventTraceRequest, signal?: AbortSignal): Promise<SessionEventTraceObservation>

/**
 * Read one full event plus a bounded raw-log context window.
 * @param request - target session/seq and context sizes.
 * @param signal - optional cancellation for persisted source resolution.
 * @returns cloned target and neighboring events.
 */
async readEvent(request: SessionEventReadRequest, signal?: AbortSignal): Promise<SessionEventWindow>
```

Types: [SessionId](core.es.md) · [SessionTitleSnapshot](session-title.es.md)

Source: [`packages/session-query/session-query/src/index.ts`](../../packages/session-query/session-query/src/index.ts)
<!-- END GENERATED cordis-surface -->
