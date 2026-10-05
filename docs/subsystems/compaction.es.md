# Compactación (compaction)

[English](compaction.md) | Español

El seam de compactación, un [capability seam](../../.agents/notes/implemented/architecture/2026-06-13-capability-seams.md) dividido como bash: Service Definition ([dsh-compaction](../../packages/compaction/compaction), `ctx.compaction`), Service Provider (un backend como [dsh-compaction-basic](../../packages/compaction/compaction-basic)) y Consumer humano ([dsh-command-compact](../../packages/compaction/command-compact)). La compactación es **una capacidad opcional**, no parte de la espina dorsal del agent loop, por lo que su vocabulario vive aquí, no en [core.md](core.es.md). Un backend basado en tokenizer o en plantillas es un paquete hermano que implementa la misma interfaz. A diferencia de bash, la interfaz depende necesariamente de `dsh-session` y `dsh-llm`: sus verbos actúan sobre una `Session` propiedad de un agent, y su evento de resumen durable usa el vocabulario `ContentBlock` (véase el [Agent Note del capability seam de compactación](../../.agents/notes/implemented/feature/2026-06-18-compaction-capability-seam.md)).

Fuente: [`packages/compaction/compaction/src/types.ts`](../../packages/compaction/compaction/src/types.ts)

## Los eventos de sesión `compaction/*`

La compactación extiende [`SessionEventMap`](session.es.md) con tres tipos de evento mediante declaration merging. Los tres son **de solo registro**: registran el bloqueo, el resumen, el rango seleccionado, los seqs de eventos sombreados, el recuento de tokens y la llamada al modelo sin unirse a la superficie. `SurfaceEventType` NO se extiende deliberadamente (solo los eventos productores de mensajes llegan al modelo), de modo que el propio resumen viaja en un `user/message` separado con `surfaceOp: { op: 'replace', startSeq, endSeq }`, la única mutación de superficie que realiza la compactación por resumen. El [Agent Note](../../.agents/notes/implemented/feature/2026-06-18-compaction-capability-seam.md) es dueño del razonamiento para reutilizar `user/message`.

| Evento | Payload | Rol |
|---|---|---|
| `compaction/start` | `{ turn }` | adquiere el bloqueo registrado en el log; un número identifica el turno automático abierto, mientras que `null` identifica un intento manual independiente |
| `compaction/summary` | `{ summary, rawOutput?, llmStreamCall?, shadowedRange, shadowedSeqs, shadowedTokenCount, provider, model, maxTokens?, usage? }` | la proyección de resumen segura, la salida y el uso completos opcionales del proveedor, una marca `llmStreamCall: true` cuando producir el resultado consumió exactamente una llamada a través de `ctx.llm.stream()` de este contexto (lo que exige el `rawOutput` completo), el par de límites de superficie sombreado (seqs `start`/`end`: un tramo de posiciones, no un intervalo numérico), los seqs sombreados en orden de superficie, el recuento estimado de tokens y el sobre de la llamada de resumen (`provider`, `model`, más su tope de generación cuando se aplicó uno); se registra para que la solicitud de un solo disparo sea reconstruible a partir del registro más el código (el Agent Note de reconstruibilidad); un `rawOutput` sin marca no identifica la ruta de llamada |
| `compaction/end` | `{ turn, error? }` | libera el bloqueo con el mismo propietario numérico o nulo (`error` registra un intento fallido) |

El bloqueo enmarca **toda** la operación: primero se anexa `compaction/start`, luego aterrizan la generación del resumen, el registro `compaction/summary` y el reemplazo del `user/message`, y solo entonces `compaction/end`. Liberar el bloqueo al final convierte un fallo a mitad de operación en un bloqueo huérfano detectable (un `compaction/start` sin su `compaction/end` correspondiente) en lugar de un `compaction/end` que afirma falsamente que la compactación terminó.

Los marcadores son puntos temporales del bloqueo, no un contenedor exclusivo. Una inyección en reposo no relacionada puede aparecer entre un inicio y un fin manuales independientes mientras el resumen está pendiente. La ruta manual revalida solo su tramo posicional seleccionado, de modo que ese contexto inyectado sobrevive tras el punto de control del reemplazo. Un inicio vivo sin pareja bloquea cada punto de entrada; un inicio sin pareja anterior a un `session/end-seed` más nuevo es evidencia desactualizada de un ciclo de vida previo y se ignora.

Estas variantes se fusionan dentro de un bloque `declare module '@deepseek-ai/dsh-session/types'`, así que, a diferencia de los tipos de nivel superior de las demás páginas de subsistemas, no se pegan como un bloque ` ```ts type-equiv ` con verificación de deriva (el extractor de `verify-type-equiv` solo reconoce declaraciones de nivel superior por nombre). La tabla de payloads anterior es la entrada de catálogo; seguir el enlace de la fuente para los campos autoritativos.

<a id="image-offload"></a>
## Descarga de imágenes

`compaction-image-offload` es dueño de la declaración `image/offload` y de su proyección de mensajes pura. Cada objetivo identifica un nodo de entrada actual y ocurrencias exactas de imágenes en profundidad primero. El evento conserva las identidades de nodo y mensaje y no porta `surfaceOp`. El [README del paquete](../../packages/compaction/compaction-image-offload/README.md) es dueño de la política de recuperación, el registro y la reproducción desacoplada.

```ts type-equiv
/** Exact input-image occurrences selected by one durable offload decision. */
interface ImageOffloadTarget {
  /** Current message-producing event containing these occurrences. */
  seq: SessionSeq
  /** Zero-based depth-first image indexes within the immutable message. */
  imageIndexes: number[]
}
```

## `CompactionResult`

Lo que una compactación exitosa devuelve a su llamante: los seqs de los eventos de contabilidad, la proyección de resumen segura, el rango y los seqs sombreados y el recuento estimado de tokens.

```ts type-equiv
/** Result of a successful compaction operation. */
interface CompactionResult {
  /** Stable identity shared by this compaction's complete durable lifecycle. */
  compactionId: CompactionId
  /** Human command that initiated this compaction, when it was manual. */
  sourceCommandId?: CommandId
  /** The seq of the appended `compaction/start` event. */
  startSeq: SessionSeq
  /** The seq of the appended `compaction/summary` event. */
  summarySeq: SessionSeq
  /** The seq of the appended `compaction/end` event. */
  endSeq: SessionSeq
  /** The summary content blocks produced by the backend. */
  summary: ContentBlock[]
  /**
   * The surface-boundary pair that was shadowed: the seqs of the first
   * (`start`) and last (`end`) surface nodes of the replaced range. A
   * surface-POSITION span, not a numeric seq interval — after a prior replace
   * lands a fresh high-seq summary node at an older range's position, `start`
   * can be GREATER than `end`. {@link CompactionResult.shadowedSeqs} is the
   * authoritative set of shadowed nodes, in surface order.
   */
  shadowedRange: { start: SessionSeq; end: SessionSeq }
  /** The seqs of all shadowed surface nodes, in surface order. */
  shadowedSeqs: SessionSeq[]
  /** Estimated token count of the shadowed content. */
  shadowedTokenCount: number
}
```

## El servicio

Los llamantes automáticos declaran por qué se ejecuta la política; las implementaciones pueden tratar el desbordamiento confirmado con más agresividad que la presión ordinaria.

```ts type-equiv
/** Why automatic policy is asking a backend to consider compaction. */
type CompactionTrigger = 'pressure' | 'context-overflow'
```

`CompactionEngine` expone `compactIfNeeded(agent, trigger, signal)` para la política automática `pressure` o `context-overflow`, `compactNow(agent, signal)` para una reducción útil de sesión en reposo incluso por debajo de la presión, y `compactRegion(...)` para un rango de superficie explícito e inclusivo. `compactNow()` se ejecuta como mantenimiento del agent entre turnos, devuelve `null` sin escribir cuando no existe un rango útil, registra un marco independiente `turn: null` antes de la generación del resumen y vacía un intento cerrado antes de que los prompts encolados posteriores puedan derivarse de la nueva superficie. Cada backend crea la fuente de su `user/message` de reemplazo con `compactCheckpointSource(compactionId, sourceCommandId?)`; los consumidores de cliente y de cable importan ese constructor, `CompactionCheckpointSource` e `isCompactCheckpointSource()` desde el subpath `@deepseek-ai/dsh-compaction/checkpoint`, libre de cordis, mientras que la raíz del paquete los reexporta para los consumidores del host. La identidad de transacción requerida correlaciona el punto de control del reemplazo, mientras que el predicado mantiene el reconocimiento independiente de cualquier backend concreto. Las implementaciones deben reenviar la señal suministrada a la generación del resumen. El seam no posee ninguna API de valoración: el singleton [`ctx.tokenMeter`](token-meter.es.md) posee directamente la estimación y la reproducción, mientras que `dsh-compaction-basic` es dueño de la retención, la secuenciación de eventos, las llamadas de resumen enrutadas y su configuración.

Los fallos manuales esperados usan `ManualCompactionErrorCode`:

```ts type-equiv
/** Expected failure classes for an explicit idle-session compaction request. */
type ManualCompactionErrorCode =
  | 'busy'
  | 'cancelled'
  | 'changed'
  | 'summary'
  | 'commit'
  | 'persistence'
```

`changed` y `summary` cierran y persisten el intento fallido sin reemplazo de resumen; las omisiones de imágenes registradas durante la recuperación siguen vigentes. `commit` puede seguir a una mutación parcial; `persistence` significa que el marco en memoria se cerró pero su vaciado falló. La cancelación sigue aparte y lanza la razón exacta de aborto tras la limpieza requerida.

La compactación por presión se ejecuta en el waterfall `agent/pre-step` antes de la derivación de la solicitud. Una vez que la presión o el desbordamiento canónico califican, compaction-basic invoca el opcional [`ctx.toolResultPruner`](../../packages/compaction/compaction-tool-result-pruner/README.md) antes de la selección del rango, vuelve a medir a través de `ctx.tokenMeter` y puede avanzar la superficie sin resumen. La recuperación de solicitudes fallidas se ejecuta a través de `agent/request-error` después de que el paso fallido se cierra, y devuelve una acción de reintento solo cuando la generación del reemplazo de superficie avanza, aunque el trabajo de resumen posterior lance tras la poda; la cancelación sigue ganando. Los límites de región conservan el emparejamiento llamada/resultado de tool pero no turnos enteros, lo que permite compactar los pasos cerrados tempranos de un turno sobredimensionado. `dsh-compaction-basic` es dueño de los umbrales, la política de cola retenida, los topes de desbordamiento y el manejo de fallos.

La Service Definition exporta `toolPairingBalancedBefore(session, seq)` y `toolPairingBalancedAfter(session, seq)` para las comprobaciones de emparejamiento llamada/resultado de tool antes y después de un seq. Ambas validan la pertenencia a la superficie actual y rechazan seqs ausentes y resultados huérfanos; el [contrato del paquete](../../packages/compaction/compaction/README.md#tool-pairing-boundaries) define su comportamiento de caché.

## Resultados de la poda de resultados de tool

El servicio opcional de poda de resultados de tool informa de cada reemplazo de contenido durable y de la reducción agregada en puntos de código Unicode. Sus tipos de resultado públicos viven en [`compaction-tool-result-pruner/src/types.ts`](../../packages/compaction/compaction-tool-result-pruner/src/types.ts).

```ts type-equiv
/** Cited source event and size accounting for one landed surface replacement. */
interface PrunedEntry {
  /** Full-fidelity tool-result event shadowed by the replacement. */
  readonly originalSeq: SessionSeq
  /** Newly appended pruned tool-result event. */
  readonly replacementSeq: SessionSeq
  /** Tool call shared by the original and replacement. */
  readonly callId: ToolCallId
  /** Original text size in Unicode code points. */
  readonly charsBefore: number
  /** Replacement text size in Unicode code points. */
  readonly charsAfter: number
}
```

```ts type-equiv
/** Aggregate outcome of one stable-surface pruning pass. */
interface PruneResult {
  /** Replacements in the snapshotted surface order. */
  readonly pruned: readonly PrunedEntry[]
  /** Total Unicode code points removed across replacements. */
  readonly charsRemoved: number
}
```

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxcompaction--compactionengine-abstract-seam"></a>

### `ctx.compaction` — `CompactionEngine` (abstract seam)

Abstract compaction service. Implementations own trigger policy, retention, and summarization, and may consume a separate measurement service. A successful run replaces the selected surface span with one summary node and prevents concurrent compaction of the same session. The replacement user message uses compactCheckpointSource with the transaction identity so consumers recognize and correlate it independently of the backend. Load one implementation per context as `ctx.compaction`.

```ts cordis-catalog
/**
 * Consider automatic compaction for one explicit trigger. Pressure policy
 * uses the latest durable routed request, while context-overflow policy may
 * force a useful balanced reduction even below the normal threshold. Return
 * `null` when no safe range can be compacted. A single oversized retained
 * unit or request envelope cannot be repaired through surface compaction.
 *
 * @param agent - agent context owning the session surface and routing options.
 * @param trigger - normal pressure or provider-confirmed context overflow.
 * @param signal - cancellation signal; model-backed implementations must forward it.
 * @returns the compaction result, or `null` if no compaction was needed.
 */
abstract compactIfNeeded( agent: CompactionAgentContext, trigger: CompactionTrigger, signal: AbortSignal, ): Promise<CompactionResult | null>

/**
 * Explicitly compact useful history even below automatic pressure thresholds.
 * Implementations synchronously start an idle task before any asynchronous
 * work, select a useful range without writing on a no-op, then
 * append a standalone `compaction/start` before summarization. That durable
 * marker is the compaction lock until one `compaction/end` attempt. Later waking
 * prompts remain accepted in FIFO order and start only after the optional
 * durability checkpoint and idle-task settlement. Context injected while the
 * summary runs may sit between the marker pair; only the selected span must
 * remain stable.
 *
 * @param agent - idle agent whose durable history should be compacted.
 * @param signal - cancellation scoped to this compaction request.
 * @param sourceCommandId - initiating command identity for a manual compaction.
 * @returns the compaction result, or `null` when no safe useful range exists.
 * @throws {@link ManualCompactionError} for expected busy, agent-cancellation,
 * changed-span, summarization/shrink, commit-stage, or persistence failures;
 * an aborted request preserves its exact abort reason. Failed attempts remain
 * visible in the log.
 */
abstract compactNow( agent: ManualCompactAgentContext, signal: AbortSignal, sourceCommandId?: CommandId, ): Promise<CompactionResult | null>

/**
 * Forcibly compact a range of surface nodes into a single summary node.
 * `start` and `end` name an inclusive span by surface position, not numeric seq
 * order; replacements can make visible seqs non-monotonic. Both edges must be
 * balanced so assistant tool calls remain paired with their results. A model-
 * backed implementation forwards cancellation and rejects active, missing,
 * reversed, or unbalanced ranges. The target session is `agent.session`.
 * Its replacement user message must use {@link compactCheckpointSource} with
 * the transaction's `CompactionId`.
 * Use {@link toolPairingBalancedBefore} and {@link toolPairingBalancedAfter}
 * for the edge checks.
 *
 * @param start - first surface seq, inclusive.
 * @param end - last surface seq, inclusive.
 * @param agent - context whose session is mutated and whose routing options guide summarization.
 * @param signal - optional cancellation; model-backed implementations must forward it.
 * @throws when compaction is active or the range is missing, reversed, or unbalanced.
 * @returns the appended event seqs, summary, replaced range, and token accounting.
 */
abstract compactRegion( start: SessionSeq, end: SessionSeq, agent: CompactionAgentContext, signal?: AbortSignal, ): Promise<CompactionResult>
```

Types: [CommandId](commands.es.md) · [SessionSeq](session.es.md)

Source: [`packages/compaction/compaction/src/index.ts`](../../packages/compaction/compaction/src/index.ts)

<a id="ctxtoolresultpruner--toolresultpruner"></a>

### `ctx.toolResultPruner` — `ToolResultPruner`

Deterministic head/middle/tail pruning for current tool-result surface nodes.

```ts cordis-catalog
/**
 * Measure text content in Unicode code points; non-text blocks cost zero.
 * @param blocks - tool-result content to measure.
 * @returns total Unicode code points across text blocks.
 */
measureContent(blocks: readonly ContentBlock[]): number

/**
 * Replace an over-budget text middle while retaining rich-block order.
 * Text slicing is by Unicode code point, not UTF-16 code unit, so a retained
 * boundary cannot split a surrogate pair. Grapheme clusters may still split.
 * @param blocks - original tool-result content.
 * @returns pruned content, or `null` when the text is within budget.
 */
pruneContent(blocks: readonly ContentBlock[]): ContentBlock[] | null

/**
 * Prune every over-budget tool result from one stable current-surface snapshot.
 * Each replacement preserves the complete event data except for `content`,
 * cites the shadowed node so replay can recover the replacement input, and is
 * immediately preceded by a `compaction/prune` shadow-price event pricing the
 * shadowed node through the injected token meter, so pure consumers can
 * subtract it without per-node state.
 * @param session - session whose current surface is rewritten.
 * @returns landed replacements and aggregate Unicode-code-point savings.
 * @throws when the session rejects a replacement; replacements committed
 * earlier in the pass remain durable.
 */
pruneSession(session: Session): PruneResult
```

Types: [ContentBlock](llm-streaming.es.md) · [Session](session.es.md)

Source: [`packages/compaction/compaction-tool-result-pruner/src/index.ts`](../../packages/compaction/compaction-tool-result-pruner/src/index.ts)

<a id="compaction-events"></a>

### `compaction/*` events

<a id="compactionsummary-error--waterfall"></a>

#### `compaction/summary-error` — waterfall

Recover a failed summary request by synchronously recording a durable change to its selected input. Return true only after making progress; the provider re-derives and re-prices the selection before retrying. Call next() when the failure cannot be recovered. Decisions survive a later summary failure or cancellation.

```ts cordis-catalog
/**
 * Recover a failed summary request by synchronously recording a durable
 * change to its selected input. Return true only after making progress;
 * the provider re-derives and re-prices the selection before retrying.
 * Call next() when the failure cannot be recovered. Decisions survive a
 * later summary failure or cancellation.
 * @param payload.session - session containing the selected input.
 * @param payload.sourceEventSeqs - selected message events in request order.
 * @param payload.error - failure thrown by the summarizer.
 * @param payload.signal - optional compaction cancellation signal.
 * @param next - delegate to the next recovery listener.
 * @mode waterfall
 */
'compaction/summary-error'(payload: { session: Session; sourceEventSeqs: readonly SessionSeq[]; error: unknown; signal?: AbortSignal }, next: () => boolean): boolean
```

Types: [Session](session.es.md) · [SessionSeq](session.es.md)

Source: [`packages/compaction/compaction/src/index.ts`](../../packages/compaction/compaction/src/index.ts)
<!-- END GENERATED cordis-surface -->
