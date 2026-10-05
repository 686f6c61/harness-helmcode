# Interacción con el usuario

[English](user-questions.md) | Español

El seam user-questions de [dsh-user-questions](../../packages/interaction/user-questions). Es el vocabulario agnóstico de proveedor que un tool o un plugin de permisos usa cuando necesita que el humano responda antes de que el agent (agente) pueda continuar. Listeners de waterfall (eventos en cascada) con ámbito de agent componen las superficies de UI disponibles, incluidos los listeners retransmitidos a un cliente conectado.

Fuente: [`packages/interaction/user-questions/src/index.ts`](../../packages/interaction/user-questions/src/index.ts)

## Opciones de la pregunta

`AskUserQuestionOption` contiene una opción seleccionable. `label` es el texto de la opción visible para el usuario y también el valor seleccionado visible para el modelo; `description` es un texto de ayuda opcional para la UI.

```ts type-equiv
/** One selectable answer offered to the user. */
interface AskUserQuestionOption {
  /** User-facing label. */
  label: string
  /** Optional extra context rendered by capable UIs. */
  description?: string
}
```

## Intención de presentación

`AskUserQuestionIntent` declara opcionalmente un tipo de decisión conocido. Está etiquetado en `kind` para poder añadir más intenciones; una UI que no reconoce una etiqueta renderiza la lista genérica de opciones. Una intención cambia solo la presentación: una UI que la respeta responde con las mismas etiquetas de opción que enviaría una UI genérica, de modo que el llamante lee los mismos campos de respuesta en ambos casos. `approve` nombra la opción afirmativa en lugar de depender del orden de las opciones. `ask()` rechaza las dos afirmaciones que ningún tipo puede expresar: un `approve` que no nombra ninguna de las opciones de su propia pregunta, y una intención en una pregunta sin `detail`.

```ts type-equiv
/**
 * A caller-declared presentation intent: the question IS this kind of
 * decision, so a UI that recognises the tag may present it as such instead of as a
 * generic option list. Tagged so further intents can be added; a UI that does
 * not know a tag renders the generic flow, and the answer encoding is identical
 * either way — an intent changes presentation only, never the protocol.
 */
type AskUserQuestionIntent = {
  /** A plan submitted for review: `detail` is the plan markdown `ask()` requires, and the decision approves or declines it. */
  kind: 'plan-review'
  /**
   * The option label that approves the plan; every other option declines it.
   * Named rather than positional so no UI infers the verdict from option order.
   * An `approve` naming no option of its own question is rejected at `ask()`.
   */
  approve: string
  /** Logged tool invocation whose arguments contain the reviewed plan. */
  callId?: ToolCallId
}
```

## Ítem de pregunta

`AskUserQuestionItem` es una pregunta dentro de una solicitud. El llamante proporciona un `id` estable, que se devuelve con la respuesta para que las preguntas agrupadas sigan siendo enrutables. El `detail` opcional lleva texto de apoyo que los proveedores renderizan con la pregunta pero mantienen fuera de las etiquetas de opción seleccionables.

```ts type-equiv
/** One question in a user-questions request. */
interface AskUserQuestionItem {
  /** Stable caller-provided question id, echoed in the answer. */
  id: string
  /** The question to display. */
  question: string
  /** Optional supporting detail rendered with the question but kept out of option labels. */
  detail?: string
  /** Optional short heading/group label. */
  header?: string
  /** Optional choices the UI can render as a menu. */
  options?: AskUserQuestionOption[]
  /** Whether more than one option may be selected. Defaults to single-select. */
  multiSelect?: boolean
  /** Optional presentation intent for capable UIs; absent asks for the generic option list. */
  intent?: AskUserQuestionIntent
}
```

## Solicitud de pregunta

`AskUserQuestionRequest` es la solicitud compartida entre paquetes. `questions` es un array para que una UI pueda presentar prompts relacionados en un solo flujo conservando un id estable por respuesta. Cuando está presente, `agent` es el llamante en vivo exacto; el seam de interacción lo admite solo mientras el registry en vivo identifica esa instancia como una raíz de runtime.

```ts type-equiv
/** Request for a human answer. */
interface AskUserQuestionRequest extends AskUserQuestionRequestEvent {}
```

## Respuesta

Los proveedores devuelven un ítem de respuesta por id de pregunta. `selected` contiene las etiquetas de opción seleccionadas, y `custom` lleva una respuesta libre «Other» cuando el usuario escribió una. Para una pregunta de selección única, `custom` prevalece sobre la opción seleccionada y `selected` queda vacío. Para una pregunta de selección múltiple, `custom` puede complementar las etiquetas de `selected`. Una UI también puede usar un ítem con `selected` vacío y sin `custom` para preservar una pregunta omitida en un lote por lo demás completado.

```ts type-equiv
/** Answer to one question. */
interface AskUserQuestionAnswerItem {
  /** The answered question id. */
  id: string
  /** Selected option labels. May accompany custom text for a multi-select question. */
  selected: string[]
  /** Optional free-text "Other" answer. */
  custom?: string
}
```

```ts type-equiv
/** The human's answer. */
interface AskUserQuestionAnswer {
  /** Structured answers keyed by question id. */
  answers: AskUserQuestionAnswerItem[]
}
```

Los respondedores temporizados reciben `wait: { callId, timed: true }`. El id de llamada identifica la tarjeta y la espera en primer plano. El Client llama a `attachWait` para reclamar la espera y obtener su duración restante; el transporte reenvía el evento original sin inspeccionar ni reescribir estos campos. Un `wait` sin `timed` identifica una solicitud indefinida con clave de tarjeta. Un `wait` ausente identifica una solicitud bloqueante sin clave de tarjeta.

```ts type-equiv
/** Client-safe payload declared for the user-question answerer waterfall. */
interface AskUserQuestionRequestEvent {
  /** Questions to display. */
  questions: AskUserQuestionItem[]
  /** Agent identity projected to the corresponding Client Context in transit. */
  agent?: Agent
  /** Cancellation lifetime of the pending request. */
  signal?: AbortSignal
  /**
   * Tool call the Client card is keyed by. Timed answerers attach to the
   * business wait stream before starting their local countdown.
   */
  wait?: {
    /** Tool call the Client card is keyed by. */
    callId: ToolCallId
    /** True for a foreground wait that requires a Client claim; absent for indefinite waits. */
    timed?: boolean
  }
}
```

## Preguntas temporizadas y respuestas tardías

Una pregunta temporizada espera una ventana acotada en primer plano y luego deja que el agent continúe con trabajo independiente. Si el usuario responde dentro de la ventana, el tool devuelve el lote de respuestas; en caso contrario `TimedUserQuestionResult` es `{ pending: true, callId }`. Pendiente significa que la pregunta sigue siendo respondible; no es una respuesta vacía, un rechazo, una confirmación ni un permiso.

```ts type-equiv
/** Timed ask result returned when the foreground answer window closes. */
type TimedUserQuestionResult = AskUserQuestionAnswer | { pending: true; callId: ToolCallId }
```

Una reclamación del Client es un flujo Remote de negocio, no una entrega de la puerta de enlace. `TimedQuestionWait` conserva el plazo original del Host y ejecuta su temporizador solo mientras no exista ninguna reclamación. Su flujo `attachWait` emite la duración restante actual, y el Client hace la cuenta atrás con su propio reloj. El foco, la edición y el tiempo dedicado permanecen locales. La cancelación del flujo libera esa reclamación; después de que se va la última reclamación, el Host reanuda el plazo original. Un tiempo de espera sin atender aborta la señal privada del waterfall en primer plano y devuelve pendiente sin cancelar el turno. La puerta de enlace y `api-remotes` no contienen ninguna política de temporización específica de preguntas.

La proyección de sesión `userQuestions` pliega los eventos existentes en el conjunto de preguntas respondibles y en el de las liquidadas; no se registra ningún estado de espera, de foco ni de plazo. Cada `request/header` registra los schemas de tool exactos que vio el modelo. Las llamadas nativas se rastrean solo cuando ese encabezado declara el schema temporizado `ask_user_question` con un parámetro `timeout`; el tool bloqueante heredado nunca lo declara. Una `tool/call` nativa abre una pregunta. Un `tool/result` la marca como `continued` solo cuando lleva el payload pendiente o es el resultado sintético `TOOL_OUTCOME_UNKNOWN` que la reparación de reanudación de sesión anexa; un lote de respuestas la mueve a `settled` con ese lote, y cualquier fallo la descarta. Una subllamada PTC de `run_code` entra en la proyección cuando su resultado `tool/ptc-dispatch` está pendiente, aunque el encabezado de la solicitud solo exponga `run_code`. Una respuesta tardía mueve una pregunta continuada a `settled` cuando su mensaje se admite como `user/message`, junto con el lote de respuestas leído de ese mensaje: el resultado de la propia llamada temporizada registró el tiempo de espera, de modo que una fila del transcript (transcripción) no tiene otro lugar de donde leer lo que el usuario eligió finalmente. Una respuesta encolada puede cancelarse antes de la admisión y deja la pregunta respondible. Una respuesta cuyo texto no lleva ningún lote legible liquida la llamada sin respuestas; una que nombra una llamada que no está activa no cambia nada.

```ts type-equiv
/** `open` while the tool call may still return the answer; `continued` once the answer can only arrive as a new turn. */
type UserQuestionState = 'open' | 'continued'
```

```ts type-equiv
/** One unanswered timed `ask_user_question` call reconstructed from the Session log. */
interface PendingUserQuestion {
  readonly callId: ToolCallId
  readonly questions: readonly AskUserQuestionItem[]
  readonly state: UserQuestionState
}
```

```ts type-equiv
/**
 * One timed `ask_user_question` call and the answers it settled with: the
 * batch its own result carried when the user answered inside the window,
 * otherwise the batch its late reply carried, because that call's own result
 * recorded the timeout. A transcript row reads what the user finally answered
 * from here, and only a call listed here was a timed one.
 */
interface SettledUserQuestion {
  /** The settled call. */
  readonly callId: ToolCallId
  /** The recorded batch, one entry per question; empty when the late reply carried none. */
  readonly answers: readonly AskUserQuestionAnswerItem[]
}
```

```ts type-equiv
/**
 * Both halves of one Session's timed `ask_user_question` state, as every
 * Client reads them. A call made while the blocking legacy tool was in
 * effect appears in neither half.
 */
interface UserQuestionProjectionView {
  /** Calls that can still take an answer, in ask order. */
  readonly active: readonly PendingUserQuestion[]
  /** Calls an answer settled, in settlement order. */
  readonly settled: readonly SettledUserQuestion[]
}
```

Una pregunta abierta acepta respuestas solo a través del waterfall. Una vez que está `continued`, el método Remote `answer` encola un mensaje de usuario para el agent propietario y lo despierta si está inactivo. El mensaje tiene fuente `user-question-reply`, resultado `answered` y un payload `answer_to_pending_question`. El método devuelve `false` para una llamada abierta o desconocida, rechaza una segunda respuesta encolada con `REPLY_QUEUED` incluso después de un reinicio del Host, y rechaza lotes de respuestas incompletos o duplicados con `BAD_ANSWER`.

Cerrar el panel del Client no envía nada. Un tiempo de espera en primer plano solo termina la espera del tool. Las preguntas continuadas no tienen plazo; siguen siendo respondibles hasta que se admite una respuesta.

Tras un reinicio del Host, la capa Remote reanuda el agent raíz cuando la sesión se reabre. Una respuesta tardía entra entonces en un turno nuevo.

## Errores

`UserQuestionError` extiende `HarnessError`, de modo que `ctx.tools.execute()` preserva `{ name, code }` para los fallos de tools visibles para el modelo como `EMPTY_QUESTIONS`, `BAD_INTENT`, `NO_PROVIDER`, `ASK_ABORTED` o la cancelación del lado de la UI.

```ts type-equiv
/** Stable error taxonomy for user-questions failures. */
class UserQuestionError extends HarnessError {
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'UserQuestionError'
  }
}
```

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxuserquestions--userquestionservice"></a>

### `ctx.userQuestions` — `UserQuestionService`

`ctx.userQuestions`: validation plus the scoped answerer waterfall.

```ts cordis-catalog
/**
 * Answer a continued question. The reply is steered into the agent as a
 * user message whose source names the call; that message is also the
 * record that closes the question in the projection.
 * @param agent - Live root agent for the owning Session.
 * @param callId - Continued question identity.
 * @param answer - Complete structured answer batch, one item per question of the call.
 * @returns Whether the question is still continued; an accepted reply stays
 *   queued until the agent admits its user message.
 * @throws {UserQuestionError} `BAD_ANSWER` when the batch does not name each
 *   question of the call exactly once, or `REPLY_QUEUED` when a reply is
 *   already waiting for admission.
 */
@Remote answer(agent: Agent, callId: ToolCallId, answer: AskUserQuestionAnswer): boolean

/**
 * Let one answer UI hold a live timed wait. Closing the stream releases its claim.
 * @param agent - Live root agent owning the question.
 * @param callId - Foreground tool call to attach to.
 * @param signal - Remote stream cancellation, including Client disconnect.
 * @returns One Host-computed remaining duration, or no frames once the wait ended.
 */
@Remote({ mode: 'stream' }) async *attachWait(agent: Agent, callId: ToolCallId, signal: AbortSignal): AsyncIterable<{ remainingMs: number }>

/**
 * Foreground wait whose first settlement the Client decides: the Client
 * rejects with `ASK_TIMED_OUT` when its countdown ends, and this method maps
 * that code to the pending result.
 * @param request - Questions, live owner agent, and abort signal.
 * @param callId - Tool call identity the Client card is keyed by.
 * @param timeoutMs - Positive foreground wait in milliseconds.
 * @returns The answer when it arrives inside the window, otherwise a pending
 *   result, also when no connected Client claimed the request by the deadline.
 * @throws {UserQuestionError} `BAD_TIMEOUT` for a non-integer, non-positive,
 *   or oversized wait.
 */
async askTimed( request: AskUserQuestionRequest & { agent: Agent }, callId: ToolCallId, timeoutMs: number, ): Promise<TimedUserQuestionResult>

/**
 * Ask the scoped answerer waterfall and wait for the user's answer.
 *
 * When a caller supplies an agent, human interaction is valid only for the
 * exact live runtime root. Runtime ownership, not durable session lineage,
 * decides this boundary: an owned child has no human answerer and would
 * block forever, while a lineage-bearing session resumed as a new runtime
 * root may ask normally.
 *
 * @param request Questions, owner agent, and abort signal.
 * @returns The answer chosen or typed by the human.
 * @throws {UserQuestionError} code `ASK_ABORTED` when the supplied signal
 *   is already or becomes aborted, `CALLER_NOT_LIVE` when a supplied agent
 *   is not the registry's exact live instance, or `DELEGATED_CALLER` when
 *   that live agent is owned by another agent.
 */
async ask(request: AskUserQuestionRequest): Promise<AskUserQuestionAnswer>
```

Types: [Agent](core.es.md) · [ToolCallId](core.es.md)

Source: [`packages/interaction/user-questions/src/index.ts`](../../packages/interaction/user-questions/src/index.ts)

<a id="user-questions-events"></a>

### `user-questions/*` events

<a id="user-questionsrequest--waterfall"></a>

#### `user-questions/request` — waterfall

Ask composed answerers for structured user input. Return an answer to claim the request or call `next()` to delegate. Scope-filtered dispatch (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.

```ts cordis-catalog
/**
 * Ask composed answerers for structured user input. Return an answer to
 * claim the request or call `next()` to delegate. Scope-filtered dispatch
 * (`@deepseek-ai/dsh-scope`): agent-scoped listeners receive only that agent.
 * @param request - pending user-question request.
 * @mode waterfall
 */
'user-questions/request'( this: Scoped<Agent>, request: AskUserQuestionRequestEvent, next: () => Promise<AskUserQuestionAnswer>, ): Promise<AskUserQuestionAnswer>
```

Types: [Agent](core.es.md) · [Scoped](scope.es.md)

Source: [`packages/interaction/user-questions/src/types.ts`](../../packages/interaction/user-questions/src/types.ts)
<!-- END GENERATED cordis-surface -->
