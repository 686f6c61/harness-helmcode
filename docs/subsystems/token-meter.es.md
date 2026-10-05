# Medidor de tokens

[English](token-meter.md) | Español

`@deepseek-ai/dsh-token-meter` expone un snapshot de reproducción independiente para la presión de solicitudes y la tarificación de la superficie por posición. `logRevision` es el número de eventos duraderos consumidos para cada campo de la medición.

Fuente: [`packages/llm/token-meter/src/types.ts`](../../packages/llm/token-meter/src/types.ts)

## `TokenMeasurement`

```ts type-equiv
/** Detached immutable request-pressure and surface snapshot at one consumed log revision. */
interface TokenMeasurement {
  /** Number of durable events consumed; equal to the next unread event seq. */
  readonly logRevision: SessionLogOffset
  /** Provider or heuristic anchor used for this measurement. */
  readonly baseline: TokenMeasurementBaseline
  /** Signed repricing of current surface content relative to the baseline anchor. */
  readonly surfaceDeltaTokens: number
  /** Non-negative current request-and-response pressure. */
  readonly totalTokens: number
  /** Total route-priced request tokens across the current surface; equals the sum of the node prices. */
  readonly surfaceTokens: number
  /** Current surface nodes in positional head-to-tail order. */
  readonly nodes: readonly TokenSurfaceNode[]
}
```

Cada medición resuelve el proveedor/modelo enrutado del sobre efectivo a la tarificación de imágenes de solicitud declarada de esa ruta a través de `ctx.llm`, de modo que las apariciones de imágenes se tarifan como los tokens visuales más el texto visible para el modelo que la solicitud realmente envía; las rutas y composiciones sin tarificación declarada conservan la heurística fija. `baseline.kind === 'usage'` significa que la última llamada exitosa al proveedor tiene el mismo sobre de solicitud canónico y que su total no es inferior al ancla completa tarificada por ruta de esa llamada. `estimated` significa que no existe un ancla de uso conservadora reutilizable, por lo que el servicio tarificó por sí mismo el sobre y la superficie completos. Una solicitud exitosa posterior reemplaza el ancla anterior; el `surfaceDeltaTokens` con signo preserva el crecimiento y la reducción respecto a un ancla coincidente y retarifica ambos lados bajo la misma ruta. `totalTokens` sigue siendo la presión de solicitud y respuesta, mientras que `surfaceTokens` es el total tarificado por ruta correspondiente solo a la superficie y es igual a la suma de los precios de los nodos.

## `TokenSurfaceNode`

```ts type-equiv
/** One token-priced node in the current ordered session surface. */
interface TokenSurfaceNode {
  /** Durable sequence number of the surface event. */
  readonly seq: SessionSeq
  /**
   * Request-pressure tokens for the exact message projected by this node under
   * the measured route: image occurrences carry the route's declared visual
   * price when the routed adapter declares one, and the fixed heuristic
   * otherwise. Trigger, retention, and range selection all read this price.
   */
  readonly tokens: number
  /**
   * Fixed-heuristic tokens for the same message, independent of any route.
   * The shadow-price protocol prices replacements with this value so the O(1)
   * projection fold stays in agreement with its own appends.
   */
  readonly heuristicTokens: number
}
```

El orden de la superficie es autoritativo; los nodos de reemplazo pueden tener seqs duraderos más altos que los nodos posicionales posteriores. El snapshot es inmutable y no crece cuando avanza el fold de reproducción subyacente.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxtokenmeter--tokenmeter"></a>

### `ctx.tokenMeter` — `TokenMeter`

Replay owner for one service-wide estimator and isolated per-session folds.

```ts cordis-catalog
/**
 * Measure current request pressure and surface through the durable tail.
 *
 * The effective envelope's routed provider/model selects the request-image
 * pricing every node is priced under: a route whose adapter declares image
 * pricing charges each retained image its visual tokens plus its
 * model-visible text, while other routes keep the fixed heuristic. Provider
 * usage is reused only when the latest successful call's canonical request
 * envelope matches `requestHeader` and its total is no lower than that
 * call's full route-priced anchor; otherwise the complete envelope and
 * surface are repriced. The anchor includes all surface nodes immediately
 * before the assistant message, including inputs admitted after step/start.
 *
 * `requestHeader` replaces the latest logged envelope for pressure and node
 * pricing; the node set always describes the current session surface. Every
 * call clones those positional nodes, so measurement is O(surface).
 *
 * @param session - session to replay through its current durable tail.
 * @param requestHeader - optional effective request envelope replacing the latest logged header.
 * @returns a detached deeply immutable pressure and surface measurement.
 */
measure(session: Session, requestHeader?: EpochHeader): TokenMeasurement

/**
 * Heuristically price one model-visible message (instance face of the pure
 * `estimateMessage` export from `estimate.ts`).
 * @param message - message to price without mutation.
 * @returns content and role-framing tokens under the fixed service heuristic.
 */
estimateMessage(message: Message): number
```

Types: [EpochHeader](session.es.md) · [Message](llm-streaming.es.md) · [Session](session.es.md)

Source: [`packages/llm/token-meter/src/index.ts`](../../packages/llm/token-meter/src/index.ts)
<!-- END GENERATED cordis-surface -->
