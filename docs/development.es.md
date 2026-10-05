# Guía de desarrollo

[English](development.md) | Español

El tutorial de instalación lleva a un contribuidor nuevo desde los prerrequisitos hasta un checkout verificado. La referencia del contribuidor que sigue cubre la disposición del repositorio, el flujo de trabajo diario y la organización de CI. La justificación de diseño y los detalles de implementación pertenecen a los Agent Notes y scripts enlazados.

<a id="setup-tutorial"></a>

## Tutorial de instalación

### Prerrequisitos

- Node.js soporta 22.19+ y 24+. CI cubre 22.19, 24 y 26; véase el [Agent Note del piso de versión de Node](../.agents/notes/implemented/process/2026-07-06-node-engine-floor.md).
- pnpm con Corepack habilitado. El repositorio fija `pnpm@11.7.0` en `package.json`; ejecutar `corepack enable` si `pnpm --version` no se resuelve a través de Corepack.
- Git 2.26 o más reciente; la configuración de hooks habilita la extensión de configuración específica por worktree de Git.
- Opcional: una clave de API de DeepSeek para las demos de automatización Web, headless y ACP, y para las pruebas e2e con API real.

### Windows y WSL 2

En Windows se puede desarrollar con herramientas nativas o usar WSL 2 para tener un entorno Linux. WSL 2 es útil para verificar el comportamiento en Linux y para usar toolchains de Linux cuando la compilación de dependencias nativas o los permisos del sistema de archivos obstruyen el desarrollo en Windows. Cada entorno necesita su propio runtime, herramientas de compilación y permisos; WSL es opcional.

Mantener el checkout, las dependencias instaladas y el toolchain en el mismo entorno de sistema operativo. Para WSL 2, guardar el checkout en el sistema de archivos de Linux; para herramientas nativas de Windows, usar el sistema de archivos de Windows. Acceder a archivos entre los dos sistemas de archivos añade sobrecarga a las operaciones intensivas de E/S como Git, la instalación de dependencias y las compilaciones. Véase la [guía de almacenamiento de archivos y rendimiento](https://learn.microsoft.com/en-us/windows/wsl/filesystems#file-storage-and-performance-across-file-systems) de Microsoft.

Instalar las dependencias por separado en cada entorno, porque los binarios nativos y los enlaces pueden diferir entre sistemas operativos. Los resultados de las pruebas se aplican al entorno donde se ejecutaron; el comportamiento específico de Windows sigue necesitando validación nativa en Windows.

### Primera instalación

Instalar las dependencias desde la raíz del repositorio:

```sh
pnpm install
```

La instalación también configura los hooks de Lefthook locales al worktree mediante `scripts/install-lefthook.mjs`. El [Agent Note de hooks locales al worktree](../.agents/notes/implemented/process/2026-07-27-worktree-local-lefthook.md) posee el contrato de seguridad de la ruta de hooks.

Si los hooks faltan porque las dependencias se restauraron desde caché o se omitió `postinstall`, instalarlos manualmente:

```sh
node scripts/install-lefthook.mjs
```

Si el script envoltorio rechaza la configuración de Git existente o informa de un bloqueo desactualizado, seguir su diagnóstico y el Agent Note enlazado en lugar de editar especulativamente los metadatos del worktree. Después de mover un checkout, volver a ejecutar el script envoltorio para regenerar la ruta que posee.

Ejecutar la verificación de tipos una vez después de un clon nuevo:

```sh
pnpm run typecheck
```

La instalación está completa cuando `pnpm run typecheck` termina con éxito.

## Referencia del contribuidor

<a id="typescript-project-layout"></a>

### Disposición de los proyectos TypeScript

El repositorio usa agregados de Host y de Client aislados. Un paquete ordinario se registra en exactamente un agregado: los paquetes de Host en `tsconfig.host.json` y los paquetes de Client en `tsconfig.client.json`; tres paquetes (`host/webserver`, `compaction/compaction`, `typert/registry`) son referenciados por ambos agregados como hojas compartidas para que cada lado verifique los tipos del mismo código fuente.

| Archivo | Rol | ¿Forma un programa? |
|---|---|---|
| `tsconfig.json` | Raíz de solución: `extends` de la base, `files: []` y referencias a los dos agregados. Es la entrada de descubrimiento de tsserver y la entrada para ejecutar explícitamente el grafo completo de Project References; mediante los `paths` heredados, también es la configuración de resolución para tsx al ejecutar `scripts/`. | No |
| `tsconfig.host.json` | Agregado del Host: paquetes de Host, ejemplos, pruebas, scripts, sitio web y el proyecto de Host excepcional de `api/remotes`. | Sí |
| `tsconfig.client.json` | Agregado del Client: paquetes `packages/client/*` y sus pruebas, `apps/web` y el proyecto de Client excepcional de `api/remotes`. | Sí |
| `tsconfig.base.json` | compilerOptions compartidos y el mapa `paths` de fuentes. También es la fachada de resolución a la que las configuraciones de vitest apuntan con vite-tsconfig-paths: no tiene `include`, así que sus `paths` se aplican a todo importador. | No |
| `tsconfig.base.client.json` | Configuración de compilación de navegador (`jsx`, bibliotecas DOM, `types: []`) extendida por el agregado del Client y por cada paquete `packages/client/*`. | No |

Host y Client siguen siendo dos programas agregados porque ambos lados fusionan por declaración la interfaz `Context` de cordis bajo las mismas claves con servicios distintos; un solo programa que vea ambas fusiones informa de una colisión. La colisión existe solo dentro de un `ts.Program` (la resolución de módulos nunca la dispara), por eso la solución puede referenciar ambos agregados y una sola fachada de paths puede abarcar ambos lados. De ahí se derivan tres disciplinas:

- `tsconfig.base.json` nunca gana `include` ni `files`: se filtrarían a cada proyecto de paquete que lo extiende y estrecharían el ámbito de coincidencia total de la fachada.
- Un script que construye un `ts.Program` de todo el repositorio siembra `tsconfig.host.json` o `tsconfig.client.json` explícitamente, nunca la solución raíz, porque aplanar ambos agregados en un solo programa hace colisionar las fusiones de `Context`.
- Un paquete nuevo se registra en exactamente un agregado; solo los paquetes divididos anteriores llevan ambas configuraciones hoja, y las hojas compartidas se registran en ambos agregados porque cada lado debe verificar los tipos del mismo código fuente. Tener tanto una entrada de loader de Node como una entrada de navegador no es razón para dividir un paquete; un plugin de Client ordinario produce ambos artefactos de runtime durante la fase de compilación del Client.

Seis paquetes dividen los tsconfigs de Host y Client: `api/remotes`, `api/gateway`, `api/session-controller`, `api/workspace-controller`, `client/connection` y `session-query/session-log-export`. La entrada de Host de `api/remotes` participa en el grafo Typert del Host mientras que su entrada de Client importa las declaraciones `/remote` generadas; `session-log-export` mantiene la producción de archivos de Node fuera de su controlador de navegador. Por tanto, cada `tsconfig.json` de raíz de paquete dividido es solo una solución, y los dos agregados y los consumidores directos referencian `tsconfig.host.json` o `tsconfig.client.json` respectivamente. La puerta `constraints` del espacio de trabajo recorre el grafo alcanzable de Project References y comprueba la cara de compilación propia de cada proyecto referenciante: un objetivo de configuración única sigue siendo válido desde cualquiera de las caras, mientras que un objetivo dividido debe nombrar la hoja correspondiente en lugar de su raíz de solución o la hoja opuesta; descubre los paquetes divididos por la presencia de ambas configuraciones hoja, de modo que una división nueva se incorpora a la puerta automáticamente. El [README de `api-remotes`](../packages/api/remotes/README.md) y el [README de `session-log-export`](../packages/session-query/session-log-export/README.md) explican sus divisiones.

La compilación raíz sigue el orden de dependencias generado:

```sh
tsc -b tsconfig.host.json
tsdown --env.DSH_BUILD_FACE host
pnpm --filter @deepseek-ai/dsh-desktop run bundle
tsc -b tsconfig.client.json
tsdown --env.DSH_BUILD_FACE client
pnpm run build:web
```

Ambas pasadas de tsdown coinciden con `vendor/*`, `packages/*/*` y `apps/cli`; la pasada del Host también coincide con `apps/desktop-host`. Ni examinan artefactos de compilación para descubrir paquetes de Client ni mantienen una lista de filtro de paquetes Host/Client. Las configuraciones de tsdown locales de paquete seleccionan entradas para la fase actual mediante `DSH_BUILD_FACE`: un plugin de Client ordinario produce tanto su loader de Node como su paquete de navegador durante la fase del Client; `api-remotes` usa `hostPhase: true` para producir su entrada de Host por adelantado y solo su paquete de navegador durante la fase del Client. Tsdown consume únicamente el JavaScript emitido a `lib/types` por la fase tsc precedente. Tsdown compila los miembros del espacio de trabajo coincidentes concurrentemente, de modo que `apps/desktop`, cuyo paquete principal incrusta las devDependencies del espacio de trabajo desde su salida `lib/`, se empaqueta en su propio paso después de la pasada del Host ([README de Desktop](../apps/desktop/README.es.md#bundled-workspace-dependencies)).

Typert se ejecuta solo durante el tsdown del Host, sembrado por `tsconfig.host.json`. Analiza los tipos del Host y genera tanto los artefactos de reflexión del Host como la proyección Remote de Host-para-Client; el tsdown del Client no inicia Typert. En consecuencia, `pnpm run typecheck` ejecuta la fase lib completa del Host antes del tsc del Client, mientras que `pnpm run build` continúa a través del tsdown del Client y la compilación Web.

`pnpm run build` incrusta la versión del paquete raíz, el commit fuente de siete caracteres y un marcador de suciedad cuando Git informa de cambios locales; también hereda otros valores `DSH_CLIENT_*` suministrados por el llamante. `pnpm run build:official` es el equivalente local multiplataforma de la compilación de artefactos de CI y release, y omite el marcador de suciedad local. Cada compilación completa exitosa escribe un registro ignorado por git que vincula los valores públicos exactos a la salida de Vite y a los paquetes dinámicos del cliente; el empaquetado de release y las pruebas Web compiladas rechazan un registro ausente o artefactos modificados por una compilación parcial posterior. `pnpm run dev:web` ejecuta primero esa compilación completa (`--skip-build` reutiliza en su lugar un árbol de artefactos existente), después muestrea la versión actual y el estado de Git una vez y comparte ese entorno entre todas las etapas de watchers de la sesión; no valida el registro de compilación completa porque las etapas de watchers reescriben sus artefactos registrados.

El análisis estático y las pruebas resuelven las importaciones del espacio de trabajo a través del mapa `paths` de la base hacia `src` y deben pasar sobre un árbol limpio; las puertas que consumen la salida `lib/` compilada declaran esa dependencia explícitamente. Las declaraciones Remote de Host-para-Client generadas son la excepción deliberada: los comandos públicos `typecheck`, `lint` y `doc-typecheck` las generan primero, mientras que los scripts internos `*:contracts-ready` presuponen que un comando público invocante o una puerta del planificador ya depende de la pasada de generación de contratos de Typert o de la compilación completa. Véase la [nota ts-build-config](../.agents/notes/implemented/process/2026-06-17-ts-build-config.md) para la propiedad de la emisión tsc-first y la [nota de Typert Remote](../.agents/notes/implemented/architecture/2026-08-02-typert-remote-method-calls.md) para el contrato de preparación de puertas.

Los servicios de negocio declaran métodos llamables en el Host con `@Remote` o `@RemoteScope`; la compilación del Host genera los tipos de Host-para-Client y las contribuciones de runtime, y la composición `api-remotes` del Client carga esas contribuciones bajo los espacios de nombres `ctx.remote` y `agentCtx.remote` con ámbito. Véase [API Gateway](api-gateway.es.md) para los artefactos generados en ambos lados, sus relaciones de ensamblado, el fallback de desarrollo SRC y el orden de compilación Web.

Si una comprobación local relevante consume la salida compilada de paquetes, compilar primero una vez:

```sh
pnpm run build
```

`pnpm run hygiene` incluye `publint`, que valida los puntos de entrada de los paquetes contra los archivos `lib/*.js` compilados, y `verify-node-next-types`, que valida las declaraciones compiladas contra un consumidor NodeNext temporal. Un worktree nuevo no tiene JS empaquetado ni declaraciones hasta que se ejecuta `pnpm run build`; los commits y pushes ordinarios no requieren esa compilación salvo que las comprobaciones seleccionadas la consuman.

### Variables de entorno

El adaptador real de DeepSeek y las demos de agents respaldadas por clave leen las credenciales del entorno o de un `.env` ignorado por git en la raíz del repositorio:

```sh
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://... # optional
```

`DEEPSEEK_BASE_URL` es opcional y usa por defecto la API pública. Nunca hacer commit de credenciales reales. Las suites e2e de API real se auto-omiten cuando `DEEPSEEK_API_KEY` no está definida.

### Integraciones de Git

Los registros `.i18n.yaml` usan el merge de texto por defecto de Git. Un registro entra en conflicto solo cuando ambas ramas cambiaron contenido específico de idioma en la misma sección de encabezado; resolver el Markdown y después volver a ejecutar `pnpm run verify-translation-pairing --write <pair>`. Si `pre-merge-commit` rechaza un merge por lo demás limpio, Git deja el resultado completo preparado sin commit; reparar el fallo y ejecutar `git commit`, o ejecutar `git merge --abort`.

lefthook se configura en `lefthook.yml` como un punto de control local rápido:

- `pre-commit` verifica los registros de emparejamiento preparados contra los blobs propietarios preparados, valida los archivos preparados con el perfil `.oxlintrc.staged.json` sin proyecto y aplica las correcciones de Oxlint con un reintento acotado, regenera `THIRD_PARTY_NOTICES.md` cuando un archivo preparado es una de sus entradas, comprueba el diff preparado en busca de errores de espacios en blanco y ejecuta la guarda del manifest de vendor.
- `pre-merge-commit` realiza la misma comprobación de emparejamiento respaldada por el índice antes de que Git cree un commit de merge automático.
- `pre-push` ejecuta `pnpm run typecheck`, que completa la fase lib del Host, incluidos los contratos de Typert generados, antes de la comprobación de TypeScript del Client.

La guarda del manifest de vendor comprueba que los cambios bajo `vendor/*/src` se preparen junto con la actualización correspondiente del manifest `vendor/README.md`. Ver `vendor/README.md` antes de editar código vendorizado.

Aparte de la verificación acotada de registros preparados, los hooks intencionadamente no ejecutan pruebas, snapshots, comprobaciones de documentación, compilaciones ni hygiene. Los contribuidores ejecutan una vez las [comprobaciones relevantes para el comportamiento cambiado](../AGENTS.md#run-relevant-checks-locally); CI posee la cobertura exhaustiva, las pruebas de humo de artefactos compilados y la matriz de compatibilidad de Node 22.19, 24 y 26.

Los contribuidores pueden optar por el conjunto completo de puertas locales con `pnpm run check:all`. El comando es independiente de los hooks de Git y no es una instrucción para agents.

### Puertas de CI

El [flujo de trabajo de CI](../.github/workflows/ci.yml) sin credenciales agrupa las puertas independientes en carriles amplios y ejecuta una señal de compatibilidad más pequeña entre las versiones de Node soportadas. Los consumidores de artefactos esperan una compilación dentro de su carril. Los benchmarks obligatorios se ejecutan por separado en Linux estándar hospedado por GitHub; la [decisión sobre el ejecutor de benchmarks](../.agents/notes/implemented/testing/2026-09-06-standard-hosted-benchmark-runner.md) posee el enrutamiento y el tiempo límite del trabajo. El flujo de trabajo separado de API real ejecuta `pnpm run test:e2e` con su worker configurado. Véase [scripts/run-gates.ts](../scripts/run-gates.ts) y los archivos de flujo de trabajo para el inventario actual de puertas y trabajos.

Los ensayos sin credenciales de disposición de dependencias de dsh y de empaquetado de dsh/vendor usan el pool existente de Linux auto-hospedado solo cuando `DSH_CI_FAILOVER_LINUX=selfhosted` y el evento es un push confiable a master o un pull request del mismo repositorio, sin fork y sin Dependabot. Todos los demás casos, incluido el despacho manual, usan `ubuntu-24.04`; la publicación manual sigue siendo hospedada. Véase la [decisión sobre el ejecutor de ensayos de release](../.agents/notes/implemented/process/2026-09-06-release-rehearsal-selfhosted.md) para el aislamiento del almacén persistente y los límites del fallback.

### Comandos diarios

Las [instrucciones del contribuidor](../AGENTS.md#commands) raíz resumen los comandos comunes, mientras que [`package.json`](../package.json) y [scripts/run-gates.ts](../scripts/run-gates.ts) poseen los inventarios actuales de scripts y puertas. Seleccionar las comprobaciones más pequeñas que cubran la superficie cambiada. Los cambios de documentación usan `pnpm run doc-sync`; los cambios de comportamiento público de un paquete también actualizan el README o el JSDoc que los posee, y las comprobaciones de artefactos compilados requieren primero `pnpm run build`.

### Ejecuciones de perfiles

Ejecutar la compilación del repositorio por separado antes de usar estas demos del checkout fuente:

```sh
pnpm run build
```

El coding agent headless de una sola pasada necesita `DEEPSEEK_API_KEY` en el entorno o en el `.env` de la raíz del repositorio:

```sh
pnpm dsh --profile headless "summarize this workspace"
```

La demo del modo PTC ejecuta el mismo perfil headless con la presentación de código habilitada:

```sh
pnpm run demo:ptc -- "summarize this workspace"
```

### Comandos de aplicación

Web y Desktop comparten un mismo par de comandos. `start:*` lanza los artefactos de un `pnpm run build` previo; `dev:*` ejecuta esa compilación primero y después lanza. Web además mantiene los paquetes del cliente recompilados ante las ediciones del código fuente, porque su Host se ejecuta desde el código fuente mientras el navegador carga paquetes compilados:

```sh
pnpm run start:web       # serve built Web artifacts through the source launcher (the same launch as pnpm dsh web)
pnpm run dev:web         # build, serve, and rebuild Web client bundles on source edits
pnpm run start:desktop   # launch built Desktop artifacts
pnpm run dev:desktop     # build, then launch Desktop
```

Los argumentos tras un comando de Web llegan a `dsh web`, por ejemplo `pnpm run dev:web --no-open --port 3081`; `dev:web` también acepta `--skip-build` para reutilizar el árbol de artefactos existente y `--no-serve` para ejecutar solo los watchers de recompilación junto a un servidor arrancado en otro lugar. Ambos comandos de Web usan el home normal de Harness, mientras que los comandos de Desktop usan el home de desarrollo aislado descrito en el [README de Desktop](../apps/desktop/README.es.md). El `Makefile` raíz nombra los mismos comandos como `make web`, `make dev-web`, `make desktop`, `make dev-desktop` y `make build`; `ARGS='--no-open'` reenvía opciones.

### Marcadores TODO

Usar una de tres etiquetas de comentario para señalar problemas conocidos en el código, ordenadas por urgencia:

- `FIXME`: un problema que debería bloquear una release nueva. Una release no debería publicarse con un `FIXME` abierto salvo que los revisores acuerden explícitamente que el cambio puede fusionarse de todos modos.
- `TODO`: un problema que debería corregirse pronto, cuando haya recursos.
- `XXX`: un problema que quizá se corrija algún día; prioridad mínima, sin compromiso.

Elegir la etiqueta que corresponda a la urgencia para que cualquiera que examine el código pueda distinguir un bloqueante de release de un quizá-algún-día.

<a id="documenting-types-verbatim-ts-type-equiv"></a>

### Documentar tipos verbatim (`ts type-equiv`)

Las páginas de [subsistemas](subsystems/README.es.md) pegan declaraciones equivalentes al código fuente junto con su JSDoc original para que el lector vea la definición de tipo exacta y el contrato del código fuente. Para evitar que un pegado se desvíe cuando el código fuente cambia, delimitarlo como ` ```ts type-equiv ` (en lugar de ` ```ts `) y registrarlo en `scripts/type-equiv.manifest.json` con el archivo fuente y el símbolo que refleja:

```json
{ "doc": "docs/subsystems/session.md", "symbol": "SessionEvent", "source": "packages/core/session/src/types.ts" }
```

`pnpm run verify-type-equiv` (parte de `doc-sync`) extrae entonces la declaración de ese símbolo y su JSDoc adjunto desde el código fuente mediante el parser de TypeScript y afirma que el bloque coincide con ambos. Para una clase cuyos cuerpos de implementación no pertenecen al catálogo, usar ` ```ts public-api ` y establecer `"projection": "public-api"`; la proyección comprobada retiene los campos públicos, el constructor, los accesores, los métodos y el JSDoc original de clase y miembros, omitiendo cuerpos y miembros privados o protegidos. La comparación ignora los espacios en blanco y los comentarios que no son JSDoc, pero exige cada comentario JSDoc original, incluida la documentación de miembros, para que los lectores vean el contrato del código fuente junto a la definición de tipo exacta. La puerta impone una correspondencia 1:1 por documento, símbolo y proyección entre los bloques primarios y las entradas del manifest; un bloque del `.es.md` emparejado reutiliza la entrada de su hermano sin sufijo solo cuando toda la secuencia de cercas rastreada es byte a byte idéntica y está ordenada idénticamente. `doc-typecheck` aplica la misma regla derivada a las cercas compilables, omitiendo ambos tipos de cercas de equivalencia de fuente de la compilación y de su proporción de exclusión voluntaria. Al cambiar una declaración documentada o su JSDoc, la puerta falla hasta actualizar el pegado; al añadir o eliminar un bloque primario, actualizar el manifest en el mismo cambio.
