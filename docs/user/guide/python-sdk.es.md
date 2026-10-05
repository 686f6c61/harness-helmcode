# Primeros pasos con el SDK de Python

[English](python-sdk.md) | Español

Este tutorial instala el SDK de Python publicado, ejecuta el perfil mínimo independiente distribuido y muestra cómo personalizar el mismo perfil `dsh` desde tu propio programa.

## Prerrequisitos

- Python 3.10 o más reciente
- Git
- Linux x64, Linux arm64, macOS 14 o más reciente en arm64, o Windows x64
- Un endpoint de API compatible con DeepSeek y una credencial
- Un espacio de trabajo aislado y un home de Harness aislado

## Instalar el SDK

<div>
<a id="linux-and-macos"></a>
<a id="windows-powershell"></a>
</div>

::: code-group

```sh [Linux/macOS]
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
python -m venv .venv
. .venv/bin/activate
python -m pip install deepseek-harness-sdk
```

```powershell [Windows PowerShell]
git clone https://github.com/deepseek-ai/deepseek-harness.git
Set-Location deepseek-harness
py -3.10 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install deepseek-harness-sdk
```

:::

La instalación incluye un paquete wheel de runtime nativo correspondiente y el comando `dsh`. La ejecución normal del SDK no necesita Node.js del sistema. Los colaboradores del repositorio que compilan los artefactos deben usar el [flujo de trabajo de colaborador de Python](../../../python/development.es.md).

## Ejecutar el ejemplo registrado en el repositorio

Exportar la credencial y, cuando haga falta, un endpoint de proxy compatible:

<div>
<a id="linux-and-macos-1"></a>
<a id="windows-powershell-1"></a>
</div>

::: code-group

```sh [Linux/macOS]
export DEEPSEEK_API_KEY=sk-your-key-here
# export DEEPSEEK_BASE_URL=http://127.0.0.1:8000/v1
```

```powershell [Windows PowerShell]
$env:DEEPSEEK_API_KEY = "sk-your-key-here"
# $env:DEEPSEEK_BASE_URL = "http://127.0.0.1:8000/v1"
```

:::

Ejecutar una tarea con rutas explícitas de espacio de trabajo y home:

<div>
<a id="linux-and-macos-2"></a>
<a id="windows-powershell-2"></a>
</div>

::: code-group

```sh [Linux/macOS]
python python/sdk/examples/minimal.py \
  --workspace /absolute/path/to/disposable-workspace \
  --dsh-home /absolute/path/to/example-dsh-home \
  --session-id example-001 \
  "Inspect the repository and fix the failing tests."
```

```powershell [Windows PowerShell]
python python/sdk/examples/minimal.py `
  --workspace C:\work\disposable-workspace `
  --dsh-home C:\work\example-dsh-home `
  --session-id example-001 `
  "Inspect the repository and fix the failing tests."
```

:::

El script imprime la respuesta final del asistente. El home seleccionado recibe el perfil `sdk-minimal` generado, los plugins instalados y los registros de sesión JSONL sin comprimir bajo `sessions/`. El ejemplo y el SDK nunca leen `~/.dsh` silenciosamente.

## Usar el SDK en tu programa

```python
from pathlib import Path

from deepseek_harness import DeepSeekHarness

workspace = Path("/absolute/path/to/disposable-workspace").resolve()
dsh_home = Path("/absolute/path/to/example-dsh-home").resolve()
with DeepSeekHarness(
    provider="deepseek-official",
    model="deepseek-v4-flash",
    max_tokens=49_152,
    cwd=str(workspace),
    dsh_home=str(dsh_home),
    profile="sdk-minimal",
) as harness:
    result = harness.run(
        "Inspect the repository and fix the failing tests.",
        session_id="example-001",
    )

print(result.final_response)
```

El SDK inicia el proceso incluido `dsh --profile sdk-minimal` de forma diferida y lo reutiliza hasta la salida del gestor de contexto. El perfil, su parche persistente, el parche de home y cualquier tupla `patches` ordenada forman la configuración de la aplicación. No hay un bin de runtime de Python separado ni una opción de configuración completa.

## Instalar o definir plugins

Usar `dsh plugin` para las dependencias y capas de bundle que deban persistir en este home:

<div>
<a id="linux-and-macos-3"></a>
<a id="windows-powershell-3"></a>
</div>

::: code-group

```sh [Linux/macOS]
export DSH_HOME=/absolute/path/to/example-dsh-home
dsh --profile sdk-minimal --dump-default-config >/dev/null
dsh plugin --profile sdk-minimal add file:/absolute/path/to/my-plugin-bundle
```

```powershell [Windows PowerShell]
$env:DSH_HOME = "C:\work\example-dsh-home"
dsh --profile sdk-minimal --dump-default-config | Out-Null
dsh plugin --profile sdk-minimal add file:C:/work/my-plugin-bundle
```

:::

El primer comando inicializa el perfil independiente distribuido. El segundo delega la gestión de paquetes a `pnpm` y después registra cualquier paquete instalado que exporte una capa `dsh.bundle`. Instalar `pnpm` solo para este comando de gestión; lanzar el SDK instalado no lo necesita. Editar `$DSH_HOME/profiles/sdk-minimal/cordis.patch.yml` para cambios persistentes de filas, o pasar archivos de parche desde Python para cambios por lanzamiento.

Otro `profile` es válido cuando incluye `@deepseek-ai/dsh-sdk-app` u otra fila de servidor JSON-RPC. Las filas de servidor ausentes, los plugins no resueltos y los parches inválidos fallan durante el arranque en lugar de recurrir a otra composición.

<a id="opt-in-to-str_replace_editor"></a>
### Activar `str_replace_editor`

El runtime incluido contiene `str_replace_editor`, pero `sdk-minimal` lo omite del árbol de Cordis por defecto. Para usarlo, guardar esta configuración como `editor.patch.yml`; `insert` añade tanto el editor como el proveedor de sistema de archivos que le falta al perfil mínimo:

```yaml
- insert:
    - id: fs-local
      name: '@deepseek-ai/dsh-fs-local'
      config:
        cwd: !!js process.cwd()
    - id: tool-str-replace-editor
      name: '@deepseek-ai/dsh-tool-str-replace-editor'
```

Pasar `patches=("/absolute/path/to/editor.patch.yml",)` al construir `DeepSeekHarness(profile="sdk-minimal", ...)`, o poner el parche en `$DSH_HOME/profiles/sdk-minimal/cordis.patch.yml` para una configuración persistente. En el siguiente lanzamiento del runtime, las solicitudes al modelo incluyen `str_replace_editor` junto al shell persistente. El proveedor local de sistema de archivos usa el directorio de trabajo del runtime para las rutas relativas; como el shell mínimo, no confina el acceso a ese directorio. Para el perfil `sdk` estándar, insertar solo la fila del editor para que use el proveedor de sistema de archivos y las políticas existentes.

## Entender el perfil mínimo

| Propiedad | Valor |
|---|---|
| Prompt del sistema | `DSH_SYSTEM_PROMPT`, con el valor de reserva `You are a helpful software engineer assistant.` |
| Modelo en `minimal.py` | `--model`, después `DSH_MODEL`, después `deepseek-v4-flash` |
| Tool visible para el modelo | `bash` persistente en Linux/macOS o `pwsh` en Windows |
| Tiempo de espera del shell | 300 segundos |
| Contexto de runtime y compactación | Ausentes |
| Persistencia de sesión | JSONL sin comprimir bajo `<dsh_home>/sessions` |

El único bundle del perfil inserta el árbol completo sobre una raíz vacía y no incluye `dsh-base`; por tanto, las tools que se añadan después al perfil base no pueden aparecer implícitamente. Contiene el protocolo SDK, la ruta de proveedor configurada por la persona usuaria, ejecución local y persistencia, mientras que las tools de sistema de archivos, la configuración, las credenciales gestionadas, las tools Web, los subagents, el descubrimiento de instrucciones locales y la compactación (compaction) están ausentes. Fija `danger-full-access`, así que el shell persistente elegido por la plataforma puede modificar cualquier ruta visible para el runtime; usar un checkout o contenedor desechable.

El paquete wheel instalado sigue empaquetando el perfil `web` completo y los activos del frontend. Ejecutar `dsh web` contra un `DSH_HOME` explícito cuando un despliegue del SDK de Python también necesite la aplicación de navegador; `web` es una aplicación de CLI separada y no puede servir a un cliente del SDK de Python.

Usar un home nuevo cuando los perfiles, plugins, credenciales, configuración y sesiones deban estar aislados. Usar un id de sesión nuevo para trabajo independiente; reutilizar un harness, un home y un id solo para continuar la misma conversación durable y los recursos propiedad de la sesión.

La [referencia del bundle](../../../packages/bundle/sdk-minimal/README.md) posee el árbol exacto, y la [referencia del ejemplo](../../../python/sdk/examples/README.es.md) posee el programa ejecutable. La [referencia del SDK de Python](../../../python/sdk/README.es.md) cubre ciclo de vida, resultados, notificaciones y comportamiento de bajo nivel; la [referencia del CLI dsh](../../../apps/cli/reference/README.es.md) cubre el estratificado de perfiles.
