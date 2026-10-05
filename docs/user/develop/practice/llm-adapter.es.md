# Adaptadores LLM

[English](llm-adapter.md) | Español

Esta guía conecta un nuevo proveedor de LLM (modelo de lenguaje grande) a Harness.

## Visión general

Un adaptador LLM extiende `LlmAdapter` e implementa `stream()`, traduciendo la solicitud agnóstica de proveedor de Harness en una llamada a la API del proveedor y traduciendo la respuesta de vuelta a fragmentos de Harness.

## Implementación mínima

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { LlmAdapter, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'

class MyAdapter extends LlmAdapter {
  private apiKey: string

  constructor(apiKey: string) {
    super()
    this.apiKey = apiKey
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    // 1. Convert options.messages to the provider format.
    // 2. Call the streaming API.
    // 3. Convert the response into StreamChunk values.
  }
}

export interface Config {
  apiKey: string
  providers: string[]
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().required(),
  providers: Schema.array(Schema.string()).required(),
})

export const name = 'my-llm-adapter'
export const inject = ['llm']

export function apply(ctx: Context, config: Config) {
  const adapter = new MyAdapter(config.apiKey)
  ctx.llm.registerAdapter(config.providers, adapter)
}
```

## Protocolo StreamChunk

`stream()` emite fragmentos usando este protocolo:

```ts
import { brandString } from '@deepseek-ai/dsh-brand'
import type { StreamChunk, ToolCallId } from '@deepseek-ai/dsh-llm'

async function* exampleChunks(): AsyncIterable<StreamChunk> {
  // 1. Start each content block with block-start.
  yield { type: 'block-start', index: 0, blockType: 'text' }

  // 2. Stream text through text-delta.
  yield { type: 'text-delta', index: 0, text: 'Hello' }
  yield { type: 'text-delta', index: 0, text: ' world' }

  // 3. End each content block with block-end and the complete block.
  yield {
    type: 'block-end',
    index: 0,
    block: { type: 'text', text: 'Hello world' },
  }

  // 4. Tool-call block.
  yield { type: 'block-start', index: 1, blockType: 'tool-call' }
  yield {
    type: 'tool-call-delta',
    index: 1,
    id: brandString<ToolCallId>('call-123'),
    name: 'bash',
    argumentsDelta: '{"command":"ls"}',
  }
  yield {
    type: 'block-end',
    index: 1,
    block: {
      type: 'tool-call',
      id: brandString<ToolCallId>('call-123'),
      name: 'bash',
      arguments: '{"command":"ls"}',
    },
  }

  // 5. Token usage.
  yield { type: 'usage', usage: { inputTokens: 100, outputTokens: 50 } }

  // 6. Finish reason.
  yield { type: 'finish', reason: { kind: 'stop' } }
  // Alternatively, { kind: 'tool-calls' } requests tool execution.
}
```

### Reglas clave

- Cada `block-start` tiene su `block-end` correspondiente.
- `index` aumenta desde 0 e identifica el orden de los bloques de contenido.
- Un `tool-call-delta` transporta texto JSON sin procesar en `argumentsDelta`, ya sea de una vez o repartido en varios fragmentos.
- `finish` es el fragmento final.
- Emitir `usage` antes de `finish`.

## GenerateOptions

`stream()` recibe el tipo exportado `GenerateOptions`. Incluye el modelo, el id de intensidad de razonamiento (reasoning) propio del adaptador, el historial de conversación, el prompt del sistema, los schemas de tools, los parámetros de generación, las secuencias de parada y la señal de cancelación; considerar autoritativo el tipo TypeScript exportado por `@deepseek-ai/dsh-llm`. Mapear los campos soportados a la API del proveedor. Si el proveedor no puede cumplir un campo, lanzar `LlmError` con un código estable en lugar de descartarlo silenciosamente.

Sobrescribir `resolveModel(provider, model, signal?)` para devolver la identidad exacta de proveedor/modelo más los metadatos opcionales `context` y `reasoning` en una sola consulta. Los metadatos de razonamiento contienen ids opacos ordenados y nombres visibles, además de un valor por defecto configurado opcional; conservar la lista seleccionable autoritativa del adaptador, incluido `off` cuando la API de capacidad ascendente lo devuelve, en lugar de promover esos valores a un enum del núcleo. Respetar la señal opcional de la consulta asíncrona para que la cancelación y el dispose (liberación de recursos) alcancen la quiescencia. El servicio valida el agregado y rechaza los esfuerzos explícitos no soportados antes de `stream()`; omitir `reasoning` significa que ese modelo no tiene capacidad seleccionable de intensidad de razonamiento.

## Registrar un adaptador

```ts ignore-check
ctx.llm.registerAdapter(['my-provider'], adapter)
```

El primer argumento enumera las rutas de proveedor que gestiona el adaptador. `GenerateOptions.provider` selecciona el adaptador registrado, mientras que `GenerateOptions.model` pasa un id de modelo propio del adaptador sin registro de ciclo de vida. Sobrescribir `listModels()` cuando el adaptador pueda anunciar opciones de modelos a los selectores.

## Usarlo desde cordis.yml

```yaml
- id: my-llm
  name: './src/my-llm-adapter.ts'
  config:
    apiKey: !!js process.env.MY_API_KEY
    providers:
      - my-provider

- id: agent-loop
  name: '@deepseek-ai/dsh-agent-loop'
  config:
    agents:
      - id: main
        provider: my-provider
        model: my-model-v1
```

## Implementaciones de referencia

El repositorio contiene implementaciones completas:

- `packages/llm/llm-pi-ai/`: el adaptador multiproveedor (Anthropic, OpenAI, Kimi, GLM y puertas de enlace personalizadas)
- `packages/test-support/llm-replay/`: el adaptador de reproducción determinista que usan los tests

Comparar ambos para ver el mismo contrato del harness implementado como ruta multiproveedor en vivo y como fixture grabado.

## Manejo de errores

Los adaptadores lanzan los fallos de transporte y de protocolo como valores `LlmError` con códigos estables. El agent loop (bucle de agent) conserva el error y el código para diagnóstico y política; no convierte un `Error` ordinario automáticamente. Además, cada solicitud HTTP al proveedor debe fusionar `attributionHeaders()` y reenviar `options.signal`.

```ts
import {
  attributionHeaders,
  LlmAdapter,
  LlmError,
  type GenerateOptions,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'

class HttpAdapter extends LlmAdapter {
  constructor(private readonly endpoint: string) {
    super()
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...attributionHeaders(),
      },
      body: JSON.stringify({ model: options.model, messages: options.messages }),
      ...options.signal ? { signal: options.signal } : {},
    })
    if (!response.ok) {
      throw new LlmError(`Provider API error: ${response.status}`, 'PROVIDER_HTTP_ERROR')
    }
    // A real adapter parses the response and emits the complete chunk sequence.
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}
```
