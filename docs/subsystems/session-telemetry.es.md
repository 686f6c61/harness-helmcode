# SessionTelemetryBackend

[English](session-telemetry.md) | Español

El [servicio de captura](../../packages/session/session-telemetry/README.md) posee la captura de eventos canónicos, el enmascaramiento y los cursores de entrega. Helmcode no incluye ningún backend de telemetría: los registros capturados permanecen en esta máquina salvo que tu propio despliegue monte un backend. Ningún dato de reporte llega a las solicitudes del modelo.

Fuente: [`packages/session/session-telemetry/src/index.ts`](../../packages/session/session-telemetry/src/index.ts)

## El registro lógico

```ts type-equiv
/**
 * Severity of a telemetry record, pre-mapped at capture so a receiver can
 * alert with zero configuration: `error` for events whose own outcome flag
 * says so (the tool message's `isError`, `turn/end` error reasons) and for
 * `agent-error` operational records. Captured events otherwise default to
 * `info`; `warn` remains available to `session-telemetry/record` policies and
 * backends.
 */
type SessionTelemetrySeverity = 'info' | 'warn' | 'error'
```

```ts type-equiv
/**
 * One logical record handed to a backend — the capture contract's whole outbound
 * vocabulary. Ledger records mirror session-log events one-to-one;
 * operational records (`channel: 'ops'`) carry the two signals with no log
 * home (`agent-error`, `shutdown`) and deliberately omit `event.seq`-style
 * identity so they can never be mistaken for ledger rows.
 */
interface SessionTelemetryRecord {
  /** Canonical envelope without data; body carries the separately redacted payload. Absent for operational records. */
  sourceEvent?: { sessionId: SessionId; envelope: Omit<SessionEvent, 'data'> }
  /** Ledger (session-log mirror) or ops (operational signal) channel; backends keep the two under separate instrumentation scopes. */
  channel: 'ledger' | 'ops'
  /** Unix epoch milliseconds — the source event's append time for ledger records, the emission time for ops records. */
  time: number
  /** Pre-mapped alerting severity; see {@link SessionTelemetrySeverity}. */
  severity: SessionTelemetrySeverity
  /**
   * Identity attributes, deliberately minimal: ledger records carry
   * `session.id`, `session.format_version`, `event.type`, `event.seq`, plus optional
   * `session.cwd` / `session.parent_id`; a seeded Session also carries
   * `session.seed_length` from its exact inherited event count;
   * ops records carry `telemetry.op`, `session.id`, and (for `agent-error`)
   * `agent.id`, `turn`, `step`, `error.name`. Anything recoverable from the
   * body is intentionally NOT duplicated here.
   */
  attributes: Record<string, string | number>
  /**
   * The complete payload: a deep copy of the session event's `data` for
   * ledger records (JSON-serializable by `Session.append`'s own
   * validation), or the op payload for ops records. Never mutated after
   * handoff.
   */
  body: unknown
}
```

Cada [evento de sesión](session.es.md) canónico, incluido cada `assistant/message` o `assistant/attempt` con su flujo compacto completo y cada tipo fusionado por plugin del que el seam nunca oyó, pasa entero como un registro de libro mayor ordenado. Los frames `agent/assistant-stream` locales del proceso no entran en este feed durable. Un fork nuevo empieza en su sufijo propiedad del hijo, incluidos el marcador heredado y los cierres de fork; las sesiones restauradas empiezan después de su prefijo almacenado, incluidos los forks restaurados. El backend puede seleccionar `includeHistory` para incluir el prefijo completo; readoptar el mismo objeto reanuda tras su cursor de entrega. La entrega es de mejor esfuerzo: el cursor marca lo entregado al backend, no lo recibido, y los registros pueden perderse (fallo, ventana de recarga) o duplicarse (reproducción de objeto nuevo, reintentos del SDK), así que los receptores desduplican los registros del libro mayor por `(session.id, session.format_version, event.seq)`; los registros ops omiten deliberadamente esa identidad: son señales sobre las que alertar, no entradas que sumar, y en su lugar toleran duplicados.

## La declaración de compartición

Cada backend expone su modo seleccionado por el despliegue mediante el miembro abstracto obligatorio `sharing` en `ctx.sessionTelemetry` ([README de la Service Definition](../../packages/session/session-telemetry/README.md#the-sharing-disclosure)). No es ni una decisión de admisión por sesión ni un recibo de entrega. El acuse de `/feedback` no lo consulta.

```ts type-equiv
/**
 * Deployment-selected session-sharing mode, not confirmation of SDK delivery.
 */
type SessionTelemetrySharingStatus = 'full' | 'feedback-only' | 'disabled'
```

## Política de captura

```ts type-equiv
/** Whether capture follows live events or reads the canonical log only when requested. */
type SessionTelemetryCapture = 'live' | 'on-demand'
```

```ts type-equiv
/** Backend-selected capture mode and history policy. */
interface SessionTelemetryCaptureOptions {
  /** Follow live events, or wait for explicit capture; defaults to live. */
  capture?: SessionTelemetryCapture
  /** Include inherited fork history and stored history from earlier lifecycles; defaults to false. */
  includeHistory?: boolean
}
```

`includeHistory` permite registros almacenados y heredados pero no autoriza por sí mismo la captura. Un backend de tu propio despliegue puede usar captura bajo demanda y liberar el prefijo completo solo mediante feedback explícito.

## El contrato de backend

```ts type-equiv
/**
 * The minimum backend contract the coordinator requires. {@link SessionTelemetryBackend} is
 * its service-registered form; tests compose the coordinator with a bare
 * implementation of this interface.
 */
interface SessionTelemetrySink {
  /**
   * Hand one record to the backend's pipeline. MUST be a non-blocking
   * enqueue — the coordinator calls this synchronously from the
   * `session/event` hot path or an explicit canonical-log capture, so anything
   * slower than a queue push would tax the agent loop or feedback handling.
   * Errors thrown here are contained by the coordinator and logged; they
   * never reach the loop.
   * @param record - the logical record to report; owned by the backend after the call.
   */
  emit(record: SessionTelemetryRecord): void
  /**
   * Optional hint that a turn ended. A backend may forward it to its SDK's
   * flush so records are exported after each turn. Called
   * fire-and-forget; implementations must not block and must not throw
   * meaningfully (the coordinator contains exceptions). Most backends should
   * leave this unimplemented and let their SDK's own batching cadence govern
   * export timing: a backend that does implement it owns the interaction
   * between its concurrent flushes and {@link shutdown}'s drain (the OTel
   * backend leaves it unimplemented for exactly that hazard — see the
   * revival Agent Note).
   */
  flush?(): void
  /**
   * Forward the fiber's disposal to the SDK: flush whatever is queued and
   * reach quiescence, per the SDK's own shutdown contract. Everything
   * emitted before this call must still be delivered — including records
   * enqueued while a {@link flush} hint is in flight, so a backend whose SDK
   * guards against concurrent flushes orders behind the outstanding one (the
   * coordinator emits its dispose-time `shutdown` markers immediately before
   * calling this). Awaited by the coordinator's dispose; a rejection is
   * logged as a warning and never fails application teardown.
   * The coordinator captures dispose-time shutdown markers immediately before
   * this call for live capture; on-demand capture creates no ops records.
   * @returns resolves when the backend's pipeline has quiesced.
   */
  shutdown(): Promise<void>
}
```

`SessionTelemetryBackend` (`ctx.sessionTelemetry`, [firmas](#ctxsessiontelemetry--sessiontelemetrybackend-abstract-seam)) es la forma cargable del contrato (una implementación por contexto; la carga duplicada lanza), y un backend compone el `SessionTelemetryCoordinator` del seam en su constructor para instalar el lado de captura.

## El waterfall de enmascaramiento: `session-telemetry/record`

Cada registro pasa el waterfall (eventos en cascada) `session-telemetry/record` ([semántica](../cordis-primer.es.md#cordis-waterfall-semantics)) entre la copia del evento canónico y `emit()` ([entrada de evento](#session-telemetryrecord--waterfall)). El seam NO distribuye reglas propias: sin ningún listener montado, los registros llegan al backend exactamente como se capturaron, así que los datos exportados son precisamente tan limpios como las reglas que monte un despliegue. Los listeners se apilan transformando el valor de retorno de `next()`; retornar sin `next()` reemplaza todo lo que hay debajo; un listener que lanza retiene ese único registro en modo de fallo cerrado dentro de la contención del coordinador. El enmascaramiento se aplica solo a la copia exportada: el registro de sesión canónico nunca se reescribe.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsessiontelemetry--sessiontelemetrybackend-abstract-seam"></a>

### `ctx.sessionTelemetry` — `SessionTelemetryBackend` (abstract seam)

Loadable form of the backend contract: one implementation per context — the cordis `Service` registration under the `telemetry` key throws on a duplicate, cordis' standard behavior. A backend composes a SessionTelemetryCoordinator in its constructor to install the capture side.

```ts cordis-catalog
/**
 * See {@link SessionTelemetrySink.emit} — that declaration is the contract's one home.
 * @param record - the logical record to report; owned by the backend after the call.
 */
abstract emit(record: SessionTelemetryRecord): void

/** See {@link SessionTelemetrySink.flush}. */
flush?(): void

/**
 * See {@link SessionTelemetrySink.shutdown}.
 * @returns resolves when the backend's pipeline has quiesced.
 */
abstract shutdown(): Promise<void>
```

Source: [`packages/session/session-telemetry/src/index.ts`](../../packages/session/session-telemetry/src/index.ts)

<a id="session-telemetry-events"></a>

### `session-telemetry/*` events

<a id="session-telemetryrecord--waterfall"></a>

#### `session-telemetry/record` — waterfall

Transform one outbound record before it reaches the backend. This waterfall is the Service Definition's redaction extension point. It ships NO rules of its own: the innermost `next()` passes the record through unchanged, and with no listener mounted records reach the backend as captured, so exported data is exactly as clean as the rules a deployment mounts. Listeners stack by transforming `next()`'s return value; returning without `next()` replaces everything beneath. Dispatched synchronously on the capture hot path inside the coordinator's containment: a throwing listener withholds that one record (fail-closed) and never reaches the agent loop. Live capture dispatches at append time; on-demand capture dispatches while reading the canonical log. Redaction applies to the exported copy only; the canonical session log is never rewritten.

```ts cordis-catalog
/**
 * Transform one outbound record before it reaches the backend. This
 * waterfall is the Service Definition's redaction extension point. It ships NO rules
 * of its own: the
 * innermost `next()` passes the record through unchanged, and with no
 * listener mounted records reach the backend as captured, so exported
 * data is exactly as clean as the rules a deployment mounts. Listeners
 * stack by transforming `next()`'s return value; returning without
 * `next()` replaces everything beneath. Dispatched synchronously on the
 * capture hot path inside the coordinator's containment: a throwing
 * listener withholds that one record (fail-closed) and never reaches the
 * agent loop. Live capture dispatches at append time; on-demand capture
 * dispatches while reading the canonical log. Redaction applies to the
 * exported copy only; the canonical session log is never rewritten.
 * @param record - the candidate record, already the coordinator's own deep
 *   copy; listeners return a (possibly new) record and must not mutate it.
 * @mode waterfall
 */
'session-telemetry/record'(record: SessionTelemetryRecord, next: () => SessionTelemetryRecord): SessionTelemetryRecord
```

Source: [`packages/session/session-telemetry/src/index.ts`](../../packages/session/session-telemetry/src/index.ts)
<!-- END GENERATED cordis-surface -->
