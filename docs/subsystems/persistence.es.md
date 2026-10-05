# Persistencia de sesión

[English](persistence.md) | Español

El **seam de durabilidad** del registro de eventos. [session.md](session.es.md) describe la `Session` en memoria: el registro de `SessionEvent` de solo anexado que es la fuente de verdad. Esta página describe cómo se hace durable ese registro: el servicio abstracto `SessionPersistence`, su modelo de proveedores y el backend JSONL entregado, el punto de control de flush, la recuperación tras fallo y la cabecera de metadatos que viaja junto al registro. El vocabulario de eventos que porta el registro se enumera, miembro a miembro, en el [catálogo de eventos del registro de persistencia](../persistence-catalog.es.md) generado.

El seam es un [capability seam](../../.agents/notes/implemented/architecture/2026-06-13-capability-seams.md): un servicio abstracto ([dsh-session-persistence](../../packages/session/session-persistence), `ctx.sessionPersistence`) que expone `create`/`open`/`stat`/`list` sobre el `SessionEvent` existente, **sin un tipo de evento persistido paralelo**, donde `create` y `open` devuelven un `SessionHandle` por sesión (`read`/`append`/`flush`/`close`) que porta todo el acceso al registro y la propiedad de escritor único. El repositorio entrega [dsh-session-persistence-jsonl](../../packages/session/session-persistence-jsonl) como su proveedor; los proveedores externos al árbol pueden implementar el mismo contrato de servicio. Véanse la [Agent Note de persistencia basada en identificadores](../../.agents/notes/implemented/architecture/2026-08-27-handle-based-session-persistence.md) y la [Agent Note de session-persistence](../../.agents/notes/implemented/architecture/2026-06-14-session-persistence.md).

## `SessionHandle`: un canal abierto sobre una sesión almacenada

Toda lectura y escritura del registro fluye a través de un identificador (handle), nunca a través de métodos de servicio direccionados por id: el identificador es la única puerta que guarda la concesión de escritura entre procesos. Una lectura devuelve un segmento externo propiedad del llamante y el estado de aliasing establecido por el productor de sus valores de evento. Un único tipo de identificador sirve para ambos accesos: una mutación sobre un identificador `read` es un `SessionReadOnlyError` en runtime en lugar de una división tipada, y la propiedad de escritor único dentro del proceso hace que un segundo `open(id, 'write')` se rechace con `SessionAlreadyOwnedError` mientras haya un propietario activo.

```ts type-equiv
/** One persistence event slice returned by {@link SessionHandle.read}. */
interface SessionHandleReadResult {
  /**
   * Whether event values are exclusively owned or shared only after deep
   * freezing. Slicing preserves the producer's state even when no events remain.
   */
  readonly eventState: SessionSeedEventState
  /** Event values in a caller-owned outer array. */
  readonly events: readonly SessionEvent[]
}
```

```ts type-equiv
/**
 * One open channel onto a stored session. A handle is single-owner state, not
 * a shared service: `read` never backtracks below what this handle already
 * observed, a `write` handle reads its own successful appends, and `close()`
 * is the one teardown (idempotent, uncancellable; `Symbol.asyncDispose`
 * delegates to it). Every operation on a closed handle rejects with
 * `SessionHandleClosedError`.
 *
 * Freshness across handles: once an `append` or `flush` resolves on a write
 * handle, every read STARTED afterwards on the same backend instance — on any
 * handle, or through `stat`/`list` — observes at least that prefix.
 * Reads concurrent with a mutation carry no ordering promise beyond the valid
 * contiguous prefix.
 */
interface SessionHandle extends AsyncDisposable {
  /** The stored session this handle addresses. */
  readonly id: SessionId
  /** The immutable stored header, fixed at `create`/`open`. */
  readonly header: SessionHeader
  /**
   * Exact fork-inherited prefix length stored with the log; `0` when
   * `header.isSeeded` is false. Storage metadata paired with the header for
   * every body read, never part of the replayable event log.
   */
  readonly inheritedEventCount: SessionLogOffset
  /** Whether this handle may mutate the log. */
  readonly access: SessionAccess

  /**
   * Read a slice of the valid contiguous logical log. The slice is a legal log
   * prefix segment: a torn physical tail is never returned, and repeated reads
   * on this handle never observe an older state than a prior read.
   * @param offset - first logical event seq to include; defaults to `0`.
   * @param length - maximum number of events to return; defaults to the rest
   *   of the log. An offset at or past the end returns an empty list.
   * @param options - optional cancellation.
   * @returns the caller-owned outer slice plus the ownership state of its event values.
   */
  read(offset?: number, length?: number, options?: SessionHandleReadOptions): Promise<SessionHandleReadResult>

  /**
   * Append a contiguous batch continuing the current logical end. The first
   * event's `seq` MUST equal the stored next-seq; committed events are never
   * rewritten. Persistence is best-effort: on resolution the batch is
   * accepted, ordered, and visible to reads on this backend instance, but
   * only a resolved {@link flush} promises it survives a crash — a backend
   * may buffer or batch physical writes behind append. Rejects with
   * `SessionReadOnlyError` on a read handle and `SessionOwnershipLostError`
   * when write ownership is gone.
   * @param events - the contiguous batch, in seq order.
   * @param options - optional cancellation observed before the write starts.
   */
  append(events: readonly SessionEvent[], options?: SessionHandleAppendOptions): Promise<void>

  /**
   * The durability barrier — the one operation that promises storage: on
   * resolution every acknowledged append is durable and the session is
   * materialized for other processes; an empty created session becomes
   * durably listable here. Callers that must survive a crash flush; a backend
   * whose `append` already persists on resolution treats this as
   * materialize-if-needed. Rejects with `SessionReadOnlyError` on a read
   * handle.
   * @param options - optional cancellation observed before the barrier starts.
   */
  flush(options?: SessionHandleFlushOptions): Promise<void>

  /**
   * Release the handle: a read handle frees local resources; a write handle
   * completes pending durability and releases write ownership. Idempotent,
   * asynchronous, and deliberately not cancellable.
   */
  close(): Promise<void>
}
```

Una sesión creada es observable en este proceso desde el momento en que `create` se resuelve, mientras que un backend puede diferir la materialización física (una optimización pura) hasta el primer `append` o `flush`; los demás procesos solo ven sesiones materializadas, y una sesión que nunca se materializó antes de un fallo nunca existió.

## El punto de control de flush

`session/event` es una notificación *síncrona*; el backend montado la enruta por id de sesión a la ventana acotada de escritura diferida del identificador de escritura activo sin bloquear al productor (el backend instala estos listeners una vez, porque la persistencia ya impone un identificador de escritura activo por id). El primer evento pendiente inicia una ventana interna fija de procesamiento por lotes, y los eventos posteriores se unen sin reiniciar su plazo. La expiración inicia un `append` durable a través del identificador de escritura de la sesión; los eventos admitidos durante esa escritura reciben su propio plazo y forman un lote de seguimiento. `session/flush` cancela la espera y drena hasta la quiescencia, de modo que el loop sigue usándolo como punto de control de ordenación y observación de errores antes de reclamar el siguiente turno ordinario. Una escritura en segundo plano rechazada conserva sus eventos en orden, pausa la ruta automática y se informa a través del logger; el siguiente flush explícito reintenta y se rechaza ruidosamente hacia su llamante. `session/disposed` realiza el mismo drenado final y cierra el identificador, y el propio `close()` drena el buffer enrutado a través del almacenamiento aún abierto, de modo que el barrido de cierre del desmontaje del backend no pierde nada. La ventana solo acota la espera intencional de procesamiento por lotes, no la planificación del bucle de eventos ni la latencia de durabilidad del backend.

## La recuperación tras fallo conserva un turno interrumpido

Un registro que falló a mitad de turno termina con un `turn/start` abierto y sin `turn/end`. La persistencia **no** lo trunca ni lo repara: un solo turno puede ser enorme en una tarea de largo horizonte (muchos pasos, salidas de tool grandes), y esos eventos se anexaron de forma durable antes del fallo. Devuelve el registro contiguo físicamente válido; solo se descarta el fragmento incompleto de una cola física rasgada, perteneciente a un append que nunca se resolvió: los registros completos recuperados de ella (el backend JSONL decodifica parcialmente un frame Zstandard rasgado) los reescribe de forma durable la ruta de escritura antes del primer append nuevo del identificador. La reparación es trabajo del lector: resume (agent-loop) lee el registro almacenado a través de su identificador de escritura, calcula `interruptedTurnClosers` (errores de tool ausentes, cualquier `step/end` abierto y un `turn/end { reason: { kind: 'interrupted' } }` sintético) y los anexa a través del mismo identificador como un lote ordinario antes de publicar la sesión. `interrupted` es la única `TurnEndReason` que ningún loop emite (véase [session.md](session.es.md#why-a-turn-ended-turnendreasonmap)).

Por tanto, la reparación solo escribe bajo propiedad de escritura: el identificador de escritura de una sesión viva lo posee el dueño de su ciclo de vida, de modo que un `open(id, 'write')` concurrente se rechaza con `SessionAlreadyOwnedError` en lugar de hacer competir la reparación contra un turno vivo. Los observadores de solo lectura (session-query) equilibran un registro frío interrumpido con los mismos cierres solo en memoria, sin escribir nada de vuelta.

La observación de solo lectura es `open(id, 'read')`: el identificador sirve segmentos de prefijo contiguo validados, nunca una cola rasgada, y las lecturas repetidas sobre un identificador nunca observan un estado más antiguo que una lectura anterior. No hay caché de sesiones preparadas en el lado de la persistencia: session-query posee su caché de lectura en frío, indexando una sesión fría equilibrada por id mediante el token de cambio `stat().revision` y releyendo solo cuando el token cambia. La [Agent Note de persistencia basada en identificadores](../../.agents/notes/implemented/architecture/2026-08-27-handle-based-session-persistence.md) posee este ciclo de vida; el [registro de preparación de sesión](../../.agents/notes/archived/architecture/2026-08-05-session-preparation.md) archivado documenta la decisión original de `SessionPreparation` en la frontera de publicación.

## `SessionLocation`: destino de artefacto para diagnósticos de rechazo

`SessionLocation` no es una consulta orientada al consumidor: el acceso al registro pasa por el `read` de un identificador de sesión. Sobrevive solo como diagnóstico de rechazo, permitiendo que un `SessionFormatUnsupportedError` nombre el registro en bruto que una compilación se negó a interpretar. JSONL suministra la ruta absoluta del transcript dentro de su directorio de proyecto/sesión; un backend sin un artefacto por sesión no suministra nada.

```ts type-equiv
/**
 * A backend-resolved, per-session local artifact location. Carried only by
 * refusal diagnostics ({@link SessionFormatUnsupportedError}) so a user can
 * find the raw log a build refused to interpret; it is not a consumer-facing
 * query — log access goes through a session handle's `read`.
 */
interface SessionLocation {
  /** Backend-specific artifact kind, for example `jsonl`. */
  readonly kind: string
  /** Absolute path to this session's backend-owned artifact. */
  readonly path: string
}
```

<a id="sessionheader--metadata-beside-the-log"></a>

## `SessionHeader`: metadatos junto al registro

Los metadatos por sesión viajan **separados** del registro de eventos: la cabecera porta la versión de formato, el cwd y el bit de linaje `isSeeded`, mientras que los valores de almacenamiento con cuerpo portan el corte heredado exacto junto a ella. Ninguno pertenece a `SessionEventMap` ni llega a `deriveMessages()`. La cabecera lógica se adjunta a través de `session.header`; la sesión expone su corte como `inheritedEventCount`.

Fuente: [`packages/core/session/src/types.ts`](../../packages/core/session/src/types.ts)

```ts type-equiv
/**
 * Immutable validated storage metadata, kept outside the conversation event log.
 */
interface SessionHeader {
  /**
   * Current logical format version, stamped from {@link SESSION_FORMAT_VERSION}.
   * Historical physical headers are translated before entering this interface.
   */
  readonly version: typeof SESSION_FORMAT_VERSION
  /** The session's id (mirrors the {@link Session}'s id). */
  readonly id: SessionId
  /** Non-negative safe-integer Unix epoch milliseconds when the session was created. */
  readonly createdAt: number
  /** Absolute working directory the session was created in (if any). */
  readonly cwd?: string
  /** The session this one was forked from (seed lineage), if any. */
  readonly parentSession?: SessionId
  /**
   * Whether this Session contains a fork-inherited event prefix. The exact prefix
   * length is Session state rather than ordinary header metadata.
   */
  readonly isSeeded: boolean
  /**
   * Coarse product classification for a session created as a subagent child.
   * This is presentation metadata, not proof that the child is continuable.
   */
  readonly origin?: 'subagent'
  /**
   * Delegation depth: absent (zero) for a top-level session, parent depth + 1
   * for a subagent child. Persisted so a recursion budget survives restart and
   * resume — a runtime-only depth would reset a resumed child to top-level.
   */
  readonly delegationDepth?: number
  /**
   * Id of the agent preset this session's agent was composed from, when the
   * deployment composes per session. Durable because the preset decides the
   * session's tools and prompt: a resume that restored a different composition
   * would replay history the model can no longer act on.
   */
  readonly agentPreset?: string
}
```

## Rechazo de formato: registros que una compilación no puede leer fielmente

Un backend rechaza con `SessionFormatUnsupportedError` un registro que no puede interpretar fielmente, a diferencia de `SessionPersistenceCorruptionError`, porque nada está dañado. `stat` y `list` clasifican la generación canónica más alta y traducen una cabecera histórica soportada sin leer ni mutar su cuerpo. Las llamadas `open` históricas comparten una preparación de migración por sesión antes de devolver los valores lógicos actuales y dejan cada ruta, byte e inode de origen sin cambios. El proveedor JSONL devuelve un identificador de lectura a partir de ese resultado en memoria sin publicar; una apertura de escritura mantiene su reclamación de escritor único y su concesión de archivo mientras reutiliza la preparación, publica exclusivamente la generación actual final y solo entonces devuelve el identificador escribible. Una generación máxima futura se rechaza incluso cuando queda una generación legible más antigua. La restauración del formato actual conserva las extensiones instaladas y los eventos desconocidos que portan `ignorable: true`; la migración histórica v0/v1/v2 rechaza un tipo desconocido aunque esté marcado como ignorable. El mensaje anexa la ruta del registro en bruto seleccionada cuando el backend guarda un artefacto por sesión. Un backend externo al árbol debe imponer valores de identificador equivalentes solo actuales y rechazos conscientes de la dirección en su entrada de formato físico. La [decisión de migración de formatos publicados](../../.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md) posee las reglas de cadena y de publicación inmutable.

## `CreateSessionOptions`: siembra y metadatos

Crear una `Session` a través del almacén toma una `seed` (reproducción inicial o historial de fork), un `inheritedEventCount` exacto opcional y `meta` (los campos a nivel de almacenamiento que el almacén pliega en un `SessionHeader`). El almacén rellena `version`/`id` y da un valor por defecto a `createdAt`; el llamante puede suministrar el `cwd` absoluto validado, el linaje `parentSession`, el bit de linaje `isSeeded`, el `origin` grueso opcional, `delegationDepth`, `agentPreset` y un `createdAt` existente. Una creación con semilla requiere una semilla explícita igual a su prefijo heredado y un corte exacto; el constructor anexa en ese corte el marcador etiquetado de fin de semilla propiedad del hijo antes de que la preparación añada eventos propiedad del hijo. `origin: 'subagent'` permite a la navegación del producto ocultar filas hijas duplicadas; no prueba que un descriptor sea válido ni que el hijo pueda reanudarse.

```ts type-equiv
/**
 * Options for creating a {@link Session} via the store. `seed` replays/forks
 * an existing event log; `meta` carries the caller-supplied storage fields the
 * store folds into a {@link SessionHeader}.
 */
interface CreateSessionOptions {
  /** Initial replay or fork history supplied at construction. */
  readonly seed?: readonly SessionEvent[]
  /**
   * Exact fork-inherited prefix length when `meta.isSeeded` is true. The
   * constructor appends the child-owned tagged marker at the cut unless
   * the seed already includes it followed by child-owned fork closers.
   */
  readonly inheritedEventCount?: SessionLogOffset
  /**
   * Storage metadata read once before publication. `isSeeded` marks fork
   * lineage; supplying replay history alone does not make it inherited.
   */
  readonly meta?: {
    readonly cwd?: string
    readonly parentSession?: SessionId
    readonly createdAt?: number
    readonly isSeeded?: boolean
    readonly origin?: 'subagent'
    readonly delegationDepth?: number
    readonly agentPreset?: string
  }
}
```

La reproducción/fork es por tanto `ctx.agents.create({ sessionId, seed, meta })`: un fork suministra además `inheritedEventCount` con `meta.isSeeded: true`, solo persisten las sesiones publicadas por el agent loop, y el loop almacena la semilla a través del identificador de escritura de la nueva sesión antes de la publicación; reanudar una sesión *persistida* en un agent vivo es `ctx.agents.resume({ resumeSessionId })`.

## Propiedad de la preparación y la restauración

`SessionStore.prepare()` acepta opciones ordinarias de creación o una semilla adoptable a través de `RestoredSessionOptions`. Su `eventState` indica si los valores de evento son de propiedad independiente o compartidos solo tras congelación profunda; el productor establece ese estado, y el segmentado no infiere un estado distinto a partir de la longitud del resultado. La restauración valida y adopta esos valores sin otra pasada de copia o congelación. `SessionPreparation` posee entonces la sesión exacta no publicada hasta la publicación o la reversión; el dispose es síncrono e idempotente. El resume de agent-loop lee este resultado a través del identificador de escritura de la sesión y anexa `interruptedTurnClosers` de propiedad independiente antes de la preparación.

```ts type-equiv
/**
 * Aliasing state of an adoptable Session seed. `shared-frozen` permits deeply
 * frozen aliases plus independently owned unfrozen values in the same seed.
 */
type SessionSeedEventState = 'detached' | 'shared-frozen'
```

```ts type-equiv
/**
 * Adoptable storage values transferred to {@link SessionStore.prepare}
 * without another copy or freeze pass.
 */
interface RestoredSessionOptions {
  /** Events that are independently owned or already deeply frozen. */
  readonly seed: SessionEvent[]
  /** Independently owned storage metadata to validate and freeze in place. */
  readonly meta: SessionHeader
  /** Exact number of fork-inherited leading events decoded from storage. */
  readonly inheritedEventCount: SessionLogOffset
  /** Aliasing state carried from the operation that produced the seed. */
  readonly eventState: SessionSeedEventState
}
```

```ts type-equiv
/** Inputs accepted while constructing an unpublished Session. */
type PrepareSessionOptions =
  | (CreateSessionOptions & { readonly eventState?: undefined })
  | RestoredSessionOptions
```

```ts type-equiv
/** Options for a preparation whose provider retains unpublished state. */
interface SessionPreparationOptions {
  /** Release provider-owned state when the Session was not published. */
  readonly release?: () => void
}
```

```ts public-api
/**
 * One exact unpublished Session and the provider state that keeps it usable.
 * Disposal is synchronous and idempotent. Providers decide whether release
 * returns the Session to a cache or discards it; publication may consume that
 * state before disposal, making the callback a no-op.
 */
declare class SessionPreparation implements Disposable {
  /** The exact Session to use for setup and publication. */
  readonly session: Session;
  /**
   * Wrap an unpublished Session in one preparation lifetime.
   * @param session - exact unpublished Session.
   * @param options - optional provider release behavior.
   * @returns a preparation disposed after publication or rollback.
   */
  static create(session: Session, options?: SessionPreparationOptions): SessionPreparation;
  /** Release provider state once when this preparation leaves its caller. */
  [Symbol.dispose](): void;
}
```

## Revisiones ligeras de la fuente

Los consumidores de modelos de lectura derivados comparan una revisión opaca barata antes de cargar un registro de eventos completo. La revisión es un token de cambio por instancia de backend de `stat`/`list`: revisiones iguales pueden tratarse como un registro sin cambios; revisiones distintas no prometen nada, y el vaivén de propiedad de escritura nunca cambia una. session-query indexa su caché de lectura en frío con ella; el token no interviene en open, read ni resume.

```ts type-equiv
/**
 * Backend-owned token that identifies both one storage source and one revision
 * of a persisted session log.
 */
type SessionPersistenceRevision = Branded<'SessionPersistenceRevision'>
```

```ts type-equiv
/**
 * Lightweight stored-session observation returned by {@link SessionPersistence.stat}
 * and {@link SessionPersistence.list} without reading the full event log.
 */
interface SessionPersistenceSnapshot {
  /** Detached metadata for one stored session. */
  readonly header: SessionHeader
  /** Opaque change token; see {@link SessionPersistence.stat}. */
  readonly revision: SessionPersistenceRevision
  /** Logical event count, when the backend can provide it cheaply from metadata; otherwise absent. */
  readonly eventCount?: number
  /** Physical artifact byte size, when the backend can provide it cheaply (JSONL); otherwise absent. */
  readonly sizeBytes?: number
}
```

Los campos opcionales `eventCount`/`sizeBytes` siguen siendo observaciones baratas del backend para consumidores que los necesitan explícitamente. El listado de sesiones no usa ninguno de los dos campos para abrir registros fríos: solo lee cabeceras más pistas de la caché de proyecciones con identidad comprobada, de modo que una actualización de la caché o del formato de sesión nunca convierte el arranque en un escaneo del cuerpo.

## El backend

El proveedor entregado implementa el contrato abstracto `SessionPersistence` (`create`/`open`/`stat`/`list`, con `SessionHandle` por sesión que portan `read`/`append`/`flush`/`close` y cancelación opcional en todo) y supera la suite de contrato de persistencia compartida:

- **[dsh-session-persistence-jsonl](../../packages/session/session-persistence-jsonl)**: un registro JSONL lógico de solo anexado por sesión, almacenado como frames Zstandard concatenados con checksum por defecto o líneas en bruto por configuración, con materialización atómica segura ante fallos, appends con `fsync` por lote y truncado de cola rasgada antes del primer append nuevo. `stat`/`list` portan `sizeBytes` y una revisión derivada de `fs.stat` a mejor esfuerzo.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsessionpersistence--sessionpersistence-abstract-seam"></a>

### `ctx.sessionPersistence` — `SessionPersistence` (abstract seam)

Durable append-only session storage addressed through per-session handles.

Storage semantics shared by every backend: events are contiguous from seq 0 and never rewritten; a torn physical tail is never returned to a reader and is truncated by the write path before its first append; reads validate current-format records only and refuse unknown vocabulary fail-closed. `append` persists best-effort; `flush` — per handle or service-wide — is the durability barrier.

Visibility: a created session is observable through `stat`/`list`/`open` in this process from the moment `create` resolves, even while a backend defers physical materialization (a pure optimization); other processes see the session only once it materializes, and a session that never materialized before a crash never existed. `SessionHandle.flush` forces materialization.

Freshness: once an `append` or `flush` resolves, reads started afterwards on this backend instance observe at least that prefix.

```ts cordis-catalog
/**
 * Create a new stored session and take its write ownership.
 * @param header - the immutable header (id, version, cwd, lineage) to store.
 * @param options - optional cancellation.
 * @returns a `write` handle owned by the caller; close it to release ownership.
 * @throws {SessionAlreadyExistsError} when the id already exists.
 */
abstract create(header: SessionHeader, options?: SessionPersistenceCreateOptions): Promise<SessionHandle>

/**
 * Open an existing stored session.
 *
 * `read` never takes ownership and works while another handle (or process)
 * holds write ownership. `write` atomically claims single-writer ownership;
 * an existing active owner rejects.
 * @param id - the stored session to open.
 * @param access - `read` or `write`.
 * @param options - optional cancellation.
 * @returns the open handle.
 * @throws {SessionPersistenceNotFoundError} when the session does not exist.
 * @throws {SessionAlreadyOwnedError} for `write` when ownership is taken.
 */
abstract open(id: SessionId, access: SessionAccess, options?: SessionPersistenceOpenOptions): Promise<SessionHandle>

/**
 * Flush every active write handle owned by this service instance in one
 * durability barrier: each handle's routed live events drain durably and
 * its session materializes, exactly as that handle's own
 * `SessionHandle.flush` would. Read handles buffer nothing and are
 * untouched. A handle closed concurrently counts as flushed — close itself
 * drains durably.
 * @returns resolution once every write handle active at the call has flushed.
 * @throws {AggregateError} naming each session whose flush failed; the
 *   remaining handles still flush.
 */
abstract flush(): Promise<void>

/**
 * Observe one stored session without reading its event log or taking
 * ownership.
 *
 * The snapshot's `revision` is an opaque change token comparable only
 * against revisions from the same service instance and session id: equal
 * revisions may be treated as an unchanged log; unequal revisions promise
 * nothing. Write-ownership churn does not change a revision. It exists for
 * derived read-model caches keyed off `stat`/`list`; it plays no part in
 * open, read, or resume.
 * @param id - the stored session to observe.
 * @param options - optional cancellation.
 * @returns the snapshot, or `undefined` when the session does not exist.
 */
abstract stat(id: SessionId, options?: SessionPersistenceStatOptions): Promise<SessionPersistenceSnapshot | undefined>

/**
 * List every stored session visible to this process, in no promised order.
 * @param options - optional cancellation.
 * @returns one snapshot per stored session.
 */
abstract list(options?: SessionPersistenceListOptions): Promise<readonly SessionPersistenceSnapshot[]>
```

Types: [SessionId](core.es.md)

Source: [`packages/session/session-persistence/src/index.ts`](../../packages/session/session-persistence/src/index.ts)
<!-- END GENERATED cordis-surface -->
