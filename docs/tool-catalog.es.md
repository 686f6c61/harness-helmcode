<!-- El código fuente en inglés lo genera scripts/gen-tool-catalog.ts; este archivo en español es la contraparte revisada mantenida mediante el emparejamiento bilingüe.
     Para actualizarlo, ejecutar primero `pnpm run gen-tool-catalog` para actualizar el inglés, después actualizar este archivo y ejecutar `pnpm run verify-translation-pairing --write docs/tool-catalog.md` para volver a registrar el par. -->

# Catálogo de schemas de tools

[English](tool-catalog.md) | Español

Cada tool visible para el modelo que un plugin entregado contribuye a `ctx.tools`: el `name`, la `description` y los `parameters` de JSON Schema que el modelo recibe mediante el ensamblado del prompt del sistema. Complementa las [páginas de subsistemas](subsystems/core.es.md) (los tipos más la región generada de API de Cordis de cada página): esta página es las *tools* que se ofrecen al agent (agente).

La fuente en inglés está GENERADA y `pnpm run verify-tool-catalog` (parte de `doc-sync` (puerta de sincronización de documentación)) verifica su frescura; este archivo en español se mantiene como contraparte revisada mediante el emparejamiento bilingüe. A diferencia del catálogo de Cordis (un pase puro de AST sobre la fuente), este generador ARRANCA cada plugin de tool en un contexto real y lee `ctx.tools.schemas()`, porque el schema de un tool no es conocible estáticamente (enums expandidos en runtime, descripciones concatenadas, nombres decididos por configuración, tools MCP con JSON Schema en crudo). Una guarda de completitud hace glob de `packages/*/tool-*` y falla si algún paquete falta en el manifest (lista de metadatos) de arranque del generador, de modo que un tool nuevo no puede quedar sin documentar silenciosamente.

Ámbito: tools de producto entregados bajo `packages/*/tool-*`, cada uno arrancado con su configuración por DEFECTO, salvo donde un campo de Config es OBLIGATORIO sin valor por defecto: ahí el generador debe elegir, y la nota del paquete registra qué rama muestra esta página. El NOMBRE del tool registrado puede ser una configuración en tiempo de carga (p. ej. `toolName` de `tool-subagent`), de modo que un despliegue puede exponer un paquete bajo un nombre distinto o adicional; una nota por paquete registra esos alias entregados donde existen. Los tools de demostración de `examples/` (p. ej. `echo`) quedan excluidos, igualando el ámbito de solo paquetes del catálogo de Cordis.

<a id="tool-package-map"></a>

## Mapa de paquetes de tools

Esta tabla conecta los nombres de tools visibles al modelo con el paquete de plugin y los seams de servicio detrás de ellos. Los JSON Schemas exactos siguen en las secciones de paquetes más abajo.

| Paquete de tools | Nombres visibles al modelo | Requiere | Escribe / afecta | Alias entregados | Nota de despliegue |
| --- | --- | --- | --- | --- | --- |
| `@deepseek-ai/dsh-plugin-manager` | `plugin_manager` | `ctx.tools`, `ctx.pluginManager`, `ctx.sandboxPolicy` | `tool/call`, `tool/result`, `user/message` | - | - |
| `@deepseek-ai/dsh-mcp-resources` | `list_mcp_resource_templates`, `list_mcp_resources`, `read_mcp_resource` | `ctx.tools`, `ctx.mcpResources` | `tool/call`, `tool/result` | - | - |
| `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | `stagehand_act`, `stagehand_extract`, `stagehand_navigate`, `stagehand_observe`, `stagehand_screenshot`, `stagehand_tabs` | `ctx.browserUse`, `ctx.agents`, `ctx.tools`, `ctx.systemPrompt` | `tool/call`, `tool/result` | - | - |
| `@deepseek-ai/dsh-tool-ask-user` | `ask_user_question` | `ctx.tools`, `ctx.userQuestions` | `tool/call`, `tool/result after an answer or timeout`, `late user/message` | - | ask_user_question conserva por defecto el comportamiento bloqueante original; establecer `mode: timed` para optar por un timeout en primer plano y un resultado pendiente mientras la pregunta sigue siendo respondible. En modo timed, `timeout: -1` mantiene esa llamada bloqueada indefinidamente. |
| `@deepseek-ai/dsh-tools` | `run_code` | `ctx.tools`, `ctx.ptcRuntime (execution time)`, `ctx.systemPrompt` | `tool/call`, `one tool/ptc-dispatch-start + tool/ptc-dispatch pair per bridged sub-call`, `tool/result` | - | Propiedad del registry de tools como transporte reservado fuera de las capas de capacidad filtrables bajo `mode: ptc` / `mode: both` (ver el Agent Note del modo PTC). Bajo `ptc` es la única contribución del registry al cable; las demás capacidades visibles se declaran en una sección de SDK generada en el lenguaje del runtime cargado, y un programa las llama mediante bindings planificados bajo el contrato de concurrencia nativo (arranques y política ordenados por envío; los cuerpos seguros para concurrencia se solapan hasta `maxParallelSubCalls`) que reingresan al pipeline de tools guardado completo y vinculan cada ejecución anidada a este resultado exterior. |
| `@deepseek-ai/dsh-plan-mode` | `exit_plan_mode` | `ctx.tools`, `ctx.systemPrompt`, `ctx.userQuestions (execution time, opportunistic)` | `tool/call`, `plan/mode inactive on an approved review`, `tool/result` | - | exit_plan_mode permanece en el schema visible al modelo mientras la planificación está inactiva, de modo que las transiciones no añaden ruido al catálogo de tools encima del cambio de política de planes. Su ruta de ejecución rechaza llamadas fuera del modo plan; en modo plan presenta el plan a través del seam de user-questions (aprobar / seguir planificando con comentarios), y la aprobación registra el modo plan inactivo en el límite del paso. |
| `@deepseek-ai/dsh-tool-bash` | `bash` | `ctx.tools`, `ctx.shell`, `ctx.systemPrompt`, `ctx.shellEnv`, `ctx.jobs for run_in_background and the job-backed foreground path` | `tool/call`, `tool/result` | - | El tool bash es el consumidor visible al modelo del seam del ejecutor de bash. Con un registry de jobs compuesto, cada llamada se registra al arrancar en el runtime genérico `ctx.jobs`, y se recoge/detiene mediante los tools `job_*` de `@deepseek-ai/dsh-tool-jobs`; sin él, o con `enableRunInBackground: false`, el tool registra un schema de solo primer plano sin el parámetro `run_in_background`. |
| `@deepseek-ai/dsh-tool-present` | `present` | `ctx.tools`, `ctx.fs`, `ctx.sessionProjections` | `tool/call`, `deliverables/presented after a successful final result`, `tool/result` | - | Las entregas pertenecen a la Session que llama; ui-deliverables de Web aporta la apertura de archivos fuente y las tarjetas. |
| `@deepseek-ai/dsh-tool-pwsh` | `pwsh` | `ctx.tools`, `ctx.shell`, `ctx.systemPrompt`, `ctx.shellEnv`, `ctx.jobs for run_in_background and the job-backed foreground path` | `tool/call`, `tool/result` | - | El tool pwsh es el consumidor del dialecto PowerShell del seam del ejecutor de bash para composiciones Windows (un ejecutor de PowerShell como `@deepseek-ai/dsh-pwsh-local` respalda `ctx.shell`); refleja el tool bash llamada a llamada menos los controles de sandbox: las ejecuciones de `run_in_background` se registran en el runtime genérico `ctx.jobs` y se recogen/detienen mediante los tools `job_*`, y el entorno gestionado `DSH_*` viene de `@deepseek-ai/dsh-shell-env`. Cada llamada corre en un proceso nuevo (sin sesión PTY persistente), con rutas nativas `C:\...` y variables `$env:NAME`. |
| `@deepseek-ai/dsh-tool-cordis` | `cordis_inspect_list`, `cordis_inspect_query` | `ctx.tools`, `ctx.cordisInspect` | `tool/call`, `tool/result` | - | El modo Creator aporta dos tools de inspección de runtime de solo lectura. El runner de host de Cordis suministra el registry de inspección; las consultas del Client requieren una página conectada. Crear los cambios persistentes como bundles e instalarlos con plugin_manager. |
| `@deepseek-ai/dsh-tool-bash-persistent` | `bash` | `ctx.tools`, `ctx.terminals`, `an owning Agent at execution time` | `tool/call`, `PTY shell state`, `tool/result` | - | Un tool bash persistente aislado por propietario; la composición del despliegue suministra el backend PTY y puede sobrescribir la descripción del entorno visible al modelo. |
| `@deepseek-ai/dsh-tool-pwsh-persistent` | `pwsh` | `ctx.tools`, `ctx.terminals`, `an owning Agent at execution time` | `tool/call`, `PTY shell state`, `tool/result` | - | Un tool pwsh persistente aislado por propietario, el homólogo para Windows del tool bash persistente; la composición del despliegue suministra un backend PTY de dialecto pwsh y puede sobrescribir la descripción del entorno visible al modelo. |
| `@deepseek-ai/dsh-tool-str-replace-editor` | `str_replace_editor` | `ctx.tools`, `ctx.fs` | `tool/call`, `fs/observed after view presence/absence, edit absence, or successful mutation`, `tool/result` | - | Tool independiente de ver/crear/reemplazo literal único/inserción de líneas sobre el seam del sistema de archivos; se compone con cualquier API de shell o terminal. |
| `@deepseek-ai/dsh-tool-fs` | `edit`, `read`, `read_image`, `write` | `ctx.tools`, `ctx.fs`, `ctx.systemPrompt`, `ctx.attachments (image-tool registration)`, `ctx.llm + an image-capable route (image-tool execution)` | `tool/call`, `fs/write-intent or fs/edit-intent for mutations`, `fs/observed after read presence/absence or successful file operation`, `durable attachment (read_image)`, `tool/result` | - | La política de leer antes de escribir/editar la añade `@deepseek-ai/dsh-fs-observation-policy` (un plugin de puerta de eventos `fs/*`, sin cambio de schema); un despliegue que carga estos tools debería cargarlo también. El tool de imagen no se registra sin `ctx.attachments`; su schema es independiente de la ruta, y la ejecución se niega salvo que el modelo enrutado exacto declare entrada de imágenes. |
| `@deepseek-ai/dsh-tool-fs-search` | `glob`, `grep` | `ctx.tools`, `ctx.subprocess`, `ctx.systemPrompt` | `tool/call`, `tool/result` | - | glob y grep son tools de descubrimiento incondicionales que hacen spawn del binario ripgrep empaquetado (`@vscode/ripgrep`) a través de ctx.subprocess como llamadas ordinarias en primer plano (nunca tareas en segundo plano): sin instalación de `rg` en el host y sin capa de shell. El catálogo usa `sampleOverCapGlobResults: true`; los despliegues deben elegir ese comportamiento explícitamente. Los resultados truncados guardan la lista formateada completa a través del backend opcional ctx.spillStore; los localizadores devueltos se pueden leer/buscar en seguimiento cuando el backend expone rutas locales en despliegues coubicados. |
| `@deepseek-ai/dsh-tool-terminal` | `terminal_close`, `terminal_list`, `terminal_open`, `terminal_read`, `terminal_send`, `terminal_signal` | `ctx.tools`, `ctx.terminals`, `ctx.systemPrompt`, `ctx.jobs at call time for run_in_background` | `tool/call`, `tool/result` | - | Los seis tools de terminal son opt-in y complementan los tools de shell/sistema de archivos de un disparo. `terminal_send(run_in_background: true)` se registra en `ctx.jobs`; TUI, secuencias de teclas con nombre, BEL, redimensionado, autoarranque y compartición entre agents están ausentes del schema. |
| `@deepseek-ai/dsh-tool-goal` | `create_goal`, `get_goal`, `update_goal` | `ctx.tools`, `ctx.agents`, `ctx.goals`, `ctx.systemPrompt`, `a calling Agent in an authorized open turn` | `tool/call`, `goal/change for mutations`, `tool/result` | - | create, edit, pause y resume requieren la autoridad raíz del humano directo; complete y blocked también aceptan el Round de goal actual exacto. El límite inferior por defecto de blocked es de tres Rounds admitidos. |
| `@deepseek-ai/dsh-schedule` | `schedule_create`, `schedule_delete`, `schedule_list`, `schedule_update` | `ctx.tools`, `ctx.schedule`, `a live root Agent` | `tool/call`, `Schedule storage domain create, update, or delete`, `tool/result` | - | Registrados en los ámbitos del Agent raíz en vivo mientras el servicio Schedule está cargado. Acepta after_seconds, un at absoluto explícito, every_seconds acotado de tasa fija, horas locales diarias y semanales en una zona IANA explícita, y cron como expresión de cinco campos. La gestión usa el dominio de almacenamiento del Host; los mensajes vencidos reanudan la Session original. |
| `@deepseek-ai/dsh-tool-lsp` | `lsp` | `ctx.tools`, `ctx.lsp`, `ctx.systemPrompt` | `tool/call`, `tool/result` | - | El tool lsp mantiene la selección de proveedor y los subprocesos de servidor de lenguaje detrás de ctx.lsp, de modo que su schema visible al modelo permanece estable entre proveedores. Requiere un proveedor registrado (p. ej. `@deepseek-ai/dsh-lsp-stdio`) en runtime; sin uno, una consulta devuelve el error estructurado `LSP_UNAVAILABLE` en lugar de cambiar el schema. |
| `@deepseek-ai/dsh-tool-ralph` | `ralph` | `ctx.tools`, `ctx.workflowEngine`, `ctx.subagents`, `ctx.systemPrompt`, `a calling Agent (exec.agent parents every fresh round)` | `tool/call`, `tool/result`, `workflow and child session events during execution` | - | Un workflow fijo en primer plano inicia un hijo estructurado fresco por Round; el modelo selecciona solo el objetivo inmutable y un tope opcional de Rounds. |
| `@deepseek-ai/dsh-tool-skill` | `skill` | `ctx.tools`, `ctx.agents`, `ctx.skills` | `tool/call`, `tool/result`, `user/message replacement catalogs via agent.inject()` | - | - |
| `@deepseek-ai/dsh-tool-session-query` | `session_event_read`, `session_event_search`, `session_event_trace`, `session_search`, `session_trace` | `ctx.tools`, `ctx.systemPrompt`, `ctx.sessionQuery`, `a calling Agent for workspace authority` | `tool/call`, `tool/result` | - | Los cinco tools de solo lectura ocultan los cursores de proveedor y autorizan cada resultado desde la sesión inmutable del agent que llama. El paquete es opt-in; las composiciones que necesitan plazos aplicados o salida en línea acotada también montan las políticas genéricas de timeout o de spill. |
| `@deepseek-ai/dsh-tool-subagent` | `list_subagent_models`, `subagent` | `ctx.tools`, `ctx.subagents`, `ctx.systemPrompt`, `ctx.llm for model discovery and selected-route validation` | `tool/call`, `tool/result`, `child session events through the chosen provider` | `subagent`, `subagent_fork` | El nombre de delegación registrado es la configuración `toolName` en tiempo de carga (por defecto `subagent`); el schema por defecto anterior tiene la selección de modelo desactivada, mientras que el schema de descubrimiento se muestra como la herramienta complementaria fija disponible en una Session habilitada. Los presets de Web muestrean la preferencia de Plugins para cada nueva Session de nivel superior y preservan esa decisión para sus Sessions hijas; `subagent_fork` permanece de ruta fija. Cada instancia controla independientemente si lee la configuración de selección de modelo y su comportamiento en segundo plano mediante `modelSelectionSettings`, `backgroundMode` y `enableRunInBackground`. |
| `@deepseek-ai/dsh-tool-subagent-control` | `interrupt_agent`, `list_agents`, `send_message` | `ctx.tools`, `ctx.subagents`, `ctx.agents and ctx.sessionProjections (list_agents only)` | `tool/call`, `tool/result`, `child session events through ctx.subagents` | - | Los tools de control con nombre global sobre subagents continuables en segundo plano: las instancias de `tool-subagent` vinculadas a un proveedor registran tools de delegación distintos, mientras que este paquete registra `send_message` e `interrupt_agent` una vez, más `list_agents` desde su plugin `/list-agents` cargado por separado (cuyas filas de catálogo usan los registries sessionProjections y de Agents en vivo). |
| `@deepseek-ai/dsh-tool-jobs` | `job_kill`, `job_list`, `job_output` | `ctx.tools`, `ctx.jobs`, `ctx.systemPrompt` | `tool/call`, `tool/result`, `user/message via agent.inject() for background completion notices` | - | El controlador de tareas en segundo plano agnóstico de tipo: los comandos bash en segundo plano, los envíos PTY y los subagents se leen, listan y matan mediante los mismos tres tools. Cargar el plugin adjunta el controlador que arma el `ctx.jobs.start()` de los productores. |
| `@deepseek-ai/dsh-experimental-tool-agent-team` | `interrupt_agent`, `list_agents`, `send_message`, `spawn_teammate`, `team_task_create`, `team_task_get`, `team_task_list`, `team_task_update`, `wait_agent` | `ctx.tools`, `ctx.systemPrompt`, `ctx.agentTeams`, `an exact live Team member Agent` | `tool/call`, `team/member`, `team/message/queued`, `team/message/delivered`, `team/task`, `tool/result` | - | Los nueve tools están acotados a Team Leads implícitos y teammates durables. El bundle dsh-base entregado mantiene el paquete deshabilitado; el parche de perfil documentado de Agent Teams lo habilita mientras deshabilita los nombres de control heredados de hijos continuables. |
| `@deepseek-ai/dsh-tool-todo` | `todo_write` | `ctx.tools`, `owning Agent session` | `tool/call`, `todo/write`, `tool/result` | - | todo_write es estado propiedad de la sesión; las UI renderizan el último evento todo/write como checklist. `allowParallelInProgress` es obligatorio sin valor por defecto, así que el catálogo declara su elección: `true`, cuya descripción invita a varios elementos `in_progress`. Un despliegue que elige `false` recibe el mismo tool con una descripción que pide exactamente una tarea activa. |
| `@deepseek-ai/dsh-tool-workflow` | `workflow` | `ctx.tools`, `ctx.workflowEngine`, `ctx.systemPrompt`, `a calling Agent (exec.agent parents the script children)` | `tool/call`, `tool/result` | - | - |
| `@deepseek-ai/dsh-tool-workspace-dependencies` | `load_workspace_dependencies` | `ctx.tools` | `tool/call`, `tool/result` | - | - |
| `@deepseek-ai/dsh-tool-web` | `web_fetch`, `web_search` | `ctx.tools`, `ctx.web`, `ctx.systemPrompt` | `tool/call`, `tool/result` | - | web_search y web_fetch mantienen la selección de proveedor detrás de ctx.web, de modo que los schemas visibles al modelo permanecen estables ante cambios de backend. |
| `@deepseek-ai/dsh-memory-tool` | `memory` | `ctx.tools`, `ctx.systemPrompt` | `tool/call`, `tool/result` | - | Memory almacena notas con clave como Markdown local bajo el home del harness; la sección de prompt `tool:memory` lista las claves almacenadas y no renderiza nada mientras el almacén está vacío. |
| `@deepseek-ai/dsh-github-connector` | `github` | `ctx.tools`, `ctx.credentials (execution time)` | `tool/call`, `tool/result` | - | Un tool `github` sobre la API REST; el token se resuelve del almacén de credenciales en cada petición, e issue-comment requiere el ajuste de despliegue allowWrites. |

<a id="deepseek-aidsh-plugin-manager"></a>

## `@deepseek-ai/dsh-plugin-manager`

### `plugin_manager`

Listar plugins o bundles del perfil actual, activarlos o desactivarlos, instalar un bundle o eliminar un bundle instalado. Cada acción requiere el permiso danger-full-access o la aprobación de esta llamada. La aprobación no cambia el modo de permisos de la sesión. Los cambios afectan a cada sesión de este perfil. Listar primero para obtener los identificadores exactos. La instalación de paquetes puede ejecutar scripts de compilación permitidos. Los perfiles en vivo aplican los cambios inmediatamente; los perfiles de arranque requieren reinicio. Las dependencias de pares (peer dependency) DSH incompatibles bloquean la instalación y la activación. Las exenciones de versión arriesgan fallos y pérdida de datos: advertir al usuario y obtener permiso explícito para las versiones exactas del plugin y del runtime antes de conceder una.

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "description": "Management operation.",
      "enum": [
        "list_plugins",
        "list_bundles",
        "set_plugin",
        "set_bundle",
        "install_bundle",
        "remove_bundle",
        "list_version_exemptions",
        "set_version_exemption"
      ]
    },
    "target": {
      "type": "string",
      "description": "Plugin entry id, bundle package name, or installation spec, according to action."
    },
    "enabled": {
      "type": "boolean",
      "description": "Required for set operations; defaults to true for installation. For set_version_exemption, true grants and false revokes."
    },
    "runtimeVersion": {
      "type": "string",
      "description": "For set_version_exemption: exact DSH version from list_version_exemptions. Target must be the manifest package-name@version, not an alias or version range."
    },
    "acceptRisk": {
      "type": "boolean",
      "description": "For granting an exemption: true only after warning the user about possible crashes and data loss and receiving explicit permission for this exact plugin/runtime pair. General installation permission is not enough."
    },
    "approvedBuilds": {
      "type": "array",
      "description": "For install_bundle: pass names from pendingBuilds only after the user explicitly approves running their install scripts in the conversation. This grants persistent permission for this profile.",
      "items": {
        "type": "string"
      }
    },
    "registry": {
      "type": "string",
      "description": "For install_bundle: the npm registry URL asked first, when the user names one; otherwise the configured registry is asked, and its configured fallbacks while a registry is unreachable."
    },
    "offset": {
      "type": "number",
      "description": "Zero-based list offset; defaults to 0."
    },
    "limit": {
      "type": "number",
      "description": "List page size, from 1 to 100; defaults to 25."
    }
  },
  "required": [
    "action"
  ]
}
```

Fuente: [`packages/boot/plugin-manager/src/tools.ts`](../packages/boot/plugin-manager/src/tools.ts)

<a id="deepseek-aidsh-mcp-resources"></a>

## `@deepseek-ai/dsh-mcp-resources`

### `list_mcp_resource_templates`

Listar plantillas de URI de recursos parametrizadas de un servidor MCP.

```json
{
  "type": "object",
  "properties": {
    "server": {
      "type": "string",
      "description": "Configured MCP server name."
    },
    "cursor": {
      "type": "string",
      "description": "Continuation cursor returned by this server."
    }
  },
  "required": [
    "server"
  ]
}
```

Fuente: [`packages/mcp/mcp-resources/src/tools.ts`](../packages/mcp/mcp-resources/src/tools.ts)

### `list_mcp_resources`

Listar los recursos disponibles de un servidor MCP.

```json
{
  "type": "object",
  "properties": {
    "server": {
      "type": "string",
      "description": "Configured MCP server name."
    },
    "cursor": {
      "type": "string",
      "description": "Continuation cursor returned by this server."
    }
  },
  "required": [
    "server"
  ]
}
```

Fuente: [`packages/mcp/mcp-resources/src/tools.ts`](../packages/mcp/mcp-resources/src/tools.ts)

### `read_mcp_resource`

Leer un recurso MCP por URI del servidor nombrado. Usar una URI listada o una plantilla de recurso expandida.

```json
{
  "type": "object",
  "properties": {
    "server": {
      "type": "string",
      "description": "Configured MCP server name."
    },
    "uri": {
      "type": "string",
      "description": "Resource URI to read."
    }
  },
  "required": [
    "server",
    "uri"
  ]
}
```

Fuente: [`packages/mcp/mcp-resources/src/tools.ts`](../packages/mcp/mcp-resources/src/tools.ts)

<a id="deepseek-aidsh-experimental-browser-use-stagehand-native"></a>

## `@deepseek-ai/dsh-experimental-browser-use-stagehand-native`

### `stagehand_act`

Realizar una acción de navegador en lenguaje natural usando el modelo Stagehand configurado.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "instruction": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "instruction"
  ],
  "additionalProperties": false
}
```

Fuente: [`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_extract`

Extraer datos de la página usando el modelo Stagehand configurado y un JSON Schema opcional.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "instruction": {
      "type": "string",
      "minLength": 1
    },
    "schema": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {
        "$ref": "#/$defs/__schema0"
      }
    }
  },
  "required": [
    "instruction"
  ],
  "additionalProperties": false,
  "$defs": {
    "__schema0": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "number"
        },
        {
          "type": "boolean"
        },
        {
          "type": "null"
        },
        {
          "type": "array",
          "items": {
            "$ref": "#/$defs/__schema0"
          }
        },
        {
          "type": "object",
          "propertyNames": {
            "type": "string"
          },
          "additionalProperties": {
            "$ref": "#/$defs/__schema0"
          }
        }
      ]
    }
  }
}
```

Fuente: [`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_navigate`

Navegar una pestaña de navegador Stagehand a una URL.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "url": {
      "type": "string",
      "format": "uri"
    }
  },
  "required": [
    "url"
  ],
  "additionalProperties": false
}
```

Fuente: [`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_observe`

Encontrar acciones de navegador que coincidan con una instrucción usando el modelo Stagehand configurado.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "instruction": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "instruction"
  ],
  "additionalProperties": false
}
```

Fuente: [`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_screenshot`

Capturar una captura de pantalla de una pestaña Stagehand para inspección visual.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageId": {
      "type": "string",
      "minLength": 1
    },
    "fullPage": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "fullPage"
  ],
  "additionalProperties": false
}
```

Fuente: [`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

### `stagehand_tabs`

Listar, crear, seleccionar o cerrar una pestaña de navegador Stagehand.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "action": {
          "type": "string",
          "const": "list"
        }
      },
      "required": [
        "action"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "action": {
          "type": "string",
          "const": "new"
        },
        "url": {
          "type": "string",
          "format": "uri"
        }
      },
      "required": [
        "action"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "action": {
          "type": "string",
          "enum": [
            "select",
            "close"
          ]
        },
        "pageId": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "action",
        "pageId"
      ],
      "additionalProperties": false
    }
  ],
  "type": "object"
}
```

Fuente: [`packages/experimental/browser-use-stagehand-native/src/index.ts`](../packages/experimental/browser-use-stagehand-native/src/index.ts)

<a id="deepseek-aidsh-tool-ask-user"></a>

## `@deepseek-ai/dsh-tool-ask-user`

### `ask_user_question`

Hacer al usuario una pregunta concisa cuando se necesite confirmación, una elección o información que falta antes de continuar.

```json
{
  "type": "object",
  "properties": {
    "questions": {
      "type": "array",
      "description": "Questions to ask the user before continuing.",
      "items": {
        "type": "object",
        "additionalProperties": true,
        "properties": {
          "id": {
            "type": "string",
            "description": "Stable id for this question; echoed in the answer."
          },
          "question": {
            "type": "string",
            "description": "The specific question to ask the user."
          },
          "header": {
            "type": "string",
            "description": "Optional short heading for the question, such as \"Confirm\" or \"Choose Mode\"."
          },
          "options": {
            "type": "array",
            "description": "Optional choices to show the user. If you recommend one, put it first and append \"(Recommended)\" to that label.",
            "items": {
              "type": "object",
              "additionalProperties": true,
              "properties": {
                "label": {
                  "type": "string",
                  "description": "Short user-facing option label."
                },
                "description": {
                  "type": "string",
                  "description": "One sentence explaining the tradeoff or impact."
                }
              },
              "required": [
                "label"
              ]
            }
          },
          "multi_select": {
            "type": "boolean",
            "description": "Whether the user may select more than one option. Defaults to false."
          }
        },
        "required": [
          "id",
          "question"
        ]
      }
    }
  },
  "required": [
    "questions"
  ]
}
```

Fuente: [`packages/interaction/tool-ask-user/src/index.ts`](../packages/interaction/tool-ask-user/src/index.ts)

ask_user_question conserva por defecto el comportamiento bloqueante original; establecer `mode: timed` para optar por un timeout en primer plano y un resultado pendiente mientras la pregunta sigue siendo respondible. En modo timed, `timeout: -1` mantiene esa llamada bloqueada indefinidamente.

<a id="deepseek-aidsh-tools"></a>

## `@deepseek-ai/dsh-tools`

### `run_code`

Ejecutar un programa TypeScript contra los tools disponibles. Toma dos argumentos obligatorios: `code`, el CUERPO de una función async (solo sintaxis borrable; `await` y `return` de nivel superior funcionan), y `description`, un resumen breve de lo que hace el programa. Llamar a los tools como `await tools.name(args)` según las declaraciones del prompt del sistema. Solo lo que se imprime o devuelve es salida del programa: hay que curarla. Los resultados de subtools con imágenes se adjuntan tras la ejecución.

```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string",
      "description": "The program: the body of an async TypeScript function."
    },
    "description": {
      "type": "string",
      "description": "Clear, concise description of what this program does in active voice, 5-10 words (shown in the UI). Examples: \"Count TODO markers across packages\"; \"Read failing test and its fixture\"; \"Rename config key in every cordis.yml\"."
    },
    "timeoutMs": {
      "type": "number",
      "description": "Positive elapsed-time budget in milliseconds, capped by the deployment maximum."
    },
    "sandbox_permissions": {
      "type": "string",
      "description": "Wider sandbox mode for this complete program execution; requires justification and approval.",
      "enum": [
        "workspace-write",
        "danger-full-access"
      ]
    },
    "justification": {
      "type": "string",
      "description": "Reason this complete program needs wider access, shown to the user for approval. Use the language of the user’s current request."
    }
  },
  "required": [
    "code",
    "description"
  ]
}
```

Fuente: [`packages/core/tools/src/ptc.ts`](../packages/core/tools/src/ptc.ts)

Propiedad del registry de tools como transporte reservado fuera de las capas de capacidad filtrables bajo `mode: ptc` / `mode: both` (ver el Agent Note del modo PTC). Bajo `ptc` es la única contribución del registry al cable; las demás capacidades visibles se declaran en una sección de SDK generada en el lenguaje del runtime cargado, y un programa las llama mediante bindings planificados bajo el contrato de concurrencia nativo (arranques y política ordenados por envío; los cuerpos seguros para concurrencia se solapan hasta `maxParallelSubCalls`) que reingresan al pipeline de tools guardado completo y vinculan cada ejecución anidada a este resultado exterior.

<a id="deepseek-aidsh-plan-mode"></a>

## `@deepseek-ai/dsh-plan-mode`

### `exit_plan_mode`

Usar solo en modo plan. Presentar el plan para revisión del usuario y, si se aprueba, salir del modo plan. El usuario puede aprobar (ejecutar el plan desde el siguiente paso) o seguir planificando: sus comentarios vuelven en el resultado de tool; revisar y presentar de nuevo.

```json
{
  "type": "object",
  "properties": {
    "plan": {
      "type": "string",
      "description": "The complete plan, as markdown, starting with a # heading that names it."
    }
  },
  "required": [
    "plan"
  ]
}
```

Fuente: [`packages/plan/plan-mode/src/index.ts`](../packages/plan/plan-mode/src/index.ts)

exit_plan_mode permanece en el schema visible al modelo mientras la planificación está inactiva, de modo que las transiciones no añaden ruido al catálogo de tools encima del cambio de política de planes. Su ruta de ejecución rechaza llamadas fuera del modo plan; en modo plan presenta el plan a través del seam de user-questions (aprobar / seguir planificando con comentarios), y la aprobación registra el modo plan inactivo en el límite del paso.

<a id="deepseek-aidsh-tool-bash"></a>

## `@deepseek-ai/dsh-tool-bash`

### `bash`

Ejecutar un comando bash (`bash -c`) y devolver su stdout/stderr. Cada llamada corre en un shell nuevo; pasar `workdir` en lugar de usar `cd`. Las variables gestionadas `$DSH_*` exponen hechos actuales del entorno del harness. La salida larga se trunca a su cola; la salida completa se guarda en un archivo cuya ruta se reporta cuando está disponible. Antes de cualquier borrado o movimiento, verificar que la ruta absoluta resuelta del objetivo es la prevista; no ejecutarlo nunca contra una ruta calculada no comprobada. Una variable sin definir se expande a cadena vacía, así que proteger las variables en tales rutas con `${VAR:?}`. Los comandos pueden correr bajo un sandbox de archivos; una operación de archivo bloqueada se reporta como `[sandbox: file access denied under <mode> mode]`, una denegación de política: no reintentar por otra vía.

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The bash command to execute."
    },
    "description": {
      "type": "string",
      "description": "Clear, concise description of what this command does in active voice, 5-10 words (shown in the UI). Examples: \"ls\" → \"List files in current directory\"; \"git status\" → \"Show working tree status\"; \"npm install\" → \"Install package dependencies\"."
    },
    "timeoutMs": {
      "type": "number",
      "description": "Timeout in milliseconds. The executor applies its configured default and cap; on expiry the command moves to the background as a job instead of being killed."
    },
    "workdir": {
      "type": "string",
      "description": "Working directory for this command. Defaults to the session workspace; a relative path is resolved against it."
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Run in the background and return a job id immediately (collect with job_output, stop with job_kill). No timeout applies."
    }
  },
  "required": [
    "command",
    "description"
  ]
}
```

Fuente: [`packages/shell/tool-bash/src/index.ts`](../packages/shell/tool-bash/src/index.ts)

El tool bash es el consumidor visible al modelo del seam del ejecutor de bash. Con un registry de jobs compuesto, cada llamada se registra al arrancar en el runtime genérico `ctx.jobs`, y se recoge/detiene mediante los tools `job_*` de `@deepseek-ai/dsh-tool-jobs`; sin él, o con `enableRunInBackground: false`, el tool registra un schema de solo primer plano sin el parámetro `run_in_background`.

<a id="deepseek-aidsh-tool-present"></a>

## `@deepseek-ai/dsh-tool-present`

### `present`

Declarar archivos existentes como entregables finales para el usuario. Usarlo cuando el usuario necesita un archivo separado, especialmente documentos de Office, hojas de cálculo y presentaciones de diapositivas; preferir la respuesta final cuando eso baste. El usuario abre los archivos actuales; su contenido no se copia.

```json
{
  "type": "object",
  "properties": {
    "files": {
      "type": "array",
      "description": "Usually the 1-2 most important deliverables; at most 4 per call.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "path": {
            "type": "string",
            "description": "Path of an existing regular file. Relative paths use the Session working directory."
          },
          "description": {
            "type": "string",
            "description": "Brief description for the user."
          }
        },
        "required": [
          "path"
        ]
      }
    }
  },
  "required": [
    "files"
  ]
}
```

Fuente: [`packages/deliverables/tool-present/src/index.ts`](../packages/deliverables/tool-present/src/index.ts)

Las entregas pertenecen a la Session que llama; ui-deliverables de Web aporta la apertura de archivos fuente y las tarjetas.

<a id="deepseek-aidsh-tool-pwsh"></a>

## `@deepseek-ai/dsh-tool-pwsh`

### `pwsh`

Ejecutar un comando de PowerShell (`pwsh -Command`) y devolver su stdout/stderr. Cada llamada corre en un proceso pwsh nuevo; pasar `workdir` en lugar de usar `cd`. Las rutas usan la forma nativa de Windows (`C:\...`); leer las variables de entorno con `$env:NAME`. Las variables gestionadas `$env:DSH_*` exponen hechos actuales del entorno del harness. La salida larga se trunca a su cola; la salida completa se guarda en un archivo cuya ruta se reporta cuando está disponible. En Windows, un comando matado a la fuerza se resuelve como `[exit code: 1]` sin marcador de señal: tratarlo como una interrupción, no como un fallo del comando. Antes de cualquier borrado o movimiento, verificar que la ruta absoluta resuelta del objetivo es la prevista; no ejecutarlo nunca contra una ruta calculada no comprobada. No asignar a variables automáticas como `$HOME`; los nombres de variable no distinguen mayúsculas, así que `$home` es la misma variable de solo lectura. Los comandos pueden correr bajo un sandbox de archivos; una operación de archivo bloqueada se reporta como `[sandbox: file access denied under <mode> mode]`, una denegación de política: no reintentar por otra vía.

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The PowerShell command to execute."
    },
    "description": {
      "type": "string",
      "description": "Clear, concise description of what this command does in active voice, 5-10 words (shown in the UI). Examples: \"ls\" → \"List files in current directory\"; \"git status\" → \"Show working tree status\"; \"Get-Process\" → \"List running processes\"."
    },
    "timeoutMs": {
      "type": "number",
      "description": "Timeout in milliseconds. The executor applies its configured default and cap; on expiry the command moves to the background as a job instead of being killed."
    },
    "workdir": {
      "type": "string",
      "description": "Working directory for this command. Defaults to the session workspace; a relative path is resolved against it."
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Run in the background and return a job id immediately (collect with job_output, stop with job_kill). No timeout applies."
    }
  },
  "required": [
    "command",
    "description"
  ]
}
```

Fuente: [`packages/shell/tool-pwsh/src/index.ts`](../packages/shell/tool-pwsh/src/index.ts)

El tool pwsh es el consumidor del dialecto PowerShell del seam del ejecutor de bash para composiciones Windows (un ejecutor de PowerShell como `@deepseek-ai/dsh-pwsh-local` respalda `ctx.shell`); refleja el tool bash llamada a llamada menos los controles de sandbox: las ejecuciones de `run_in_background` se registran en el runtime genérico `ctx.jobs` y se recogen/detienen mediante los tools `job_*`, y el entorno gestionado `DSH_*` viene de `@deepseek-ai/dsh-shell-env`. Cada llamada corre en un proceso nuevo (sin sesión PTY persistente), con rutas nativas `C:\...` y variables `$env:NAME`.

<a id="deepseek-aidsh-tool-cordis"></a>

## `@deepseek-ai/dsh-tool-cordis`

### `cordis_inspect_list`

Listar cada Cordis Inspect Provider conocido actualmente por el Host, incluidos los Providers locales del Host y los últimos manifests sincronizados desde el Client. Cada entrada incluye su plataforma, propósito, métodos de solo lectura y schemas de entrada/salida. Llamar a este Tool antes de escribir o configurar un plugin, y después seleccionar el proveedor y el método para cordis_inspect_query a partir de su resultado. No adivinar nombres ni tratar un método Inspect como un Service de negocio que el código del Plugin pueda llamar.

```json
{
  "type": "object",
  "properties": {}
}
```

Fuente: [`packages/extensions/tool-cordis/src/index.ts`](../packages/extensions/tool-cordis/src/index.ts)

### `cordis_inspect_query`

Ejecutar una consulta de solo lectura declarada por un Inspect Provider. platform, provider y method deben venir de cordis_inspect_list, e input debe satisfacer el schema de ese método. Usar este Tool antes de escribir código de plugin para leer métodos exactos de Service, modos de Event, schemas de Config de plugins, schemas de Tools, tokens de tema, o árboles y props de Slots en vivo. Las consultas del Host corren localmente. Una consulta del Client espera la primera respuesta válida de la página dentro del timeout configurado; en caso contrario reporta un fallo del Client o pide reconectar y reintentar. Este Tool no puede invocar métodos de Service de negocio ni modificar el runtime.

```json
{
  "type": "object",
  "properties": {
    "platform": {
      "type": "string",
      "description": "Runtime platform that owns the Provider.",
      "enum": [
        "host",
        "client"
      ]
    },
    "provider": {
      "type": "string",
      "description": "Exact Provider ID returned by cordis_inspect_list."
    },
    "method": {
      "type": "string",
      "description": "Exact method name declared by the Provider manifest."
    },
    "input": {
      "description": "Optional query input; it must satisfy the method input schema."
    }
  },
  "required": [
    "platform",
    "provider",
    "method"
  ]
}
```

Fuente: [`packages/extensions/tool-cordis/src/index.ts`](../packages/extensions/tool-cordis/src/index.ts)

El modo Creator aporta dos tools de inspección de runtime de solo lectura. El runner de host de Cordis suministra el registry de inspección; las consultas del Client requieren una página conectada. Crear los cambios persistentes como bundles e instalarlos con plugin_manager.

<a id="deepseek-aidsh-tool-bash-persistent"></a>

## `@deepseek-ai/dsh-tool-bash-persistent`

### `bash`

Ejecutar comandos en un shell bash persistente. El estado, incluidos el directorio actual y las variables de entorno exportadas, persiste entre llamadas para este agent.

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The bash command to run. Relative path is preferred in the command."
    }
  },
  "required": [
    "command"
  ]
}
```

Fuente: [`packages/shell/tool-bash-persistent/src/index.ts`](../packages/shell/tool-bash-persistent/src/index.ts)

Un tool bash persistente aislado por propietario; la composición del despliegue suministra el backend PTY y puede sobrescribir la descripción del entorno visible al modelo.

<a id="deepseek-aidsh-tool-pwsh-persistent"></a>

## `@deepseek-ai/dsh-tool-pwsh-persistent`

### `pwsh`

Ejecutar comandos en un shell de PowerShell persistente. El estado, incluidos el directorio actual y las variables de entorno exportadas, persiste entre llamadas para este agent.

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The PowerShell command to run. Relative path is preferred in the command."
    }
  },
  "required": [
    "command"
  ]
}
```

Fuente: [`packages/shell/tool-pwsh-persistent/src/index.ts`](../packages/shell/tool-pwsh-persistent/src/index.ts)

Un tool pwsh persistente aislado por propietario, el homólogo para Windows del tool bash persistente; la composición del despliegue suministra un backend PTY de dialecto pwsh y puede sobrescribir la descripción del entorno visible al modelo.

<a id="deepseek-aidsh-tool-str-replace-editor"></a>

## `@deepseek-ai/dsh-tool-str-replace-editor`

### `str_replace_editor`

Tool de edición personalizado para ver, crear y editar archivos
* El estado persiste entre llamadas de comandos y discusiones con el usuario
* Si `path` es un archivo, `view` muestra el resultado de aplicar `cat -n`. Si `path` es un directorio, `view` lista archivos y directorios no ocultos hasta 2 niveles de profundidad
* El comando `create` no puede usarse si el `path` especificado ya existe como archivo
* Si un `command` genera una salida larga, se truncará y marcará con `<response clipped>`
* Un placeholder null para un parámetro que el comando seleccionado no usa se trata como omitido. Los parámetros obligatorios siguen necesitando valores; omitir `str_replace.new_str` en lugar de ponerlo a null al eliminar una coincidencia

Notas para usar el comando `str_replace`:
* El parámetro `old_str` debe coincidir EXACTAMENTE con una o más líneas consecutivas del archivo original. ¡Prestar atención a los espacios en blanco!
* Si el parámetro `old_str` no es único en el archivo, no se realizará el reemplazo. Asegurarse de incluir suficiente contexto en `old_str` para hacerlo único
* El parámetro `new_str` debe contener las líneas editadas que deben reemplazar a `old_str`

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The commands to run. Allowed options are: `view`, `create`, `str_replace`, `insert`.",
      "enum": [
        "view",
        "create",
        "str_replace",
        "insert"
      ]
    },
    "path": {
      "type": "string",
      "description": "Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`."
    },
    "file_text": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "Required string parameter of `create` command, with the content of the file to be created. A null placeholder is treated as omitted by commands that do not use this parameter."
    },
    "insert_line": {
      "oneOf": [
        {
          "type": "integer"
        },
        {
          "type": "null"
        }
      ],
      "description": "Required integer parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`. A null placeholder is treated as omitted by commands that do not use this parameter."
    },
    "new_str": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "Optional string parameter of `str_replace` command containing the new string (if omitted, no string will be added). Required string parameter of `insert` command containing the string to insert. A null placeholder is accepted only by commands that do not use this parameter."
    },
    "old_str": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "Required string parameter of `str_replace` command containing the string in `path` to replace. A null placeholder is treated as omitted by commands that do not use this parameter."
    },
    "view_range": {
      "oneOf": [
        {
          "type": "array",
          "items": {
            "type": "integer"
          }
        },
        {
          "type": "null"
        }
      ],
      "description": "Optional parameter of `view` command when `path` points to a file. If omitted or null, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all lines from `start_line` to the end of the file."
    }
  },
  "required": [
    "command",
    "path"
  ]
}
```

Fuente: [`packages/fs/tool-str-replace-editor/src/index.ts`](../packages/fs/tool-str-replace-editor/src/index.ts)

Tool independiente de ver/crear/reemplazo literal único/inserción de líneas sobre el seam del sistema de archivos; se compone con cualquier API de shell o terminal.

<a id="deepseek-aidsh-tool-fs"></a>

## `@deepseek-ai/dsh-tool-fs`

### `edit`

Editar un archivo de texto UTF-8 existente reemplazando texto literal.

```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Path to edit, resolved by the filesystem backend."
    },
    "old_string": {
      "type": "string",
      "description": "Literal text to replace."
    },
    "new_string": {
      "type": "string",
      "description": "Literal replacement text. Use an empty string to delete the match."
    },
    "replace_all": {
      "type": "boolean",
      "description": "Replace all matches. Defaults to false; when false, old_string must appear exactly once."
    }
  },
  "required": [
    "file_path",
    "old_string",
    "new_string"
  ]
}
```

Fuente: [`packages/fs/tool-fs/src/index.ts`](../packages/fs/tool-fs/src/index.ts)

### `read`

Leer un archivo de texto UTF-8 y devolver el contenido numerado por líneas.

```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Path to read, resolved by the filesystem backend."
    },
    "offset": {
      "type": "number",
      "description": "1-based first line to return. Defaults to 1."
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of lines to return. Defaults to 2000."
    }
  },
  "required": [
    "file_path"
  ]
}
```

Fuente: [`packages/fs/tool-fs/src/index.ts`](../packages/fs/tool-fs/src/index.ts)

### `read_image`

Leer un archivo PNG/JPEG/WebP/GIF y devolver la imagen misma. Las imágenes grandes se reducen automáticamente; no instalar bibliotecas de imágenes ni crear miniaturas para inspeccionar una imagen.

```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Path to the image file, resolved by the filesystem backend."
    }
  },
  "required": [
    "file_path"
  ]
}
```

Fuente: [`packages/fs/tool-fs/src/index.ts`](../packages/fs/tool-fs/src/index.ts)

### `write`

Crear o reemplazar por completo un archivo de texto UTF-8.

```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Path to write, resolved by the filesystem backend."
    },
    "content": {
      "type": "string",
      "description": "Full UTF-8 text content to write."
    }
  },
  "required": [
    "file_path",
    "content"
  ]
}
```

Fuente: [`packages/fs/tool-fs/src/index.ts`](../packages/fs/tool-fs/src/index.ts)

La política de leer antes de escribir/editar la añade `@deepseek-ai/dsh-fs-observation-policy` (un plugin de puerta de eventos `fs/*`, sin cambio de schema); un despliegue que carga estos tools debería cargarlo también. El tool de imagen no se registra sin `ctx.attachments`; su schema es independiente de la ruta, y la ejecución se niega salvo que el modelo enrutado exacto declare entrada de imágenes.

<a id="deepseek-aidsh-tool-fs-search"></a>

## `@deepseek-ai/dsh-tool-fs-search`

### `glob`

Encontrar archivos, no directorios, cuyas rutas coincidan con un patrón glob, incluidos los archivos ocultos e ignorados. Devuelve hasta 100 rutas en orden de fecha de modificación; un resultado mayor se muestrea entre las entradas de nivel superior y reporta dónde se guardó la lista completa.

```json
{
  "type": "object",
  "properties": {
    "pattern": {
      "type": "string",
      "description": "Glob pattern to match file paths against (e.g. \"**/*.ts\", \"src/**/*.test.js\"). A pattern with no \"/\" matches the basename at any depth, so \"*\" and \"*.ts\" both search the whole tree; include a separator to anchor the depth."
    },
    "path": {
      "type": "string",
      "description": "Directory to search in. Defaults to the session workspace; a relative path resolves against it."
    }
  },
  "required": [
    "pattern"
  ]
}
```

Fuente: [`packages/fs/tool-fs-search/src/index.ts`](../packages/fs/tool-fs-search/src/index.ts)

### `grep`

Buscar en el contenido de archivos con una expresión regular de ripgrep. Devuelve las líneas coincidentes con números de línea, agrupadas por archivo. Devuelve hasta 250 coincidencias; un resultado mayor reporta dónde se guardó la lista completa de coincidencias.

```json
{
  "type": "object",
  "properties": {
    "pattern": {
      "type": "string",
      "description": "Regular expression to search for (ripgrep syntax)."
    },
    "path": {
      "type": "string",
      "description": "File or directory to search. Defaults to the session workspace; a relative path resolves against it."
    },
    "include": {
      "type": "string",
      "description": "One glob filter for which files to search (e.g. \"*.ts\", \"*.{js,jsx}\"). Not a list; negation is not supported."
    }
  },
  "required": [
    "pattern"
  ]
}
```

Fuente: [`packages/fs/tool-fs-search/src/index.ts`](../packages/fs/tool-fs-search/src/index.ts)

glob y grep son tools de descubrimiento incondicionales que hacen spawn del binario ripgrep empaquetado (`@vscode/ripgrep`) a través de ctx.subprocess como llamadas ordinarias en primer plano (nunca tareas en segundo plano): sin instalación de `rg` en el host y sin capa de shell. El catálogo usa `sampleOverCapGlobResults: true`; los despliegues deben elegir ese comportamiento explícitamente. Los resultados truncados guardan la lista formateada completa a través del backend opcional ctx.spillStore; los localizadores devueltos se pueden leer/buscar en seguimiento cuando el backend expone rutas locales en despliegues coubicados.

<a id="deepseek-aidsh-tool-terminal"></a>

## `@deepseek-ai/dsh-tool-terminal`

### `terminal_close`

Cerrar una terminal persistente y esperar hasta que su árbol de procesos propios capturado haya desaparecido.

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Terminal session id."
    }
  },
  "required": [
    "sessionId"
  ]
}
```

Fuente: [`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_list`

Listar las sesiones de terminal persistentes que posee el agent actual.

```json
{
  "type": "object",
  "properties": {}
}
```

Fuente: [`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_open`

Crear una sesión de terminal persistente y aislada por propietario a partir de un tipo de backend registrado. Usarlo para estado de shell o REPL que deba sobrevivir entre llamadas a tools.

```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "description": "Registered terminal backend type, usually \"shell\"."
    },
    "name": {
      "type": "string",
      "description": "Optional owner-local display name such as \"main\" or \"gdb\"."
    },
    "cwd": {
      "type": "string",
      "description": "Initial working directory. Defaults to the deployment workspace root."
    }
  },
  "required": [
    "type"
  ]
}
```

Fuente: [`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_read`

Leer una página acotada de la salida retenida de una terminal persistente sin enviar entrada.

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Terminal session id."
    },
    "offset": {
      "type": "number",
      "description": "Newest-relative line offset (default 0)."
    },
    "count": {
      "type": "number",
      "description": "Requested line count (default 500; backend caps apply)."
    }
  },
  "required": [
    "sessionId"
  ]
}
```

Fuente: [`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_send`

Enviar texto a una terminal persistente. Por defecto se envía Enter y la llamada espera un prompt, una espera de stdin, silencio de salida, timeout o salida de la sesión. El modo en segundo plano devuelve un job id para job_output/job_kill.

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Terminal session id returned by terminal_open or terminal_list."
    },
    "text": {
      "type": "string",
      "description": "UTF-8 text to write to the terminal."
    },
    "submit": {
      "type": "boolean",
      "description": "Submit Enter after text (default true). Set false for control characters or incomplete REPL input."
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Return a job id immediately; collect with job_output or stop with job_kill."
    }
  },
  "required": [
    "sessionId",
    "text"
  ]
}
```

Fuente: [`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

### `terminal_signal`

Enviar una señal permitida al grupo de procesos en primer plano actual de una terminal persistente.

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Terminal session id."
    },
    "signal": {
      "type": "string",
      "description": "Signal to deliver. Shell-targeted SIGKILL is rejected; use terminal_close.",
      "enum": [
        "SIGINT",
        "SIGTERM",
        "SIGKILL",
        "SIGTSTP",
        "SIGHUP"
      ]
    }
  },
  "required": [
    "sessionId",
    "signal"
  ]
}
```

Fuente: [`packages/terminal/tool-terminal/src/index.ts`](../packages/terminal/tool-terminal/src/index.ts)

Los seis tools de terminal son opt-in y complementan los tools de shell/sistema de archivos de un disparo. `terminal_send(run_in_background: true)` se registra en `ctx.jobs`; TUI, secuencias de teclas con nombre, BEL, redimensionado, autoarranque y compartición entre agents están ausentes del schema.

<a id="deepseek-aidsh-tool-goal"></a>

## `@deepseek-ai/dsh-tool-goal`

### `create_goal`

Crear un goal persistido que mantiene esta sesión trabajando a través de Rounds de continuación automática. Usarlo cuando la petición humana directa es un objetivo de larga duración, aunque el usuario no haya dicho «goal»; no para trabajo de un solo turno.

```json
{
  "type": "object",
  "properties": {
    "objective": {
      "type": "string",
      "description": "The concrete completion objective inferred from the direct human request."
    },
    "max_goal_rounds": {
      "type": "number",
      "description": "Optional positive safe-integer limit on automatic continuation rounds."
    }
  },
  "required": [
    "objective"
  ]
}
```

Fuente: [`packages/goal/tool-goal/src/index.ts`](../packages/goal/tool-goal/src/index.ts)

### `get_goal`

Leer el goal de la sesión actual, incluidos el id y la revisión que update_goal requiere.

```json
{
  "type": "object",
  "properties": {}
}
```

Fuente: [`packages/goal/tool-goal/src/index.ts`](../packages/goal/tool-goal/src/index.ts)

### `update_goal`

Actualizar el goal actual.

```json
{
  "type": "object",
  "properties": {
    "goal_id": {
      "type": "string",
      "description": "Exact id returned by get_goal."
    },
    "revision": {
      "type": "number",
      "description": "Exact positive revision returned by get_goal."
    },
    "action": {
      "type": "string",
      "description": "edit, pause, and resume require a direct top-level human request. complete and blocked are also allowed during an automatic continuation of this goal; blocked is rejected before the configured minimum round count.",
      "enum": [
        "edit",
        "pause",
        "resume",
        "complete",
        "blocked"
      ]
    },
    "objective": {
      "type": "string",
      "description": "Replacement objective; valid only with action edit."
    },
    "max_goal_rounds": {
      "type": "number",
      "description": "Replacement cap; valid only with action edit."
    },
    "blocked_reason": {
      "type": "string",
      "description": "Required only with action blocked: the concrete condition that persisted across rounds and blocks progress."
    }
  },
  "required": [
    "goal_id",
    "revision",
    "action"
  ]
}
```

Fuente: [`packages/goal/tool-goal/src/index.ts`](../packages/goal/tool-goal/src/index.ts)

create, edit, pause y resume requieren la autoridad raíz del humano directo; complete y blocked también aceptan el Round de goal actual exacto. El límite inferior por defecto de blocked es de tres Rounds admitidos.

<a id="deepseek-aidsh-schedule"></a>

## `@deepseek-ai/dsh-schedule`

### `schedule_create`

Crear un recordatorio en la sesión actual que entrega el prompt cuando vence. Suministrar exactamente un parámetro de tiempo: after_seconds, at, every_seconds, daily, weekly o cron. Las horas locales que no existen en la zona se omiten; las horas locales repetidas se disparan una vez, en el instante más temprano. Tras un tiempo de inactividad, un recordatorio recurrente entrega solo su última ocurrencia perdida. La entrega puede repetirse tras un fallo.

```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "Reminder content to present when the target becomes due."
    },
    "title": {
      "type": "string",
      "description": "Task name of at most 120 characters, shown on the task card and in task lists."
    },
    "after_seconds": {
      "type": "number",
      "description": "Delay in whole seconds."
    },
    "every_seconds": {
      "type": "number",
      "description": "Fixed-rate interval in whole seconds, at least 60, aligned to the creation time; changing it with schedule_update re-aligns it to the save time."
    },
    "daily": {
      "type": "object",
      "description": "Every day at a local time.",
      "additionalProperties": false,
      "properties": {
        "time": {
          "type": "string",
          "description": "HH:mm:ss with optional 1-3 fractional digits, for example 23:00:00."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        }
      },
      "required": [
        "time",
        "time_zone"
      ]
    },
    "weekly": {
      "type": "object",
      "description": "On the given weekdays at a local time.",
      "additionalProperties": false,
      "properties": {
        "time": {
          "type": "string",
          "description": "HH:mm:ss with optional 1-3 fractional digits, for example 09:00:00."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        },
        "weekdays": {
          "type": "array",
          "description": "ISO weekdays, Monday 1 through Sunday 7, without repetitions.",
          "items": {
            "type": "integer"
          }
        }
      },
      "required": [
        "time",
        "time_zone",
        "weekdays"
      ]
    },
    "cron": {
      "type": "object",
      "description": "Five-field Vixie cron expression in a time zone.",
      "additionalProperties": false,
      "properties": {
        "expression": {
          "type": "string",
          "description": "minute hour day-of-month month day-of-week, for example \"*/15 9-17 * * 1-5\". When both day fields are restricted, a date matches if either one matches."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        }
      },
      "required": [
        "expression",
        "time_zone"
      ]
    },
    "at": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "date": {
              "type": "string"
            },
            "time": {
              "type": "string"
            },
            "time_zone": {
              "type": "string"
            }
          },
          "required": [
            "date",
            "time",
            "time_zone"
          ]
        }
      ],
      "description": "Absolute target: an RFC 3339 date-time with offset, or a local date, time, and IANA time_zone."
    }
  },
  "required": [
    "prompt",
    "title"
  ]
}
```

Fuente: [`packages/schedule/schedule/src/tools.ts`](../packages/schedule/schedule/src/tools.ts)

### `schedule_delete`

Eliminar un recordatorio de la sesión actual, activo o inactivo. La eliminación no retira un mensaje de recordatorio ya encolado.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Schedule id returned by schedule_list."
    }
  },
  "required": [
    "id"
  ]
}
```

Fuente: [`packages/schedule/schedule/src/tools.ts`](../packages/schedule/schedule/src/tools.ts)

### `schedule_list`

Listar los recordatorios activos de la sesión actual.

```json
{
  "type": "object",
  "properties": {}
}
```

Fuente: [`packages/schedule/schedule/src/tools.ts`](../packages/schedule/schedule/src/tools.ts)

### `schedule_update`

Cambiar un recordatorio en su lugar, conservando su id. Suministrar un título nuevo, un prompt o como máximo un parámetro de tiempo; los campos omitidos conservan sus valores almacenados. Para cambiar un retardo relativo, crear un recordatorio nuevo.

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Schedule id returned by schedule_list."
    },
    "title": {
      "type": "string",
      "description": "New task name of at most 120 characters."
    },
    "prompt": {
      "type": "string",
      "description": "New reminder content."
    },
    "every_seconds": {
      "type": "number",
      "description": "Fixed-rate interval in whole seconds, at least 60, aligned to the creation time; changing it with schedule_update re-aligns it to the save time."
    },
    "daily": {
      "type": "object",
      "description": "Every day at a local time.",
      "additionalProperties": false,
      "properties": {
        "time": {
          "type": "string",
          "description": "HH:mm:ss with optional 1-3 fractional digits, for example 23:00:00."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        }
      },
      "required": [
        "time",
        "time_zone"
      ]
    },
    "weekly": {
      "type": "object",
      "description": "On the given weekdays at a local time.",
      "additionalProperties": false,
      "properties": {
        "time": {
          "type": "string",
          "description": "HH:mm:ss with optional 1-3 fractional digits, for example 09:00:00."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        },
        "weekdays": {
          "type": "array",
          "description": "ISO weekdays, Monday 1 through Sunday 7, without repetitions.",
          "items": {
            "type": "integer"
          }
        }
      },
      "required": [
        "time",
        "time_zone",
        "weekdays"
      ]
    },
    "cron": {
      "type": "object",
      "description": "Five-field Vixie cron expression in a time zone.",
      "additionalProperties": false,
      "properties": {
        "expression": {
          "type": "string",
          "description": "minute hour day-of-month month day-of-week, for example \"*/15 9-17 * * 1-5\". When both day fields are restricted, a date matches if either one matches."
        },
        "time_zone": {
          "type": "string",
          "description": "UTC or IANA Area/Location, for example Asia/Shanghai."
        }
      },
      "required": [
        "expression",
        "time_zone"
      ]
    },
    "at": {
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "date": {
              "type": "string"
            },
            "time": {
              "type": "string"
            },
            "time_zone": {
              "type": "string"
            }
          },
          "required": [
            "date",
            "time",
            "time_zone"
          ]
        }
      ],
      "description": "Absolute target: an RFC 3339 date-time with offset, or a local date, time, and IANA time_zone."
    }
  },
  "required": [
    "id"
  ]
}
```

Fuente: [`packages/schedule/schedule/src/tools.ts`](../packages/schedule/schedule/src/tools.ts)

Registrados en los ámbitos del Agent raíz en vivo mientras el servicio Schedule está cargado. Acepta after_seconds, un at absoluto explícito, every_seconds acotado de tasa fija, horas locales diarias y semanales en una zona IANA explícita, y cron como expresión de cinco campos. La gestión usa el dominio de almacenamiento del Host; los mensajes vencidos reanudan la Session original.

<a id="deepseek-aidsh-tool-lsp"></a>

## `@deepseek-ai/dsh-tool-lsp`

### `lsp`

Consultar un servidor de lenguaje para navegación precisa por el código. operation es una de goToDefinition, findReferences, goToImplementation, hover. line y character son coordenadas de cursor UTF-16 con base uno. findReferences incluye la declaración.

```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "description": "goToDefinition, findReferences, goToImplementation, or hover.",
      "enum": [
        "goToDefinition",
        "findReferences",
        "goToImplementation",
        "hover"
      ]
    },
    "file_path": {
      "type": "string",
      "description": "The source file to query, relative to the workspace or absolute."
    },
    "line": {
      "type": "number",
      "description": "One-based line of the cursor."
    },
    "character": {
      "type": "number",
      "description": "One-based UTF-16 column of the cursor."
    }
  },
  "required": [
    "operation",
    "file_path",
    "line",
    "character"
  ]
}
```

Fuente: [`packages/lsp/tool-lsp/src/index.ts`](../packages/lsp/tool-lsp/src/index.ts)

El tool lsp mantiene la selección de proveedor y los subprocesos de servidor de lenguaje detrás de ctx.lsp, de modo que su schema visible al modelo permanece estable entre proveedores. Requiere un proveedor registrado (p. ej. `@deepseek-ai/dsh-lsp-stdio`) en runtime; sin uno, una consulta devuelve el error estructurado `LSP_UNAVAILABLE` en lugar de cambiar el schema.

<a id="deepseek-aidsh-tool-ralph"></a>

## `@deepseek-ai/dsh-tool-ralph`

### `ralph`

Ejecutar un bucle Ralph de agents frescos en primer plano hacia un objetivo inmutable. Usar solo cuando el humano directo pide explícitamente Ralph o iteración con agents frescos. Cada Round abre un hijo nuevo sin conversación padre ni sesión hija previa; el espacio de trabajo compartido es la memoria a largo plazo, y solo un informe estructurado acotado cruza Rounds. La llamada vuelve cuando un worker reporta finalización o un bloqueo concreto, o al límite de Rounds. El trabajo ordinario de larga duración en la misma sesión pertenece a los tools de goal.

```json
{
  "type": "object",
  "properties": {
    "objective": {
      "type": "string",
      "description": "The immutable completion objective for every fresh Ralph round."
    },
    "maxRounds": {
      "type": "number",
      "description": "Optional positive safe-integer round cap, bounded by the deployment ceiling."
    }
  },
  "required": [
    "objective"
  ]
}
```

Fuente: [`packages/workflow/tool-ralph/src/index.ts`](../packages/workflow/tool-ralph/src/index.ts)

Un workflow fijo en primer plano inicia un hijo estructurado fresco por Round; el modelo selecciona solo el objetivo inmutable y un tope opcional de Rounds.

<a id="deepseek-aidsh-tool-skill"></a>

## `@deepseek-ai/dsh-tool-skill`

### `skill`

Cargar las instrucciones completas de una skill (habilidad). Llamarlo antes de actuar en una tarea que nombre o coincida claramente con una skill del catálogo de skills de la sesión.

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "The exact skill name from the available skills list."
    }
  },
  "required": [
    "name"
  ]
}
```

Fuente: [`packages/skill/tool-skill/src/index.ts`](../packages/skill/tool-skill/src/index.ts)

<a id="deepseek-aidsh-tool-session-query"></a>

## `@deepseek-ai/dsh-tool-session-query`

### `session_event_read`

Leer un evento completo sin abreviar y resúmenes opcionales de eventos en crudo vecinos de una sesión autorizada.

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Target session id. Omit for the current session."
    },
    "seq": {
      "type": "integer",
      "description": "Target event sequence number."
    },
    "before": {
      "type": "integer",
      "description": "Number of preceding raw events to summarize. Omit for none."
    },
    "after": {
      "type": "integer",
      "description": "Number of following raw events to summarize. Omit for none."
    }
  },
  "required": [
    "seq"
  ]
}
```

Fuente: [`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

### `session_event_search`

Buscar eventos anteriores en una sesión autorizada; la sesión actual excluye el paso que realiza esta llamada.

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Target session id. Omit for the current session."
    },
    "query": {
      "type": "string",
      "description": "Literal full-text query over the target session."
    },
    "seq_from": {
      "type": "integer",
      "description": "Inclusive event sequence lower bound."
    },
    "seq_to": {
      "type": "integer",
      "description": "Inclusive event sequence upper bound."
    },
    "time_from": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 event-time lower bound."
    },
    "time_to": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 event-time upper bound."
    },
    "event_types": {
      "type": "array",
      "description": "Event types to include.",
      "items": {
        "type": "string"
      }
    },
    "surfaces": {
      "type": "array",
      "description": "Event surfaces to include.",
      "items": {
        "type": "string",
        "enum": [
          "current",
          "shadowed",
          "log-only"
        ]
      }
    }
  },
  "required": [
    "query"
  ]
}
```

Fuente: [`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

### `session_event_trace`

Leer cada reemplazo directo y relación con un evento fuente citado para un evento de una sesión autorizada.

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Target session id. Omit for the current session."
    },
    "seq": {
      "type": "integer",
      "description": "Target event sequence number."
    }
  },
  "required": [
    "seq"
  ]
}
```

Fuente: [`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

### `session_search`

Buscar sesiones anteriores en el espacio de trabajo del llamante y devolver el evento más coincidente de cada sesión.

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Literal full-text query over prior session history."
    },
    "session_ids": {
      "type": "array",
      "description": "Optional session ids to include.",
      "items": {
        "type": "string"
      }
    },
    "created_at_from": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 creation-time lower bound."
    },
    "created_at_to": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 creation-time upper bound."
    },
    "parent_session_ids": {
      "type": "array",
      "description": "Optional direct parent session ids.",
      "items": {
        "type": "string"
      }
    },
    "include_root_sessions": {
      "type": "boolean",
      "description": "Include sessions with no parent in the parent filter."
    },
    "availability": {
      "type": "array",
      "description": "Require at least one selected source availability.",
      "items": {
        "type": "string",
        "enum": [
          "live",
          "persisted"
        ]
      }
    },
    "event_seq_from": {
      "type": "integer",
      "description": "Inclusive event sequence lower bound."
    },
    "event_seq_to": {
      "type": "integer",
      "description": "Inclusive event sequence upper bound."
    },
    "event_time_from": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 event-time lower bound."
    },
    "event_time_to": {
      "type": "string",
      "description": "Inclusive timezone-qualified ISO 8601 event-time upper bound."
    },
    "event_types": {
      "type": "array",
      "description": "Event types to include.",
      "items": {
        "type": "string"
      }
    },
    "event_surfaces": {
      "type": "array",
      "description": "Event surfaces to include.",
      "items": {
        "type": "string",
        "enum": [
          "current",
          "shadowed",
          "log-only"
        ]
      }
    }
  },
  "required": [
    "query"
  ]
}
```

Fuente: [`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

### `session_trace`

Leer el linaje de sesiones autorizadas alrededor de una sesión, incluidas las relaciones completas visibles de antecesoras y descendientes.

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Target session id. Omit for the current session."
    }
  }
}
```

Fuente: [`packages/session-query/tool-session-query/src/index.ts`](../packages/session-query/tool-session-query/src/index.ts)

Los cinco tools de solo lectura ocultan los cursores de proveedor y autorizan cada resultado desde la sesión inmutable del agent que llama. El paquete es opt-in; las composiciones que necesitan plazos aplicados o salida en línea acotada también montan las políticas genéricas de timeout o de spill.

<a id="deepseek-aidsh-tool-subagent"></a>

## `@deepseek-ai/dsh-tool-subagent`

### `list_subagent_models`

Descubrir rutas de LLM (modelo de lenguaje grande) para subagents sin cambiar el Agent actual. Llamar sin argumentos para listar los proveedores registrados, con `provider` para listar sus modelos anunciados, o con `provider` y `model` para inspeccionar ese modelo exacto y sus intensidades de razonamiento. La pertenencia al catálogo es orientativa: un adaptador puede aceptar un id de modelo no listado. Usar los ids devueltos con los campos `provider`, `model` y `reasoning_effort` de un tool de delegación.

```json
{
  "type": "object",
  "properties": {
    "provider": {
      "type": "string",
      "description": "Registered LLM provider id. Omit to list providers."
    },
    "model": {
      "type": "string",
      "description": "Exact model id to inspect. Requires provider; omit to list that provider's advertised models."
    }
  }
}
```

Fuente: [`packages/subagent/tool-subagent/src/list-models.ts`](../packages/subagent/tool-subagent/src/list-models.ts)

### `subagent`

Delegar una tarea autocontenida a un subagent (un agent separado que trabaja en su propio contexto) para descargar trabajo enfocado e independiente (investigación, una implementación acotada, un análisis), de modo que no consuma el contexto de esta conversación. El subagent devuelve su resultado, no sus pasos intermedios. Esta llamada espera el resultado por defecto.

```json
{
  "type": "object",
  "properties": {
    "description": {
      "type": "string",
      "description": "A short (3-5 word) description of the delegated task, for display."
    },
    "prompt": {
      "type": "string",
      "description": "The complete, self-contained task for the subagent. It does not share this conversation's context, so include everything it needs."
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Run as a background job and return its id (collect with job_output, stop with job_kill). Defaults to false."
    }
  },
  "required": [
    "description",
    "prompt"
  ]
}
```

Fuente: [`packages/subagent/tool-subagent/src/index.ts`](../packages/subagent/tool-subagent/src/index.ts)

El nombre de delegación registrado es la configuración `toolName` en tiempo de carga (por defecto `subagent`); el schema por defecto anterior tiene la selección de modelo desactivada, mientras que el schema de descubrimiento se muestra como la herramienta complementaria fija disponible en una Session habilitada. Los presets de Web muestrean la preferencia de Plugins para cada nueva Session de nivel superior y preservan esa decisión para sus Sessions hijas; `subagent_fork` permanece de ruta fija. Cada instancia controla independientemente si lee la configuración de selección de modelo y su comportamiento en segundo plano mediante `modelSelectionSettings`, `backgroundMode` y `enableRunInBackground`.

<a id="deepseek-aidsh-tool-subagent-control"></a>

## `@deepseek-ai/dsh-tool-subagent-control`

### `interrupt_agent`

Pedir a un subagent que detenga su trabajo actual. Esta llamada vuelve sin esperar a que se detenga. Se puede continuar la conversación de un hijo directo más tarde con send_message. Los subagents que haya iniciado seguirán corriendo.

```json
{
  "type": "object",
  "properties": {
    "agent_id": {
      "type": "string",
      "description": "The id of an agent created under you: your direct child or a deeper descendant."
    }
  },
  "required": [
    "agent_id"
  ]
}
```

Fuente: [`packages/subagent/tool-subagent-control/src/index.ts`](../packages/subagent/tool-subagent-control/src/index.ts)

### `list_agents`

Listar los subagents iniciados, con sus ids, etiquetas y estados. running significa que está trabajando; inactive significa que no está trabajando actualmente. Se notifica cuando un subagent termina; no hace falta seguir comprobando su estado. Usar send_message para continuar la conversación.

```json
{
  "type": "object",
  "properties": {
    "scope": {
      "type": "string",
      "description": "children (default) lists direct children, which accept send_message in any status. descendants lists the whole tree below you with each entry's parent session id and depth; entries deeper than 1 accept only interrupt_agent.",
      "enum": [
        "children",
        "descendants"
      ]
    }
  }
}
```

Fuente: [`packages/subagent/tool-subagent-control/src/list-agents.ts`](../packages/subagent/tool-subagent-control/src/list-agents.ts)

### `send_message`

Enviar un mensaje a un agent. Un agent que trabaja lo recibe en su siguiente paso; un agent inactivo inicia un turno nuevo con él. Devuelve confirmación de entrega, no la respuesta del agent.

```json
{
  "type": "object",
  "properties": {
    "agent_id": {
      "type": "string",
      "description": "The agent id of your direct continuable child, or your direct parent when you are a resident continuable child."
    },
    "message": {
      "type": "string",
      "description": "The message to deliver to the agent."
    }
  },
  "required": [
    "agent_id",
    "message"
  ]
}
```

Fuente: [`packages/subagent/tool-subagent-control/src/index.ts`](../packages/subagent/tool-subagent-control/src/index.ts)

Los tools de control con nombre global sobre subagents continuables en segundo plano: las instancias de `tool-subagent` vinculadas a un proveedor registran tools de delegación distintos, mientras que este paquete registra `send_message` e `interrupt_agent` una vez, más `list_agents` desde su plugin `/list-agents` cargado por separado (cuyas filas de catálogo usan los registries sessionProjections y de Agents en vivo).

<a id="deepseek-aidsh-tool-jobs"></a>

## `@deepseek-ai/dsh-tool-jobs`

### `job_kill`

Solicitar la cancelación de una tarea en segundo plano en ejecución.

```json
{
  "type": "object",
  "properties": {
    "job_id": {
      "type": "string",
      "description": "Job id returned by the tool that started the background work."
    },
    "reason": {
      "type": "string",
      "description": "Optional short reason, recorded in the log and forwarded to the job."
    }
  },
  "required": [
    "job_id"
  ]
}
```

Fuente: [`packages/jobs/tool-jobs/src/index.ts`](../packages/jobs/tool-jobs/src/index.ts)

### `job_list`

Listar las tareas en segundo plano (en ejecución y terminadas) con sus ids, tipos y estados.

```json
{
  "type": "object",
  "properties": {}
}
```

Fuente: [`packages/jobs/tool-jobs/src/index.ts`](../packages/jobs/tool-jobs/src/index.ts)

### `job_output`

Leer una tarea en segundo plano: la salida desde la lectura anterior para tareas de flujo, o el resultado de una tarea terminada de salida final.

```json
{
  "type": "object",
  "properties": {
    "job_id": {
      "type": "string",
      "description": "Job id returned by the tool that started the background work."
    },
    "wait": {
      "type": "boolean",
      "description": "Block until the job finishes or the timeout expires; a timed-out wait leaves the job running. Defaults to false."
    },
    "timeout_ms": {
      "type": "number",
      "description": "Max wait in milliseconds with wait: true. Defaults to and is capped by configuration."
    }
  },
  "required": [
    "job_id"
  ]
}
```

Fuente: [`packages/jobs/tool-jobs/src/index.ts`](../packages/jobs/tool-jobs/src/index.ts)

El controlador de tareas en segundo plano agnóstico de tipo: los comandos bash en segundo plano, los envíos PTY y los subagents se leen, listan y matan mediante los mismos tres tools. Cargar el plugin adjunta el controlador que arma el `ctx.jobs.start()` de los productores.

<a id="deepseek-aidsh-experimental-tool-agent-team"></a>

## `@deepseek-ai/dsh-experimental-tool-agent-team`

### `interrupt_agent`

Interrumpir el turno actual de un teammate conservando su bandeja de entrada pendiente. Solo Team Lead.

```json
{
  "type": "object",
  "properties": {
    "target": {
      "type": "string",
      "description": "Teammate target returned by spawn_teammate or list_agents."
    }
  },
  "required": [
    "target"
  ]
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `list_agents`

Listar el Lead y cada teammate durable con un objetivo direccionable y su disponibilidad actual. inactive significa que ningún turno se está ejecutando, no un resultado de tarea. provisioning y failed describen la creación del miembro.

```json
{
  "type": "object",
  "properties": {}
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `send_message`

Enviar un mensaje durable a otro miembro del Team. Un objetivo en ejecución lo recibe en el límite de paso más cercano; un objetivo inactivo inicia o reanuda un turno.

```json
{
  "type": "object",
  "properties": {
    "target": {
      "type": "string",
      "description": "Member target returned by spawn_teammate or list_agents, including lead."
    },
    "message": {
      "type": "string",
      "description": "Self-contained message for the target."
    }
  },
  "required": [
    "target",
    "message"
  ]
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `spawn_teammate`

Crear un teammate durable con nombre. Solo el Team Lead puede llamar a este tool.

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Unique lower-kebab-case teammate name."
    },
    "description": {
      "type": "string",
      "description": "Short description of the delegated responsibility."
    },
    "prompt": {
      "type": "string",
      "description": "Complete initial task for the teammate."
    },
    "context": {
      "type": "string",
      "description": "fresh starts without Lead history; fork inherits completed Lead turns. Defaults to fresh.",
      "enum": [
        "fresh",
        "fork"
      ]
    }
  },
  "required": [
    "name",
    "description",
    "prompt"
  ]
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `team_task_create`

Crear una tarea pendiente sin propietario en el tablero de tareas compartido del Team.

```json
{
  "type": "object",
  "properties": {
    "subject": {
      "type": "string",
      "description": "Concise task title."
    },
    "description": {
      "type": "string",
      "description": "Complete task details and acceptance criteria."
    },
    "blocked_by": {
      "type": "array",
      "description": "Task ids that must complete first.",
      "items": {
        "type": "string"
      }
    },
    "write_scopes": {
      "type": "array",
      "description": "Advisory workspace-relative file or directory prefixes this task expects to modify.",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "subject",
    "description"
  ]
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `team_task_get`

Leer el valor completo más reciente de una tarea compartida antes de cambiarla o ejecutarla.

```json
{
  "type": "object",
  "properties": {
    "task_id": {
      "type": "string",
      "description": "Shared task id."
    }
  },
  "required": [
    "task_id"
  ]
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `team_task_list`

Listar las tareas compartidas, incluidas la preparación, el propietario, la revisión, los bloqueos y las advertencias de ámbito de escritura.

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "Optional exact status filter.",
      "enum": [
        "pending",
        "in_progress",
        "completed"
      ]
    },
    "owner": {
      "type": "string",
      "description": "Optional member target from spawn_teammate or list_agents, matching ownerName; use unowned for tasks without an owner."
    },
    "ready": {
      "type": "boolean",
      "description": "Optional readiness filter."
    },
    "cursor": {
      "type": "integer",
      "description": "Zero-based result offset. Defaults to 0."
    },
    "limit": {
      "type": "integer",
      "description": "Number of rows, 1 through 100. Defaults to 50."
    }
  }
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `team_task_update`

Hacer compare-and-set de una acción de tarea compartida usando la revisión más reciente de team_task_get o team_task_list.

```json
{
  "type": "object",
  "properties": {
    "task_id": {
      "type": "string",
      "description": "Shared task id."
    },
    "expected_revision": {
      "type": "integer",
      "description": "Current task revision used as the CAS precondition."
    },
    "action": {
      "type": "string",
      "description": "Task transition to apply.",
      "enum": [
        "claim",
        "release",
        "edit",
        "set_dependencies",
        "complete",
        "reopen",
        "reassign",
        "delete"
      ]
    },
    "subject": {
      "type": "string",
      "description": "Replacement title for edit."
    },
    "description": {
      "type": "string",
      "description": "Replacement details for edit."
    },
    "blocked_by": {
      "type": "array",
      "description": "Complete blocker list for set_dependencies.",
      "items": {
        "type": "string"
      }
    },
    "write_scopes": {
      "type": "array",
      "description": "Replacement advisory write scopes for edit.",
      "items": {
        "type": "string"
      }
    },
    "owner": {
      "type": "string",
      "description": "Member target from spawn_teammate or list_agents for Lead-only reassign; omit to unassign."
    }
  },
  "required": [
    "task_id",
    "expected_revision",
    "action"
  ]
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

### `wait_agent`

Esperar el siguiente cambio de estado de teammate, de buzón o de tarea compartida después de que empiece esta llamada. Nunca despierta a miembros inactivos y devuelve noProgress inmediatamente cuando ningún otro miembro está corriendo o en provisioning. Volver a listar tras el despertar o el timeout en lugar de sondear.

```json
{
  "type": "object",
  "properties": {
    "timeout_ms": {
      "type": "integer",
      "description": "Wait duration in milliseconds, from 10000 through 3600000. Defaults to 30000."
    }
  }
}
```

Fuente: [`packages/experimental/tool-agent-team/src/index.ts`](../packages/experimental/tool-agent-team/src/index.ts)

Los nueve tools están acotados a Team Leads implícitos y teammates durables. El bundle dsh-base entregado mantiene el paquete deshabilitado; el parche de perfil documentado de Agent Teams lo habilita mientras deshabilita los nombres de control heredados de hijos continuables.

<a id="deepseek-aidsh-tool-todo"></a>

## `@deepseek-ai/dsh-tool-todo`

### `todo_write`

Registrar y actualizar una lista de tareas para planificar trabajo de varios pasos y mostrar el progreso; omitirlo para tareas triviales de un solo paso. Añadir un todo por paso concreto antes de empezar. Mientras quede trabajo, mantener los todos en curso como `in_progress`, varios solo cuando el trabajo corre en paralelo. Marcar cada todo como `completed` en cuanto esté hecho.

```json
{
  "type": "object",
  "properties": {
    "todos": {
      "type": "array",
      "description": "The COMPLETE task list, replacing any previous list.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "content": {
            "type": "string",
            "description": "What the task is — a short imperative line."
          },
          "status": {
            "type": "string",
            "description": "pending (not started) | in_progress (now) | completed (done).",
            "enum": [
              "pending",
              "in_progress",
              "completed"
            ]
          }
        },
        "required": [
          "content",
          "status"
        ]
      }
    }
  },
  "required": [
    "todos"
  ]
}
```

Fuente: [`packages/todo/tool-todo/src/index.ts`](../packages/todo/tool-todo/src/index.ts)

todo_write es estado propiedad de la sesión; las UI renderizan el último evento todo/write como checklist. `allowParallelInProgress` es obligatorio sin valor por defecto, así que el catálogo declara su elección: `true`, cuya descripción invita a varios elementos `in_progress`. Un despliegue que elige `false` recibe el mismo tool con una descripción que pide exactamente una tarea activa.

<a id="deepseek-aidsh-tool-workflow"></a>

## `@deepseek-ai/dsh-tool-workflow`

### `workflow`

Ejecutar un script de workflow de JavaScript que orquesta subagents a escala. Usarlo para trabajo que se ramifica en muchas piezas independientes (una auditoría sobre muchos archivos, una migración, investigación multiángulo, verificación adversaria de hallazgos), donde la orquestación se escribe como script en lugar de delegar turno a turno.

Hooks del cuerpo del script:
- `agent(prompt, opts?): Promise<any>`: ejecuta un subagent hasta su finalización. Sin `opts.schema` resuelve al texto final del hijo; con `opts.schema` (un JSON Schema con raíz de objeto que usa SOLO type/properties/required/additionalProperties/items/enum/const/oneOf) resuelve al objeto validado. Resuelve `null` cuando el hijo falla (filtrar con `.filter(Boolean)`). Otros opts: `label` (visualización), `phase` (grupo de progreso) y anulaciones independientes del objetivo LLM `provider`/`model`.
- `pipeline(items, ...stages): Promise<any[]>`: ejecuta cada elemento por las etapas independientemente, SIN barrera entre etapas (preferirlo para trabajo multietapa). Cada etapa recibe `(prev, item, index)`. Un throw de una etapa descarta ese ELEMENTO a `null` y omite sus etapas restantes.
- `parallel(thunks): Promise<any[]>`: ejecuta funciones de cero argumentos concurrentemente y espera a TODAS (una barrera; usar solo cuando una etapa necesita genuinamente todos los resultados anteriores juntos). Un thunk que lanza resuelve a `null`.
- `phase(title)`: inicia una fase de progreso; `log(message)`: narra el progreso; `args`: la entrada `args` de la llamada a tool, verbatim.

Los hooks mal usados (argumentos incorrectos, opciones desconocidas, schemas no soportados, topes alcanzados) terminan el script entero en lugar de producir `null`. El script no tiene API de sistema de archivos, red, temporizadores ni Node.js; los agents hacen el trabajo.

```json
{
  "type": "object",
  "properties": {
    "script": {
      "type": "string",
      "description": "The plain JavaScript body, not TypeScript and without an `export const meta` statement; top-level await is allowed. End with `return <value>`; the JSON-serializable value is this tool's result."
    },
    "meta": {
      "type": "object",
      "description": "The workflow identity as plain JSON, not code.",
      "additionalProperties": true,
      "properties": {
        "name": {
          "type": "string",
          "description": "Short kebab-case workflow name."
        },
        "description": {
          "type": "string",
          "description": "One-line description of what the workflow does."
        },
        "whenToUse": {
          "type": "string",
          "description": "Optional guidance on when this workflow applies."
        },
        "phases": {
          "type": "array",
          "description": "Optional phase declarations matched by phase() calls.",
          "items": {
            "type": "object",
            "additionalProperties": true,
            "properties": {
              "title": {
                "type": "string",
                "description": "The phase title phase() calls match by exact string."
              },
              "detail": {
                "type": "string",
                "description": "Optional one-line description of the phase."
              },
              "provider": {
                "type": "string",
                "description": "Optional provider override this phase is expected to use."
              },
              "model": {
                "type": "string",
                "description": "Optional model override this phase is expected to use."
              }
            },
            "required": [
              "title"
            ]
          }
        }
      },
      "required": [
        "name",
        "description"
      ]
    },
    "args": {
      "type": "object",
      "description": "Optional JSON input exposed to the script as the `args` global (wrap a bare list as a field, e.g. {\"files\": [...]}).",
      "additionalProperties": true
    },
    "run_in_background": {
      "type": "boolean",
      "description": "Run as a background job: return a job id immediately instead of waiting; the return value arrives with the completion notice."
    }
  },
  "required": [
    "script",
    "meta"
  ]
}
```

Fuente: [`packages/workflow/tool-workflow/src/index.ts`](../packages/workflow/tool-workflow/src/index.ts)

<a id="deepseek-aidsh-tool-workspace-dependencies"></a>

## `@deepseek-ai/dsh-tool-workspace-dependencies`

### `load_workspace_dependencies`

Obtener rutas absolutas a los directorios del Python incluido y de sus bibliotecas, además de las versiones de la distribución de Python incluida. Las rutas de Node.js y pnpm se incluyen cuando la carga las aporta. Python incluye numpy, pandas, python-docx, python-pptx, openpyxl, Pillow, lxml y XlsxWriter. Usar estas bibliotecas para archivos de Office salvo que el usuario o las instrucciones del espacio de trabajo seleccionen otro entorno. Cuando se devuelven las rutas de Node.js y pnpm, ejecutar pnpm con ese ejecutable de Node y esa ruta de script de pnpm. Esto no cambia PATH ni la configuración del gestor de paquetes.

```json
{
  "type": "object",
  "properties": {}
}
```

Fuente: [`packages/skill/tool-workspace-dependencies/src/index.ts`](../packages/skill/tool-workspace-dependencies/src/index.ts)

<a id="deepseek-aidsh-tool-web"></a>

## `@deepseek-ai/dsh-tool-web`

### `web_fetch`

Recuperar el contenido de una URL HTTP(S) concreta y devolverlo decodificado a texto.

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "The HTTP(S) URL to fetch."
    }
  },
  "required": [
    "url"
  ]
}
```

Fuente: [`packages/web/tool-web/src/index.ts`](../packages/web/tool-web/src/index.ts)

### `web_search`

Buscar información actual en la web. Devuelve una respuesta resumida opcional y una lista de URL fuente.

```json
{
  "type": "object",
  "properties": {
    "queries": {
      "type": "array",
      "description": "1–4 search queries; their results are merged.",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "queries"
  ]
}
```

Fuente: [`packages/web/tool-web/src/index.ts`](../packages/web/tool-web/src/index.ts)

web_search y web_fetch mantienen la selección de proveedor detrás de ctx.web, de modo que los schemas visibles al modelo permanecen estables ante cambios de backend.

<a id="deepseek-aidsh-memory-tool"></a>

## `@deepseek-ai/dsh-memory-tool`

### `memory`

Notas de memoria persistente que sobreviven entre sesiones en esta máquina. Úsalas para recordar decisiones de proyecto, preferencias de estilo de código, elecciones de arquitectura o cualquier contexto que valga la pena preservar para sesiones posteriores. Acciones: read (key), write (key + content), delete (key), list.

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "description": "Operation: read, write, delete, or list.",
      "enum": [
        "read",
        "write",
        "delete",
        "list"
      ]
    },
    "key": {
      "type": "string",
      "description": "Memory key (becomes the note filename). Required for read, write, and delete."
    },
    "content": {
      "type": "string",
      "description": "Note body; required for write, ignored otherwise."
    }
  },
  "required": [
    "action"
  ]
}
```

Fuente: [`packages/memory/memory-tool/src/index.ts`](../packages/memory/memory-tool/src/index.ts)

Memory almacena notas con clave como Markdown local bajo el home del harness; la sección de prompt `tool:memory` lista las claves almacenadas y no renderiza nada mientras el almacén está vacío.

<a id="deepseek-aidsh-github-connector"></a>

## `@deepseek-ai/dsh-github-connector`

### `github`

Leer, buscar y comentar issues y pull requests de GitHub mediante la API REST. Acciones: issue-search (query), issue-get (owner/repo/number), issue-comment (owner/repo/number/body, requiere acceso de escritura), pr-search (query), pr-get (owner/repo/number), pr-list (owner/repo, estado opcional). Requiere un token de GitHub configurado.

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "description": "Operation to perform.",
      "enum": [
        "issue-search",
        "issue-get",
        "issue-comment",
        "pr-search",
        "pr-get",
        "pr-list"
      ]
    },
    "query": {
      "type": "string",
      "description": "Search text; required for the *-search actions."
    },
    "owner": {
      "type": "string",
      "description": "Repository owner; required for single-repo actions."
    },
    "repo": {
      "type": "string",
      "description": "Repository name; required for single-repo actions."
    },
    "number": {
      "type": "integer",
      "description": "Issue or pull request number; required for get and comment."
    },
    "body": {
      "type": "string",
      "description": "Comment text; required for issue-comment."
    },
    "state": {
      "type": "string",
      "description": "Pull request state filter for pr-list; defaults to open.",
      "enum": [
        "open",
        "closed",
        "all"
      ]
    }
  },
  "required": [
    "action"
  ]
}
```

Fuente: [`packages/connectors/github/src/index.ts`](../packages/connectors/github/src/index.ts)

Un tool `github` sobre la API REST; el token se resuelve del almacén de credenciales en cada petición, e issue-comment requiere el ajuste de despliegue allowWrites.
