# Manual de referencia: formas de plugins de extensión

[English](extension-cookbook.md) | Español

Patrones de referencia para extensiones del harness. Los fragmentos omiten imports e implementaciones auxiliares y no están completos para copiar y pegar. Para rutas de autoría concretas, véanse la [lista de verificación de paquetes](adding-a-package.es.md), el [tutorial de primera tool](../user/develop/basic/tool.es.md), la [referencia de tools](adding-a-tool.es.md), la [guía de adaptadores de LLM (modelo de lenguaje grande)](adding-an-llm-adapter.es.md) y el [tutorial de versiones del formato de Session](adding-a-session-format-version.es.md); la [arquitectura](../architecture.es.md) posee el mapa del sistema y de puntos de extensión.

## Un plugin de tool

Una tool se registra en `ctx.tools`. El ejemplo anotado de `defineTool` (argumentos de `execute` tipados, construcción del resultado, el patrón `run_in_background`) vive en [adding-a-tool.md](adding-a-tool.es.md): esa guía es la fuente de verdad para las definiciones de tools. Los `ToolDefinition` de JSON Schema crudo también los acepta `ctx.tools.register()` directamente (así llegan las tools originadas en MCP); `defineTool` es el helper tipado para tools de primera parte.

<a id="a-hook-plugin-permission-gate-example"></a>

## Un plugin de hook (ejemplo de puerta de permisos)

Esta puerta de permisos es un ejemplo de plugin de hook. Devuelve una decisión tipada desde la puerta `tools/pre-execute` para permitir o denegar una llamada; los plugins de sandbox, permisos y modo plan pueden usar este punto de extensión. Los plugins de hook pueden interceptar otros puntos de extensión y no son inherentemente puertas de permisos. Un «hook nativo» es un plugin ordinario de Cordis sobre un punto de interceptación; no necesita ningún protocolo externo.

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'

declare function isAllowed(exec: ToolExecution): Promise<boolean>

export const name = 'permission-gate'

export function apply(ctx: Context) {
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    if (!(await isAllowed(exec))) {
      return { kind: 'deny', reason: 'Denied by policy.' }
    }
    return next()
  })
}
```

Este waterfall (eventos en cascada) es la capa de política reordenable. Usar `ctx.tools.guard()` cuando un invariante necesita una denegación final monótona, `tools/execute` cuando un plugin debe envolver el ciclo de vida del despacho (timeouts/reintentos/métricas; solo `exec.signal` es reemplazable), `tools/post-execute` para transformación explícita del resultado, y `tools/result` para observación contenida del resultado final inmutable. La [guía adding-a-tool](adding-a-tool.es.md#execution-policy-and-observation) da la regla de selección.

## Un plugin de UI

Un plugin de UI combina registros duraderos `session/event` (asentamientos de Assistant, límites de turno/paso y actividad de tools) con frames transitorios `agent/assistant-stream` para la presentación de tokens en vivo, e introduce entrada de vuelta vía `agent.followup()` / `agent.steer()`. Un plugin de navegador que contribuye una fila de negocio al Web Client incorporado registra en su lugar una `ConversationNodeDefinition` y un renderer de Chat con clave; seguir la [referencia del subsistema Conversation](../subsystems/conversation.es.md).

```ts
import type { Context } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'

declare function render(text: string): void
declare function onUserInput(handler: (text: string) => void): void

export const name = 'my-ui'
export const inject = ['agents']

export function apply(ctx: Context) {
  ctx.on('agent/assistant-stream', ({ frame }) => {
    if (frame.type === 'chunk' && frame.chunk.type === 'text-delta') {
      render(frame.chunk.text)
    }
  })
  onUserInput(text => ctx.agents.get(brandString<SessionId>('client-session'))?.followup(createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  })))
}
```

## Un driver de protocolo externo

Un *driver de protocolo* adapta un par de cable a `ctx.agents`; puede servir a una UI o a un cliente de automatización. Un driver stdio posee stdout, crea o reanuda agents (agentes) a través de la factory, y mapea solicitudes de protocolo a `followup()` o `cancel()`. Una solicitud de prompt de bajo nivel devuelve su recibo duradero de encolado; no adquiere un resultado correlacionando `MessageId` con `turn/end`. Publicar el estado del agent completo por separado. Un método de automatización puede esperar desde su recibo hasta el próximo idle y resumir ese intervalo explícitamente poseído, mientras que una UI normalmente sigue observando el flujo de eventos abierto. Desmontar los agents con `AgentHandle.dispose()` para que la liberación alcance la quiescencia.

[`packages/acp/acp`](../../packages/acp/acp) es el ejemplo desarrollado de solo automatización: expone sesiones de texto nuevas sobre stdio JSON-RPC de ACP (Agent Client Protocol), emite texto de assistant confirmado, y registra un respondedor de permisos de máquina de un solo uso para los agents que posee. Su [README](../../packages/acp/acp/README.md) define los métodos exactos, el orden de eventos y el contrato de ciclo de vida.

```ts
import type { Context } from '@deepseek-ai/cordis'
import { expandAssistantStream } from '@deepseek-ai/dsh-llm'

export const name = 'my-protocol-bridge'
export const inject = ['agents', 'sessions', 'sessionPersistence']

export function apply(ctx: Context) {
  // Publish every committed Assistant text delta to the client.
  ctx.on('session/event', (_session, event) => {
    if (event.type === 'assistant/message' || event.type === 'assistant/attempt') {
      for (const { chunk } of expandAssistantStream(event.data.stream)) {
        if (chunk.type === 'text-delta') {
          // sendToClient({ kind: 'message_chunk', text: chunk.text })
        }
      }
    }
  })
  // Inbound "prompt": create/resume an agent, feed it, and return its enqueue receipt.
  // Whole-agent status is a separate notification; no turn end belongs to this prompt.
  // Teardown reaches quiescence via AgentHandle.dispose() (stop + await exit).
}
```

## Cableados ejecutables

Las aplicaciones entregadas contribuyen capas de perfil a través de `packages/bundle/*/cordis.patch.yml`, y el lanzador de producto `dsh` posee la ejecución Web, ACP, SDK y headless de una sola ejecución a través de perfiles nombrados. Los overlays opcionales orientados al usuario viven bajo `apps/cli/config/examples/`; los tests de integración de perfiles viven bajo `apps/cli/tests/profiles/`, mientras que las composiciones de Loader específicas de paquete permanecen con los tests de su paquete.

<a id="the-feature--mechanism-map"></a>

## El mapa funcionalidad → mecanismo

Cada funcionalidad de producto mapea a un listener sobre un punto de extensión documentado: la afirmación del microkernel hecha comprobable ([Agent Note del microkernel](../../.agents/notes/implemented/architecture/2026-06-11-microkernel-event-taxonomy.md)). Ninguna fila modifica el bucle.

`system-prompt/assemble` es una transformación cooperativa de ensamblado completo para expertos: el ensamblado que devuelve es autoritativo, así que los autores de listeners poseen la preservación del modo PTC activo y de las contribuciones del protocolo de salida estructurada. Preferir `ctx.tools.restrict()` para el filtrado de tools que debe permanecer alineado entre presentación, búsqueda y ejecución.

| Funcionalidad de producto | Mecanismo de plugin |
|---|---|
| Sistema de hooks (nivel usuario + proyecto) | listeners sobre `agent/created`, `agent/pre-step`, `agent/request`, `tools/pre-execute`, `tools/post-execute` y `agent/turn-stopping`; los waterfalls devuelven decisiones tipadas, mientras que `agent/turn-stopping` puede dirigir otro paso mediante steering (guía a mitad de camino); los puentes `dsh-hooks-claude-code` / `dsh-hooks-codex` mapean archivos de configuración de hooks sobre estos puntos de extensión |
| `/goal` | `ctx.goals` posee el estado duradero, `dsh-goal-round-driver` planifica Rounds dentro de la misma sesión a través del `Agent` público, y productores separados de comandos/tools exponen el control humano/modelo |
| `/loop` | ante el evento de sesión `turn/end`, hacer `followup()` de la siguiente iteración; o force-continue |
| Flujo de trabajo dinámico | `ctx.workflowEngine` + el motor de flujos de trabajo PTC + la tool `workflow`; los hijos estructurados en proceso aplican la salida con registros de prompt/tool con scope, un guard de tools monótono, commit final de `tools/result` (incluido el `run_code` envolvente), y el marcador monótono `concludeTurn()` de la ejecución de salida estructurada |
| Mensajes en cola + steering | `Agent.followup()` / `Agent.steer()` del núcleo |
| Compactación de contexto (context compaction): automática + manual | el seam `ctx.compaction` + `dsh-compaction-basic`; la presión automática se ejecuta en `agent/pre-step` serial, la recuperación canónica de overflow se ejecuta en `agent/request-error`, y los llamantes manuales usan el mismo servicio de compactación ([Agent Note de compactación](../../.agents/notes/implemented/feature/2026-06-18-compaction-capability-seam.md)) |
| Configurabilidad del prompt del sistema | `ctx.systemPrompt.section()` con ordenación y sombreado local al scope |
| AGENTS.md (raíz) | un proveedor de secciones que lee el archivo |
| AGENTS.md (subdirectorio, al contacto) + avisos de cambio de archivos | `agent.inject()` desde un watcher / listener de resultados de tool |
| Tools incorporadas | `ctx.tools.register()`; los schemas fluyen al ensamblado automáticamente: las familias `dsh-tool-*` (bash, fs, web, subagent, todo) son los ejemplos entregados |
| ToolSearch / revelado progresivo | reemplazar un registro `ctx.tools.restrict()` con scope a medida que cambia el conjunto visible; el registry mantiene alineadas presentación, búsqueda y ejecución |
| Plazo / reintento / métricas de tools | envolver el despacho del núcleo con `tools/execute`; un envoltorio puede reemplazar `exec.signal`, delegar e inspeccionar el resultado normalizado en un único ciclo de vida léxico |
| Métricas / auditoría / captura del resultado final de tool | observar resultados autoritativos inmutables con `tools/result`; usar `tools/post-execute` en su lugar solo cuando el plugin debe transformar el resultado o adjuntar contexto |
| Política monótona de turno terminal | llamar a `ToolExecution.concludeTurn()` desde la tool terminal exitosa; las llamadas a tool posteriores en la misma respuesta siguen siendo protegibles, y el bucle se detiene tras el paso |
| Sandbox de subprocesos (landlock / sandbox-exec) | usar un backend `ctx.sandbox` a través de `dsh-bash-sandbox`; usar `tools/pre-execute` para denegación a nivel de capacidad |
| Sistema de permisos / AskUserQuestion | devolver `ask` desde `tools/pre-execute` y responder a través de `ctx.approval`; registrar una tool ask orientada al modelo separada para preguntas ordinarias al usuario |
| Modo plan | [`@deepseek-ai/dsh-plan-mode`](../../packages/plan/plan-mode/README.md): estado `plan/mode` registrado, la sección de guía `plan:policy`, entrada con `/plan [message]`, salida directa con `/plan off`, y la salida `exit_plan_mode` revisada por el usuario; la aplicación permanece en los ejes independientes sandbox/aprobación |
| Delegación a subagents | el registry de proveedores `ctx.subagents` (`dsh-subagent-spawn-in-process`/`dsh-subagent-fork-in-process`/`dsh-subagent-acp`/`dsh-subagent-codex`/`dsh-subagent-claude-code`/`dsh-subagent-dsh-sdk`) + `dsh-tool-subagent` exponiendo un proveedor configurado al modelo |
| MCP | un plugin por servidor: descubrir tools → `ctx.tools.register()` |
| Skills (habilidades) | sección + registro de tool; `inject()` del contenido de la skill al invocarla |
| Memoria | proveedor de sección + tool |
| Tareas programadas (cron) | un plugin registra tools de programación llamables por el modelo; el temporizador dispara → `followup(…, {source: {kind: 'plugin', plugin: 'schedule'}})` cuando está idle / notificación `inject()` cuando está ocupado |
| UI (GUI; la CLI emite JSONL) | escuchar `agent/assistant-stream` para fragmentos en vivo y `session/event` para asentamientos duraderos, límites y actividad de tools; entrada → `followup()` |
| Nodo de negocio del Chat del Web Client | registrar una `ConversationNodeDefinition` y un renderer con clave `conversation.chat.node` |
| SessionTelemetryBackend / traza reproducible | `session/event` → JSONL; reproducción = `sessions.create(id, { seed })` |
| Adaptadores de modelos | subclase de `LlmAdapter` vía `registerAdapter` (`dsh-llm-deepseek`, `dsh-llm-pi-ai`) |
| Recarga en caliente de plugins | todo registro es un `ctx.effect` → el HMR (reemplazo de módulos en caliente) vendored simplemente funciona |
