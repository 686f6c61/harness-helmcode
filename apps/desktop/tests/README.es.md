# Verificación local de actualizaciones de Desktop

[English](README.md) | Español

## Resumen

La evidencia de descarga local y de diálogo obligatorio es independiente de la integración con el backend de producción, la aceptación visual y las actualizaciones de la aplicación instalada. Ejecutar el comando del [README de Desktop](../README.es.md) para producir un reporte aislado nuevo.

La cualificación instalada puede optar por `DSH_DESKTOP_UPDATE_JOURNAL_DIR`, un directorio absoluto fuera del árbol de instalación que ambas versiones conservan. Cada proceso principal vuelca un archivo JSONL separado con su versión instalada, las transiciones de estado y los hitos de operación manual. Los diagnósticos crudos y los datos de solicitudes quedan excluidos; los errores de almacenamiento se propagan. La [decisión del journal](../../../.agents/notes/implemented/testing/2026-09-14-desktop-installed-update-journal.md) define los límites de la evidencia. Las pruebas unitarias y de entrada principal cubren el journal; una actualización instalada firmada sigue sin verificar.

## Tabla de contenidos

- [Visibilidad del overlay nativo](#verification-overlay)
- [Evidencia](#verification-evidence)
- [Recorrido manual](#verification-interactive)
- [Verificación abierta](#verification-open)

<a id="verification-overlay"></a>

## Visibilidad del overlay nativo

En macOS, reutilizar el runtime de Electron cacheado tras compilar las fuentes del Host de Desktop:

```sh
pnpm exec tsc -b apps/desktop/tsconfig.host.json
apps/desktop/.desktop-build/targets/mac-arm64/electron/Electron.app/Contents/MacOS/Electron apps/desktop/tests/fixtures/update-overlay-visibility.mjs
```

El fixture posee un perfil único y escribe `result.json` bajo `.desktop-build/qualification/update-overlay-*`. Compara la visibilidad nativa, el contenido padre sin filtrar y la limpieza de listeners con la salida esperada local del propietario para el ocultado y la muestra del padre y la disponibilidad del documento mientras el padre está oculto. No usa red, login del producto ni Host dsh. Esto cualifica la restauración nativa de la ventana, no el flujo completo del primer login.

<a id="verification-interactive"></a>

## Recorrido manual

Para la evidencia de instalación real, publicación tras el arranque, fallo y reintento, y reinicio, usar la [lista de comprobación del operador de actualización instalada](installed-update/README.es.md). El runner interactivo de abajo intercepta la instalación y es una cualificación distinta.

Con los artefactos del Host, del cliente y de Desktop compilados, ejecutar `node --import tsx apps/desktop/scripts/test-workspace-updates.ts --interactive` desde la raíz del repositorio en Windows. El espacio de trabajo real permanece abierto con una ventana de control separada. Sus menús seleccionan actualizaciones ordinarias u obligatorias, retienen y liberan descargas, inyectan fallos de descarga y encolan o limpian tareas de prueba. Seleccionar un fallo antes de empezar la descarga. Tras la aprobación de la instalación y el apagado de tareas, un mensaje del fixture reporta la llamada interceptada del instalador; reconocerlo termina el recorrido. Cerrar la ventana de control también sale. Cada ejecución posee un perfil privado y un servidor loopback; los payloads no son instaladores. Reiniciar el comando para una ronda nueva. Omitir `--interactive` ejecuta los escenarios automatizados con su plazo de 120 segundos y salida automática; las descargas interactivas tienen un plazo de red de diez minutos.

<a id="verification-evidence"></a>

## Evidencia

El comando local compila Desktop y ejecuta Electron 44 con el actualizador HTTP real, el cliente de política, el preload con sandbox y el renderer obligatorio. Registra cada escenario y preserva su reporte bajo `.desktop-build/qualification/local-updater-*`. La llamada del instalador, el navegador externo y el portapapeles son sustitutos de observación; los bytes descargados no son un instalador ejecutable.

Los fixtures de supervisión de empaquetado controlan sus metadatos de Git y usan hashes de archivos reales con procesos hijo inertes. Los cambios de Git head y del worktree siguen rechazando el empaquetado; las pruebas concurrentes no pueden cambiar las entradas de Git registradas del fixture.

| Capa | Resultado observado |
|---|---|
| Actualizador ordinario | Pasan el rechazo de versión igual o anterior, la descarga completa autorizada por el usuario, el rechazo de SHA-512, la transferencia interrumpida, los plazos de feed y descarga estancados, el reintento explícito, las solicitudes fusionadas, el reemplazo de feed en la misma dirección, la disponibilidad y el traspaso de instalación separado |
| Política obligatoria | Pasan el `40005` aplanado, las cabeceras exactas de lanzamiento, las solicitudes de invitados, la validación de no forzado, la retención de fallos, el intervalo y backoff, el timeout y las regresiones de dispose |
| Programación ordinaria | Las regresiones con reloj falso sobre el coordinador real verifican el jitter y backoff acotados, las uniones manuales, el restablecimiento por éxito, la ausencia de reintento automático de descarga, la independencia del reloj de pared y el dispose. Las pruebas de entrada principal verifican la limitación de foco y reanudación, las comprobaciones explícitas inmediatas y la limpieza de salida |
| Ventana obligatoria real | Pasan el contenido de servidor de solo texto, un frame de shell de Windows incrustado sin ventana nativa adicional y con la ventana principal habilitada, el bloqueo de Escape, la descarga directa, la confirmación de tareas en el mismo modal, el aplazamiento, las acciones de página solo en recuperación, la retroalimentación de navegación y copia, y la limpieza de política nueva; una prueba enfocada verifica el cierre hasta la salida sin limpiar la política |
| Diálogo ordinario real | Pasan el preload aislado, la tarjeta de 380 px, las esquinas de 24 px, el botón primario negro, el desenfoque del padre, la cancelación con Escape conservando la disponibilidad, y la aprobación con aviso de tareas con traspaso de instalación registrado |
| Interacción de Windows desbloqueada | Los clics a nivel de SO y las capturas de pantalla del renderer obligatorio real confirman el bloqueo de Escape, la descarga iniciada por el usuario, la disponibilidad, la retroalimentación roja de error de política y la limpieza del modal con el padre habilitado de nuevo. Un diálogo nativo de aviso de tareas proporcionado por el fixture vuelve a la disponibilidad al aplazarse; la actividad de tareas es simulada, no una carga de trabajo completa del Host |
| Entrada principal | Un bloqueo conocido rechaza las mutaciones de plugins y la recuperación sin detener el Host; un éxito nuevo cierra el bloqueo; la política empaquetada ignora los overrides de entorno; un fallo del instalador tras una parada limpia restaura el Host antes de otra confirmación y conserva el bloqueo obligatorio |
| Protección de tareas del Host | El controlador real con composición sustituida detecta agents en ejecución, turnos y pasos en cola, y jobs globales y de agent; las lecturas de API no avisan. El bloqueo de admisión devuelve 503 para las solicitudes nuevas, drena las solicitudes existentes y vuelve a comprobar las tareas; el desbloqueo restaura la admisión |
| Salida visible | Pasan la expectativa de DOM del diálogo obligatorio en español y la expectativa de presentación de actualización ordinaria; las pruebas de componentes de la fila de cuenta cubren el progreso y el reintento persistente |
| Configuración de empaquetado | Los metadatos incrustan el ID de aplicación y la política configurados; el hook pre-pack compilado rechaza un origen de política HTTP sin ejecutar el empaquetado ni la subida |

La ejecución enfocada de diálogo, entrada principal, configuración y barra lateral pasa 119 casos de regresión. Cinco pruebas del portador cubren todas las sentencias, ramas, funciones y líneas de la fuente compartida de estado de actualización. El comando con Electron real pasa 17 escenarios y captura los diálogos de ordinario listo, aviso de tareas y error obligatorio. Estas comprobaciones aisladas no certifican el espacio de trabajo completo ni un lanzamiento. Los resultados de las puertas del repositorio completo y las limitaciones del entorno permanecen separados de esta evidencia enfocada.

La revisión 1228 de Chromium headless shell está instalada en el directorio ignorado `.desktop-build/playwright`. Las suites ensambladas del navegador de configuración y barra lateral pasan 18 casos. El [escenario del navegador del espacio de trabajo de Desktop](../../web/tests/desktop-updates.e2e.ts) pasa los casos en español y en inglés, captura seis capturas de pantalla por locale, y verifica la colocación en la fila inferior, el progreso compacto con rechazo de clics duplicados, una insignia en el botón superior, el reintento rojo persistente con tooltip de error y una acción de listo separada. La función de presentación, la composición Web del Host, los plugins de cliente y el CSS son reales; el portador de Desktop está sustituido. Estos casos no ejercitan el IPC de Electron, los menús, la autorización de tareas ni la instalación.

El [escenario del Host compilado](fixtures/host-update-qualification.mjs) usa el Loader de perfil real, el preset de agent estándar, los servicios de tareas y los procesos Node en segundo plano. Verifica los turnos y pasos en cola, una solicitud de modelo en ejecución, preguntas y aprobaciones pendientes, jobs globales y de agent en estados de ejecución y detención, el bloqueo de admisión sin cancelación, la admisión restaurada y la inspección rechazada tras el dispose del Host. Solo se sustituyen las respuestas del modelo y las respuestas humanas. Dos invocaciones independientes pasan concurrentemente con perfiles y datos de sesión privados; todos los agents, jobs y Hosts poseídos terminan antes de que se escriba un reporte de éxito.

El [runner del espacio de trabajo de Electron](../scripts/test-workspace-updates.ts) ejecuta una copia privada de la entrada principal compilada con el preload real, el espacio de trabajo y un proceso Host separado. Reconoce el aviso de primera ejecución y conduce los botones del renderer a través de eventos de entrada de Electron y de la entrada del depurador de Chromium para el frame de Windows incrustado. La aplicación privada reutiliza los recursos de runtime del destino preparado. Pasan diez escenarios, que cubren la retroalimentación de menús, el fallo y reintento de descarga, la confirmación de instalación separada, la creación real de tareas en el momento de la confirmación, el aplazamiento, el bloqueo obligatorio y el timeout real de desmontaje del Host. Tanto los fallos ordinarios como los obligatorios restauran un Host de reemplazo y requieren una confirmación de instalación nueva; la recuperación no limpia la política obligatoria. La entrega usa un servidor local y la instalación se intercepta; no son resultados de una aplicación instalada firmada.

El [runner de firmas de Windows](../scripts/test-windows-update-signature.mjs) usa el generador de metadatos de electron-builder instalado y el verificador `NsisUpdater` con el certificado público de lanzamiento y entradas ejecutables reales. Los atributos de editor coincidentes pasan; la misma firma válida con un editor esperado distinto y un ejecutable sin firmar se rechazan. Un control negativo de editor ausente confirma que la verificación se omite. Las regresiones unitarias cubren el escapado de DN, las identidades incompletas y los destinos de Windows explícitos o por defecto del host; quitar la configuración del editor hace fallar ambos casos de metadatos. Esta comprobación no descarga, instala ni firma ningún artefacto.

El [runner de descargas firmadas](../scripts/test-signed-updates.mjs) conecta HTTP real de Electron, `NsisUpdater`, Authenticode de Windows y el coordinador compilado. Pasan cuatro escenarios: rechazo de editor incorrecto con hash válido, rechazo de sin firmar con hash válido, rechazo de transferencia corrupta antes de la verificación de firma, y reintento explícito hasta la disponibilidad firmada con traspaso de instalación separado. Las cachés de ejecutables rechazados quedan vacías, las comprobaciones automáticas no emiten ninguna solicitud de reintento, las descargas preparadas se conservan, y las entradas originales mantienen su SHA-512. El feed sintético y el adaptador de aplicación de prueba no establecen la compatibilidad de la versión instalada; no arranca ningún instalador ni Host.

Con un instalador antiguo y ambos blockmaps originales, el mismo runner verifica además la reconstrucción de rango único y de rangos múltiples, el fallback de blockmap antiguo ausente y el fallback de rango rechazado. Los ejecutables reconstruidos pasan las comprobaciones de SHA-512 y Authenticode. Los registros de solicitudes distinguen los bytes de payload diferenciales de las descargas completas; un fallback completo no puede satisfacer una aserción de éxito diferencial. Estos resultados de loopback no certifican el soporte de Range del CDN ni la caché de una aplicación instalada.

<a id="verification-open"></a>

## Verificación abierta

Los siguientes elementos no son evidencia superada y deben permanecer visibles durante la revisión:

- `capturePage()` de Electron captura ventanas individuales. Las observaciones interactivas de Windows incluyen diálogos compuestos y selección de menús nativos, pero la aceptación de Figma y layout multiplataforma y una grabación completa permanecen sin verificar. El runner automatizado del espacio de trabajo invoca el manejador de menú directamente.
- El lanzador de desarrollo encuentra una junction de dependencia opcional de Linux ARM64 colgante en este checkout de Windows; los runners de cualificación enlazan el grafo de dependencias existente directamente y no validan la proyección de ese lanzador.
- El fixture no ejecuta un instalador, no sobrescribe una aplicación instalada ni establece que una versión nueva arranque con éxito. La cualificación de versión instalada firmada de Windows y macOS sigue siendo necesaria para el lanzamiento.
- Dos instaladores de prueba aislados de Windows pasan la inspección de paquete firmado, incluida su configuración de feed incrustada. El arranque instalado, el fallo y reintento, el reinicio automático y la retención de datos siguen siendo verificación del operador; la inspección de archivos no certifica un lanzamiento.
- Los orígenes de política en vivo, el comportamiento de la puerta de enlace, los límites de tasa, los orígenes de páginas aprobados y la configuración de política desplegada están pendientes de integración con el backend. Las respuestas locales no son prueba de un servicio en vivo.
- Los estancamientos de política, de feed del actualizador y de descarga del actualizador alcanzan sus plazos reales y se recuperan. El `ENOSPC` de escritura de descarga inyectado está cubierto; el agotamiento real del volumen y la presión de disco de la actualización instalada permanecen sin verificar. La descarga diferencial y el rechazo de editor están verificados mediante descargas reales de Electron, pero aún no en la ruta de actualización instalada de una aplicación recién empaquetada.
- La escritura nativa del portapapeles pasa en Windows. Se intenta el lanzamiento del navegador por defecto, pero la verificación del destino se detiene porque la herramienta de automatización no puede identificar con fiabilidad la URL actual. La integración de navegador y portapapeles de macOS permanece sin verificar.
- Los fallos obligatorios y ordinarios usan resúmenes localizados y diagnósticos plegados; un fallo de copia revela una dirección seleccionable. Los tooltips de error ordinarios muestran resúmenes en lugar de diagnósticos crudos. La atención instalada de Windows y macOS, el permiso de notificaciones y el comportamiento del modo de concentración permanecen sin verificar.
- El `doc-sync` completo encuentra `EPERM` de symlink de archivo de Windows en la prueba del sitio de documentación. Esto no es un fallo del actualizador y no pone verde la puerta completa de documentación.
