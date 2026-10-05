# Slots del cliente web

[English](slots.md) | Español

Los slots son el sistema tipado de composición React del cliente web. [`dsh-client-ui-slots`](../../packages/client/ui-slots/README.md) define el registry sin React y el álgebra de tipos; [`dsh-client-ui-renderer`](../../packages/client/ui-renderer/README.md) vincula fuentes observables a hooks, renderiza el árbol y posee los contextos de React internamente. Un plugin de funcionalidad contribuye UI a través de `ctx.slots.register()` y nunca importa el componente de otro plugin de funcionalidad.

Esta página documenta la propiedad de los slots, las entradas de los componentes, las API de extensión y la jerarquía distribuida. Las rutas circundantes de boot, Remote, modelo de cliente y Conversation están en [Arquitectura del cliente web](web-client.es.md).

`plugins.bundle.config` suministra la configuración de detalle de un bundle, indexada por nombre de paquete npm. `plugins.bundle.activation` renderiza orientación opcional tras la activación solicitada por el usuario, con callbacks del propietario para descartar o abrir los detalles de ese bundle. `conversation.input.activity` suministra una acción entre el selector de modelo y Enviar, con la expansión de la barra de herramientas liberada al desmontar.

## Declaración y ciclo de vida

`SlotMap` es el registry en tiempo de compilación. Un paquete fusiona por declaración la clave, la cardinalidad, el ámbito, las props del propietario, las props con clave y la cara `inject` opcional a nivel de slot. La declaración en runtime es la entrada `children` correspondiente en el componente que posee la ubicación de renderizado.

Declarar un hijo tiene tres efectos: activa la clave hija, autoriza la llamada `renderSlot` o `renderSlotChain` de esa entrada padre y registra la especificación de despacho en runtime. Una sola entrada viva posee cada declaración. Registrarse en un slot no declarado o declarar un hijo ya poseído en otro lugar falla durante la activación del plugin.

`root` es la única declaración incorporada y la única clave renderizada a través del propio servicio de Cordis. `ui-renderer` llama a `ctx.slots.renderSlot('root', {})`; cada descendiente se renderiza a través de la prop `renderSlot` o `renderSlotChain` de la entrada que lo declaró.

Los registros y las declaraciones siguen los ciclos de vida de los efectos de Cordis. Hacer dispose (liberación de recursos) de una entrada elimina su contribución y colapsa recursivamente los slots hijos que declaró. Por tanto, una funcionalidad que contribuye al slot de otro paquete usa `ctx.slots.inject(key, callback)`: el callback se ejecuta durante cada vida de la declaración, sus efectos se eliminan cuando el propietario colapsa, y vuelve a ejecutarse si el propietario se monta de nuevo.

```tsx ignore-check
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

type HeaderActionProps = PropsRuntime<'conversation.session.header.actions'>

function HeaderAction({ useSession }: HeaderActionProps) {
  const running = useSession(snapshot => snapshot.running)
  return <button disabled={running}>Review</button>
}

export const inject = ['slots']

export function apply(ctx: Context): void {
  ctx.slots.inject('conversation.session.header.actions', () =>
    ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'review',
      order: 100,
    }, HeaderAction))
}
```

## Cardinalidad y ámbito

La declaración del slot fija dos ejes independientes.

| Eje | Valor | Significado |
|---|---|---|
| cardinalidad | `single` | Una celda. Se renderiza el ganador activo por prioridad. Usar un slot hijo en lugar de tratar esto como una lista aditiva. |
| cardinalidad | `list` | Las celdas se direccionan por el `id` obligatorio y se ordenan por `order` y luego por orden de registro. |
| cardinalidad | `keyed` | El propietario despacha un `entryKey`; la celda correspondiente se renderiza con las props específicas de la clave. |
| cardinalidad | `chain` | Cada entrada suministra una función pura `select(owner)`. El primer resultado no nulo en orden de prioridad se renderiza y recibe ese resultado como `matched`; en caso contrario se renderiza el fallback del propietario. |
| ámbito | `root` | Un componente y una instancia de almacén con ámbito raíz. |
| ámbito | `session-maybe` | Hereda la vinculación del Provider circundante pero sigue siendo renderizable sin ella; los valores de sesión son opcionales. |
| ámbito | `session` | Requiere una vinculación de Provider circundante resuelta y recibe valores de sesión definidos. |

`priority` es un rango de solapamiento para las celdas `single`, `list` y `keyed`, y un orden de elección para `chain`. Los valores más bajos se ejecutan o renderizan primero. Las contribuciones aditivas ordinarias deberían elegir un `id` de lista nuevo o una `key` keyed libre; reutilizar intencionadamente una celda existente reemplaza su presentación.

## Entradas de los componentes

Un componente registrado recibe entradas ensambladas en su sitio de vinculación. Los componentes derivan estos tipos en lugar de copiar sus miembros.

| Entrada | Declarada por | Tipo del componente |
|---|---|---|
| valores del propietario y valores de ámbito estándar | la fila de `SlotMap` y los adaptadores de ámbito instalados | `PropsRuntime<K>` |
| renderizadores hijos autorizados | las claves `children` del registro | `PropsRenderSlots<S>` |
| hook selector y callbacks de mutación para el estado de vista compartido | el `store` del registro | `PropsStore<H>` |
| datos privados, callbacks y hooks observables | la factoría `inject` del registro | `InjectFace<I>` |
| función `t` localizada | el espacio de nombres `locale` del registro | `PropsLocale<N>` |
| valor seleccionado de la chain | el resultado de `select` del registro | `matched` a través de `ComposedProps` |

`SessionProvider` también está presente en `PropsRenderSlots` cuando una entrada declara un hijo `session` o `session-maybe`. Sin la prop `session` hereda la vinculación circundante; un `SessionReference` o `undefined` explícito sustituye solo ese subárbol. El Provider no aplica key a todo su cuerpo. Una entrada `session` estricta se remonta cuando cambia su generación de vinculación. Una entrada `session-maybe` en blanco adopta su primera vinculación sin remontarse, y luego se remonta ante una generación posterior o ante un retorno a la ausencia.

Los componentes nunca reciben `ctx`. Los valores puntuales propiedad del padre entran por el argumento owner de `renderSlot`; el estado de vista compartido usa un almacén declarado; los servicios y los objetos del modelo permanecen en la clausura de `apply` y se proyectan en callbacks o fuentes observables.

## Hooks proporcionados por el framework

Los adaptadores distribuidos añaden estas props estándar. Están disponibles según el ámbito del slot de destino, independientemente de qué paquete registró el componente.

| Disponibilidad | Props | Propietario |
|---|---|---|
| todos los ámbitos | `useSessions`, `useSessionStatus`, `useSessionRetainInfo` | `ui-session` |
| todos los ámbitos | `useWorkspaces` | `ui-workspace` |
| todos los ámbitos | `usePanelInfo` | `ui-layout` |
| `session` | `sessionId`, `useSession`, `useProjection` | `ui-session` |
| `session-maybe` | resultados opcionales de `sessionId`, `useSession`, `useProjection` | `ui-session` |
| `session` | `useConversation`, `useInput`, `inputActions` | `ui-conversation` |
| `session-maybe` | resultados opcionales de `useConversation`, `useInput`, `inputActions` | `ui-conversation` |
| `session` | `useChat` | `ui-chat` |
| `session` | `useTrajectory` | `ui-trajectory` |

El renderer también crea `useStore` a partir de un almacén declarado y `t` a partir de un espacio de nombres `locale` declarado. Estas son props derivadas del registro, no props estándar globales.

Los propietarios del framework y de los adaptadores de dominio pueden extender el conjunto estándar mediante `ctx.slots.provideRoot()` o `ctx.uiSession.provide()` junto con la fusión de declaración correspondiente de `GlobalStandardProps`, `SessionStandardProps` o `SessionMaybeStandardProps`. Un componente de funcionalidad no debería crear por sí mismo una prop de hook de React ni añadir una prop estándar global para datos privados de una entrada.

## Inyección proporcionada por el desarrollador

La opción `inject` de un registro es el punto de inyección ordinario propiedad de la funcionalidad. Su factoría se ejecuta en el mundo `apply` del plugin, puede cerrar sobre servicios de Cordis inyectados y devuelve solo los datos y callbacks que el componente necesita. Para un slot `session` recibe `sessionId`; para `session-maybe` recibe `sessionId | undefined`; cuando se declara un almacén también recibe las acciones vinculadas del almacén.

Un objeto `hooks` reservado en ese valor de retorno acepta fuentes desnudas `getSnapshot`/`subscribe`. El renderer convierte `hooks: { status }` en una prop de componente `useStatus(selector)` y cachea la vinculación por identidad de fuente. Los componentes no reciben la fuente misma ni llaman a `useSyncExternalStore` directamente.

El propietario de un slot puede poner una cara `inject` en la declaración hija cuando cada ocupante necesita la misma capacidad. Los miembros simples llegan a todos los ocupantes sin cambios. Los miembros con valores de función dentro de su objeto `hooks` son factorías de hooks: reciben las props estándar del slot y un `hookContext` opcional por renderizado, y devuelven el hook restringido expuesto al ocupante. `conversation.chat.node` usa este mecanismo para proporcionar `useTurnData(key)` para el nodo que se está renderizando.

Usar props del propietario para valores ya conocidos en una ocurrencia de renderizado, `inject` de registro para los callbacks y observables privados de una entrada, `inject` a nivel de slot para una capacidad controlada por el propietario del slot, y un almacén declarado para el estado de vista mutable compartido entre entradas o preservado entre remontajes. Los nodos React se componen mediante slots hijos, no mediante valores inyectados.

## Jerarquía actual

La jerarquía siguiente es el árbol de declaraciones distribuido. Un hijo existe solo mientras la entrada padre nombrada está montada; entradas de funcionalidad opcionales pueden, por tanto, hacer aparecer o desaparecer un subárbol como una única unidad de ciclo de vida.

```text
root
├─ sidebar
│  ├─ sidebar.brand.mark
│  ├─ sidebar.brand.name
│  ├─ sidebar.panellist
│  ├─ sidebar.footer.action
│  ├─ sidebar.workspaces
│  │  ├─ sidebar.workspaces.directoryFlow
│  │  ├─ sidebar.workspaces.session.menu.item
│  │  └─ sidebar.workspaces.session.row.action
│  └─ sidebar.settings
│     ├─ settings.trigger
│     ├─ settings.header
│     ├─ settings.action
│     ├─ settings.close
│     ├─ settings.onboarding
│     └─ settings.section
│        ├─ settings.general.item
│        ├─ settings.models.provider-card
│        ├─ settings.models.footer
│        └─ settings.plugins.tab
├─ main
│  ├─ plugins.item
│  ├─ plugins.bundle.config
│  ├─ plugins.row.config
│  ├─ plugins.detail.actions
│  ├─ plugins.detail.badge
│  ├─ plugins.detail.section
│  └─ main.conversation
│     ├─ conversation.session
│     │  └─ conversation.view
│     │     ├─ conversation.chat.node
│     │     │  ├─ conversation.chat.assistant-actions
│     │     │  ├─ conversation.chat.commandview
│     │     │  ├─ conversation.chat.turnTail
│     │     │  └─ tool.call.toolview
│     │     │     ├─ tool.call.images
│     │     │     └─ tool.view.cordis
│     │     ├─ conversation.message.images
│     │     └─ conversation.trajectory.images
│     ├─ conversation.header
│     │  ├─ conversation.header.leading
│     │  └─ conversation.session.header
│     │     ├─ conversation.session.header.lineage
│     │     ├─ conversation.session.header.actions
│     │     ├─ conversation.session.header.utilities
│     │     └─ conversation.session.header.corner
│     ├─ conversation.composer
│     │  ├─ conversation.approval.detail
│     │  └─ conversation.plan-review.actions
│     ├─ conversation.composer.bar
│     │  ├─ conversation.input.attachments
│     │  ├─ conversation.input.permission
│     │  ├─ conversation.input.plan
│     │  └─ conversation.input.model
│     ├─ conversation.input.overlay
│     ├─ conversation.input.dock
│     ├─ conversation.composer.dock
│     ├─ conversation.input.left
│     ├─ conversation.input.right
│     ├─ conversation.hero.brand.mark
│     ├─ conversation.hero.workspace
│     │  └─ conversation.hero.workspace.directoryFlow
│     └─ conversation.hero.agentPreset
├─ rightbar
│  └─ rightbar.session
│     ├─ sidebar.right.pane.tab
│     │  ├─ sidebar.right.tab.guide
│     │  └─ sidebar.right.tab.guide.entry
│     ├─ sidebar.right.pane.tab.title
│     └─ sidebar.right.tab.menu.item
├─ shell.leading
└─ shell.overlay
   └─ shell.quota-notice
```

El catálogo generado de inspección del cliente es el contrato exhaustivo de cada clave: cardinalidad, ámbito, props del propietario, props estándar, ocupantes actuales, propietario de la declaración y riesgo de reemplazo. Un paquete dinámico en ejecución puede consultar el árbol vivo y una clave exacta con `cordis_inspect what:"client"`; el catálogo fuente se genera a partir de las declaraciones de `SlotMap` y de los sitios de llamada de `slots.register()` con `pnpm run gen-client-catalog`.

## Reglas de extensión

- Importar otro paquete de funcionalidad solo por sus declaraciones, con `import type`; nunca importar ni reexportar sus valores de runtime.
- Declarar un nuevo slot hijo solo en el componente que posee y renderiza esa ubicación. Los demás paquetes esperan con `ctx.slots.inject()` y contribuyen mediante `ctx.slots.register()`.
- Mantener el estado de negocio y de transporte en sus servicios de Cordis o modelos de cliente propietarios. Los almacenes de slots contienen solo estado de visualización e interacción compartido.
- Mantener estables las identidades de fuentes observables y snapshots entre cambios. Republicar a través de la misma fuente siempre que cambie su valor.
- Pasar datos compatibles con JSON y callbacks entre dominios de UI. El compartimento `hooks` es la única excepción para observables desnudos; el contenido React viaja por los slots.
- Tratar `single` y una celda keyed ocupada como puntos de reemplazo. Usar ids de lista o una clave libre para extensiones aditivas.
