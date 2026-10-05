# Plugins y ciclo de vida

[English](index.md) | Español

Esta página describe el modelo de plugins de Cordis y la máquina de estados del ciclo de vida.

## Máquina de estados de Fiber

Cada plugin cargado posee un ámbito **Fiber** con los siguientes estados:

```
PENDING → LOADING → ACTIVE
                 ↘ FAILED
ACTIVE → UNLOADING → DISPOSED
```

| Estado | Significado |
|------|------|
| PENDING | Declarado, pero las dependencias requeridas no están listas |
| LOADING | Las dependencias están listas y `apply` se está ejecutando |
| ACTIVE | El plugin está en ejecución |
| FAILED | `apply` lanzó un error |
| UNLOADING | El plugin se está descargando y liberando recursos |
| DISPOSED | El plugin está completamente descargado |

## Carga dirigida por dependencias

Un plugin con `inject` espera a cada servicio requerido antes de cargar:

```ts ignore-check
export const inject = ['tools', 'llm']

export function apply(ctx: Context) {
  // ctx.tools and ctx.llm are ready here.
}
```

Si un servicio requerido desaparece, por ejemplo durante el reemplazo de un proveedor, el plugin se descarga automáticamente (ACTIVE → DISPOSED) y vuelve a cargar cuando el servicio regresa.

## Limpieza automática

Todo registro hecho a través de `ctx` se deshace cuando el plugin se descarga:

```ts ignore-check
export function apply(ctx: Context) {
  // Event listener: removed automatically on unload.
  ctx.on('some-event', handler)

  // Custom resource: the returned disposer runs on unload.
  ctx.effect(() => {
    const connection = createConnection()
    return () => connection.close()
  })
}
```

El framework rastrea y libera todas estas operaciones:
- `ctx.on(event, handler)`: listener de eventos
- `ctx.tools.register(tool)`: registro de tool
- `ctx.llm.registerAdapter(names, adapter)`: registro de adaptador de LLM
- `ctx.effect(() => cleanup)`: recurso personalizado

Durante la descarga, la invocación de disposers empieza en orden inverso de registro, pero varios disposers asíncronos se ejecutan concurrentemente y no tienen garantía de finalización serial. Poner la limpieza dependiente del orden en un solo disposer devuelto por un único `ctx.effect()` y esperar sus pasos en serie allí.

## Contextos anidados

`ctx.plugin()` crea un Fiber hijo que hereda el contexto padre pero tiene un ciclo de vida independiente:

```ts ignore-check
export function apply(ctx: Context) {
  // Register a child plugin.
  ctx.plugin(childPlugin)

  // The child has its own Fiber and unloads with its parent.
}
```

## Semántica de dispose

Para detener una instancia de plugin antes de tiempo:

```ts
import type { Context } from '@deepseek-ai/cordis'

declare const ctx: Context
declare function myPlugin(ctx: Context): void

const fiber = ctx.plugin(myPlugin)

// Dispose it manually later.
await fiber.dispose()
```

`dispose` garantiza:
1. Se eliminan todos los registros que el plugin posee.
2. Los plugins hijos se descargan recursivamente.
3. La promesa devuelta resuelve cuando toda la limpieza asíncrona termina.

## Reemplazo en caliente (HMR)

Con `@deepseek-ai/dsh-hmr` cargado desde `cordis.yml`, editar un archivo fuente de plugin dispara:

1. Descargar el plugin antiguo y limpiar sus registros.
2. Cargar el código nuevo.
3. Ejecutar el nuevo `apply`.

Como los registros de plugins se limpian solos, el reemplazo en caliente no retiene registros de la instancia antigua.

## Ejemplo de ciclo de vida

```ts ignore-check
export function apply(ctx: Context) {
  console.log('plugin loading')

  ctx.effect(() => {
    console.log('effect registered')
    return () => console.log('effect cleaned up')
  })
}
```

La carga imprime:
```
plugin loading
effect registered
```

La descarga imprime:
```
effect cleaned up
```

## Próximos pasos

- [Servicios y dependencias](./service.es.md): exponer una capacidad a otros plugins
- [Sistema de eventos](./events.es.md): comunicar entre plugins
- [Tutorial de Cordis](../../../cordis-tutorial/index.es.md): el mismo ciclo de vida, servicios y eventos construidos paso a paso contra el runtime de Cordis
