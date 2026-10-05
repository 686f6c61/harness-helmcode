# Programar recordatorios

[English](schedule.md) | Español

## Resumen

Crear recordatorios en una conversación, y después inspeccionar las tareas activas e inactivas y editar el nombre, la instrucción y la hora de ejecución de una tarea activa desde la página Tareas de automatización. Los recordatorios diarios siguen una hora local y una zona horaria guardadas; los recordatorios de ritmo fijo siguen intervalos transcurridos. Las tareas únicas entregadas permanecen disponibles hasta eliminarlas explícitamente.

## Tabla de contenidos

- [Crear recordatorios](#create-reminders)
- [Inspeccionar y eliminar tareas](#manage-tasks)
- [Editar una tarea activa](#edit-timing)
- [Referencia de temporización y entrega](#timing-and-delivery)
- [Exploración adicional](#further-exploration)

<a id="create-reminders"></a>
## Crear recordatorios

El perfil Web distribuido no incluye Schedule. Abrir Plugins y activar Tareas de automatización en el grupo Official; el bundle experimental opcional `@deepseek-ai/dsh-experimental-schedule-bundle` añade entonces Schedule con el contexto de reloj que da al modelo la hora actual y la zona del navegador. Configurar un proveedor de modelos antes de pedirle que cree recordatorios.

Pedir al modelo que cree, liste, edite o elimine recordatorios. Usa `schedule_create`, `schedule_list`, `schedule_update` y `schedule_delete` (la actualización cambia un recordatorio en su sitio y conserva su id y sus registros de entrega guardados); la acción Nueva de la página Tareas de automatización abre en su lugar una nueva sesión para una creación, con la solicitud ya escrita en su compositor. Las opciones soportadas son un retardo único en segundos enteros positivos, una fecha y hora absolutas, un intervalo fijo de al menos un minuto, una hora local diaria con una zona horaria IANA, una hora local semanal con una zona horaria IANA y días de la semana ISO del lunes 1 al domingo 7, o una expresión cron de cinco campos con una zona horaria IANA explícita, almacenada en forma canónica.

Por ejemplo, pedir: «Recuérdame cada día a las 23:00 en Asia/Shanghai que revise el tiempo». Abrir Tareas de automatización y seleccionar el recordatorio creado. Comprobar que su frecuencia muestra una regla diaria y la zona pedida, no Una vez. Un recordatorio único no se vuelve recurrente tras la entrega.

<a id="manage-tasks"></a>
## Inspeccionar y eliminar tareas

Abrir Tareas de automatización desde la barra lateral para ver recordatorios de todas las sesiones sin activar sus conversaciones. Buscar por el nombre de tarea almacenado, la instrucción o el id de sesión interno de la tarea, y filtrar por la única fila de estado Todas, Habilitadas o Inactivas. Una fila de sesión inactiva y no archivada cuya sesión tenga al menos una tarea activa muestra una marca de reloj; una fila archivada mantiene esa celda en blanco, con su estado en vivo solo en la tarjeta flotante. Una pulsación larga sobre una fila de sesión con tareas activas lista hasta dos de esas tareas con su frecuencia y su próxima ejecución como hora en la zona del dispositivo con su duración relativa. La cabecera de la sesión abierta muestra un reloj de recordatorios de solo icono mientras existan recordatorios activos: abre directamente los detalles de la única tarea, o una lista de los recordatorios de la sesión en caso contrario.

Seleccionar una tarea para abrir Reglas, y después elegir Registros de entrega para cargar los 20 registros guardados más recientes. Cada registro guardado se lee como una fila compacta: un glifo de reloj, la hora de la ocurrencia en la zona guardada de la tarea (la zona del navegador para una tarea única o de intervalo) y la instrucción guardada cuando se almacenó una. Los registros sin instrucción guardada nunca muestran la instrucción actual en su lugar. Cargar registros anteriores añade la página siguiente. Los registros siguen el orden guardado de más reciente a más antiguo aunque el reloj retroceda; no describen resultados de ejecución del modelo. La entrada de la sesión original está en la tira de pestañas de detalle, así que permanece visible mientras se desplaza la vista Reglas. Las flechas izquierda/derecha sin modificadores y Inicio/Fin cambian las pestañas enfocadas; las combinaciones con Alt, Ctrl, Meta y Shift no se interceptan. Refrescar la tarea conserva la pestaña seleccionada.

Una vista de registros vacía significa que una consulta exitosa no devolvió registros guardados. La carga, el fallo de solicitud, una tarea inexistente y un cursor de registros anteriores inválido tienen mensajes separados. Usar Reintentar registros de entrega tras una solicitud fallida o una respuesta de tarea inexistente; usar Actualizar registros de entrega tras un cursor inválido para recargar la página más reciente. Los registros cargados previamente pueden permanecer visibles con un aviso mientras falla una solicitud. Una nueva última entrega refresca la página más reciente. Las respuestas tardías de una tarea o vista que ya se dejó no reemplazan la vista actual.

Para tareas sin historial guardado, solo puede mostrarse un último recibo existente hasta que nuevas entregas añadan registros; las entregas posteriores no recuperan el historial que falta ni limpian su aviso. Los registros anteriores no guardados y las instantáneas de instrucción no se pueden recuperar, y la instrucción actual no sustituye a una instrucción guardada que falte. El aviso de historial anterior aparece solo cuando el Host marca los registros anteriores como no disponibles; las tareas nuevas sin entregas muestran el estado vacío sin ese aviso.

Las tareas activas participan en la programación. Las tareas inactivas no programan otra entrega. Una tarea única se vuelve inactiva después de que su recordatorio se escriba de forma durable en la bandeja de entrada de la conversación; elegir Todas las tareas o Inactivas para encontrarla. El catálogo de la cabecera de conversación y el `schedule_list` del modelo muestran solo recordatorios activos, así que desaparecer de esas vistas no significa que la tarea conservada se haya eliminado.

La entrada Sesión vinculada de la tira de pestañas de detalle abre la conversación original cuando sus metadatos están listos y la sesión está disponible y no archivada. En caso contrario, la entrada está desactivada con un motivo. Los detalles de la tarea y la acción de eliminación permanecen disponibles aunque su sesión original no pueda abrirse. Navegar por las tareas no desarchiva sesiones.

Elegir Eliminar tarea y confirmar para detener las entregas futuras y quitar la tarea de la lista, también para una tarea inactiva. La eliminación quita la tarea junto con sus registros de entrega guardados, así que el historial guardado de la tarea desaparece. Confirmar la eliminación cierra el panel o pestaña que la pidió y reporta el resultado en un aviso único para toda la app: eliminada, o un fallo que deja la tarea en su sitio para reintentar; no elimina la conversación original ni retira un mensaje ya encolado en ella. La fila permanece visible hasta que una consulta exitosa confirma las tareas restantes. Si una consulta falla, Reintentar recarga el catálogo; el error no es un resultado vacío exitoso.

<a id="edit-timing"></a>
## Editar una tarea activa

En Tareas de automatización, seleccionar una tarea activa y abrir Reglas para editar su nombre, instrucción y hora de ejecución. Las tareas inactivas son de solo lectura, y las ediciones permanecen en un borrador local hasta elegir Guardar cambios. La edición conserva el id de tarea, la conversación original, el último recibo de entrega y todos los registros de entrega guardados.

- Diaria y Semanal: editar Hora y Zona horaria; una regla semanal también conmuta Día de la semana. Una fila de reloj muestra segundos enteros, una fila no tocada conserva un valor de milisegundos almacenado para su envío, y la zona IANA almacenada se conserva. Una regla modificada selecciona su primera ocurrencia futura usando las reglas de DST de abajo.
- Cada: elegir Cada N horas, Cada N minutos o Cada N segundos e introducir la cantidad en la unidad que indica la fila; el intervalo mínimo aceptado es 1 hora, 1 minuto o 60 segundos para esa unidad, y el intervalo enviado es en segundos enteros. Un intervalo modificado empieza desde la hora de guardado aceptado del Host, con el primer objetivo un intervalo nuevo después. Las zonas horarias no afectan a este intervalo transcurrido.
- Única After/At: editar filas separadas de Fecha y Hora, y Zona horaria. La zona inicial es la zona almacenada del registro, o la zona de este dispositivo cuando el registro no almacena ninguna, y el reloj sembrado nombra el mismo instante almacenado; una regla única que no almacenó zona muestra una pista indicando que la zona seleccionada interpreta la fecha y hora introducidas. Cambiar la zona conserva esos valores de reloj y cambia el instante. Un objetivo modificado se guarda como At con el mismo id de tarea. La zona no se conserva como metadato de recurrencia.

Las filas solo cambian un borrador local. Guardar cambios envía el nombre, la instrucción y la regla completa en una sola actualización, y aparece una barra de guardado mientras el borrador difiere de la tarea almacenada; Cancelar restaura los valores almacenados. El menú Repetir ofrece Semanal, De lunes a viernes, Cada día, Cada N horas, Cada N minutos, Cada N segundos, Una vez y Personalizado (cron), y el Host acepta cualquiera de ellos, así que una única After puede guardarse como At. Una regla normalizada equivalente no realiza escritura ni reinicio de objetivo: el mismo intervalo Cada no reinicia su temporización, y un objetivo único sin cambios conserva After o At. Las filas están desactivadas mientras hay un guardado en curso. Salir de la tarjeta no revierte una escritura del Host ya iniciada.

Un refresco del catálogo conserva los campos editados y toma todos los demás campos del registro refrescado, así que un cambio concurrente en otro campo sobrevive a una edición no guardada. La entrada inválida se reporta y bloquea Guardar. Si una entrega u otra edición cambió la tarea, un conflicto impide sobrescribir ese cambio; reintentar para editar la regla más reciente. Una actualización aceptada refresca el catálogo. Una actualización rechazada o no confirmada es distinta de un error de carga del catálogo: usar Reintentar para recargar el catálogo, no para repetir una actualización ya confirmada. Si la propia actualización no puede confirmarse, comprobar la tarea antes de reintentar. Las respuestas tardías tras cerrar los detalles o cambiar de tarea no reemplazan la vista actual.

<a id="timing-and-delivery"></a>
## Referencia de temporización y entrega

Los recordatorios permanecen almacenados cuando su sesión no está abierta. Mientras el Host se ejecuta, restaura la sesión original cuando un recordatorio vence y encola un seguimiento sin interrumpir el trabajo en curso. Al reiniciar se comprueban las tareas almacenadas y se envía una única vencida o solo la última ocurrencia perdida de cada tarea recurrente. Cerrar el Host detiene la programación hasta que arranque de nuevo. Las tareas recurrentes vencidas de la misma sesión pueden compartir un mensaje.

Los recordatorios de ritmo fijo permanecen alineados con la creación hasta que cambia su intervalo; un intervalo modificado se alinea con la hora de guardado aceptado. Los recordatorios diarios, en cambio, siguen la hora local y la zona IANA guardadas. Una hora local diaria o una fecha que no existe se salta; una hora solapada usa el instante más temprano una vez ese día. Una solicitud de hora absoluta rechaza una hora local inexistente y elige el instante más temprano durante un solapamiento. El navegador aporta su zona para interpretar las solicitudes en lenguaje natural; nombrar una zona explícitamente evita la ambigüedad. Los detalles de la tarea conservan la zona de una regla de reloj guardada en su texto de frecuencia y muestran cada próximo objetivo como un reloj en la zona del dispositivo; una tarea única almacena solo el instante UTC, así que sus marcas de tiempo usan la zona del navegador.

Los registros de entrega guardados confirman mensajes persistidos en la bandeja de entrada de la conversación, no que el modelo completara el trabajo pedido. Un fallo de persistencia en la bandeja o de escritura de tarea no añade ningún registro guardado. Un fallo o un error de escritura de tarea tras la persistencia en la bandeja puede dejar un mensaje entregado sin registrar y repetir una entrega; la entrega exactamente una vez no está garantizada. Esto no es un historial de ejecución ni un canal de notificación externo.

Los registros guardados se podan cuando se añade un acuse: el Host conserva los registros cuya hora de acuse cae dentro de la ventana configurada `deliveryHistoryDays`, medida hacia atrás desde el `deliveredAt` del recibo añadido, y como máximo los `deliveryHistoryRecords` registros más recientes. El último recibo siempre sobrevive, y una ventana podada marca los registros anteriores como no disponibles. El Host conserva el historial retenido en memoria y reescribe la fila completa de la tarea para cada acuse. La paginación limita el número de registros devueltos, no el historial retenido ni los bytes de instrucción.

La pausa y una sesión nueva para cada ejecución no están soportadas. La edición de nombre, instrucción y hora de ejecución está disponible para el modelo a través de `schedule_update`, que cambia el recordatorio en su sitio y conserva su id y sus registros de entrega guardados, y para la página Tareas de automatización contra el vínculo de la tarea seleccionada; ninguna de las dos es un flujo de trabajo de relevo entre sesiones. Los recordatorios registrados solo en un registro de sesión antiguo no se programan automáticamente; volver a crear los que aún se necesiten. Los registros de tareas eliminados previamente no se reconstruyen.

<a id="further-exploration"></a>
## Exploración adicional

- La [referencia de Schedule](../../../packages/schedule/schedule/README.md) documenta los selectores de temporización exactos, la persistencia y los límites de entrega.
- La [referencia de la página Tareas de automatización](../../../packages/client/ui-schedule/README.md) describe la página global y el catálogo de la cabecera de conversación.

## Nota de desarrollo

Ninguna.
