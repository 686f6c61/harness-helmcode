# `@deepseek-ai/dsh`

[English](README.md) | Español

El comando `dsh` es el único lanzador de aplicaciones Node soportado: los perfiles son pilas ordenadas de capas de parche de bundles de plugins situadas bajo las anulaciones propias del usuario. SDK y ACP (Agent Client Protocol) son perfiles, no bins públicos separados. El paquete wheel del runtime de Python empaqueta este mismo comando; el SDK usa por defecto `sdk`, y el ejemplo mínimo selecciona `sdk-minimal`. [`src/args.ts`](src/args.ts) posee la gramática de comandos, y [`src/bin.ts`](src/bin.ts) carga solo el runner seleccionado. Los comandos inválidos, las opciones pertenecientes a otro modo y los fallos fatales de configuración o de arranque salen con código distinto de cero.

## Modos de entrada

| Comando | Propósito |
|---|---|
| `dsh <name>` / `dsh --profile <name>` | Arranca el perfil indicado bajo `$DSH_HOME/profiles/<name>`. |
| `dsh --profile <name> --from-default-profile <template>` | Crea un perfil personalizado nuevo a partir de una plantilla distribuida y después lo arranca. |
| `dsh --profile acp` | Sirve clientes de automatización sobre stdio ACP hasta la desconexión. |
| `dsh --profile headless "job"` | Ejecuta una sesión persistida nueva, imprime la respuesta final y sale. |
| `dsh --profile sdk` | Sirve clientes SDK sobre stdio JSON-RPC hasta el apagado o la desconexión. |
| `dsh --profile sdk-minimal` | Sirve clientes SDK con el árbol de agent mínimo independiente. |
| `dsh web` | Arranca el perfil Web. |
| `dsh plugin --profile <name> <pnpm args>` | Gestiona los plugins de un perfil reenviando a pnpm en el directorio del perfil. |

El directorio desde el que se invoca es la raíz del espacio de trabajo por defecto. Los perfiles `web`, `headless`, `sdk`, `sdk-minimal` y `acp` se autoinicializan en el primer uso a partir de plantillas distribuidas. Crear otro perfil con un nombre libre y no distribuido mediante `--from-default-profile`, o inicializar un perfil respaldado por base a través de `dsh plugin`. El nombre `desktop` está reservado para el perfil que posee Electron, por lo que la CLI (interfaz de línea de comandos) rechaza las peticiones de arranque y de volcado de configuración para él. La CLI de npm también rechaza sus peticiones de gestión de plugins; el [comando instalado por Desktop](../desktop/README.es.md#bundled-command-runtime) puede gestionar el perfil de Desktop inicializado usando el runtime de esa instalación.

## Argumentos de la aplicación

El lanzador solo analiza sus propios flags y entrega todo lo que va después de ellos al perfil arrancado, donde cualquier plugin de aplicación inyectado puede analizar el snapshot inmutable compartido ([`dsh-cmdline`](../../packages/boot/cmdline/README.md)). El primer token que el lanzador no reconoce inicia los argumentos de la aplicación:

```sh
dsh --profile web --port 8080       # --port belongs to the web app
dsh --profile tui --resume <id>     # example, assuming the tui profile is installed; --resume belongs to the terminal app
dsh --profile headless "run the tests"
dsh --profile web --help            # the web app's flags, not the launcher's
dsh --help                          # the launcher's own help
```

<a id="profiles"></a>
## Perfiles

Un directorio de perfil contiene un `package.json` (dependencias de plugins fuera del árbol más el manifest de perfil `dsh.profile` con su lista ordenada `bundles`) y un `cordis.patch.yml` (la capa de parche propia del usuario). `dsh-hmr`, cuando está habilitado en YAML, vigila el manifest del perfil y los archivos de parche del perfil y del home, y después recompone todas las capas mediante una única recarga serializada. Sin HMR (reemplazo de módulos en caliente), los cambios se aplican al reiniciar. Las ediciones que llegan durante el registro del watcher usan el mismo reporte de recarga no fatal que las ediciones posteriores. El [gestor de plugins](../../packages/boot/plugin-manager/README.md) comparte las operaciones de paquetes y el bloqueo de escritura del perfil con `dsh plugin`; las actualizaciones de paquetes conservan las selecciones de bundles deshabilitados. Los comandos de paquetes de la CLI heredan las variables de autenticación y los descriptores de terminal, incluida la aprobación interactiva de compilación; las llamadas a servicios conservan su entorno depurado y los diagnósticos capturados.

La instalación y el arranque del perfil hacen cumplir los rangos DSH de dependencia de pares (peer dependency) declarados contra la misma versión de runtime que muestra `dsh --version`. Los plugins incompatibles requieren una exención de versión exacta explícitamente reconocida. La [referencia de compatibilidad del gestor de plugins](../../packages/boot/plugin-manager/README.md#version-compatibility-and-exemptions) documenta `version-exemptions`, `allow-version`, `revoke-version`, la persistencia y los riesgos.

El árbol se compone sobre una raíz vacía:
- el parche de cada bundle en el orden de `dsh.profile.bundles`
- después el `cordis.patch.yml` del perfil, luego el `$DSH_HOME/cordis.patch.yml` de nivel home
- después los overlays `--patch`

Los bundles nombrados en `dsh.profile.bundles` se resuelven primero desde la instalación de dsh (`@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@deepseek-ai/dsh-headless`, `@deepseek-ai/dsh-sdk-app`, `@deepseek-ai/dsh-sdk-minimal`, `@deepseek-ai/dsh-acp-app`) y después desde los `node_modules` propios del perfil, donde pnpm instala los plugins fuera del árbol.

Usar `--dump-default-config` y `--dump-config` para inspeccionar el árbol compuesto sin arrancarlo. `--dump-config-schema` importa los schemas de plugin declarados del árbol compuesto e imprime JSON Schema para las entradas y los parches en lugar de valores de configuración; leer la [seguridad y el alcance del volcado de schemas](reference/README.es.md#config-schema-dump) antes de inspeccionar plugins no confiables.

La [referencia de comportamiento de la CLI](reference/README.es.md) posee la precedencia exacta de capas, los flags, el comportamiento de apagado, los valores por defecto de despliegue y la ejecución desde fuente. La [tabla de fallos de arranque y recarga](../../packages/boot/app-boot/README.md#startup-and-reload-failures) compara los fallos de plugins opcionales y requeridos con el HMR de configuración.

## Overlays opcionales

`config/examples/` distribuye overlays opt-in para webhooks de revisión de GitHub, servidores MCP de memoria y tools de Cordis en runtime. Nunca forman parte de un perfil por defecto; las [guías de usuario](../../docs/user/guide/index.es.md) y las [guías de práctica para desarrolladores](../../docs/user/develop/practice/index.es.md) poseen las instrucciones de instalación y seguridad.

## Desarrollo

Las ejecuciones de producción requieren los artefactos compilados de paquetes y de frontend. Desde la raíz del repositorio, ejecutar `pnpm run build` por separado y después usar `pnpm dsh <args...>` para ejecutar la entrada TypeScript y reenviar cada argumento; la [referencia de ejecución desde fuente](reference/README.es.md#source-execution) posee el contrato de resolución de módulos.

La exportación `@deepseek-ai/dsh/profile-boot` proporciona el ciclo de vida de perfil compartido al host de Desktop. Un perfil de aplicación resuelto aporta su propia ancla de instalación para la resolución de paquetes en runtime, conservando el parche home de Harness, el entorno de proxy, el interruptor de telemetría, la recarga de parches y el apagado acotado.

Las instalaciones empaquetadas llaman a la misma entrada `runCli()` con su ejecutable de gestor de paquetes. El portador de Desktop también habilita las operaciones de plugins para su perfil inicializado; los lanzamientos de npm omiten estas opciones. Los entornos de paquetes propiedad de la instalación se aplican solo a las operaciones de paquetes de plugins; el directorio de invocación, la selección ordinaria de perfiles y el PATH del shell del agent conservan sus significados de la CLI.

La [matriz de fallos de Web](tests/profiles/web/tests/web-failure-matrix.expected.e2e.ts) ejecuta la CLI compilada a través de fallos de arranque y del HMR nativo de configuración con `awaitWriteFinish` habilitado en `test:expected`. Verifica respuestas HTTP autenticadas, diagnósticos, recuperación, salidas de proceso y dispose (liberación de recursos) sin llamadas a la API de modelos; la [aceptación de arranque](tests/profiles/web/tests/web-best-effort-startup.expected.e2e.ts) también cubre las dependencias Web requeridas distribuidas y los conflictos de puertos.
