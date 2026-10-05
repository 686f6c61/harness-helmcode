# 7. Dentro del harness

[English](07-into-the-harness.md) | Español

Este capítulo registra un tool invocable por el modelo en el servicio `tools` del harness, lo ejecuta a través del pipeline de tools del harness y observa el evento de resultado. Sigue sin necesitar clave y no llama a ningún modelo.

## Un plugin de tool

Crear `greet-tool.ts` en `tmp/cordis-tutorial`:

```ts
import type { Context } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet the named person.',
    parameters: {
      name: { type: 'string', required: true, description: 'Who to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))

  // Drive one call through the real execution pipeline, standing in for
  // the model. ToolCallId brands the correlation id a provider would issue.
  void (async () => {
    const result = await ctx.tools.execute({
      callId: brandString<ToolCallId>('demo-1'),
      name: 'greet',
      arguments: { name: 'Cordis' },
      signal: new AbortController().signal,
    })
    console.log('tool replied:', JSON.stringify(result.content))
  })()
}
```

Todos los patrones aquí son de capítulos anteriores: `inject: ['tools']` ([capítulo 3](03-services.es.md)) retiene al plugin hasta que el registry de tools existe; `ctx.tools.register(...)` adjunta el disposer del registro al plugin ([capítulo 2](02-lifecycle-and-effects.es.md)), así que la descarga desregistra el tool. `defineTool` convierte la especificación de `parameters` en el JSON Schema mostrado al modelo, infiere el tipo de `args` y valida los argumentos suministrados por el modelo antes de que `execute` se ejecute. El tool devuelve el valor canónico declarado por `output.schema`; `output.render` produce por separado el contenido de resultado Native y duradero.

## Un plugin observador

Crear `tool-logger.ts`: un plugin separado que vigila cada llamada a tool de la aplicación a través del evento `tools/result` del harness:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'

export const name = 'tool-logger'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.on('tools/result', (exec, result) => {
    const text = result.content
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('')
    console.log(`[tool-logger] ${exec.name} -> ${text}`)
  })
}
```

La línea `import type {} from '@deepseek-ai/dsh-tools'` trae las fusiones de declaraciones del paquete para que `'tools/result'` y su payload estén tipados: el mismo movimiento que el import de `stats.ts` del capítulo 4, a escala de paquete.

## Componer y ejecutar

```yaml
- name: '@deepseek-ai/dsh-system-prompt'
- name: '@deepseek-ai/dsh-tools'
- name: './tool-logger.ts'
- name: './greet-tool.ts'
```

`@deepseek-ai/dsh-tools` inyecta el servicio `systemPrompt` porque los tools contribuyen schemas al prompt del sistema, así que la composición también lista a su proveedor. Sin él, el plugin de tools permanece PENDING como se describe en el [capítulo 6](06-composition-and-hmr.es.md).

```sh
node --import tsx ../../vendor/cordis/bin.js
```

```
[tool-logger] greet -> Hello, Cordis!
tool replied: [{"type":"text","text":"Hello, Cordis!"}]
```

El logger se disparó primero: `tools/result` se emite como parte de la materialización del resultado, antes de que la promesa de `execute` se resuelva para el llamante. Ninguno de tus plugins sabe que el otro existe: el servicio registry y el evento los conectan.

## De aquí a un agent completo

Un agent (agente) real es esta composición más otros plugins: un adaptador de LLM (modelo de lenguaje grande), el agent loop (bucle de agent), la persistencia y una entrada de aplicación. Comparar la [capa de perfil base](../../packages/bundle/base/cordis.patch.yml) y la [capa headless](../../packages/bundle/headless/cordis.patch.yml): ya puedes leer sus entradas. Añadir tu `greet-tool.ts` mediante un pequeño overlay `--patch`.

Adónde ir después:

- [Construir un tool](../user/develop/basic/tool.es.md): más sobre `defineTool`, incluida la presentación y schemas más ricos.
- [Diseño de capacidades en tres capas](../user/develop/practice/index.es.md): cómo el harness estructura las capacidades reemplazables.
- Las regiones `cordis-surface` generadas en las [páginas de subsistemas](../subsystems/core.es.md): todo lo que se puede inyectar y escuchar, cada cosa en su página correspondiente.
- [Arquitectura](../architecture.es.md): el mapa del sistema en el que viven estos plugins.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
