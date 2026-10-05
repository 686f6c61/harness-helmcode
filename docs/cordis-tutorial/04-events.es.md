# 4. Eventos

[English](04-events.md) | Español

Los servicios soportan llamadas directas; los **eventos** permiten a un plugin anunciar algo sin saber qué plugins escuchan. El harness usa eventos para interacciones como resultados de tools, peticiones de modelo y decisiones de aprobación.

## Declarar, emitir, escuchar

Crear `stats.ts` en `tmp/cordis-tutorial`: un servicio que cuenta cosas y anuncia cada cambio:

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    stats: StatsService
  }
  interface Events {
    'stats/report'(name: string, count: number): void
  }
}

export class StatsService extends Service {
  private counts = new Map<string, number>()

  constructor(ctx: Context) {
    super(ctx, 'stats')
  }

  bump(name: string) {
    const next = (this.counts.get(name) ?? 0) + 1
    this.counts.set(name, next)
    this.ctx.emit('stats/report', name, next)
  }
}

export const name = 'stats'

export function apply(ctx: Context) {
  ctx.plugin(StatsService)
}
```

La fusión de `interface Events` es la gemela, en el sistema de eventos, de la fusión de `interface Context` del capítulo 3: declara el nombre del evento y la firma de sus listeners, de modo que `ctx.emit` y `ctx.on` están completamente tipados. La convención de nombres `namespace/action` mantiene legible el espacio de nombres plano de eventos.

Crear `reporter.ts`:

```ts ignore-check
import type { Context } from '@deepseek-ai/cordis'
import type {} from './stats.ts'

export const name = 'reporter'
export const inject = ['stats']

export function apply(ctx: Context) {
  ctx.on('stats/report', (name, count) => {
    console.log(`[stats] ${name} -> ${count}`)
  })
  ctx.stats.bump('tool_call')
  ctx.stats.bump('tool_call')
  ctx.stats.bump('prompt')
}
```

La línea `import type {} from './stats.ts'` no importa nada en runtime; existe para que TypeScript vea las fusiones de declaraciones. Componer y ejecutar:

```yaml
- name: './stats.ts'
- name: './reporter.ts'
```

```
[stats] tool_call -> 1
[stats] tool_call -> 2
[stats] prompt -> 1
```

Como `ctx.on()` es un efecto, el listener desaparece con el plugin: sin contabilidad manual de `removeListener`, nunca.

## Modos de despacho

`emit` es uno de los cinco modos de despacho. Qué modo usa un evento es parte de su contrato: decide si los listeners pueden devolver valores, ejecutarse concurrentemente o cortocircuitarse entre sí:

| Modo | Llamada | Semántica |
|---|---|---|
| emit | `ctx.emit(name, ...args)` | Difusión síncrona; las promesas y los valores devueltos no se esperan ni se recogen. |
| parallel | `await ctx.parallel(name, ...args)` | Todos los listeners se ejecutan concurrentemente; se esperan juntos. |
| serial | `await ctx.serial(name, ...args)` | Los listeners se ejecutan en orden, esperados; el primer retorno no `null`/`false`/`undefined` gana y detiene al resto. |
| bail | `ctx.bail(name, ...args)` | Versión síncrona de serial. |
| waterfall | `ctx.waterfall(name, ...args, next)` | Middleware envolvente; véase más abajo. |

Cada evento del harness documenta su modo en la referencia generada de la [página de subsistema](../subsystems/core.es.md) a la que pertenece.

## Waterfall: transformar o cortocircuitar

El waterfall (eventos en cascada) es el modo que potencia la interceptación. Cada listener recibe los argumentos más una continuación `next()`; puede transformar lo que `next()` devuelve, o retornar sin llamar a `next()` y cortocircuitar el resto de la cadena, lo que la documentación de Cordis llama el veto. Crear `waterfall-demo.ts`:

```ts
import type { Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Events {
    'demo/transform'(input: string, next: () => Promise<string>): Promise<string>
  }
}

export const name = 'waterfall-demo'

export function apply(ctx: Context) {
  // Listener 1: wrap the downstream result.
  ctx.on('demo/transform', async (input, next) => {
    const downstream = await next()
    return downstream.toUpperCase()
  })

  // Listener 2: short-circuit when it owns the decision.
  ctx.on('demo/transform', async (input, next) => {
    if (input.includes('blocked')) return '** blocked **'
    return next()
  })

  void (async () => {
    console.log(await ctx.waterfall('demo/transform', 'hello', async () => 'hello'))
    console.log(await ctx.waterfall('demo/transform', 'blocked words', async () => 'blocked words'))
  })()
}
```

Apuntar `cordis.yml` solo a este archivo y ejecutar:

```
HELLO
** BLOCKED **
```

Recorrer la segunda línea: el listener 1 se ejecuta primero, llama a `next()`, que invoca al listener 2; el listener 2 ve `blocked` y retorna sin llamar a `next()` (el comportamiento por defecto más interno, la función pasada a `ctx.waterfall`, nunca se ejecuta), y el listener 1 pone en mayúsculas el mensaje de reemplazo a la salida.

La disciplina que se sigue: **un listener de waterfall que solo observa o anota debe llamar a `next()`**; retornar sin hacerlo es un cortocircuito deliberado. Olvidar `next()` en un listener de registro se traga silenciosamente el comportamiento por defecto para todos los que están más abajo. Es una regla permanente de este repositorio ([semántica de waterfall](../cordis-primer.es.md#cordis-waterfall-semantics)).

El harness usa waterfalls para decisiones que plugins cooperantes pueden envolver o responder: [`agent/request`](../subsystems/core.es.md#agentrequest--waterfall) permite a un plugin reemplazar la configuración de la llamada al modelo, y [`approval/request`](../subsystems/approval.es.md#approvalrequest--waterfall) permite a una política responder en lugar del usuario.

Siguiente: [Configuración](05-config.es.md): opciones de plugin desde `cordis.yml`.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
