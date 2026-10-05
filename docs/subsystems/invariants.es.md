# Invariantes de runtime

[English](invariants.md) | Español

[dsh-invariants](../../packages/runtime-diagnostics/invariants) es el servicio registry configurable (`ctx.invariants`) para las comprobaciones de invariantes de runtime que pertenecen a los paquetes. Es un paquete del grupo de soporte, no un capability seam de tres paquetes, y no forma parte de la espina dorsal del agent loop: el registry es dueño de la selección, la reserva de nombres, el ciclo de vida de las fibers hijas y el fallo atribuido al paquete, mientras que cada paquete del espacio de trabajo publica un plugin acompañante `./invariant` que registra comprobaciones bajo su nombre exacto de paquete npm. Lo que una comprobación puede afirmar — flujos de eventos autoritativos o datos mutables, nunca la presencia de un servicio o método — es la convención de invariantes de runtime de [AGENTS.md](../../AGENTS.md#conventions).

Fuente: [`packages/runtime-diagnostics/invariants/src/index.ts`](../../packages/runtime-diagnostics/invariants/src/index.ts)

## Selección

```ts type-equiv
/** Runtime invariant selection configured on the service plugin. */
interface Config {
  /** Global switch; defaults to `true`. */
  readonly enabled?: boolean
  /** Case-sensitive JavaScript regex sources that admit package names; empty admits all. */
  readonly package_allowlist?: string[]
  /** Case-sensitive JavaScript regex sources that exclude package names after allowlist matching. */
  readonly package_blocklist?: string[]
}
```

Un paquete queda seleccionado cuando el servicio está habilitado, la lista de admisión está vacía o al menos un patrón coincide con su nombre npm completo, y ningún patrón de la lista de bloqueo coincide: una coincidencia de la lista de bloqueo prevalece sobre una de la lista de admisión. Las entradas se compilan con `new RegExp(source)`: la coincidencia no está anclada salvo que la fuente aporte `^` y `$`, y la sintaxis `/pattern/flags` no se analiza. La validación falla en voz alta al arrancar el servicio: una entrada vacía, con espacios alrededor, duplicada o inválida lanza en lugar de omitirse. Un patrón válido puede no coincidir con ningún paquete cargado actualmente, de modo que la carga posterior y HMR (reemplazo de módulos en caliente) siguen siendo deterministas; los filtros son fijos durante la vida del servicio ([README](../../packages/runtime-diagnostics/invariants/README.md)).

## El instalador

```ts type-equiv
/**
 * Throw a package-attributed invariant failure.
 * @param message - violated package contract without the standard prefix.
 * @returns never because reporting a violation throws.
 */
type InvariantFailure = (message: string) => never
```

```ts type-equiv
/** Install one package's checks into the registration's child context. */
interface InvariantInstaller {
  /**
   * Install the package contribution.
   * @param ctx - child context owned by this invariant registration.
   * @param fail - reporter bound to the registering package name.
   * @returns nothing, or a promise settling after asynchronous checks finish.
   */
  (ctx: Context, fail: InvariantFailure): void | Promise<void>
  /** Services the child installer fiber may access. */
  readonly inject?: Inject
}
```

Un instalador habilitado se ejecuta en una fiber de Cordis hija dedicada; `installer.inject` declara los servicios a los que esa fiber puede acceder, y la finalización síncrona o asíncrona del instalador se espera antes de que el registro tenga éxito. `fail(message)` lanza `InvariantError` — `extends Error` con `code: 'INVARIANT'` estable, el `packageName` propietario y un mensaje con el prefijo `invariant violated by "<package>": …` — de modo que una violación es atribuible sin que el registry importe ningún paquete de producto.

## El servicio

`ctx.invariants.register(packageName, installer)` reserva un registro activo para el nombre completo del paquete npm y devuelve su disposer de ámbito de efecto. La reserva se mantiene incluso cuando los filtros dejan inactivo al instalador, de modo que dos plugins nunca pueden reclamar silenciosamente el mismo nombre de paquete; un nombre duplicado, vacío o con espacios lanza. Un fallo del instalador hace dispose de la fiber hija y libera la reserva atómicamente. El servicio es dueño de cada fiber de registro mientras que el disposer devuelto también pertenece a la fiber acompañante: descargar cualquiera de los dos lados elimina los listeners, el estado de traza y la reserva, de modo que un acompañante puede recargarse y registrar el mismo nombre de nuevo sin estado retenido.

## El contrato del acompañante

Cada paquete del espacio de trabajo es dueño de un acompañante `./invariant` ([contrato de paquete](../../packages/AGENTS.md)); la publicación y el registro son exhaustivos, pero las aserciones deliberadamente no son sintéticas. Un acompañante instala una comprobación solo cuando su paquete es dueño de una relación observable de eventos o de datos mutables; en caso contrario exporta un instalador vacío cuyo comentario inicial empieza por `No runtime invariant:` y explica, de forma específica del paquete, por qué no hay nada comprobable. `pnpm run verify-package-invariants` rechaza mecánicamente los marcadores generados, los instaladores vacíos sin explicación, los instaladores no vacíos que omiten o ignoran el reportador, los nombres de registro incorrectos y el cableado incompleto de exportación, publicación, dependencia o bundle ([Agent Note de la regla mecánica](../../.agents/notes/implemented/architecture/2026-07-19-package-invariant-runtime-contracts.md)). El catálogo de acompañantes ejecutables y la composición estándar viven en el [README del paquete](../../packages/runtime-diagnostics/invariants/README.md).

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxinvariants--invariantregistry"></a>

### `ctx.invariants` — `InvariantRegistry`

Package-owned invariant registry with global and regex-based selection.

```ts cordis-catalog
/**
 * Register one package's invariant installer. The package name is reserved
 * even when filtering disables its checks. Enabled installers run in a child
 * fiber; failure disposes that fiber and releases the reservation.
 * @param packageName - full npm package name that owns the contribution.
 * @param installer - listener or startup-check installer for the child context.
 * @returns an effect-scoped disposer for the registration.
 */
register(packageName: string, installer: InvariantInstaller): () => void
```

Source: [`packages/runtime-diagnostics/invariants/src/index.ts`](../../packages/runtime-diagnostics/invariants/src/index.ts)
<!-- END GENERATED cordis-surface -->
