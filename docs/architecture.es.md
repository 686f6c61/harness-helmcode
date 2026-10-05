# Arquitectura de DeepSeek Harness

[English](architecture.md) | Español

Leer esto antes de cambiar cualquier cosa bajo `packages/`. Presupone conocimiento de Cordis; si no se tiene, empezar por el [primer](cordis-primer.es.md) o el [tutorial](cordis-tutorial/index.es.md).

Recomendamos usar un agent para explorar el código base y comprender su arquitectura.

## Cordis

[Cordis](cordis-primer.es.md) es el framework bajo dsh: los plugins contribuyen servicios, eventos tipados y efectos reversibles a un contexto compartido. Cada parte del producto es un plugin, incluidos el adaptador de modelo, el registry de tools, el registro de sesión y el propio agent loop, de modo que cada uno es reemplazable desde la configuración.

No hay ningún núcleo privilegiado que parchear: dsh se extiende montando un plugin junto a los demás, y los registros son efectos que se deshacen cuando su plugin se descarga.

## Perfiles y bundles

Un `dsh` en ejecución es un árbol de plugins compuesto en el arranque a partir de capas ordenadas.

Un **perfil** es una composición con nombre almacenada en el home de Harness. Enumera los bundles que apila, contiene los plugins fuera del árbol que instala y guarda el `cordis.patch.yml` propio del usuario. `web`, `headless`, `sdk`, `sdk-minimal` y `acp` se distribuyen como plantillas.

Un **bundle** es un formato de distribución para filas de configuración de Cordis y el código que montan, de modo que lo que inserte siga siendo parcheable por las capas superiores.

Cada uno se declara en su propio `package.json` bajo un campo `dsh`: `dsh.profile` enumera los bundles de un perfil, y `dsh.bundle` apunta al archivo de parche de un bundle.

[`dsh-base`](../packages/bundle/base/README.md) es la primera capa compartida de los perfiles `web`, `headless`, `sdk` y `acp`: adaptadores de modelo, tools, persistencia, sandbox y política de aprobación, configuración, credenciales, telemetría. [`dsh-web-app`](../packages/bundle/web-app/README.md) añade la aplicación de navegador, [`dsh-headless`](../packages/bundle/headless/README.md) añade un ejecutor de una sola pasada sin servidor, [`dsh-sdk-app`](../packages/bundle/sdk-app/README.md) añade el servidor JSON-RPC del SDK, y [`dsh-acp-app`](../packages/bundle/acp-app/README.md) añade el servidor ACP exclusivo de automatización. [`dsh-sdk-minimal`](../packages/bundle/sdk-minimal/README.md) es la excepción deliberada: un bundle posee su árbol SDK explícito completo y no aplica `dsh-base`.

Las capas se aplican a una lista de entradas vacía en este orden: cada bundle en el orden listado del perfil, después el `cordis.patch.yml` del perfil, después el de nivel home y después cualquier overlay `--patch`. Un parche apunta a una fila por id y reemplaza toda su configuración, o inserta filas nuevas.

El YAML controla HMR: base habilita `dsh-hmr` solo para configuración; headless, SDK y ACP lo deshabilitan; `sdk-minimal` lo omite. Los parches de perfil sobreescriben estos valores por defecto. HMR coordina la vigilancia y las recargas; el lanzador proporciona los datos del perfil y la disponibilidad.

Base incluye [Plugin Manager](../packages/boot/plugin-manager/README.md) para Web y agents.

Para ver el árbol que arranca la máquina:

```sh
dsh --profile web --dump-config
```

Cualquier fila que imprima puede reemplazarse con un parche propio.

La mecánica de composición está en [app-boot](../packages/boot/app-boot/README.md#profiles); los campos de configuración están en el [catálogo de configuración](config-catalog.es.md) generado.

## Lanzamiento de aplicaciones

Las aplicaciones de Node soportadas se lanzan a través de perfiles `dsh` con nombre. Los perfiles distribuidos son `web`, `headless`, `sdk`, `sdk-minimal` y `acp`, seleccionados con `dsh --profile <name>` o `dsh <name>`. `plugin` nombra el comando de gestión; un perfil con ese nombre requiere `--profile plugin`. El SDK de TypeScript resuelve su dependencia `dsh` de la misma versión y selecciona `sdk`; la composición personalizada de plugins sigue siendo un perfil más archivos de parche ordenados, no otro ejecutable ni un árbol de aplicación en línea. `sdk-minimal` es un bundle independiente propiedad del repositorio detrás del mismo lanzador, no un árbol de Cordis suministrado por el llamante.

Los CLI vendorizados, los ejecutables exclusivos de compilación o de pruebas, el montaje directo de plugins en proceso y la vista previa privada del WebWorker del navegador no son lanzadores de aplicaciones de Harness. [`verify-application-entrypoints`](../scripts/verify-application-entrypoints.ts) mantiene cada bin de paquete, fuente ejecutable, demo raíz y los scripts raíz `start:web` y `dev:web` en una clase explícita, y rechaza cualquier ruta de aplicación de Node que evite `dsh`.

El SDK de Python sigue la misma arquitectura de aplicación. Su wheel de runtime empaqueta el CLI `dsh` normal como `deepseek-harness-sdk-runtime-<platform>-<arch>`, y el cliente lanza `dsh --profile sdk` con un home de Harness explícito por defecto. El ejemplo mínimo selecciona el perfil distribuido `sdk-minimal`. Python expone la selección de perfil y archivos de parche ordenados en lugar de un árbol de Cordis completo; los plugins externos persistentes se instalan mediante `dsh plugin`. El portador privado de configuración directa eliminado no tiene bin de compatibilidad ni parser de respaldo.

## Aplicación de escritorio

La [aplicación de escritorio Electron](../apps/desktop/README.es.md) distribuye su runtime de producción exacto de dsh en recursos firmados y posee el `$DSH_HOME/profiles/desktop` reservado. Utilidades compartidas inicializan los archivos de perfil, reconcilian bundles y resuelven las dependencias de instalación y de bundles sin reemplazar los paquetes que posee pnpm. Escritorio y el CLI de npm comparten los datos del producto pero mantienen paquetes, activación y lockfiles separados. El CLI incluido de Escritorio gestiona sus plugins inicializados.

Electron arranca el Host de Escritorio privado en modo Node de Electron. El Host invoca el ejecutor de perfiles del CLI compartido y la aplicación Web completa. La ventana carga inmediatamente los recursos Web empaquetados y espera las inyecciones de arranque antes de activar los plugins del cliente en el mismo documento. Web posee el RPC y los flujos; el portador de escritorio conecta la página local con el Host autenticado. El IPC de Node transporta las inyecciones de arranque, la disponibilidad, los errores fatales y el apagado. Escritorio usa por defecto el puerto `19387`; la configuración del perfil puede sobreescribirlo. La UI propiedad del shell ejecuta las transacciones de plugins a través del pnpm incluido con la configuración normal de usuario y perfil.

## Paquetes núcleo

Estos son algunos paquetes núcleo que contribuyen al árbol de Cordis.

| Paquete | Posee | clave `ctx` |
|---|---|---|
| [`core/session`](subsystems/session.es.md) | El registro `SessionEvent` de solo anexado y el almacén en memoria | `ctx.sessions` |
| [`core/system-prompt`](subsystems/system-prompt.es.md) | El ensamblado de secciones de prompt y schemas de tools | `ctx.systemPrompt` |
| [`core/tools`](subsystems/tools.es.md) | El registry de tools con ámbito y el pipeline de ejecución protegido | `ctx.tools` |
| [`core/agent`](subsystems/core.es.md) | La interfaz `Agent`, el registry en vivo y los eventos `agent/*` | `ctx.agents` |
| [`core/agent-loop`](subsystems/core.es.md) | El driver por defecto que implementa esa interfaz | `ctx.agentLoop` |
| [`core/scope`](subsystems/scope.es.md) | La primitiva de registro con ámbito por agent | biblioteca, sin clave |
| [`llm/llm`](subsystems/llm-streaming.es.md) | El vocabulario de mensajes y flujos más el seam de adaptadores | `ctx.llm` |
| [`webhook/webhook`](subsystems/webhook.es.md) | El despacho con entrega autenticada y la creación de Sessions de Workspace | `ctx.webhookRuntime` |

<a id="events"></a>

## Eventos

Los eventos son los puntos de extensión, y elegir el dominio correcto es la primera decisión en la mayoría de los cambios.

- **Eventos de sesión**: hechos duraderos anexados al registro y difundidos a través de `session/event`. Usar uno cuando el hecho debe sobrevivir a una recarga.
- **Eventos de agent** (`agent/*`): portan un `Agent` en vivo: bandeja de entrada, paso, estado, solicitud, validación, continuación. Usar uno para observar o interceptar trabajo en curso.
- **Eventos de capacidad**: adjuntan políticas y adaptadores a un seam (`fs/*`, `tools/*`, `telemetry/*`) sin importar el loop.

AgentLoop espera la inicialización serial de `agent/created` antes de empezar el trabajo en cola. Un fallo de inicialización revierte la creación; [agent-loop](../packages/core/agent-loop/README.md#understand-the-implementation) define el orden de desmontaje.

El [mapa de eventos](event-producer-consumer.es.md) enumera los productores y consumidores de cada evento.

<a id="turn-flow"></a>

## Flujo del turno

Un **paso** es una solicitud de modelo más los tools que llama. Un **turno** es cero o más pasos: se abre antes de que se reclame su primera entrada y se cierra cuando ya no se debe nada.

```text
turn/start
  claim next-step input plus one queued message
  assemble prompt sections + tool schemas; project runtime context
  -> agent/pre-step                   reject | enter(messages, startsRequestSeries?)
     reject, or a first enter rewritten empty -> close the turn with no step
     step/start
     agent/request -> prepareCall (cancellation commits neither system nor users)
     reconcile system/message using the prepared call capability
     append entered messages as user/message; log request/header and request/context as needed
     derive and freeze model history from the log
     stream the bound prepared call -> llm/stream -> agent/assistant-stream start
       agent/assistant-stream chunk*
       assistant/message | assistant/attempt -> agent/assistant-stream end
     tool/call* -> tools/pre-execute -> tools/execute -> tools/post-execute -> tool/result*
     step/end
     tools owe another request, or next-step input arrived -> claim -> next step
  -> agent/turn-stopping
turn/end
```

`turn/*`, `step/*`, `system/message`, `user/message`, `assistant/message`, `assistant/attempt` y `tool/*` son eventos de sesión duraderos; el resto son puntos de extensión en vivo repartidos en tres dominios. `agent/assistant-stream` publica tramas de inicio, de fragmento transitorio y de fin locales al proceso. El loop confirma el flujo compacto completo como un único mensaje o como intento solo de registro antes de una trama de fin confirmada, y el adaptador Session-follow de Web es el único consumidor remoto del evento en vivo. `agent/pre-step`, `agent/request`, `llm/stream` y los tres eventos `tools/*` son waterfalls (eventos en cascada), cuyos listeners deben llamar a `next()` para delegar; `agent/turn-stopping` es serial y no tiene `next()`.

Una sola bandeja de entrada alimenta al driver; el contexto inyectado espera un mensaje que lo despierte. La proyección duradera `inbox` de AgentLoop expone la entrada pendiente sin Agents en vivo.

`agent/pre-step` decide la entrada aceptada. Los listeners pueden reescribir o rechazar los mensajes reclamados; una primera reclamación rechazada o vacía cierra un turno duradero sin paso. Una decisión enter puede establecer `startsRequestSeries`: el loop registra un `request/header` nuevo (razón `series`, o `change` con `startsSeries: true` cuando el sobre también cambió). Los listeners que envuelven conservan esa declaración con `{ ...decision, messages }`. Tras el ensamblado y `step/start`, `agent/request` y `prepareCall()` resuelven la ruta real antes de que el prompt del sistema y los usuarios aceptados se confirmen; la cancelación durante cualquiera de las dos fases asíncronas no confirma ninguno de los dos. Las capacidades de llamada preparada gobiernan la admisión del prompt, no el `request/context` precedente. Cada intento reconcilia síncronamente el mismo ensamblado renderizado, anexa usuarios solo en el primer intento, registra header/context según corresponda, y deriva y congela la solicitud antes de transmitir la llamada vinculada. Los reintentos no repiten el ensamblado ni `agent/pre-step`. Los reemplazos de superficie y las decisiones de descarga de imágenes tras un adjunto inician una nueva serie de solicitudes, incluso durante el primer pre-step reanudado; una reanudación sin cambios continúa la serie. El primer paso admitido reserva la cabecera del sistema antes de los mensajes de usuario incluso para un prompt vacío (sin mensaje en el cable). El prompt viaja solo como historial `system/message`: un renderizado vacío limpia todos los nodos de sistema activos, sin dejar ningún prompt antiguo visible para el modelo; las rutas capaces anexan actualizaciones no vacías tras el historial cacheado, incluidas las actualizaciones de tools soportadas; las rutas incapaces y las nuevas series de solicitudes consolidan el texto de prompt no vacío en el primer nodo de sistema, con reemplazos vacíos registrados para los nodos de sistema posteriores no vacíos ([decisión](../.agents/notes/implemented/architecture/2026-09-02-system-prompt-as-surface-node.md); [regla de decisión](../packages/core/agent-loop/README.md#understand-the-implementation)).

El loop envía solicitudes inmutables con cancelación en vivo y reutiliza la evidencia de congelación para las identidades congeladas; [agent-loop](../packages/core/agent-loop/README.md) posee la construcción y las causas de cancelación.

Los pasos fallidos [registran los resultados de tool ausentes](../packages/core/agent-loop/README.md#understand-the-implementation).

Detalles: el [diagrama de secuencia](agent-lifecycle.es.md), el [pipeline de tools](tool-execution-pipeline.es.md) y [cancelación y recuperación de errores](subsystems/core.es.md#the-agent-handle).

## Registro de sesión

El registro de sesión es la fuente del contexto que ve el modelo. `deriveMessages()` proyecta el historial del modelo a partir de él. Cada `assistant/message` incorpora el flujo compacto exacto con marcas de tiempo que produjo su contenido ensamblado; `assistant/attempt` retiene los intentos liquidados fallidos, reintentados, cancelados y con error de flujo sin añadir historial del modelo. El fork, la reanudación, los transcripts, la telemetría y la persistencia se derivan todos de estos settlement duraderos, mientras que la incrementalidad de la UI en vivo proviene de `agent/assistant-stream`; una pérdida brusca del proceso antes del settlement no deja ningún flujo de intento duradero ([decisión](../.agents/notes/implemented/architecture/2026-09-01-v2-embedded-assistant-streams.md)).

Los consumidores de sesión conocen únicamente el formato lógico actual. `stat` y `list`, que solo leen la cabecera, reexploran cada directorio de Session, seleccionan su generación canónica numéricamente más alta y traducen una cabecera histórica soportada sin cargar eventos ni publicar un sucesor. Un `open` de sesión almacenada selecciona esa misma generación, rechaza una versión futura, o decodifica y compone la cadena estática de migraciones adyacentes una vez antes de devolver los eventos lógicos actuales validados. Una apertura de lectura usa ese resultado en memoria sin publicar un sucesor; una apertura de escritura primero codifica, verifica y publica en exclusiva el sucesor final con nombre de versión junto a la fuente sin cambios. La reparación ordinaria de una cola interrumpida sin sellar sigue siendo responsabilidad del consumidor del identificador; la migración inserta un `turn/end` interrumpido ausente solo para el reinicio liberado y acotado ya sellado por un `turn/start` posterior. JSONL v0 usa `session.jsonl[.zstd]`, v1 y posteriores usan `session.vN.jsonl[.zstd]` en minúsculas, y las rutas de generaciones confirmadas nunca se renombran, reemplazan ni eliminan. El proveedor JSONL posee el enmarcado físico, la compresión, la selección de generación y la publicación exclusiva, mientras que cada paquete de migración adyacente posee exactamente un paso `vN -> vN+1` ([decisión](../.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md)).

**Visible para el modelo significa registrado.** Un invariante de runtime comprueba que las solicitudes de modelo sean reconstruibles a partir del registro. Las nuevas entradas visibles para el modelo requieren eventos de sesión. Los plugins que cambian el contenido de mensajes existentes registran [proyecciones de mensajes puras](subsystems/session.es.md#plugin-owned-message-projections); los lectores desacoplados suministran las mismas definiciones explícitamente. Los cambios de tools son independientes de la capacidad; [historial de tools de Session](../packages/core/session/README.md) suministra las declaraciones del proveedor.

**Seam de proyección.** `dsh-session-projection` posee `ctx.sessionProjections`: las unidades registradas pliegan los eventos confirmados de forma incremental, los consumidores del host leen un único estado tipado con `stateOf()`, y los portadores empaquetan vistas recortadas del cliente con `snapshot()`. Un lector del host o bien requiere este servicio durante la activación o falla explícitamente cuando el registry o la clave requerida están ausentes. Los contribuidores pueden conservar el registro `ctx.inject(['sessionProjections'], ...)` sin aplicar silenciosamente un valor por defecto a un valor de host ausente. El agent loop registra el estado compartido `turnBoundary` para sus lectores ([decisión](../.agents/notes/implemented/architecture/2026-08-19-session-projection-mandatory-seam.md)).

## Capability seams

Un **seam** es una capacidad intercambiable con tres roles: una **Service Definition** que declara la interfaz, un **Service Provider** que la implementa y un **Consumer** que la usa, comúnmente un tool orientado al modelo. Un paquete puede combinar roles, pero un solo rol no es un seam; añadir una capacidad significa diseñar los tres ([grafo de capacidades](capability-seams.es.md)).

Los seams son la razón de que un solo cambio de proveedor transforme todo el producto. Los proveedores de sistema de archivos y de subprocesos comparten un único mundo de ejecución, de modo que apuntarlos a un sandbox remoto traslada Bash, PTY y LSP con ellos, sin forks de proveedores. Los [proveedores de subagents](subsystems/subagent.es.md) varían con la misma amplitud detrás de una única interfaz, desde un agent hijo nuevo hasta un turno delegado en otro producto.

[Experimental Agent Teams](subsystems/agent-team.es.md) es un seam de coordinación opt-in publicado sobre `ctx.agentTeams`, con una plantilla duradera, un tablero de tareas y un buzón construidos sobre subagents continuables.

## Dónde va el comportamiento nuevo

El comportamiento nuevo se adhiere a un punto de extensión documentado. Cambiar el propio loop actualiza este mapa.

| Objetivo | Mecanismo |
|---|---|
| Añadir un proveedor de modelos | registrar su adaptador en `ctx.llm` |
| Añadir una capacidad orientada al modelo | registrarla en `ctx.tools`; su schema se une al ensamblado del prompt |
| Dar a una sesión un conjunto de capacidades distinto | componer un preset de agent; una fila de servicio ahí necesita un realm `isolate` |
| Añadir ejecución de shell | registrar un backend `ctx.shell`; el local hace spawn a través de `ctx.subprocess` |
| Añadir ejecución de terminal persistente | registrar un backend `ctx.terminals` más `dsh-tool-terminal` |
| Añadir un comando humano | registrarlo en `ctx.commands`; se despacha sin un turno de modelo |
| Gestionar tareas en segundo plano | registrarlas en `ctx.jobs`; los tools `job_*` leen o detienen tareas |
| Iniciar una Session desde un webhook externo | registrar una regla de confianza en `ctx.webhookRuntime` y montar un adaptador de proveedor |
| Añadir acceso o política de sistema de archivos | registrar un proveedor `ctx.fs` o escuchar los eventos `fs/*` |
| Confinar procesos con spawn | usar un backend `ctx.sandbox`; los consumidores envuelven argv antes del spawn |
| Interceptar una solicitud, un tool o un turno | usar su evento `agent/*` o `tools/*`; `agent/turn-stopping` detiene un turno |
| Añadir contexto orientado al modelo | llamar a `agent.inject()`; llega a la siguiente solicitud admitida |
| Añadir integración de UI o editor | dirigir `ctx.agents` y renderizar desde `session/event` |
| Añadir un nodo Chat de Web Client | registrar una `ConversationNodeDefinition` + un renderizador con clave |
| Añadir estado de sesión duradero | extender `SessionEventMap`; renderizar y reproducir desde el registro |
| Generar títulos de sesión | registrar el único proveedor `ctx.sessionTitle` |
| Gestionar un objetivo dentro de la sesión | usar `ctx.goals`; continuar a través de `agent/*` |
| Hacer fork de una sesión en un límite de turno | `ctx.agents.create({ sessionId, seed, meta: { parentSession, seedLength } })`: solo persisten las sesiones publicadas por agent-loop |
| Almacenar sesiones en un backend nuevo | implementar `SessionPersistence` (`create`/`open`/`stat`/`list`/`export`) sobre el andamiaje de identificadores compartido |
| Limitar un registro a un agent | usar el `agent.ctx` de ese agent |

El [manual de referencia (cookbook) de extensiones](cookbook/extension-cookbook.es.md) mapea funcionalidades a capacidades e indexa las guías paso a paso para [paquetes](cookbook/adding-a-package.es.md), [tools](cookbook/adding-a-tool.es.md), [adaptadores LLM](cookbook/adding-an-llm-adapter.es.md) y [páginas de configuración](cookbook/adding-a-settings-card.es.md). El [subsistema Conversation](subsystems/conversation.es.md) posee el ensamblado de nodos Chat.
