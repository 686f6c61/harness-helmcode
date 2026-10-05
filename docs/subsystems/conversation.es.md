# Ensamblado de conversaciones

[English](conversation.md) | Español

Conversation es la capa de ensamblado neutra respecto al target entre una ventana de `SessionEventLikeEntry` del Client y las vistas del navegador. [`ui-conversation`](../../packages/client/ui-conversation/README.md) es dueño de los registries de eventos y vistas, un binding estable por identidad por `SessionBinding`, las ubicaciones de Turn/Step, el ensamblado incremental de Contexts, las fuentes de target, el shell compartido y la orquestación de entrada. Los paquetes de target como [`ui-chat`](../../packages/client/ui-chat/README.md) y [`ui-trajectory`](../../packages/client/ui-trajectory/README.md) son dueños de sus Definitions, snapshots finales y renderizado.

Esta página define el modelo de datos y la ruta de extensión de un nodo de Conversation propiedad del negocio. La [arquitectura del Client Web](web-client.es.md) sitúa el subsistema entre los modelos del Client y los Slots; la [decisión de ensamblado de nodos de Conversation](../../.agents/notes/implemented/architecture/2026-08-09-client-conversation-node-assembly.md) es dueña de su razonamiento.

## Modelo de datos y propiedad

El Session Controller es dueño de la ventana contigua de eventos lógicos cargados. Cada `SessionEventLikeEntry` es `{ type: 'event', event: SessionEvent }` para un evento durable o `{ type: 'transient', event: AssistantLiveChunkEvent }` para una presentación `assistant/live-chunk` solo del Client. Ambos eventos internos exponen `type`, `seq`, `time` y `data`. `ui-conversation` pasa estas entradas al ensamblador sin abrir un segundo flujo de historial. Un `ConversationNodeAssembler` por sesión aplica cada Definition registrada y publica una fuente independiente para cada target de vista registrado.

| Concepto | Propietario y propósito |
|---|---|
| Event Definition | Un paquete de negocio casa un evento durable o transitorio solo del Client cada vez, lo correlaciona por `(kind, id)` estable, pliega un State determinista y opcionalmente materializa un nodo de target. |
| Context | Los Matches ordenados y el State actual, propiedad del motor, para un `(kind, id)`. Los eventos durables y transitorios pueden ser starts. El start cargado más antiguo inicializa el State; los Matches posteriores lo actualizan. La evidencia de solo actualización permanece pendiente hasta que su start se carga. |
| Location | Las coordenadas de Session, Turn o Step, propiedad del motor, derivadas de los eventos de frontera durables. Las Definitions pueden publicar datos tipados sobre un Turn o un Step. |
| View Definition | Un paquete de target crea un builder incremental por sesión y es dueño del tipo de snapshot final de ese target. |
| Group Definition | Un paquete de negocio deriva las referencias raíz y los snapshots de grupo de un target a partir de los Nodes materializados; es dueño de la pertenencia, la segmentación, los resúmenes y las cachés incrementales. |
| View | Una entrada de Slot como Chat o Trajectory lee solo el snapshot de su target y renderiza nodos propiedad del target. |

Chat y Trajectory pueden reconocer la misma familia de eventos durables, pero cada una conserva su propio State de Definition y su payload de nodo final. La maquinaria compartida neutra respecto al target se limita al enrutado de identidades, la reproducción ordenada, los datos de Location, las dependencias de predecesores y la cadencia de publicación.

## Activación de targets

Cada sesión conserva un conjunto monótono de targets activos. Crear o leer una fuente de target no la activa. El shell activa explícitamente su View persistida o recién seleccionada, mientras que otro consumidor activa un target a través de su primera suscripción a la fuente. La primera activación crea el builder de ese target y llama a `replace()` una vez desde los Contexts actuales indexados por target. Los vaciados posteriores llaman a `apply()` para cada target activo, y la desuscripción no elimina ninguno.

El shell es dueño de la selección de View y resuelve la View preferida registrada o el fallback Chat antes de renderizar cuando se crea un binding o se selecciona como actual, y tras los cambios en el roster de Views. El ensamblador recibe solo el id de target resuelto y no selecciona Chat ni otro target por defecto. Una View de terceros participa a través de las mismas operaciones de selección y activación. Una View Definition puede exponer `toolCallFocus(callId)`; el shell suministra Inspect solo para un target visible que declara esta capacidad, y el target traduce el call id a su propia identidad de foco.

<a id="group-definitions"></a>
## Group Definitions

La contribución opcional `ctx.uiConversation.groups.register(definition)` usa el mismo ciclo de vida de registry poseído por efectos que los registros de eventos y vistas. Requiere un target de View existente y rechaza registros duplicados de target sin construir un Builder. Cada sesión crea su propio contexto de Group solo cuando ese target se activa. El reemplazo de un registro descarta el contexto antiguo y limpia sus grupos observados durante la reconstrucción del registry existente.

Los [tipos de grupos](../../packages/client/ui-conversation/src/client/contract/groups.ts) definen el protocolo completo:

| Tipo | Significado |
|---|---|
| `ConversationGroupDefinition<Node, State, Data>` | `create()` inicializa el State local de la sesión; `update(context, input)` devuelve su siguiente State; `buildGroups(context)` devuelve la salida pendiente o `null`. La entrada de reemplazo requiere entries y un reemplazo completo de grupos. |
| `ConversationGroupInput<Node>` | `replace` suministra el orden del target, la línea temporal y los lectores síncronos `readNode`, `readTurn` y `readPosition`. `apply` añade los cambios de Node proyectados `previous/current`, los `changedTurns` de ciclo de vida y los `changedTurnOrders`. No retener los lectores en el State. |
| `GroupNodePosition` | El Turn propietario, cuando existe, y las claves de Node visibles anterior y siguiente inmediatas. Los vecinos conservan interrupciones que una lista de claves solo de Turn omite. |
| `NodeReference` / `GroupReference` | `NodeKey` o `GroupKey` con marca, distinguidas por `kind`. Una referencia de Node puede seleccionar un `groupPart` propiedad del renderizador; omitirlo selecciona el Node completo. |
| `GroupSnapshot<Data>` | Clave de grupo inmutable, datos de negocio y referencias de Node ordenadas. Los grupos no pueden contener otros grupos ni poseer datos de Node de origen. |
| `GroupUpdate<Data>` | `entries` reemplaza la secuencia raíz completa; solo la entrada apply puede omitirlo para conservar la secuencia. La entrada de reemplazo requiere tanto `entries` como `groups.replace`. `groups.replace.snapshots` reemplaza todos los grupos; `groups.apply.upserts/removes` actualiza solo los registros de grupo nombrados. Una eliminación no borra Nodes. |
| `ConversationGroupDataMap` | Asociación target-datos fusionada por declaración, compartida por el registro y `views.grouped(target)`. Los targets no declarados no tienen tipo de payload de grupo. |
| `ConversationGroupedView<Data>` | `entries` raíz estables y lectores `groupSource(key)` por clave; un grupo eliminado se lee como `undefined`. |

El Builder expone `groupInput()` cuando hay agrupación registrada; la entrada ausente falla en la primera activación. Registra los valores de Node tras sus propias proyecciones y conserva la identidad de orden solo de contenido. El ensamblador suministra los Turns modificados con cada actualización; los llamantes directos del Builder sin agrupación pueden omitirlos. Los Builders con fuentes independientes difieren sus notificaciones a `publish()`. La primera activación y el vaciado ordinario comparten la misma secuencia: materializar los datos de Location y los Nodes, actualizar el Builder, llamar a la Group Definition, validar e instalar la agrupación, y después publicar cada fuente de target y de Location afectada. La fase de grupos reutiliza la cadencia de publicación existente.

Los índices de posición del target suministran los lectores e identifican los Turns cuyas claves visibles o vecinos cambiaron. `changedTurnOrders` incluye tanto los propietarios de un Node movido como los Turns adyacentes a Nodes sin ámbito insertados o eliminados; los cambios de solo ciclo de vida permanecen en `changedTurns`. Una Definition de negocio puede resegmentar esos Turns y refrescar solo los grupos que contienen contenido modificado. La salida estructural sigue reemplazando el array completo de referencias raíz, sin exigir releer los contenidos de Node sin cambios.

El almacén de Groups valida todo el resultado enviado antes de la instalación: las referencias de Group raíz y los registros se corresponden uno a uno, todos los Nodes referenciados existen, y cada `(NodeKey, groupPart)` ocupa como máximo una posición raíz o de miembro. Un Node completo no puede coexistir con una de sus partes. Los upserts duplicados, las eliminaciones duplicadas y el upsert/eliminación simultáneo de un grupo fallan. Los upserts de solo datos conservan los arrays raíz y de miembros, no leen Nodes y notifican solo a las fuentes de grupo modificadas; el reemplazo completo revalida cada referencia.

Los renderizadores discriminan sobre los dos tipos de referencia y eligen componentes en la View propietaria, no a través de un campo de renderizador en los datos del grupo. Las referencias de Node raíz y los miembros de grupo referenciados forman la lista de renderizado completa; los Nodes de target no referenciados permanecen almacenados pero no se renderizan. El cuerpo del grupo lee los miembros por separado de los datos de resumen. Los modos de presentación deben conservar los tipos de componente, las claves y los padres de los miembros; cambiar la pertenencia de datos puede legítimamente remontar un miembro movido. El framework no interpreta la completitud de partes, la segmentación ni las políticas de presentación.

## Familias de eventos reproducibles

Elegir un id de negocio estable antes de escribir la Definition. Cada evento que contribuye al mismo Node debe portar ese id o derivarlo independientemente de su propio payload; el cliente nunca debe asignar una actualización al Context «inacabado más reciente».

Para una tarea de revisión, el contrato de eventos podría ser:

| Evento | Rol | Hechos durables requeridos |
|---|---|---|
| `review/start` | start único | `reviewId`, coordenadas de Turn/Step, título |
| `review/progress` | actualización | el mismo `reviewId`, coordenadas, progreso reproducible |
| `review/end` | actualización | el mismo `reviewId`, coordenadas, resumen final |

Usar el tipo de id con marca propiedad del productor a través del límite de proceso. Poner la fusión de `SessionEventMap` y los tipos de payload en la exportación solo de tipos del productor, e importar después esa exportación por sus efectos secundarios desde el paquete cliente. Cada `(kind, id)` puede tener como máximo un evento start. Un negocio de un solo evento puede usar la identidad estable del evento, como `event.seq`, como su id local de Definition.

Los eventos incrementales están soportados. Preferir puntos de control de valor completo cuando el productor pueda emitirlos con bajo costo, porque siguen siendo útiles cuando el start está fuera de la ventana cargada. Cada delta debe portar el id estable y producir un State determinista al reproducirse en `seq` de registro ascendente; no debe depender de memoria solo en vivo. Si la ventana de historial actual contiene solo actualizaciones, el ensamblador conserva un Context pendiente y no construye State hasta que una página más antigua suministra el start. Si el producto debe renderizar antes de que el start esté cargado, un evento terminal o de punto de control debe portar suficiente estado completo de respaldo para que la Definition construya ese resultado directamente; no recuperarlo escaneando eventos no relacionados.

Los deltas de Assistant en vivo llegan como eventos `assistant/live-chunk` solo del Client. Las líneas base de reconexión expanden el flujo compacto activo local al proceso en los mismos eventos transitorios, mientras que los eventos durables `assistant/message` y `assistant/attempt` incrustan flujos compactos completos para la reproducción del historial. Un evento transitorio puede inicializar un Context. Un delta de tool nombrado y su tool/call posterior pueden casar ambos como start bajo el mismo callId; solo el más antiguo llama a start(), y los Matches posteriores llaman a update(). Las páginas históricas no expanden los mensajes liquidados en deltas en vivo. Una Definition que consume salida de Assistant maneja los chunks en vivo y las liquidaciones durables en los mismos métodos `match()` y `update()`, mientras que las Definitions no relacionadas devuelven `null` sin expandir un flujo.

## Definition y payload tipado de Chat

El ejemplo conserva las declaraciones del productor y la contribución del cliente en un solo bloque para que la relación completa sea visible. En una familia de paquetes, conservar el id con marca y la declaración de `SessionEventMap` junto al productor del evento, y conservar la Definition, la fusión de datos de Chat y el renderizador en el plugin cliente.

```ts ignore-check
import { createElement } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { Branded } from '@deepseek-ai/dsh-brand'
import type {
  ConversationLocation, ConversationNodeContext,
  ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatNodeViewProps } from '@deepseek-ai/dsh-client-ui-chat/client'

type ReviewId = Branded<'ReviewId'>

interface ReviewStartData {
  readonly reviewId: ReviewId
  readonly turn: number
  readonly step: number
  readonly title: string
}

interface ReviewProgressData {
  readonly reviewId: ReviewId
  readonly turn: number
  readonly step: number
  readonly completed: number
}

interface ReviewEndData {
  readonly reviewId: ReviewId
  readonly turn: number
  readonly step: number
  readonly summary: string
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Opens one durable review job.
     * @mode emit
     * @param data - stable identity, location, and initial display state.
     */
    'review/start': ReviewStartData
    /**
     * Records replayable progress for one review job.
     * @mode emit
     * @param data - stable identity, location, and latest progress.
     */
    'review/progress': ReviewProgressData
    /**
     * Closes one review job with its final summary.
     * @mode emit
     * @param data - stable identity, location, and final display state.
     */
    'review/end': ReviewEndData
  }
}

interface ReviewChatData {
  readonly title: string
  readonly completed: number
  readonly status: 'running' | 'completed'
  readonly summary?: string
}

declare module '@deepseek-ai/dsh-client-ui-chat/client' {
  interface ChatNodeDataMap {
    'review-job': ReviewChatData
  }
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ConversationStepDataMap {
    'review-job': ReviewChatData
  }
}

interface ReviewState extends ReviewChatData {
  readonly turn: number
  readonly step: number
}

function locationOf(context: ConversationNodeContext): ConversationLocation {
  return context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' }
}

function viewData(state: ReviewState): ReviewChatData {
  return {
    title: state.title,
    completed: state.completed,
    status: state.status,
    ...state.summary === undefined ? {} : { summary: state.summary },
  }
}

const reviewDefinition: ConversationNodeDefinition<ReviewState> = {
  kind: 'review-job',
  target: 'chat',
  match: (event) => {
    if (event.type === 'review/start') {
      return { id: String(event.data.reviewId), role: 'start' }
    }
    if (event.type === 'review/progress' || event.type === 'review/end') {
      return { id: String(event.data.reviewId), role: 'update' }
    }
    return null
  },
  start: (_context, match) => {
    if (match.event.type !== 'review/start') throw new Error('review-job requires review/start')
    return {
      turn: match.event.data.turn,
      step: match.event.data.step,
      title: match.event.data.title,
      completed: 0,
      status: 'running',
    }
  },
  update: (context, match) => {
    if (match.event.type === 'review/progress') {
      return { ...context.state, completed: match.event.data.completed }
    }
    if (match.event.type === 'review/end') {
      return { ...context.state, completed: 100, status: 'completed', summary: match.event.data.summary }
    }
    return context.state
  },
  publication: match => match.event.type === 'review/progress'
    ? 'animation-frame'
    : 'immediate',
  buildLocationData: (context, scope) => {
    if (scope !== 'step' || context.state === undefined) return null
    return {
      kind: 'step',
      turn: context.state.turn,
      step: context.state.step,
      key: 'review-job',
      value: viewData(context.state),
    }
  },
  buildViewNode: (context) => {
    if (context.state === undefined) return null
    return {
      key: context.key,
      kind: 'review-job',
      id: context.id,
      target: 'chat',
      anchorSeq: context.start?.event.seq ?? context.matches[0]?.event.seq ?? 0,
      location: locationOf(context),
      visibility: 'visible',
      data: viewData(context.state),
    }
  },
}

function ReviewNodeView({ node }: ChatNodeViewProps<'review-job'>) {
  const text = node.data.summary ?? `${node.data.title}: ${node.data.completed}%`
  return createElement('p', null, text)
}

export const inject = ['uiConversation', 'slots']

export function apply(ctx: ClientContext): void {
  ctx.uiConversation.events.register(reviewDefinition)
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'review-job',
  }, ReviewNodeView))
}
```

`match(event)` es un extractor de identidad, no un pliegue: recibe solo el `SessionEventLike` actual y devuelve el id local de la Definition y el rol de ciclo de vida. Tras una coincidencia, el ensamblador localiza el Context por `(kind, id)` e inicializa desde su start cargado más antiguo, durable o transitorio. Cada Match posterior llama a `update`, incluido otro start. Eliminar Matches transitorios reselecciona el start a partir de la evidencia restante y recalcula el State; si no queda ningún start, el State queda undefined. Ambas funciones devuelven el State que el motor adopta; se prefiere devolver un nuevo valor inmutable, pero una función que muta y devuelve el mismo objeto tiene la misma semántica de adopción.

`buildLocationData(context, scope)` publica opcionalmente datos propiedad de la Definition sobre un Turn o Step propiedad del motor. Usar declaration merging para dar a cada clave un tipo de valor preciso. Otro Node en la misma Location puede consumir ese valor a través de su hook de slot restringido, como `useTurnData(key)`, sin recibir la sesión ni escanear `snapshot.chat.nodes`.

`target` y `buildViewNode(context)` declaran una contribución de renderizado propiedad del target y deben aparecer juntos. Conservar `context.key` como la identidad de cara a React, elegir `anchorSeq` a partir del orden de los eventos casados y devolver solo datos listos para el renderizador. Una vez publicado un Node de target, seguir devolviendo la misma clave; usar `visibility: 'hidden'` cuando deba salir temporalmente del flujo visible en lugar de retirarlo con `null`.

## Lecturas de predecesores

Algunas Definitions necesitan el State anterior más reciente de otro kind de negocio. `start` recibe un `ConversationContextReader`; llamar allí a `reader.previous<State>(kind)` en lugar de aceptar una colección de Contexts o escanear eventos. El lector devuelve el Context iniciado más cercano anterior al `seq` de start actual como datos de solo lectura.

El ensamblador registra esa dependencia. Si un prepend más antiguo suministra después un predecesor más cercano, cierra un hueco de ventana antes desconocido o revisa el State del predecesor, vuelve a ejecutar el Context dependiente desde `start` y reproduce sus actualizaciones en `seq` ascendente. La Definition consultada sigue siendo responsable de escribir un State útil; el lector no expone métodos de consulta específicos del negocio ni concede autoridad de mutación sobre otro Context.

## Rutas de actualización de la ventana

El historial puede solicitarse desde la cola hacia atrás, una página cada vez. El journal de sesión valida primero los rangos de secuencia lógica no solapados; el Assembler ordena después las entradas aceptadas por su primer `seq` antes de la reproducción del State.

| Ruta | Trabajo del motor | Comportamiento visible para la Definition |
|---|---|---|
| Replace al abrir, resincronizar o reparar un hueco | Reconstruir la ventana cargada, casar cada evento estándar o tanda empaquetada una vez por Definition, y después reproducir cada Context iniciado | `start`, seguido de sus actualizaciones en `seq` lógico ascendente; los Contexts pendientes de solo actualización permanecen sin State |
| Prepend de una página más antigua | Casar solo las entradas antiguas nuevas, fusionarlas en Contexts por `(kind, id)`, conservar los nodos con clave existentes y reproducir solo los Contexts y dependencias afectados | Un start escalar recién encontrado activa sus actualizaciones escalares y empaquetadas recolectadas; una Location o un predecesor modificados pueden volver a ejecutar el Context |
| Append de un evento en vivo | Llamar al `match` de cada Definition una vez, buscar el Context casado por clave y actualizar solo ese Context | Un `update` escalar y una publicación solicitada para un evento coincidente posterior al start; sin escaneo de Contexts existentes |

Con `D` Definitions registradas, un evento escalar entrante o una tanda empaquetada realiza `D` matches sobre la entrada actual y una búsqueda de clave de Context en tiempo constante tras una coincidencia. El código de la Definition debe conservar esa propiedad: no recorrer la ventana de eventos completa, todos los Contexts, `context.matches` ni la colección de Nodes renderizados en la ruta normal de append. Usar el State para los hechos acumulados, los datos de Location para compartir dentro del mismo Turn/Step y `reader.previous()` para las dependencias de predecesores indexadas.

`publication` controla cuándo se materializa el State modificado. Usar `immediate` para cambios estructurales o terminales, `animation-frame` para deltas visibles de alta frecuencia y `none` cuando el cambio de State solo alimenta una publicación posterior. El motor aplica cada actualización escalar en orden de registro y cada tanda empaquetada en una sola actualización por lote; la cadencia solo fusiona la publicación en las vistas.

## Obligaciones de verificación

Añadir pruebas focalizadas que establezcan estos resultados:

1. Una ventana completa pasada por replace produce el State final, los datos de Location, el payload de Node y el `anchorSeq` esperados.
2. Una cola de solo actualizaciones permanece pendiente; anteponer su start produce el mismo resultado que un replace completo.
3. El historial inicial seguido de un append en vivo produce el mismo resultado que reproducir la ventana combinada.
4. Anteponer una página más antigua añade filas anteriores sin reemplazar los valores de Node con clave existentes cuyos datos no cambiaron.
5. Los deltas visibles repetidos conservan `context.key` y publican como máximo una vez por frame de animación cuando se solicita.
6. El renderizador con clave consume solo `node.data` y los hooks de Location restringidos; no escanea la ventana de eventos de sesión, los Contexts ni los Nodes de Chat.
7. El historial de Assistant escalar y empaquetado produce el mismo State final, las mismas fronteras temporales y el mismo snapshot de target, mientras que una tanda empaquetada sigue siendo un Match a través de replace, prepend, reproducción de Location y reconstrucción del registry.
8. Crear una fuente de target no realiza trabajo de builder; la selección explícita o la primera suscripción realiza un reemplazo completo, las actualizaciones posteriores llegan a cada target activo y la activación repetida no realiza ningún reemplazo.

Usar [`packages/client/ui-chat/src/client/conversation-nodes/assistant.ts`](../../packages/client/ui-chat/src/client/conversation-nodes/assistant.ts) para el streaming y la interrupción, [`inbox.ts`](../../packages/client/ui-chat/src/client/conversation-nodes/inbox.ts) más [`message.ts`](../../packages/client/ui-chat/src/client/conversation-nodes/message.ts) para las consultas de predecesores, y [`packages/client/ui-deliverables`](../../packages/client/ui-deliverables) para una Definition que publica datos de Turn sin crear su propio Node.
