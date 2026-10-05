# Arquitectura del Web Client

[English](web-client.md) | Español

El Web Client es una aplicación Cordis del lado del navegador ensamblada a partir de plugins cargados de forma independiente. Su arquitectura tiene cuatro fundamentos reutilizables: [Client Modules](client-modules.es.md) carga el grafo de plugins, la [puerta de enlace de API](../api-gateway.es.md) provee la comunicación tipada con el Host, [Slots](slots.es.md) compone la UI de React, y [Conversation](conversation.es.md) convierte una ventana de historial de sesión en vistas propiedad de cada target. Esta página conecta esos sistemas y define dónde pertenecen los modelos de Client y los paquetes de funcionalidades.

[Los atajos de teclado](../../packages/client/shortcuts/README.md) poseen el registro de comandos local a la ventana y el despacho por tecla física; [la referencia de atajos](../../packages/client/ui-shortcuts/README.md) presenta los comandos disponibles y las acciones de entrada locales. Los propietarios de comandos declaran cada valor por defecto de runtime/plataforma y comparten sus acciones existentes con los controles de ratón. La primitiva modal compartida arbitra el Escape de la capa superior y restaura el foco.

## Capas y propiedad

| Capa | Propietarios principales | Responsabilidad |
|---|---|---|
| Aplicación Host | servicios de negocio y entradas Host de `packages/api/*-controller` | Posee el estado autoritativo, la persistencia, la ordenación de mutaciones, la política de acceso y la producción de flujos. |
| Transporte y ensamblado de API | `client/connection`, `api/gateway`, `api/remotes` | Establece una generación de Client, expone métodos y flujos `ctx.remote` generados, reenvía eventos Cordis seleccionados y transporta cancelaciones y resultados. |
| Modelos de Client | `api/session-controller/client`, `api/workspace-controller/client` | Mantiene espejos sin React del estado del Host, resuelve carreras entre flujos y llamadas unarias, posee las identidades de objetos y las suscripciones, y expone servicios de comandos acotados. |
| Adaptadores de UI | `client/ui-session`, `client/ui-workspace` | Convierte los observables del modelo en fuentes de Slots de sesión de raíz o vinculadas a un Provider, y posee la navegación a nivel de vista y la política de estado. |
| Datos de conversación | `client/ui-conversation`, paquetes target como `ui-chat` y `ui-trajectory` | Ensambla los eventos estándar y las ejecuciones históricas compactas del Assistant en snapshots de target independientes, y posee el shell de conversación compartido y el flujo de entrada. |
| Composición y renderizado | `client/ui-slots`, `client/ui-renderer`, `client/ui-layout`, paquetes de UI de funcionalidades | Declara ubicaciones de extensión, deriva las props de los componentes, vincula los observables a los hooks de React y monta el árbol final. |

La dirección de dependencias es estado del Host → transporte Remote → modelo de Client → adaptador de UI → Conversation o presentación → Slots → React. Las acciones del usuario viajan de vuelta a través de callbacks que cierran sobre un servicio de Client inyectado o un espacio de nombres Remote generado. Un componente de presentación nunca recibe el `ctx` de Cordis, un objeto de transporte ni la implementación del plugin de otra funcionalidad.

## Arranque del navegador

El Host escribe el `WebBootGraph` compuesto en `window.__DSH_BOOT__` e instala la fachada del cargador de módulos del navegador antes de que se ejecuten los scripts precargados por el parser. El sistema de módulos es una tabla CommonJS perezosa: cargar un bundle registra su fábrica, mientras que materializar una entrada ejecuta la fábrica con `require` síncrono sobre los módulos de plataforma y las dependencias dinámicas declaradas.

El kernel de arranque Web crea el sistema de módulos, precarga las entradas `immediately`, monta el Loader de Cordis incluido en el repositorio y crea cada entrada del grafo. La inyección de servicios de Cordis determina la activación; el orden del grafo de módulos determina solo si las importaciones síncronas pueden materializarse. Después de que la lista completa alcanza un estado liquidado, `ui-renderer` hidrata el DOM de arranque sin framework y llama a la única operación de nivel de contexto `renderSlot('root')`. [Client Modules](client-modules.es.md) posee el grafo, la ruta de bundles, la revisión de caché y los detalles del loader.

## Comunicación Remote

Los servicios de negocio del Host anotan los métodos invocables con decoradores Remote de Typert. La generación del Host emite descriptores estrictos, códecs de runtime, fusiones de declaración y mapas de fuentes. El ensamblado `api-remotes` del lado del Client selecciona esas contribuciones generadas y monta métodos concretos bajo `ctx.remote.<namespace>` y `agentCtx.remote.<namespace>` con ámbito de sesión. Los paquetes de funcionalidades dependen de la cara de servicio generada, no de la implementación de la puerta de enlace ni de la entrada de runtime de un paquete del Host.

La Connection posee la resolución de URLs de solicitud, la correlación, el portador `/api`, las comprobaciones de confianza, las rutas Fetch exactas y las generaciones de conexión. La puerta de enlace de API posee el despacho Remote, la cancelación, los flujos lógicos y el reenvío de eventos del Host seleccionados. Las operaciones de los controladores pertenecen a los métodos Remote generados o a flujos Remote explícitos; las descargas propiedad de una funcionalidad registran rutas Fetch exactas. La [referencia de la puerta de enlace de API](../api-gateway.es.md) define la generación y la invocación, mientras que el [README de Connection](../../packages/client/connection/README.md) define el portador físico y la política de confianza.

El flujo lógico interno `$events` es la fuente de generaciones de la Connection. Su frame `ready` de apertura lleva el home del Host usado para mostrar rutas y establece la generación después de que los listeners del Host estén conectados, antes de que cualquier controlador comience una lectura de línea base. `ctx.remote.$on()` entrega los eventos ordinarios de la lista de permitidos al Context de Client raíz y los eventos waterfall (eventos en cascada) con ámbito al Context de sesión resuelto; un listener de waterfall devuelve un resultado, llama a `next()` o rechaza.

## Modelos de Client

Cada paquete de controlador de API posee una cara de Host y una de Client emparejadas. El lado del Host posee la mutación autoritativa y la producción de flujos. El lado del Client posee un modelo estable en identidad y sin React sobre los mismos tipos de cable generados, y expone snapshots observables más comandos. Los paquetes de UI consumen estos servicios de Client y no reproducen el estado del transporte en almacenes de componentes.

### Sesiones

[`api/session-controller`](../../packages/api/session-controller/README.md) expone comandos del Host para listar, buscar, crear, enviar prompts, encolar, cancelar, paginar y para flujos de seguimiento/control. Su lado de Client está organizado como `ClientSessions → SessionManager → Session`:

- `ClientSessions` provee `ctx.sessions`, posee las referencias, los recuentos de fuentes, los ámbitos de sesión y los objetos `SessionBinding` estables, y proyecta el estado del catálogo sin seleccionar una sesión actual global.
- `SessionManager` posee la línea base de la lista, las actualizaciones en vivo de lista/control, las instancias de sesión perezosas, los almacenes de proyección, los catálogos de subagents y la ordenación de conflictos entre pulls y actualizaciones posteriores.
- Cada `Session` posee una ventana contigua de eventos lógicos representada por valores `SessionEventLikeEntry`, la paginación, el seguimiento, el estado de prompt/control y el snapshot observable que consumen los adaptadores.

La ruta de eventos duraderos abre `follow()`, cuyo primer frame contiene el encabezado actual, la página de cola, el cursor y la línea base completa de la proyección. Los registros de historial tienen un discriminador explícito `event` o `chunks` y un `event` interno alineado; el journal valida cada rango inclusivo de secuencia lógica antes de que el Client retenga los registros como valores `SessionEventLikeEntry` sin conversión por registro. Cada generación física reemplaza atómicamente la ventana retenida a partir de ese snapshot; los eventos estándar en vivo se anexan luego por secuencia. `page()` está reservado para el historial más antiguo y la reparación de huecos. El flujo de control transitorio comienza cada generación con una línea base completa y luego aplica actualizaciones de la proyección.

### Espacios de trabajo

[`api/workspace-controller`](../../packages/api/workspace-controller/README.md) mantiene la política de mutación de espacios de trabajo y el feed de seguimiento autoritativo en el Host. `ClientWorkspaceModel` posee las filas del navegador, el orden de los espacios de trabajo, los arrays de ids de sesiones archivadas y fijadas, los ecos de comandos y la resolución de carreras entre flujos y llamadas unarias. Cada generación del flujo comienza con una línea base completa seguida de incrementos `upsert`, `remove`, `order`, `archived` y `pinned`; una reconexión reemplaza el modelo a partir de la nueva línea base. `WorkspaceController` expone ese modelo como `ctx.workspaces`, mientras que `ui-workspace` contribuye `useWorkspaces` y callbacks de navegación. El `ArchivedFilter` de la barra lateral controla las filas ocultas por defecto, mostradas o solo archivadas en las listas y la búsqueda. Las filas archivadas conservan sus posiciones de ordenación, se renderizan atenuadas y no pueden abrirse hasta restaurarse mediante la acción Desarchivar de la fila o del resultado de búsqueda. La restauración llama a `workspace.unarchiveSession`, y su conjunto completo de archivadas llega a los Clients a través de la respuesta unaria y el incremento `archived`. El orden de visualización de las sesiones sigue siendo local al navegador e incluye los archivos ocultos; fijar mueve una sesión dentro de ese orden completo, mientras que desfijar no restaura su posición anterior.

Este emparejamiento no es una segunda fuente de verdad de negocio. Los controladores del Host deciden el estado duradero y los resultados de las mutaciones; los modelos de Client mantienen la última proyección local utilizable, preservan la identidad de los objetos cuando es útil para el renderizado y codifican cómo se fusionan las respuestas retrasadas y las líneas base de reemplazo.

## Conversación y presentación

Web y escritorio comparten la [preferencia Coding Tools](../../packages/client/ui-settings/README.md#use-this-package). Controla las vistas de diagnóstico, la selección de presets para sesiones nuevas, las tarjetas de archivos modificados y la política de vista previa HTML integrada sin cambiar los registros de sesión.

`ui-session` instala el adaptador de ámbito de sesión y publica `useSessions`, `useSessionStatus`, `useSessionRetainInfo`, `useSession`, `sessionId` y `useProjection`. `SessionProvider` hereda una vinculación externa o vincula una `SessionReference` explícita, de modo que subárboles concurrentes pueden apuntar a sesiones distintas. Los adaptadores de dominio añaden más fuentes estándar sin poner hooks de React en los objetos del modelo.

`ui-conversation` se vincula una vez a cada `SessionBinding.eventSource`. Su registro de eventos correlaciona los eventos duraderos de sesión y las actualizaciones `assistant/live-chunk` exclusivas del Client en Contexts de negocio estables, y su registro de vistas materializa snapshots de targets. Chat Assistant, Trajectory Assistant y Turn Tail interpretan tanto los chunks en vivo como los flujos compactos incrustados en las liquidaciones duraderas, de modo que la reconexión y el historial paginado reproducen el mismo estado del Assistant sin filas duraderas de tokens. `ui-chat` y `ui-trajectory` registran Definitions y builders separados: pueden interpretar la misma familia de eventos, pero no importan ni comparten el modelo de visualización final del otro. El shell selecciona una vista registrada y pasa su snapshot a través de los hooks estándar y los Slots. [Conversation](conversation.es.md) define la identidad de los Contexts, la reproducción, los datos de Location, los builders de targets y los renderizadores con clave.

`ui-slots` provee el registro tipado y el libro mayor del ciclo de vida; `ui-renderer` es el único paquete que vincula observables desnudos a través de `useSyncExternalStore`, posee los contextos de React y renderiza el árbol raíz. Los componentes de funcionalidades reciben hooks del framework, props del propietario, acciones del almacén e inyección explícita a través de sus props derivadas. [Slots del Web Client](slots.es.md) enumera esas entradas, las API de extensión y la jerarquía actual de Slots.

## Rutas de datos

| Ruta | Secuencia |
|---|---|
| visualización duradera de sesión | registro de sesión del Host → historial Remote `follow`/`page` empaquetado → ventana `SessionEventLikeEntry` del Client → Contexts de Conversation → snapshot de target (`chat`, `trajectory` u otro target registrado) → vista de Slot → React |
| control transitorio de sesión | línea base de control del Host → flujo de snapshots Remote → almacenes de proyección de `SessionManager` → snapshots de sesión y de lista → hooks estándar → componentes |
| tareas en segundo plano | registry de tareas del Host → `job.list` / `job.follow` → lista y vistas de salida de [`ClientJobs`](../../packages/api/job-controller/README.md) → lista de tareas y paneles |
| estado del espacio de trabajo | línea base e incrementos de espacios de trabajo del Host → `ClientWorkspaceModel` → `ctx.workspaces.list` → `useWorkspaces` → barra lateral, hero y entradas de navegación |
| interacción con ámbito | waterfall de Cordis del Host → `$events` de API Remotes → `ctx.remote.$on()` en el Context de sesión → paquete de UI propietario → resultado o `next()` |
| comando de usuario | callback del componente → cara de inyección del registro o propietario del Slot → `ctx.sessions`, `ctx.workspaces` o Remote con ámbito generado → controlador del Host → actualización autoritativa → flujo o proyección de eventos de vuelta al Client |

## Reconexión

La recuperación física y la lógica son independientes. El mux de la puerta de enlace restaura el WebSocket físico; cada `RemoteStream` reabre su propia fuente lógica cuando la Connection publica una generación utilizable. Un fallo del portador es reintentable, mientras que un error de negocio, un elemento de apertura malformado o una violación de protocolo es terminal para el flujo lógico propietario.

La recuperación sigue la semántica de los datos:

- Un journal de sesión duradero valida los rangos de secuencia lógica y reemplaza su ventana a partir del snapshot de apertura de cada generación; `page()` aporta el historial más antiguo y repara cualquier hueco posterior del rango.
- Los flujos de control de sesión y de espacios de trabajo retienen el último valor publicado mientras están desconectados y luego lo reemplazan atómicamente a partir de una línea base de apertura nueva.
- Las notificaciones ordinarias reenviadas no se reproducen. Los dominios con estado necesitan una línea base, un cursor o una consulta explícita; los waterfalls con ámbito conservan su propio ciclo de vida de solicitud.

No existe un `Runtime` de Client monolítico, ni `HostFrame`, `events.mux`, `events.host` ni una API `resync()` universal. La Connection expone el estado de la generación, la puerta de enlace posee la supervisión de los flujos lógicos, y cada modelo de Client define la semántica de reemplazo o reanudación apropiada para sus datos.

## Límites de paquetes

Los paquetes de plugins de funcionalidades pueden compartir declaraciones mediante `import type`; no importan en runtime ni reexportan los valores del plugin de otra funcionalidad. El comportamiento entre paquetes usa servicios de Cordis inyectados, y la UI entre paquetes usa Slots. Las Definitions de Conversation específicas de un target, los helpers de proyección y los datos de vista finales permanecen con su paquete target incluso cuando Chat y Trajectory implementan deliberadamente lógica paralela.

Los valores de runtime compartidos necesitan un propietario estático acotado sin ciclo de vida de funcionalidad, como `client/store`, `ui-primitives` o un paquete de utilidades seguro para el navegador. El transporte y el ensamblado de API generado pueden importar contribuciones de runtime porque ensamblar un protocolo es su responsabilidad explícita. Un paquete de funcionalidad no añade `dsh.client.external` solo para eludir esta regla.

Usa las cuatro referencias detalladas según la extensión que se vaya a añadir:

- [Client Modules](client-modules.es.md) para el descubrimiento de paquetes, la carga, las identidades de módulos compartidos y el orden de arranque.
- [Puerta de enlace de API](../api-gateway.es.md) para los métodos del Host, las contribuciones Remote generadas, los flujos y los eventos reenviados.
- [Slots del Web Client](slots.es.md) para componentes, hooks, almacenes, inyección y colocación.
- [Conversation](conversation.es.md) para la correlación de eventos duraderos, los snapshots de targets y las contribuciones de vistas de Chat o Trajectory.
