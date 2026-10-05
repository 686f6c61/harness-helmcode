---
description: "Separación entre la subida de binarios de prueba y la publicación del feed fijo autorizada por el operador para la calificación de actualizaciones instaladas de Windows."
---

# Subida y publicación de actualizaciones de prueba

[English](README.md) | Español

## Resumen

Subir ambas versiones verificadas sin anunciar la versión 2, y luego publicar su feed fijo después de que el operador inicie la versión 1 instalada. Los comandos por defecto comprueban los materiales locales sin credenciales ni acceso a la red. Las escrituras reales en COS requieren autorización y verificación separadas del operador.

## Tabla de contenidos

- [Prerrequisitos](#prerequisites)
- [Secuencia del operador](#sequence)
- [Evidencia y recuperación](#evidence)
- [Nota de desarrollo](#dev-note)

<a id="prerequisites"></a>

## Prerrequisitos

Completar ambas verificaciones de paquetes del [recorrido](../README.es.md). Conservar los recibos exitosos `verification/check-*/result.json` y los materiales sin cambios. El publicador revalida cada recibo contra los bytes actuales del instalador, el blockmap, el feed y el manifest. Nunca firma ni instala nada.

El loader `.env.windows` existente suministra `DSH_DESKTOP_AUTO_UPDATE_ENV=test`, `DOWNLOAD_TEST_ORIGIN=https://download-test.deepseek.com`, `DOWNLOAD_TEST_COS_BUCKET=bj-toc-download-test-1320056602` y `DOWNLOAD_TEST_COS_SECRET_ID` / `DOWNLOAD_TEST_COS_SECRET_KEY`. Solo esos dos secretos de subida entran en el cliente COS; nunca ponerlos en comandos ni en registros. El transporte restringe las peticiones al bucket de prueba y a las rutas privadas de calificación de Windows.

La operación de subida de binarios añade una consulta de versionado del bucket y rechaza las escrituras salvo que la consulta tenga éxito con estado ni enabled ni suspended. La publicación del feed reutiliza un recibo exitoso de subida de binarios en lugar de repetir esa consulta o descargar los binarios. COS documenta que [`x-cos-forbid-overwrite`](https://cloud.tencent.cn/document/product/436/7749) no protege los objetos en buckets versionados. Una consulta denegada deja esa configuración como desconocida; no establece que las subidas estén denegadas.

Usar un único publicador en todas las máquinas. Un `publication.lock` local excluye operaciones solapadas que comparten el directorio de materiales, no otras máquinas. La publicación de la versión 2 comprueba el feed existente de la versión 1 antes de reemplazarlo; esta lectura y escritura no son un compare-and-swap atómico. Ningún otro publicador puede escribir el mismo feed concurrentemente.

<a id="sequence"></a>

## Secuencia del operador

Estos son pasos manuales pendientes, no una calificación remota completada. Ejecutar desde la raíz del repositorio con el manifest conservado, la versión exacta y el recibo de verificación coincidente. Sin `--execute`, ambos comandos imprimen un plan local y no envían ninguna petición:

```powershell
node --import tsx apps/desktop/scripts/publish-installed-update.ts upload-binaries "<run.json>" "<version>" "<verification/result.json>"
node --import tsx apps/desktop/scripts/publish-installed-update.ts publish-feed "<run.json>" "<version>" "<verification/result.json>"
```

1. Comprobar ambas versiones localmente. Para cada subida autorizada por separado, añadir `--execute` a `upload-binaries` y teclear `UPLOAD <version> <run-id>` en una terminal interactiva. Las subidas del instalador y del blockmap nunca publican un feed. Los binarios existentes coincidentes se leen de vuelta, no se sobrescriben; bytes distintos detienen la operación.
2. Dejar el feed fijo ausente. Instalar e iniciar la versión 1 mediante su acceso directo instalado; confirmar su versión mostrada y el journal `workspace-ready`. Completar el caso 404 del recorrido antes de autorizar cualquier escritura del feed. Mantener la versión 1 en ejecución.
3. Autorizar el `publish-feed` de la versión 1 con `--execute` y `PUBLISH <version> <run-id>`. Sus binarios deben existir ya y pasar la relectura pública. El feed inicial debe estar ausente o contener los bytes exactos de la versión 1. Tras la relectura completa del feed, completar el caso de misma versión en la aplicación de la versión 1 en ejecución; conservar la evidencia y obtener autorización separada antes de publicar la versión 2.
4. Autorizar la publicación de la versión 2 con el comando siguiente y su confirmación exacta. Suministrar el directorio `dsh-update-qualification/<run-id>/journals` de la aplicación instalada original. Se exigen la evidencia de arranque y el feed anterior esperado. El operador verifica de forma independiente la ruta instalada y que la versión 1 sigue en ejecución.

```powershell
node --import tsx apps/desktop/scripts/publish-installed-update.ts publish-feed "<run.json>" "<version-2>" "<version-2-verification/result.json>" --journals "<journal-directory>" --execute
```

Continuar el recorrido solo tras una publicación exitosa y la relectura pública. La herramienta usa URL públicas fijas sin parámetros anti-caché, sube con `Cache-Control: no-store` y verifica los bytes y hashes devueltos. Las subidas de binarios conservan la relectura pública completa. La publicación del feed lee remotamente solo el feed y exige un resultado exitoso de `upload-binaries` con un plan local exactamente coincidente bajo el `publication-records/operation-*` de esta ejecución; los recibos ausentes, fallidos o no coincidentes detienen la publicación. El resultado de la publicación registra la ruta del recibo reutilizado y los hashes del recibo y del plan. Esto prueba la entrega previa, no la disponibilidad continuada de objetos inmutables; no borrar ni reemplazar esos objetos. Las escrituras del SDK no tienen reintentos automáticos.

<a id="evidence"></a>

## Evidencia y recuperación

Cada operación conserva `publication-records/operation-*`: plan, etapas con marca de tiempo, resultado final y cuerpo del feed cuando aplica. Los registros incluyen IDs de petición seguros y el estado HTTP disponible, no errores crudos del SDK ni cabeceras de autorización. Un fallo detiene las escrituras posteriores; un timeout no prueba que el servidor rechazara una escritura anterior. Preservar los registros y los objetos remotos, inspeccionar la última etapa y el estado remoto real, y obtener confirmación separada antes de otra operación.

Diagnosticar un `403 AccessDenied` por la API exacta: `GetBucketVersioning`, `GetObject` y `PutObject` requieren permisos distintos. Antes de pedir un acceso más amplio o cambiar la configuración de la CDN, comparar las ejecuciones exitosas conservadas y comprobar la operación fallida con las credenciales actuales. Una consulta de configuración añadida no debe informarse como un fallo de subida cuando no se intentó ninguna subida. Las lecturas exitosas por sí solas no prueban el permiso de escritura actual; preferir revisar un preflight nuevo innecesario antes que expandir una identidad de subida de mínimo privilegio.

Una operación posterior solicitada manualmente verifica los objetos coincidentes sin reescribirlos. `alreadyPublished: true` significa la reconciliación de un feed deseado existente, no una publicación nueva; usar la evidencia de la operación original para el momento de la publicación. Bytes de feed inesperados detienen la operación, incluido el intento de reemplazar la versión 2 con la versión 1. Un fallo puede dejar un `publication.lock`; confirmar que no queda ningún publicador y preservar los registros fallidos antes de que un operador quite ese directorio vacío exacto. Nunca borrar un lock para eludir a un publicador activo.

Las consultas de versión de COS de calificación tienen un plazo total de 30 segundos, y las lecturas de objetos y los PUT tienen un plazo total de 15 minutos. La expiración aborta las peticiones HTTP subyacentes y espera al cierre antes de liberar el lock de la operación; la actividad de transferencia en curso no extiende el presupuesto.

<a id="dev-note"></a>

## Nota de desarrollo

Las pruebas de secuenciación usan un almacén en memoria; las pruebas de transporte ejercitan la serialización real del SDK con un manejador HTTP sustituido. Ninguna certifica las escrituras en COS. El 2026-09-14, las credenciales actuales leyeron la sonda de prueba conservada con HTTP 200 y SHA-512 coincidente, mientras que `GetBucketVersioning` devolvió 403; no se intentó ningún PUT. Una sonda separada del 2026-09-11 verificó las subidas de prueba, el refresco del feed fijo y la descarga del actualizador. TODO: revisar el prerrequisito extra de configuración del bucket sin debilitar el aislamiento del namespace, las comprobaciones de integridad ni el comportamiento de parada ante fallos; su eliminación no está implementada por esta corrección de documentación.

La ejecución posterior autorizada por el operador `installed-update-r5dYNH` conserva `object-overwrite-probe/result.json` y `binary-upload/result.json` bajo `.desktop-build/qualification/`. Crear un nuevo objeto de prueba de 49 bytes tiene éxito; un segundo PUT de bytes idénticos con sobrescritura prohibida devuelve `409 FileAlreadyExists`, y los hashes de origen y públicos permanecen sin cambios. Un driver de ejecución fija solo de binarios sube luego ambos instaladores firmados y sus blockmaps con la misma cabecera, revalida los recibos de paquetes y verifica las cuatro respuestas públicas completas. Registra cuatro PUT exitosos de objetos nuevos, sin reintentos, sin escrituras de feed ni de configuración, y conserva la sonda. Una observación HEAD de la URL privada del feed devuelve 404. Esta ejecución del operador usa la protección observada a nivel de objeto en lugar de consultar la configuración del bucket; el prerrequisito general de la CLI anterior permanece sin cambios. Estos recibos establecen la entrega del objeto de prueba, no la publicación del feed, el arranque instalado ni una actualización instalada.
