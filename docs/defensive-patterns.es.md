# Patrones defensivos

[English](defensive-patterns.md) | Español

Reglas de clases de errores aprendidas con esfuerzo: cada patrón siguiente es una clase de defecto que llegó a producción o estuvo a punto de hacerlo en este repositorio, enunciada como la regla que evita su repetición. Leer esto antes de escribir código de ciclo de vida, concurrencia, subprocesos o desmontaje. Las contrapartes del nivel de pruebas (ruta de entrada real, verificación contra el mundo, propiedad de recursos) están en [testing.md](testing.es.md).

## Informar los resultados ortogonales de forma independiente

Un resultado puede ser varias cosas a la vez: un proceso puede agotar el tiempo de espera Y salir con 0 porque capturó la señal. Exponer cada hecho independiente (`timedOut`, `signal`, `exitCode`) por separado; nunca anidar el informe de un indicador dentro de la rama de otro, o un llamante leerá una ejecución truncada como un éxito limpio.

## Respetar los contratos públicos en AMBOS lados

Cuando una implementación recibe varias representaciones de un mismo resultado, normalizarlas antes de devolverlas a través de la API pública. Las implementaciones de `LlmAdapter.stream()` pueden lanzar o emitir `finish {kind:'error'|'aborted'}`, pero `LlmRuntime.stream()` expone los fallos de solicitud de modelo únicamente como fragmentos finish terminales; los defectos del middleware y de los consumidores siguen lanzándose. Esto evita que los consumidores adivinen si una excepción capturada provino del proveedor, de un envoltorio, del registro de fragmentos o de su propio ensamblado. Documentar el contrato normalizado donde se define el tipo; ejercitar cada forma de origen a través del consumidor real.

## El estado asíncrono no es estado síncrono

`agent.followup()` no tiene finalización ni resultado por mensaje; la finalización de una tarea en segundo plano compite con los límites de turno; `reader.close()` se dispara tanto por EOF como por liberación. Nunca tratar `agent/status` o `whenIdle()` como el resultado de un seguimiento: varios seguimientos en cola, el steering y el trabajo inyectado pueden compartir un mismo intervalo `running`, mientras que la cancelación o la liberación pueden descartar elementos no iniciados. Un llamante de automatización que realmente posee una ejecución debe definir su intervalo explícitamente, por ejemplo desde el recibo duradero en la bandeja de entrada de su mensaje hasta el siguiente `idle` de todo el agent, y describir cualquier salida seleccionada como propia de todo el intervalo en lugar de atribuirla causalmente a ese mensaje. La guarda corta en ambos sentidos: si la transición esperada nunca puede ocurrir, la espera se cuelga, así que manejar explícitamente la rama de «no hay nada que esperar».

<a id="dispose-must-reach-quiescence-not-just-request-it"></a>

## El dispose debe alcanzar la quiescencia, no solo solicitarla

Un desmontaje que emite kills/aborts pero regresa antes de que el trabajo se detenga deja procesos huérfanos. Hacer la limpieza asíncrona y esperar la salida de los hijos (kill → await `done`), y cerrar los registries de listeners y notificaciones ANTES de matar para que las finalizaciones tardías permanezcan en silencio.

## Contener las excepciones de callbacks en el despachador

Un listener suministrado por el usuario que lanza no debe rechazar la promesa dentro de la que se ejecuta ni privar a los listeners posteriores. Envolver el bucle de despacho en try/catch y registrar; un solo suscriptor defectuoso nunca rompe el ciclo de vida núcleo.

## No entregar nunca a una salida no confiable el entorno ambiental ni rutas predecibles

Los comandos con spawn reciben un entorno depurado (sin `*KEY*`/`*SECRET*`/`*TOKEN*`/`*PASSWORD*`) para que las credenciales del harness no puedan filtrarse a la salida, a `env` o a archivos spill. Los archivos temporales y spill usan un directorio privado (0700), nombres aleatorios y aperturas exclusivas solo para el propietario (`'wx'`, `0o600`): las rutas predecibles legibles por todos invitan a carreras de symlinks y a divulgación.

## Eliminar con unlink las rutas con forma de enlace

Una ruta que puede ser un symlink o una junction de Windows se elimina con `lstatSync().isSymbolicLink()` y después `unlinkSync`: unlink elimina solo el enlace y rechaza un directorio real, de modo que nunca sigue el enlace hasta su destino. En Windows, `rmSync(link)` lanza `ERR_FS_EISDIR` sobre una junction; la eliminación recursiva puede descender a través de una hasta su destino. Reservar el `rmSync` recursivo para directorios reales conocidos.
