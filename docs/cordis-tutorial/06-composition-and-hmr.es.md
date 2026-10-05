# 6. Composición y HMR

[English](06-composition-and-hmr.md) | Español

Cada capacidad construida hasta ahora es un plugin, y `cordis.yml` selecciona el árbol de plugins de la aplicación. Este capítulo cambia esa composición, recarga un plugin en caliente y diagnostica un plugin que nunca carga.

## Las entradas son más que un nombre

Una entrada de configuración acepta metadatos más allá de `name` y `config`:

```yaml
- id: greeter          # stable identity for this entry
  name: './greeter.ts'
- id: consumer
  name: './consumer.ts'
  disabled: true       # keep the entry, skip mounting it
```

`id` da a la entrada una identidad estable para que el loader pueda distinguir una edición de una entrada existente de una eliminación más una adición. `disabled: true` desmonta un plugin sin borrar su entrada: al volver a activarlo, el plugin (y todo lo PENDING sobre sus servicios) carga de nuevo.

Los grupos anidan una sublista de entradas que cargan y descargan como una unidad, e `isolate` da a un grupo su propia instancia de un nombre de servicio: dos grupos pueden ver cada uno un proveedor de `shell` configurado de forma distinta sin afectarse mutuamente. La [introducción a Cordis](../cordis-primer.es.md) y el [ejemplo de aislamiento de servicios](../user/develop/framework/service.es.md#service-isolation) cubren los detalles.

## Reemplazo de módulos en caliente

Como la descarga libera los efectos ([capítulo 2](02-lifecycle-and-effects.es.md)) y la carga sigue las dependencias ([capítulo 3](03-services.es.md)), HMR (reemplazo de módulos en caliente) puede reemplazar un plugin en ejecución descargándolo y cargándolo. El plugin `@deepseek-ai/dsh-hmr` vigila tus archivos y hace exactamente eso al guardar.

En `tmp/cordis-tutorial`, escribir `cordis.yml`:

```yaml
- id: logger
  name: '@deepseek-ai/cordis-plugin-logger-console'
- id: timer
  name: '@deepseek-ai/cordis-plugin-timer'
- id: hmr
  name: '@deepseek-ai/dsh-hmr'
  config:
    root: ['.']
- id: hello
  name: './hello.ts'
```

Dos plugins de soporte se unieron a la lista: HMR registra a través del servicio logger de Cordis, así que sin un exportador de consola no se verían sus mensajes, e inyecta el servicio `timer` para el debouncing; sin `@deepseek-ai/cordis-plugin-timer` se queda en PENDING para siempre, en silencio. Ese silencio es el tema de la siguiente sección.

HMR lee las tripas del loader de Node a través del auxiliar nativo del Loader. Ejecutar Cordis bajo tsx:

```sh
node --import tsx ../../vendor/cordis/bin.js
```

Ahora editar `hello.ts` (cambiar el mensaje de log) y guardar:

```
hello from my first plugin
2026-07-22 15:44:36 [I] hmr watching [ '.' ]
2026-07-22 15:44:39 [I] hmr reload plugin at hello.ts
hello from my EDITED plugin
```

La instancia antigua se descargó (todos sus efectos desenrollados), el código nuevo cargó, `apply` se ejecutó de nuevo. Detener el proceso con Ctrl-C. Editar el propio `cordis.yml` también se detecta: el loader compara las entradas por `id` y monta, desmonta o reconfigura solo lo que cambió. Por eso las entradas de arriba llevan `id` explícitos: una entrada sin él recibe un id generado en cada lectura, así que tras cualquier edición del archivo de configuración cuenta como eliminada-más-añadida y se remonta aunque sus propias líneas no hayan cambiado.

## Diagnóstico de un plugin que nunca carga

La otra cara de la carga dirigida por dependencias: un plugin cuyo `inject` nombra un servicio que nadie provee espera para siempre, sin imprimir nada. Sin error: PENDING es un estado legítimo, ya que el proveedor puede montarse más tarde.

Los estados se pueden ver directamente. Todo contexto puede enumerar el registry de plugins; crear `diagnose.ts`:

```ts
import { FiberState, type Context } from '@deepseek-ai/cordis'

export const name = 'diagnose'

export function apply(ctx: Context) {
  setTimeout(() => {
    for (const runtime of ctx.registry.values()) {
      for (const fiber of runtime.fibers) {
        if (fiber.state === FiberState.PENDING) {
          console.log(`${fiber.name} is PENDING — a required service is missing`)
        }
      }
    }
  }, 500)
}
```

Y un plugin con una dependencia insatisfacible, `needs-timer.ts`:

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'needs-timer'
export const inject = ['timer']

export function apply(ctx: Context) {
  console.log('needs-timer loaded')
}
```

```yaml
- name: './needs-timer.ts'
- name: './diagnose.ts'
```

Ejecutarlo (simplemente `node --import tsx ../../vendor/cordis/bin.js`; detener con Ctrl-C):

```
needs-timer is PENDING — a required service is missing
```

`inject: ['timer']` no tiene proveedor. Añadir `- name: '@deepseek-ai/cordis-plugin-timer'` a la lista y el plugin carga. Cuando un plugin no hace nada y no reporta nada, inspeccionar el estado de su fiber. Iterar sin el filtro de PENDING también muestra los propios plugins del loader (Loader, Include) como fibers ACTIVE, porque los plugins montan el propio archivo de configuración.

Siguiente: [Dentro del harness](07-into-the-harness.es.md): los mismos patrones contra servicios reales del harness.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
