---
description: "Fallo de red y recuperación de Windows, propiedad del operador, para una aplicación de prueba de actualización instalada verificada."
---

# Fallo de red de la aplicación de prueba

[English](README.md) | Español

## Resumen

Interrumpir solo el tráfico saliente de la aplicación de calificación instalada, y luego quitar esa regla exacta antes de reintentar la actualización. Las herramientas nunca deshabilitan un adaptador, una VPN, un proxy ni un perfil de firewall. La interrupción del tráfico real sigue siendo una observación del operador; las pruebas sustituyen todos los cmdlets de firewall.

## Tabla de contenidos

- [Preparar](#prepare)
- [Bloquear y restaurar](#operate)
- [Evidencia y limitaciones](#evidence)
- [Nota de desarrollo](#dev-note)

<a id="prepare"></a>

## Preparar

Completar la verificación del paquete de la versión 1 e instalar esa versión siguiendo el [recorrido](../README.es.md). Suministrar el ejecutable instalado, no el payload extraído. Desde la raíz del repositorio, preparar su plan:

```powershell
node --import tsx apps/desktop/scripts/prepare-installed-update-network.ts "<run.json>" "<installed-test.exe>" "<verification/result.json>"
```

El preparador exige la evidencia de identidad y firma de la versión 1, el nombre exacto del archivo de prueba y los bytes coincidentes del ejecutable. Resuelve las rutas cortas de Windows y rechaza ejecutables dentro de la ejecución material. Escribe exclusivamente `network-fault/plan.json` sin cambiar el estado de la red. Conservar el plan original; identifica la única regla removible. El registro de la instalación sigue requiriendo verificación independiente del operador.

<a id="operate"></a>

## Bloquear y restaurar

Estos son pasos manuales pendientes, no un informe de una calificación real del firewall. Usar una terminal de administrador y preparar una segunda terminal con el comando Restore antes de bloquear. Cada invocación escribe un registro nuevo. `Status` es la acción por defecto y no cambia el estado del firewall. La opción de política de ejecución afecta solo a este proceso de PowerShell; no cambia la política del sistema.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File apps/desktop/scripts/installed-update-network.ps1 -Plan "<plan.json>" -Action Status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File apps/desktop/scripts/installed-update-network.ps1 -Plan "<plan.json>" -Action Block
powershell.exe -NoProfile -ExecutionPolicy Bypass -File apps/desktop/scripts/installed-update-network.ps1 -Plan "<plan.json>" -Action Restore
```

Iniciar Block, dejar su confirmación esperando y luego iniciar la descarga. Tras un progreso positivo, teclear la confirmación `BLOCK <run-id>` mostrada. El script reverifica los bytes del ejecutable y la ausencia de la regla antes de crear un único bloqueo saliente específico del programa. Observar y capturar una descarga realmente fallida; la creación de la regla por sí sola no es suficiente. Ejecutar Restore y teclear `RESTORE <run-id>` para quitar la regla coincidente, y luego hacer clic en reintentar personalmente. Status debe informar la regla como ausente. Nunca cambiar reglas no relacionadas para forzar un fallo.

<a id="evidence"></a>

## Evidencia y limitaciones

El script vuelca las etapas con marca de tiempo y el éxito o fallo final en `network-fault/records/<id>/events.jsonl`. Se detiene ante los errores y nunca reintenta ni quita silenciosamente una regla tras una creación fallida. Ejecutar Restore explícitamente tras cualquier resultado incierto. La recuperación valida el nombre de la regla, la descripción de propiedad, la dirección, la acción y la ruta exacta del programa; no exige que el ejecutable siga existiendo. Una regla ausente es un no-op seguro; una regla ajena coincidente no se quita.

Windows admite [reglas salientes específicas de programa](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/configure-with-command-line). La política local, las conexiones existentes y una descarga que termina antes de la confirmación pueden impedir la interrupción prevista. Una regla en PersistentStore no prueba un bloqueo efectivo del tráfico. Mantener la aplicación abierta y observar su fallo y el reintento posterior exitoso; si falta cualquiera de los dos, registrar el intento como incompleto. La regla persiste hasta que se quita, incluso a través de un reinicio. Mantener el plan y la terminal de recuperación disponibles; nunca instalar la actualización con la regla de prueba todavía presente.

<a id="dev-note"></a>

## Nota de desarrollo

La validación local del plan y el flujo de control real de PowerShell tienen pruebas inertes. La creación real de la regla, la interrupción efectiva y la recuperación requieren la ejecución autorizada del operador sobre la aplicación instalada.
