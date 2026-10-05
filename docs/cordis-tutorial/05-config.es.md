# 5. Configuración

[English](05-config.md) | Español

Cada entrada de `cordis.yml` puede portar un bloque `config`, y el plugin declara un schema que la valida antes de que `apply` se ejecute. Una configuración inválida hace fallar la carga con un error preciso: el plugin nunca arranca semiconfigurado.

## Un plugin configurable

Crear `config-demo.ts` en `tmp/cordis-tutorial`:

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'config-demo'

export interface Config {
  greeting: string
  targets: string[]
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
  targets: Schema.array(String).default(['world']),
})

export function apply(ctx: Context, config: Config) {
  for (const target of config.targets) {
    console.log(`${config.greeting}, ${target}!`)
  }
}
```

El `Config` exportado es a la vez una interfaz de TypeScript y un schema en runtime con el mismo nombre: los consumidores obtienen el tipo, Cordis obtiene el validador. Este repositorio usa [Schemastery](https://github.com/shigma/schemastery) para los schemas; el propio Cordis acepta cualquier validador de [Standard Schema](https://standardschema.dev/), así que un objeto plano exportado como `Config` no funcionará.

Configurarlo:

```yaml
- name: './config-demo.ts'
  config:
    targets: ['alpha', 'beta']
```

Ejecutar:

```
Hello, alpha!
Hello, beta!
```

Se omitió `greeting`, así que el valor por defecto del schema lo completó: `apply` siempre recibe configuración completa y validada.

## Fallar en voz alta

Ahora alimentarlo con algo inválido:

```yaml
- name: './config-demo.ts'
  config:
    targets: 'not-an-array'
```

```
ValidationError: invalid config:
  - $.targets expected array but got not-an-array (at targets)
```

El fiber del plugin pasa a FAILED, y el lanzador de este tutorial termina con estado 1 tras imprimir el error. Un plugin también debería rechazar, tan pronto como pueda resolver la referencia, una configuración válida según el schema que nombre un recurso o proveedor no disponible.

<a id="volatile-fields"></a>
## Campos volátiles

Usar `.volatile()` para un campo que el plugin lee durante cada operación. Un cambio en ese campo actualiza su referencia estable sin remontar el plugin. Leerlo con `.get()`:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import Schema from '@deepseek-ai/schemastery'

export const Config = Schema.object({
  greeting: Schema.string().default('Hello').volatile(),
})

export function apply(ctx: Context, config: ReturnType<typeof Config>) {
  ctx.on('loader/volatile-update', () => {
    console.log(config.greeting.get())
  })
}
```

Una llamada directa a `Config(raw)` también devuelve referencias. Un campo opcional sin valor por defecto sigue teniendo una referencia; `.get()` devuelve `undefined` cuando está ausente. Conservar la referencia, o capturar su valor para una operación, incluso a través de `await`. No retener ese valor para operaciones posteriores. Los valores de objeto y array son snapshots desconectados, congelados recursivamente, de datos planos; las funciones, las instancias de clase y los ciclos se rechazan.

Loader compara la configuración en bruto ignorando los campos volátiles declarados en el schema. Un cambio solo de campos volátiles se analiza a través del hook `internal/config` del plugin y se valida; cuando cada valor efectivo ordinario sigue coincidiendo, Loader confirma los nuevos valores en las referencias en ejecución y emite un único `loader/volatile-update` local a la instancia con las rutas cambiadas como arrays de claves, evitando el `internal/update` del plugin objetivo. Los valores iguales no notifican. Un candidato inválido se registra en el log y deja las referencias en ejecución sin cambios hasta la siguiente activación. Un valor efectivo ordinario cambiado, incluido el resultado de una expresión cambiada, y los cambios simultáneos de campos ordinarios conservan el flujo de actualización existente, dejando las referencias antiguas sin cambios y sin notificar. Group/Include siguen despachando las actualizaciones hijas. `fiber.update()` directo, el reemplazo de código y el reemplazo de dependencias conservan su ciclo de vida; `noSave` sigue controlando la persistencia de la actualización directa. Las notificaciones usan `emit` ordinario sin esperar la reconfiguración de recursos.

Declarar los campos volátiles en rutas de objeto fijas, o marcar un objeto o array completo como volátil. Las referencias independientes dentro de arrays, diccionarios, ramas de unión o intersección, schemas lazy, transforms u otro valor volátil se rechazan. Los archivos de configuración almacenan valores ordinarios; `simplify()` desenvuelve las referencias. Los schemas serializados conservan sus tipos de campo, valores por defecto, roles y marcador de volátil para los formularios dirigidos por schema. Los consumidores de configuración existentes siguen usando sus propias interfaces de configuración.

## Valores de configuración computados

El loader usado en este repositorio soporta una etiqueta `!!js` para valores de configuración que deben computarse en tiempo de carga:

```yaml
- name: './config-demo.ts'
  config:
    greeting: !!js process.env.DEMO_GREETING ?? 'Hello'
```

`!!js` funciona solo dentro de `config` y en el campo `disabled` de una entrada. `disabled: !!js ...` se evalúa contra el contexto del loader en cada decisión de montaje (extensión de este repositorio), así que una fila puede condicionarse a la plataforma o al entorno; los demás metadatos (`name`, `id`, `inject`, ...) permanecen estáticos, donde una expresión es un dato truthy ordinario. Véase [configuración del loader](../cordis-primer.es.md#loader-configuration).

Siguiente: [Composición y HMR](06-composition-and-hmr.es.md): tratar `cordis.yml` como la aplicación.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
