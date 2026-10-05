# deepseek-harness-runtime-bin

[English](README.md) | Español

Wheel del runtime de plataforma para el SDK de Python de DeepSeek Harness. Empaqueta la CLI `dsh` normal y su árbol cerrado de dependencias de Node en un ejecutable nativo, de modo que usar el SDK no requiere Node.js del sistema. Este paquete solo publica wheels.

## Comandos y artefactos instalados

El wheel instala un comando de consola `dsh` y el módulo de Python `deepseek_harness_runtime`. `dsh` reenvía sus argumentos al ejecutable empaquetado y requiere un `DSH_HOME` no vacío; nunca recurre a `~/.dsh`.

Los ejecutables de producción se llaman `deepseek-harness-sdk-runtime-<platform>-<arch>` bajo el directorio `runtime/` del módulo; Windows usa el sufijo `.exe`. Los wheels de Linux y macOS incluyen un sidecar `-rg` nativo del objetivo, Windows incluye `-rg.exe`, y macOS también incluye `-spawn-helper` para `node-pty`. Los objetivos publicados son Linux x64, Linux arm64, macOS arm64, macOS x64 y Windows x64. La etiqueta del wheel y su contenido deben coincidir exactamente; no se publica ningún wheel de Windows arm64.

Cada objetivo también requiere `<executable-stem>-office/`, donde el stem excluye `.exe`. Este directorio contiene los paquetes de Office instalados completos y sus dependencias, preservando los recursos del motor, los manifests, las licencias, los inventarios de fuentes y los permisos de los helpers. Copiar este directorio junto con el ejecutable. Un motor de objetivo ausente hace fallar la compilación de sidecars con el nombre de su paquete npm y la plataforma/arquitectura del objetivo.

Cada wheel incluye además `<platform>-<arch>/primary-runtime/` (CPython, bibliotecas de Python de Office bloqueadas, Node independiente y pnpm) y el directorio hermano `office-skills/` (tres flujos de trabajo predeterminados y su verificador compartido). Son archivos ordinarios reubicables, no bytes embebidos en el ejecutable. El constructor compartido selecciona archivos comprimidos nativos del objetivo para los cinco objetivos de wheel y ejecuta su prueba de humo en el host de compilación nativo. El empaquetado y la búsqueda del runtime instalado rechazan recursos ausentes, metadatos de plataforma incorrecta y permisos de ejecución perdidos de Python o Node. El directorio corto de plataforma evita repetir el nombre del ejecutable en las rutas de DLL de Python en Windows.

El bootstrap empaquetado suministra `DSH_BUNDLED_PRIMARY_RUNTIME` como valor predeterminado del carrier. El perfil `sdk` lo usa cuando `DSH_PRIMARY_RUNTIME` no está definido; una ruta explícita lo sobrescribe, y una cadena vacía deshabilita la consulta y el proveedor de Office. Los payloads externos conservan el layout de `primary-runtime/` más el hermano `office-skills/`. Los skills (habilidades) cargados exponen el Node empaquetado y la CLI de Office adyacente como rutas absolutas; los payloads personalizados de solo Python deben parchear `skill-office.config.cli: false` o suministrar `skill-office.config.node`. El SDK lee Python in situ sin copiarlo en `DSH_HOME`. Los carriers de Node de fuentes y de solo desarrollo no tienen valor predeterminado empaquetado; usan un `DSH_PRIMARY_RUNTIME` explícito.

La selección de skills es independiente de la entrega: los skills del proyecto, de directorios personalizados y del sistema de archivos del usuario sobrescriben los skills empaquetados del mismo nombre. Un parche del SDK puede deshabilitar solo el proveedor de Office conservando la consulta de Python:

```yaml
- id: skill-office
  disabled: true
```

Para reemplazar los tres flujos de trabajo de Office y el verificador compartido como conjunto, parchear `skill-office.config.assetRoot` con otro directorio de recursos absoluto. Usar el proveedor de skills del sistema de archivos para colecciones arbitrarias de skills. Los parches de configuración se aplican al arranque del proceso; cambiar los skills no requiere recompilar el wheel del runtime ni el entorno de Python.

Las compilaciones del repositorio también materializan un carrier `runtime/node/` de solo desarrollo. Ejecuta `node runtime/node/node_modules/@deepseek-ai/dsh/lib/bin.js` sobre Node 22.19 o superior del sistema. Nunca se selecciona automáticamente y está excluido de los wheels y sdists.

Ambos carriers ejecutan la misma gramática de `dsh` y los perfiles distribuidos, incluidos el árbol independiente `sdk-minimal` y el perfil completo `web` con sus assets de frontend. El manifest privado `dsh-python-runtime-closure` define la clausura de dependencias empaquetada; no hay una aplicación Node específica de Python ni un `cordis.yml` predeterminado registrado en el repositorio.

## API del módulo de Python

- `bundled_package_dir() -> Path` devuelve la raíz de datos del módulo instalado y verifica sus metadatos de release.
- `bundled_runtime_path() -> Path` devuelve el ejecutable de la plataforma actual y verifica los sidecars requeridos.
- `resolve_bundled_launch_args(mode=None) -> tuple[str, ...]` devuelve el argv del ejecutable por defecto. Un `mode="node"` explícito o `DSH_RUNTIME_MODE=node` selecciona el carrier de Node exclusivo del repositorio.
- `main()` implementa el comando de consola `dsh` instalado y rechaza un `DSH_HOME` ausente o en blanco. En Windows espera al proceso empaquetado con los flujos estándar heredados y reenvía su estado de salida; en POSIX reemplaza el proceso de Python.

Las plataformas no soportadas y los ejecutables o sidecars ausentes lanzan `FileNotFoundError` con las rutas de compilación e instalación. Los modos de runtime desconocidos lanzan `ValueError`.

## Resolución de perfiles empaquetados

`dsh` inicializa los perfiles distribuidos bajo el home explícito, compone sus parches de bundle y carga los plugins empaquetados desde el sistema de archivos virtual del ejecutable. La resolución en runtime usa una generación en memoria en lugar de symlinks en disco o paquetes proxy. Las importaciones de fallback usan las rutas registradas de los paquetes declarantes, incluidas las rutas dentro del sistema de archivos virtual del ejecutable, de modo que las filas integradas y los peers de plugins externos comparten la instancia empaquetada de Cordis/módulos. Las bibliotecas compartidas nativas y los addons de ConPTY de Windows se empaquetan con los addons nativos, mientras que ripgrep y el helper PTY de macOS permanecen como sidecars ejecutables.

El bootstrap de Python resuelve el kit de Office desde su directorio adyacente, de modo que los helpers nativos y los Workers de URL usan rutas reales del sistema de archivos. El kit es propietario de la selección y validación del motor; el bootstrap de Python no añade descarga ni compilación en runtime. La prueba de humo de Office también obtiene las rutas de la CLI del skill cargado y ejecuta las capacidades y la conversión de DOCX con un PATH vacío.

La gestión de perfiles externos usa `dsh plugin --profile <name> ...`. Ese comando requiere `pnpm` en el `PATH`; la ejecución ordinaria del SDK/perfil no.

## Compilación y distribución

El despliegue de producción permite parches del espacio de trabajo sin usar para paquetes fuera de la clausura del runtime; los parches de paquetes incluidos deben seguir aplicándose con éxito. Esta excepción se limita al comando de despliegue; la instalación del repositorio sigue rechazando los parches sin usar.

Desde la raíz del repositorio, `pnpm exec tsx scripts/build-exe-for-python-sdk.ts` verifica la clausura, compila los paquetes, despliega un árbol sin symlinks, empaqueta el objetivo seleccionado y sincroniza el ejecutable y los sidecars en este módulo. `scripts/build-python-release.py` prepara wheels con forma de release a la versión del repositorio raíz y fija `deepseek-harness-sdk` a la versión exacta del runtime.

La prueba de humo del wheel instalado crea un entorno virtual limpio fuera del checkout, demuestra las identidades de la distribución y el ejecutable instalados, y después ejercita los perfiles del SDK predeterminados y personalizados, plugins externos, MCP, tools nativas, JSON-RPC directo, snapshots confirmados y el proveedor real en las ejecuciones confiables. Su escenario de Office reubica el payload completo del objetivo y convierte DOCX con el motor de plataforma requerido: el motor nativo declarado del objetivo, o WASM cuando no se declara ningún motor nativo. Véase el [flujo de trabajo del contribuidor de Python](../development.es.md) y la [decisión de pruebas del wheel instalado](../../.agents/notes/implemented/testing/2026-08-23-installed-python-wheel-black-box-ci.md).
