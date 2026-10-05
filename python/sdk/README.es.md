# DeepSeek Harness Python SDK

[English](README.md) | Español

SDK de subproceso de Python para manejar DeepSeek Harness mediante JSON-RPC delimitado por líneas sobre stdio. Instalar `deepseek-harness-sdk`; instala el wheel `deepseek-harness-runtime-bin` de exactamente la misma versión para la plataforma actual.

```sh
python -m pip install deepseek-harness-sdk
```

## Iniciar un runtime

El SDK de Python no tiene un punto de entrada de aplicación propio. Lanza la CLI `dsh` empaquetada con `--profile sdk`; el perfil seleccionado es propietario del servidor JSON-RPC, la composición del agent (agente), las credenciales, la persistencia, las tools y el comportamiento de apagado.

Cada lanzamiento requiere un directorio home de Harness explícito. Pasar `dsh_home` o suministrar un `DSH_HOME` no vacío en el entorno del hijo. El SDK deliberadamente nunca descubre `~/.dsh`.

```py
from deepseek_harness import DeepSeekHarness

with DeepSeekHarness(
    dsh_home="/absolute/path/to/isolated-dsh-home",
    cwd="/absolute/path/to/workspace",
    provider="deepseek-official",
    model="deepseek-v4-flash",
    reasoning_effort="max",
    max_tokens=49_152,
) as harness:
    result = harness.run("Say hi.", session_id="example-001")

print(result.final_response)
```

`DeepSeekHarness` arranca de forma diferida y reutiliza su runtime hasta `close()` o la salida del gestor de contexto. El handshake inicial del perfil tiene un límite independiente de 30 segundos por defecto mediante `initialize_timeout_seconds`; los turnos ordinarios permanecen sin límite salvo que se defina `request_timeout_seconds`. Un timeout nombra el perfil seleccionado e incluye diagnósticos del runtime retenidos. `cwd` es el espacio de trabajo del agent; `runtime_cwd` selecciona de forma independiente el directorio de trabajo del subproceso. Ambos se convierten en absolutos antes del lanzamiento. `provider`, `model`, el `reasoning_effort` opcional y el `max_tokens` positivo opcional se envían durante la inicialización JSON-RPC. `base_url` y `api_key` sobrescriben explícitamente `DEEPSEEK_BASE_URL` y `DEEPSEEK_API_KEY` en el entorno del hijo.

## Personalizar plugins

La personalización persistente pertenece a un perfil de `dsh`. Inicializar el perfil SDK distribuido e instalar un bundle externo con el comando `dsh` del wheel del runtime:

```sh
export DSH_HOME=/absolute/path/to/isolated-dsh-home
dsh --profile sdk --dump-default-config >/dev/null
dsh plugin --profile sdk add file:/absolute/path/to/my-plugin-bundle
```

La forma `file:` instala el bundle local en el árbol de paquetes del perfil, donde sus importaciones de pares alcanzan el fallback de la instalación empaquetada. El manifest del perfil registra las dependencias instaladas y las capas ordenadas de bundles; su `$DSH_HOME/profiles/sdk/cordis.patch.yml` es el parche de usuario persistente. `dsh plugin` solo necesita `pnpm` al gestionar paquetes externos. Ejecutar el SDK no requiere Node.js del sistema.

Para un cambio específico de una invocación, pasar uno o más archivos de parche. Se convierten en absolutos y se reenvían en orden después de las capas de parche del perfil y del home:

```py
with DeepSeekHarness(
    dsh_home="/absolute/path/to/isolated-dsh-home",
    profile="sdk",
    patches=("/absolute/path/to/first.patch.yml", "/absolute/path/to/last.patch.yml"),
) as harness:
    result = harness.run("Make the requested code change.")
```

`profile` puede seleccionar otro perfil existente, pero esa composición debe conservar `@deepseek-ai/dsh-sdk-app` u otra fila de `@deepseek-ai/dsh-sdk-jsonrpc-server`. La configuración errónea falla durante el arranque de la CLI o la inicialización del SDK; no hay fallback de configuración completa. `dsh_bin` puede seleccionar otro ejecutable `dsh` conservando la misma gramática de perfiles. La sustitución arbitraria de argv sigue siendo un adaptador de pruebas interno del runtime falso, no API pública.

`provider` selecciona una ruta de proveedor registrada por la composición de Cordis elegida; `model` es el id de modelo que resuelve ese adaptador. `reasoning_effort` es un identificador opcional no vacío propiedad del adaptador para esa ruta exacta; omitirlo conserva el valor predeterminado propio del modelo. `max_tokens` es un límite opcional y positivo de tokens de salida por solicitud para el agent raíz y sus descendientes en proceso; omitirlo deja el control al valor predeterminado del proveedor. La inicialización rechaza un adaptador ausente, un modelo no disponible o un effort no soportado antes de que se ejecute un prompt. Los resúmenes de compactación (compaction) conservan el límite separado configurado por su plugin de compactación. La composición predeterminada empaquetada registra `deepseek-official`. Una composición personalizada puede montar `llm-pi-ai`, configurar allí credenciales/endpoints específicos del proveedor y seleccionar cualquier proveedor/modelo presente en el catálogo instalado de pi-ai.

El perfil `sdk-minimal` distribuido es un árbol explícito e independiente en lugar de un overlay sobre `dsh-base`. Seleccionarlo con `profile="sdk-minimal"`; el argumento `model` ordinario es la única selección de modelo del runtime, incluidos los ids de modelo fuera del catálogo orientativo del adaptador. Solo proporciona un shell persistente seleccionado por plataforma, ejecución local y sesiones JSONL; las tools de sistema de archivos, la configuración, las credenciales gestionadas, la telemetría, las tools Web y la lista completa de tools predeterminadas permanecen disponibles a través de los perfiles completos `sdk` y `web`, que son independientes.

## Resultados y notificaciones

`Session.run()` es propietario de un intervalo de actividad desde la recepción duradera del prompt en la bandeja de entrada hasta la siguiente inactividad del agent completo, y devuelve `RunResult(session_id, final_response, finish_reason, events, notifications)`. `final_response` es el último texto de asistente confirmado de la sesión raíz en el intervalo. `finish_reason` es el `kind` del último `turn/end` de la sesión raíz, como `completed`, `max-tokens` o `error`, y es `None` cuando no terminó ningún turno. Un `turn/end` sin un `data.reason.kind` de tipo string viola el protocolo y lanza `SdkProtocolError`.

`HarnessClient` retiene la ascendencia de subagents descubierta durante la vida del proceso del runtime. Durante `Session.run()`, `RunResult.notifications` y `on_notification` reciben la sesión raíz y los descendientes conocidos en orden de transmisión. `RunResult.events` contiene solo eventos de la sesión raíz, de modo que la salida de un descendiente no puede reemplazar la respuesta de la raíz. El `session_prompt()` de bajo nivel devuelve de inmediato el id del mensaje encolado; los llamantes que evitan `Session.run()` son propietarios del límite de actividad posterior.

El home seleccionado almacena los perfiles, los plugins y todos los recursos duraderos propiedad del perfil. El perfil completo `sdk` usa sus almacenes de credenciales, configuración y sesiones; `sdk-minimal` usa solo su almacén de sesiones JSONL. Usar un home nuevo cuando esos recursos deban estar aislados, y un id de sesión nuevo para trabajo independiente. Reutilizar tanto un harness como un id de sesión continúa la conversación duradera y los recursos propiedad de la sesión.

Véase el [tutorial de Python](../../docs/user/guide/python-sdk.es.md), el [ejemplo ejecutable](examples/README.es.md) y la [referencia del wheel del runtime](../sdk-runtime/README.es.md).
