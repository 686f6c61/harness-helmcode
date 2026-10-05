# Almacenamiento

[English](storage.md) | Español

El subsistema de almacenamiento persiste todo lo que no es un registro de eventos de sesión (los registros de sesión tienen su propio seam: [persistence.md](persistence.es.md)). Es una capacidad opcional, no forma parte de la espina dorsal del agent loop (bucle de agent), dividida como un [capability seam](../../.agents/notes/implemented/architecture/2026-06-13-capability-seams.md): el hub y la Service Definition ([dsh-storage](../../packages/storage/storage), `ctx.storage`), los Service Providers ([dsh-storage-json](../../packages/storage/storage-json), registrado como `json`, y [dsh-storage-sqlite](../../packages/storage/storage-sqlite), registrado como `sqlite`) y la forma de datos del Consumer ([dsh-storage-domain](../../packages/storage/storage-domain), `ctx.storageDomain`, también accesible como `ctx.storage.domain`): el único Consumer del contrato de backend y la API tipada que todo lo demás usa. El hub no realiza IO por sí mismo: los backends poseen los medios, las formas de datos poseen la semántica y los paquetes de producto nunca tocan los backends directamente. Registro de diseño: [Agent Note de almacenamiento KV de dominio](../../.agents/notes/proposed/architecture/2026-07-24-domain-kv-storage-and-workspace.md).

Fuente: [`packages/storage/storage/src/backend.ts`](../../packages/storage/storage/src/backend.ts) · [`packages/storage/storage-domain/src/spec.ts`](../../packages/storage/storage-domain/src/spec.ts) · [`packages/storage/storage-domain/src/events.ts`](../../packages/storage/storage-domain/src/events.ts)

## El hub: `ctx.storage`

`Storage` ([firmas](#ctxstorage--storage)) es un punto de encuentro, no un almacén. `ctx.storage.backend` es una tabla nombre → backend: varios backends permanecen montados lado a lado, y qué backend sirve a qué consumidor es configuración de ese consumidor (la tabla de rutas de la capa de dominio), nunca una elección global del hub. `register(name, backend)` devuelve el disposer; los nombres duplicados y las búsquedas desconocidas lanzan `StorageError`. El dispose (liberación de recursos) solo desregistra el nombre: el plugin propietario cierra el backend tras desregistrarlo. Cada plugin de backend también publica una clave de servicio solo de ciclo de vida (`storageBackendServiceKey(name)`), que los proveedores de formas inyectan para que su activación no pueda competir con el registro del backend.

Las formas de datos se montan en el hub bajo un mapa de claves extensible por merge:

```ts type-equiv
/**
 * Data forms mountable on the hub, keyed by form name. Form owners extend
 * this map via declaration merging (the domain layer merges
 * `domain: DomainFacility`) and mount the facility in their `apply`.
 */
interface StorageForms {}
```

`mount(form, facility)` es un efecto cuyo disposer desmonta; un segundo montaje de la misma clave lanza `duplicate-mount`. `form(form)` resuelve una facility montada y lanza `form-not-mounted` hasta que el plugin propietario se carga; los ensamblados ordenan los plugins en consecuencia en lugar de diferir silenciosamente. La capa de dominio fusiona `domain: DomainFacility`, así que `ctx.storage.domain` y `ctx.storageDomain` son el mismo objeto.

## El contrato de backend

```ts type-equiv
/**
 * One registered backend. A backend owns exactly one medium and shares its
 * lifecycle across all facets; facets are optional members — a backend that
 * cannot serve a data kind simply omits it, and resolution fails loud instead.
 */
interface StorageBackend {
  /** Key-value operations; absent when this backend cannot serve them. */
  readonly kv?: KvFacet

  /**
   * Drain in-flight writes across all open units and release the medium.
   * Idempotent; concurrent and repeated calls resolve once teardown finishes.
   * @returns resolution after the medium is released.
   */
  close(): Promise<void>
}
```

Un backend posee un medio (una raíz de árbol de archivos, un archivo de base de datos) y expone grupos opcionales de operaciones; `kv` es el único grupo distribuido. `KvFacet.open(descriptor)` abre una unidad nombrada: `KvUnitDescriptor` porta el nombre, la versión de formato actual, las versiones de registro compatibles opcionales, los nombres de tabla y si existe un slot singleton global, y devuelve una `KvUnit` con `loadAll`, `putRecord`, `deleteRecord`, `setGlobal` y `close`. Los nombres de unidad y de tabla deben cumplir `UNIT_NAME_RE` (seguros como nombre de archivo y como segmento de identificador SQL); las claves de registro son cadenas arbitrarias que nunca llegan a rutas de archivo. Una unidad no serializa escrituras concurrentes (el orden pertenece al llamante), pero cada llamada individual es atómica sobre el medio y durable una vez resuelta. Un medio `single` sellado con una versión distinta rechaza con `version-mismatch`; un documento `per-record` sellado fuera del conjunto aceptado se lee como ausente. Un medio que no puede parsearse como la unidad rechaza con `malformed-medium`. [`backend.ts`](../../packages/storage/storage/src/backend.ts) es el contrato normativo cláusula a cláusula, y la suite de conformidad compartida en [`tests/contract.ts`](../../packages/storage/storage/tests/contract.ts) comprueba cada cláusula contra cada backend. El [backend json](../../packages/storage/storage-json/README.md) republica atómicamente un archivo completo legible por humanos por unidad; el [backend sqlite](../../packages/storage/storage-sqlite/README.md) guarda un documento por fila en una base de datos para datos actualizados con frecuencia.

## Declarar un dominio

Un dominio se declara una vez por su paquete propietario como un objeto spec: la fuente única de la identidad, la disposición y los schemas de registros del dominio (zod, de modo que `z.infer` mantiene los tipos de los consumidores sin duplicar):

```ts type-equiv
/** Static declaration of one domain: identity, version, and record layout. */
interface DomainSpec {
  /** Domain name; must match `UNIT_NAME_RE` (doubles as the backend unit name). */
  readonly name: string
  /** Current domain format version; reads enforce it according to the selected layout. */
  readonly version: number
  /**
   * Medium layout for the backend unit: `single` (the default) stores the
   * whole unit as one document; `per-record` stores each record as its own
   * document, for units whose records are large, sparse, or individually
   * disposable — the projection cache — and scopes version checks per record
   * (an unaccepted record document is discarded, never migrated).
   */
  readonly layout?: 'single' | 'per-record'
  /**
   * Older domain versions whose stored records the current record schemas
   * also accept (the declaring owner vouches for that, typically by
   * declaring the fields older records lack as optional). `per-record` backends
   * read documents stamped with a listed version instead of discarding them,
   * and accept a legacy whole-unit file so stamped for the one-time
   * bootstrap; writes always stamp {@link version}.
   */
  readonly compatibleVersions?: readonly number[]
  /**
   * What `open` does with a stored table record that fails its zod schema.
   * Absent (the default), the whole open rejects with `invalid-record` —
   * right for authoritative data. `'backup-and-skip'` is for domains whose
   * records are disposable derived data: the backend moves the record's
   * document aside (`KvUnit.backupRecord`), the failure is logged with
   * its cause, and the open continues with the record absent. A backend
   * without `backupRecord` (no per-record document to move) falls back
   * to the rejecting default. The global slot always rejects.
   */
  readonly invalidRecords?: 'backup-and-skip'
  /** Optional global singleton slot. */
  readonly global?: DomainGlobalSpec<unknown>
  /** Table declarations keyed by table name; each name must match `UNIT_NAME_RE`. */
  readonly tables: Record<string, DomainTableSpec>
}
```

`defineDomain(spec)` fija los tipos literales del spec y falla ruidosamente al cargar el módulo del propietario, antes de tocar ningún medio: un nombre de dominio o de tabla fuera de `UNIT_NAME_RE`, una versión que no es un entero no negativo o un schema global que acepta `null` lanzan (`null` es el centinela de «nunca escrito» del medio, así que un global nullable almacenado no podría hacer el viaje de ida y vuelta). `domainTable<K, V>(schema)` declara una tabla con un tipo de clave fantasma en tiempo de compilación (típicamente un [id Branded](core.es.md#branded-ids)); `descriptorOf(spec)` proyecta el descriptor de unidad orientado al backend.

## El dominio abierto

```ts type-equiv
/** One open domain, typed by its spec. */
interface Domain<S extends DomainSpec> {
  /** Domain name from the spec. */
  readonly name: string
  /** Global singleton handle; a spec without `global` has no usable handle (`never`). */
  readonly global: DomainGlobalHandleOf<S>
  /**
   * Resolve one declared table handle. Handles are stable — repeated calls
   * return the same instance.
   * @param name - Declared table name.
   * @returns the typed table handle.
   */
  table<N extends keyof S['tables'] & string>(name: N): KvTable<TableKeyOf<S, N>, TableValueOf<S, N>>

  /**
   * Close this domain: reject new writes immediately, drain already-queued
   * writes (their events still emit), release the backend unit, then free
   * the domain name for a later open. Idempotent — repeated calls share one
   * teardown. The consumer owns this call (typically as its own `ctx.effect`
   * disposer); the facility closes any domain left open when it unmounts.
   * @returns resolution after the unit is released.
   */
  close(): Promise<void>
}
```

Las lecturas son síncronas desde el estado autoritativo en memoria: `KvTable` expone `get`/`entries`/`keys`/`size` (iteradores de snapshot que permanecen estables mientras aterrizan las escrituras encoladas), y el `get()` del identificador global sirve el `initial` del spec hasta que el primer `set` materializa el slot en el medio. Cada escritura (`put`, `delete`, `update`, `global.set`) se encola en una única cadena por dominio y alcanza primero la durabilidad del backend, luego muta la memoria y después emite `domain/changed`; una escritura de backend rechazada deja la memoria intacta, así que las lecturas nunca divergen del medio. `update(key, fn)` es un leer-modificar-escribir atómico en su posición de la cadena (una clave ausente rechaza con `missing-key`); `delete` de una clave ausente resuelve `false` sin escritura ni evento. Los registros devueltos son los propios objetos almacenados, no copias: hay que reemplazar mediante `put`/`update`, nunca mutar in situ.

## La facility de dominio: `ctx.storageDomain`

`DomainFacility` ([firmas](#ctxstoragedomain--domainfacility)) abre dominios declarados sobre backends enrutados. El enrutado es configuración del plugin de dominio, nunca del hub: `backend` nombra la ruta por defecto obligatoria y `routes` la sustituye por nombre de dominio. `open(spec)` ejecuta una secuencia estricta, donde cada paso hace fallar la llamada completa: rechaza un nombre ya abierto o aún cerrándose (`already-open`), resuelve la ruta (`backend-not-found`), exige la faceta `kv` del backend (`facet-unsupported`), abre la unidad (los `version-mismatch`/`malformed-medium` del backend pasan tal cual) y valida cada registro almacenado y el global contra los schemas zod del spec (`invalid-record` con la tabla y la clave infractoras). El llamante posee el identificador devuelto y lo libera con `Domain.close()`; los dominios aún abiertos cuando el plugin se desmonta los cierra la facility, y el nombre de un dominio cerrado queda libre para reabrirse solo después de que el desmontaje termine por completo. `get(name)` es una búsqueda de diagnóstico sin tipar sobre el runtime `DomainImpl` privado del paquete que hay detrás de cada identificador tipado; `closeAll()` es la ruta de desmontaje.

## El evento de cambio: `domain/changed`

Cada escritura durable emite un evento estrictamente después de que el backend confirmó la durabilidad, en el orden de la cadena de escritura del dominio ([entrada de evento](#domainchanged--emit)):

```ts type-equiv
/** Shared location fields of one durable domain change. */
interface DomainChangedBase {
  /** Owning domain name. */
  readonly domain: string
  /** Table name; `''` for a global-singleton write. */
  readonly table: string
  /** Record key; `''` for a global-singleton write. */
  readonly key: string
}
```

```ts type-equiv
/** One durable domain change; a closed union — switch on `operation`. */
type DomainChanged = DomainChangedPut | DomainChangedDeleted
```

`put` (inserciones, sobrescrituras y escrituras globales) porta el nuevo snapshot en `value`, nunca el valor antiguo; un consumidor que compara conserva su propio snapshot anterior. `deleted` es un tombstone sin valor. El evento es una notificación, no un participante de la transacción: el punto de commit ya pasó en el momento de la emisión, así que un listener que lanza sincrónicamente queda contenido con una advertencia registrada en lugar de rechazar la escritura ya durable, y los valores emitidos igualan el estado en memoria en el momento de la emisión. El evento es solo intraproceso; el push de cambios entre procesos es una limitación registrada ([README del paquete](../../packages/storage/storage-domain/README.md)).

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxstorage--storage"></a>

### `ctx.storage` — `Storage`

The storage hub service. Backends register under `backend`; data forms mount under their `StorageForms` key and are reached as `ctx.storage.<form>`.

```ts cordis-catalog
/**
 * Mount a data-form facility on the hub. Mounting is an effect: the
 * returned disposer unmounts the form.
 * @param form - Form key declared in {@link StorageForms}.
 * @param facility - The facility instance to expose.
 * @returns the disposer that unmounts the form.
 */
mount<K extends keyof StorageForms>(form: K, facility: StorageForms[K]): () => void

/**
 * Resolve a mounted data form.
 * @param form - Form key declared in {@link StorageForms}.
 * @returns the mounted facility.
 */
form<K extends keyof StorageForms>(form: K): StorageForms[K]
```

Source: [`packages/storage/storage/src/index.ts`](../../packages/storage/storage/src/index.ts)

<a id="ctxstoragedomain--domainfacility"></a>

### `ctx.storageDomain` — `DomainFacility`

The mounted domain facility. Opens declared domains over routed backends; one facility instance owns the open-domain table and enforces single-open per domain name.

```ts cordis-catalog
/**
 * Open one declared domain. Steps, each failing the whole call: reject a
 * name that is already open (`already-open`); resolve the backend route
 * (`backend-not-found` passes through from the hub); require its `kv` facet
 * (`facet-unsupported`); open the unit projected from the spec (backend
 * `version-mismatch`/`malformed-medium` pass through); load and validate
 * every stored record against the spec's zod schemas (`invalid-record`
 * with the offending table and key — unless the spec declares
 * `invalidRecords: 'backup-and-skip'` and the unit can move documents aside, in
 * which case the failing record is backed up, logged, and skipped);
 * construct the domain.
 *
 * Lifecycle: the CALLER owns the returned handle and closes it via
 * `Domain.close()` (typically as its own `ctx.effect` disposer) — the
 * facility does not tie the domain to any consumer fiber. Domains still
 * open when the facility unmounts are closed by the plugin disposer.
 * @param spec - The domain declaration, typically from `defineDomain`.
 * @returns the opened domain handle, typed by the spec.
 */
async open<S extends DomainSpec>(spec: S): Promise<Domain<S>>

/**
 * Look up an open domain by name, untyped. Diagnostic surface (the package
 * invariant cross-checks change events against live domain state); typed
 * consumers hold the handle returned by {@link open}.
 * @param name - Domain name.
 * @returns the open domain runtime, or `undefined` when not open.
 */
get(name: string): DomainImpl | undefined

/**
 * Close every domain still open on this facility. The unmount path for
 * consumers that never called `Domain.close()` themselves; closing is
 * idempotent, so double-closing an already-closed domain is harmless.
 * @returns resolution after every unit is released.
 */
async closeAll(): Promise<void>
```

Source: [`packages/storage/storage-domain/src/index.ts`](../../packages/storage/storage-domain/src/index.ts)

<a id="domain-events"></a>

### `domain/*` events

<a id="domainchanged--emit"></a>

#### `domain/changed` — emit

A domain record or the global singleton changed, emitted once per write strictly after the backend acknowledged durability. Events of one domain arrive in its write-chain order.

```ts cordis-catalog
/**
 * A domain record or the global singleton changed, emitted once per write
 * strictly after the backend acknowledged durability. Events of one
 * domain arrive in its write-chain order.
 * @param change - domain, table (`''` for global), key (`''` for global),
 * operation discriminant, and on `put` the new snapshot.
 * @mode emit
 */
'domain/changed'(change: DomainChanged): void
```

Source: [`packages/storage/storage-domain/src/events.ts`](../../packages/storage/storage-domain/src/events.ts)
<!-- END GENERATED cordis-surface -->
