# Post-mortem 0003: Un Web agent validó un servidor de reemplazo en lugar de su GUI actual

[English](0003-web-agent-gui-feedback-loop.md) | Español

Estado: resuelto

## Resumen ejecutivo

Un Web agent (agente) modificó el código fuente de la GUI pero no sabía qué URL y qué proceso alojaban su sesión. Delegó la aceptación en el usuario, luego trató un HTTP 200 de Vite a secas como éxito a pesar de una pantalla en blanco por la falta de `window.__DSH_BOOT__`, y finalmente validó un servidor `dsh web` de reemplazo en otro puerto mientras la página original ya había recogido los artefactos recompilados. La corrección hace que la URL actual y el modo de runtime sean visibles para el modelo y consultables desde el shell, rechaza el Vite independiente antes del listen, y verifica el refresco de producción y el HMR (reemplazo de módulos en caliente) de desarrollo contra el estado externo.

## Resumen

La sesión se ejecutaba dentro de la GUI Web de DeepSeek Harness en el puerto 3081 mientras su espacio de trabajo seleccionado era un directorio `test/` vacío. La solicitud del modelo no nombraba ni la GUI ni su checkout de código fuente, URL, proceso o modo de actualización. Los recursos del repositorio exponían `apps/web` con un script de desarrollo de Vite, mientras la composición completa del navegador vivía tras `dsh web`.

Las acciones resultantes eran individualmente plausibles pero no compartían un único objetivo de aceptación. Una edición de código fuente, una compilación exitosa, un HTTP 200, un manifest (lista de metadatos) de arranque inyectado y la página existente del usuario se trataron como hechos intercambiables.

La fuente de evidencia es el registro de eventos persistido de `session-3eb796c2-5159-4686-affe-df8719f6f987`, cuya cabecera registra el cwd `/Users/tn.shen/Documents/deepseek-harness-gui-master/test`. Su cabecera de solicitud inicial es la secuencia 6; la entrega al usuario, el lanzamiento de Vite a secas, el lanzamiento del host de reemplazo, la sonda del manifest de arranque y la primera sonda del proceso 3081 son las secuencias 30939, 31865, 34309, 34441 y 34681 respectivamente. La cronología siguiente sigue esos eventos en lugar de reconstruir la intención a partir del informe posterior.

## Impacto

El usuario tuvo que identificar tres errores consecutivos: la aceptación se le delegó de vuelta; la vista previa propuesta era una página en blanco; y la URL reportada como exitosa no era la página que estaba usando. Un servidor de reemplazo no gestionado también sobrevivió al turno hasta que el usuario lo cuestionó.

Ningún cambio de esta investigación reinició ni modificó los servicios de prueba 3081 y 3082 de solo lectura.

## Cronología

- En el turno 2, tras editar el tema, el mensaje de la secuencia 30939 del agent indicó al usuario que ejecutara `pnpm run demo:tui` o abriera una aplicación Web sin especificar. No ejecutó ninguna aceptación Web ensamblada.
- En el turno 3, el agent leyó `apps/web/package.json`, lanzó Vite a secas en el puerto 5173 en la secuencia 31865, observó HTTP 200 y declaró el éxito. El navegador, en cambio, lanzó `client-modules: window.__DSH_BOOT__ is missing or not an object` y renderizó una página en blanco.
- En el turno 4, el agent encontró la ruta completa de `dsh web`, recompiló el shell, lanzó un proceso no gestionado en el puerto 3334 en la secuencia 34309 y solo comprobó que ese reemplazo devolvía 200 con un manifest de arranque en la secuencia 34441. Nunca sondeó el puerto 3081.
- En el turno 5, el usuario informó en la secuencia 34556 de que 3081 ya mostraba el nuevo tema. Solo entonces, en la secuencia 34681, el agent inspeccionó el proceso existente y eliminó el servidor redundante.

## Causa raíz

El ensamblado Web no tenía ninguna identidad visible para el modelo de la GUI actual, la URL canónica o el modo de runtime. El cwd de la sesión identificaba correctamente el espacio de trabajo seleccionado por el usuario, pero el modelo trató ese directorio de proyecto como el directorio de la aplicación. Ningún registro durable relacionaba el checkout del código fuente de la GUI, los artefactos compilados, el proceso servidor, el origen objetivo y la aceptación en el navegador.

La ruta de arranque equivocada parecía legítima porque el Vite a secas devolvía HTTP 200. `window.__DSH_BOOT__` solo lo inyecta el host completo, así que la disponibilidad del transporte no implicaba la disponibilidad de la aplicación. La primera prueba de regresión repitió este error de otra forma: un timeout mató a Vite y satisfizo una aserción de salida distinta de cero. La reproducción en vivo expuso ese falso positivo.

También se evitaron las semánticas de procesos en segundo plano con `&` del shell, así que la identidad de la tarea, los avisos de finalización, la recolección y la limpieza no se aplicaron. Verificar el puerto 3334, por tanto, solo demostró que un segundo servicio funcionaba.

## Salvaguardas añadidas

- El lanzador Web publica la URL loopback canónica en la sección `app:web-surface` del prompt registrado y en el entorno gestionado `$DSH_WEB_URL`.
- La guía de producción exige recompilar los artefactos y verificar la URL existente tras el refresco. La guía de desarrollo explica que el receptor de HMR está siempre activo; `pnpm run dev:web` en el mismo checkout recompila los paquetes de plugins de cliente para una recarga sin refresco, mientras que los cambios del shell y de paquetes ordinarios siguen requiriendo refresco.
- El modo de servicio de Vite independiente de `apps/web` se rechaza durante la configuración. Su prueba de subproceso demuestra la salida natural e instrumenta `Server.listen()` para que un bind transitorio no pase desapercibido.
- Pruebas por capas de la ruta real cubren la solicitud de la CLI (interfaz de línea de comandos), los prompts exactos de producción y desarrollo, los hechos de runtime del shell, el reemplazo estático en el mismo puerto, la recompilación del vigilante de código fuente, el sondeo de stat del host y el HMR del navegador bajo una identidad de página sin cambios.
- La evidencia del PR conserva capturas de pantalla de la sesión 3081 original y una ejecución de GUI antes/después con modelo real; las observaciones externas de navegador, HTTP, proceso y registro de sesión sustentan la aceptación.

## Lecciones

- El agent debe conocer los prerrequisitos ocultos del runtime antes de poder guiar al usuario; el modo de arranque es contexto de la aplicación, no conocimiento tribal.
- La disponibilidad HTTP, el éxito de la compilación y un manifest de arranque son hechos distintos. La aceptación nombra el origen exacto y observa externamente el cambio solicitado allí.
- Un servicio de reemplazo no puede demostrar que una página existente cambió. Los procesos de larga duración usan ciclos de vida de tareas gestionadas cuando realmente se solicitan.
- Una prueba de regresión debe poder fallar por el mecanismo reportado. Un timeout de proceso no equivale a un fallo rápido, y la disponibilidad del puerto tras la salida no demuestra que el puerto nunca se vinculó.
