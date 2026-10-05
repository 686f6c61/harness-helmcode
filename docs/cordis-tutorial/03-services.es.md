# 3. Servicios

[English](03-services.md) | Español

Un **servicio** es una capacidad con nombre que un plugin provee y otros plugins consumen a través de `ctx`. En el harness, `ctx.tools`, `ctx.llm` y `ctx.agents` son servicios. Un consumidor nombra la capacidad, como `'tools'`, en lugar de importar a su proveedor, de modo que la configuración puede seleccionar un proveedor sin cambiar al consumidor.

## Proveer un servicio

Crear `greeter.ts` en `tmp/cordis-tutorial`:

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    greeter: GreeterService
  }
}

export class GreeterService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'greeter')
  }

  greet(who: string) {
    return `Hello, ${who}!`
  }
}

export const name = 'greeter'

export function apply(ctx: Context) {
  ctx.plugin(GreeterService)
}
```

Dos piezas trabajan juntas:

- **Runtime**: `super(ctx, 'greeter')` registra la instancia bajo el nombre `greeter`. A partir de ese momento, cualquier plugin puede alcanzarla como `ctx.greeter`. El registro es un efecto: descargar el proveedor elimina el servicio.
- **Tiempo de compilación**: el bloque `declare module '@deepseek-ai/cordis'` es fusión de declaraciones de TypeScript. Añade `greeter` a la interfaz `Context` para que `ctx.greeter` pase la verificación de tipos en todas partes. No genera código; sin él, el servicio sigue funcionando en runtime, pero los consumidores pierden la seguridad de tipos.

Una subclase de `Service` es ella misma un plugin (la forma de clase del capítulo 1), así que `ctx.plugin(GreeterService)` la monta como a cualquier otro.

## Consumir un servicio con `inject`

Crear `consumer.ts`:

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'consumer'
export const inject = ['greeter']

export function apply(ctx: Context) {
  console.log(ctx.greeter.greet('world'))
}
```

`inject` lista los servicios que este plugin requiere. Cordis mantiene al plugin en PENDING hasta que exista cada servicio listado, así que dentro de `apply`, `ctx.greeter` está garantizado como listo. El orden de carga en `cordis.yml` no importa: las dependencias, no el orden del archivo, deciden cuándo arrancan los plugins.

Componer y ejecutar:

```yaml
- name: './greeter.ts'
- name: './consumer.ts'
```

```
Hello, world!
```

Intercambiar las dos líneas de `cordis.yml` y volver a ejecutar: la misma salida. Probar a eliminar `./greeter.ts` por completo: el consumidor permanece PENDING y no imprime nada, sin caída ni ejecución parcial. Un fiber PENDING tampoco mantiene vivo el bucle de eventos de Node, así que una composición sin nada más en ejecución termina con 0 en silencio. El [capítulo 6](06-composition-and-hmr.es.md) muestra cómo diagnosticar ese estado.

## Las dependencias se rastrean tras la carga

`inject` no es una comprobación única de arranque. Si un servicio requerido desaparece mientras la aplicación se ejecuta (su proveedor se descargó o se reemplazó en caliente), cada plugin dependiente también se descarga, y carga de nuevo cuando el servicio regresa. Combinado con los efectos ([capítulo 2](02-lifecycle-and-effects.es.md)), esto evita que un consumidor en ejecución retenga una referencia a un servicio no disponible: sus propios registros se desenrollan cuando la dependencia desaparece.

Esto es también por qué el reemplazo de servicios funciona en la configuración: descargar la entrada `dsh-bash-local`, montar un proveedor de `shell` distinto, y cada plugin que inyecta `'shell'` se reinicia limpiamente contra la nueva implementación.

## Dependencias opcionales

`inject` es para requisitos estrictos. Para una capacidad sin la que el plugin puede vivir, omitir `inject` y sondear en el punto de uso:

```ts ignore-check
export function apply(ctx: Context) {
  // undefined when no provider is loaded; the plugin still runs.
  const greeter = ctx.get('greeter')
  console.log(greeter?.greet('maybe') ?? 'no greeter available')
}
```

## Nomenclatura

Los nombres de servicio viven en un único espacio de nombres plano por aplicación. Dar a los servicios propios un prefijo o un espacio de nombres distintivo (el harness reclama nombres simples como `tools` y `llm`); las regiones `cordis-surface` generadas en las [páginas de subsistemas](../subsystems/core.es.md) listan cada nombre que el harness registra.

Siguiente: [Eventos](04-events.es.md): comunicación sin un servicio compartido.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
