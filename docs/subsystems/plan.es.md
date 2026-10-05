# Modo Plan

[English](plan.md) | Español

El modo Plan es estado de colaboración registrado por agent (agente), propiedad de [dsh-plan-mode](../../packages/plan/plan-mode) (`ctx.planMode`, `PlanModeController`): mientras está activo, cada solicitud al modelo incluye una sección de guía propiedad del despliegue. El modo Plan es **guía blanda**. El [modo de sandbox](sandbox.es.md) y la [política de aprobación](approval.es.md) imponen restricciones de forma independiente; ninguno lee ni escribe el estado del plan, de modo que los despliegues los configuran por separado. El paquete es opcional y el agent loop no depende de él. Contribuye la sección de prompt `plan:policy` y registra el tool `exit_plan_mode` y el comando `/plan`. La [nota de diseño](../../.agents/notes/implemented/simplification/2026-07-22-plan-specific-collaboration-state.md) posee la justificación; el [README del paquete](../../packages/plan/plan-mode/README.md) posee el detalle de experiencia del modelo y las limitaciones.

Fuente: [`packages/plan/plan-mode/src/index.ts`](../../packages/plan/plan-mode/src/index.ts)

## Estado registrado y recuperación

`plan/mode` (`{ active: boolean }`) es un [evento de sesión](session.es.md) solo de registro y de reemplazo de valor completo: durable y reproducible, nunca en el transcript del modelo. La unidad `plan`, registrada opcionalmente, pliega el modo confirmado, la liquidación del comando y el modo registrado en la cabecera de la solicitud más reciente. `ctx.planMode` lee ese estado a través de `stateOf()`; el primer acceso dependiente falla si el registry, la clave `plan` o la clave `turnBoundary` están ausentes. Los clientes solo reciben `{ active, pending }`; resume, fork y la compactación (compaction) recuperan ambos a partir del registro. La declaración completa del evento está en el [catálogo de eventos del registro de persistencia](../persistence-catalog.es.md).

## Selecciones pendientes y el append pre-paso

Como todo evento de sesión está encerrado en un turno, una selección del usuario permanece pendiente hasta que el siguiente pre-paso dentro del turno aceptado la anexe antes de la derivación de la solicitud, en el turno en que eso ocurra. Una selección nunca fuerza la continuación, de modo que una hecha tras el último pre-paso aceptado de un turno se anexa en un turno posterior. `set(agent, active)` registra la selección pendiente (un no-op cuando el objetivo es igual al estado registrado o ya pendiente), y `get(agent)` devuelve `{ active: boolean; pending?: boolean }`: el estado registrado usado para ensamblar el paso actual más el estado seleccionado que espera ser anexado.

El único punto de append mientras un agent está en ejecución es un listener `agent/pre-step` antepuesto. Observa cada paso de solicitud propuesto, incluidos el turno 1 paso 1 y los reintentos de recuperación de solicitudes, llama primero a los listeners posteriores y anexa solo después de que acepten el paso. La admisión del prompt ocurre antes de un turno y no puede anexar `plan/mode`, de modo que una selección hecha en el prompt la anexa el primer pre-paso dentro del turno aceptado del turno que inicia. Un fallo de append no puede bloquear el turno, y la selección permanece pendiente para un pre-paso dentro del turno aceptado posterior. Una selección de usuario anexada también registra un aviso `user/message` con origen en el plugin, pero solo cuando la última cabecera de solicitud registrada describía el otro estado, de modo que se informa al modelo exactamente cuándo cambió su contexto y nunca de forma redundante. Una selección hecha tras el último pre-paso aceptado de un turno permanece local al proceso y se pierde si el proceso termina antes de otro pre-paso dentro del turno aceptado ([limitación del README](../../packages/plan/plan-mode/README.md#known-limitations-and-deferred-work)).

## Configuración

```ts type-equiv
/** Deployment-owned plan guidance. */
interface PlanModeConfig {
  /** Guidance rendered as the `plan:policy` prompt section while plan mode is active. */
  section: string
}
```

Una `section` ausente, en blanco o no string y cualquier clave desconocida fallan en la carga del plugin en lugar de ignorarse. Mientras el modo Plan está activo, el texto exacto de `section` se renderiza como la [sección del prompt del sistema](system-prompt.es.md) `plan:policy` en el orden 50; el modo Plan inactivo no contribuye texto.

## El tool de salida y el comando `/plan`

[`exit_plan_mode`](../tool-catalog.es.md#deepseek-aidsh-plan-mode) permanece registrado mientras el modo Plan está inactivo, de modo que entrar o salir del modo Plan solo cambia la sección del prompt, nunca el catálogo de tools de la solicitud; la ejecución fuera del modo Plan falla. En el modo Plan requiere un plan completo en markdown que empiece con un encabezado `#` y lo presenta para revisión a través del [seam de user-questions](user-questions.es.md). La aprobación devuelve `{ approved: true }` y registra una salida pendiente silenciosa (no narrada) que se anexa en el siguiente pre-paso dentro del turno aceptado. La guía de plan permanece por tanto activa durante el resto del lote de tools actual del asistente, y el propio resultado del tool informa de la transición. Seguir planificando es una llamada fallida que porta el feedback del usuario, de modo que el modelo revisa y presenta de nuevo; un canal de interacción ausente y una recarga del servicio durante la revisión también hacen fallar la llamada en lugar de salir silenciosamente del modo Plan.

Cuando [`ctx.commands`](commands.es.md) está compuesto, el plugin registra `/plan [off|message]`: `/plan` a secas selecciona el modo Plan, cualquier otro mensaje no vacío lo selecciona y después envía el texto a través de `agent.steer()` para que se convierta en el mensaje de usuario registrado ordinario del siguiente paso bajo la guía de plan, y el argumento exacto `off` selecciona inactivo, lo que también cancela una entrada pendiente antes de que se anexe y se vuelva visible para una solicitud.

## El servicio

`ctx.planMode` posee el estado de plan registrado, aplica y narra el estado seleccionado al inicio del paso, y posee la sección `plan:policy`, el comando `/plan` y el tool de salida estable; las firmas de `get`/`set` están en el [catálogo de servicios](#ctxplanmode--planmodecontroller) generado.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxplanmode--planmodecontroller"></a>

### `ctx.planMode` — `PlanModeController`

`ctx.planMode`: owns logged plan state, applies and narrates selected state at step start, the `plan:policy` section, the `/plan` command, and the stable exit tool. Client carriers expose the projection's cropped `{ active, pending }` view.

```ts cordis-catalog
/**
 * Read the logged plan state and any selected state awaiting the next
 * accepted in-turn pre-step.
 *
 * @param agent The agent to read.
 * @returns Current logged state plus a pending selection, when present.
 */
get(agent: Agent): { active: boolean; pending?: boolean }

/**
 * Select whether plan mode should be active. Between turns the method
 * appends the change immediately because no in-turn pre-step will run until
 * another prompt starts a turn. The open-turn fold is the idle signal:
 * agent status stays `running` through post-turn checkpointing, when no
 * further in-turn pre-step runs. During an open turn the selection remains
 * pending until the next accepted in-turn pre-step. Repeated selection of
 * the current or already-pending state is a no-op.
 *
 * @param agent The agent to switch.
 * @param active Whether plan mode should be active.
 * @returns what happened: `committed` (logged now), `queued` (awaiting the
 * next accepted in-turn pre-step), `cancelled` (an opposite pending selection
 * was cleared; the logged state already matches), or `noop` (already in that
 * state).
 */
set(agent: Agent, active: boolean): 'committed' | 'queued' | 'cancelled' | 'noop'
```

Types: [Agent](core.es.md)

Source: [`packages/plan/plan-mode/src/index.ts`](../../packages/plan/plan-mode/src/index.ts)
<!-- END GENERATED cordis-surface -->
