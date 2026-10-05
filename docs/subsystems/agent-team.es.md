# Agent Teams

[English](agent-team.md) | Español

Tipos compartidos por el dominio Team experimental de raíz implícita, las tools del modelo y los adaptadores de host. El [Agent Note de Agent Teams](../../.agents/notes/implemented/feature/2026-08-05-agent-teams.md) es dueño de las decisiones de identidad, mailbox, task y checkout compartido; esta página registra las formas durables y visibles para el cliente de [`packages/experimental/agent-team/src/types.ts`](../../packages/experimental/agent-team/src/types.ts).

## Identidad y roster

`TeamId` es el `SessionId` raíz bajo una [marca](core.es.md#branded-ids) distinta. `TeamTaskId` es local al Team y se asigna monótonamente como `task-<n>`; `TeamMessageId` es globalmente aleatorio. El id de sesión de un teammate sigue siendo su identidad persistente, mientras que `name` es una etiqueta inmutable para el modelo y la UI.

```ts type-equiv
/** Whole durable value written on every teammate lifecycle change. */
interface TeamMemberSnapshot {
  readonly id: SessionId
  readonly name: string
  readonly description: string
  readonly provider: string
  readonly context: 'fresh' | 'fork'
  readonly phase: TeamMemberPhase
  readonly error?: string
}
```

Cada miembro comienza en `provisioning` y alcanza exactamente una fase terminal del roster, `active` o `failed`. El estado `running`/`inactive` del roster se deriva por separado y nunca reescribe este registro.

## Mailbox durable

La sesión Lead primero almacena el mensaje completo en cola. La recepción por parte de un destino solo se confirma después de que su elemento de bandeja de entrada pendiente o su mensaje de usuario registrado sea durable, de modo que lo encolado menos lo entregado queda como mailbox de recuperación.

```ts type-equiv
/** One peer message retained until its target Session records it. */
interface TeamMessageSnapshot {
  readonly id: TeamMessageId
  readonly senderId: SessionId
  readonly senderName: string
  readonly targetId: SessionId
  readonly content: ContentBlock[]
}
```

Cada mensaje intenta la entrega mediante steering (guía a mitad de camino). Un destino en ejecución lo recibe en el límite de paso más cercano; un destino inactivo inicia un turno si está cargado, o reanuda en frío en caso contrario. La planificación no se almacena en el registro durable porque los llamantes no pueden seleccionar otro modo.

La sesión de destino conserva la identidad del mensaje y la atribución del remitente tanto en el elemento de bandeja de entrada pendiente como en el eventual mensaje de usuario. Plegar esa fuente a través de la bandeja de entrada y del historial es la clave de deduplicación del lado de destino; el marco visible para el modelo repite el id y el remitente.

```ts type-equiv
/** Source retained by the target Session for durable mailbox de-duplication. */
interface TeamMessageSource {
  readonly kind: 'team-message'
  readonly teamId: TeamId
  readonly messageId: TeamMessageId
  readonly senderId: SessionId
  readonly senderName: string
}
```

## DAG de tasks compartidas

Cada evento de task almacena un snapshot completo. `revision` es el valor de compare-and-set y se incrementa en uno por mutación. Las aristas `blockedBy` deben nombrar tasks no eliminadas y mantener el grafo acíclico. Los `writeScopes` son prefijos de ruta indicativos normalizados, no bloqueos.

```ts type-equiv
/** Whole durable task snapshot; every mutation increments {@link revision}. */
interface TeamTaskSnapshot {
  readonly id: TeamTaskId
  readonly revision: number
  readonly subject: string
  readonly description: string
  readonly status: TeamTaskStatus
  readonly ownerId?: SessionId
  readonly blockedBy: TeamTaskId[]
  readonly writeScopes: string[]
}
```

`pending` es no iniciada o liberada, `in_progress` lleva un propietario, `completed` satisface a las tasks bloqueantes y `deleted` es un tombstone retenido. Las vistas añaden el nombre del propietario, la disponibilidad y avisos de solapamiento de ámbitos de escritura sin cambiar el snapshot durable.

<a id="web-projection"></a>

## Proyección web

La sesión Lead publica `SessionProjectionMap.agentTeam` con filas durables del roster y vistas de tasks no eliminadas. `failure` informa de un registro persistido rechazado junto al último estado válido. La actividad de los miembros proviene del estado de la sesión; las etiquetas del modelo provienen de la proyección `modelSelection` de cada miembro.

```ts type-equiv
/** One durable roster row published through the `agentTeam` Session projection. */
interface TeamMemberProjection {
  readonly id: SessionId
  readonly name: string
  readonly role: 'lead' | 'teammate'
  /** Durable lifecycle; the Lead row is always `active`. Turn activity comes from Session status. */
  readonly phase: TeamMemberPhase
  readonly error?: string
}
```

```ts type-equiv
/** Runtime-enriched task view returned to tools and hosts. */
interface TeamTaskView {
  readonly id: TeamTaskId
  readonly revision: number
  readonly subject: string
  readonly description: string
  readonly status: TeamTaskStatus
  readonly blockedBy: TeamTaskId[]
  readonly writeScopes: string[]
  readonly ownerName?: string
  readonly ready: boolean
  readonly writeScopeWarnings: string[]
}
```

```ts type-equiv
/**
 * Durable Team state published to browser clients through the Lead Session's
 * `agentTeam` projection. `failure` names the first rejected persisted Team
 * record; members and tasks then stay at the last valid state.
 */
interface TeamProjection {
  readonly members: TeamMemberProjection[]
  readonly tasks: TeamTaskView[]
  readonly failure?: string
}
```

## Reproducción

La proyección de sesión `agentTeam` reproduce una sesión raíz en el roster, el tablero de tasks y el mailbox de encolados menos entregados que lee cada operación del Team. Selecciona registros por `TeamId`, de modo que los eventos heredados por un fork ordinario conservan el id del ancestro y nunca entran en el estado de la nueva raíz. `seq` y `time` del evento de sesión siguen siendo el registro de orden y tiempo; los snapshots del Team no los duplican. Las lecturas de roster y tasks llegan a los llamantes como vistas; el correo pendiente permanece interno a la entrega y la recuperación. El [README](../../packages/experimental/agent-team/README.md) del paquete es dueño del comportamiento de operación, autorización, recuperación y límites.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxagentteams--teamservice"></a>

### `ctx.agentTeams` — `TeamService`

Agent Teams service backed by the exact live Lead Session log.

```ts cordis-catalog
/**
 * Resolve one exact live Agent's Team role.
 * @param agent - exact live Agent used as the authority credential.
 * @returns its root, Team identity, role, and model-facing name.
 */
membership(agent: Agent): TeamMembership

/**
 * List the runtime-enriched roster visible to one Team member.
 * @param agent - exact live Team member.
 * @returns Lead and teammate rows in creation order.
 */
listMembers(agent: Agent): TeamMemberView[]

/**
 * Create one named, continuable direct child of the Team Lead.
 * @param caller - exact live Lead Agent.
 * @param request - immutable name, description, prompt, context mode, provider, and cancellation.
 * @returns the active roster row.
 */
async spawnTeammate(caller: Agent, request: SpawnTeammateRequest): Promise<SpawnTeammateResult>

/**
 * Queue one durable peer message, then attempt immediate delivery.
 * @param caller - exact live sending Team member.
 * @param request - target name, content, and pre-queue cancellation.
 * @returns durable message identity and immediate-delivery observation.
 */
async sendMessage(caller: Agent, request: SendTeamMessageRequest): Promise<SendTeamMessageResult>

/**
 * Create one unowned pending task in the Team Lead log.
 * @param caller - exact live Team member creating the task.
 * @param request - task text, blockers, and advisory write scopes.
 * @returns the revision-one task view.
 */
async createTask(caller: Agent, request: CreateTeamTaskRequest): Promise<TeamTaskView>

/**
 * Return one task, including a deleted tombstone.
 * @param caller - exact live Team member reading the task.
 * @param id - Team-local task identity.
 * @returns the latest task value and derived readiness diagnostics.
 */
getTask(caller: Agent, id: TeamTaskId): TeamTaskView

/**
 * List current non-deleted tasks in numeric creation order.
 * @param caller - exact live Team member reading the board.
 * @returns detached current task views.
 */
listTasks(caller: Agent): TeamTaskView[]

/**
 * Compare-and-set one authorized task transition.
 * @param caller - exact live Team member authorizing the mutation.
 * @param request - task identity, expected revision, action, and action fields.
 * @returns the committed next task revision.
 */
async updateTask(caller: Agent, request: UpdateTeamTaskRequest): Promise<TeamTaskView>

/**
 * Wait for the next Team-domain or member-status change.
 * @param caller - exact live Team member waiting for activity.
 * @param timeoutMs - bounded wait duration from ten seconds through one hour.
 * @param signal - caller cancellation for the wait only.
 * @returns one observed change or a timeout result.
 */
async waitForChange(caller: Agent, timeoutMs: number, signal: AbortSignal): Promise<TeamWaitResult>

/**
 * Interrupt one live teammate turn without clearing its pending inbox.
 * @param caller - exact live Lead Agent.
 * @param targetName - durable teammate name.
 * @returns the target status sampled before cancellation.
 */
interrupt(caller: Agent, targetName: string): { previousStatus: 'running' | 'inactive' }

/**
 * Resolve a caller without throwing, used by scoped-tool installation and observers.
 * @param agent - candidate exact live Agent.
 * @returns Team membership, or undefined for non-Team subagents and stale identities.
 */
tryMembership(agent: Agent): TeamMembership | undefined
```

Types: [Agent](core.es.md)

Source: [`packages/experimental/agent-team/src/index.ts`](../../packages/experimental/agent-team/src/index.ts)
<!-- END GENERATED cordis-surface -->
