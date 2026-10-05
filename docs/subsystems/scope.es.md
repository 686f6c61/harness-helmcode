# Registro con ámbito

[English](scope.md) | Español

El [paquete scope](../../packages/core/scope) suministra el vocabulario de identidad, portador y capas con ámbito que hace que un contexto de registro signifique tanto visibilidad por agent como propiedad compartida del tiempo de vida. Es una primitiva de biblioteca y no un servicio de Cordis; la [Agent Note de diseño de runtime de agent-scope](../../.agents/notes/implemented/architecture/2026-07-12-agent-scope-runtime-design.md#scope-routing-one-opaque-key-selects-one-layer) posee la justificación del ciclo de vida, y el [README](../../packages/core/scope/README.md) del paquete posee la API invocable y la semántica de filtrado.

Fuentes: [`packages/core/scope/src/index.ts`](../../packages/core/scope/src/index.ts) y [`packages/core/scope/src/store.ts`](../../packages/core/scope/src/store.ts).

## Identidad y portador de despacho

`ScopeKey` es una identidad de objeto opaca. El loop entregado usa el objeto `Agent` vivo como su propia clave, pero la primitiva nunca inspecciona el objeto.

```ts type-equiv
/** An opaque, identity-compared scope key. */
type ScopeKey = object
```

`Scoped<T>` es la marca en tiempo de compilación sobre el receptor de enrutado opaco devuelto por `scopeTarget(base, key)`. Las declaraciones de eventos filtrados por ámbito requieren este portador como su tipo `this`, mientras que el sujeto real del evento sigue siendo un argumento explícito.

```ts type-equiv
/**
 * A routing-only event receiver built by {@link scopeTarget}. The type
 * parameter records the subject type for dispatch checking; the carrier does
 * not expose the subject's properties. Event payloads carry the real subject.
 */
type Scoped<T extends object> = object & { readonly [ScopedBrand]: T }
```

## Contexto de registro poseído

`Scope` empareja el contexto de registro etiquetado con dos rutas de desmontaje. `rawDispose` conserva la identidad exacta del disposer de Cordis que necesita un efecto compuesto ordenado; `dispose()` es la frontera pública compartida de quiescencia para llamantes directos y concurrentes.

```ts type-equiv
/** A minted registration scope and its quiescent disposal boundaries. */
interface Scope {
  /** Context through which scope-owned registrations are made. */
  ctx: Context
  /** Exact Cordis disposer, used when nesting this scope in an ordered composite effect. */
  rawDispose: () => Promise<void> | void
  /** Dispose every scope-owned registration; racing calls await the same completion. */
  dispose(): Promise<void>
}
```

## Capa de registry con ámbito

`ScopeLayer` representa la contribución completa de un registry a nivel global o de ámbito exacto. Una capa concreta puede agregar varias tablas con nombre y anónimas; la vacuidad de capa completa permite a `ScopedLayers` reclamar estado con ámbito sin descartar una tabla hermana.

```ts type-equiv
/** One scope's aggregate contribution to a registry. */
interface ScopeLayer {
  /** Whether every table in this layer is empty. */
  isEmpty(): boolean
}
```

`ScopedLayers<L>` posee la capa global inmediata y las capas de ámbito exacto creadas perezosamente. Las lecturas no crean capas: `peek(undefined)` significa que no hay superposición, mientras que `merge()` materializa las entradas globales con nombre en orden de inserción seguidas de las sombras con ámbito. Los registros usan un contexto tanto para la visibilidad como para la propiedad del efecto de Cordis, recogen una undo síncrona antes de la notificación opcional, devuelven el disposer exacto de Cordis y reclaman una capa con ámbito solo cuando su `ScopeLayer` completa está vacía.

`NamedEntries<V>` suministra búsqueda en orden de inserción e iteración en vivo con errores de duplicado propiedad del llamante. `AnonymousEntries<V>` da a cada append una identidad única para que los valores iguales sigan siendo independientes. La iteración permanece viva dentro de una generación de tabla no vacía; drenar la tabla desconecta los iteradores existentes de las inserciones posteriores. Ambas devuelven undos idempotentes de entrada exacta; la interfaz de implementación compartida `EntryValues` no es pública.
