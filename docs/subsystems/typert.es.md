# Llamadas Remote de Typert

[English](typert.md) | Español

Tipos compartidos por los artefactos Remote generados, la puerta de enlace del Host y los ensamblados de API de los consumidores. El [Agent Note de la puerta de enlace Typert](../../.agents/notes/implemented/architecture/2026-08-02-typert-remote-method-calls.md) posee las decisiones de arquitectura y transporte; esta página registra los contratos públicos literales de [`dsh-typert-protocol`](../../packages/typert/protocol/src/types.ts) y [`dsh-api-gateway`](../../packages/api/gateway/src/types.ts).

## Declaraciones de lookup y Context

Los paquetes de objetos de negocio extienden dos mapas vacíos mediante fusión de declaraciones. Un lookup asocia un tipo de objeto del Host con su identidad de cable; una declaración de Context asocia un tipo de Context con ámbito con su identidad de cable. Los descriptores generados nombran estas claves, mientras que los proveedores de runtime aportan el comportamiento de resolución en vivo.

```ts type-equiv
/** Merge-extensible Host object lookup declarations. */
interface TypertLookupMap {}
```

```ts type-equiv
/** Merge-extensible scoped Context declarations. */
interface TypertContextMap {}
```

El registry conserva la declaración de cable de un lookup después de que su resolvedor se descarga. El descubrimiento SRC sigue por tanto clasificando el parámetro como un lookup y falla como no disponible en lugar de aceptar el valor de cable como un objeto de negocio ordinario.

```ts type-equiv
/** Stable wire declaration retained after a lookup provider unloads. */
interface TypertLookupDefinition {
  /** Merge-declared lookup key. */
  readonly key: string
  /** Source parameter name recognized by the SRC weak parser. */
  readonly parameter: string
  /** Wire field replacing the Host object parameter. */
  readonly wire: string
  /** Canonical Host type symbol used by strict generation. */
  readonly hostTypeSymbol: string
  /** Canonical wire type symbol used by strict generation. */
  readonly wireTypeSymbol: string
}
```

## Descriptores de invocación

Un `InvocationDescriptor` es reflexión local, no un mensaje de cable. Las compilaciones del Host y del consumidor generan descriptores correspondientes; la solicitud envía solo el endpoint y los `args` nombrados. Los códecs estrictos llevan fábricas de schemas generadas, mientras que los códecs SRC imponen entradas seguras para JSON sin recuperación estructural de tipos. Los códecs de resultados unarios pueden aportar `encode()` para los subárboles que contienen bytes y `decode()` para la validación recursiva de bytes nativos; las declaraciones del Client estrechan cada `Uint8Array` a un respaldo de `ArrayBuffer`. Los resultados JSON puros no necesitan ni detección de bytes ni decodificación en el Client. La cancelación es una señal del portador fuera de banda inyectada tras los parámetros de negocio y nunca entra en `args`.

```ts type-equiv
/** Codec attached to one invocation parameter or result. */
type TypertCodec =
  | {
    readonly mode: 'strict'
    readonly typeSymbol: string
    /** Materialize and return the process-realm schema on first boundary use. */
    readonly create: () => TypertSchema
    /**
     * Decode a unary result whose fields require type-specific handling.
     * @param value - result reconstructed by the RPC carrier.
     * @returns the validated result, retaining native byte views.
     */
    readonly decode?: (value: unknown) => unknown
    /**
     * Project typed binary fields into RPC result attachments.
     * @param value - native unary result.
     * @param writeBytes - records a byte view at its result-relative path and returns its JSON placeholder.
     * @returns JSON metadata with untouched JSON subtrees retained.
     */
    readonly encode?: (value: unknown, writeBytes: (bytes: Uint8Array, path: readonly (string | number)[]) => null) => unknown
  }
  | {
    readonly mode: 'src-json'
  }
```

```ts type-equiv
/** One ordered business parameter in a Remote invocation. */
interface InvocationParameterDescriptor {
  /** Source-level parameter name. */
  readonly name: string
  /** Required key in the wire `args` object. */
  readonly wire: string
  /** Whether the value is JSON or requires a registered Host lookup. */
  readonly source: 'json' | 'lookup'
  /** Lookup key when `source` is `lookup`. */
  readonly lookup?: string
  /** Boundary codec for the wire representation. */
  readonly codec: TypertCodec
  /** Missing wire fields decode to `undefined` only for an explicitly declared `T | undefined`. */
  readonly acceptsUndefined?: true
}
```

```ts type-equiv
/** Carrier-independent description of one exported method invocation. */
interface InvocationDescriptor {
  /** Globally stable generated identity. */
  readonly id: string
  /** Cordis service key owning the method. */
  readonly service: string
  /** Wire namespace, defaulting to the service key. */
  readonly namespace: string
  /** Public instance method name. */
  readonly method: string
  /** Service member invoked when the exported method name is an alias. */
  readonly implementation?: string
  /** Absent for unary calls; stream calls deliver every yielded item as the Host produced it. */
  readonly mode?: 'stream'
  /** Receiver selection mode. */
  readonly invocation:
    | { readonly kind: 'direct' }
    | {
      readonly kind: 'context'
      readonly context: string
      readonly wire: string
      readonly codec: TypertCodec
    }
  /** Optional consuming-Context projection for one direct lookup parameter. */
  readonly scope?: {
    /** Context kind whose Client adapter supplies the identity. */
    readonly context: string
    /** Lookup parameter wire field replaced by the Context identity. */
    readonly wire: string
  }
  /** Ordered business parameters. */
  readonly parameters: readonly InvocationParameterDescriptor[]
  /**
   * Client-to-Host items of the same logical stream, generated from the `In`
   * type argument of the method's `RemoteStream<Out, In>` return type; absent
   * when `In` is `never`. The method reads the items through
   * `RemoteInvocation.uplink()`, so nothing enters the parameter list.
   */
  readonly uplink?: {
    /** Codec validating every uplink item before `uplink()` delivers it. */
    readonly codec: TypertCodec
  }
  /** Transport cancellation injected after business parameters instead of entering wire args. */
  readonly cancellation?: {
    /** Reserved final Host method parameter. */
    readonly parameter: 'signal'
  }
  /** Codec for the unary result or each yielded stream item. */
  readonly result: TypertCodec
  /** Source declaration used only for diagnostics. */
  readonly sourceLocation?: InvocationSourceLocation
}
```

El alias del Host `RemoteStream<Out, In>` nombra ambas direcciones de un flujo, y el método receptor lee su contexto de llamada como `this.ctx.invocation`:

```ts type-equiv
/**
 * One Remote stream as a Host method returns it: the items it yields to the
 * Client, iterated as a plain `AsyncIterable<Out>`. `In` is the type of the
 * items the Client may send back on the same logical stream, read through
 * `RemoteInvocation.uplink()`; it is carried only as a type-level marker. The
 * default `never` declares a method that reads none, and its descriptor
 * carries no uplink codec. A generated Client stream method returns the same
 * stream as a `RemoteStreamHandle<Out, In>`.
 * @template Out - item type the Host method yields.
 * @template In - item type the Client may send; `never` when the method reads none.
 */
type RemoteStream<Out, In = never> = AsyncIterable<Out> & { readonly [STREAM_UPLINK]?: In }
```

```ts type-equiv
/**
 * One open Remote stream as the Client holds it: the downlink items as an
 * `AsyncIterable`, plus the uplink and cancellation of the same logical
 * stream. A generated Client stream method returns it, and calling that
 * method opens the stream: a holder that neither iterates nor disposes the
 * handle keeps the Host stream alive. A handle stands for one generation:
 * when the carrier is lost, iteration fails with the carrier error and the
 * handle is finished.
 * @template Out - item type the Host method yields.
 * @template In - item type the Client may send; `never` when the method reads none.
 */
interface RemoteStreamHandle<Out, In> extends AsyncIterable<Out> {
  /**
   * Send one uplink item. Items sent before the stream has opened are queued
   * and sent once the `open` frame is on the wire. A top-level `undefined`
   * travels as an `item` frame without `value`.
   * @param item - item the Host validates against the method's uplink codec.
   * @throws {Error} when the item is not a lossless JSON value, when `end()`
   * was called, or once the stream has terminated.
   */
  send(item: In): void
  /** Half-close the uplink: the Host's `uplink()` iteration ends. Idempotent; ignored after termination. */
  end(): void
  /**
   * Cancel the logical stream: send `cancel` unless a terminal frame has
   * arrived, and end the downlink iterator quietly. Breaking out of
   * `for await` early does the same.
   */
  dispose(): void
}
```

```ts type-equiv
/**
 * One Peer's session on this Host. Connection owns it: `ctx` is the Cordis
 * scope that owns connection-lifetime registrations and is disposed with the
 * Peer. Who the Peer is and what it may do are not recorded here.
 */
interface PeerScope {
  readonly id: PeerId
  readonly ctx: Context
  /**
   * Tear down every registration made through `ctx`.
   * @returns settles once the scope has quiesced; racing calls share one completion.
   */
  dispose(): Promise<void>
}
```

```ts type-equiv
/**
 * The context of one Remote call, reachable inside the receiving method as
 * `this.ctx.invocation`. The Gateway derives the receiver from a Context that
 * carries it, so no parameter is injected and nothing crosses the wire.
 */
interface RemoteInvocation {
  readonly request: {
    readonly namespace: string
    readonly method: string
    readonly args: Readonly<Record<string, unknown>>
  }
  /** Cordis service key of the receiving Service. */
  readonly service: string
  /** Peer the call speaks for; an in-process carrier speaks for the operator. */
  readonly peer: PeerScope
  /** Carrier cancellation: Client cancel, socket close, or an uplink failure. */
  readonly signal: AbortSignal
  /**
   * The Client's uplink items for this call. Available once; a second call
   * throws. With an uplink codec on the descriptor every item is decoded to
   * `In`; without one items arrive as `unknown` after a JSON-safety check.
   * Iteration ends when the Client ends its uplink; when the method finishes
   * its downlink the Gateway calls the iterator's `return()` and unread items
   * are dropped. `In` is the caller's assertion: the runtime decodes by the
   * descriptor and does not cross-check it.
   * @template In - item type the caller reads; the descriptor codec decides what arrives.
   * @returns the single-consumer uplink iterable.
   */
  uplink<In = unknown>(): AsyncIterable<In>
}
```

## Registry de Typert

`ctx.typert` separa los descriptores del entorno actual, las contribuciones Remote seleccionadas explícitamente, los proveedores de lookup y los proveedores de Context con ámbito. Un proveedor de lookup posee la declaración de cable estable y el resolvedor por defecto; la composición del Host puede configurar un resolvedor síncrono o asíncrono con ámbito de efecto para la misma clave, y descargar esa configuración restaura la política por defecto. Los registros son efectos propiedad de Cordis y devuelven disposers esperables.

```ts type-equiv
/** Minimal Typert runtime consumed through dependency inversion. */
interface TypertRegistryContract {
  readonly local: TypertLocalRegistry
  readonly remotes: TypertRemoteRegistry
  readonly lookups: TypertLookupRegistry
  readonly contexts: TypertContextRegistry
}
```

Las declaraciones de consumidor generadas fusionan los espacios de nombres directos en el mapa que hereda `TypertClientRemote`.

```ts type-equiv
/** Merge-extensible direct namespace surface generated for Client Remote services. */
interface TypertRemoteNamespaceMap {}
```

## Puerta de enlace del Host

Connection decodifica el sobre de su portador antes de llamar a `ctx.typertGateway`. La solicitud lleva los campos de cable nombrados exactos y la señal de cancelación del portador por separado; los fallos de infraestructura y de frontera viajan en `TypertGatewayError`, cuyos códigos `gateway/*` son códigos ordinarios de `RemoteError`, de modo que el adaptador RPC pasa intactos, con su código y sus detalles, todos los `RemoteError` identificados estructuralmente y pliega solo las excepciones no reconocidas en `gateway/internal`.

```ts type-equiv
/** One Remote method request after a carrier has decoded its envelope. */
interface InvokeRemoteRequest {
  /** Remote namespace selected by the generated descriptor. */
  readonly namespace: string
  /** Exported Service method name. */
  readonly method: string
  /** Named wire values; fields must exactly match the descriptor. */
  readonly args: Readonly<Record<string, unknown>>
  /**
   * Client uplink items of this logical stream, delivered to the method through
   * `invocation.uplink()`; absent means an immediately ended iterable.
   */
  readonly uplink?: AsyncIterable<unknown>
  /** Peer the call speaks for; absent means an in-process carrier, answered as the operator. */
  readonly peer?: PeerScope
  /** Carrier or direct-caller cancellation injected only into cancellation-aware methods. */
  readonly signal?: AbortSignal
}
```

```ts type-equiv
/** Stable infrastructure and boundary failures emitted before or after business execution. */
type TypertGatewayErrorCode =
  | 'gateway/ambiguous-endpoint'
  | 'gateway/arguments-invalid'
  | 'gateway/binding-invalid'
  | 'gateway/context-failed'
  | 'gateway/context-not-found'
  | 'gateway/context-unavailable'
  | 'gateway/definition-unavailable'
  | 'gateway/input-invalid'
  | 'gateway/invocation-unavailable'
  | 'gateway/lookup-failed'
  | 'gateway/lookup-not-found'
  | 'gateway/lookup-unavailable'
  | 'gateway/method-unavailable'
  | 'gateway/protocol'
  | 'gateway/provider-mismatch'
  | 'gateway/result-invalid'
  | 'gateway/service-unavailable'
  | 'gateway/signature-invalid'
  | 'gateway/uplink-overflow'
```

```ts type-equiv
/** Host dispatcher consumed by Connection adapters. */
interface TypertGateway {
  /** Carrier adapter shared by WebSocket and in-process transports. */
  readonly wireStream: TypertGatewayWireStream
  /**
   * Check for an active Client event stream.
   * @returns whether a stream is open and has not been cancelled.
   */
  hasLiveClient(): boolean
  /**
   * Register the application-selected forwarded-event source.
   * @param source - stream factory installed by the Remote assembly.
   * @param host - stable Host facts included in each Client generation's opening frame.
   * @returns disposer removing this exact source and cancelling its active streams.
   */
  registerRemoteEvents(
    source: TypertRemoteEventSource,
    host: RemoteEventHostInfo,
  ): () => Promise<void>
  /**
   * Invoke one live Remote method without assuming a carrier or response envelope.
   * @param request - decoded endpoint and named wire arguments.
   * @returns the business result without output decoding.
   * @throws {@link TypertGatewayError} for dispatch, provider, or boundary failures; lookup-policy and business errors retain identity.
   */
  invoke(request: InvokeRemoteRequest): Promise<unknown>
  /**
   * Open one live stream Remote method without assuming a physical carrier.
   * @param request - decoded endpoint, named wire arguments, and the Client uplink when the carrier has one.
   * @returns a cancellation-aware iterable over the business results.
   */
  stream(request: InvokeRemoteRequest): Promise<AsyncIterable<unknown>>
}
```

## Remote del consumidor

`ctx.remote` expone solo los espacios de nombres aportados por los artefactos `/remote` importados. `$mount()` instala los descriptores generados y los métodos concretos como una operación propiedad de un fiber. Cada espacio de nombres es un Service hijo de Cordis trazado `remote.<namespace>` cuyo ciclo de vida abarca sus métodos montados; ningún Proxy de JavaScript ni tipo de Service de negocio del Host entra en el consumidor.

```ts type-equiv
/** Client Remote capability implemented by the Gateway and consumed by Remote assemblies. */
interface TypertClientRemote extends TypertRemoteNamespaceMap {
  /**
   * Mount one generated Host-for-Client contribution in the caller's fiber.
   * @param contribution - explicitly selected Remote package artifact.
   * @returns disposer after namespace services and concrete methods are ready.
   */
  $mount(contribution: TypertRemoteContribution): Promise<TypertDisposer>
  /**
   * Subscribe to one forwarded Host event. Notifications run in registration
   * order and isolate failures; scoped waterfalls return, delegate through
   * `next()`, or reject the Host dispatch.
   * @template Event - forwarded event name selected by the Host assembly.
   * @param event - forwarded Host event name, unchanged on the wire.
   * @param listener - receives the Client projection of the Cordis `Events` declaration.
   * @returns disposer owned by the calling fiber.
   */
  $on<Event extends TypertRemoteEvent>(event: Event, listener: TypertClientEventListener<Event>): () => void
}
```

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxtypert--typertregistry"></a>

### `ctx.typert` — `TypertRegistry`

Registry of generated schemas, package reflection, invocations, and Remote dependency providers.

```ts cordis-catalog
/**
 * Register one generated contribution atomically for the calling fiber.
 * Duplicate package-face identities, schemas, invocation ids, or endpoints
 * reject the whole batch.
 * @param contribution - generated schemas, reflection, and Host invocations.
 * @returns the exact effect disposer that removes this contribution.
 */
register(contribution: TypertContribution): TypertDisposer

/**
 * Look up one schema by `<package>#<name>`.
 * @param key - global schema key.
 * @returns a record containing the cached schema, or `undefined` when absent.
 */
get(key: string): TypertSchemaRecord | undefined

/**
 * Resolve one required schema.
 * @param key - global schema key.
 * @returns a record containing the cached schema.
 * @throws when the key is malformed, the package face is absent, or the schema is not contributed.
 */
resolve(key: string): TypertSchemaRecord

/**
 * Enumerate live schemas in registration order.
 * @param filter - optional package and face restriction.
 * @returns matching records containing the cached schemas.
 */
list(filter: TypertSchemaFilter = {}): TypertSchemaRecord[]

/**
 * Look up generated reflection for one package face.
 * @param packageName - exact npm package name.
 * @param face - face to query; defaults to the host runtime.
 * @returns the live package record, or `undefined` when absent.
 */
getPackage(packageName: string, face: TypertFace = 'host'): TypertPackageRecord | undefined

/**
 * Enumerate generated package reflection in registration order.
 * @param filter - optional package and face restriction.
 * @returns matching package records.
 */
listPackages(filter: TypertPackageFilter = {}): TypertPackageRecord[]

/**
 * Project a live Zod schema to JSON Schema without caching the result.
 * @param key - global schema key.
 * @param params - Zod projection parameters.
 * @returns a fresh JSON Schema document.
 */
toJSONSchema(key: string, params?: z.core.ToJSONSchemaParams): z.core.JSONSchema.BaseSchema
```

Types: [TypertContribution](invariants.es.md) · [TypertFace](invariants.es.md) · [TypertPackageFilter](invariants.es.md) · [TypertPackageRecord](invariants.es.md) · [TypertSchemaFilter](invariants.es.md) · [TypertSchemaRecord](invariants.es.md)

Source: [`packages/typert/registry/src/service.ts`](../../packages/typert/registry/src/service.ts)

<a id="ctxtypertgateway--typertgatewayservice"></a>

### `ctx.typertGateway` — `TypertGatewayService`

Resolve strict generated definitions or conservative SRC markers against current Cordis Services and Typert providers.

```ts cordis-catalog
/**
 * Check for an active Client event stream.
 * @returns whether a stream is open and has not been cancelled.
 */
hasLiveClient(): boolean

/**
 * Register the sole application-selected forwarded-event source.
 * @param source - stream factory installed by the Remote assembly.
 * @param host - stable Host facts included in each Client generation's opening frame.
 * @returns disposer removing this source and cancelling its active streams.
 */
registerRemoteEvents( source: TypertRemoteEventSource, host: RemoteEventHostInfo, ): () => Promise<void>

/**
 * Invoke one live Remote method through strict generated reflection or SRC markers.
 * @param request - decoded endpoint and exact named wire arguments.
 * @returns the business result without output decoding.
 * @throws {@link TypertGatewayError} for dispatch, provider, or boundary failures; lookup-policy and business errors retain identity.
 */
async invoke(request: InvokeRemoteRequest): Promise<unknown>

/**
 * Open one live stream Remote method without assuming a physical carrier.
 * @param request - decoded endpoint, named wire arguments, and the Client uplink when the carrier has one.
 * @returns a cancellation-aware iterable over the business results.
 */
async stream(request: InvokeRemoteRequest): Promise<AsyncIterable<unknown>>
```

Source: [`packages/api/gateway/src/index.ts`](../../packages/api/gateway/src/index.ts)
<!-- END GENERATED cordis-surface -->
