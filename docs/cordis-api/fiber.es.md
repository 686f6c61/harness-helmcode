<!-- La fuente en inglés la genera scripts/gen-cordis-catalog.ts; este archivo en español es la contraparte revisada que se mantiene mediante emparejamiento bilingüe.
     Para actualizarlo, ejecutar primero `pnpm run gen-cordis-catalog` para actualizar el inglés, después actualizar este archivo y ejecutar `pnpm run verify-translation-pairing --write docs/cordis-api/fiber.md` para re-registrar el par. -->

# Fiber

[English](fiber.md) | Español

Un fiber es una instancia de plugin cargada: su estado de ciclo de vida, su configuración validada y sus efectos registrados. `ctx.fiber` es el fiber actual, y `ctx.effect()` le delega.

### ctx.effect(execute, label?)

```ts cordis-catalog
/**
 * Register a cleanup-aware effect on this fiber.
 *
 * `execute` runs immediately; the disposers it produces are collected and
 * run (in reverse order) either when the returned disposer is called or
 * when the fiber unloads, whichever comes first. Calling the disposer twice
 * is a no-op. Throws `CordisError('INACTIVE_EFFECT')` if the fiber is
 * already disposed, and `TypeError` if `execute` returns an invalid shape.
 *
 * @param execute — the effect body; see {@link Effect} for accepted shapes.
 * @param label — effect label shown in `getEffects()` diagnostics.
 * @returns a disposer that tears the effect down and settles once done.
 */
effect(execute: () => SyncEffect, label?: string): Disposable<Promise<void>>
effect(execute: () => Effect, label?: string): AsyncDisposable<Promise<void>>
```

Registrar un efecto con limpieza en este fiber.

`execute` se ejecuta inmediatamente; los disposers que produce se recogen y se ejecutan (en orden inverso) cuando se llama al disposer devuelto o cuando el fiber se descarga, lo que ocurra primero. Llamar al disposer dos veces es una no-operación. Lanza `CordisError('INACTIVE_EFFECT')` si ya se hizo dispose (liberación de recursos) del fiber, y `TypeError` si `execute` devuelve una forma inválida.

- `execute` — el cuerpo del efecto; véase `Effect` para las formas aceptadas.
- `label` — etiqueta del efecto mostrada en los diagnósticos de `getEffects()`.

**Devuelve** un disposer que desmonta el efecto y se asienta al terminar.

[Fuente](../../vendor/cordis/src/fiber.ts#L415)

### ctx.fiber

```ts cordis-catalog
/** The fiber (plugin runtime instance) that owns this context. */
fiber: Fiber
```

El fiber (instancia de runtime del plugin) que posee este contexto.

[Fuente](../../vendor/cordis/src/fiber.ts#L12)

## La clase Fiber

Instancia de runtime de una aplicación de plugin.

Un fiber rastrea el estado de las dependencias, la configuración validada, los efectos de ciclo de vida y la limpieza del contexto de plugin devuelto por `ctx.plugin()`.

[Fuente](../../vendor/cordis/src/fiber.ts#L184)

### fiber.uid

```ts cordis-catalog
/** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
public uid: number | null
```

Id único dentro del registry; 0 para el fiber raíz, `null` una vez hecho dispose.

[Fuente](../../vendor/cordis/src/fiber.ts#L186)

### fiber.ctx

```ts cordis-catalog
/** The context this fiber's plugin runs in (extends the parent context). */
public readonly ctx: Context
```

El contexto en el que se ejecuta el plugin de este fiber (extiende el contexto padre).

[Fuente](../../vendor/cordis/src/fiber.ts#L188)

### fiber.config

```ts cordis-catalog
/** The validated plugin config (updated by `update()`). */
public config: any
```

La configuración validada del plugin (actualizada por `update()`).

[Fuente](../../vendor/cordis/src/fiber.ts#L190)

### fiber.state

```ts cordis-catalog
/** Current lifecycle state; transitions emit `internal/status`. */
public state
```

Estado actual del ciclo de vida; las transiciones emiten `internal/status`.

[Fuente](../../vendor/cordis/src/fiber.ts#L194)

### fiber.dispose

```ts cordis-catalog
/** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
public readonly dispose: () => Promise<void>
```

Hacer dispose de este fiber: descargar el plugin y luego asentarse cuando la limpieza ha terminado.

[Fuente](../../vendor/cordis/src/fiber.ts#L196)

### fiber.store

```ts cordis-catalog
/** Snapshot of required service implementations while loaded; `undefined` otherwise. */
public store: Dict<Impl> | undefined
```

Snapshot de las implementaciones de servicios requeridas mientras está cargado; `undefined` en caso contrario.

[Fuente](../../vendor/cordis/src/fiber.ts#L198)

### fiber.inertia

```ts cordis-catalog
/** The in-flight load/unload transition, if one is currently running. */
public inertia: Promise<void> | undefined
```

La transición de carga/descarga en curso, si hay una ejecutándose.

[Fuente](../../vendor/cordis/src/fiber.ts#L200)

### fiber.name

```ts cordis-catalog
/** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
get name()
```

El nombre visible del plugin, heredado del ancestro con nombre más cercano, o `'root'` en su defecto.

[Fuente](../../vendor/cordis/src/fiber.ts#L336)

### fiber.assertActive()

```ts cordis-catalog
/**
 * Throw if the fiber has already been disposed.
 *
 * @returns nothing when the fiber is still active.
 * @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
 */
assertActive()
```

Lanzar un error si ya se hizo dispose del fiber.

**Devuelve** nada cuando el fiber sigue activo.

[Fuente](../../vendor/cordis/src/fiber.ts#L351)

### fiber.effect(execute, label?)

```ts cordis-catalog
/**
 * Register a cleanup-aware effect on this fiber.
 *
 * `execute` runs immediately; the disposers it produces are collected and
 * run (in reverse order) either when the returned disposer is called or
 * when the fiber unloads, whichever comes first. Calling the disposer twice
 * is a no-op. Throws `CordisError('INACTIVE_EFFECT')` if the fiber is
 * already disposed, and `TypeError` if `execute` returns an invalid shape.
 *
 * @param execute — the effect body; see {@link Effect} for accepted shapes.
 * @param label — effect label shown in `getEffects()` diagnostics.
 * @returns a disposer that tears the effect down and settles once done.
 */
effect(execute: () => SyncEffect, label?: string): Disposable<Promise<void>>
effect(execute: () => Effect, label?: string): AsyncDisposable<Promise<void>>
```

Registrar un efecto con limpieza en este fiber.

`execute` se ejecuta inmediatamente; los disposers que produce se recogen y se ejecutan (en orden inverso) cuando se llama al disposer devuelto o cuando el fiber se descarga, lo que ocurra primero. Llamar al disposer dos veces es una no-operación. Lanza `CordisError('INACTIVE_EFFECT')` si ya se hizo dispose del fiber, y `TypeError` si `execute` devuelve una forma inválida.

- `execute` — el cuerpo del efecto; véase `Effect` para las formas aceptadas.
- `label` — etiqueta del efecto mostrada en los diagnósticos de `getEffects()`.

**Devuelve** un disposer que desmonta el efecto y se asienta al terminar.

[Fuente](../../vendor/cordis/src/fiber.ts#L415)

### fiber.getEffects()

```ts cordis-catalog
/**
 * Return metadata for currently registered effects.
 *
 * @returns one {@link EffectMeta} tree per labeled live effect.
 */
getEffects()
```

Devolver metadatos de los efectos registrados actualmente.

**Devuelve** un árbol `EffectMeta` por cada efecto vivo con etiqueta.

[Fuente](../../vendor/cordis/src/fiber.ts#L568)

### fiber.await()

```ts cordis-catalog
/**
 * Wait for current lifecycle work and rethrow startup errors.
 *
 * @returns this fiber, once it has settled into a stable state.
 * @throws the config-validation or plugin-startup error, if any.
 */
async await()
```

Esperar el trabajo de ciclo de vida actual y relanzar los errores de arranque.

**Devuelve** este fiber, una vez que se ha asentado en un estado estable.

[Fuente](../../vendor/cordis/src/fiber.ts#L704)

### fiber.restart()

```ts cordis-catalog
/**
 * Dispose and immediately reload this plugin with its current config.
 *
 * @returns a promise resolving once the reload settled.
 * @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
 */
async restart()
```

Hacer dispose y recargar inmediatamente este plugin con su configuración actual.

**Devuelve** una promesa que se resuelve cuando la recarga se ha asentado.

[Fuente](../../vendor/cordis/src/fiber.ts#L718)

### fiber.update(config, noSave?)

```ts cordis-catalog
/**
 * Validate and apply new config, then restart the plugin.
 *
 * Runs the `internal/update` waterfall first, so update hooks (and HMR)
 * can veto or replace the restart.
 *
 * @param config — the new raw config; validated before anything restarts.
 * @param noSave — hint for persistence hooks not to write the change back.
 * @returns nothing; the restart runs behind the `internal/update` waterfall.
 * @throws {ValidationError} when the new config fails validation.
 */
update(config: any, noSave = false)
```

Validar y aplicar la nueva configuración, y luego reiniciar el plugin.

Primero ejecuta el waterfall (eventos en cascada) `internal/update`, de modo que los hooks de actualización (y HMR, reemplazo de módulos en caliente) puedan vetar o reemplazar el reinicio.

- `config` — la nueva configuración en bruto; se valida antes de que nada se reinicie.
- `noSave` — indicación para los hooks de persistencia de no escribir el cambio de vuelta.

**Devuelve** nada; el reinicio se ejecuta tras el waterfall `internal/update`.

[Fuente](../../vendor/cordis/src/fiber.ts#L736)

## Effect

Resultado del cuerpo de efecto aceptado por `ctx.effect()` y el arranque de plugins.

Puede ser un único disposer, una promesa de uno, o un iterable (posiblemente asíncrono) que produzca varios: los efectos generador registran cada disposer producido a medida que se genera.

```ts cordis-catalog
/**
 * Effect body result accepted by `ctx.effect()` and plugin startup.
 *
 * Either a single disposer, a promise of one, or a (possibly async) iterable
 * yielding several — generator effects register each yielded disposer as it
 * is produced.
 */
type Effect<T = any> =
  | SyncEffect<T>
  | AsyncEffect<T>
```

[Fuente](../../vendor/cordis/src/fiber.ts#L83)

## Disposable

Función devuelta por un efecto para liberar recursos durante el dispose.

Los disposers se ejecutan en orden inverso de registro cuando el fiber propietario se descarga; pueden ser asíncronos, en cuyo caso la descarga los espera.

```ts cordis-catalog
/**
 * Function returned by an effect to release resources during disposal.
 *
 * Disposers run in reverse registration order when the owning fiber unloads;
 * they may be async, in which case unloading awaits them.
 */
type Disposable<T = any> = () => T
```

[Fuente](../../vendor/cordis/src/fiber.ts#L74)

## EffectMeta

Nodo de árbol usado para exponer etiquetas de efectos anidados con fines de diagnóstico.

```ts cordis-catalog
/** Tree node used to expose nested effect labels for diagnostics. */
interface EffectMeta {
  /** Human-readable effect label, e.g. `ctx.on("event")` or `ctx.provide("name")`. */
  label: string
  /** Metadata of nested effects registered while this effect ran. */
  children: EffectMeta[]
}
```

[Fuente](../../vendor/cordis/src/fiber.ts#L96)

## CordisError

Error del framework con un código estable legible por máquina.

```ts cordis-catalog
/** Framework error with a stable machine-readable code. */
class CordisError extends Error {
  /**
   * @param code — the stable error code; also the default message.
   * @param message — optional human-readable override.
   */
  constructor(public code: CordisError.Code, message?: string)
}

/** Cordis error code definitions. */
namespace CordisError {
  export type Code = keyof typeof Code

  export const Code = {
    INACTIVE_EFFECT: 'cannot create effect on inactive context',
  } as const
}
```

[Fuente](../../vendor/cordis/src/fiber.ts#L157)

## ValidationError

Error lanzado cuando la configuración de un plugin no supera la validación de standard schema.

```ts cordis-catalog
/** Error raised when plugin configuration fails standard-schema validation. */
class ValidationError extends TypeError {
  name = 'ValidationError'

  /**
   * Build the aggregated message from schema issues.
   *
   * @param issues — the standard-schema issues, one message line each.
   */
  constructor(issues: readonly StandardSchemaV1.Issue[])
}
```

[Fuente](../../vendor/cordis/src/fiber.ts#L19)
