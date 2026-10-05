<!-- La fuente en inglés la genera scripts/gen-cordis-catalog.ts; este archivo en español es la contraparte revisada que se mantiene mediante emparejamiento bilingüe.
     Para actualizarlo, ejecutar primero `pnpm run gen-cordis-catalog` para actualizar el inglés, después actualizar este archivo y ejecutar `pnpm run verify-translation-pairing --write docs/cordis-api/service.md` para re-registrar el par. -->

# Service

[English](service.md) | Español

La clase base de los servicios de contexto. Una subclase cargada como plugin se registra a sí misma como `ctx.<name>`.

Clase base de los servicios que exponen una API con nombre en `ctx`.

Las subclases llaman a `super(ctx, name)` desde su constructor. El servicio se registra inmediatamente y se elimina automáticamente con el fiber al que pertenece.

[Fuente](../../vendor/cordis/src/service.ts#L11)

### service.name

```ts cordis-catalog
/** The service name this instance is registered under. */
public name!: string
```

El nombre de servicio bajo el que se registra esta instancia.

[Fuente](../../vendor/cordis/src/service.ts#L30)

## Miembros estáticos

### Service.init

```ts cordis-catalog
/** Symbol key of an instance method run after construction (class plugins). */
static readonly init: unique symbol
```

Clave de símbolo de un método de instancia que se ejecuta después de la construcción (plugins de clase).

[Fuente](../../vendor/cordis/src/service.ts#L13)

### Service.check

```ts cordis-catalog
/** Symbol key of the availability predicate passed to `ctx.provide()`. */
static readonly check: unique symbol
```

Clave de símbolo del predicado de disponibilidad que se pasa a `ctx.provide()`.

[Fuente](../../vendor/cordis/src/service.ts#L15)

### Service.config

```ts cordis-catalog
/** Symbol key of the phantom intercept-config type parameter. */
static readonly config: unique symbol
```

Clave de símbolo del parámetro de tipo fantasma de la configuración de interceptación.

[Fuente](../../vendor/cordis/src/service.ts#L17)

### Service.invoke

```ts cordis-catalog
/** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
static readonly invoke: unique symbol
```

Clave de símbolo del cuerpo de llamada que hace invocable a un servicio (p. ej. `ctx.logger()`).

[Fuente](../../vendor/cordis/src/service.ts#L19)

### Service.extend

```ts cordis-catalog
/** Symbol key of the helper deriving an extended service instance. */
static readonly extend: unique symbol
```

Clave de símbolo del auxiliar que deriva una instancia de servicio extendida.

[Fuente](../../vendor/cordis/src/service.ts#L21)

### Service.tracker

```ts cordis-catalog
/** Symbol key of the tracker metadata used for context tracing. */
static readonly tracker: unique symbol
```

Clave de símbolo de los metadatos de tracker usados para el trazado de contextos.

[Fuente](../../vendor/cordis/src/service.ts#L23)

### Service.resolveConfig

```ts cordis-catalog
/** Symbol key of the intercept-config resolution helper below. */
static readonly resolveConfig: unique symbol
```

Clave de símbolo del auxiliar de resolución de la configuración de interceptación de más abajo.

[Fuente](../../vendor/cordis/src/service.ts#L25)
