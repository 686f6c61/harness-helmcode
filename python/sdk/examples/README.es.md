# Ejemplo del SDK de Python

[English](README.md) | Español

Ejemplo ejecutable del SDK de Python sobre el único lanzador de aplicación, `dsh --profile sdk-minimal`. El cliente de Python es propietario del JSON-RPC sobre stdio; el perfil es propietario de la composición del agent (agente), la persistencia, la política de ejecución y los plugins.

## Ejecutar el agent mínimo

Instalar `deepseek-harness-sdk`, exportar una credencial de modelo, y después suministrar un home de Harness y un espacio de trabajo aislados:

```sh
export DEEPSEEK_API_KEY=sk-your-key-here
python python/sdk/examples/minimal.py \
  --dsh-home /absolute/path/to/example-dsh-home \
  --workspace /absolute/path/to/disposable-workspace \
  --session-id example-001 \
  "Inspect the repository and fix the failing tests."
```

Definir `DEEPSEEK_BASE_URL` para un proxy compatible, `DSH_MODEL` para el modelo predeterminado del script, o `DSH_SYSTEM_PROMPT` para la persona del despliegue. `--model` es la única selección de modelo del runtime; no se requiere ninguna variable de entorno equivalente. `--profile` puede seleccionar otro perfil que sirva el SDK. El home seleccionado almacena el perfil `sdk-minimal` generado y los registros de sesión JSONL sin comprimir bajo `sessions/`; el script nunca lee `~/.dsh` implícitamente.

El [bundle `@deepseek-ai/dsh-sdk-minimal` distribuido](../../../packages/bundle/sdk-minimal/README.md) es el árbol de Cordis explícito y completo para este modo. Expone exactamente:

- `bash` persistente con ámbito del propietario en Linux/macOS o `pwsh` en Windows

El bundle no incluye `dsh-base`, por lo que cada fila adicional es un cambio explícito del perfil. El contexto de runtime, las tools de sistema de archivos, el descubrimiento de instrucciones locales, la compactación (compaction), la configuración, las credenciales gestionadas, la telemetría, las tools Web, los subagents y la lista completa de tools predeterminadas están ausentes. El árbol conserva el arranque del SDK y el servicio JSON-RPC, un adaptador de DeepSeek configurado por entorno, la ejecución local y la persistencia JSONL.

El PTY persistente puede modificar cualquier ruta disponible para el proceso del runtime, así que usar un checkout o contenedor desechable.

## Añadir plugins

Usar el comando `dsh` del wheel del runtime contra el mismo home explícito para cambios persistentes del perfil:

```sh
export DSH_HOME=/absolute/path/to/example-dsh-home
dsh plugin --profile sdk-minimal add file:/absolute/path/to/my-plugin-bundle
```

Usar `sdk-minimal` en ese comando para extender este ejemplo, o `sdk` para extender el perfil completo del SDK respaldado por la base. La llamada de Python también puede pasar rutas adicionales de parches absolutos en `patches=(...)`; los archivos posteriores ganan. Un perfil seleccionado debe conservar `@deepseek-ai/dsh-sdk-app` u otra fila de servidor JSON-RPC. El ejemplo no acepta ningún archivo de Cordis completo ni argv arbitrario del proceso.

El mismo wheel del runtime empaqueta el perfil `web` y sus assets de frontend para uso directo desde la CLI: `dsh web` inicia esa aplicación independiente. Un cliente del SDK de Python no puede seleccionar `web` porque no tiene fila de servidor JSON-RPC.

Véase el [tutorial del SDK de Python](../../../docs/user/guide/python-sdk.es.md) y la [referencia del SDK](../README.es.md).
