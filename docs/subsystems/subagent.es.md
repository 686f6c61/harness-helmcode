# Subagent

[English](subagent.md) | Español

El seam subagent permite a un agent (agente) delegar trabajo a un agent hijo. Al igual que [bash](shell.es.md), es **una capacidad opcional**, no parte del agent loop (bucle de agent), por lo que sus tipos viven aquí en lugar de en [core.md](core.es.md). Se diferencia de los demás capability seams en que **varias implementaciones de proveedor coexisten** en un mismo contexto, registradas por nombre (`ctx.subagents`), mientras que bash solo permite un ejecutor. Su registry sigue el [registry de adaptadores de LLM](llm-streaming.es.md), no el ejecutor de servicio único de bash.

Service Definition: [dsh-subagent](../../packages/subagent/subagent) (`ctx.subagents` + el vocabulario de abajo). Los Service Providers son paquetes hermanos (`dsh-subagent-spawn-in-process`, `dsh-subagent-fork-in-process`, `dsh-subagent-acp`, `dsh-subagent-codex`, `dsh-subagent-claude-code`, `dsh-subagent-dsh-sdk`); los Consumers orientados al modelo son [dsh-tool-subagent](../../packages/subagent/tool-subagent) (delegación por proveedor) y [dsh-tool-subagent-control](../../packages/subagent/tool-subagent-control) (los controles globales opcionales `send_message`, `interrupt_agent` y `list_agents`). El mismo servicio `ctx.subagents` posee la orquestación de hijos continuables a través de un gestor de activaciones interno, el descubrimiento de hijos directos a través del catálogo del padre y el descubrimiento recursivo de descendientes a través de los catálogos de los padres. La justificación de los proveedores de producto vive en [el Agent Note de Codex y Claude Code](../../.agents/notes/implemented/feature/2026-08-04-claude-code-and-codex-subagent-backends.md); la justificación del seam común vive en [el Agent Note de subagent](../../.agents/notes/implemented/feature/2026-06-21-subagent-capability-seam.md), [el Agent Note de subagents continuables](../../.agents/notes/implemented/feature/2026-07-28-continuable-subagent-conversations.md) y [el Agent Note de mensajería entre Agents adyacentes](../../.agents/notes/implemented/architecture/2026-08-27-adjacent-agent-steer-messaging.md); [el registro archivado de proyección de identidad de lista](../../.agents/notes/archived/architecture/2026-08-06-subagent-list-identity-projection.md) documenta la decisión original sobre la identidad de lista.

Fuentes: [`packages/subagent/subagent/src/types.ts`](../../packages/subagent/subagent/src/types.ts), [`packages/subagent/subagent/src/index.ts`](../../packages/subagent/subagent/src/index.ts) y [`packages/subagent/subagent/src/continuation.ts`](../../packages/subagent/subagent/src/continuation.ts)

La proyección `subagentCatalog` expone `SubagentCatalogEntry[]` en el orden de eventos del padre a través de observaciones de sesión y snapshots del cliente. Cada entrada contiene el id del hijo, la hora de creación, el modo y una etiqueta dependiente del modo; los hechos de catálogo heredados por fork quedan excluidos. [El paquete subagent](../../packages/subagent/subagent/README.md) posee la semántica de creación y persistencia del catálogo. Los hijos históricos con descriptores no disponibles tienen `mode: 'unknown'`; su identidad de encabezado sigue siendo descubrible sin conceder capacidades de continuación.

## Dos tipos de capacidad, descubiertos de dos maneras

Un proveedor anuncia sus funcionalidades **de arranque** en un descriptor estático que el servicio comprueba ANTES de que exista una ejecución one-shot; una solicitud que necesita una funcionalidad que el proveedor no tiene se rechaza de forma ruidosa (`SubagentError('UNSUPPORTED_CAPABILITY')`), nunca se acepta y luego se ignora. Esas flags describen solo la ruta one-shot [`start()`](#the-provider-contract-subagentprovider), donde el proveedor compone al hijo. Los hijos **continuable** los compone el propio gestor de continuación, por lo que se controlan mediante un método opcional cuya presencia ES la capacidad, con el estrechamiento de TypeScript como mecanismo de descubrimiento: [`SubagentProvider.prepareContinuable`](#the-provider-contract-subagentprovider).

```ts type-equiv
/**
 * Which START-TIME features a provider supports. Checked by the service before delegating to
 * {@link SubagentProvider.start}: a request that needs a capability the chosen provider lacks
 * is rejected with a typed error rather than accepted-then-ignored (the "fail loud, no silent
 * degradation" rule). These flags describe the ONE-SHOT
 * {@link SubagentProvider.start} path, where the provider composes the child;
 * continuable children are composed by the continuation manager itself and are
 * gated by {@link SubagentProvider.prepareContinuable} instead. Each flag
 * corresponds one-to-one to a {@link SubagentStartRequest} option: `depthLimit`
 * to `maxDepth`; the other names match.
 */
interface SubagentCapabilities {
  readonly agentOptions: boolean
  readonly outputSchema: boolean
  readonly depthLimit: boolean
  readonly toolFilter: boolean
  readonly persona: boolean
}
```

## La solicitud de arranque one-shot

La capa del tool construye esta solicitud a partir de la entrada del modelo y su propia configuración; el servicio la valida contra el proveedor nombrado antes de `start`. El `parent` obligatorio aporta el cwd de la sesión, el lineage y la profundidad de delegación. Los overrides opcionales de proveedor, modelo, esfuerzo de razonamiento y tokens del Agent, el schema de salida, la profundidad, el filtro de tools y la persona requieren las flags de capacidad correspondientes. Los backends en proceso fusionan `agentOptions` sobre las opciones del Agent padre, aplican los filtros y personas con ámbito a la creación del hijo e implementan el schema soportado con raíz de objeto mediante un tool de captura forzada. El backend del DSH SDK fusiona los cuatro campos de ruta del Agent sobre los valores por defecto de su instancia y los valida en la inicialización del runtime hijo; ACP, Codex y Claude Code rechazan `agentOptions` antes de arrancar sus transportes.

```ts type-equiv
/**
 * What a caller asks for when starting a ONE-SHOT subagent. The tool layer
 * builds this from the model's `{ description, prompt }` plus its own config;
 * the service validates {@link SubagentCapabilities} against the named provider
 * and resolves the durable descriptor before dispatching to
 * {@link SubagentProvider.start}.
 */
interface SubagentStartRequest {
  /** Optional short display label persisted with a session-backed child. */
  readonly label?: string
  /** Content delivered as the child's user message. */
  readonly prompt: ContentBlock[]
  /**
   * The spawning agent. In-process providers derive workspace, lineage, and
   * delegation depth from its durable session state. ACP reads only its cwd,
   * and only when no deployment `cwd` override is configured.
   */
  readonly parent: Agent
  /**
   * Cancellation signal from the spawning context (the tool's `exec.signal`).
   * This is the canonical cancellation channel both before and after startup:
   * a provider rejects `start()` after cleaning partial resources when it
   * fires before the run is published, and cancels the published run's
   * remaining turn work when it fires afterward.
   */
  readonly signal: AbortSignal
  /**
   * Optional host-Agent provider, model, reasoning-effort, and output-token
   * overrides. Requires {@link SubagentCapabilities.agentOptions}; in-process
   * providers merge them over the parent Agent's options when they create the
   * child, while the DSH SDK provider merges them over its instance defaults
   * before initializing the separate child runtime.
   */
  readonly agentOptions?: AgentOptions
  /**
   * Object-rooted JSON Schema within `assertObjectJsonSchema`'s enforced subset. Start rejects
   * unsupported schemas or providers without the capability. Data must be plain host-realm JSON;
   * a successful child returns the matching value as {@link SubagentResult.structured}.
   */
  readonly outputSchema?: ObjectJsonSchema
  /**
   * Optional absolute delegation-depth cap for the child being started: its
   * computed depth must be less than or equal to this non-negative safe
   * integer. Requires {@link SubagentCapabilities.depthLimit}; rejected at
   * start otherwise.
   */
  readonly maxDepth?: number
  /**
   * Optional child tool scoping. Requires {@link SubagentCapabilities.toolFilter};
   * rejected at start otherwise. In-process backends apply it as a scoped
   * `tools.restrict()` in the child's creation window: the named tools vanish
   * from the child's prompt AND refuse to execute (one visibility), with loud
   * unknown-name validation.
   */
  readonly toolFilter?: ToolRestriction
  /**
   * Optional per-child persona. Requires {@link SubagentCapabilities.persona};
   * rejected at start otherwise. In-process backends register it as a scoped
   * `deployment:persona-prefix` section on the child, SHADOWING the deployment's
   * persona for this child alone — same template semantics as the deployment
   * persona (strict `{{…}}` interpolation against the registered variables).
   */
  readonly persona?: string
}
```

`signal` es el único canal de cancelación antes y después de la disponibilidad. El [Agent Note de controles de composición de subagent](../../.agents/notes/implemented/feature/2026-07-12-subagent-persona-tool-filter-and-depth.md) posee la justificación de la persona, el filtro global de tools en vivo, la profundidad absoluta y la visibilidad-no-autoridad.

La solicitud orientada al llamante no lleva detalles de formato de catálogo ni estado de continuación. `SubagentRuntime.start()` resuelve el descriptor one-shot independiente tras las comprobaciones de capacidad y luego pasa esta solicitud orientada al proveedor al transporte seleccionado; un hijo continuable nunca llega a `SubagentProvider.start()`:

```ts type-equiv
/**
 * Provider-facing one-shot request after {@link SubagentRuntime.start} resolves
 * the durable child descriptor.
 */
interface ResolvedSubagentStartRequest extends SubagentStartRequest {
  /** Detached descriptor a session-backed provider persists in the child log. */
  readonly descriptor: SubagentDescriptorData
}
```

## Hijos continuables y activaciones

Un **subagent continuable en segundo plano** es una sesión hija durable con como máximo una **Activation** local al proceso, el periodo en que un Agent hijo reconstruido está residente. Una Activation no es una solicitud, un resultado, una cancelación ni una Task: puede ejecutar muchos turnos FIFO y permanece residente mientras los descendientes que creó siguen en ejecución. El gestor de continuación posee la admisión de activaciones, la autorización del padre directo, el grafo de propiedad en vivo, la reanudación en frío y el dispose con los hijos primero; el agent loop posee toda la ordenación y ejecución de turnos. Ninguna ruta continuable crea una Task ni un envoltorio intermedio portador de resultados.

```text
persisted Session
  -> optional live Activation
       -> one retained AgentHandle
       -> Agent inbox as the only turn FIFO
       -> zero or more owned child Activations
```

`SubagentRuntime.startContinuable()` reserva el id estable del hijo, toma un snapshot del payload versionado `subagent/descriptor`, pide al proveedor nombrado su `ContinuableCreateSpec` independiente, crea el Agent hijo a través de un ámbito privado propietario de la activación, establece cualquier propiedad de padre continuable y envía el prompt inicial. Resuelve con `{ childId, messageId }` cuando la aceptación del inbox produce el id del mensaje, sin esperar a que el turno comience ni a que el mensaje entre en el registro de la sesión. Todo fallo anterior a esa aceptación rechaza sin ningún id, liberando cualquier identificador creado y revirtiendo la Activation y la propiedad del padre.

`SubagentRuntime.sendMessage()` es la única operación de mensajería de autoría del modelo. Acepta el remitente en vivo exacto más un id de destino, permite solo un padre directo o un hijo continuable directo, deriva la atribución del remitente por sí misma y enruta un destino hijo directo según la residencia de su Activation:

| Estado de la Activation de destino | `sendMessage` |
|---|---|
| `running` | hacer steer al paso más cercano en la misma Activation |
| `waiting` | despertar y hacer steer a la misma Activation |
| sin Activation | reanudar en frío una Activation nueva y luego hacerle steer |

`running` significa que el Agent tiene un driver activo o una tarea de mantenimiento; `waiting` significa que no hay actividad del Agent activa pero su Inbox no está vacía o posee al menos una Activation hija que no ha completado el dispose; `settled` significa que no hay actividad del Agent activa, el Inbox está vacío y todo hijo poseído está liberado, momento en el que el gestor libera el [`AgentHandle`](core.es.md#creation-and-ownership) y elimina la Activation. El gestor deriva estas condiciones internas de `Agent.whenIdle()`, `Agent.inbox.hasPending`, el conjunto de hijos poseídos y una generación de Activation que invalida las observaciones obsoletas, en lugar de mantener una segunda máquina de estados de ejecución. Tras el flush final de la sesión, la decisión del bloqueo del hijo usa la entrada de tarea síncrona de `Agent.runMaintenance()` para reclamar la fase inactiva y cerrar la admisión en el mismo turno de JavaScript. Esta regla conservadora no distingue los modos de entrega: el contexto estacionado por `Agent.inject()` puede mantener residente una Activation inactiva y sus ancestros en vivo hasta que una entrega despertadora la reclame, una mutación de la cola la elimine o el desmontaje del gestor la descarte.

El inbox del Agent es la única cola. Todo mensaje del Agent usa `Agent.steer()`: un destino inactivo inicia un turno, mientras que un destino en ejecución lo reclama en el límite de paso más cercano. El Remote `subagent.prompt` del navegador lleva por separado `delivery: 'queue' | 'steer'` a través de la misma ruta de admisión interna; Queue abre un turno FIFO posterior, mientras que Steer conserva el comportamiento de mejor esfuerzo del paso más cercano del agent loop y la fuente humana del mensaje. Una entrega exitosa devuelve el `MessageId` aceptado; los eventos existentes `agent/inbox/inserted`, `agent/inbox/claimed` y `agent/inbox/discarded` siguen siendo las observaciones del ciclo de vida del mensaje, y la capa de continuación no define una segunda cola.

La autoridad proviene del remitente en vivo exacto. La entrega de padre a hijo requiere que el `SessionHeader.parentSession` del destino nombre al remitente; la entrega de hijo a padre requiere que la Activation residente del remitente nombre al destino. Los hermanos, los ancestros más allá de una arista, los autodestinos, los objetos Agent obsoletos y los hijos one-shot se rechazan. Cada mensaje aceptado se enmarca como `Agent <sender-id> sent a message:` y registra `AgentMessageSource`; la fuente registra al remitente pero no concede autoridad.

Para `startContinuable()`, `sendMessage()` y la entrega de prompts del navegador, la señal del llamante posee la búsqueda, la materialización y la admisión solo hasta la aceptación del inbox. Después el gestor posee la Activation con independencia: una cancelación posterior del llamante ni cancela el turno aceptado ni libera al hijo. El servicio público de subagents no expone ninguna planificación de mensajes del Agent seleccionada por el llamante; los Queue y Steer humanos del navegador siguen siendo decisiones internas del adaptador.

La mutación de ocurrencias de la cola en vivo permanece en el dominio de la sesión. `session.updateQueue` admite Edit, Remove y QueueDock Steer ordinarios para un Agent poseído por un subagent en vivo solo cuando su identidad proyectada actual es continuable y su secuencia de descriptores está en el sufijo propio no semilla de ese hijo. La proyección de identidad pliega los descriptores con política último-gana, de modo que un descriptor del hijo reemplaza a los descriptores retenidos del lineage del fork; la comprobación de secuencia del sufijo propio evita que una identidad de ancestro solo semilla autorice la mutación. Los hijos one-shot, ausentes, desconocidos, corruptos o fríos siguen siendo rechazados, y la mutación de la cola nunca reanuda en frío a un hijo. El id de sesión de destino es la autoridad humana para estas mutaciones, incluido el steering (guía a mitad de camino) pendiente de `nextStep` o el contexto inyectado. Steer requiere un `MessageId` encolado y un Agent que informe de ejecución cuando comienza el comando; la cancelación tras la admisión usa el fallback de despertar `nextTurn` aceptado del Agent. Edit reescribe el contenido bajo el mismo `MessageId`, y tanto Edit como Steer completan su trabajo del Inbox de forma síncrona, de modo que la liquidación observa solo el estado final. `agent/inbox/claimed` y `agent/inbox/discarded` despiertan al observador para releer si queda alguna ocurrencia pendiente; esto permite que la entrega directa al Agent reanude el trabajo estacionado y que eliminar la última ocurrencia estacionada liquide a un hijo inactivo. El [Agent Note de control del inbox humano](../../.agents/notes/implemented/feature/2026-08-27-continuable-subagent-human-inbox-control.md) posee esta semántica.

`SubagentRuntime.interrupt(targetSessionId, authority)` es la única parada pública: autoriza de forma síncrona, emite `Agent.cancel(cause, { keepInbox: true })` sobre el destino en vivo y regresa sin esperar la quiescencia. La Activation, su trabajo de inbox pendiente no reclamado y los descendientes publicados quedan intactos; el trabajo ya reclamado en el turno interrumpido no se reencola. Una vez que el driver interrumpido queda inactivo, un envío despertador reanuda la cola FIFO estacionada. Un destino ausente (desconocido, one-shot o ya liquidado) y una composición sin gestor son no-ops aceptados. Para un destino en vivo, una dirección de padre que no coincide o un llamante fuera de su ascendencia en vivo rechazan con `UNAUTHORIZED`; los objetos ancestro obsoletos y las solicitudes de ancestro con autodestino rechazan antes de la búsqueda del destino.

```ts type-equiv
/**
 * Authority under which one interrupt request is admitted. `user` carries the
 * durable direct-parent address a human client presented; `ancestor` carries
 * the exact live Agent object whose recorded lineage must contain the caller.
 */
type SubagentInterruptAuthority =
  | { readonly kind: 'user'; readonly parentSessionId: SessionId }
  | { readonly kind: 'ancestor'; readonly agent: Agent }
```

Cada Activation posee su `AgentHandle` y un `ownedChildren: Set<SessionId>`; como una sesión tiene como máximo una Activation en vivo, el id de la sesión hija identifica al hijo en vivo sin otra referencia de encarnación de runtime. Arrancar un hijo o enviar trabajo originado por el padre registra al hijo en el conjunto de un padre gestionado por continuación antes de que el hijo pueda ejecutarse, y ese padre no puede liquidarse mientras el conjunto no esté vacío. Un Agent de nivel superior u otro no perteneciente a la continuación no tiene Activation y permanece fuera del grafo de espera. La liberación del hijo ocurre solo después de que el hijo no tenga trabajo de Agent activo, su Inbox esté vacía, cada hijo de ese hijo esté liberado, el flush final de sesión de mejor esfuerzo se liquide y el `AgentHandle` del hijo complete el dispose.

La liquidación final espera `ctx.sessions.flush(session)` pero ignora su booleano de participación porque un listener arbitrario no puede probar que un backend de persistencia almacenó el estado. El rechazo se registra sin hacer fallar la Activation, y el gestor igualmente libera el identificador y suelta la propiedad; el estado persistido del hijo puede quedar entonces ausente o desactualizado en una reanudación posterior. La descarga del gestor invoca un vaciado interno de todo el gestor que cierra la admisión y libera todo bosque en vivo; `drainContinuableDescendants(parents)` cierra la admisión solo bajo Agents exactos en vivo poseídos por el host y libera sus descendientes continuables mientras los bosques no relacionados siguen vivos. Ambos esperan las materializaciones ya admitidas en su ámbito, propagan la cancelación de arriba abajo, liberan los identificadores con los hijos primero y esperan cada rama seleccionada a pesar de fallos individuales. Las sesiones hijas duraderas sobreviven a ese desmontaje local al proceso.

```ts type-equiv
/** Durable attribution for one model-authored message between adjacent Agents. */
interface AgentMessageSource {
  readonly kind: 'agent-message'
  /** A message another agent addressed to this one (`relay` context form). */
  readonly form: 'relay'
  /** Session id of the Agent whose tool call produced the message. */
  readonly senderSessionId: SessionId
}
```

```ts type-equiv
/** Options for one model-authored message between adjacent Agents. */
interface SubagentSendMessageOptions {
  /** Caller cancellation, owning the operation only until inbox acceptance. */
  readonly signal: AbortSignal
}
```

```ts type-equiv
/** Identities returned once a continuable child accepted its initial prompt. */
interface ContinuableStart {
  /** The durable child session id, stable across activations. */
  readonly childId: SessionId
  /** The accepted initial prompt's inbox message id. */
  readonly messageId: MessageId
}
```

Cuando una Activation residente se liquida, el gestor entrega un aviso al padre directo durable del hijo describiendo cómo terminó esa época y llevando los bloques de texto no vacíos de su salida final del asistente, o `It left no closing message.` cuando no queda ninguno. Esa entrega es incondicional para todo hijo cuyo id recibió un llamante, ocurre antes de la liberación de propiedad que permitiría juzgar liquidado al padre, y llega a un padre residente a través de la misma entrega despertadora del Agent que un mensaje de Agent. Un padre cuyo propio lineage ya se está desmontando lo recibe sin despertar, porque despertar a un Agent inactivo inicia un turno en lugar de encolar trabajo. Su fuente tiene un tipo distinto para que un transcript (transcripción) nunca presente una cuenta del runtime como algo que el hijo escribió.

```ts type-equiv
/**
 * Durable attribution for the runtime's own account of a continuable child
 * settling. Deliberately a different kind from
 * {@link AgentMessageSource}: an Agent message is content the sender chose,
 * while this message is the manager stating what became of the child, and a
 * transcript that merged them would credit the child with words it never wrote.
 */
interface SubagentSettledMessageSource {
  readonly kind: 'subagent-settled'
  /** A runtime account shown without expanding the row (`notice` context form). */
  readonly form: 'notice'
  /** One-line account of how the child ended. */
  readonly summary: string
  /** Session id of the child that settled. */
  readonly senderSessionId: SessionId
}
```

El proveedor participa solo en la preparación de la especificación de creación inicial, donde `spawn` y `fork` difieren. Su especificación devuelta lleva solo entradas de creación independientes específicas del proveedor (la semilla opcional del historial del padre) y ninguna operación de Agent, `AgentHandle`, entrega de prompts, resultado, dispose o reanudación. La reanudación en frío no despacha a través de un proveedor en absoluto: el gestor pliega el descriptor genérico, llama a `ctx.agents.resume()` a través del mismo ámbito propietario de la activación y envía el turno en espera.

```ts type-equiv
/**
 * What the continuation manager asks a provider for while materializing one
 * continuable child's FIRST activation. The manager has already reserved the
 * durable child identity and owns every later operation, so this request
 * carries only what distinguishes a fresh child from one seeded with parent
 * history.
 */
interface ContinuableCreateRequest {
  /** The reserved durable child session id, for provider diagnostics. */
  readonly sessionId: SessionId
  /** The delegating parent agent whose history a seeding provider reads. */
  readonly parent: Agent
  /**
   * Caller cancellation, which owns preparation only until the manager accepts
   * the initial prompt into the child's inbox.
   */
  readonly signal: AbortSignal
}
```

```ts type-equiv
/**
 * A provider's detached contribution to one continuable child's creation. This
 * is DATA, never a capability: it carries no Agent, `AgentHandle`, prompt
 * delivery, result, disposal, or resume operation, because the continuation
 * manager owns the child's whole lifecycle after preparation.
 */
interface ContinuableCreateSpec {
  /**
   * Completed-turn prefix of the parent's log to seed the child session with,
   * or absent for a fresh child. Same durable contract as
   * `CreateAgentOptions.seed`: contiguous from seq 0, lossless JSON, balanced.
   */
  readonly seed?: readonly SessionEvent[]
}
```

El descriptor (`SubagentDescriptorData` en [descriptor.ts](../../packages/subagent/subagent/src/descriptor.ts)) es una identidad durable discriminada por modo para cada subagent respaldado por sesión. Ambos modos llevan el nombre del proveedor. Un descriptor `one-shot` lleva opcionalmente una `label` de visualización propiedad del llamante; un descriptor `continuable` requiere la `description` de la delegación como etiqueta durable de creación y además toma snapshot de los `agentOptions.provider`/`model`/`reasoningEffort` resueltos del hijo y del `persona`/`toolFilter` opcionales para la reanudación en frío. Nunca toma snapshot del objeto `AgentOptions` extensible por fusión, de modo que un valor de extensión no relacionado no puede romper la continuación y una entrada de composición posterior es un cambio de versión deliberado. Omite `subagentDepth` (la reanudación en frío confía en el `delegationDepth` del encabezado persistido como suelo monótono) y `outputSchema` (contrato de resultado de una ejecución o Activation, no identidad durable).

Un proveedor one-shot local anexa el descriptor dentro del turno inicial del hijo antes de su primera solicitud. El gestor de continuación anexa el descriptor después de cualquier lineage aportado por el proveedor y antes de que se admita el prompt inicial; `Session.inheritedEventCount` sigue siendo la frontera del lineage del fork: la autoridad del descriptor en tiempo de reanudación lee el sufijo propio del hijo, mientras que la proyección de identidad pliega `subagent/descriptor` con política último-gana, de modo que el descriptor propio del hijo reemplaza al del ancestro sembrado por fork. El evento es solo de registro: sin `surfaceOp`, nunca en el historial del modelo, y retenido entre compactaciones por el registro de solo anexado. Los descriptores de la versión actual malformados están corruptos; las versiones no soportadas no puede clasificarlas este runtime.

## Enumeración duradera: `listChildren()`, `listDescendants()` y sus entradas

El adaptador `list_agents` orientado al modelo informa de la actividad actual como `running` o `inactive`. Estos valores no describen la finalización de tareas ni garantizan que `send_message` tenga éxito.

`SubagentRuntime.listChildren(parentSessionId, signal?)` lee la vista `subagentCatalog` del padre a través de una observación de sesión con preferencia por la viva y libera esa observación tanto en éxito como en fallo. Devuelve las entradas de hijos directos en el orden de eventos del padre sin leer los registros de los hijos ni enumerar el corpus de sesiones. Los fallos de consulta se propagan; una proyección de catálogo ausente falla explícitamente. Las filas del navegador derivan la pertenencia del almacén de proyección compartido y añaden la actividad del estado de la sesión; el flujo de control empuja actualizaciones completas del catálogo. `listDescendants()` lee recursivamente esos catálogos y deriva `hasChildren` de cada catálogo hijo. El [Agent Note del catálogo del padre](../../.agents/notes/implemented/architecture/2026-09-01-parent-owned-subagent-catalog.md) posee los costes de creación, aislamiento de forks, ordenación y persistencia.

`SubagentRuntime.listDescendants(rootSessionId)` llama recursivamente al mismo lector de catálogos en preorden estable, preservando el orden de eventos de cada padre. Las entradas one-shot y de modo desconocido siguen siendo nodos de recorrido; los modos desconocidos producen diagnósticos `unsupported`. Un catálogo hijo ilegible produce `corrupt` o `unavailable` y detiene solo esa rama. Los fallos de lectura de la raíz, los servicios o proyecciones ausentes y la cancelación rechazan el listado. Cada catálogo alcanzable se observa una vez y se libera antes de la siguiente lectura; los ids repetidos y los ciclos se omiten. Las sesiones ausentes de los catálogos alcanzables no se descubren, incluidos los forks de sesión ordinarios y cualquier subagent bajo esos forks. Cada fila lleva su padre de catálogo y su profundidad relativa a la raíz:

```ts type-equiv
/** One catalog descendant with its direct parent and edge distance from the requested root. */
type SubagentDescendantListEntry = SubagentListEntry & {
  /** Parent whose catalog contains this child. */
  readonly parentId: SessionId
  /** Edge distance from the requested root; direct children are `1`. */
  readonly depth: number
}
```


## El resultado terminal: `SubagentResult`

El resultado de una ejecución one-shot, resuelto por `SubagentRun.result`. `structured` está presente solo después de que un `outputSchema` solicitado se satisficiera con éxito; solicitar un schema no lo garantiza, y un proveedor puede devolver `stopReason: 'error'` cuando el hijo falla o termina sin una captura válida. Un proveedor puede adjuntar un `diagnostic` seguro y no del asistente a un resultado no `completed`; el proveedor elimina las entradas de tools, contenidos de archivos, valores de entorno, credenciales y payloads de protocolo sin procesar, y limita el valor completo a 4096 bytes UTF-8 antes de que los consumidores lo presenten separado de `output`. Un `stopReason` no `completed` significa que `output` puede ser parcial: el consumidor lo mapea a un resultado de tool `isError` en lugar de informar de una salida parcial como éxito.

```ts type-equiv
/**
 * The terminal outcome of a subagent run, resolved by {@link SubagentRun.result}.
 */
interface SubagentResult {
  /**
   * The child's final assistant output is the content of its last non-empty
   * assistant message. Empty-content messages, including usage-only messages,
   * are skipped. Without a non-empty message, the output is its accumulated
   * assistant text stream, or `[]` when the child produced neither.
   */
  readonly output: readonly ContentBlock[]
  /**
   * The structured result after a requested `outputSchema` was successfully
   * satisfied. Requesting a schema does not guarantee presence: a provider can
   * end with `stopReason: 'error'` when the child fails or finishes without a
   * valid capture. The structured value is validated against the requested
   * output schema by the provider; `unknown` here because the seam is
   * schema-agnostic.
   */
  readonly structured?: unknown
  /**
   * Provider-authored, non-assistant failure detail for a non-`completed`
   * result. Providers keep this text free of tool inputs, file contents,
   * environment values, credentials, and raw protocol payloads, and limit it
   * to 4096 UTF-8 bytes. Consumers present it separately from {@link output}.
   */
  readonly diagnostic?: string
  /** Why the run ended. A non-`completed` reason means `output` may be partial. */
  readonly stopReason: SubagentStopReason
}
```

`SubagentStopReason` es una [unión derivada extensible por fusión](core.es.md#the-map--derived-union-pattern): un backend puede añadir variantes, por lo que los consumidores ramifican sobre los casos conocidos y tratan una razón terminal desconocida como un fallo:

```ts type-equiv
/**
 * Why a subagent run ended. Merge-extensible (a backend may add variants);
 * consumers branch on the known cases and fall through `default`. The known
 * cases mirror the harness turn-end vocabulary so the tool layer can map a
 * non-`completed` result to an `isError` tool result.
 */
interface SubagentStopReasonMap {
  /** The child finished its turn normally. */
  completed: 'completed'
  /** Cancelled through the request signal or disposal. */
  aborted: 'aborted'
  /** Model or transport failure. */
  error: 'error'
  /** The child hit its token ceiling before finishing. */
  'max-tokens': 'max-tokens'
  /** The child declined the task. */
  refusal: 'refusal'
}
```

## Una ejecución one-shot: `SubagentRun`

`SubagentRun` es el identificador propiedad del consumidor de un hijo one-shot publicado: una delegación desechable en primer plano con un resultado, nunca un identificador de hijo durable. El envío del prompt, el trabajo del turno y los fallos de infraestructura tras la publicación pertenecen a `result`. Los consumidores esperan ese resultado y siempre liberan la ejecución para alcanzar la quiescencia. Los fallos del hijo resuelven con una razón de parada no completada; solo rechazan los fallos de infraestructura no representables. Una ejecución no tiene steering ni reanudación: las conversaciones continuables no tienen ejecución en absoluto, porque el gestor de continuación posee su `AgentHandle` directamente y ordena cada turno a través del inbox propio del hijo.

```ts type-equiv
/**
 * ONE-SHOT child handle returned after publication. Prompt submission, turn
 * work, and infrastructure faults after that boundary belong to {@link result}.
 * Consumers await that result and must always {@link dispose} to cancel
 * remaining work and reach quiescence. A run is one disposable foreground
 * delegation with one result; continuable conversations have no run — the
 * continuation manager holds their `AgentHandle` directly and orders every
 * turn through the child's own inbox.
 */
interface SubagentRun {
  /**
   * Parent-scoped run id. For a local run, this MUST equal the published child
   * session id, whose `parentSession` records `request.parent.session.id`; a
   * remote provider mints an id unique in the parent namespace.
   */
  readonly id: SessionId
  /**
   * The exact published in-process child, or `undefined` for a remote run.
   * When present, its id is {@link id}; the provider retains no ownership
   * implication beyond the run's ordinary {@link dispose} contract.
   */
  readonly localAgent: Agent | undefined
  /**
   * Resolves with the child's terminal {@link SubagentResult} when the run
   * settles. Does NOT reject on a child-level failure — a model/transport
   * failure resolves with `stopReason: 'error'` so the consumer maps it to an
   * `isError` tool result. Rejects on an infrastructure fault the seam cannot
   * represent as a stop reason.
   */
  readonly result: Promise<SubagentResult>
  /**
   * Cancel remaining work, reach child quiescence, and release resources.
   * Idempotent.
   */
  dispose(): Promise<void>
}
```

Una ejecución one-shot local DEBE publicar un agent/sesión hijo ordinario antes de que `start()` se cumpla, devolver ese id de sesión hijo como `SubagentRun.id`, exponer el hijo exacto como `localAgent`, registrar `request.parent.session.id` en el encabezado `parentSession` del hijo y anexar el descriptor resuelto dentro del turno inicial del hijo antes de su primera solicitud. La propiedad del runtime puede colocar al hijo bajo el ámbito del padre, del proveedor o de la raíz. Un proveedor remoto devuelve en cambio un id de ciclo de vida con ámbito de padre y `localAgent: undefined`; sin una sesión hija local, está ausente de la enumeración duradera.

<a id="the-provider-contract-subagentprovider"></a>

## El contrato del proveedor: `SubagentProvider`

Cada proveedor es un transporte nombrado de agents hijos, y varios proveedores pueden coexistir. El servicio valida las capacidades de arranque solicitadas antes de `start()` y rechaza un arranque continuable en un proveedor sin `prepareContinuable`. `inheritsParentContext` describe solo la siembra de la conversación (`fork`: true; `spawn` y `acp`: false), lo que permite a los consumidores generar una redacción fiel orientada al modelo sin implicar tools, servicios o autoridad heredados. Un proveedor cuya ruta one-shot tiene valores por defecto estáticos propiedad del proveedor publica `agentRouteDefaults` opcionales e inmutables, lo que permite a un Consumer fusionar los overrides de modelo/tool contra la línea base correcta antes del preflight.

```ts type-equiv
/**
 * One registered transport for running child agents. Providers are trusted
 * same-process implementations; callers treat descriptors and returned values
 * as borrowed immutable data. The service may call one provider concurrently
 * for distinct children. Providers isolate operation-local mutable state; a
 * shared capacity controller may delay an operation but must not couple its
 * settlement or cleanup to a sibling.
 */
interface SubagentProvider {
  /** Unique registry name (e.g. `spawn`, `fork`, `acp`). */
  readonly name: string
  /** The start-time features this provider supports (see {@link SubagentCapabilities}). */
  readonly capabilities: SubagentCapabilities
  /**
   * Whether the child sees the parent's completed-turn prefix. This is descriptive, not a
   * service-validated start capability: the model-facing tool derives truthful wording from it.
   * It says nothing about tool registration, injected services, or authority inheritance.
   */
  readonly inheritsParentContext: boolean
  /**
   * Optional static provider-owned provider/model route for one-shot Agent
   * options. Consumers merge tool/model overrides over these values before
   * preflight; providers whose route derives from the parent omit it. The value
   * is detached immutable data and requires `agentOptions` support.
   */
  readonly agentRouteDefaults?: Readonly<{ provider: string; model: string }>
  /**
   * Establish a ONE-SHOT child and return its handle after publication.
   * The service has already validated that every requested start-time
   * capability is supported and resolved `request.descriptor`, so a
   * session-backed implementation appends that descriptor inside the child's
   * initial turn. Before fulfillment, the provider owns setup and cleans any
   * unpublished partial resources before rejecting. Ownership transfers on
   * fulfillment; subsequent turn or infrastructure failure settles through
   * the returned run. Distinct starts may overlap; cancellation, failure,
   * result settlement, and disposal remain independent for each run.
   */
  start(request: ResolvedSubagentStartRequest): Promise<SubagentRun>
  /**
   * OPTIONAL (continuable-creation capability): contribute the detached
   * creation inputs that distinguish this provider's continuable children —
   * only whether the child session is seeded with parent history. Method
   * presence IS the capability: the service rejects continuable starts on
   * providers without it, while a provider that has it may still serve
   * ordinary one-shot delegations.
   *
   * This is the provider's ONLY participation in a continuable child. The
   * continuation manager owns identity reservation, composition, Agent
   * creation, prompt delivery, cold resume, ownership, and disposal, so a
   * provider never sees the child's Agent, handle, turns, or teardown.
   * Distinct preparations may overlap; each follows its own signal and returns
   * data belonging only to `request.sessionId`.
   */
  prepareContinuable?(request: ContinuableCreateRequest): Promise<ContinuableCreateSpec>
}
```

El `start()` del proveedor se cumple con una ejecución publicada. El servicio acuña un `runId` único, toma snapshot de `local` a partir del `localAgent` exacto del proveedor, observa el resultado, emite `subagent/start` y devuelve la misma ejecución; un rechazo de `start()` implica la limpieza de los recursos no publicados y no emite ningún par de ciclo de vida, mientras que un rechazo del resultado tras la publicación cierra el par emitido. Cada Activation continuable emite el mismo par de solo observación para su época de residencia, de modo que una reanudación en frío es una época nueva con su propio `runId`. El `subagent/end` emparejado lleva la misma identidad y la salida final o el fallo de infraestructura. Ambos eventos son de solo observación y contienen las excepciones de los listeners. Su campo `provider` nombra al proveedor que arrancó la ejecución o la época de Activation; no afirma que el proveedor siga registrado cuando se emite la arista.

## Backends en proceso: permiso, profundidad y semilla

Los backends spawn y fork crean un agent one-shot ordinario a través de `parent.ctx`, pasan la cancelación a la creación del núcleo y liberan a través de `AgentHandle`; un hijo continuable lo crea en cambio el gestor de continuación a través de su propio ámbito propietario de la activación. La eliminación de un proveedor bloquea los nuevos arranques sin revocar las ejecuciones aceptadas. Cada hijo obtiene un ámbito plano nuevo en lugar de heredar los registros del padre. El permiso, la profundidad y la siembra por fork reutilizan el vocabulario de sesión existente:

- **El permiso delegado** se captura antes del primer await. Los padres con acceso Auto y Full anexan su identidad `permission/preset` capturada al hijo nuevo tras la siembra por fork y los overrides de sandbox/aprobación. Los hijos one-shot y continuables comparten esta ruta; la reanudación en frío lee solo el registro del hijo. Read Only y Workspace Write conservan el override de sandbox heredado más `approval: never`, de modo que los bundles sin coincidencia siguen siendo `custom`. Cada llamada hija de Auto se revisa de forma independiente usando los mensajes existentes de `parentSession`, el prompt de creación y los mensajes autenticados del humano/padre directo. La [decisión de revisión de Auto](../../.agents/notes/implemented/feature/2026-08-28-auto-review.md) define la semántica baja/media/alta; no se añade ningún registro de delegación, recibo, campo de encabezado, campo de descriptor ni formato de sesión.

- **La profundidad de delegación** es el `SessionHeader.delegationDepth` durable más el campo de runtime extensible por fusión `AgentOptions.subagentDepth`; la ausencia significa profundidad cero de nivel superior, y el valor presente mayor es el autoritativo. El seam posee ambos campos (el loop ni los establece ni los lee), de modo que un hijo en proceso persiste la profundidad del padre + 1, la reanudación en frío no puede bajarla, y cada arranque rechaza una profundidad derivada fuera del dominio de enteros seguros o por encima de un tope absoluto `request.maxDepth` definido.
- **La siembra por fork** usa [`CreateAgentOptions.seed`](core.es.md#creation-and-ownership) (un prefijo `SessionEvent[]` enhebrado a través de `AgentLoop.createAgent` → `ctx.sessions.prepare({ seed })`, la misma primitiva que usa `ctx.agents.resume()`). El backend fork pasa un *prefijo de turnos completos equilibrado* del registro del padre (los eventos del padre hasta su último `turn/end` inclusive), de modo que la semilla es contigua desde 0 y la reproducción de los [invariantes](../../packages/runtime-diagnostics/invariants) la acepta (el turno en vuelo, no equilibrado, queda excluido).

`SubagentCatalogEntry` describe un hijo directo con información de descubrimiento completa o de modo desconocido; `SubagentCatalogState` es el estado de proyección solo del host. `listChildren()` posee una observación del padre con preferencia por la viva sin abrir los registros de los hijos. Los consumidores del navegador leen `subagentCatalog` a través del almacén de proyección de sesión compartido y combinan la pertenencia con la actividad de la lista de sesiones. `SubagentCatalogRow` pertenece al listado recursivo del catálogo. [La decisión del catálogo del padre](../../.agents/notes/implemented/architecture/2026-09-01-parent-owned-subagent-catalog.md) posee los hechos persistentes y la semántica de lectura.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsubagentmodelselection--subagentmodelselectionconfig"></a>

### `ctx.subagentModelSelection` — `SubagentModelSelectionConfig`

Singleton settings owner read when delegation tools are composed for a Session.

```ts cordis-catalog
/**
 * Read a detached selection preference for the next eligible Session composition.
 * @returns the enabled state and exact allowed routes.
 */
current(): SubagentModelSelectionSettings
```

Source: [`packages/subagent/tool-subagent/src/model-selection-settings.ts`](../../packages/subagent/tool-subagent/src/model-selection-settings.ts)

<a id="ctxsubagents--subagentruntime"></a>

### `ctx.subagents` — `SubagentRuntime`

Named provider registry with one-shot runs, durable discovery, and continuable-child operations.

```ts cordis-catalog
/**
 * Resolve a delegation tool's depth policy against the current user setting.
 * @param configured - Explicit tool limit, or provider-managed for external delegation.
 * @returns The numeric limit, or undefined when the provider owns depth enforcement.
 */
resolveMaxDepth(configured?: number | 'provider-managed'): number | undefined

/**
 * Establish one durable continuable child and deliver its initial prompt.
 * Resolves when the child's inbox accepts that prompt, without waiting for the
 * turn to start or for the message to reach the Session log; any earlier
 * failure rejects with no ids and rolls back the child entirely.
 * @param spec - provider, delegation request, and caller cancellation.
 * @returns the durable child id and the accepted prompt's message id.
 * @throws when continuation services are unavailable or materialization fails.
 */
async startContinuable(spec: ContinuableStartSpec): Promise<ContinuableStart>

/**
 * Steer one model-authored message to the sender's direct parent or direct
 * continuable child. A running target admits it at the nearest step boundary;
 * an idle target starts a turn, and an absent direct child cold-resumes from
 * persistence. The service derives durable sender attribution from the exact
 * live sender. Caller cancellation stops only pre-acceptance work.
 * @param sender - exact live Agent authorizing and originating the message.
 * @param targetId - durable direct-parent or direct-child session id.
 * @param content - model-authored content to deliver.
 * @param options - caller cancellation before inbox acceptance.
 * @returns the accepted message's inbox id.
 * @throws when continuation services are unavailable, adjacency is rejected,
 *   or the message was not admitted.
 */
async sendMessage( sender: Agent, targetId: SessionId, content: ContentBlock[], options: SubagentSendMessageOptions, ): Promise<MessageId>

/**
 * Interrupt one live continuable child's current turn under a human parent
 * address or an exact live ancestor Agent. Fire-and-return: the cancel
 * signal is issued before this returns, but the target may keep running
 * until it observes the signal. Unclaimed pending inbox work, the Activation,
 * and published descendants are preserved; claimed work is not requeued.
 * Once the interrupted driver is idle, a waking send resumes the parked FIFO
 * queue. An absent target — including a one-shot or unknown id —
 * is an accepted no-op, as is a manager-less composition, which cannot own a
 * live Activation.
 * @param targetSessionId - the durable child session id to interrupt.
 * @param authority - the human parent address or exact live ancestor Agent.
 * @throws {SubagentError} `UNAUTHORIZED` when the authority does not own the
 *   live target.
 */
interrupt(targetSessionId: SessionId, authority: SubagentInterruptAuthority): void

/**
 * Close continuable admission below exact live parent Agents, stop only their
 * visible descendant Activations synchronously, then await admitted scoped
 * materializations and release those forests child-first. The scoped cutoff
 * lasts until each exact parent leaves the registry; unrelated parent trees
 * remain live.
 * @param parents - exact host-owned parent Agents entering teardown.
 * @returns once every retained descendant Activation released its `AgentHandle`.
 * @throws an aggregate error after all branches settle when any failed.
 */
async drainContinuableDescendants(parents: readonly Agent[]): Promise<void>

/**
 * Release selected resident continuable direct children of one exact live
 * parent. Other children of the same parent remain admitted and resident.
 * Absent targets and a manager-less composition are accepted no-ops.
 * @param parent - exact live direct parent authorizing the selected release.
 * @param childIds - durable direct-child ids to release when resident.
 * @returns once every selected Activation released its `AgentHandle`.
 * @throws {SubagentError} `UNAUTHORIZED` when a resident target belongs to a
 *   different parent or the supplied parent identity is stale.
 */
async drainContinuableChildren(parent: Agent, childIds: readonly SessionId[]): Promise<void>

/**
 * Read the parent's durable direct-child catalog without loading or resuming an Agent.
 * The service owns and releases the live-preferred Session observation.
 * @param parentSessionId - parent whose direct children are requested.
 * @param signal - cancellation forwarded to the Session query.
 * @returns catalog children in parent event order.
 * @throws {@link SubagentError} when query or catalog projection is unavailable.
 * @throws SessionQueryError when the parent cannot be read or the query is cancelled.
 */
listChildren(parentSessionId: SessionId, signal?: AbortSignal): Promise<SubagentCatalogEntry[]>

/**
 * Recursively list reachable parent catalogs in stable pre-order, preserving
 * each catalog's event order. Each row carries its catalog parent and depth;
 * one-shot and unknown-mode children remain traversal nodes. Unknown modes
 * produce unsupported diagnostics. Unreadable child catalogs produce corrupt
 * or unavailable diagnostics and stop only that branch. Root read failures,
 * missing services or projections, and cancellation reject the whole listing.
 * Each catalog is observed once and released before the next read. No Agent
 * is loaded or resumed; Sessions absent from reachable catalogs are omitted.
 * @param rootSessionId - session whose catalog starts descendant discovery.
 * @param signal - cancellation forwarded to and checked around each catalog read.
 * @returns children and branch diagnostics in parent-catalog pre-order.
 * @throws {@link SubagentError} when listing dependencies are unavailable or the caller cancels.
 * @throws SessionQueryError when the root catalog cannot be read.
 */
listDescendants(rootSessionId: SessionId, signal?: AbortSignal): Promise<SubagentDescendantListEntry[]>

/**
 * Deliver one browser-authored message to a continuable child through the
 * exact live direct parent, retaining the caller-minted request identity and
 * validated browser zone on the accepted message. Success identifies the
 * message the child's inbox accepted; later execution is independent of this
 * call. Queue delivery targets a later turn; steer delivery targets the
 * nearest step and retains the Agent loop's best-effort fallback semantics.
 * Image parts are admitted and persisted through the attachment store
 * before delivery, and the child's model must accept image input.
 * Cold resume at capacity rejects with `subagent/delivery-unavailable`.
 * @param request - durable address, delivery, minted identity, content, and optional browser zone.
 * @param signal - carrier cancellation, owning the call until inbox acceptance.
 * @returns the accepted message's inbox identity.
 * @throws {RemoteError} `gateway/bad-request`, `subagent/attachment-invalid`,
 *   `subagent/invalid-time-zone`, `subagent/parent-unavailable`,
 *   `subagent/not-resumable`, `subagent/unauthorized`,
 *   `subagent/delivery-unavailable`, `gateway/cancelled`, or `gateway/internal`.
 */
@Remote('prompt') async prompt(request: SubagentPromptRequest, signal: AbortSignal): Promise<SubagentPromptReceipt>

/**
 * Remote face of {@link interrupt} under one durable parent address. No
 * catalog, history, persistence, or parent Agent lookup runs: the core
 * primitive alone authorizes the address against the live Activation, which
 * is what keeps a live child interruptible while its parent Agent is offline.
 * Absent, idle, and already-completed targets are accepted no-ops there.
 * @param childSessionId - durable child session id to interrupt.
 * @param parentSessionId - durable direct parent whose authority is claimed.
 * @param mode - required continuable-address discriminator.
 * @returns acknowledgement that the cancel signal was admitted, not that the target is quiescent.
 * @throws {RemoteError} `gateway/bad-request` for an empty id,
 *   `subagent/unauthorized` when the address does not own the live target,
 *   otherwise `gateway/internal`.
 */
@Remote('interruptByParent') interruptByParent( childSessionId: SessionId, parentSessionId: SessionId, mode: 'continuable', ): SubagentInterruptReceipt

/**
 * Register a provider under its name. Registration is effect-scoped and HMR
 * safe; removing a provider blocks new starts but does not revoke runs that
 * were already returned to their holders.
 * @param provider - the trusted provider implementation.
 * @returns the exact Cordis effect disposer.
 */
registerProvider(provider: SubagentProvider): () => void

/**
 * Look up a provider by name.
 * @param name - the provider name.
 * @returns the provider, or undefined when absent.
 */
getProvider(name: string): SubagentProvider | undefined

/**
 * List registered provider names in insertion order.
 * @returns the registered names.
 */
list(): string[]

/**
 * Establish a published child on the named provider. Capability and semantic
 * checks run before delegation. Provider ownership lasts until its promise
 * fulfills; a rejection therefore has no run for the caller to dispose and
 * emits no run lifecycle events. Post-publication turn and infrastructure
 * failures settle through the returned run.
 * A catalog append failure disposes the run and handles its result rejection;
 * the caller receives the catalog error even if disposal also fails.
 * @param name - the provider to use.
 * @param request - child label, prompt, parent, signal, and optional capabilities.
 * @returns the published holder-owned run.
 */
async start(name: string, request: SubagentStartRequest): Promise<SubagentRun>
```

Types: [Agent](core.es.md) · [ContentBlock](llm-streaming.es.md) · [MessageId](llm-streaming.es.md) · [SessionId](core.es.md)

Source: [`packages/subagent/subagent/src/index.ts`](../../packages/subagent/subagent/src/index.ts)

<a id="subagent-events"></a>

### `subagent/*` events

<a id="subagentend--emit"></a>

#### `subagent/end` — emit

A published child settled. Scope-filtered dispatch uses the same delegating parent carrier as `subagent/start`, so the lifecycle pair reaches the same scoped audience.

```ts cordis-catalog
/**
 * A published child settled. Scope-filtered dispatch uses the same delegating
 * parent carrier as `subagent/start`, so the lifecycle pair reaches the
 * same scoped audience.
 * @param info - the run identity and terminal outcome.
 * @dshScopeScan unsupported
 * @mode emit
 */
'subagent/end'(this: Scoped<SubagentRuntime>, info: SubagentRunEndInfo): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/subagent/subagent/src/index.ts`](../../packages/subagent/subagent/src/index.ts)

<a id="subagentprovider-added--emit"></a>

#### `subagent/provider-added` — emit

A provider became resolvable in the registry.

```ts cordis-catalog
/**
 * A provider became resolvable in the registry.
 * @param provider - the registered provider.
 * @mode emit
 */
'subagent/provider-added'(provider: SubagentProvider): void
```

Source: [`packages/subagent/subagent/src/index.ts`](../../packages/subagent/subagent/src/index.ts)

<a id="subagentprovider-removed--emit"></a>

#### `subagent/provider-removed` — emit

A provider left the registry. Accepted runs remain holder-owned.

```ts cordis-catalog
/**
 * A provider left the registry. Accepted runs remain holder-owned.
 * @param name - the provider name that no longer resolves.
 * @mode emit
 */
'subagent/provider-removed'(name: string): void
```

Source: [`packages/subagent/subagent/src/index.ts`](../../packages/subagent/subagent/src/index.ts)

<a id="subagentstart--emit"></a>

#### `subagent/start` — emit

A provider established a published child. For in-process providers, `ctx.agents.get(info.id)` resolves during this notification. Scope-filtered dispatch keys the carrier by the delegating parent, so a parent-scoped listener observes only its own delegations. Paired with `subagent/end`.

```ts cordis-catalog
/**
 * A provider established a published child. For in-process providers,
 * `ctx.agents.get(info.id)` resolves during this notification.
 * Scope-filtered dispatch keys the carrier by the delegating parent, so a
 * parent-scoped listener observes only its own delegations. Paired with
 * `subagent/end`.
 * @param info - the provider and published child identity.
 * @dshScopeScan unsupported
 * @mode emit
 */
'subagent/start'(this: Scoped<SubagentRuntime>, info: SubagentRunInfo): void
```

Types: [Scoped](scope.es.md)

Source: [`packages/subagent/subagent/src/index.ts`](../../packages/subagent/subagent/src/index.ts)
<!-- END GENERATED cordis-surface -->
