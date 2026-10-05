# 1. Tu primer plugin

[English](01-first-plugin.md) | Español

En la configuración de loader usada aquí, un módulo de plugin de Cordis exporta con nombre una función `apply`. Cuando Cordis lo carga, llama a `apply` con un **contexto**: el objeto `ctx` a través del cual el plugin registra todo lo que contribuye.

## Escribir el plugin

En el directorio `tmp/cordis-tutorial` (véase [preparación](index.es.md#setup)), crear `hello.ts`:

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello'

export function apply(ctx: Context) {
  console.log('hello from my first plugin')
}
```

La exportación `name` es metadato visible opcional; etiqueta al plugin en los diagnósticos.

## Componer la aplicación

El lanzador de este tutorial ensambla la aplicación a partir de configuración. Crear `cordis.yml`:

```yaml
- name: './hello.ts'
```

El archivo es una lista de entradas de plugin. `name` es un especificador de módulo (una ruta relativa o un nombre de paquete npm) y el loader monta cada entrada. Las entradas arrancan concurrentemente, así que la posición en la lista no garantiza nada sobre qué plugin carga primero; el orden proviene de las dependencias de servicios (`inject`, [capítulo 3](03-services.es.md)), no de la posición en el archivo.

## Ejecutarlo

```sh
node --import tsx ../../vendor/cordis/bin.js
```

Salida esperada:

```
hello from my first plugin
```

El proceso termina por sí solo cuando no queda nada en ejecución. Qué ha ocurrido:

1. El lanzador creó un `Context` raíz y montó el plugin **Loader**.
2. El Loader leyó `cordis.yml`, resolvió `./hello.ts` y lo montó como plugin hijo.
3. Cordis llamó a tu `apply(ctx)`.

No hay código de arranque del framework en tu archivo: un plugin describe lo que contribuye, y `cordis.yml` compone la aplicación. La [base de `dsh`](../../packages/bundle/base/cordis.patch.yml), por ejemplo, es una composición de plugins más larga que los overlays de despliegue parchean.

## Las otras dos formas de plugin

Una función es la forma más común, pero Cordis acepta tres:

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

// 1. Function plugin (what you just wrote).
export function apply(ctx: Context) {}

// 2. Object plugin: an object with an `apply` method.
export const objectPlugin = {
  name: 'object-plugin',
  apply(ctx: Context) {},
}

// 3. Class plugin: a Service subclass (covered in chapter 3).
export class MyService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'myTutorialService')
  }
}
```

Usar la forma de función hasta necesitar exponer un servicio; el [capítulo 3](03-services.es.md) cubre cuándo la forma de clase se gana su lugar.

## Probar a romperlo

Hacer que `apply` lance un error:

```ts ignore-check
export function apply(ctx: Context) {
  throw new Error('apply exploded')
}
```

Ejecutar de nuevo: el proceso muere con tu error. Un plugin que no logra cargar es un fallo ruidoso, no una entrada omitida.

Una advertencia que conviene conocer pronto: una entrada de configuración cuyo módulo no se puede **resolver** (una ruta o un nombre de paquete con un error de tecleo) se reporta a través del servicio logger de Cordis en lugar de hacer caer el proceso, y en el arranque ese reporte puede perderse antes de que un exportador de consola esté escuchando. Si una entrada recién añadida parece no hacer nada, comprobar primero la ortografía.

Siguiente: [Ciclo de vida y efectos](02-lifecycle-and-effects.es.md): qué ocurre cuando un plugin se descarga.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
