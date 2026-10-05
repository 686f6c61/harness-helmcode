# Construir un tool

[English](tool.md) | Español

Este tutorial añade un tool `greet` a la UI Web. Completar primero [Tu primer plugin](./index.es.md) y conservar su directorio `scratch-plugin`.

## Crear el plugin del tool

Sustituir `scratch-plugin/src/my-plugin.ts` por:

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet someone by name.',
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))
}
```

`inject` hace que Cordis espere al registry de tools. `defineTool` infiere y valida `args` a partir de `parameters`; `execute` devuelve el valor canónico declarado por `output.schema`, y `output.render` convierte ese valor en contenido de cara al modelo.

## Ejecutar y llamar el tool

Reiniciar el comando de desarrollo si no está en ejecución:

```sh
pnpm dsh web --patch ./scratch-plugin/cordis.yml
```

Abrir `http://127.0.0.1:3080` y pedir: `Use the greet tool to greet Ada.` El modelo puede llamar a `greet` y recibe `Hello, Ada!` como resultado de tool.

## Próximos pasos

- [Configuración de plugins](./config.es.md): hacer configurable el saludo.
- [Referencia de creación de tools](../../../cookbook/adding-a-tool.es.md): consultar schemas anidados, valores canónicos, trabajo en segundo plano, hooks de política, modo PTC y tarjetas de UI.
- [Estratificación de capacidades](../practice/index.es.md): dividir una capacidad reemplazable en paquetes Service Definition, Service Provider y Consumer.
