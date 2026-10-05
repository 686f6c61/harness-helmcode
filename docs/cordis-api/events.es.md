<!-- La fuente en inglés la genera scripts/gen-cordis-catalog.ts; este archivo en español es la contraparte revisada que se mantiene mediante emparejamiento bilingüe.
     Para actualizarlo, ejecutar primero `pnpm run gen-cordis-catalog` para actualizar el inglés, después actualizar este archivo y ejecutar `pnpm run verify-translation-pairing --write docs/cordis-api/events.md` para re-registrar el par. -->

# Eventos

[English](events.md) | Español

La API de despacho de eventos mezclada en cada contexto. Las declaraciones de eventos del harness y sus modos de despacho se generan en la [página de subsistema](../subsystems/core.es.md) a la que pertenecen.

### ctx.parallel(name, ...args)

```ts cordis-catalog
/**
 * Dispatch an event, running all listeners concurrently.
 *
 * @param name — the event name.
 * @param args — arguments passed to every listener.
 * @returns a promise resolving once every listener has settled.
 */
parallel<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): Promise<void>
parallel<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): Promise<void>
```

Despachar un evento, ejecutando todos los listeners concurrentemente.

- `name` — el nombre del evento.
- `args` — argumentos pasados a cada listener.

**Devuelve** una promesa que se resuelve cuando todos los listeners se han asentado.

[Fuente](../../vendor/cordis/src/events.ts#L44)

### ctx.emit(name, ...args)

```ts cordis-catalog
/**
 * Dispatch an event synchronously, ignoring listener return values.
 *
 * @param name — the event name.
 * @param args — arguments passed to every listener.
 */
emit<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): void
emit<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): void
```

Despachar un evento de forma síncrona, ignorando los valores de retorno de los listeners.

- `name` — el nombre del evento.
- `args` — argumentos pasados a cada listener.

[Fuente](../../vendor/cordis/src/events.ts#L53)

### ctx.serial(name, ...args)

```ts cordis-catalog
/**
 * Dispatch an event, awaiting listeners in order until one bails.
 *
 * @param name — the event name.
 * @param args — arguments passed to each listener.
 * @returns the first bail value (non-null, non-false, non-undefined), if any.
 */
serial<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): Promisify<ReturnType<Events[K]>>
serial<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): Promisify<ReturnType<Events[K]>>
```

Despachar un evento, esperando a los listeners en orden hasta que uno se retira (bail).

- `name` — el nombre del evento.
- `args` — argumentos pasados a cada listener.

**Devuelve** el primer valor de bail (no nulo, no falso, no indefinido), si lo hay.

[Fuente](../../vendor/cordis/src/events.ts#L63)

### ctx.bail(name, ...args)

```ts cordis-catalog
/**
 * Dispatch an event, calling listeners in order until one bails.
 *
 * @param name — the event name.
 * @param args — arguments passed to each listener.
 * @returns the first bail value (non-null, non-false, non-undefined), if any.
 */
bail<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): ReturnType<Events[K]>
bail<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): ReturnType<Events[K]>
```

Despachar un evento, llamando a los listeners en orden hasta que uno se retira (bail).

- `name` — el nombre del evento.
- `args` — argumentos pasados a cada listener.

**Devuelve** el primer valor de bail (no nulo, no falso, no indefinido), si lo hay.

[Fuente](../../vendor/cordis/src/events.ts#L73)

### ctx.waterfall(name, ...args)

```ts cordis-catalog
/**
 * Dispatch an event whose last argument is a `next` continuation.
 *
 * Each listener wraps the rest of the chain: calling `next()` invokes the
 * next listener (finally the built-in behavior); not calling it vetoes.
 *
 * @param name — the event name.
 * @param args — listener arguments; the final one is the innermost `next`.
 * @returns the outermost listener's return value.
 */
waterfall<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>): ReturnType<Events[K]>
waterfall<K extends keyof Events>(thisArg: NoInfer<ThisType<Events[K]>>, name: K, ...args: Parameters<Events[K]>): ReturnType<Events[K]>
```

Despachar un evento cuyo último argumento es una continuación `next`.

Cada listener envuelve el resto de la cadena: llamar a `next()` invoca al siguiente listener (finalmente el comportamiento incorporado); no llamarlo ejerce el veto.

- `name` — el nombre del evento.
- `args` — argumentos del listener; el último es el `next` más interno.

**Devuelve** el valor de retorno del listener más externo.

[Fuente](../../vendor/cordis/src/events.ts#L86)

### ctx.on(name, listener, options?)

```ts cordis-catalog
/**
 * Register an event listener owned by the current fiber.
 *
 * @param name — the event name to listen for.
 * @param listener — called with the dispatch arguments.
 * @param options — listener options; a boolean is shorthand for `prepend`.
 * @returns a disposer removing the listener; `true` if it was still registered.
 */
on<K extends keyof Events>(name: K, listener: Events[K], options?: boolean | EventOptions): () => boolean
```

Registrar un listener de evento propiedad del fiber actual.

- `name` — el nombre del evento a escuchar.
- `listener` — llamado con los argumentos del despacho.
- `options` — opciones del listener; un booleano es forma abreviada de `prepend`.

**Devuelve** un disposer que elimina el listener; `true` si aún estaba registrado.

[Fuente](../../vendor/cordis/src/events.ts#L97)

### ctx.once(name, listener, options?)

```ts cordis-catalog
/**
 * Same as `on()`, but the listener disposes itself after its first call.
 *
 * @param name — the event name to listen for.
 * @param listener — called at most once with the dispatch arguments.
 * @param options — listener options; a boolean is shorthand for `prepend`.
 * @returns a disposer removing the listener; `true` if it was still registered.
 */
once<K extends keyof Events>(name: K, listener: Events[K], options?: boolean | EventOptions): () => boolean
```

Igual que `on()`, pero el listener hace dispose de sí mismo tras su primera llamada.

- `name` — el nombre del evento a escuchar.
- `listener` — llamado como máximo una vez con los argumentos del despacho.
- `options` — opciones del listener; un booleano es forma abreviada de `prepend`.

**Devuelve** un disposer que elimina el listener; `true` si aún estaba registrado.

[Fuente](../../vendor/cordis/src/events.ts#L106)

## EventOptions

Opciones aceptadas por `ctx.on()` y `ctx.once()`.

```ts cordis-catalog
/** Options accepted by `ctx.on()` and `ctx.once()`. */
interface EventOptions {
  /** Add the listener before existing listeners for the same event. */
  prepend?: boolean
  /** Receive the event regardless of context filter checks. */
  global?: boolean
}
```

[Fuente](../../vendor/cordis/src/events.ts#L112)

## DispatchMode

Estrategia de despacho de eventos usada por el servicio de eventos.

`emit` ejecuta los listeners síncronos sin esperarlos, `parallel` espera a todos los listeners juntos, `serial` los espera en orden hasta que uno se retira (bail), `bail` se detiene en el primer valor de bail síncrono, y `waterfall` compone los listeners alrededor de un callback `next` final.

```ts cordis-catalog
/**
 * Event dispatch strategy used by the event service.
 *
 * `emit` runs synchronous listeners without awaiting them, `parallel` awaits
 * all listeners together, `serial` awaits them in order until one bails,
 * `bail` stops on the first synchronous bail value, and `waterfall` composes
 * listeners around a final `next` callback.
 */
type DispatchMode = 'emit' | 'parallel' | 'serial' | 'bail' | 'waterfall'
```

[Fuente](../../vendor/cordis/src/events.ts#L32)
