# Módulos de cliente

[English](client-modules.md) | Español

La tabla de plugins web: la mitad Node del sistema de módulos de cliente de [dsh-client-modules](../../packages/client/modules), proporcionada como `ctx.clientModules` (`ClientModuleRegistry`). Recorre las entradas del Loader del host buscando paquetes que declaran `dsh.client`, compone el grafo de entradas `window.__DSH_BOOT__`, sirve scripts combo versionados de uno o más recursos bajo `/plugins` y responde a cada colección de inyección en el índice con las filas del protocolo de arranque: las cuatro caras de un solo servicio. Es una capacidad opcional de la pila de GUI web, no parte de la espina dorsal del agent loop (bucle de agent), y es consumidora de [dsh-host-webserver](../../packages/host/webserver): el portador descrito en [web-server.md](web-server.es.md) suministra la ruta de prefijo y el evento `webserver/index-inject` que este servicio responde. La mitad de navegador del mismo paquete (`ctx.modules`, la tabla de módulos lazy-CJS que descarga y materializa estos bundles) es maquinaria del kernel documentada en el [README del paquete](../../packages/client/modules/README.md), no aquí.

Fuente: [`packages/client/modules/src/client/manifest.ts`](../../packages/client/modules/src/client/manifest.ts)

## El cable

El grafo es la fuente única en el cable entre las mitades Node y navegador. El host compone filas `WebBootEntry` y descriptores `WebBootBatch` a partir de los paquetes escaneados, y después aporta la fachada de registro, las precargas de aplicación, los scripts de bootstrap y el global del grafo a la tabla estructurada de inyección en el índice antes de la entrada de Vite. La fila `global` se renderiza como `globalThis["__DSH_BOOT__"]` con `<` escapado para que las cadenas controladas por plugins no puedan salirse del elemento script. Una página sin un manifest (lista de metadatos) válido no puede arrancar: el analizador del navegador rechaza filas o lotes mal formados, miembros desconocidos y entradas sin exactamente un descriptor de combo inicial.

```ts type-equiv
/**
 * One composed client entry pushed by the host (a graph row). Wire
 * single source: the host node half (package root) produces this same shape.
 * `immediately` marks stage-one prefetch. `inject` names package rows whose
 * factories must arrive before this row materializes, while Cordis separately
 * uses the same package edges to compose entries. `external` carries exact
 * non-inject module requests (see {@link WebBootGraph.entries}).
 */
interface WebBootEntry {
  /** Entry name == package name. */
  id: string
  /**
   * Revisioned single-resource combo reference used by HMR. It is relative to
   * the document, so the browser resolves it under whatever mount served the page.
   */
  url: string
  /** Opaque plugin-artifact revision used for HMR cache busting. */
  rev: string
  /** Package-name dependency edges used for factory arrival and plugin composition. */
  inject?: string[]
  /** Stage-one prefetch mark: load the script for factory registration during module-face boot. */
  immediately?: boolean
  /** Non-baseline module specifiers this row requests; omitted when it requests none. */
  external?: string[]
}
```

```ts type-equiv
/** Initial scheduling phase for one revisioned combo script. */
type WebBootBatchPhase = 'bootstrap' | 'application'
```

```ts type-equiv
/** One initial combo script; a scheduling phase may span several descriptors. */
interface WebBootBatch {
  /** Parser-blocking bootstrap or preloaded application scheduling. */
  phase: WebBootBatchPhase
  /** Content-addressed combo script reference, document-relative like {@link WebBootEntry.url}. */
  url: string
  /** Revision derived from the ordered entry revisions. */
  rev: string
  /** Graph entry ids whose factories the script registers, in execution order. */
  entries: string[]
}
```

```ts type-equiv
/** The composed client entry graph the host injects as `window.__DSH_BOOT__`. */
interface WebBootGraph {
  /** Consistency anchor over the current entry and batch descriptors. */
  rev: string
  /**
   * Composed entries in module-graph order — a dynamic package row precedes
   * rows whose `external` requests that package. Cordis activation order is
   * unrelated and remains owned by fiber service waiting.
   */
  entries: WebBootEntry[]
  /** Initial combo descriptors; every entry belongs to exactly one descriptor. */
  batches: WebBootBatch[]
}
```

La publicación inicial y HMR (reemplazo de módulos en caliente) derivan el `rev` de cada fila del mtime, ctime y tamaño de la entrada, sin hashear bytes ejecutables. Los mismos artefactos conservan sus revisiones entre reinicios del Host. Los descriptores iniciales particionan las filas en fases de planificación bootstrap y application, y cualquiera de las fases puede contener varios descriptores. Sus URL contienen solo la lista ordenada de recursos de paquetes y una revisión derivada de las revisiones de esas filas; los nombres de fase no entran en la ruta. La composición del grafo conserva el orden de las filas mientras divide vorazmente antes de que la URL en forma de mapa supere los 3 KiB, sin concatenar scripts ni leer mapas. La revisión del grafo hashea los descriptores de entradas y de lotes. `immediately` marca la barrera de registro de la primera etapa; las filas dentro de un combo comparten su transporte de script, mientras que combos separados se cargan de forma independiente.

## El escaneo

Un paquete se une a la tabla declarando `dsh.client` (`platform: 'web'`, aristas `inject` opcionales, `immediately` opcional) en su package.json y exportando su bundle compilado en `exports["./client"]`. Cada fila en vivo se resuelve desde su propio especificador de Loader y el `baseUrl` del árbol propietario, a través de la misma implementación de `loader.internal.resolveSync` que importa su cara de Host cuando está disponible. El manifest del paquete propietario más cercano suministra el id de módulo del navegador, de modo que los overlays relativos de fuente y de compilado conservan la identidad del paquete. Fuentes de Loader activas distintas que resuelven a un mismo nombre de paquete hacen fallar la composición; después de que una fuente se descarga, la fuente superviviente suministra la fila sin reiniciar el fiber.

El escaneo es incremental por paquete; no existe una ruta de código de reescaneo completo. Cada emisión `internal/plugin` de cordis (construcción o dispose de un fiber) marca como sucio el nombre de entrada del fiber, y un vaciado en microtarea reconcilia cada nombre sucio contra las entradas del loader en vivo. La pasada de activación siembra el mismo conjunto de sucios con todas las entradas actuales y vacía de forma síncrona, de modo que el primer escaneo y el estado estacionario comparten una implementación, con posturas de fallo opuestas. En la activación, una declaración mal formada o un bundle ausente entre las entradas ya cargadas se agregan en un `AggregateError` ruidoso que lista cada paquete roto: el fiber FALLA y el barrido de fallo ruidoso del arranque lo informa. En estado estacionario, un paquete roto registra una advertencia y no debe envenenar a los demás.

Los metadatos de paquete, incluido el veredicto negativo «no es un paquete de cliente», se cachean por especificador de Loader y URL base del árbol propietario hasta el reinicio. Un reinicio de fiber desde la misma fuente reutiliza su fila y su rev intactos; los cambios de contenido del bundle llegan al grafo solo a través de `rebuilt()`.

## La ruta de bundles y la inyección en el índice

`GET`/`HEAD /plugins/??<package-a>/client.js,<package-b>/client.js&rev=<rev>` direcciona un script combo generado; una solicitud de un solo recurso usa la misma forma y es la ruta de HMR. El script se concatena una vez en su primer `GET` y termina con un `sourceMappingURL` que porta solo la consulta combo, `??<package-a>/client.js.map,<package-b>/client.js.map&rev=<rev>`, resuelta contra el propio directorio del script en lugar del documento. Los archivos de mapa no los leen el arranque, el renderizado del índice, el `GET` de script ni el `HEAD`; el primer `GET` de mapa los lee y valida, compone un Indexed Source Map v3 y cachea ese cuerpo. Un mapa de componente proporcionado por el autor aporta su sección; un componente sin él recibe una sección identidad cuyo `sourcesContent` es el bundle capturado y cuyo nombre de fuente es su `sourceURL` empaquetado o la ruta del plugin. Cada URL de solicitud de arranque mide como máximo 3 KiB en bytes UTF-8; la partición usa la forma de mapa, más larga. Todas las URL de aplicación se precargan y todas las URL de bootstrap se ejecutan antes del global del grafo y la entrada de Vite. Las respuestas materializadas usan caché inmutable de larga duración. Las listas de recursos desconocidas o alteradas, las revisiones ausentes y las revisiones desactualizadas responden 404 en lugar de servir bytes distintos o dejar que el fallback de SPA devuelva HTML como JavaScript; los demás métodos son 405. Las filas de inyección llevan el grafo actual en cada renderizado del índice, de modo que una recarga siempre arranca contra la composición en vivo.

## El servicio

```ts type-equiv
/** Filesystem baseline captured before a client artifact snapshot is read. */
interface ClientArtifactBaseline {
  /** Absolute path of the client bundle. */
  readonly path: string
  /** Bundle modification time in milliseconds. */
  readonly mtimeMs: number
  /** Bundle status-change time in milliseconds, including writes that preserve mtime. */
  readonly ctimeMs: number
  /** Bundle size in bytes. */
  readonly size: number
}
```

`ClientModuleRegistry` (`ctx.clientModules`, definido en [`packages/client/modules/src/index.ts`](../../packages/client/modules/src/index.ts)) expone lecturas y la cara de recompilación; las firmas están en el [catálogo de servicios](#ctxclientmodules--clientmoduleregistry) generado. `graph()` devuelve el grafo compuesto actual (un objeto estable entre cambios), `clientPath(id)` devuelve la ruta absoluta del bundle y `artifactBaseline(id)` devuelve los valores de stat del bundle capturados antes de leer el snapshot actual. `fetchBundle()` resuelve la misma respuesta diferida que usa la ruta HTTP. `rebuilt(id)` es el único punto de entrada por el que el contenido de bundle modificado llega al grafo: deriva la revisión de los metadatos del sistema de archivos, y solo un cambio de revisión lee los nuevos bytes, recompone el grafo y notifica. `onRebuilt` se dispara por bundle modificado con la nueva revisión; `onGraphChanged` se dispara tras cualquier vaciado que recomponga el grafo (fila añadida o eliminada, o un cambio de revisión recompilada) y es de modelo pull: los listeners releen `graph()`. Ambas rutas de notificación contienen las excepciones de listeners para que un suscriptor que lanza no pueda saltarse a los suscriptores posteriores ni matar lo que disparó el vaciado.

[`dsh-client-hmr`](../../packages/client/hmr/README.md) entrega snapshots del grafo en vivo en la composición Web distribuida. El Host reenvía las notificaciones de cambio de grafo existentes de inmediato, y la reconexión envía el grafo completo actual. Un grafo describe las entradas de navegador deseadas sin afirmar que la limpieza del Host se haya completado. Su sondeo de artefactos informa por separado de las revisiones recompiladas. Los cambios en los mapas de fuentes por sí solos no disparan una recarga; una nueva URL de mapa combo aparece solo después de que cambia una revisión de bundle, y cada cuerpo de mapa queda fijado por su primer `GET`. Client Modules valida los snapshots y serializa la reconciliación con esas recompilaciones; es dueño del mapa de entradas creado en el arranque, las llegadas de un solo recurso, la eliminación asíncrona, la limpieza de módulos y estilos sin usar y el estado de reintento local de página. Los módulos estáticos de plataforma y el bootstrap conservan su tiempo de vida de página; la instalación en Electron es un flujo aparte.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxclientmodules--clientmoduleregistry"></a>

### `ctx.clientModules` — `ClientModuleRegistry`

The web plugin table service: incremental `dsh.client` scan + wire composition + bundle route + index injection rows. Construction runs the activation scan synchronously — a malformed declaration or missing bundle among the already-loaded entries aggregates into one loud throw (FAILED fiber; the boot activation audit reports it).

```ts cordis-catalog
/**
 * Current composed entry graph (stable object between changes).
 * @returns the graph served as `window.__DSH_BOOT__`.
 */
graph(): WebBootGraph

/**
 * Absolute path of an entry's client bundle.
 * @param id - entry id (package name).
 * @returns the path, or undefined for an unknown id.
 */
clientPath(id: string): string | undefined

/**
 * Serve an advertised revisioned bundle or source map without a Web server.
 * Unknown URLs return 404, unsupported methods return 405, and `HEAD`
 * returns the same immutable headers without materializing a body. Each body
 * is built once on its first `GET`; script construction never reads maps.
 * @param request - shell-carrier request for a `/plugins` resource.
 * @returns the exact response also exposed by the optional Web route.
 */
async fetchBundle(request: Request): Promise<Response>

/**
 * Filesystem baseline captured before an entry's current bytes were read.
 * HMR compares it with the live files when installing a watch, so a write
 * between startup composition and watch installation cannot disappear into
 * the watcher's initial state.
 * @param id - entry id (package name).
 * @returns the path and baseline, or undefined for an unknown id.
 */
artifactBaseline(id: string): ClientArtifactBaseline | undefined

/**
 * Publish one completed bundle generation (the HMR watch's registration
 * hook — the only entry point through which build changes reach the graph).
 * Unchanged mtime, ctime and size preserve the graph without reading the bundle.
 * @param id - entry id (package name).
 * @returns the current artifact rev, or undefined for an unknown id.
 */
rebuilt(id: string): string | undefined

/**
 * Subscribe to bundle rebuilds; fires only when artifact metadata changes the rev.
 * @param listener - receives the entry id and its new bundle rev.
 * @returns the unsubscriber.
 */
onRebuilt(listener: (id: string, rev: string) => void): () => void

/**
 * Fires after any flush that recomposed the graph (row added/removed, or a
 * rebuilt rev change). Pull model: listeners re-read {@link graph}.
 * @param listener - notified with no payload.
 * @returns the unsubscriber.
 */
onGraphChanged(listener: () => void): () => void
```

Source: [`packages/client/modules/src/index.ts`](../../packages/client/modules/src/index.ts)
<!-- END GENERATED cordis-surface -->
