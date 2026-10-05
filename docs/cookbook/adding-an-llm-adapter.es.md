# Manual de referencia: añadir un adaptador de LLM

[English](adding-an-llm-adapter.md) | Español

Cómo conectar un nuevo proveedor de modelos. Implementaciones de referencia: `packages/llm/llm-pi-ai` (el adaptador multiproveedor distribuido) y `packages/test-support/llm-replay` (el adaptador de reproducción determinista que usan los tests). Leer primero la documentación de `StreamChunk` en `packages/llm/llm/src/types.ts`: registra las convenciones de protocolo contra las que se verificaron los adaptadores.

## La forma

```ts ignore-check
class MyAdapter extends LlmAdapter {
  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> { … }
}

export const name = 'llm-myprovider'
export const inject = ['llm']
export const Config: z<Config> = z.object({ apiKey: z.string(), … })

export function apply(ctx: Context, config: Config) {
  ctx.llm.registerAdapter(['my-provider'], new MyAdapter(…))
}
```

El registro se basa en effects (seguro para HMR (reemplazo de módulos en caliente)); un adaptador por ruta de proveedor: los duplicados lanzan, y el registro multi-ruta es todo o nada. `options.provider` selecciona el adaptador y `options.model` es el id de modelo del proveedor, así que un adaptador de catálogo dinámico puede servir modelos nuevos sin reconfiguración del ciclo de vida. Los secretos son nativos de cordis: Config de schemastery con fallbacks de entorno, alimentada desde cordis.yml vía `!!js process.env.MY_KEY`. Nunca leer archivos de claves ad hoc en código.

## Obligaciones de protocolo (el contrato que dos implementaciones verificaron)

- Emitir `usage` ANTES de `finish`; no emitir NADA después de `finish`. La forma robusta: mantener en búfer finish/usage hasta el marcador de fin de flujo del proveedor, y luego vaciar (maneja proveedores que envían fragmentos finales de solo usage).
- Los `arguments` de llamadas a tool son cadenas JSON CRUDAS de extremo a extremo; emitir los fragmentos del flujo como `argumentsDelta`. Si tu proveedor devuelve objetos ya analizados, re-serializar en `block-end`.
- Asignar los `index` de bloque en el orden de primera aparición en el flujo; reutilizar el índice para cada delta del mismo bloque.
- Los errores tienen exactamente dos rutas sancionadas: LANZAR desde `stream()` (fallos de transporte y de protocolo: usar `LlmError` con un código estable), o terminar el flujo con `finish {kind: 'error' | 'aborted'}` (fallos in-band del proveedor). Los consumidores manejan ambas; elegir por clase de fallo y documentarlo.
- Respetar `options.signal` (pasarlo a fetch / a tu SDK).
- Un campo de `GenerateOptions` que tu proveedor no pueda respetar (p. ej. una lista `stop` en un proveedor sin secuencias de stop): lanzar `LlmError(..., 'UNSUPPORTED_OPTION')` en lugar de descartarlo silenciosamente.
- Si el proveedor requiere ids de respuesta, firmas u otros metadatos nativos en llamadas posteriores, emitir la proyección mínima de JSON sin pérdidas como `finish.replayState`. Validarla al reconstruir el historial. `LlmRuntime` la pasa solo cuando la ruta de proveedor histórica y la ruta de proveedor objetivo están actualmente poseídas por exactamente la misma instancia de adaptador; tu adaptador decide si la restauración al mismo modelo, entre modelos o entre proveedores es legal. Nunca inferir reproducción nativa a partir de solo nombres de proveedor/modelo cuando el estado está ausente.

Los conmutadores de modo de pensamiento específicos del proveedor permanecen en la Config del adaptador. Los metadatos exactos de modelo usan un único capability seam agnóstico de proveedor: implementar `resolveModel()` con identidad de proveedor/modelo y los campos opcionales `context` y `reasoning`, declarar un `defaultEffort` configurado solo cuando exista, y respetar el `AbortSignal` opcional del resolvedor. Las intensidades de razonamiento son ids opacos ordenados que el adaptador mapea a solicitudes del proveedor. Preservar la lista seleccionable autoritativa del adaptador, incluido un `off` definido por el adaptador cuando esté soportado, sin exponer las grafías finales de cable ni recortar valores no soportados; un id no tiene por qué igualar su representación de cable.

## Estructura de implementación

Mantener los tipos de cable, la serialización de solicitudes, el análisis de transporte, la traducción de fragmentos y la clase adaptadora como responsabilidades separadas; [`llm-pi-ai`](../../packages/llm/llm-pi-ai/README.md) es el layout de referencia.

## Verificación

Seguir la [política de testing del repositorio](../testing.es.md), que posee la cobertura de adaptadores, las comprobaciones contra proveedores reales y los requisitos de entradas publicadas.
