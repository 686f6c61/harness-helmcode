# Servidor HTTP

[English](web-server.md) | Español

[dsh-host-webserver](../../packages/host/webserver) es el portador HTTP para navegadores del host de la GUI: un único plugin de `node:http` que provee `ctx.webServer`, un registro de rutas nombradas, compresión gzip opcional de respuestas, callbacks de transformación de index.html y un manejador de fallback que un plugin puede reclamar. No forma parte del agent loop (bucle de agent) y no es un capability seam; no conoce conceptos del harness, y otro plugin registra cada ruta de funcionalidad, incluido el puente `/api`, los bundles de plugins y el flujo de eventos de HMR (reemplazo de módulos en caliente) ([nota de capas](../../.agents/notes/implemented/architecture/2026-07-24-web-config-tree-boot-and-transport-layering.md)). Sirve solo a navegadores: Electron carga los archivos compilados sobre `file://` y envía las solicitudes fetch a través de un puente IPC en lugar de este servidor.

Fuente: [`packages/host/webserver/src/index.ts`](../../packages/host/webserver/src/index.ts)

## Rutas

```ts type-equiv
/** Route match kind: 'exact' matches the pathname verbatim; 'prefix' p matches p and p/<anything>. */
type WebRouteKind = 'exact' | 'prefix'
```

```ts type-equiv
/** One named route registration. */
interface WebRoute {
  kind: WebRouteKind
  /** Absolute pathname, no trailing slash. */
  path: string
  /** Owns the full response lifecycle (may hold the response open, e.g. SSE). */
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}
```

El orden de coincidencia es fijo: primero la tabla exacta, luego el prefijo coincidente más largo, y por último el fallback registrado. El orden de registro no tiene semántica visible para las solicitudes: las rutas nombradas se componen para ser disjuntas, y el asiento de fallback responde a todo lo que ninguna ruta nombrada reclama; un solo propietario, y un segundo registro lanza error. La composición Web entregada reclama el asiento con [`dsh-host-frontend-static`](../../packages/host/frontend-static/src/index.ts), el servidor de dist de la SPA con semántica fijada: Connection autentica la raíz del dist y el índice configurado antes de leer su HTML; los recursos que no son el índice permanecen públicos; lo que no sea GET/HEAD es 405, el recorrido fuera de la raíz del dist es 403, los archivos existentes se sirven directamente, los destinos ausentes o que no son archivos son respuestas 404 vacías, y las extensiones desconocidas se envían como octet-stream.

## Configuración

```ts type-equiv
/** Web server listen and response-compression config. */
interface Config {
  /** Listen host; the two supported values are loopback and all-interfaces. */
  host: '127.0.0.1' | '0.0.0.0'
  /** Listen port; zero requests an OS-assigned port. */
  port: number
  /** Response compression for socket-backed HTTP requests. @default 'none' */
  compression?: 'none' | 'gzip'
  /** Gzip DEFLATE level from 0 through 9. @default 1 */
  compressionLevel?: number
  /** Minimum known response length eligible for gzip; unknown-length streams are eligible. @default 1024 */
  compressionThresholdBytes?: number
}
```

`host` acepta solo `127.0.0.1` (postura por defecto) y `0.0.0.0` (exposición deliberada a la red). El portador en sí no posee TLS, autenticación ni política de Origin, de modo que una vinculación no loopback expone el servidor salvo que la composición aporte esos controles. `compression` vale `none` por defecto; el bundle Web entregado selecciona gzip nivel 1 con un umbral de 1024 bytes. El comando `dsh web` entregado selecciona loopback y rechaza `--host 0.0.0.0`; su plugin Connection aporta comprobaciones de Host/Origin más autenticación de sesión de navegador para cada ruta y flujo de API del Host. Otras composiciones poseen su política de vinculación y de autenticación de rutas. La ubicación del dist es un hecho de ensamblado del plugin de frontend que reclama el asiento.

## El servicio

`WebServer` (`ctx.webServer`) escucha inmediatamente al activarse; un fallo de escucha (EADDRINUSE…) rechaza la inicialización, y el proceso de arranque informa del fiber fallido. `register(route)` añade una ruta nombrada y devuelve su disposer; un `(kind, path)` duplicado lanza error porque los patrones de rutas son un contrato a nivel de composición y una colisión es una mala configuración. Gzip envuelve dentro del servidor las respuestas elegibles respaldadas por socket, de modo que los manejadores de rutas conservan la propiedad directa de `ServerResponse` y no se añade ninguna API de escritura de respuestas al servicio. Las codificaciones de contenido existentes, `Cache-Control: no-transform`, los rangos, SSE (Server-Sent Events), ZIP y la imagen `.gz` del Worker empaquetada siguen siendo respuestas identidad. `collectIndexInjections()` reúne filas estructuradas `IndexInjection` en un emit `webserver/index-inject`, y `renderIndex(html)` las renderiza en las respuestas exitosas de raíz y de índice configurado antes de aplicar las transformaciones de escape directas de `tapIndex(transform)` en orden de registro; [dsh-client-modules](../../packages/client/modules) responde al evento con las filas del manifest (lista de metadatos) de arranque. `port` lee el puerto en escucha, incluido el puerto asignado por el SO cuando `config.port` es 0.

Una solicitud cuyo manejo lanza error (un escape % malformado al llegar a `decodeURIComponent`, un cliente que se desconecta a mitad del cuerpo) se registra como advertencia y se responde 400, o se destruye el socket cuando los encabezados ya se enviaron; nunca una salida del proceso. El dispose empareja `close()` con `closeAllConnections()` porque un manejador puede mantener su respuesta abierta (SSE) y esas conexiones nunca terminan por sí solas; sin el cierre forzado, el desmontaje se colgaría. El paquete nunca imprime: la línea de la URL pertenece a la shell. El detalle operativo por paquete, incluido el pipeline de vigilancia de bundles en modo desarrollo, permanece en el [README](../../packages/host/webserver/README.md).

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxconnection--hostconnectionhandle"></a>

### `ctx.connection` — `HostConnectionHandle`

Host `ctx.connection` members consumed by transport-independent adapters.

```ts cordis-catalog
/**
 * Compose exact Fetch routes and the shared-channel RPC interceptor.
 * @param channel - shared channel mounted by Connection.
 * @returns Fetch handler for trusted, authenticated requests.
 */
createSharedFetchHandler(channel: '/api'): ConnectionFetchHandler

/**
 * Apply Connection's Host/Origin checks and browser authentication to
 * another Web route.
 * @param request - request headers from the HTTP or upgrade request.
 * @returns rejection status, or undefined when the route may accept the request.
 */
requestRejection(request: ConnectionTrustRequest): ConnectionRequestRejection

/**
 * Admit one request: it passes {@link requestRejection} and speaks for the
 * operator, or it is refused with that status.
 * @param request - request headers from the HTTP or upgrade request.
 * @returns the operator Peer, or the rejection status.
 */
admit(request: ConnectionTrustRequest): PeerAdmission

/**
 * Authenticate one frontend index request, owning a token redirect or 401.
 * @param request - root or configured-index HTTP request.
 * @param response - response owned when the result is false.
 * @returns true only when the frontend may serve index.html.
 */
authorizeIndex(request: ConnectionIndexRequest, response: ConnectionIndexResponse): boolean

/**
 * Add the fresh process token to an ordinary Web application URL.
 * @param baseUrl - clean application URL whose authority and mount are preserved.
 * @returns tokenized URL for initial login; a mount proxy strips its prefix before {@link authorizeIndex}.
 */
authenticatedUrl(baseUrl: string): string
```

Source: [`packages/client/connection/src/rpc.ts`](../../packages/client/connection/src/rpc.ts)

<a id="ctxwebserver--webserver"></a>

### `ctx.webServer` — `WebServer`

The browser HTTP carrier service. Activation listens immediately. Route registration order does not affect requests because configured named routes must be distinct, and the fallback handler answers anything not yet claimed during startup with 404 until its owner registers. A listen failure rejects initialization, and the boot process reports the failed fiber.

```ts cordis-catalog
/**
 * Register a named route. Duplicate (kind, path) throws — route patterns are
 * a composition-level contract, so a collision is a misconfiguration.
 * @param route - kind, path, and the owning handler.
 * @returns the disposer removing the route.
 */
register(route: WebRoute): () => void

/**
 * Register an exact-path HTTP upgrade route. Duplicate paths throw because
 * one socket can have only one protocol owner.
 * @param route - pathname and handler owning negotiation plus socket use.
 * @returns the disposer removing the route.
 */
registerUpgrade(route: WebUpgradeRoute): () => void

/**
 * Claim the fallback seat: the handler answering every request no named
 * route matches (the SPA dist server in the shipped Web composition). One
 * owner only — a second registration throws, because two fallbacks cannot
 * compose.
 * @param handler - owns the full response lifecycle of unmatched requests.
 * @returns the disposer releasing the seat.
 */
registerFallback(handler: WebRoute['handler']): () => void

/**
 * Register a raw-HTML index transform, the escape hatch for markup no
 * {@link IndexInjection} row expresses: {@link renderIndex} applies taps in
 * registration order after rendering the structured rows.
 * @param transform - pure html-to-html function.
 * @returns the disposer removing the transform.
 */
tapIndex(transform: (html: string) => string): () => void

/**
 * Run an index.html body through the registered taps in registration order
 * — called by the fallback owner on every index response it renders.
 * @param html - the raw index.html body.
 * @returns the transformed body.
 */
applyIndexTaps(html: string): string

/**
 * Gather the structured injection table: one `webserver/index-inject` emit,
 * every subscriber pushes its current rows. Fresh per call, so subscribers
 * read live state (module graph, theme preference) at emit time.
 * @returns rows in subscriber activation order.
 */
collectIndexInjections(): IndexInjection[]

/**
 * Render one index.html body: the structured injection table first, then
 * the raw `tapIndex` transforms over the result.
 * @param html - the raw index.html body.
 * @returns the transformed body.
 */
renderIndex(html: string): string
```

Source: [`packages/host/webserver/src/index.ts`](../../packages/host/webserver/src/index.ts)

<a id="connection-events"></a>

### `connection/*` events

<a id="connectionrequest--waterfall"></a>

#### `connection/request` — waterfall

Admit or wrap an authenticated shared API request, including body transfer. Existing requests continue when a listener refuses subsequent requests.

```ts cordis-catalog
/**
 * Admit or wrap an authenticated shared API request, including body transfer.
 * Existing requests continue when a listener refuses subsequent requests.
 * @param request - Authenticated incoming HTTP request.
 * @param response - Response owned until the delegated bridge settles.
 * @param next - Delegate to the next listener or the shared API bridge.
 * @mode waterfall
 */
'connection/request'(request: IncomingMessage, response: ServerResponse, next: () => Promise<void>): Promise<void>
```

Source: [`packages/client/connection/src/index.ts`](../../packages/client/connection/src/index.ts)

<a id="webserver-events"></a>

### `webserver/*` events

<a id="webserverindex-inject--emit"></a>

#### `webserver/index-inject` — emit

Collect the structured index injection table. Emitted on every index render and every worker boot-payload request; listeners push their current rows, so a row's data is read fresh at emit time.

```ts cordis-catalog
/**
 * Collect the structured index injection table. Emitted on every index
 * render and every worker boot-payload request; listeners push their
 * current rows, so a row's data is read fresh at emit time.
 * @param table - Mutable row table; listeners append in activation order.
 * @mode emit
 */
'webserver/index-inject'(table: IndexInjection[]): void
```

Source: [`packages/host/webserver/src/index.ts`](../../packages/host/webserver/src/index.ts)
<!-- END GENERATED cordis-surface -->
