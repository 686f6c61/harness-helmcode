# Flujos de trabajo del contribuidor de Python

[English](development.md) | Español

Elegir el flujo de trabajo según el resultado de contribuidor necesario: compilar los artefactos del runtime, validar el SDK, ejecutar contra las fuentes o compilar las distribuciones. El comportamiento de los paquetes pertenece a la [referencia del SDK](sdk/README.es.md) y a la [referencia del carrier del runtime](sdk-runtime/README.es.md).

## Compilar los artefactos del runtime

Los ejecutables de plataforma son artefactos de compilación y no se registran en git. Ejecutar la compilación desde la raíz del repositorio:

```sh
pnpm install
pnpm exec tsx scripts/build-exe-for-python-sdk.ts
```

Usar `--skip-build` cuando los artefactos `lib/` requeridos ya existen, o `--targets=node24-linux-x64,node24-linux-arm64,node24-macos-arm64,node24-macos-x64,node24-win-x64` para seleccionar plataformas. Compilar cada objetivo en su arquitectura nativa. Los productos quedan en `dist-exe/` y el script sincroniza los carriers seleccionados en `python/sdk-runtime/`. Windows emite `.exe` y `-rg.exe`; macOS también sincroniza el helper de spawn correspondiente que requiere `node-pty`.

## Validar el SDK

Mantener el entorno virtual fuera de `python/`, instalar el grupo de pruebas y ejecutar la suite de Python:

```sh
export UV_PROJECT_ENVIRONMENT="$PWD/tmp/py-sdk-venv"
uv sync --project python/sdk --group test
uv run --project python/sdk pytest
```

`python/sdk/tests/test_bundled_runtime.py` ejercita los carriers empaquetados disponibles y omite un carrier cuando su artefacto no se ha compilado. Para la política de pruebas de todo el repositorio, véase [Pruebas](../docs/testing.es.md).

Esa suite maneja peers falsos del runtime. `scripts/smoke-python-runtime.py`, en cambio, maneja el runtime empaquetado. Los trabajos `python-runtime` de CI compilan Linux x64 y Windows x64 en los pull requests, y Linux arm64 más ambas arquitecturas de macOS en los pushes a master. Cada objetivo seleccionado instala los wheels del SDK y del runtime correspondientes en un nuevo entorno virtual de Python 3.10, se ejecuta fuera del checkout con `PYTHONPATH` y `DSH_RUNTIME_MODE` sin definir, demuestra que ambos módulos y el ejecutable provienen de esas distribuciones, y después ejecuta todos los escenarios sin clave. Una ejecución local enfocada del SDK desde fuentes puede seleccionar un ejecutable compilado y un escenario:

```sh
uv run --project python/sdk python scripts/smoke-python-runtime.py \
  --scenario sdk-minimal --exe dist-exe/deepseek-harness-sdk-runtime-macos-arm64
```

Los escenarios del SDK comparan la salida esperada confirmada bajo `scripts/snapshots/python-sdk-single-exe/`. `minimal/model-visible.json` fija los prompts del sistema ensamblados del perfil `sdk-minimal` de Linux/macOS, los schemas de tools anunciados y los mensajes visibles para el modelo; `minimal/win-x64/model-visible.json` fija su contraparte de PowerShell. Por tanto, un plugin que aporta una sección del sistema o un mensaje de usuario no previstos hace fallar el trabajo, y se compara cada mensaje que emite el perfil. `advanced/` fija el resultado del SDK de un proceso complejo y los registros de sesión padre e hijo en todos los objetivos. `restart/` lanza dos procesos completos del runtime del SDK contra una raíz de persistencia y toma snapshots de sus historiales de modelo aislados, resultados de alto nivel y registros duraderos separados en todos los objetivos. `sdk-minimal-in-history` reutiliza el escenario de shell persistente y editor con una sección que cambia tras la primera llamada de shell exitosa. `minimal-in-history/prompt-history.json` fija ambas versiones del prompt, el prompt inicial sin cambios en las solicitudes posteriores, los eventos de mensaje del sistema del SDK anexados y `request/context.systemPromptUpdate`; los schemas de tools permanecen fijos y el archivo del editor se comprueba de forma independiente. `sdk-dynamic-tools` fija las adiciones y eliminaciones de tools nativas en `dynamic-tools/tool-history.json`, incluidas las referencias históricas de encabezados y la concordancia entre los resultados del SDK de Python, las notificaciones y los eventos persistidos. Volver a ejecutar el escenario propietario con `--update-snapshots` y revisar ese diff antes de confirmarlo.

`scheduler-recovery/` registra un turno con una tool fallida y un turno completado posterior. Conserva el error de turno `UNKNOWN` original, el resultado completado de la primera tool y los resultados `TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED` de las llamadas restantes. `sdk-snapshot` y `all` incluyen este caso; `--scenario sdk-recovery` lo ejecuta solo.

Las comparaciones de `advanced` y `restart` cotejan los calificadores de entrega nativos con la generación de Session propia de cada entrada, incluidos los eventos y notificaciones del SDK. Las generaciones capturadas y otras generaciones de entrega conservan sus valores numéricos. Cada lado debe usar una sola generación en todos sus roles de Session, y los registros nuevos deben identificar al escritor actual. La comparación nunca reescribe las grabaciones confirmadas.

Los pull requests confiables y los pushes a master también ejecutan `--scenario sdk-live --installed-wheel` en cada objetivo nativo seleccionado. Ese escenario realiza dos turnos con uso de tools contra `https://api.deepseek.com`: comprueba el archivo creado de inmediato, reemplaza su contenido con un reto aleatorio solo del host, y exige que el segundo turno copie el contenido modificado en un recibo nuevo sin modificar la fuente. Ambos turnos deben completarse con la respuesta centinela exacta y una llamada a tool solicitada por el modelo; comparaciones externas de bytes comprueban los archivos. La ausencia de secretos del repositorio produce un fallo en lugar de omitirse. Los pull requests de forks y de Dependabot ejecutan la ruta completa del wheel instalado sin clave, pero no reciben ninguna clave.

Una prueba de humo interactiva necesita `DEEPSEEK_API_KEY` en el entorno o en el `.env` de la raíz del repositorio:

```python
from deepseek_harness import DeepSeekHarness

with DeepSeekHarness(dsh_home="/absolute/path/to/test-dsh-home") as harness:
    print(harness.run("say hi").final_response)
```

Alternativamente, exportar un `DSH_HOME` no vacío. El SDK rechaza un lanzamiento que usaría `~/.dsh` de forma silenciosa.

## Ejecutar contra las fuentes de Node

Los contribuidores del repositorio pueden elegir cualquiera de las dos rutas de desarrollo; ambas ejecutan el lanzador normal `dsh --profile sdk`:

- Definir `DSH_RUNTIME_MODE=node` para usar el carrier de Node compilado sobre el Node `>=22.19` del sistema. El script de compilación actualiza este carrier, pero las distribuciones nunca lo incluyen ni lo seleccionan automáticamente.
- Definir `dsh_bin` con la ruta absoluta del `apps/cli/lib/bin.js` compilado para ejercitar directamente la CLI del checkout. Suministrar un `dsh_home` explícito, además de `profile` y `patches` ordenados según se necesite.

`python/sdk/tests/manual_sdk_agent_smoke.py` usa el adaptador de pruebas interno `_launch_args` para ejercitar la CLI de TypeScript sin compilar bajo tsx. La sustitución arbitraria de argv está ausente intencionadamente del SDK público.

## Compilar las distribuciones

La versión del `package.json` raíz es la autoridad para ambas distribuciones de Python. El script de staging inyecta esa versión en ambos wheels y fija el SDK a la misma versión de `deepseek-harness-runtime-bin`.

Compilar el wheel puro del SDK una vez y un wheel del runtime en cada plataforma nativa:

```sh
version="$(python - <<'PY'
import runpy

release = runpy.run_path("scripts/build-python-release.py")
print(release["pep440_version"](release["repository_version"]()))
PY
)"
python scripts/build-python-release.py --package sdk --output-dir dist-python
python scripts/build-python-release.py --package runtime --platform macos-arm64 --runtime-exe dist-exe/deepseek-harness-sdk-runtime-macos-arm64 --output-dir dist-python
pip install \
  "dist-python/deepseek_harness_sdk-$version-py3-none-any.whl" \
  "dist-python/deepseek_harness_runtime_bin-$version-py3-none-macosx_14_0_arm64.whl"
```

La distribución del runtime es solo wheel. El pipeline de publicación publica cinco wheels de plataforma junto con el wheel puro del SDK: Linux x64, Linux arm64, macOS 14 o superior en arm64 y x64, y Windows x64 (`win_amd64`). Un tag `python-v<repository-version>` solo se acepta cuando coincide con la versión del repositorio; las versiones de prerelease del repositorio, como `0.0.1-rc.1`, usan su escritura PEP 440 normalizada, como `0.0.1rc1`, dentro de los nombres de archivo y metadatos de los wheels.

## Validar un candidato de release

Ejecutar manualmente el workflow `Release (Python)` de GitHub con `publish=false` para compilar los seis wheels, instalar el conjunto de release de Linux en Python 3.10 y 3.14, comprobar los nombres de archivo y metadatos exactos, exigir el límite de tamaño por archivo predeterminado de PyPI y conservar un artefacto agregado con hashes SHA-256. La ejecución no tiene credenciales de registry; una ejecución de prueba no puede entrar en ninguno de los dos trabajos de publicación.

La publicación pública se ejecuta desde el repositorio privado de automatización. Los metadatos del paquete apuntan al mirror público de solo lectura del código fuente, que no ejecuta Actions de release. El repositorio privado define la variable de repositorio `PYPI_PUBLISHER_REPOSITORY` como su propio `owner/name` y mantiene `PUBLIC_PYPI_RELEASE_ENABLED=false` salvo durante una release intencionada.

Los trabajos separados de runtime y de SDK permiten reanudar un fallo de subida del SDK sin reenviar los archivos inmutables del runtime. Aceptan `publish=true` solo cuando el workflow se ejecuta desde el repositorio publicador configurado en el tag `python-v*` correspondiente y los entornos protegidos `pypi-runtime` y `pypi` aprueban los trabajos de runtime y de SDK, respectivamente. PyPI Trusted Publishing sigue suministrando credenciales OIDC de corta duración, pero las attestations públicas están deshabilitadas porque revelarían la identidad del publicador privado.
