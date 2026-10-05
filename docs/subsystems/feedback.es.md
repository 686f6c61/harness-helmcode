# Feedback de mensajes

[English](feedback.md) | Español

[`@deepseek-ai/dsh-message-feedback`](../../packages/feedback/message-feedback) es dueño del feedback editable de mensajes individuales del asistente. El registro de sesión canónico almacena `feedback/message-put` y `feedback/message-delete`; la observación inmutable a nivel de sesión sigue siendo `feedback/record`, propiedad de [`@deepseek-ai/dsh-command-feedback`](../../packages/feedback/command-feedback) junto con la taxonomía `FeedbackCategory` bajo la que se clasifican ambos tipos de feedback. Los tres son eventos de solo registro que nunca entran en el contexto del modelo.

Fuente: [`packages/feedback/message-feedback/src/types.ts`](../../packages/feedback/message-feedback/src/types.ts)

## Tipos públicos

```ts type-equiv
/** Opaque compare-and-set token for one exact feedback item revision. */
type MessageFeedbackVersion = Branded<'MessageFeedbackVersion'>
```

```ts type-equiv
/** The human's overall judgment of one assistant message. */
type MessageFeedbackRating = 'positive' | 'negative'
```

```ts type-equiv
/** One current feedback value and its opaque mutation token. */
interface MessageFeedbackItem {
  /** Stable identity of the assistant message inside the owning Session. */
  readonly messageId: MessageId
  /** Overall positive or negative judgment. */
  readonly rating: MessageFeedbackRating
  /** Optional explanation, preserved verbatim after validation. */
  readonly note?: string
  /** Category the human filed the judgment under. */
  readonly category?: FeedbackCategory
  /** Equality-only token replaced by every material create or update. */
  readonly version: MessageFeedbackVersion
  /** Host-assigned creation time in Unix epoch milliseconds. */
  readonly createdAt: number
  /** Host-assigned time of the most recent material update. */
  readonly updatedAt: number
}
```

```ts type-equiv
/** A material creation or edit, retaining its complete current value. */
interface MessageFeedbackPut {
  /** Owning Session; inherited feedback in a fork belongs to its parent. */
  readonly sessionId: SessionId
  /** Value after this mutation, including the original creation time. */
  readonly item: MessageFeedbackItem
}
```

```ts type-equiv
/** A material deletion of one current feedback item. */
interface MessageFeedbackDelete {
  /** Session that owns the deleted feedback. */
  readonly sessionId: SessionId
  /** Message whose feedback was removed. */
  readonly messageId: MessageId
}
```

```ts type-equiv
/** Read all message feedback belonging to one persisted Session lifecycle. */
interface MessageFeedbackListRequest {
  /** Session whose feedback events should be read. */
  readonly sessionId: SessionId
}
```

```ts type-equiv
/** Current feedback values for one Session, in first-creation order. */
interface MessageFeedbackListValue {
  /** Fresh immutable item snapshots. */
  readonly items: readonly MessageFeedbackItem[]
}
```

```ts type-equiv
/** Create or replace feedback for one assistant message. */
interface MessageFeedbackPutRequest {
  /** Persisted Session that owns the target message. */
  readonly sessionId: SessionId
  /** Target assistant-message identity. */
  readonly messageId: MessageId
  /** Desired overall judgment. */
  readonly rating: MessageFeedbackRating
  /** Optional non-blank explanation. */
  readonly note?: string
  /** Optional category; absent keeps the item uncategorized. */
  readonly category?: FeedbackCategory
  /** Observed item version, or `null` to require that no item exists. */
  readonly ifVersion: MessageFeedbackVersion | null
}
```

```ts type-equiv
/** Delete feedback for one message after observing its current version. */
interface MessageFeedbackDeleteRequest {
  /** Session that owns the feedback. */
  readonly sessionId: SessionId
  /** Message whose feedback should be absent after this operation. */
  readonly messageId: MessageId
  /** Observed item version; ignored when the item is already absent. */
  readonly ifVersion: MessageFeedbackVersion
}
```

```ts type-equiv
/** Idempotent deletion acknowledgement. */
interface MessageFeedbackDeleteValue {
  /** Stable postcondition shared by the first deletion and every retry. */
  readonly absent: true
}
```

```ts type-equiv
/** No persisted Session header exists for the requested id. */
interface MessageFeedbackSessionNotFound {
  readonly code: 'session-not-found'
  readonly sessionId: SessionId
}
```

```ts type-equiv
/** The id does not name a derived, append-origin assistant message. */
interface MessageFeedbackTargetNotFound {
  readonly code: 'target-not-found'
  readonly sessionId: SessionId
  readonly messageId: MessageId
}
```

```ts type-equiv
/** A material mutation did not match the addressed item's current version. */
interface MessageFeedbackVersionConflict {
  readonly code: 'version-conflict'
  /** Authoritative current item, or `null` when it does not exist. */
  readonly current: MessageFeedbackItem | null
}
```

```ts type-equiv
/** A supplied note contains no non-whitespace character. */
interface MessageFeedbackNoteBlank {
  readonly code: 'note-blank'
}
```

```ts type-equiv
/** A supplied note exceeds the configured UTF-8 byte limit. */
interface MessageFeedbackNoteTooLarge {
  readonly code: 'note-too-large'
  readonly maxBytes: number
  readonly actualBytes: number
}
```

```ts type-equiv
/** Failures shared by the public message-feedback operations. */
type MessageFeedbackFailure =
  | MessageFeedbackSessionNotFound
  | MessageFeedbackTargetNotFound
  | MessageFeedbackVersionConflict
  | MessageFeedbackNoteBlank
  | MessageFeedbackNoteTooLarge
```

```ts type-equiv
/** Successful public operation result. */
interface MessageFeedbackSuccess<T> {
  readonly ok: true
  readonly value: T
}
```

```ts type-equiv
/** Rejected public operation result with a stable business failure. */
interface MessageFeedbackRejected<E extends MessageFeedbackFailure> {
  readonly ok: false
  readonly error: E
}
```

```ts type-equiv
/** Result returned by the message-feedback `list` operation. */
type MessageFeedbackListResult =
  | MessageFeedbackSuccess<MessageFeedbackListValue>
  | MessageFeedbackRejected<MessageFeedbackSessionNotFound>
```

```ts type-equiv
/** Result returned by the message-feedback `put` operation. */
type MessageFeedbackPutResult =
  | MessageFeedbackSuccess<MessageFeedbackItem>
  | MessageFeedbackRejected<
    | MessageFeedbackSessionNotFound
    | MessageFeedbackTargetNotFound
    | MessageFeedbackVersionConflict
    | MessageFeedbackNoteBlank
    | MessageFeedbackNoteTooLarge
  >
```

```ts type-equiv
/** Result returned by the message-feedback `delete` operation. */
type MessageFeedbackDeleteResult =
  | MessageFeedbackSuccess<MessageFeedbackDeleteValue>
  | MessageFeedbackRejected<MessageFeedbackSessionNotFound | MessageFeedbackVersionConflict>
```

## Tipos de feedback de sesión

Fuente: [`packages/feedback/command-feedback/src/types.ts`](../../packages/feedback/command-feedback/src/types.ts)

```ts type-equiv
/** One of the fixed feedback categories; the ids are durable log vocabulary. */
type FeedbackCategory =
  | 'task-result'
  | 'instruction-following'
  | 'product-interaction'
  | 'service-stability'
  | 'resource-cost'
  | 'security-privacy-permission'
  | 'other'
```

```ts type-equiv
/**
 * One recorded human remark about a Session. Both members are optional: a
 * submission with neither still records that the human asked for the
 * Session to be reviewed, which is what authorizes log delivery.
 */
interface FeedbackRecord {
  /** Free-text remark with surrounding whitespace removed; never empty when present. */
  readonly text?: string
  /** Category the human filed the remark under. */
  readonly category?: FeedbackCategory
}
```

```ts type-equiv
/** Record one Session-level remark through the Host Remote. */
interface SessionFeedbackRecordRequest {
  /** Live Session the remark describes. */
  readonly sessionId: SessionId
  /** Free-text remark; blank text is recorded as absent. */
  readonly text?: string
  /** Category the human filed the remark under. */
  readonly category?: FeedbackCategory
}
```

```ts type-equiv
/** Stable postcondition of a recorded remark. */
interface SessionFeedbackRecordValue {
  /** The remark is appended to the Session log; flushing follows the Session's own schedule. */
  readonly recorded: true
}
```

```ts type-equiv
/** No live Session carries the requested id. */
interface SessionFeedbackSessionNotFound {
  readonly code: 'session-not-found'
  readonly sessionId: SessionId
}
```

```ts type-equiv
/** Result returned by the `sessionFeedback.record` operation. */
type SessionFeedbackRecordResult =
  | { readonly ok: true; readonly value: SessionFeedbackRecordValue }
  | { readonly ok: false; readonly error: SessionFeedbackSessionNotFound }
```

## Datos y concurrencia

Los elementos actuales se pliegan a partir de los eventos canónicos de feedback cuyo `sessionId` del payload coincide con la sesión propietaria. Cada elemento porta una valoración positiva o negativa, una nota opcional, una categoría opcional, las marcas de tiempo `createdAt`/`updatedAt` asignadas por el Host y su propia versión opaca. Las versiones solo se comparan por igualdad y solo contra el mensaje indicado; los llamantes no las ordenan ni las sintetizan.

`put` usa concurrencia optimista estricta: cada solicitud sobre un elemento existente debe coincidir con su `ifVersion` actual, incluida una no-operación (un put que repite la valoración, la nota y la categoría almacenadas). Un conflicto devuelve el elemento actual autoritativo (o `null`), de modo que un llamante puede reconciliar una respuesta perdida o una edición concurrente sin otra lectura. Eliminar un elemento ya ausente tiene éxito. Una cola por sesión serializa lecturas y mutaciones; las mutaciones en frío mantienen un identificador de escritura de persistencia durante la lectura, la comparación, el anexado y el vaciado. Las no-operaciones coincidentes no anexan ningún evento.

## Autoridad sobre el objetivo y el ciclo de vida

El registro en memoria de un propietario vivo suministra directamente la observación de la sesión objetivo; las lecturas en frío usan un identificador `SessionPersistence.open(id, 'read')`, mientras que las mutaciones usan un identificador de escritura. Ninguna de las dos rutas construye una sesión o un Agent. Una verificación previa `stat(id)` clasifica la ausencia definitiva; un fallo de lectura de una sesión que `stat` confirmó se propaga como fallo de infraestructura. `put` solo acepta un `assistant/message` no vacío y de origen de anexado con el `MessageId` solicitado; los registros de origen de reemplazo, vacíos de solo uso y no pertenecientes al asistente no son objetivos de feedback.

Las semillas de un fork pueden contener eventos de feedback del padre, pero su payload conserva el `sessionId` del padre, de modo que no se convierten en feedback actual del hijo. Eliminar un elemento anexa una lápida; las valoraciones y notas anteriores permanecen en el registro.

## Persistencia y contrato Remote

Las mutaciones de feedback de mensajes con éxito esperan la persistencia canónica: las operaciones en vivo anexan a través de la sesión propietaria y requieren un listener participante de `ctx.sessions.flush`; las operaciones en frío anexan y vacían a través de su identificador de escritura. Los fallos de persistencia se propagan en lugar de reportar éxito. `maxNoteBytes` es obligatorio y acota el texto de la nota en bytes UTF-8; la composición del Host Web fija `8192`. El paquete publica el contrato Remote unario del Host `messageFeedback.list`, `messageFeedback.put` y `messageFeedback.delete` a través de `TypertRemoteService` y `@Remote`; `command-feedback` publica `sessionFeedback.record` del mismo modo para observaciones a nivel de sesión en sesiones vivas. La API de Cordis generada más abajo es la autoridad a nivel de método.

El dispose del plugin cierra la admisión de operaciones y drena el trabajo de cola por sesión ya aceptado.

Registrar feedback escribe el prefijo canónico en el registro local de la sesión y nunca desencadena una solicitud de LLM ni subida alguna: nada sale de la máquina. La confirmación del comando confirma el registro e identifica la sesión; no reporta ni la política de telemetría ni la entrega.

## Superficie Web

[`@deepseek-ai/dsh-client-ui-message-feedback`](../../packages/client/ui-message-feedback) es el consumidor del navegador. `@deepseek-ai/dsh-api-remotes` monta las contribuciones generadas `messageFeedback` y `sessionFeedback`, de modo que el plugin llama a `ctx.remote.messageFeedback` y `ctx.remote.sessionFeedback` y nunca toca el transporte.

Los controles son la entrada `feedback` (orden 10) del slot de lista `conversation.chat.assistant-actions`, que `ui-conversation` declara y renderiza dentro de la fila IconActions del mensaje del asistente finalizado. `AssistantMessageNode` porta el `messageId` opcional del evento `assistant/message`. El campo está ausente en los parciales congelados por interrupción, y el sitio de renderizado omite el slot cuando está ausente. La tira se renderiza una vez por turno, en el mensaje del asistente que lo cierra: el Host acepta como objetivo cualquier mensaje de paso de origen de anexado, pero los pasos anteriores de un turno multipaso renderizan filas de tools en lugar de un cuerpo valorables, así que la UI expone un conjunto más estrecho de lo que el contrato del Host permite.

Un `MessageFeedbackController` por sesión respalda cada control de mensaje de esa sesión: una sola lectura de `list` siembra todo el transcript (transcripción), diferida al primer hover o foco en lugar de dispararse al montar. Cada mutación envía como `ifVersion` la versión que ese controlador observó por última vez; una respuesta `version-conflict` porta el elemento autoritativo, de modo que el controlador reconcilia a partir de la respuesta en lugar de volver a descargar. Las mutaciones se serializan por sesión, de modo que una operación encolada compara contra la versión confirmada. La operación `retract` inyectada vuelve a comprobar la valoración confirmada dentro de esa cola y se convierte en no-operación tras un cambio concurrente, de modo que una UI desactualizada no puede eludir el diálogo registrando una valoración pelada. Un `connection/reset` solo refresca las sesiones ya leídas.

Cualquiera de las dos valoraciones no registradas abre el diálogo de feedback de la sesión, la entrada `feedback-dialog` de `conversation.input.overlay`: la tarjeta Modal compartida con siete chips de categoría y un cuadro de detalle. Enviar hace put de la valoración seleccionada con la categoría elegida y la descripción recortada, o sin ninguna de las dos; el éxito cierra el diálogo y muestra el toast de confirmación, mientras que el fallo mantiene el diálogo y el borrador abiertos y muestra un toast de aviso. El mismo diálogo se abre para la sesión desde un `/feedback` pelado — una decoración que `ui-commands` enruta como `action` — y luego registra a través de `sessionFeedback.record`; `/feedback <texto>` mantiene la ruta de comando del Host. Hacer clic en una valoración registrada la retracta sin abrir el diálogo.

## Fronteras y limitaciones

- La cola de operaciones es local al proceso; la exclusión de escritores en frío depende del proveedor de persistencia seleccionado.
- La eliminación quita el elemento actual, no el texto de notas anteriores del registro de solo anexado ni de un sufijo ya entregado.
- Una solicitud en el estrecho intervalo tras el desacoplamiento en vivo pero antes de que el catálogo de persistencia materialice la cabecera puede recibir `session-not-found`; los llamantes reintentan tras la materialización de la retirada.
- Las solicitudes en frío leen el registro completo; el servicio no tiene tope de número de elementos ni de bytes agregados. `maxNoteBytes` solo acota cada nota.
- El contrato del Host no registra ningún actor autenticado ni identidad de auditoría y, por tanto, asume una frontera de llamantes confiables.
- Los controles Web aparecen solo en la vista de chat. Las vistas de trayectoria y waterfall (eventos en cascada) no renderizan ninguna entrada de feedback aunque sus nodos de asistente porten el mismo `messageId`.
- El controlador Web no consume eventos del registro de feedback, de modo que la valoración de una segunda pestaña se hace visible al reconectar o en la siguiente respuesta de conflicto, no de inmediato.
- El diálogo no comprueba `maxNoteBytes` por adelantado; una descripción sobredimensionada para un mensaje falla al enviar con `note-too-large` en lugar de mientras se escribe. Una observación de sesión no tiene límite de tamaño, como nunca lo tuvo el comando `/feedback`.
- `sessionFeedback.record` solo sirve sesiones vivas y responde `session-not-found` en caso contrario; el diálogo reporta ese fallo cuando su sesión se retira mientras está abierto.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxmessagefeedback--messagefeedbackservice"></a>

### `ctx.messageFeedback` — `MessageFeedbackService`

Session-log service; cold operations never construct a Session or Agent.

```ts cordis-catalog
/**
 * Read current feedback from the canonical log.
 * @param request - Session to inspect.
 * @returns immutable items or a definite persistence miss.
 */
@Remote('list') list(request: MessageFeedbackListRequest): Promise<MessageFeedbackListResult>

/**
 * Create or replace feedback after checking its current version.
 * Matching no-ops retain the version and append no event.
 * @param request - Target, desired value, and observed item version.
 * @returns the durable item or an explicit business failure.
 */
@Remote('put') put(request: MessageFeedbackPutRequest): Promise<MessageFeedbackPutResult>

/**
 * Delete one item after checking its version; absence succeeds without an event.
 * @param request - Session, message, and observed item version.
 * @returns the stable absent postcondition or an explicit failure.
 */
@Remote('delete') delete(request: MessageFeedbackDeleteRequest): Promise<MessageFeedbackDeleteResult>
```

Source: [`packages/feedback/message-feedback/src/index.ts`](../../packages/feedback/message-feedback/src/index.ts)

<a id="ctxsessionfeedback--sessionfeedbackservice"></a>

### `ctx.sessionFeedback` — `SessionFeedbackService`

Host Remote through which a product surface records a Session-level remark.

```ts cordis-catalog
/**
 * Record one remark on a live Session.
 * @param request - target Session plus the optional text and category.
 * @returns the recorded postcondition, or `session-not-found` when no live
 * Session carries the id.
 */
@Remote('record') record(request: SessionFeedbackRecordRequest): Promise<SessionFeedbackRecordResult>
```

Source: [`packages/feedback/command-feedback/src/index.ts`](../../packages/feedback/command-feedback/src/index.ts)

<a id="feedback-events"></a>

### `feedback/*` events

<a id="feedbackcommitted--parallel"></a>

#### `feedback/committed` — parallel

Observe a durable cold feedback mutation without publishing a live Session. Observers run before write ownership is released and must not await another message-feedback operation for this Session. The payload is borrowed read-only; deep-clone it before transferring ownership (for example, to Session.fromRestore).

```ts cordis-catalog
/**
 * Observe a durable cold feedback mutation without publishing a live Session.
 * Observers run before write ownership is released and must not await
 * another message-feedback operation for this Session. The payload is borrowed
 * read-only; deep-clone it before transferring ownership (for example, to Session.fromRestore).
 * @param inspection - committed canonical prefix, including the feedback as its last event.
 * @mode parallel
 */
'feedback/committed'(inspection: SessionInspection): void
```

Types: [SessionInspection](persistence.es.md)

Source: [`packages/feedback/message-feedback/src/index.ts`](../../packages/feedback/message-feedback/src/index.ts)
<!-- END GENERATED cordis-surface -->
