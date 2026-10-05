# Diseño de capacidades de tres roles

[English](index.md) | Español

Esta página tiene dos partes: una referencia conceptual del patrón de capacidad de tres roles, seguida de un tutorial avanzado que construye una capacidad. Completar primero la [ruta básica de plugins](../basic/index.es.md) y el [tutorial de servicios](../framework/service.es.md).

## Referencia conceptual

Cuando una capacidad es lo bastante general como para necesitar proveedores reemplazables, como la ejecución de Bash, Harness separa tres roles: una **Service Definition**, un **Service Provider** y un **Consumer**. Colocar los roles en paquetes separados cuando necesiten evolucionar o ser reemplazados de forma independiente; en caso contrario, un paquete puede poseer más de un rol. La capacidad completa es su seam. Ningún rol aislado es un seam.

## Ejemplo de Bash

La capacidad de ejecución de Bash consta de:

- **Service Definition** (`dsh-shell`): define el servicio de Cordis y los tipos de solicitud y resultado de Bash
- **Service Provider** (`dsh-bash-local`): ejecuta comandos en la máquina local
- **Consumer** (`dsh-tool-bash`): expone la capacidad como una tool invocable por el modelo

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  dsh-shell   │────▶│  dsh-bash-local  │     │ dsh-tool-bash│
│(definition) │     │    (provider)     │     │(consumer/tool)│
└─────────────┘     └──────────────────┘     └──────────────┘
       ▲                                            │
       └────────────────────────────────────────────┘
                    inject: ['shell']
```

## Ventajas de la separación

### Reemplazar proveedores

Una Service Definition puede tener varios proveedores seleccionados a través de `cordis.yml`:

```yaml
# Local execution
- name: '@deepseek-ai/dsh-bash-local'

# Replace this row with another package that provides the same service.
```

La Service Definition y la tool permanecen sin cambios mientras el proveedor cambia.

### Evolucionar de forma independiente

- La Service Definition cambia raramente una vez que los llamantes dependen de su contrato.
- Los Service Providers pueden mejorar el rendimiento y la seguridad de forma independiente.
- Los Consumers pueden cambiar cómo presentan la capacidad al modelo.

### Desacoplar dependencias

- El Service Provider depende de la Service Definition.
- El Consumer depende de la Service Definition.
- El Service Provider y el Consumer **no dependen el uno del otro**.

La [referencia de capability seam](../../../capability-seams.es.md) posee las familias integradas actuales y los enlaces a paquetes.

## Tutorial: desarrollar una capacidad de tres roles

### Paso 1: escribir la Service Definition

```ts ignore-check
// packages/my-cap/my-cap/src/index.ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    myCap: MyCapService
  }
}

export abstract class MyCapService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'myCap')
  }

  /** Execute the capability. */
  abstract execute(request: MyCapRequest): Promise<MyCapResult>
}

export interface MyCapRequest {
  input: string
}

export interface MyCapResult {
  output: string
}
```

### Paso 2: escribir un Service Provider

```ts ignore-check
// packages/my-cap/my-cap-local/src/index.ts
import type { Context } from '@deepseek-ai/cordis'
import { MyCapService, type MyCapRequest, type MyCapResult } from '@deepseek-ai/dsh-my-cap'

class MyCapLocal extends MyCapService {
  async execute(request: MyCapRequest): Promise<MyCapResult> {
    // Local provider behavior.
    return { output: request.input.toUpperCase() }
  }
}

export const name = 'my-cap-local'

export function apply(ctx: Context) {
  ctx.plugin(MyCapLocal)
}
```

### Paso 3: escribir un consumidor

```ts ignore-check
// packages/my-cap/tool-my-cap/src/index.ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'tool-my-cap'
export const inject = ['tools', 'myCap']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'my_cap',
    description: 'Execute my capability.',
    parameters: {
      input: { type: 'string', required: true },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const result = await ctx.myCap.execute({ input: args.input })
      return result.output
    },
  }))
}
```

### Componerlos en cordis.yml

```yaml
- name: '@deepseek-ai/dsh-my-cap-local'
- name: '@deepseek-ai/dsh-tool-my-cap'
```

## Puntos de diseño

- **No dividir preventivamente**: usar paquetes separados solo cuando los roles necesiten evolucionar de forma independiente. Un plugin de tool simple no lo necesita.
- **La Service Definition posee los tipos Request/Result**: los Service Providers y los Consumers dependen únicamente del paquete de la Service Definition.
- **Explícito > implícito**: resolver los valores por defecto en un paso explícito `resolve(request): Spec` en lugar de ocultar expresiones `?? default` dentro de `run()`.

## Próximos pasos

- [Adaptador LLM](./llm-adapter.es.md): implementar un proveedor de LLM
