---
description: "Lista de comprobación del operador para una actualización instalada de Windows con una descarga fallida, reintento explícito y evidencia conservada."
---

# Recorrido de actualización instalada de Windows

[English](README.md) | Español

## Resumen

Preparar una aplicación de prueba privada y un espacio de nombres de distribución de prueba nuevo, y después dejar que el operador instale, inyecte un fallo, reintente y confirme el reinicio. Un manifest local o una secuencia completa de journal no certifican un instalador ni los datos preservados. Los pasos de la aplicación instalada de abajo permanecen sin verificar hasta que el operador los realice con paquetes verificados.

## Tabla de contenidos

- [Preparar los materiales](#prepare)
- [Secuencia del operador](#sequence)
- [Evidencia y recuperación](#evidence)
- [Nota de desarrollo](#dev-note)

<a id="prepare"></a>

## Preparar los materiales

Desde la raíz del repositorio con las dependencias instaladas, asignar una ejecución con dos versiones de prueba derivadas crecientes. Esto solo escribe un manifest local ignorado; no compila, firma, sube, instala ni lee credenciales.

Los ejemplos usan la versión base `0.1.6-alpha.1`. Antes de crear material nuevo, sustituir la base real, la fecha de Asia/Shanghai y un índice sin usar según las [reglas de versiones de lanzamiento](../../README.es.md#release-versions).

```powershell
node --import tsx apps/desktop/scripts/prepare-installed-update.ts init 0.1.6-alpha.1.20260916.1 0.1.6-alpha.1.20260916.2
```

Conservar el `run.json` devuelto y reutilizar su identidad aleatoria y las rutas `qualification/<id>` para ambos paquetes. El commit fuente y la lista de archivos sucios identifican el checkout de partida, no el contenido de un paquete posterior. Registrar por separado los identificadores fuente finales de la compilación y los hashes de los artefactos; no regenerar el manifest a mitad de una actualización.

Preparar recursos fuente nuevos con el workflow de solo preparación del repositorio, y después generar el bootstrap compartido, dos copias privadas de runtime vinculadas a versión y los archivos de aplicación congelados. Reemplazar `<run.json>` por la ruta del manifest del asignador. La solo preparación compila y comprueba el runtime fuente pero se detiene antes de firmar; los demás comandos nunca invocan un firmante ni un instalador. Estos comandos se niegan a sobrescribir salidas por ejecución existentes; conservar el material parcial tras un error en lugar de reintentar sobre él.

```powershell
node apps/desktop/node_modules/pnpm/bin/pnpm.mjs --dir apps/desktop run prepare:package win-x64
node --import tsx apps/desktop/scripts/prepare-installed-update.ts bootstrap "<run.json>"
node --import tsx apps/desktop/scripts/prepare-installed-update.ts runtime "<run.json>"
node --import tsx apps/desktop/scripts/prepare-installed-update.ts application "<run.json>"
```

Empaquetar ambos archivos desde el directorio `bootstrap` generado junto a `lib/`, y establecer la entrada principal del paquete a `qualification-bootstrap.mjs`. Esa entrada valida el ID de aplicación y la versión instalados antes de cargar el main de producción. Asigna los datos de usuario y sesión de Electron, el home de Harness y los journals bajo el directorio de datos de aplicación del sistema operativo en `dsh-update-qualification/<id>/`; ambas versiones usan las mismas rutas. El copiador de runtime solo cambia las versiones de paquetes de la familia de lanzamiento y las referencias de dependencias coincidentes, preserva las versiones de terceros, y reverifica ambos inventarios copiados y la fuente intacta. Su `runtime-preparation/result.json` registra los hashes y explícitamente no afirma cualificación de firma ni de arranque de las versiones copiadas. Estas versiones sintéticas son materiales de prueba, no lanzamientos npm.

El comando `application` copia los módulos main y preload compilados, los archivos del renderer y el bootstrap preparado en `application/files`, con valores SHA-256 en `application/result.json`. No copia el `.env.windows` raíz de la app ni congela `node_modules` y las herramientas de compilación. La [configuración del constructor de cualificación](../../scripts/installed-update-builder.ts) verifica este inventario y el runtime privado seleccionado, selecciona los archivos congelados compartidos y los metadatos de paquete aislados, y preserva los hooks ordinarios de instalador y firma. Sus pruebas sustituyen el firmante y pasan el validador de configuración del constructor fijado; no producen un instalador. Una compilación supervisada autorizada por separado debe registrar aun así las entradas de dependencias y herramientas y verificar el contenido y las firmas del paquete final.

La [entrada de empaquetado](../../scripts/package-installed-update.ts) usa por defecto las comprobaciones. Un enclavamiento de firma retenido rechaza antes de cargar las credenciales; nunca limpia ese enclavamiento. Sin enclavamiento, las comprobaciones cargan `.env.windows`, validan las entradas preparadas y no lanzan ningún hijo. El constructor compartido requiere un `DOWNLOAD_TEST_RELEASE_ID` válido de los [ajustes de lanzamiento de prueba](../../README.es.md#upload-updates); la cualificación sigue publicando a través de las rutas `qualification/<id>` separadas del manifest. Ejecutar esto desde la raíz del repositorio con una versión exacta:

```powershell
node --import tsx apps/desktop/scripts/package-installed-update.ts "<run.json>" 0.1.6-alpha.1.20260916.1 --check
```

El empaquetado real permanece sin verificar y requiere una aprobación separada de recuperación hardware y un operador presente. El modo `--execute` requiere una terminal y una confirmación exacta que contiene la versión y el ID de ejecución; no hay opción de aprobación por pipe. Vuelve a comprobar el enclavamiento y asigna en exclusiva el directorio `packaging` de esa versión. El hijo supervisado compila solo esa versión, deshabilita la publicación, despoja las credenciales no relacionadas, y se detiene ante un fallo o un plazo global de 15 minutos. Este plazo no acota los intentos individuales de autenticación CSP. Los registros conservan los hashes de fuente y herramientas, la salida redactada, los eventos y los hashes de los archivos de artefactos; un intento o salida existente rechaza la reutilización. `builderCompleted` y un resultado de supervisor con éxito no establecen la verificación del paquete, la aceptación de la firma ni el éxito de la instalación; `packageVerification` permanece `pending` hasta que esas comprobaciones se realicen de forma independiente.

Antes de que el operador empiece, aportar ambos instaladores verificados, los metadatos y blockmaps generados, los registros de empaquetado y firma, la ruta exacta del ejecutable instalado y la URL fija del feed de prueba. Ambos paquetes deben usar la misma identidad de prueba, directorios de datos aislados y un `DSH_DESKTOP_UPDATE_JOURNAL_DIR` externo absoluto en cada lanzamiento, incluido un reinicio disparado por el instalador. Una variable definida solo en la terminal del lanzamiento original es insuficiente. Las [reglas de firma de Windows](../../README.es.md#windows-ev-signing) siguen aplicándose; un manifest nunca limpia un enclavamiento de firma.

El [helper de firmas de solo lectura](../../scripts/installed-update-signature.mjs) de Windows usa el verificador real del actualizador con un editor derivado del certificado público confiable, y después exige atributos válidos de Authenticode y marca de tiempo y un SHA-512 sin cambios. Los hijos de verificación no reciben secretos heredados de firma o subida ni overrides de rutas de módulos de PowerShell. El helper nunca carga `.env.windows`, firma un archivo ni ejecuta el ejecutable inspeccionado. La aceptación de la sonda firmada y el rechazo del instalador sin firmar se han observado localmente; no certifican ninguna de las versiones preparadas, la identidad del paquete ni el comportamiento de instalación.

El [verificador de paquetes](../../scripts/verify-installed-update-package.ts) comprueba el instalador final antes de extraerlo con un ejecutable 7-Zip local revisado. Aportar rutas absolutas para el manifest, el certificado público confiable y la herramienta; nunca seleccionar una herramienta extraída del instalador que se está verificando. Este comando crea un directorio `verification/check-*` nuevo, preserva los registros parciales y falla inmediatamente cuando el instalador está ausente:

```powershell
node --import tsx apps/desktop/scripts/verify-installed-update-package.ts "<run.json>" 0.1.6-alpha.1.20260916.1 "<public.cer>" "<reviewed-7za.exe>"
```

El verificador comprueba la identidad real de la aplicación archivada, la entrada, los bytes congelados de la aplicación, las versiones de dependencias del actualizador, la configuración de feed, caché y editor, y el runtime de Harness incluido contra las entradas preparadas; la política de prueba obligatoria debe ser válida. Extrae el runtime de `app.asar` y comprueba las firmas de los ejecutables en sus rutas `app.asar.unpacked`. Los ejecutables de runtime cambiados requieren comprobaciones de firma separadas; los demás bytes del runtime deben coincidir con los bytes preparados tras la transformación de manifests de dependencias de electron-builder. Rechaza las rutas de archivo inseguras antes de la extracción y registra las firmas del instalador, la aplicación y los ejecutables de runtime. Antes del éxito, vuelve a comprobar los hashes del instalador, del feed y blockmap, del manifest, del certificado y de la herramienta. `passed` cubre solo estas comprobaciones: los bytes de dependencias no están congelados, y el registro del instalador, el arranque, la actualización y la retención de datos siguen siendo comprobaciones manuales explícitas. La lectura real de archivos se ha observado sobre un paquete antiguo conservado; la verificación completa de paquetes firmados para las versiones preparadas sigue pendiente.

Seguir el [procedimiento de subida y publicación](publication/README.es.md) separado. Dejar el feed fijo ausente para el caso 404, y después publicar la versión 1 para el caso de misma versión. Mantener los metadatos de la versión 2 locales hasta que ambos casos terminen en la aplicación de versión 1 instalada. Conservar los registros de publicación y los objetos remotos para el diagnóstico; no eliminar un feed publicado para recrear un caso anterior.

El comando local `files` acepta `<run.json>` y una versión exacta de la ejecución. Lee el `installer/nightly.yml` de esa versión, verifica el nombre de instalador esperado, el tamaño, el SHA-512 y el blockmap externo no vacío, e imprime los destinos binarios separados y un cuerpo de feed fijo. Los instaladores ausentes hacen fallar la validación. No escribe nada y no lee credenciales. Su resultado `file-integrity-only` no puede autorizar la subida ni reemplazar la verificación del contenido del paquete firmado y la identidad de la aplicación; ambas siguen siendo necesarias antes de la publicación.

<a id="sequence"></a>

## Secuencia del operador

Proceder manualmente solo después de que la preparación pase. Usar conversaciones y ajustes de prueba desechables, nunca un espacio de trabajo de producción ni trabajo sin guardar.

1. Instalar la versión 1. Registrar la ruta del instalador, el hash, el resultado de la firma y la hora. Arrancar el acceso directo instalado y verificar su ruta de ejecutable y la versión mostrada; no lanzar una compilación desempaquetada ni un servidor de desarrollo.
2. Confirmar `started` y `workspace-ready` de la versión 1 en un journal nuevo. Crear una conversación de prueba identificable y cambiar un ajuste inofensivo; registrar los valores esperados en privado. Completar las dos comprobaciones de feed de abajo y mantener la versión 1 en ejecución.
   - **Feed ausente:** conservar un GET con marca de tiempo de la URL fija configurada devolviendo 404. Observar la comprobación automática de arranque sin un diálogo perturbador, y después comprobar manualmente: esperar comprobación seguida de fallo, no «sin actualizaciones», y ninguna descarga ni instalación. Guardar capturas de pantalla y journals antes de publicar nada.
   - **Feed de misma versión:** tras autorización separada, publicar la versión 1 en esa misma URL y conservar la respuesta 200 completa, la versión y el SHA-512. Comprobar manualmente en la versión 1 aún en ejecución: esperar ninguna actualización disponible y su versión actual, ninguna descarga ni instalación, y ningún indicador de error desactualizado del caso 404. La comprobación automática sin actualizaciones debe permanecer silenciosa. Conservar la evidencia antes de autorizar la versión 2.
3. Autorizar la publicación de los metadatos de la versión 2 en la URL del feed fijo existente. Releer esa URL y verificar la versión 2 y su hash binario. Preservar la evidencia de publicación tras la evidencia de arranque de la versión 1.
4. En la versión 1, comprobar manualmente y confirmar la disponibilidad sin descarga automática. Preparar el [fallo de ámbito de aplicación y la recuperación](network/README.es.md) revisados. Nunca deshabilitar el adaptador, la VPN, el proxy compartido, la conexión de control remoto ni el acceso de todo el dominio.
5. Hacer clic en descargar e interrumpir solo la transferencia de la aplicación de prueba después de que empiece el progreso. Capturar un fallo y la retroalimentación persistente de reintento; confirmar que no hay instalación ni reintento silencioso. Un fallo de conexión antes de que empiece el progreso es una observación distinta y no satisface una prueba de interrupción de transferencia.
6. Quitar el fallo exacto propiedad de la ejecución y verificar la recuperación. Hacer clic en reintentar personalmente. Registrar el progreso, la verificación y la disponibilidad. Esperar una confirmación de instalación separada; la finalización de la descarga por sí sola no debe aprobar el reinicio.
7. Confirmar la instalación. Con tareas activas, inspeccionar el aviso y autorizar explícitamente su detención; sin tareas, la confirmación no debe afirmar que existen tareas. Registrar la última ventana de la versión 1 y dejar que la instalación y el reinicio terminen sin arrancar manualmente otra instancia.
8. Verificar el ejecutable de la versión 2 instalada y la versión mostrada. Comprobar la conversación y el ajuste del paso 2 y capturar el resultado. Buscar `started` y `workspace-ready` de la versión 2 en el mismo directorio de evidencia externo. Reportar el reinicio automático ausente por separado del arranque manual con éxito; uno no puede sustituir al otro.

<a id="evidence"></a>

## Evidencia y recuperación

El 404 intencional es un caso de fallo de comprobación, no el caso posterior de descarga interrumpida. Una respuesta del navegador por sí sola no prueba el comportamiento de la aplicación. Mantener juntos la URL, la hora UTC, el estado HTTP, el cuerpo y hash del feed cuando exista, la captura de pantalla y el snapshot del journal de cada observación. El inspector de journals no certifica los dos casos de feed ni registra diagnósticos HTTP crudos; el operador aporta esas observaciones. Una comprobación manual con éxito posterior debe recuperarse sin reiniciar la aplicación.

Conservar el manifest, los registros de compilación, los feeds originales, los hashes binarios, los recibos y relecturas de publicación, la evidencia de instalación y retirada del fallo, las capturas de pantalla y todos los journals de proceso. Los logs del instalador y los datos de prueba pueden contener rutas o contenido privados; revisarlos antes de compartirlos. El inspector es de solo lectura y copia solo referencias de hitos, no diagnósticos crudos. Reemplazar el marcador de directorio y usar las versiones exactas del manifest:

```powershell
node --import tsx apps/desktop/scripts/prepare-installed-update.ts inspect 0.1.6-alpha.1.20260916.1 0.1.6-alpha.1.20260916.2 "<journal-directory>"
```

La salida 0 significa que los hitos ordenados del journal están presentes; la salida 2 significa hitos ausentes; la salida 1 significa que la validación de entrada o de comando falló. Una secuencia de fallo y reintento no puede combinar procesos distintos de la versión 1. Un sucesor arrancado antes de que el proceso original saliera no se cuenta; los cambios de reloj pueden dejar la evidencia incompleta y requieren investigación. `recordedFlow: complete` no es la aceptación global. El reporte siempre requiere comprobaciones independientes del operador para el momento de la publicación, el fallo de red y la recuperación, la finalización y ruta del instalador, los datos preservados, y las capturas de pantalla y confirmaciones.

Para conservar un snapshot local del journal y su reporte, usar `collect` con el directorio `dsh-update-qualification/<run-id>/journals` de la aplicación instalada correspondiente. Valida todos los registros seleccionados antes de crear un `evidence/collection-*` nuevo bajo la ejecución de material. Los journals copiados y `report.json` describen el mismo snapshot en memoria, con valores SHA-256 y `operatorAcceptance: pending`; los archivos originales no cambian. No se recopilan otros archivos, ajustes, conversaciones, salida de compilación ni credenciales. Mantener su evidencia revisada por separado junto al reporte, no dentro del directorio del journal.

```powershell
node --import tsx apps/desktop/scripts/prepare-installed-update.ts collect "<run.json>" "<journal-directory>"
```

La salida 0 de la recolección significa que los archivos se guardaron, aunque el flujo registrado esté incompleto; inspeccionar `report.json` antes de sacar conclusiones. Las escrituras fallidas conservan la salida parcial y un marcador de fallo cuando el almacenamiento lo permite. Una recolección repetida crea otro directorio sin reemplazar la evidencia anterior. La inspección y la recolección rechazan colas parciales, campos o valores de diagnóstico desconocidos, archivos de más de 10 MiB y snapshots de más de 50 MiB. Recolectar después de que las acciones relevantes se asienten; una aplicación en vivo puede añadir registros después del snapshot, y una adición parcial en carrera requiere una recolección posterior en lugar de truncar el log original. La recolección real de la aplicación instalada sigue siendo un paso del operador; las pruebas usan el escritor de journals real con acciones de ciclo de vida sintéticas.

Usar esta plantilla de reporte; dejar pendientes los resultados no observados:

| Elemento | Ubicación de la evidencia | Resultado |
|---|---|---|
| Ambos instaladores y firmas verificados | | pending |
| Feed 404: fallo automático silencioso y fallo manual visible, sin descarga | | pending |
| Feed de versión 1: ninguna actualización disponible en la versión 1 en ejecución, error anterior limpiado | | pending |
| Versión 1 en ejecución antes de la publicación de la versión 2 | | pending |
| Fallo solo de prueba y fallo de descarga observado | | pending |
| Fallo retirado y reintento explícito hasta la disponibilidad | | pending |
| Confirmación separada y finalización del instalador | | pending |
| Reinicio automático en la versión 2 instalada | | pending |
| Conversación y ajuste de prueba preservados | | pending |
| Journals y capturas de pantalla conservados | | pending |
| Cambios de red de prueba ausentes después | | pending |

Detenerse en el primer prerrequisito fallido. Un fallo de firma detiene el empaquetado y preserva su registro; no reintentar la autenticación del PIN automáticamente. Una discordancia de feed detiene la prueba antes de la descarga. Si un fallo afecta al control remoto, detenerse y restaurar solo su cambio poseído con la acción de recuperación preparada. No desinstalar, limpiar cachés, eliminar evidencia ni sobrescribir lotes fallidos para que un intento posterior parezca exitoso. Asignar una ejecución nueva para un intento limpio y conservar la fallida.

<a id="dev-note"></a>

## Nota de desarrollo

La asignación local y la inspección de journals tienen pruebas automatizadas. La producción de paquetes firmados, las herramientas aisladas de fallos de red, la publicación tardía del feed, el reinicio disparado por el instalador y esta secuencia completa del operador requieren cualificación separada; esta página no los reporta como completados.
