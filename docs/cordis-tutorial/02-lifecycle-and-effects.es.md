# 2. Ciclo de vida y efectos

[English](02-lifecycle-and-effects.md) | Español

Un plugin de Cordis puede descargarse por una edición de configuración, una recarga en caliente, un dispose (liberación de recursos) explícito o la pérdida de un servicio requerido. Los registros hechos a través de las API de Cordis son efectos y se deshacen cuando su plugin propietario se descarga; los recursos gestionados fuera de esas API deben envolverse en `ctx.effect()`.

## Efectos

Para un recurso que Cordis no gestiona ya (un temporizador, una conexión, un watcher), envolverlo en `ctx.effect()` y devolver un disposer:

Crear `lifecycle.ts` en `tmp/cordis-tutorial`:

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'lifecycle-demo'

function heartbeat(ctx: Context) {
  console.log('heartbeat plugin loading')
  ctx.effect(() => {
    const timer = setInterval(() => console.log('tick'), 200)
    return () => {
      clearInterval(timer)
      console.log('heartbeat cleaned up')
    }
  })
}

export function apply(ctx: Context) {
  // Mount a child plugin and keep its fiber to dispose it later.
  const fiber = ctx.plugin(heartbeat)
  // The demo timer is itself an effect: if THIS plugin is unloaded first,
  // the pending callback is cancelled instead of firing on a dead app.
  ctx.effect(() => {
    const timer = setTimeout(async () => {
      await fiber.dispose()
      console.log('disposed')
      process.exit(0)
    }, 700)
    return () => clearTimeout(timer)
  })
}
```

Apuntar `cordis.yml` a él:

```yaml
- name: './lifecycle.ts'
```

Ejecutar (`node --import tsx ../../vendor/cordis/bin.js`) y se obtiene:

```
heartbeat plugin loading
tick
tick
tick
heartbeat cleaned up
disposed
```

Tres cosas a notar:

- `ctx.plugin(heartbeat)` monta una función **desde código** como plugin: la misma operación que el loader de YAML realiza para cada entrada de configuración. Un plugin de función no necesita método `apply`: Cordis llama a la función directamente y usa su nombre solo para diagnósticos. Un método `apply` solo es obligatorio para la forma de objeto, `ctx.plugin({ apply(ctx) { /* ... */ } })`. La llamada devuelve un **fiber**, el identificador en runtime de una instancia de plugin cargada.
- El cuerpo del efecto se ejecuta durante la carga; el disposer que devuelve se ejecuta durante la descarga. Nunca se llama al disposer manualmente para un recurso de vida del plugin.
- `fiber.dispose()` se resuelve después de que toda la limpieza del plugin, incluidos los disposers asíncronos, haya terminado, y descarga recursivamente cualquier plugin hijo que hubiera montado.

## La máquina de estados del fiber

Cada instancia de plugin cargada posee un fiber que atraviesa estos estados:

```
PENDING → LOADING → ACTIVE → UNLOADING → DISPOSED
                 ↘ FAILED
```

- **PENDING**: declarado, pero un servicio requerido (capítulo 3) aún no está disponible.
- **LOADING / ACTIVE**: `apply` se está ejecutando / ha completado.
- **FAILED**: `apply` o la validación de configuración lanzó un error.
- **UNLOADING / DISPOSED**: los disposers se están ejecutando / todo está desmontado.

PENDING reaparecerá en el [capítulo 6](06-composition-and-hmr.es.md), donde es la respuesta habitual a «¿por qué mi plugin no imprime nada?».

## Qué ya es un efecto

Rara vez se escribe `ctx.effect()` manualmente, porque las API de registro incorporadas ya son efectos:

- `ctx.on(event, listener)`: el listener se elimina al descargar ([capítulo 4](04-events.es.md)).
- `ctx.plugin(child)`: el hijo hace dispose con su padre.
- Los registros de servicios son efectos. Los registries del harness, como `ctx.tools.register(...)`, también adjuntan sus disposers devueltos al plugin llamante, de modo que se desenrollan automáticamente ([capítulo 7](07-into-the-harness.es.md)).

Para un recurso que Cordis no gestiona, adquirirlo dentro de `ctx.effect()` y devolver un disposer que lo libere. Cordis invoca entonces esa liberación durante la descarga, incluida la recarga en caliente.

Una advertencia de orden: los disposers arrancan en orden inverso de registro, pero varios disposers **asíncronos** se ejecutan concurrentemente. Si los pasos de desmontaje deben ejecutarse en secuencia, mantenerlos en un solo disposer y esperarlos ahí.

Siguiente: [Servicios](03-services.es.md): cómo los plugins comparten capacidades.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
