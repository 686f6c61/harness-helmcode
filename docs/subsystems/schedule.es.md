# Programación a nivel de Host

[English](schedule.md) | Español

Schedule almacena recordatorios independientemente de la activación de la sesión y los entrega a su sesión original. Esta página registra los tipos durables y orientados al modelo de [`types.ts`](../../packages/schedule/schedule/src/types.ts); el [README del paquete](../../packages/schedule/schedule/README.md) posee la composición y el encuadre de recordatorios.

## Registros durables

`ScheduleId` es un [id con marca](core.es.md#branded-ids) globalmente único. El dominio de almacenamiento `schedule` versión 1 posee una tabla `tasks` cuyas entradas vinculan un `ScheduleRecord` a su `sessionId` original, con `status: 'active' | 'inactive'` almacenado y `lastDelivery` opcional. Los registros sin estado se normalizan a `active` sin escanear ni recrear sesiones históricas. La creación canonicaliza el objetivo en `scheduledAt` RFC 3339 UTC; `after` conserva el retardo enviado, `every` conserva su intervalo fijo, `daily` y `weekly` conservan la `time` local normalizada y su `timeZone` explícita, y `cron` conserva su `expression` canónica de cinco campos y su `timeZone` explícita. La decodificación diaria, semanal y cron conserva el instante confirmado y la grafía de zona almacenada. El registro de tarea almacenado declara un `title` requerido, el nombre corto que muestran las superficies de tareas; la creación lo requiere y nunca lo deriva de la instrucción. Ningún registro almacenado puede omitir su título: un registro cuyo `title` falta, está en blanco tras el recorte, está sin recortar o tiene más de 120 caracteres falla la decodificación durable con `ScheduleLogError`, y el dominio schedule no declara ninguna política de respaldo y omisión, de modo que una tarea almacenada así rechaza la apertura del dominio completo en lugar de descartarse. Solo la eliminación explícita elimina una tarea; las tareas previamente eliminadas físicamente no se restauran ni se fabrican.

```ts type-equiv
/** Durable one-shot reminder created from a positive delay. */
interface AfterScheduleRecord {
  /** Globally unique task identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a delayed one-shot reminder. */
  readonly kind: 'after'
  /** Required stored task name; already trimmed, non-empty, and at most 120 characters. */
  readonly title: string
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Positive safe-integer delay accepted at creation. */
  readonly afterSeconds: number
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** Durable one-shot reminder created from an absolute instant. */
interface AtScheduleRecord {
  /** Globally unique task identity. */
  readonly id: ScheduleId
  /** Rule discriminator for an absolute one-shot reminder. */
  readonly kind: 'at'
  /** Required stored task name; already trimmed, non-empty, and at most 120 characters. */
  readonly title: string
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** Durable fixed-rate reminder aligned to creation or its most recent interval edit. */
interface EveryScheduleRecord {
  /** Globally unique task identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a fixed-rate recurring reminder. */
  readonly kind: 'every'
  /** Required stored task name; already trimmed, non-empty, and at most 120 characters. */
  readonly title: string
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Fixed safe-integer interval, never below one minute. */
  readonly everySeconds: number
  /** Next anchor-aligned occurrence while active, or final occurrence when inactive. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** Durable daily wall-clock reminder; gaps skip a date and overlaps use the earlier instant. */
interface DailyScheduleRecord {
  /** Globally unique task identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a daily wall-clock reminder. */
  readonly kind: 'daily'
  /** Required stored task name; already trimmed, non-empty, and at most 120 characters. */
  readonly title: string
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Local time normalized to HH:mm:ss.SSS. */
  readonly time: string
  /** Explicit IANA zone; equivalent timing edits retain the stored spelling. */
  readonly timeZone: string
  /** Committed next UTC instant while active, or final occurrence when inactive. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** One-shot task variants. */
type OneShotScheduleRecord = AfterScheduleRecord | AtScheduleRecord
```

```ts type-equiv
/** Recurring Host task variants. */
type RecurringScheduleRecord = EveryScheduleRecord | DailyScheduleRecord | WeeklyScheduleRecord | CronScheduleRecord
```

```ts type-equiv
/** Reminder rule and target, stored with its original Session binding. */
type ScheduleRecord = OneShotScheduleRecord | RecurringScheduleRecord
```

## Entrada de tiempo absoluto

El selector `at` es o bien un string RFC 3339 estricto con offset o bien un objeto exacto de calendario local. La forma local mantiene su interpretación explícita en la frontera del tool:

```ts type-equiv
/** Structured local-calendar input accepted by creation and timing edits. */
interface LocalAtInput {
  /** Four-digit ISO calendar date. */
  readonly date: string
  /** Local wall-clock time with optional one-to-three digit milliseconds. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
}
```

```ts type-equiv
/** Absolute selector accepted by creation and timing edits. */
type AtInput = string | LocalAtInput
```

La composición Web entregada no porta ninguna fila `time-context`; el bundle experimental opcional `@deepseek-ai/dsh-experimental-schedule-bundle`, habilitado desde la página de Plugins, inserta y monta time-context, que muestrea la zona IANA del navegador para cada prompt. Time-context indica al modelo que interprete fechas y horas en lenguaje natural no calificadas de otro modo en esa zona local a la solicitud cuando el turno abierto tiene una única zona de navegador inequívoca; los registros de zona de navegador mixtos o ausentes indican al modelo que pregunte. Esa guía no es un valor por defecto durable de la sesión: el modelo debe seguir pasando un offset en la forma string o `time_zone` en la forma local, y Schedule nunca lee el contexto del navegador, de la sesión, del proceso ni del modelo.

Schedule rechaza offsets y zonas inválidos, strings sin offset, objetivos no futuros y horas locales dentro de huecos de horario de verano. Un solapamiento de horario de verano elige su primer instante, el más temprano. Una creación exitosa solo almacena el `scheduledAt` UTC canónico, de modo que la reproducción nunca depende del estado de zona horaria ambiental.

<a id="daily-wall-clock-input"></a>
## Entrada diaria de hora de reloj

`daily` es uno de los selectores de creación mutuamente excluyentes, junto a `after_seconds`, `at`, `every_seconds`, el selector semanal y el selector cron. Por ejemplo, `daily: { time: '23:00:00', time_zone: 'Asia/Shanghai' }` selecciona las 23:00 en esa zona en cada fecha local elegible. El objeto exacto no tiene campo de fecha, offset ni intervalo:

```ts type-equiv
/** Daily local-time selector accepted by creation and timing edits. */
interface DailyInput {
  /** Local HH:mm:ss time with optional one-to-three fractional digits. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
}
```

La creación requiere `HH:mm:ss` con uno a tres dígitos fraccionarios opcionales, rechaza los segundos intercalares y `24:00`, canonicaliza la zona IANA explícita y almacena `time` como `HH:mm:ss.SSS`. El primer `scheduledAt` es estrictamente posterior al momento de creación. Una hora local o fecha completa inexistente se omite; un solapamiento selecciona el instante más temprano una vez por fecha local. Si ese instante más temprano ya pasó, el duplicado posterior no es elegible. Solo se restringen los años de objetivo UTC 0001–9999; las fechas locales en los bordes del rango UTC pueden caer en el año 0 o 10000.

Un siguiente objetivo guardado es un instante UTC confirmado. El decodificador del Host y el reinicio conservan ese instante sin volver a resolverlo contra las reglas de zona horaria, y los alias de zona almacenados válidos siguen siendo legibles cuando cambian los nombres canónicos. Los objetivos subsiguientes usan los datos IANA actuales del Host. El siguiente objetivo debe ser tanto posterior a la decisión de entrega como estar en una fecha local posterior a la fecha de la ocurrencia seleccionada. La creación falla con `time_out_of_range` cuando ningún objetivo UTC futuro es representable.

## Entrada de tasa fija y puesta al día

`every_seconds` es un intervalo de entero seguro de al menos 60 segundos, alineado al momento de creación. Mide tiempo transcurrido, no hora de reloj diaria: `every_seconds: 86400` no puede sustituir a `daily` a través de cambios de offset. El protocolo no ofrece cooldown compartido ni regla de admisión entre registros; el selector cron descrito abajo es temporización de hora de reloj, no un intervalo de tasa fija.

Cuando el Host arranca con un registro Every, Daily, Weekly o Cron vencido, solo envía la última ocurrencia debida. Every avanza al primer objetivo alineado con su ancla de intervalo actual tras la decisión de entrega; Daily, Weekly y Cron siguen las reglas de fecha local de arriba y de abajo. Las ocurrencias perdidas no se acumulan. Si ningún siguiente objetivo UTC es representable, la entrega conserva el registro como inactivo con su último recibo.

Los de una sola vez producen follow-ups individuales. Los registros recurrentes debidos en el mismo escaneo para la misma sesión comparten un follow-up renderizado por `renderRecurringReminderBatchFraming`, con una última ocurrencia por registro. El mínimo de un minuto solo se aplica a los intervalos de tasa fija; la entrega no espera a que el Agent destino quede inactivo.

<a id="cron-wall-clock-input"></a>
## Entrada cron de hora de reloj

`cron` es uno de los selectores de creación mutuamente excluyentes. Su objeto exacto solo porta la expresión Vixie estricta de cinco campos `minute hour day-of-month month day-of-week` y una zona IANA explícita, por ejemplo `cron: { expression: '*/15 9-17 * * 1-5', time_zone: 'Asia/Shanghai' }`. Los límites de los campos son:

| Campo | Rango aceptado | Notas |
|---|---|---|
| minute | 0-59 | |
| hour | 0-23 | |
| day-of-month | 1-31 | |
| month | 1-12 | |
| day-of-week | 0-7 | Tanto `0` como `7` significan domingo. |

Cada campo acepta `*`, un valor único, un rango `a-b`, un paso `*/n` o `a-b/n` con `n >= 1`, y una lista separada por comas de esas formas. Todo lo demás se rechaza con `invalid_rule` y un mensaje que nombra el campo infractor: los operadores `L`, `W` y `#`, los nombres `JAN`/`MON`, las macros estilo `@daily`, las expresiones de seis campos con campo de segundos, los valores fuera de rango, los rangos invertidos, los pasos cero y los campos vacíos. Como el dialecto tiene cinco campos, el intervalo más pequeño es un minuto; la programación de menos de un minuto sigue sin soportarse.

La creación canonicaliza la expresión antes de almacenarla. La canonicalización expande cada campo en su conjunto de valores coincidentes y vuelve a codificar ese conjunto de forma determinista: los valores repetidos colapsan, los valores y rangos adyacentes se fusionan, un paso uniforme se escribe como `a-b/n` o, para un campo que empezó con `*`, como un paso de estrella (`*` para cada valor, en otro caso el recorrido de paso de estrella más ancho más los valores restantes), un paso de `1` se omite, y el domingo se escribe como `0`. Un campo que no empezó con `*` nunca se convierte en paso de estrella. Conservar la marca de estrella de cada campo es lo que mantiene fiel a Vixie la regla día del mes/día de la semana siguiente a través de la expresión almacenada. El decodificador durable rechaza una expresión almacenada que no es canónica.

El primer objetivo es el primer instante estrictamente futuro cuya fecha y hora locales en la zona coinciden. Reutiliza la resolución de hora local de Daily y Weekly: una hora local inexistente se omite, y una ambigua toma la ocurrencia más temprana una vez para esa fecha. El `scheduledAt` UTC confirmado nunca se recalcula al reiniciar.

El día del mes y el día de la semana siguen la semántica Vixie. Un campo es una estrella cuando su texto empieza con `*`, independientemente de los valores con los que coincida, de modo que `*/1` y `*/2` son estrellas mientras que `1-31` y `0-7` están restringidos. Cuando cualquiera de los campos es una estrella, una fecha local coincide solo cuando ambos campos coinciden; cuando ninguno es una estrella, coincide cuando cualquiera de los campos coincide.

La decodificación cron conserva el instante confirmado y la grafía de zona almacenada, y rechaza una expresión almacenada no canónica. Cron solo pertenece al `ScheduleRecord` actual del Host; el decodificador histórico congelado de la sesión no lo admite.

## Cambios históricos de sesión

Los eventos `schedule/change` de versión 1 siguen siendo decodificables como datos históricos de sesión. Sus tipos de creación, fold e invariante usan `LegacyScheduleRecord`, que solo admite After, At y Every; Daily, Weekly y Cron solo pertenecen al `ScheduleRecord` actual del Host. El decodificador de registros del Host está separado del decodificador histórico congelado. Un registro de creación escrito antes de que existieran los títulos no porta `title`, de modo que el decodificador histórico admite ese miembro ausente mientras el decodificador del Host sigue requiriéndolo. Los eventos históricos no pueblan el dominio de almacenamiento ni programan entregas. Los recordatorios existentes en estos eventos requieren recreación explícita a través de `schedule_create`; no ocurre ninguna migración de sesión implícita ni conversión de registros `at` antiguos.

```ts type-equiv
/**
 * Frozen Session event and fold vocabulary; daily rules belong only to Host storage.
 *
 * A version-1 event written before titles existed persists no `title` member, so
 * `after`, `at`, and `every` decode without one and stay readable. The Host task
 * record requires the member and never persists a record without it.
 */
type LegacyScheduleRecord =
  | LegacyAfterScheduleRecord
  | LegacyAtScheduleRecord
  | LegacyEveryScheduleRecord
```

```ts type-equiv
/** Creates one durable reminder record. */
interface ScheduleCreateChange {
  readonly version: 1
  readonly operation: 'create'
  readonly schedule: LegacyScheduleRecord
}
```

```ts type-equiv
/** Deletes one currently active reminder. */
interface ScheduleDeleteChange {
  readonly version: 1
  readonly operation: 'delete'
  readonly id: ScheduleId
}
```

```ts type-equiv
/** Records that one active one-shot reminder entered the durable dispatch history. */
interface OneShotScheduleDispatchChange {
  readonly version: 1
  readonly operation: 'dispatch'
  readonly id: ScheduleId
}
```

```ts type-equiv
/** Records one fixed-rate decision and advances directly past missed occurrences. */
interface EveryScheduleDispatchChange {
  readonly version: 1
  readonly operation: 'dispatch'
  readonly id: ScheduleId
  /** Wall-clock decision time used to select the latest due occurrence. */
  readonly acceptedAt: string
}
```

```ts type-equiv
/** Durable dispatch shapes supported by the current rule set. */
type ScheduleDispatchChange = OneShotScheduleDispatchChange | EveryScheduleDispatchChange
```

```ts type-equiv
/** Strict version-1 durable Schedule mutation union. */
type ScheduleChange = ScheduleCreateChange | ScheduleDeleteChange | ScheduleDispatchChange
```

El decodificador histórico y el fold rechazan versiones desconocidas, campos extra, ids reutilizados y transiciones inválidas. El evento sigue indexado en el [catálogo de persistencia](../persistence-catalog.es.md#schedulechange--log-only). El historial de la sesión no es la autoridad para las tareas activas.

## Vistas activas y gestión

Los valores de tool combinan el registro almacenado con la temporización derivada del reloj actual. El Host restaura la sesión original cuando la entrega lo requiere; listar y eliminar tareas no activa esa sesión.

```ts type-equiv
/** Current delivery timing derived from the durable record and wall clock. */
type ScheduleState = 'scheduled' | 'overdue'
```

```ts type-equiv
/** Host-driven delivery resumes the original Session when needed. */
type ScheduleDeliveryMode = 'host'
```

```ts type-equiv
/** Complete model-facing view of one active reminder. */
type ScheduleView = ScheduleRecord & {
  /** Whether the target remains in the future. */
  readonly state: ScheduleState
  /** Reminder delivery never leaves the owning session. */
  readonly deliveryMode: ScheduleDeliveryMode
}
```

El [catálogo de tools](../tool-catalog.es.md#deepseek-aidsh-schedule) posee los schemas de `schedule_create`, `schedule_list`, `schedule_delete` y `schedule_update`. Crear, eliminar y actualizar confirman la escritura del dominio de almacenamiento. Una cola a nivel de Host serializa estas mutaciones contra la entrega debida; eliminar una tarea no elimina un mensaje ya encolado. Los tools del modelo se dirigen a la sesión actual, mientras que los métodos compartidos de creación, listado, actualización y eliminación del Host aceptan una vinculación de sesión explícita. La creación requiere un `title` que debe ser no vacío tras el recorte y de como máximo 120 caracteres; un título ausente, en blanco o demasiado largo se rechaza con `invalid_prompt`, y la creación nunca deriva uno de la instrucción. Las vistas de creación y listado portan el `title` almacenado junto a la instrucción, y un registro almacenado cuyo `title` falta o es inválido se rechaza en la decodificación.

```ts type-equiv
/** Reminder creation selector, shared by the model consumer and Host service. */
interface ScheduleCreateRequest {
  /** Non-empty reminder text. */
  prompt: string
  /** Required task name of at most 120 characters, non-empty after trimming; names the card, detail heading, and task lists. */
  title: string
  /** Relative one-shot delay in seconds. */
  after_seconds?: number
  /** Absolute one-shot target. */
  at?: AtInput
  /** Fixed recurrence interval in seconds. */
  every_seconds?: number
  /** Daily wall-clock time in an explicit IANA zone. */
  daily?: DailyInput
  /** Weekly wall-clock time and explicit ISO weekday set in an IANA zone. */
  weekly?: WeeklyInput
  /** Five-field cron expression evaluated in an explicit IANA zone. */
  cron?: CronInput
}
```

```ts type-equiv
/** Session-scoped task list, without Agent activation. */
interface ScheduleListRequest {
  /** Original Session binding. */
  sessionId: SessionId
}
```

```ts type-equiv
/** Delete request identifying a task within its original Session binding. */
interface ScheduleDeleteRequest extends ScheduleListRequest {
  /** Task to remove. */
  id: ScheduleId
}
```

```ts type-equiv
/** Successful `schedule_delete` value, including the non-mutating not-found result. */
type ScheduleDeleteResult =
  | { readonly id: ScheduleId; readonly deleted: true }
  | { readonly id: ScheduleId; readonly deleted: false; readonly code: 'schedule_not_found' }
```

## Catálogo Web

El método Remote `schedule.catalog()` devuelve las tareas del Host activas e inactivas con sus vinculaciones de sesión originales, ordenadas por `scheduledAt` ascendente y después lexicográficamente por `id`. Solo lee el dominio Schedule, sin activar sesiones ni leer su historial. Los consumidores del navegador reciben este tipo seguro para el navegador:

```ts type-equiv
/** Durable Session inbox delivery acknowledgment, not model execution completion. */
interface ScheduleDeliveryReceipt {
  /** Canonical UTC target of the delivered occurrence. */
  readonly scheduledAt: string
  /** Canonical UTC time sampled after Session persistence acknowledged delivery. */
  readonly deliveredAt: string
  /** Identity of the delivered message, shared by tasks in one recurring batch. */
  readonly messageId: MessageId
}
```

```ts type-equiv
/** Browser-safe retained reminder with its original Session binding. */
type ScheduleCatalogEntry = ScheduleRecord & {
  /** Session receiving this reminder when it becomes due. */
  readonly sessionId: SessionId
  /** Inactive reminders remain visible but never schedule another delivery. */
  readonly status: 'active' | 'inactive'
  /** Most recent durably acknowledged inbox delivery, when available. */
  readonly lastDelivery?: ScheduleDeliveryReceipt
}
```

El Remote `schedule.list({ sessionId })`, el `schedule_list` del modelo y el catálogo de cabecera de sesión solo devuelven tareas activas. El `state` de temporización derivada de una vista del modelo sigue siendo distinto del `status` de ciclo de vida almacenado. La eliminación usa `schedule.delete({ sessionId, id })` con la vinculación original de la entrada; una vinculación que no coincide devuelve no encontrado. Los tools del modelo suministran la sesión del Agent actual, mientras que la interfaz de usuario global suministra la vinculación de la tarea seleccionada. La comprobación de vinculación por sí sola no establece la autorización del llamante. El evento sin payload `schedule/changed` invalida las listas de los clientes; los clientes que se reconectan vuelven a obtener el estado actual.

La composición Web entregada no porta ninguna fila `ui-schedule`; el bundle experimental opcional `@deepseek-ai/dsh-experimental-schedule-bundle`, habilitado desde la página de Plugins, inserta y monta `ui-schedule` con la capacidad del Host. El [paquete de cliente](../../packages/client/ui-schedule/README.md) posee el catálogo, el estado vacío y los controles de eliminación. La página filtra por separado todas las tareas, las activas y las inactivas, conserva los detalles inactivos y un control de sesión original en la tira de pestañas de detalle, y requiere una eliminación confirmada explícita. Los registros de Reglas y Entregas separan la configuración de la tarea de los recibos guardados paginados perezosamente. Ni un recibo ni el estado inactivo confirman la ejecución del modelo.

## Ediciones de temporización

`schedule.update({ sessionId, id, expected, change })` edita una tarea activa sin activar su sesión. `expected` es el `ScheduleRecord` observado completo, no una entrada de catálogo con metadatos extra. El Host lo compara con el registro actual dentro del mismo FIFO usado por el despacho y la eliminación. La entrega normal puede avanzar el objetivo durante la edición; ese snapshot desactualizado devuelve `schedule_conflict` en lugar de sobrescribir la regla actual. Las vinculaciones ausentes o que no coinciden devuelven `schedule_not_found`, y las tareas inactivas devuelven `schedule_ended`.

```ts type-equiv
/** Timing-only edit; it may select a different recurrence kind than the stored record, and one-shot targets use an absolute `at`. */
type ScheduleTimingChange =
  | { readonly kind: 'at'; readonly at: AtInput }
  | { readonly kind: 'every'; readonly every_seconds: number }
  | { readonly kind: 'daily'; readonly daily: DailyInput }
  | { readonly kind: 'weekly'; readonly weekly: WeeklyInput }
  | { readonly kind: 'cron'; readonly cron: CronInput }
```

```ts type-equiv
/** Compare-and-update request within the original Session binding. */
interface ScheduleUpdateRequest extends ScheduleDeleteRequest, ScheduleUpdateContent {
  /** Complete record observed when editing began, including the committed target. */
  readonly expected: ScheduleRecord
  /** New timing; its kind may differ from the stored record's kind, and an omitted value keeps the committed target. */
  readonly change?: ScheduleTimingChange
}
```

```ts type-equiv
/** Successful current record, non-mutating lookup/conflict failure, or invalid name/instruction/timing. */
type ScheduleUpdateResult =
  | { readonly id: ScheduleId; readonly updated: boolean; readonly record: ScheduleRecord }
  | ScheduleUpdateMiss
  | ScheduleToolError
```

Una regla Daily cambiada calcula su primer objetivo estrictamente futuro usando la hora local guardada y la semántica de zona. Una regla Cron cambiada canonicaliza su expresión y calcula su primer objetivo estrictamente futuro bajo las mismas reglas de fecha local, huecos y solapamiento temprano. Un intervalo Every cambiado inicia un nuevo ancla en el momento de guardado aceptado más ese intervalo. Una tarea After o At puede recibir un objetivo absoluto distinto como registro At con el mismo id. Estas operaciones conservan el `title` almacenado, el prompt, la vinculación de sesión original, el estado del ciclo de vida y todos los recibos guardados. Un cambio también puede seleccionar un tipo de recurrencia distinto, que recalcula el objetivo a partir de la nueva regla con el mismo id, título, prompt, vinculación de sesión, estado y recibos guardados. Una regla normalizada equivalente devuelve `updated: false` con su registro sin cambios; no reescribe el almacenamiento, no reinicia el objetivo ni emite un evento de cambio. Una expresión cron con grafía distinta pero equivalente es ese no-op, porque la comparación usa la expresión canónica y la zona canónica.

La validación de entrada usa los errores de temporización existentes. Un objetivo absoluto cambiado debe seguir siendo futuro cuando su turno FIFO se ejecuta. El put de tarea exitoso precede a la notificación de cambio y al recálculo del temporizador. Los fallos de almacenamiento y de ciclo de vida se rechazan; la cancelación se comprueba tras las esperas de cola e inicialización pero no puede revertir una escritura en curso. Los registros de una sola vez conservan un instante UTC en lugar de la zona IANA del formulario de edición. Las ediciones de temporización no anexan ningún evento histórico de sesión: el modelo alcanza la misma actualización en sitio a través de `schedule_update`, que compara el registro que leyó con el almacenado en lugar de eliminar y recrear la tarea.

## Registros de entrega guardados

`schedule.history({ sessionId, id, limit })` lee los recibos guardados sin activar una sesión. El límite explícito es un entero seguro de 1 a 100. Las páginas siguen el orden inverso de append, no la ordenación por reloj; el cursor opcional de id de mensaje excluye el registro más antiguo de la página precedente. Las llegadas nuevas no desplazan ese cursor. Una tarea ausente o una vinculación de sesión incorrecta devuelve `schedule_not_found`; un cursor desconocido devuelve `delivery_cursor_not_found`, no una página vacía exitosa.

```ts type-equiv
/** Saved inbox delivery with its immutable sent prompt when recorded by this Host. */
interface ScheduleDeliveryRecord extends ScheduleDeliveryReceipt {
  /** Prompt sent for this occurrence; unavailable for legacy receipts. */
  readonly prompt?: string
}
```

```ts type-equiv
/** Explicitly bounded saved-delivery query within one Session binding. */
interface ScheduleDeliveryHistoryRequest extends ScheduleDeleteRequest {
  /** Required safe-integer page size from 1 through 100. */
  limit: number
  /** Message identity of the oldest entry in the previous page; excluded from this page. */
  before?: MessageId
}
```

```ts type-equiv
/** Configured limits applied when appending one task's delivery receipt. */
interface DeliveryRetentionBounds {
  /** Retained window in days, measured back from the acknowledgment being appended. */
  readonly days: number
  /** Maximum retained records per task; the newest survive. */
  readonly records: number
}
```

```ts type-equiv
/** Newest-first saved deliveries, or a non-mutating task/cursor lookup failure. */
type ScheduleDeliveryHistoryResult =
  | {
    readonly id: ScheduleId
    readonly records: ScheduleDeliveryRecord[]
    /** Whether earlier delivery records may be unavailable; missing receipts are never reconstructed. */
    readonly earlierRecordsUnavailable: boolean
    /** True only after an append removed saved records; absent legacy evidence is false. */
    readonly earlierRecordsPruned: boolean
    /** Current Host retention configuration, also used by the delivery writer. */
    readonly retention: DeliveryRetentionBounds
    /** Oldest returned message identity, present only when older saved records remain. */
    readonly nextBefore?: MessageId
  }
  | { readonly id: ScheduleId; readonly code: 'schedule_not_found' | 'delivery_cursor_not_found' }
```

Las tareas nuevas inicializan un historial vacío. Las filas de tareas antiguas sin historial solo exponen su último recibo existente, marcan los registros anteriores como no disponibles y las lecturas no las reescriben. Las confirmaciones futuras conservan ese recibo y anexan recibos nuevos reales con snapshots de la instrucción. El historial perdido y los snapshots de instrucción heredados ausentes nunca se reconstruyen. La misma escritura de fila de tarea confirma el historial, el último recibo, el estado y el siguiente objetivo; la eliminación explícita de la tarea detiene la entrega futura, elimina la fila de la tarea junto con sus recibos guardados y la saca de `list` y `catalog`; los mensajes de conversación no se ven afectados. Los registros de entrega guardados se podan al anexar según la ventana `deliveryHistoryDays` configurada, medida hacia atrás desde el `deliveredAt` de cada recibo, y según el tope `deliveryHistoryRecords`; el último recibo anexado siempre sobrevive, y una ventana podada marca los registros anteriores como no disponibles. La paginación acota el número de registros devueltos en lugar del tamaño de almacenamiento o los bytes de instrucción.

## Entrega del Host

El Host lee las tareas persistidas al arrancar y fija su temporizador al objetivo activo más temprano. Las tareas inactivas siguen siendo consultables pero nunca programan otra entrega. En la entrega resuelve la sesión original a través del controlador de sesiones, incluidas las sesiones frías. Tras la restauración vuelve a muestrear el reloj y excluye los miembros que ya no están debidos tras una reversión; esas tareas conservan su obligación de temporizador. Ni un Goal ni un registro de finalización de Run separado participan en el despacho.

El `followup()` con origen en el plugin anexa sincrónicamente el mensaje a la bandeja de entrada de la sesión. Tras un flush de sesión exitoso, un put de registro de tarea anexa una entrega guardada con su snapshot de instrucción y almacena el último `ScheduleDeliveryReceipt` junto con el estado `inactive` del de una sola vez o el siguiente objetivo y estado de la tarea recurrente. Las tareas recurrentes del mismo lote comparten el `messageId` del recibo; cada recibo conserva la hora de ocurrencia entregada de esa tarea. La entrega nunca guía ni cancela el turno actual y no espera a que el modelo termine.

Un fallo al resolver la sesión, encolar el mensaje o confirmar la persistencia deja la tarea almacenada e informa de una advertencia del Host. Un cambio de gestión posterior o un reinicio del Host lo reintenta. La persistencia de la sesión y el put de la tarea no son atómicos entre almacenes. Un fallo tras la persistencia de la bandeja de entrada pero antes del put de la tarea puede repetir la entrega; el recibo no cierra este hueco. Schedule no ofrece confirmación de resultado del modelo, cancelación de ejecución ni canal de notificación externo.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxschedule--scheduleservice"></a>

### `ctx.schedule` — `ScheduleService`

Shared management service; reads, deletion, and timing edits never activate a Session.

`sessionPersistence` is a load-order requirement rather than a directly called service: a delivery commits only when `ctx.sessions.flush()` reports that a `session/flush` listener participated, and the persistence backend providing this service is the plugin that registers that listener.

```ts cordis-catalog
/**
 * Create a reminder bound to the caller-selected Session without activating it.
 *
 * The request must supply a title; a missing, blank-after-trim, or over-long
 * title rejects with `invalid_prompt` instead of deriving one from the prompt.
 * The record is built from the clock reading taken before the request joins the
 * serialized queue, so a create that waits behind a longer operation keeps its
 * request-time anchor and may already be due when the queue reaches it.
 * @param sessionId - Original Session receiving the reminder.
 * @param request - Validated tool selector, required title, and reminder content.
 * @param signal - Optional cancellation checked before persistence begins, including after FIFO waits.
 * @returns The durably stored schedule. Cancellation does not roll back an in-flight write.
 */
async create(sessionId: SessionId, request: ScheduleCreateRequest, signal?: AbortSignal): Promise<ScheduleRecord>

/**
 * Read the selected Session's active tasks without resuming its Agent.
 * @param request - Session whose task list is requested.
 * @returns Persisted reminders in storage order.
 */
@Remote('list') async list(request: ScheduleListRequest): Promise<ScheduleRecord[]>

/**
 * Read all active and inactive Host reminders with their original Session bindings.
 * A deleted reminder has no row, so it is absent here.
 * Does not activate Sessions or read Session history.
 * @returns Reminders ordered by scheduledAt ascending, then lexicographically by id.
 */
@Remote('catalog') async catalog(): Promise<ScheduleCatalogEntry[]>

/**
 * Read saved inbox deliveries without activating or reading the original Session.
 * The task's own row supplies its binding, so its records stay readable through this lookup.
 * @param request - Session binding, task identity, explicit limit, and optional exclusive message cursor.
 * @returns Newest-first deliveries in append order, or a task/cursor lookup failure.
 * @throws ScheduleInputError when limit is not a safe integer from 1 through 100.
 */
@Remote('history') async history(request: ScheduleDeliveryHistoryRequest): Promise<ScheduleDeliveryHistoryResult>

/**
 * Delete one task belonging to the selected Session, leaving queued messages intact.
 *
 * The row is removed: the task no longer schedules, leaves `list` and `catalog`, and its
 * saved delivery records go with it.
 * @param request - Session and exact task identity.
 * @param signal - Optional cancellation checked before persistence begins, including after FIFO waits.
 * @returns Whether that Session owned a deleted task. Cancellation does not roll back an in-flight write.
 */
@Remote('delete') async delete(request: ScheduleDeleteRequest, signal?: AbortSignal): Promise<ScheduleDeleteResult>

/**
 * Update the name, instruction, and timing of an active task within the original Session
 * binding without activating the Session or changing saved deliveries.
 *
 * Each supplied field replaces its stored value; an omitted field keeps it. A name or
 * instruction change alone does not reset the committed target.
 * @param request - Task binding, complete observed record, and any combination of timing, name, and instruction.
 * @param signal - Cancellation checked after domain readiness and FIFO waits, before persistence begins.
 * @returns The committed record, unchanged record for a no-op, or a non-mutating input/lookup/conflict result.
 * Storage and lifecycle failures reject; cancellation after a write starts does not roll it back.
 */
@Remote('update') async update(request: ScheduleUpdateRequest, signal?: AbortSignal): Promise<ScheduleUpdateResult>
```

Types: [SessionId](core.es.md)

Source: [`packages/schedule/schedule/src/index.ts`](../../packages/schedule/schedule/src/index.ts)

<a id="schedule-events"></a>

### `schedule/*` events

<a id="schedulechanged--emit"></a>

#### `schedule/changed` — emit

Durable task set changed; clients refetch global task and Session-active catalogs.

```ts cordis-catalog
/** Durable task set changed; clients refetch global task and Session-active catalogs.
 * @mode emit
 */
'schedule/changed'(): void
```

Source: [`packages/schedule/schedule/src/types.ts`](../../packages/schedule/schedule/src/types.ts)
<!-- END GENERATED cordis-surface -->
