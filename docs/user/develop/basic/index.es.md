# Tu primer plugin

[English](index.md) | Español

Este tutorial crea un plugin mínimo de Harness y lo carga en la UI Web. Partir de un checkout del repositorio que haya completado el [camino de ejecución desde el código fuente](../../../../README.en.md).

## Crear un proyecto local

Desde la raíz del repositorio, crear un proyecto temporal para el tutorial:

```sh
mkdir -p scratch-plugin/src
```

## ¿Qué es un plugin?

En Harness, un plugin es un módulo de TypeScript que exporta una función `apply`. El framework llama a `apply` al cargar el plugin y le pasa un objeto de contexto `ctx` a través del cual el plugin registra capacidades:

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'my-plugin'

export function apply(ctx: Context) {
  // Register capabilities here.
}
```

Esa es la configuración completa.

## Crear el archivo del plugin

Crear `scratch-plugin/src/my-plugin.ts`:

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello-plugin'

export function apply(ctx: Context) {
  // Required dependencies are ready before apply runs.
  console.log('[hello-plugin] plugin loaded!')
}
```

## Registrarlo en cordis.yml

Ejecutar `pwd` desde la raíz del repositorio y luego crear `scratch-plugin/cordis.yml` como un overlay Web que inserta el plugin local. Sustituir `/absolute/path/to/deepseek-harness` de abajo por la ruta impresa:

```yaml
- insert:
    - id: hello
      name: '/absolute/path/to/deepseek-harness/scratch-plugin/src/my-plugin.ts'
```

La ruta del plugin debe ser absoluta. Un archivo patch aporta configuración pero no cambia el directorio de perfil desde el que el loader resuelve las rutas de módulos.

Arrancar la UI Web con ese overlay:

```sh
pnpm dsh web --patch ./scratch-plugin/cordis.yml
```

Abrir `http://127.0.0.1:3080`. El terminal imprime `[hello-plugin] plugin loaded!` durante el arranque.

## Limpieza automática

Todo lo registrado a través de `ctx` (listeners de eventos, tools o temporizadores) se limpia cuando el plugin se descarga. No hace falta llamar a removeListener ni a clearInterval manualmente.

Para un recurso que necesita limpieza explícita, como una conexión de red, usar `ctx.effect()` para proveer su disposer:

```ts
import type { Context } from '@deepseek-ai/cordis'

export function apply(ctx: Context) {
  ctx.effect(() => {
    const timer = setInterval(() => {
      console.log('heartbeat')
    }, 5000)

    // The returned function runs when the plugin unloads.
    return () => clearInterval(timer)
  })
}
```

## Declarar dependencias

Si el plugin consume otro servicio como `tools` o `llm`, declararlo en `inject`:

```ts ignore-check
import type { Context } from '@deepseek-ai/cordis'

export const name = 'my-tool-plugin'
export const inject = ['tools']

export function apply(ctx: Context) {
  // ctx.tools is ready here.
  ctx.tools.register(/* ... */)
}
```

El framework espera a cada servicio requerido antes de cargar el plugin.

## Tres formas de plugin

Además de un módulo de función, un plugin puede usar la forma de objeto o la forma de clase.

### Forma de objeto

```ts
import type { Context } from '@deepseek-ai/cordis'

export default {
  name: 'my-plugin',
  inject: ['tools'],
  apply(ctx: Context) {
    // ...
  },
}
```

### Forma de clase

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

export default class MyService extends Service {
  static inject = ['tools']

  constructor(ctx: Context) {
    super(ctx, 'myService')
    // Perform synchronous initialization in the constructor.
  }
}
```

La forma de función es suficiente en la mayoría de los casos. Usar la forma de clase cuando el plugin provee un servicio a otros plugins; véase [servicios y dependencias](../framework/service.es.md).

## Próximos pasos

- [Construir un tool](./tool.es.md): aprender el DSL de definición de tools
- [Configuración de plugins](./config.es.md): aceptar configuración del usuario
- [Tutorial de Cordis](../../../cordis-tutorial/index.es.md): el framework de plugins subyacente, construido desde un directorio temporal sin clave de API
