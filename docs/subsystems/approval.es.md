# Aprobación del usuario

[English](approval.md) | Español

El seam de aprobación del usuario de [dsh-user-approval](../../packages/interaction/user-approval) responde a una sola pregunta: ¿puede continuar esta acción concreta? Es dueño del vocabulario compartido de solicitud/resultado, el servicio de despacho `ctx.approval`, el waterfall (eventos en cascada) de respondedores `approval/request`, el par de auditoría de solo registro y la política `ask`/`never` por sesión. Los canales de UI pueden aportar respondedores humanos; el [puente de automatización ACP](../../packages/acp/acp) aporta decisiones de máquina de un solo uso para sus propios agents. Los llamantes como [dsh-tools](../../packages/core/tools) y [dsh-tool-bash](../../packages/shell/tool-bash) consumen el resultado cerrado y deniegan por defecto salvo que sea `allowed-once`.

Fuente: [`packages/interaction/user-approval/src/index.ts`](../../packages/interaction/user-approval/src/index.ts)

## Identidad y resultado

Cada solicitud recibe un `ApprovalRequestId` nuevo. La marca empareja los eventos de auditoría `approval/asked` y `approval/decided` sin hacer que los ids de aprobación sean intercambiables con los ids de llamada a tool o de agent/sesión.

```ts type-equiv
/**
 * Pairs one `approval/asked` audit event with its `approval/decided`.
 * Service-issued (one fresh id per {@link ApprovalService.request} call).
 */
type ApprovalRequestId = Branded<'ApprovalRequestId'>
```

`ApprovalOutcome` es cerrado y con denegación por defecto. `allowed-once` concede solo la acción consultada; los llamantes deniegan ante `rejected`, `cancelled` y `unavailable`. Un respondedor ausente, no propietario, que lanza una excepción o que no cumple el contrato se convierte en `unavailable` en lugar de abrir la puerta.

```ts type-equiv
/**
 * Closed approval outcomes: a one-shot grant, explicit rejection, withdrawn
 * request, or unavailable answerer. Callers fail closed on `unavailable`.
 */
type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'
```

## Política por sesión

`ApprovalPolicy` determina qué ocurre antes de que se ejecuten los respondedores interactivos. `ask` delega en la cadena de respondedores compuesta, cuyo valor por defecto sin respuesta es `unavailable`; `never` devuelve `rejected` de forma determinista sin despachar ningún respondedor. El valor efectivo es el último evento `approval/policy` del registro de sesión, con la configuración del servicio como respaldo. Los consumidores lo leen con `ctx.approval.effectivePolicy(session)`; `setApprovalPolicy(session, policy)` es la única vía de escritura, de modo que la reproducción reconstruye el override.

```ts type-equiv
/**
 * A session's approval policy — what happens to an {@link ApprovalService}
 * ask BEFORE any interactive answerer sees it:
 *
 * - `'ask'` (the default) — delegate to the composed answerers; with none
 *   composed the chain falls through to the fail-closed `'unavailable'`.
 * - `'never'` — never prompt anyone: every ask resolves `'rejected'`
 *   deterministically. The strict headless stance (CI, unattended runs) and
 *   the policy whose outcome is knowable without asking.
 */
type ApprovalPolicy = 'ask' | 'never'
```

Ambas políticas aportan su significado actual completo al snapshot de contexto de runtime seguro para caché. El `user/message` originado es la entrada durable visible para el modelo; cambiar el estado de aprobación anexa un nuevo snapshot completo tras el historial retenido sin tocar los nodos `system/message` que contienen el prompt del sistema renderizado.

## Solicitud de aprobación

`ApprovalRequest` identifica al agent y a la acción de tool con la precisión suficiente para enrutar y auditar la pregunta. Omite deliberadamente los argumentos de la tool: un respondedor adjunta el prompt a la llamada a tool ya emitida en flujo a través de `callId`, en lugar de renderizar una segunda copia que podría divergir. El opcional `displayReason` lleva a la presentación cadenas de locale propiedad del solicitante; `reason` sigue siendo el texto de auditoría.

```ts type-equiv
/**
 * Readonly same-process permission question. `callId` links to an already
 * presented tool call, so arguments are not duplicated here.
 */
interface ApprovalRequest extends ApprovalRequestEvent {
  /**
   * The agent on whose behalf the question is asked. Routes the question (a
   * UI answerer only answers for agents it owns) and receives the audit
   * events on its session log.
   */
  readonly agent: Agent
  /** The tool the question is about (presentation and audit). */
  readonly toolName: string
  /**
   * The exact tool call being decided, when the asker has one — lets a UI
   * attach the prompt to the tool call it already streamed.
   */
  readonly callId?: ToolCallId
  /** The asker's human-readable explanation of WHY it is asking. */
  readonly reason?: string
  /**
   * Aborting withdraws the question: the request settles `'cancelled'`
   * immediately and a late answer from a still-pending answerer is discarded.
   */
  readonly signal?: AbortSignal
}
```

## Despacho y auditoría

`ctx.approval.request(req)` requiere que la sesión solicitante esté dentro de un turno abierto. Anexa `approval/asked`, obtiene un resultado, anexa el `approval/decided` correspondiente y resuelve con ese resultado. La política `never` se aplica dentro del servicio antes del despacho del waterfall, de modo que ni siquiera un respondedor registrado más tarde con `prepend` puede eludirla. Los respondedores devuelven un resultado cuando son propietarios de la solicitud o llaman a `next()` para delegar; la primera respuesta ocupa el único slot de decisión.

Los eventos de auditoría son de solo registro y no entran en el transcript (transcripción) del modelo. El comportamiento visible para el modelo es el resultado de tool derivado por el llamante más el snapshot de contexto de runtime actual. El dispose (liberación de recursos) del servicio elimina su contribución de contexto; los listeners de respondedores se vinculan como efectos, de forma independiente, a sus plugins propietarios.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxapproval--approvalservice"></a>

### `ctx.approval` — `ApprovalService`

Approval service that applies session policy before answerers and logs every ask/outcome pair to the requesting session. It exposes deterministic policy changes to the model through the runtime-context snapshot and switch notices.

```ts cordis-catalog
/**
 * Switch one live agent's policy and queue the transition for its next model
 * step. Session initialization uses {@link setApprovalPolicy} directly
 * because there is no previously visible policy to change.
 * @param agent - the live agent whose policy is changing.
 * @param policy - the new effective policy.
 */
setPolicy(agent: Agent, policy: ApprovalPolicy): void

/**
 * Ask the composed answerers to decide one readonly same-process request.
 * The service borrows the request, agent, session, and live signal directly.
 * The request requires an open turn because the audit pair must be enclosed
 * by the durable log's commit/replay boundary; an idle ask rejects before
 * appending anything. The answerer phase always produces an outcome: an
 * aborted signal yields `'cancelled'`, a missing or throwing answerer yields
 * `'unavailable'` (fail closed), and a rogue non-vocabulary return value is
 * normalized to `'unavailable'`. A failure that prevents either audit append
 * from committing still rejects because returning an unlogged decision would
 * violate the pair. Session contains post-commit observer failures, so an
 * authoritative append cannot reject the request or suppress its matching
 * audit event.
 * @param req - the pending decision (agent, tool identity, reason, signal).
 * @returns the closed outcome; `'allowed-once'` is the only grant.
 * @throws when no turn is open or either audit event fails before the session
 *   append commit point.
 */
async request(req: ApprovalRequest): Promise<ApprovalOutcome>

/**
 * Read the session override without applying the configured default.
 * @param session - session whose log supplies the override.
 * @returns the last logged policy, or `undefined` without one.
 */
overrideOf(session: Session): ApprovalPolicy | undefined
```

Types: [Agent](core.es.md) · [Session](session.es.md)

Source: [`packages/interaction/user-approval/src/index.ts`](../../packages/interaction/user-approval/src/index.ts)

<a id="approval-events"></a>

### `approval/*` events

<a id="approvalrequest--waterfall"></a>

#### `approval/request` — waterfall

Ask composed answerers for one decision. Return an outcome to claim the request or call `next()` to delegate. Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.

```ts cordis-catalog
/**
 * Ask composed answerers for one decision. Return an outcome to claim the
 * request or call `next()` to delegate. Scope-filtered dispatch
 * (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @param req - pending approval request.
 * @mode waterfall
 */
'approval/request'( this: Scoped<Agent>, req: ApprovalRequestEvent, next: () => Promise<ApprovalOutcome>, ): Promise<ApprovalOutcome>
```

Types: [Agent](core.es.md) · [Scoped](scope.es.md)

Source: [`packages/interaction/user-approval/src/types.ts`](../../packages/interaction/user-approval/src/types.ts)
<!-- END GENERATED cordis-surface -->
