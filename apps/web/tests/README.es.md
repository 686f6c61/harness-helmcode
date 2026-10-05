# e2e de navegador de apps/web

[English](README.md) | Español

Estas pruebas arrancan la composición web real en proceso y la conducen con navegadores reales sobre HTTP real. Chromium ejecuta la lane completa; el [escenario del selector de modelo y razonamiento](declared-reasoning.e2e.ts) también se ejecuta en WebKit para cubrir el comportamiento nativo del foco del ratón. La [recuperación de reproducción de sesión](session-replay-reload.e2e.ts) también se ejecuta en WebKit, compartiendo la grabación `fresh-round-trip` y la salida esperada sin reescribirlas. Cubre la recarga con stream activo, la recarga con turno completado y la reapertura de una sesión. La mecánica de la lane (modos, fixtures, goldens y las divergencias deliberadas de la composición respecto a `dsh web`) está documentada en [`scaffold.ts`](scaffold.ts) y en el [Agent Note de la lane e2e de navegador](../../../.agents/notes/implemented/testing/2026-07-24-web-gui-browser-e2e-lane.md).

Tras instalar las dependencias del espacio de trabajo, instalar los navegadores y sus dependencias de sistema desde la raíz del repositorio:

```sh
pnpm --filter @deepseek-ai/dsh-web-frontend exec playwright install --with-deps chromium webkit
```

En Linux, `--with-deps` instala las dependencias a través del gestor de paquetes del sistema. La VM persistente de CI debe proporcionar estas dependencias mediante el mantenimiento de la imagen; CI instala solo los binarios de los navegadores, como exige el [runbook de conmutación por error](../../../.agents/notes/implemented/process/2026-07-26-ci-failover-runbook.md).

Los escenarios ordinarios comienzan sin espacio de trabajo ni sesión registrados y con un marcador durable que registra un espacio de trabajo por defecto eliminado, de modo que los escenarios explícitos de selección de carpeta conservan el control de su cwd. `launchWebScaffold({ firstUse: true })` deja la inicialización elegible para los escenarios de arranque.

## Observaciones de finalización

Los casos sensibles al estado usan barreras de espacio de trabajo, admisión, adjuntos y stream del modelo para separar los estados intermedios visibles de las operaciones completadas. Las aserciones de persistencia del selector de modelo esperan al valor por defecto guardado, con independencia del cierre del menú. El cierre de detalles espera a las transiciones de frame; la verificación de archivado asigna un título explícito a la sesión sembrada y sigue esa identidad a través de la recarga. Véase la [decisión de sincronización de fixtures de CI](../../../.agents/notes/implemented/testing/2026-09-08-ci-completion-observations.md).

El desplazamiento explícito usa `scrollIntoView` de `support.ts`: resuelve de nuevo el locator cuando su elemento antiguo se desconecta y comprueba la conexión en la misma tarea del navegador que el desplazamiento nativo. Los escenarios conservan sus aserciones de visibilidad y geometría tras el desplazamiento.

## Estas son pruebas de la cara Host

Se verifican tipos en el `tsconfig.host.json` raíz, no en el agregado Client, porque leen servicios Host directamente: `ctx.connection`, el `SessionStore` de Host y `ctx.sessionProjectionCache`. Conducir un navegador en runtime no convierte un archivo en parte del programa Client: las dos caras fusionan el `Context` de Cordis bajo las mismas claves con servicios distintos, de modo que un programa no puede ver ambas. Mover estos archivos al agregado Client hace que todo acceso a servicios Host falle al compilar.

## No importar `@deepseek-ai/dsh-client-*` aquí

Importar un paquete Client (un valor o un tipo) arrastra todo su proyecto TypeScript, y cada proyecto que referencia, al **grafo de compilación de Host**. Eso ya ha mordido a esta lane una vez: cuatro paquetes consumidores Client referencian la cara Client de `api/remotes`, que no puede compilar hasta que el tsdown de Host haya generado `@deepseek-ai/dsh-goal/remote`, de modo que la fase de compilación de Host acabó esperando un artefacto que produce ella misma.

Cuando un escenario necesita una constante o una función pura propiedad de Client, se refleja aquí en su lugar, junto al import comentado que nombra el módulo fuente. Una deriva entonces aflora como un selector perdido o un valor reflejado desactualizado: un fallo ruidoso, nunca un pase silencioso. `scaffold.ts` sigue esta regla para el namespace del aviso de bienvenida, el campo de acknowledgement, la versión y el texto chino asertado.

El harness de cliente compilado es la excepción. `assembled-boot.ts` importa `AppWebEntry`, el tipo del manifest de boot y `RemoteMock`; `assembled-remote.ts` importa las respuestas por defecto del runtime de pruebas de Client y `RemoteMock`. Estos paquetes son referencias de proyecto explícitas para arrancar el shell real contra un portador propiedad de las pruebas. Los escenarios de chat reflejan `conversationContextKey` en `support.ts` en lugar de importar a su dueño Client.

Nada hace cumplir esta regla mecánicamente; mantenerla en revisión.
