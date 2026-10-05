# Streaming de LLM (modelo de lenguaje grande)

[English](llm-streaming.md) | Español

Los tipos de conversación y streaming de [`packages/llm`](../../packages/llm/README.md): valores `Message` durables, entradas de usuario de solo solicitud, variantes `ContentBlock` compartidas, la solicitud de modelo completamente ensamblada, el protocolo `StreamChunk` en bruto, el contrato de adaptador (adapter contract) que todo adaptador debe implementar y el ensamblador compartido. Los [paquetes núcleo](core.es.md) mantienen y registran estos valores en cada turno; esta página los declara.

Fuente: [`packages/llm/llm/src/types.ts`](../../packages/llm/llm/src/types.ts)

<a id="content-blocks-and-messages"></a>

## Bloques de contenido y mensajes

Una conversación son `Message`s; un mensaje es un array de **bloques de contenido** tipados. La unión de bloques deriva de `ContentBlockMap`.

Fuente: [`packages/llm/llm/src/types.ts`](../../packages/llm/llm/src/types.ts)

```ts type-equiv
/**
 * Merge-extensible content blocks keyed by `type`. New core blocks must land
 * with adapter, UI, and compaction support. Tool-change blocks belong to
 * developer messages; `projectToolUpdates` selects what each route receives.
 */
interface ContentBlockMap {
  'text': TextBlock
  'reasoning': ReasoningBlock
  'image': ImageBlock
  'file': FileBlock
  'tool-call': ToolCallBlock
  'tool-addition': ToolAdditionBlock
  'tool-removal': ToolRemovalBlock
}
```

Las interfaces de los bloques (campos completos en la fuente): `TextBlock` (`text`), `ReasoningBlock` (pensamiento, distinto del texto visible), `ImageBlock` (un [adjunto de imagen](attachment.es.md) durable), `FileBlock` (un [adjunto de archivo](attachment.es.md) durable y literal que el ensamblado de la solicitud proyecta a texto de identificador para cada ruta) y `ToolCallBlock` (`id: ToolCallId`, `name`, `arguments` en JSON en bruto). Los resultados de tools son valores `ToolResultMessage` de primera clase con `toolCallId`, `content` del resultado e `isError` opcional; no son bloques de contenido. `ContentBlock = ContentBlockMap[ContentBlockType]`. Una nueva modalidad pertenece al mapa extensible por merge solo cuando sus rutas de adaptador, UI, compactación (compaction) y reproducción durable la honran. Los bloques de cambio de tools de desarrollador se proyectan según la capacidad de ruta resuelta.

El acceso a imágenes pertenece a la serialización de la solicitud, no al adjunto durable ni a la versión determinista de imagen de solicitud. `resolveImageAttachmentAccess()` combina la ruta de objeto de host opcional del proveedor de adjuntos con un mapeo suministrado por el consumidor para el sistema de archivos de la ejecución de tool actual. El resultado solo está disponible para esa solicitud y no participa en `variantId`.

Fuente: [`packages/llm/llm/src/content.ts`](../../packages/llm/llm/src/content.ts)

```ts type-equiv
/** Execution-world path that model tools can use to read one normalized attachment. */
interface ImageAttachmentAccess {
  /** Absolute path to immutable normalized bytes; callers must treat it as read-only. */
  readonlyPath: string
}
```

Fuente: [`packages/llm/llm/src/message.ts`](../../packages/llm/llm/src/message.ts)

Un `Message` es un valor de rol/fuente/contenido identificado e inmutable. Los mensajes del asistente producidos por el modelo nombran el proveedor y el modelo que los produjeron y portan datos de reproducción opcionales privados del adaptador en su fuente:

```ts type-equiv
/** Provider/model identity and adapter-private replay data for an assistant message. */
interface AssistantProviderMetadata {
  /** Provider route that produced the message. */
  provider: string
  /** Provider model id that produced the message. */
  model: string
  /**
   * Lossless-JSON adapter state needed to replay the provider response.
   * `LlmRuntime` exposes it to a target adapter only when that adapter instance
   * currently owns both this historical provider and the target provider.
   */
  replayState?: unknown
}
```

```ts type-equiv
/** Any persisted conversation message, discriminated by its `role`. */
type Message = MessageRoleMap[keyof MessageRoleMap]
```

`DeveloperMessage` registra cambios incrementales de la sesión del agent en orden de conversación con el rol `developer`. `ToolAdditionBlock.toolName` activa la definición seleccionada por la referencia de cabecera histórica del evento de sesión que lo contiene; `ToolRemovalBlock.toolName` elimina la definición activa. Ambos bloques se rechazan en otros roles de mensaje. `deferLoading` solicita independientemente la carga diferida de la definición sin requerir un registro de adición. Véase [Session](../../packages/core/session/README.md) para la vinculación de cabeceras y el [paquete LLM](../../packages/llm/llm/README.md#known-limitations-and-deferred-work) para los límites de soporte de los proveedores. `ToolUpdate` es `in-history` o `addition-only` sobre los metadatos de modelo resueltos y preparados. `GenerateOptions.toolHistory` porta `ToolHistory`: `tools` iniciales y `updates` ordenados, cada uno vinculando un `messageId` de desarrollador a sus `additions` históricamente resueltos. El runtime proyecta este estado en las declaraciones del proveedor; no cambia la lista de tools activa en las cabeceras registradas.

De dónde proviene un mensaje es en sí mismo un tipo suma extensible por merge:

```ts type-equiv
/**
 * Where a message (or injected content) came from, in the harness's own
 * vocabulary. Merge-extensible sum type — each producer declares its own
 * `kind` in its own module; there is no shared catch-all `plugin` kind.
 * Model and tool sources answer their role messages; user messages carry any
 * producer's kind, and consumers fall through unknown kinds.
 */
interface MessageSourceMap {
  user: { kind: 'user' }
  model: ModelMessageSource
  tool: ToolMessageSource
  'system-prompt': SystemPromptMessageSource
}
```

La identidad del productor y la forma de presentación son independientes. `kind` responde *quién produjo esto*; el `form` opcional responde *qué clase de información es*, y los consumidores deciden cómo presentarla. Varios productores pueden compartir una forma, y un productor puede emitir más de una forma a lo largo de una sesión. Los valores son semánticos y crecen de uno en uno; un valor ausente o no reconocido usa el valor por defecto documentado y se presenta como contenido opaco:

```ts type-equiv
/**
 * The kind of information in producer-supplied context, declared by the
 * producer in the same `MessageSource`.
 *
 * `MessageSource.kind` answers *who produced this*; `form` answers *what kind
 * of thing it is*, and the two axes are deliberately independent — several
 * producers share one form, and one producer may emit more than one form over
 * a session.
 *
 * The vocabulary is SEMANTIC, never visual: a value states that the content is
 * a file's instructions or a catalog of available items, and a consumer decides
 * what that looks like. Colors, icons, ordering, and collapse defaults are the
 * consumer's business and must not enter this union. It grows one value at a
 * time as producers gain the structured fields their form needs; an absent or
 * unknown value is the documented default, presented as opaque content.
 */
type ContextForm =
  /** Instructions read out of workspace files the model is expected to follow. */
  | 'instructions'
  /** A catalog of items available in this session, republished as it changes. */
  | 'catalog'
  /** Current state, where a later snapshot from the same producer supersedes an earlier one. */
  | 'snapshot'
  /** A one-off account of something that just happened; it supersedes nothing. */
  | 'notice'
  /** A message another agent addressed to this one. */
  | 'relay'
  /** Material lifted out of another session's log, possibly reduced on the way in. */
  | 'recall'
```

```ts type-equiv
/** One named contribution to a `snapshot`-form context, in assembly order. */
interface ContextSnapshotSection {
  /** The contributing subsystem's name. */
  readonly name: string
  /** That contribution's model-facing text, exactly as assembled. */
  readonly text: string
}
```

```ts type-equiv
/**
 * Producer-declared {@link ContextForm} and the fields that form requires,
 * mixed into the source types that carry one.
 *
 * Discriminated by `form` so a producer cannot select a form without the
 * fields needed to present it: a `notice` must record its one-line
 * account, a `snapshot` its sections. Omitting `form` stays valid — an
 * undeclared context is the documented default.
 */
type ContextFormed =
  | { readonly form?: never }
  | { readonly form: 'instructions' }
  | { readonly form: 'catalog' }
  | {
    readonly form: 'snapshot'
    /** The named contributions this snapshot assembled, in order. */
    readonly sections: readonly ContextSnapshotSection[]
  }
  | {
    readonly form: 'notice'
    /** One-line account of what happened, shown without expanding the row. */
    readonly summary: string
  }
  | { readonly form: 'relay' }
  | { readonly form: 'recall' }
```

<a id="streamchunk--the-raw-protocol"></a>

## `StreamChunk`: el protocolo en bruto

Una respuesta en streaming entrelaza varios bloques tipados (texto, razonamiento (reasoning), múltiples llamadas a tools). `index` vincula cada delta a su bloque; `block-end` porta el `ContentBlock` completamente ensamblado para que los consumidores no tengan que reensamblar los deltas por sí mismos. Es una unión discriminada **cerrada**: un `switch` sobre `type` termina con `assertNever`, de modo que añadir una variante rompe la compilación en cada consumidor que deba manejarla.

```ts type-equiv
/**
 * Adapter-private lossless-JSON state for replaying a successful response,
 * carried by a terminal `finish` chunk and stored on the assembled assistant
 * message's model source. Both halves stay opaque to the harness; only the
 * split is shared vocabulary, so assembly can keep stored metadata aligned
 * with stored content without reading either half.
 */
interface ReplayEnvelope {
  /** Response-level adapter-private metadata (ids, native stop reason). */
  response: unknown
  /**
   * Per-block adapter-private metadata, one entry per emitted block in
   * first-seen stream order. When assembly drops a block it drops the entry at
   * the same position; entries whose length does not match the emitted block
   * count discard the whole envelope. An adapter whose metadata is independent
   * of block structure omits this field and the envelope passes through
   * assembly unchanged.
   */
  blocks?: readonly unknown[]
}
```

```ts type-equiv
/**
 * Raw streaming protocol emitted by adapters.
 * Block indexes correlate interleaved deltas, and `block-end` carries the
 * assembled block. Adapters emit usage before the terminal finish and nothing
 * afterward; tool arguments remain raw JSON strings. An adapter implementation
 * may throw, but `LlmRuntime.stream()` normalizes that failure to a terminal
 * `error` or `aborted` finish before exposing it to consumers.
 */
type StreamChunk =
  | { type: 'block-start'; index: number; blockType: ContentBlockType }
  | { type: 'text-delta'; index: number; text: string }
  | { type: 'reasoning-delta'; index: number; text: string }
  | { type: 'tool-call-delta'; index: number; id: ToolCallId; name?: string; argumentsDelta: string }
  | { type: 'block-end'; index: number; block: ContentBlock }
  | { type: 'usage'; usage: TokenUsage }
  | {
    type: 'finish'
    reason: FinishReason
    /** Replay metadata for a successful response; see {@link ReplayEnvelope}. */
    replayState?: ReplayEnvelope
  }
```

<a id="compact-assistant-streams"></a>

## Flujos compactos de Assistant

`AssistantStreamAccumulator` empareja cada `StreamChunk` con su marca de tiempo original de entero seguro y produce `AssistantStreamRecord[]`. Los deltas consecutivos de texto, razonamiento o argumentos de tool del mismo bloque se convierten en un solo registro con `time0`, huecos exactos de marcas de tiempo y una entrada de array por delta original; cualquier otro fragmento sigue siendo un registro en bruto con marca de tiempo. Esta representación elimina los sobres de evento repetidos sin unir fronteras de tokens ni descartar hechos terminales, de uso, de bloque, de fallo o de reproducción.

`snapshot()` devuelve un flujo inmutable desacoplado. `expandAssistantStream()` comprueba estrictamente las claves de los registros, los conteos de miembros, los índices, las marcas de tiempo, la identidad de las llamadas a tools y el JSON sin pérdidas antes de recrear la secuencia exacta de fragmentos temporizados. El registro de sesión embebe este flujo en `assistant/message` para un resultado de superficie o en `assistant/attempt` para un intento sin mensaje de superficie.

Los frames `agent/assistant-stream` locales al proceso portan la presentación en vivo. La reproducción durable y la validación de restauración siguen expandiendo la liquidación embebida; la telemetría, la contabilidad de tokens y los folds del Host leen los registros compactos directamente. Los lectores a nivel de registro (`assistantStreamFirstTokenTime`, `assistantStreamHasVisibleContent`, `assistantStreamHasVisibleText`, `lastAssistantStreamChunk`, `assistantStreamChunks`, `joinAssistantStreamText`, `assembleAssistantStream`, y los `runFirstTokenTime` y `runFirstVisibleTime` por ejecución) responden las preguntas de los consumidores en una pasada sobre los registros con salida temprana, de modo que un historial grande cuesta O(registros) por liquidación en lugar de una expansión O(miembros) ([decisión de folds](../../.agents/notes/implemented/architecture/2026-09-06-embedded-stream-record-readers.md)). `expandAssistantStream()` sigue siendo la ruta de validación para los registros leídos en una frontera durable y para los consumidores que necesitan cada miembro.

## `LlmFailure`

Todo fallo lanzado o en banda del adaptador final se normaliza a un payload serializable agnóstico de proveedor. `providerRetryAfterMs` es un retraso positivo validado solicitado por el proveedor, no una decisión de reintento; `ProviderRequestId` es una cadena opaca con brand para diagnósticos.

```ts type-equiv
/** Serializable provider or transport failure facts; policy decides whether they are retryable. */
interface LlmFailure {
  /** Human-readable provider or transport failure. */
  readonly message: string
  /** Stable provider-neutral machine-routing code. */
  readonly code: string
  /** HTTP status returned by the provider, when available. */
  readonly status?: number
  /** Provider-requested delay in milliseconds, when valid and available. */
  readonly providerRetryAfterMs?: number
  /** Opaque provider-issued request identifier for diagnostics. */
  readonly requestId?: ProviderRequestId
  /**
   * With code `IMAGE_OFFLOAD_REQUIRED`: how many more of the oldest retained
   * image occurrences the route needs offloaded before the same request fits
   * its exact byte accounting. `dsh-compaction-image-offload` records the
   * selected occurrences in an `image/offload` event and retries the step.
   */
  readonly offloadImages?: number
}
```

## Precio de imágenes de solicitud

Un adaptador cuyo proveedor cobra tokens visuales por las imágenes de la solicitud declara el precio por ruta sobrescribiendo `LlmAdapter.imageRequestPricing`, y `ctx.llm.imageRequestPricing(provider, model)` lo resuelve síncronamente para los consumidores. El medidor de tokens resuelve el precio del modelo enrutado en cada medición para que la presión de compactación, la retención y la selección de rangos tase el historial de imágenes tal como la solicitud enrutada realmente lo envía; el adaptador de DeepSeek tasa cada ocurrencia retenida a su objetivo de solicitud por modelo con la contabilidad de visión publicada y cada ocurrencia seleccionada por una decisión registrada de offload de imágenes como su texto de marcador de posición, mientras que el uso del proveedor sigue siendo el ancla autoritativa para las solicitudes completadas.

```ts type-equiv
/**
 * Request price of one ordered image occurrence under one exact model route's
 * request projection. Every occurrence resolves to the pair the wire actually
 * carries: provider visual tokens for a retained image, plus the model-visible
 * text sent with or instead of it (request-preview handle, offload placeholder,
 * or text-only substitution). The caller prices `text` with its own text
 * estimator so provider pricing never fixes a text tokenization.
 */
interface LlmImageRequestPrice {
  /** Provider visual tokens for the retained request image; 0 when only text represents this occurrence. */
  visualTokens: number
  /** Model-visible text sent for this occurrence, to be priced by the caller's text estimator. */
  text: string
}
```

```ts type-equiv
/**
 * Provider-side request-image pricing for one exact model route. Implemented
 * by adapters whose provider charges visual tokens; consumers (the token
 * meter) resolve it synchronously per measurement, so implementations must not
 * perform I/O.
 */
interface LlmImageRequestPricing {
  /**
   * Price every image occurrence of one request projection.
   * @param images - surface image blocks in request order, one entry per occurrence; an `offloaded` block
   *   is priced as its placeholder text.
   * @returns one price per occurrence, aligned by index with `images`.
   */
  priceImages(images: readonly ImageBlock[]): readonly LlmImageRequestPrice[]
}
```

## El contrato del adaptador

Todo adaptador DEBE cumplir lo siguiente, y todo consumidor puede confiar en ello:

- **`usage` antes de `finish`, nada después de `finish`.** Diferir ambos al marcador de fin de flujo del proveedor para que un fragmento final de solo uso no pueda violar el orden.
- **Los `arguments` de las llamadas a tools siguen siendo cadenas JSON en bruto de extremo a extremo.** Los fragmentos parciales fluyen vía `argumentsDelta`; un proveedor que devuelve objetos analizados los reconvierte a cadena en `block-end`.
- **Dos rutas de error sancionadas, un solo tipo `LlmFailure`.** Un fallo puede LANZAR desde `stream()` (errores de transporte/protocolo) **o** terminar el flujo con `finish {kind:'error'|'aborted', failure}` (errores en banda del proveedor, para adaptadores que no pueden lanzar a mitad del flujo). `LlmError.failure` porta el mismo `LlmFailure`. Después de que la llamada selecciona su adaptador, el flujo preserva el objeto `Error` lanzado exacto y asocia a esa llamada los hechos inmutables más la política de reintento inmutable del registro que la sirve; el agent loop (bucle de agent) confirma el flujo del intento como `assistant/attempt`, cierra el paso fallido y ofrece el error, los hechos, los hechos inmutables ya reintentados, la política servidora y la señal del turno a `agent/request-error`. Un listener que lo maneja devuelve `{ kind: 'retry' }` tras su reparación esperada; a falta de recuperación, el fallo estructurado se convierte en el error del turno, y no se confirma ningún mensaje de Assistant de superficie ni efecto lateral de tool para ese intento.
- **Una llamada de adaptador es un intento de proveedor.** Los adaptadores deshabilitan los reintentos de la biblioteca. La recuperación a nivel de agent abre otro turno durable numerado; los llamantes directos de `ctx.llm.stream()` siguen siendo de un solo intento.
- **Los bloqueos del proveedor están acotados en el transporte.** Ambos adaptadores remotos distribuidos exponen un `streamIdleTimeoutMs` positivo y finito con un valor por defecto de cinco minutos. El watchdog solo se arma mientras hay un `next()` del iterador pendiente, usa una señal estable para toda la solicitud, mapea su propia expiración a `TIMEOUT` y conserva un aborto anterior del llamante como `ABORTED`.
- **El desbordamiento de contexto tiene un código canónico.** Ambos adaptadores de DeepSeek clasifican el detalle explícito del proveedor a través de `isContextWindowExceededError()` y afloran `CONTEXT_WINDOW_EXCEEDED`, tanto si el fallo llega como un `LlmError` HTTP lanzado como si es un error de finish en banda. Los consumidores enrutan por el código, nunca por el texto del proveedor.
- **Una completación vacía es un error reintentable, no un éxito silencioso.** Ambos adaptadores mapean un finish `stop` terminal que no portaba bloques de contenido a `finish {kind:'error'}` con el código canónico `EMPTY_RESPONSE`, y `dsh-llm-retry` lo reintenta por defecto.
- **Toda solicitud HTTP al proveedor porta la cabecera de atribución de la app.** Los adaptadores envían `attributionHeaders()` (abajo), la base de `User-Agent`, y lo prueban con una prueba a nivel de cable.
- **El estado de reproducción pertenece al adaptador; su división es compartida.** Un `finish` con éxito puede portar un `ReplayEnvelope`: metadatos opacos a nivel de respuesta más entradas opcionales por bloque alineadas con la secuencia de bloques emitida. La alineación es vocabulario del harness: cuando el ensamblado descarta un bloque, descarta la entrada en la misma posición, de modo que los metadatos almacenados siempre describen el contenido almacenado. El loop almacena el sobre podado con el mensaje del asistente ensamblado. En una solicitud posterior, `LlmRuntime` pasa el estado solo cuando el proveedor histórico y el proveedor objetivo están registrados actualmente en exactamente la misma instancia de adaptador. Ese adaptador valida el estado y es dueño de cualquier conversión entre modelos o entre proveedores; los demás adaptadores reciben el contenido agnóstico de proveedor más los campos de proveedor/modelo sin el estado privado. El contenido durable sigue siendo autoritativo: un estado almacenado que el adaptador lector no puede usar degrada ese único mensaje a conversión agnóstica de proveedor con un diagnóstico en lugar de hacer fallar la solicitud.

## `ResolvedRetryPolicy`

La configuración de reintento se resuelve antes del registro de la ruta en una unión discriminada inmutable. El modo normal porta `mode: 'normal'`, `maxRetries` finito, `retryableCodes` y los obligatorios `initialDelayMs`, `maxDelayMs` y `jitterRatio`; el modo always porta `mode: 'always'` y los mismos campos de backoff obligatorios sin un máximo finito. Omitir la política de un proveedor usa el valor normal por defecto de cinco reintentos. La configuración en capas puede conservar `maxRetries` o `retryableCodes`, solo del modo normal, tras cambiar al modo always; el resolvedor ignora esos campos inactivos y captura la política always pura. `LlmRuntime.providerRetryPolicy(provider)` devuelve el valor registrado, y `llmRetryPolicyOf(stream)` devuelve el valor capturado del registro servidor después de que la llamada lo selecciona, de modo que el dispose (liberación de recursos) o el reemplazo posterior de la ruta no pueda cambiar la política de recuperación de un fallo en curso. El [catálogo de configuración generado](../config-catalog.es.md) lista los campos de entrada opcionales.

## `AppIdentity`: atribución de la app

La identidad pública y estática de la aplicación que todo adaptador envía a los proveedores ([`packages/llm/llm/src/attribution.ts`](../../packages/llm/llm/src/attribution.ts)). `attributionHeaders(identity?)` la mapea solo a la cabecera estándar `User-Agent`; las cabeceras de atribución de app específicas de OpenRouter no están soportadas intencionadamente por este contrato. El `APP_IDENTITY` por defecto toma su versión del manifest (lista de metadatos) del paquete; cada campo es un hecho público del producto: ningún secreto, ruta, id de sesión ni identificador por usuario, y nada por solicitud puede influir en los valores. Justificación: [Atribución obligatoria con `User-Agent`](../../.agents/notes/implemented/architecture/2026-06-21-mandatory-app-attribution-headers.md).

```ts type-equiv
/**
 * Static public application identity sent to LLM providers.
 *
 * Every field is a public product fact, safe on every request: no secrets,
 * local paths, session ids, prompt text, or per-user identifiers belong here,
 * and nothing per-request may influence the values.
 */
interface AppIdentity {
  /** `User-Agent` product token (lowercase, hyphenated). */
  product: string
  /** Product version; sourced from package metadata, never hand-copied. */
  version: string
  /** Repository home URL of the app, used as the `User-Agent` comment. */
  url: string
}
```

## `TokenUsage`

Contabilidad de tokens por llamada. Los conteos son **disjuntos**: `inputTokens` es solo entrada no cacheada; la entrada cacheada se reporta por separado, y la entrada facturada es la suma de los tres. Los adaptadores cuyos proveedores pliegan los aciertos de caché en un único total de prompt (el `prompt_tokens` de DeepSeek) los vuelven a restar. El `totalTokens` opcional es un conteo agregado exacto de prompt más salida preservado del proveedor o reconstruido a partir de contadores agregados autoritativos; los adaptadores lo omiten cuando no está disponible o es inconsistente. `reasoningTokens`, cuando está presente, es detalle informativo ya incluido en `outputTokens`; los totales no deben sumarlo de nuevo.

```ts type-equiv
/**
 * Token accounting for one model call (cache fields are optional).
 *
 * Counts are DISJOINT: `inputTokens` is uncached input only; cached input is
 * reported separately as `cacheReadTokens`/`cacheWriteTokens` (billed input =
 * sum of the three). Adapters whose providers fold cache hits into a total
 * prompt count (DeepSeek's `prompt_tokens`) subtract them out.
 */
interface TokenUsage {
  inputTokens: number
  outputTokens: number
  /**
   * Exact full-call total including aggregate prompt and output tokens.
   *
   * Adapters preserve a provider total or derive it from authoritative
   * aggregate prompt/output counters; they omit it when unavailable or
   * inconsistent.
   */
  totalTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
}
```

## `BlockAssembler`

`BlockAssembler` ([`packages/llm/llm/src/assembler.ts`](../../packages/llm/llm/src/assembler.ts)) es la única implementación compartida que pliega un flujo de `StreamChunk` de vuelta en `ContentBlock`s, uso, razón de finalización y estado de reproducción. El loop registra los fragmentos en bruto mientras alimenta los mismos fragmentos a través de un ensamblador, y luego almacena el contenido del asistente ensamblado con el proveedor y el modelo que lo produjeron. Un consumidor que necesita el resultado ensamblado sin reimplementar el fold usa este.

Una única decisión de conservar/descartar cubre el contenido y los metadatos a la vez: un finish `max-tokens` descarta todas las llamadas a tools porque una llamada truncada no es segura de ejecutar, y la misma decisión poda la entrada por bloque del sobre de reproducción en cada posición descartada. Por tanto, `blocks()` y `replayState` no pueden estar en desacuerdo, quite lo que quite el ensamblado.

```ts public-api
/**
 * Incrementally assembles raw {@link StreamChunk}s into complete
 * {@link ContentBlock}s and a final assistant {@link Message}.
 *
 * The agent loop feeds it while logging raw chunks for replay fidelity, then
 * reads `blocks()` / `message()` / `usage` / `finish` once the stream ends,
 * or `interruptedBlocks()` when cancellation cut the stream short.
 *
 * Tolerant of delta-only protocols (no block-start/end); deltas arriving for
 * an index already closed by `block-end` are ignored (malformed stream) so a
 * misbehaving adapter cannot grow memory or corrupt a completed block.
 */
declare class BlockAssembler {
  /**
   * Feed one chunk into the assembly state.
   * @param chunk - the next raw chunk, in stream order.
   */
  push(chunk: StreamChunk): void;
  /**
   * Assemble all blocks seen so far, in stream order.
   * @returns one block per seen index, except that max-token truncation drops
   *   tool calls that cannot be executed safely; an open block assembles from
   *   its accumulated deltas (an unknown block type never closed by `block-end` throws).
   */
  blocks(): ContentBlock[];
  /**
   * Assemble the prefix an interrupted stream can safely finalize: closed and
   * open text/reasoning blocks with non-whitespace content, in stream order.
   * Tool calls are omitted because interruption precedes dispatch; retaining
   * one would require a fabricated result. Open unknown blocks are also omitted.
   * @returns the kept blocks; empty when nothing streamed before the interruption.
   */
  interruptedBlocks(): ContentBlock[];
  /** Usage from the `usage` chunk; undefined until one arrives. */
  get usage(): TokenUsage | undefined;
  /** Finish reason from the `finish` chunk; `{kind: 'stop'}` when the stream ended without one. */
  get finish(): FinishReason;
  /**
   * Replay metadata from the terminal finish chunk, if any, with per-block
   * entries pruned in step with {@link blocks}. Undefined when the envelope's
   * entries do not align with the emitted blocks.
   */
  get replayState(): ReplayEnvelope | undefined;
  /**
   * The assembled assistant message.
   * @param source - provider/model attribution (without the `kind` tag) for the assembled message.
   * @returns a frozen assistant-role message over `blocks()` (same open-block assembly rules).
   */
  message(source: Omit<ModelMessageSource, 'kind'>): AssistantMessage;
}
```

<a id="the-model-request-and-result"></a>

## La solicitud de modelo

Una llamada de modelo es un `GenerateOptions` completamente ensamblado. El adaptador responde con un flujo [`StreamChunk`](#streamchunk--the-raw-protocol) en bruto; el consumidor lo ensambla con [`BlockAssembler`](#blockassembler).

Fuente: [`packages/llm/llm/src/types.ts`](../../packages/llm/llm/src/types.ts)

El descubrimiento de proveedores y modelos usa pequeños descriptores agnósticos de proveedor. Un catálogo de modelos es consultivo: el enrutado sigue dependiendo de un proveedor registrado.

Registrar un adaptador devuelve un identificador: el disposer, más el reemplazo atómico de rutas que necesita un plugin cuyo conjunto de rutas es configurable por el usuario.

```ts type-equiv
/**
 * What {@link LlmRuntime.registerAdapter} returns: the disposer, plus an
 * atomic route replacement for the same adapter instance.
 */
interface AdapterRegistrationHandle {
  /** Release every route this registration currently holds. */
  (): void
  /**
   * Replace this registration's routes with `providers`, keeping the same
   * adapter instance. The candidate set is validated in full first — a
   * conflict with another adapter, an invalid name, or bad provider metadata
   * throws and leaves the current routes untouched — and the swap itself is
   * one synchronous section, so no request can observe a gap. An empty array
   * is legal here (a settings section that emptied holds zero routes while
   * staying registered), unlike an empty initial registration.
   *
   * Throws `LlmError` with code `REGISTRATION_DISPOSED` once the registration
   * has been released: its routes are gone and its disposer has already run,
   * so anything registered afterwards would have no owner left to release it.
   * @param providers - the complete next route set for this registration.
   */
  replace(providers: string[]): void
}
```

```ts type-equiv
/** Display metadata for one registered provider route. */
interface LlmProviderInfo {
  /** Provider route key used by {@link GenerateOptions.provider}. */
  id: string
  /** Human-readable provider name for selectors and diagnostics. */
  name: string
}
```

Los plugins de adaptador declaran además qué rutas *podrían* ejecutarse a través de `registerConfigurableProviders()`, indicando la sección de configuración de usuario de cada una, de modo que las superficies de configuración puedan ofrecer proveedores inactivos antes de que se registre ninguna ruta.

```ts type-equiv
/**
 * One provider route an adapter plugin can activate through configuration,
 * whether or not the route is currently registered. Configuration surfaces
 * merge this directory with `listProviders()` to offer every configurable
 * provider alongside its live/dormant state.
 */
interface LlmConfigurableProvider {
  /** Provider route key this entry activates when configured. */
  provider: string
  /** Human-readable provider name for configuration surfaces. */
  displayName: string
  /** User-settings namespace whose section configures this provider. */
  settingsNs: string
  /**
   * Path from that namespace's section root to this provider's profile
   * object; empty when the whole section is the profile.
   */
  settingsPath: readonly string[]
  /**
   * Whether the owning adapter knows this route only because configuration
   * declared it — a gateway or self-hosted server it ships nothing about.
   * Absent means the adapter draws no such distinction; false means it does
   * and this route is one of its own. Only the adapter can answer: a stored
   * profile is how a user-added route AND a corrected shipped one both look
   * from outside.
   */
  declared?: boolean
  /** Configuration diagnostic for repair; unaffected models may remain serviceable. */
  error?: string
}
```

```ts type-equiv
/** One adapter-discovered model; catalog membership is advisory, not request validation. */
interface LlmModelInfo {
  /** Provider route that owns this model entry. */
  provider: string
  /** Model id passed to {@link GenerateOptions.model}. */
  id: string
  /** Human-readable model name for selectors. */
  name: string
  /** Optional user-facing distinction from otherwise similar models. */
  description?: string
  /** Accepted request modalities; absent means unknown, while an explicit omission is negative capability. */
  inputModalities?: readonly ModelModality[]
}
```

Los metadatos sensibles a la corrección se resuelven por separado del catálogo consultivo y son propiedad del adaptador que sirve la ruta exacta. La capacidad de contexto, los valores por defecto de llamada del adaptador, las opciones de razonamiento y el modo de actualización del prompt del sistema comparten un único resultado de modelo exacto para que los consumidores no repitan la resolución autoritativa del modelo. `SystemPromptUpdate` tiene el único valor `'in-history'`: el modelo lee el último mensaje `system` en cualquier posición de `messages` como el prompt del sistema efectivo completo, de modo que el agent loop puede anexar un prompt cambiado tras el historial cacheado en lugar de reescribir el mensaje 0 ([regla de decisión](../../packages/core/agent-loop/README.md#understand-the-implementation)); un modo ausente significa que solo se lee un mensaje system inicial, y `normalizeModelInfo` rechaza cualquier otro valor con `INVALID_MODEL_INFO`.

```ts type-equiv
/** Provider-owned context capacity for one exact provider/model route. */
interface LlmModelContext {
  /** Maximum combined request and response context in tokens. */
  contextWindow: number
}
```

El esfuerzo de razonamiento es otra capacidad de ruta exacta. El núcleo pone brand a los identificadores pero no enumera sus valores; cada adaptador es dueño del conjunto ordenado, los nombres para mostrar y el valor por defecto opcional del despliegue.

```ts type-equiv
/** Adapter-owned identifier for one model's selectable reasoning effort. */
type ReasoningEffortId = Branded<'ReasoningEffortId'>
```

```ts type-equiv
/** Display metadata for one adapter-owned reasoning effort. */
interface LlmReasoningEffortInfo {
  /** Opaque stable value accepted by {@link GenerateOptions.reasoningEffort}. */
  id: ReasoningEffortId
  /** Human-readable effort name for selectors and diagnostics. */
  name: string
  /** Optional user-facing distinction from otherwise similar efforts. */
  description?: string
}
```

```ts type-equiv
/** Selectable reasoning efforts for one exact provider/model route. */
interface LlmModelReasoningInfo {
  /** Supported efforts in adapter-preferred display order. */
  efforts: readonly LlmReasoningEffortInfo[]
  /**
   * Adapter-configured default materialized into requests when callers omit
   * an effort. Absence preserves the provider's own default.
   */
  defaultEffort?: ReasoningEffortId
}
```

```ts type-equiv
/** Exact-route model metadata resolved by its owning adapter. */
interface LlmResolvedModelInfo extends LlmModelInfo {
  /** Provider-owned context capacity when known. */
  context?: LlmModelContext
  /** Adapter-configured per-request output cap materialized when callers omit one. */
  defaultMaxTokens?: number
  /** Adapter-owned selectable reasoning levels when exposed. */
  reasoning?: LlmModelReasoningInfo
  /** Declared mid-conversation system prompt handling; absent means only a leading system message is read. */
  systemPromptUpdate?: SystemPromptUpdate
  /** Declared mid-conversation tool declaration handling; absent means every request declares the complete tool list. */
  toolUpdate?: ToolUpdate
}
```

Los llamantes auxiliares pueden proporcionar contenido de usuario sin identidad ni fuente durables. Los historiales `Message[]` existentes siguen siendo entradas de solicitud válidas. Las escrituras de sesión, la entrega al Agent y las solicitudes de título registradas siguen requiriendo mensajes durables.

```ts type-equiv
/** User input for one LLM request; it has no durable Session identity or source. */
interface RequestUserInput {
  readonly role: 'user'
  readonly content: UserMessage['content']
  readonly id?: never
  readonly source?: never
}
```

```ts type-equiv
/** A durable conversation message or a user input used only for one request. */
type RequestMessage = Message | RequestUserInput
```

```ts type-equiv
/** A single model request, fully assembled. */
interface GenerateOptions {
  /** Registered provider route selecting the adapter instance. */
  provider: string
  model: string
  /** Adapter-owned reasoning effort selected for this exact model. */
  reasoningEffort?: ReasoningEffortId
  /**
   * Ordered conversation messages, exactly as the provider sees them. A
   * loop-built request passes the derived history (dsh-agent-loop), whose
   * leading system-role message carries the system prompt; a hand-built
   * one-shot may include identity-free user inputs.
   */
  messages: RequestMessage[]
  /**
   * System prompt text for one-shot callers; adapters map it to the provider's
   * system slot ahead of `messages`. Loop-built requests leave it undefined.
   */
  system?: string
  /** Tool schemas (adapters map to the provider's `tools` field). */
  tools?: ToolSchema[]
  /** Session-folded tool history used for route projection; omission sends complete declarations without tool updates. */
  toolHistory?: ToolHistory
  temperature?: number
  maxTokens?: number
  /**
   * Stop sequences: generation halts as soon as the model produces any one of
   * these strings (adapters map to the provider's stop field, e.g. OpenAI
   * `stop`). The stop string itself is not included in the output.
   */
  stop?: string[]
  signal?: AbortSignal
  /**
   * Session identity stamped by the loop for request routing. Replay uses it
   * to separate cursors; adapters may map it to model-hidden transport metadata.
   */
  sessionId?: Branded<'SessionId'>
  /**
   * Provider-neutral classification for an auxiliary model call. Adapters may
   * map the purpose to model-hidden transport metadata or purpose-specific
   * generation policy. Ordinary conversation requests leave it unset.
   */
  purpose?: 'compaction' | 'session-title'
}
```

Por qué se detuvo una respuesta del modelo es una razón extensible por merge. Los fallos terminales del proveedor portan el [`LlmFailure`](#llmfailure) del contrato de streaming:

```ts type-equiv
/**
 * Why a model response stopped.
 * Merge-extensible so adapters can surface provider-specific reasons.
 */
interface FinishReasonMap {
  'stop': { kind: 'stop' }
  'tool-calls': { kind: 'tool-calls' }
  'max-tokens': { kind: 'max-tokens' }
  'aborted': { kind: 'aborted'; failure: LlmFailure }
  'error': { kind: 'error'; failure: LlmFailure }
}
```

`FinishReason = FinishReasonMap[keyof FinishReasonMap]`. `TokenUsage` (contabilidad por llamada con campos de caché disjuntos) se detalla [más abajo](#tokenusage).

`GenerateOptions.tools` porta `ToolSchema`: la descripción en JSON Schema de una tool, tal como se envía al modelo. Se declara en dsh-llm (no en dsh-tools) precisamente porque forma parte de la solicitud que el loop ensambla en cada paso:

```ts type-equiv
/**
 * JSON-schema description of a tool, as sent to the model.
 *
 * Declared here (not in dsh-tools) because it is part of {@link GenerateOptions};
 * dsh-tools' ToolDefinition and dsh-system-prompt's PromptAssembly both import
 * it from this package.
 */
interface ToolSchema {
  /**
   * Requests deferred loading of the tool definition into model context,
   * independently of whether a tool-addition block records the tool.
   * Uses Anthropic's defer_loading terminology.
   */
  deferLoading?: true
  name: string
  description: string
  /** JSON Schema object for the arguments. */
  parameters: Record<string, unknown>
}
```

El `ToolSchema` visible para el modelo es el tipo de cable; el `ToolDefinition` registrado que lo produce (schema + `execute`) está en [tools.md](tools.es.md).

Un proveedor que una superficie aún está redactando no tiene ruta ni catálogo, así que la interrogación se describe por separado: la solicitud porta el borrador que el usuario está editando, y la respuesta son candidatos que una superficie puede adoptar en lugar de un catálogo que deba servir.

```ts type-equiv
/**
 * One interrogation of a provider endpoint that configuration has not stored
 * yet. Configuration surfaces send the draft a user is still editing, so the
 * request carries the endpoint and credential directly instead of naming a
 * route: a provider being added has no route to name.
 */
interface LlmModelDiscoveryRequest {
  /**
   * Route the draft is editing, when it edits an existing one. A route whose
   * adapter already knows its models answers from that knowledge instead of
   * asking the endpoint — the adapter's own registry is the better answer, and
   * it costs no network call.
   */
  provider?: string
  /**
   * Endpoint to interrogate. Optional because a route the adapter already
   * describes needs none; a route it does not must supply one.
   */
  baseURL?: string
  /** Wire protocol the endpoint speaks, when the draft names one. */
  api?: string
  /** Credential for this interrogation alone; the harness never stores it. */
  apiKey?: string
}
```

```ts type-equiv
/**
 * One model an endpoint reports about itself. Every field but the id is
 * optional because most provider listings disclose an id and nothing else;
 * a surface adopting one of these still owes the capacities its adapter needs.
 */
interface LlmDiscoveredModel {
  /** Model id the endpoint accepts. */
  id: string
  /** Human-readable name when the endpoint supplies one. */
  name?: string
  /** Maximum combined request and response context, when disclosed. */
  contextWindow?: number
  /** Maximum output tokens, when disclosed. */
  maxTokens?: number
  /** Accepted input types when disclosed by the catalog or endpoint; absent means unknown. */
  inputModalities?: readonly ModelModality[]
}
```

### El sobre de la solicitud: `LlmCallConfig` y la cabecera registrada

El loop construye cada solicitud a partir del estado registrado. `EpochHeader` registra la config de la llamada, marca los campos suministrados por los valores por defecto del adaptador y registra el orden de tools devuelto autoritativo (configurado por `toolOrder`, o lexicográfico cuando no está fijado) mediante snapshots `request/header` completos. El prompt renderizado es historial derivado: el `system/message` en el nodo de superficie 0, más cualquier nodo system posterior que una ruta `in-history` haya anexado, de modo que la cabecera y el historial derivado juntos hacen que la solicitud sea reconstruible a partir del registro de sesión. Véase [session.md](session.es.md#the-request-header-event-requestheader) y el [Agent Note de reconstruibilidad](../../.agents/notes/implemented/architecture/2026-07-05-reconstructable-requests.md).

`agent/request` recibe una semilla congelada de config de llamada y puede devolver un reemplazo para cambiar de proveedor, modelo, esfuerzo de razonamiento o muestreo. Antes del waterfall (eventos en cascada), el loop elimina los valores marcados como valores por defecto del adaptador para que la preparación de modelo exacto materialice los valores actuales de la ruta seleccionada; los ajustes explícitos no marcados permanecen en la propuesta. Después del waterfall, la preparación rechaza los ids de esfuerzo explícitos no soportados sin recortarlos y registra la config efectiva más los campos suministrados por los valores por defecto del adaptador bajo la señal del turno. En la admisión del paso, este waterfall y la preparación se ejecutan tras el ensamblado y `step/start` pero antes de que el prompt del sistema y el lote de usuario aceptado se confirmen; la cancelación durante cualquiera de los dos no confirma ninguno. La capacidad preparada gobierna la reconciliación del prompt, y la llamada conserva un registro de adaptador durante el despacho. Las solicitudes que llegan a `llm/stream` están congeladas en profundidad, de modo que mutarlas lanza, y portan una identidad de loop local al proceso para que los observadores no confundan llamadas auxiliares congeladas registradas por separado con solicitudes de conversación.

En el cable, una solicitud construida por el loop es solo el historial derivado: el prompt renderizado viaja como el mensaje de rol `system` inicial (nodo de superficie 0, un evento `system/message`) y, cuando la llamada preparada declara `systemPromptUpdate: 'in-history'`, un prompt cambiado no vacío puede seguir al historial cacheado como un mensaje posterior de rol `system` que el modelo lee como el prompt efectivo; el campo `system` de la solicitud está sin fijar: `GenerateOptions.system` sirve a llamantes directos de un solo uso como los proveedores de títulos. Un renderizado vacío no deja mensajes system en el historial derivado, incluso cuando solicitudes anteriores conservaron varias versiones del prompt. La solicitud registrada termina con el `user/message` más nuevo en el primer paso de un turno y con los resultados de tools del paso anterior en los pasos posteriores. El invariante de desarrollo recalcula exactamente esta ecuación contra cada solicitud construida por el loop y rechaza una solicitud del loop que porte un campo `system`.

FIXME(call-config-shape): revisar qué campos restantes son genuinamente de nivel de época a efectos de caché (`model` y el esfuerzo de razonamiento propiedad del modelo son explícitos; los escalares de muestreo están aquí por cautela).

```ts type-equiv
/**
 * Provider, model, reasoning effort, and sampling scalars of one conversation's
 * requests. Every field maps 1:1 onto the same-named `GenerateOptions` field;
 * the loop builds requests from the logged header rather than accepting these
 * per call.
 */
interface LlmCallConfig {
  provider: string
  model: string
  reasoningEffort?: ReasoningEffortId
  temperature?: number
  maxTokens?: number
  stop?: string[]
}
```

```ts type-equiv
/**
 * Effective config fields supplied by exact-model adapter resolution rather
 * than by the caller's request proposal.
 */
interface LlmCallConfigAdapterDefaults {
  reasoningEffort?: true
  maxTokens?: true
}
```

## Contratos de servicio y proveedor

`LlmAdapter` es el contrato del proveedor: derivar una subclase, implementar `stream()` y registrar una instancia de adaptador con `ctx.llm.registerAdapter(providers, adapter)`. `GenerateOptions.provider` selecciona el adaptador registrado; `GenerateOptions.model` se pasa a ese adaptador y no necesita estar registrado al inicio del ciclo de vida. Las rutas de proveedor duplicadas fallan atómicamente. El `providerRetryPolicy()` opcional se captura por ruta con los valores normales por defecto, mientras que `providerInfo()` y el `listModels()` asíncrono alimentan `LlmRuntime.listProviders()` / `listModels()` con metadatos de selector desacoplados. Ese catálogo es consultivo, no una lista blanca de solicitudes: el adaptador sigue siendo autoritativo y puede aceptar ids de modelo no listados. Una consulta asíncrona `resolveModel()` devuelve la identidad exacta del modelo más la capacidad de contexto opcional sensible a la corrección, un `defaultMaxTokens` configurado por el adaptador y los ids de razonamiento ordenados propiedad del modelo con un valor por defecto opcional del despliegue; los campos ausentes significan metadatos no disponibles o comportamiento propiedad del proveedor, no pertenencia inválida al catálogo. El resolvedor recibe cancelación opcional y debe liquidar pronto tras el aborto. `LlmRuntime.resolveModelInfo()` valida y desacopla el agregado. En la frontera final del adaptador, `resolveCallConfig()` materializa el valor por defecto de salida solo cuando `maxTokens` está ausente y valida y materializa el razonamiento, de modo que las llamadas directas no pueden eludir ninguno de los dos comportamientos configurados; el despacho directo captura un registro antes de esperar esa resolución. El agent loop, en cambio, usa `prepareCall()` para conservar el mismo registro a través de la resolución del modelo, el registro durable de la cabecera y el despacho, retener los metadatos de contexto desacoplados de esa búsqueda exacta y reportar qué campos de config tomó por defecto el adaptador. La búsqueda del adaptador ocurre en la continuación terminal del waterfall `llm/stream`, de modo que un listener puede cortocircuitar la llamada o enrutar una solicitud mutable de un solo uso antes de la búsqueda. AgentLoop observa un intento de solicitud una vez que el waterfall exterior devuelve un identificador de flujo; esa frontera limitada no prueba que un adaptador terminal perezoso fuera construido ni que comenzara E/S de proveedor. La correlación por `index` de `block-start` / `block-end` y el ensamblador juntos significan que un adaptador solo tiene que emitir fragmentos bien formados: el reensamblado de bloques no es problema de cada adaptador. [architecture.md](../architecture.es.md#turn-flow) muestra dónde se sitúan `ctx.llm.stream()` y el waterfall `llm/stream` en un turno.

```ts type-equiv
/** One model call whose config and adapter registration were resolved together. */
interface PreparedLlmCall {
  /** Detached, deep-frozen config with any adapter-owned default materialized. */
  readonly config: LlmCallConfig
  /** Immutable retry policy captured with the adapter registration. */
  readonly retryPolicy: ResolvedRetryPolicy
  /** Detached context metadata resolved with the registration-bound call. */
  readonly context?: LlmModelContext
  /** Exact model modalities captured with the adapter dispatch generation. */
  readonly inputModalities?: readonly ModelModality[]
  /** Exact model system prompt update mode captured with the adapter dispatch generation. */
  readonly systemPromptUpdate?: SystemPromptUpdate
  /** Exact model tool update mode captured with the adapter dispatch generation. */
  readonly toolUpdate?: ToolUpdate
  /** Config fields materialized by the captured adapter rather than proposed by the caller. */
  readonly adapterDefaults: LlmCallConfigAdapterDefaults
  /**
   * Dispatch this call once through the registration captured during
   * preparation. The request's call-config fields must match {@link config};
   * reuse or mismatch fails with `INVALID_PREPARED_CALL`.
   * @param options - fully assembled request carrying the prepared config.
   * @returns the chunk stream, including the `llm/stream` waterfall.
   */
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>
}
```

```ts public-api
/**
 * Provider-wire adapter for the harness message and stream vocabulary. Register implementations
 * with `ctx.llm.registerAdapter(providers, adapter)`. Every provider HTTP request must include
 * `attributionHeaders()`; prove the headers are added in the wire request or library header hook. The direct-fetch
 * DeepSeek and library-backed pi-ai adapters meet this contract through different internals.
 */
declare abstract class LlmAdapter {
  /**
   * Describe one provider route owned by this adapter.
   * @param provider - a route passed to `registerAdapter()` for this instance.
   * @returns detached display metadata whose id must equal `provider`.
   */
  providerInfo(provider: string): LlmProviderInfo;
  /**
   * Return the provider-owned retry policy captured with this route.
   * @param _provider - a route passed to `registerAdapter()` for this instance.
   * @returns a resolved policy, or `undefined` to use the normal defaults.
   */
  providerRetryPolicy(_provider: string): ResolvedRetryPolicy | undefined;
  /**
   * Resolve provider-side request-image pricing for one exact model route.
   * The default declares none, so consumers fall back to their own neutral
   * estimate. Implementations must answer synchronously without I/O; the
   * token meter resolves this per measurement.
   * @param _provider - a route passed to `registerAdapter()` for this instance.
   * @param _model - exact model id passed to {@link GenerateOptions.model}.
   * @returns route-owned image pricing, or `undefined` when the route declares none.
   */
  imageRequestPricing(_provider: string, _model: string): LlmImageRequestPricing | undefined;
  /**
   * List models this adapter can currently advertise for one owned provider.
   * Core routing accepts unlisted model ids; catalog-driven entry points such
   * as the GUI may require membership. Adapters used there must advertise
   * their available models; the base empty catalog offers no GUI selection.
   * @param _provider - one provider route owned by this adapter.
   * @returns discoverable models in adapter-preferred order.
   */
  listModels(_provider: string): Promise<readonly LlmModelInfo[]>;
  /**
   * Resolve all metadata available for one exact model. This query is
   * independent of the advisory catalog and does not validate request routing.
   * @param provider - one provider route owned by this adapter.
   * @param model - exact model id passed to {@link GenerateOptions.model}.
   * @param _signal - cancellation for this exact-model lookup; asynchronous
   *   implementations must settle promptly after it aborts.
   * @returns provider/model identity plus any context, call-default, and reasoning metadata.
   */
  resolveModel(
    provider: string,
    model: string,
    _signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo>;
  /**
   * Bind exact model metadata and the eventual request dispatch to one adapter generation.
   * Dynamic adapters override this so settings changes between preparation and
   * dispatch cannot combine one generation's capabilities with another's endpoint.
   * @param provider - registered provider route.
   * @param model - exact model id.
   * @param signal - cancellation for model resolution.
   * @returns model metadata and a one-generation stream entry point.
   */
  async prepareCall(provider: string, model: string, signal?: AbortSignal): Promise<PreparedAdapterCall>;
  /**
   * Stream one model call as raw chunks. The only required method.
   * @param options - the fully-assembled request; implementations must honor `options.signal`.
   * @returns the chunk stream, obeying the adapter contract documented on `StreamChunk`.
   */
  abstract stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
```

`ContentBlockType` (el conjunto de claves que portan los bloques correlacionados por `index`) deriva del [`ContentBlockMap`](#content-blocks-and-messages) anterior.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxllm--llmruntime"></a>

### `ctx.llm` — `LlmRuntime`

The abstract `llm` service: an adapter registry plus a streaming model-call API, interceptable via the `llm/stream` waterfall.

```ts cordis-catalog
/**
 * Register an adapter for the given provider routes. Throws `LlmError` with code
 * `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
 * Disposed with the fiber.
 * @param providers - every provider route this adapter should serve.
 * @param adapter - the adapter that streams calls for those providers.
 * @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
 */
registerAdapter(providers: string[], adapter: LlmAdapter): AdapterRegistrationHandle

/**
 * Describe provider routes with a registered adapter.
 * @returns detached provider metadata in registration order.
 */
@Remote listProviders(): LlmProviderInfo[]

/**
 * Declare provider routes an adapter plugin can activate through
 * configuration. Registration is all-or-nothing: an empty list, invalid
 * entry, or a provider already declared by any registration throws
 * `LlmError` without registering the rest. Disposed with the fiber.
 * @param entries - every configurable provider this plugin owns.
 * @returns a handle that withdraws all of them, and can atomically replace them.
 */
registerConfigurableProviders(entries: readonly LlmConfigurableProvider[]): DirectoryRegistrationHandle

/**
 * List every declared configurable provider, registered or dormant.
 * @returns detached directory entries in declaration order.
 */
@Remote listConfigurableProviders(): LlmConfigurableProvider[]

/**
 * Offer to interrogate provider endpoints on behalf of the settings
 * namespace this plugin owns. The namespace is the key because that is what
 * a configuration surface already holds from the configurable-provider
 * directory, and because a provider being *added* has no route to name yet.
 * Disposed with the fiber.
 * @param settingsNs - the namespace whose profiles this discovery serves.
 * @param discover - interrogates one endpoint and must honor the supplied signal.
 * @returns the disposer that withdraws the offer.
 */
registerModelDiscovery( settingsNs: string, discover: ( request: LlmModelDiscoveryRequest, signal?: AbortSignal, ) => Promise<readonly LlmDiscoveredModel[]>, ): () => void

/**
 * Interrogate one provider endpoint for the models it advertises. The
 * request describes a draft, not a stored route, so nothing here reads or
 * writes settings or credentials — the caller owns both, and the reply is
 * candidate metadata a surface may offer for adoption.
 * @param settingsNs - namespace whose registered discovery serves this draft.
 * @param request - the endpoint, protocol, and one-shot credential to use.
 * @param signal - caller cancellation.
 * @returns the advertised models, deduplicated in endpoint order.
 */
async discoverModels( settingsNs: string, request: LlmModelDiscoveryRequest, signal?: AbortSignal, ): Promise<LlmDiscoveredModel[]>

/**
 * Remote adapter for one draft provider interrogation.
 * @param settingsNs - namespace whose registered discovery serves this draft.
 * @param request - endpoint, protocol, and one-shot credential to use.
 * @param signal - caller cancellation supplied by the Remote carrier.
 * @returns advertised models in endpoint order.
 * @throws RemoteError with `llm/model-discovery-rejected` when discovery refuses or fails.
 */
@Remote('discoverModels') async remoteDiscoverModels( settingsNs: string, request: LlmModelDiscoveryRequest, signal: AbortSignal, ): Promise<LlmDiscoveredModel[]>

/**
 * Resolve the retry policy captured when one provider route was registered.
 * @param provider - registered provider route to inspect.
 * @returns the provider-owned policy, with normal defaults already resolved.
 */
providerRetryPolicy(provider: string): ResolvedRetryPolicy

/**
 * Resolve provider-side request-image pricing for one exact route, or
 * `undefined` when the provider is unregistered or declares none. Unknown
 * providers degrade to `undefined` rather than throwing because callers
 * price durable history whose route may no longer be mounted.
 * @param provider - provider route named by a request header.
 * @param model - exact model id named by the same header.
 * @returns the owning adapter's image pricing for the route, when declared.
 */
imageRequestPricing(provider: string, model: string): LlmImageRequestPricing | undefined

/**
 * Resolve the exact text one durable file occurrence contributes to every
 * provider request in the current execution environment.
 * @param ref - durable verbatim file reference from model history.
 * @returns the same deterministic handle text used at adapter dispatch.
 */
fileRequestText(ref: FileAttachmentRef): string

/**
 * Discover models advertised by one registered provider. Catalog membership
 * does not constrain core routing. Catalog-driven entry points may restrict
 * selection and submission to the advertised models.
 * @param provider - registered provider route to inspect.
 * @returns detached model metadata in adapter-preferred order.
 */
async listModels(provider: string): Promise<LlmModelInfo[]>

/**
 * Resolve and validate all metadata from the adapter that owns one exact
 * route. The result is detached from adapter-owned objects; catalog
 * membership remains advisory and does not control request routing.
 * @param provider - registered provider route to inspect.
 * @param model - exact model id passed to the adapter.
 * @param signal - optional cancellation for adapter-owned asynchronous lookup.
 * @returns exact model identity plus available context and reasoning metadata.
 */
async resolveModelInfo( provider: string, model: string, signal?: AbortSignal, ): Promise<LlmResolvedModelInfo>

/**
 * Validate a conversation call config against its exact model capability and
 * materialize adapter-configured defaults. Unsupported explicit efforts
 * reject before provider I/O; no clamping or aliasing is performed. This
 * standalone query does not bind a later dispatch; use {@link prepareCall}
 * when logging and streaming must share one adapter registration.
 * @param config - provider/model route and optional request controls.
 * @param signal - optional cancellation for adapter-owned capability lookup.
 * @returns a detached config only when a default must be materialized.
 */
async resolveCallConfig(config: LlmCallConfig, signal?: AbortSignal): Promise<LlmCallConfig>

/**
 * Resolve one call under its current adapter registration. The returned
 * one-shot handle keeps that registration across header logging and dispatch,
 * so HMR cannot combine one adapter's capability result with another adapter.
 * @param config - provider/model route and optional request controls.
 * @param signal - optional cancellation for adapter-owned capability lookup.
 * @returns a prepared config and its registration-bound stream entry point.
 */
async prepareCall(config: LlmCallConfig, signal?: AbortSignal): Promise<PreparedLlmCall>

/**
 * Stream one model call as raw chunks (token-level deltas). Replay state is
 * retained only when the same adapter instance owns its historical provider
 * and the target provider. Final adapter selection remains fixed through
 * asynchronous exact-model resolution and dispatch. Adapter selection,
 * dispatch, and iteration failures become terminal `error` or `aborted`
 * finish chunks; middleware, nested-call, cleanup, and consumer failures
 * remain thrown.
 * @param options - the full request; `options.provider` selects the adapter.
 * @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
 */
stream(options: GenerateOptions): AsyncIterable<StreamChunk>
```

Types: [FileAttachmentRef](attachment.es.md)

Source: [`packages/llm/llm/src/index.ts`](../../packages/llm/llm/src/index.ts)

<a id="llm-events"></a>

### `llm/*` events

<a id="llmadapters-updated--emit"></a>

#### `llm/adapters-updated` — emit

The provider topology changed: an adapter registered or unregistered routes, or the configurable-provider directory gained or lost entries. This payload-free registry notification fires at each commit point (including registration disposal); consumers re-read `listProviders()`, `listModels()`, or `listConfigurableProviders()` for the new state. Observer failures are contained and cannot veto the registry mutation.

```ts cordis-catalog
/**
 * The provider topology changed: an adapter registered or unregistered
 * routes, or the configurable-provider directory gained or lost entries.
 * This payload-free registry notification fires at each commit point
 * (including registration disposal); consumers re-read `listProviders()`,
 * `listModels()`, or `listConfigurableProviders()` for the new state.
 * Observer failures are contained and cannot veto the registry mutation.
 * @mode emit
 */
'llm/adapters-updated'(): void
```

Source: [`packages/llm/llm/src/types.ts`](../../packages/llm/llm/src/types.ts)

<a id="llmstream--waterfall"></a>

#### `llm/stream` — waterfall

Waterfall around every streaming model call (retry, replay, routing). Bound to the LlmRuntime; call `next()` to reach the resolved adapter's stream, or yield your own chunks to short-circuit.

```ts cordis-catalog
/**
 * Waterfall around every streaming model call (retry, replay, routing).
 * Bound to the {@link LlmRuntime}; call `next()` to reach the resolved
 * adapter's stream, or yield your own chunks to short-circuit.
 * @param options - the full request. A LOOP-built request carries the
 *   process-local {@link markAgentLoopRequest} identity and arrives deep-frozen
 *   (mutation throws): its content is a pure function of the session log (the
 *   reconstructability Agent Note), so listeners read it, never rewrite it.
 *   Hand-built calls do not carry that marker; callers own their request
 *   inputs and must keep them unchanged until the stream settles.
 * @mode waterfall
 */
'llm/stream'(this: LlmRuntime, options: GenerateOptions, next: () => AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk>
```

Source: [`packages/llm/llm/src/index.ts`](../../packages/llm/llm/src/index.ts)
<!-- END GENERATED cordis-surface -->
