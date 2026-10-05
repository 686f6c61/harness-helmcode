# Configurar modelos

[English](providers.md) | Español

Esta guía asume que iniciaste la Web UI a través del [README raíz](../../../README.en.md). Los cambios de modelo surten efecto en la siguiente solicitud sin reiniciar el servidor.

## Añade tu primer proveedor

Helmcode se entrega sin proveedor de modelos integrado: tú eliges el proveedor y la clave se queda en tu máquina. Abrir **Configuración → Modelos** y elegir **Añadir proveedor de modelos**.

![La página Modelos, con Añadir proveedor de modelos debajo](providers-models-page.png)

Las claves son de solo escritura. La página recibe un descriptor redactado tras guardar, nunca el secreto literal. La clave se almacena en `$DSH_HOME/.credentials.yaml`, mientras que la configuración conserva solo su referencia de credencial.

### Añadir un proveedor de terceros

La tarjeta se abre en **Proveedor de modelos de terceros**: elegir un proveedor que traiga el catálogo (la lista muestra ids de proveedor como `anthropic`, `openai`, `moonshotai` para Kimi o `zai` para GLM), introducir su clave de API y guardar. El catálogo instalado aporta el endpoint, el protocolo y la lista de modelos.

Los proveedores que inician sesión con OAuth, como Codex, aún no están soportados aquí.

## Añadir una API de modelo personalizada

Cambiar la tarjeta a **API de modelo personalizada** para un relay, una puerta de enlace de empresa, un servidor autoalojado o cualquier proveedor ausente del catálogo instalado. Proporcionar un Provider ID en minúsculas, la URL base, el protocolo de API, la credencial y al menos un modelo. El **protocolo de API** debe ser el que habla tu puerta de enlace, y el selector ofrece tres: OpenAI Chat Completions, OpenAI Responses y Anthropic Messages, almacenados en el `cordis.patch.yml` del perfil activo como `openai-completions`, `openai-responses` y `anthropic-messages`. Un proveedor habla un protocolo, así que una puerta de enlace que sirve dos necesita dos proveedores.

![El formulario de API de modelo personalizada: Provider ID, nombre visible, URL base, protocolo de API y clave de API](providers-custom-form.png)

El Provider ID es permanente porque las solicitudes, las sesiones guardadas, los modelos por defecto y las referencias de credencial lo usan. Para renombrar un proveedor, añadir un proveedor nuevo y eliminar el antiguo. El nombre visible, la URL base, el protocolo, la credencial y los modelos siguen siendo editables.

### Descubrir modelos

En **Catálogo de modelos**, elegir **Obtener modelos disponibles** para preguntar al endpoint qué modelos sirve. La solicitud usa la URL base, el protocolo y la clave que hay actualmente en el formulario, o la clave almacenada de un proveedor guardado, y la respuesta abre un selector con búsqueda: buscar, marcar los modelos deseados y elegir **Añadir seleccionados**. Nada se almacena hasta guardar o crear el proveedor.

El descubrimiento lee los formatos de listado que publican las puertas de enlace habituales, pero no todos los endpoints responden en uno de ellos, así que hay que tratarlo como una comodidad y no como una garantía: cuando falla o no lista nada, añadir los ids de modelo a mano y funcionan igual. Un proveedor integrado siempre se responde desde el catálogo instalado, incluso cuando su URL base apunta a una puerta de enlace, así que hay que consultar a través de un proveedor personalizado para ver lo que la puerta de enlace realmente sirve.

## Seleccionar un modelo

Los proveedores configurados aparecen en el selector de modelos. Seleccionar un modelo también lo convierte en el predeterminado para las sesiones nuevas. Una sesión que ya ha enviado una solicitud conserva el modelo anotado en su propio registro.

Si un valor por defecto guardado nombra un proveedor que fue eliminado, el compositor muestra **Seleccionar modelo** y bloquea la entrada hasta seleccionar otro modelo.

## Configuración avanzada

El [catálogo de configuración de plugins](../../config-catalog.es.md) generado enumera todos los campos y valores por defecto soportados de cada plugin; [`dsh-llm-pi-ai`](../../config-catalog.es.md#deepseek-aidsh-llm-pi-ai) es la sección de proveedor que configura esta página. La referencia de [`dsh-llm-pi-ai`](../../../packages/llm/llm-pi-ai/README.md) posee la configuración directa de `cordis.patch.yml`, la resolución del catálogo, los controles de razonamiento, las credenciales y los errores del adaptador.

::: tip Ajustes adicionales
La página Modelos expone la clave de API, el nombre visible, la URL base, el protocolo de API y, de cada modelo, el id, el nombre visible, la ventana de contexto, los tokens máximos de salida y los tipos de entrada. Configurar los niveles de esfuerzo de razonamiento, los interruptores de compatibilidad de solicitudes, las cabeceras, los tiempos de espera y la política de reintentos en `$DSH_HOME/profiles/<profile>/cordis.patch.yml`, el mismo documento que escribe la página. Editarlo directamente o, cuando el navegador se ejecuta en la misma máquina que el servidor, abrirlo con **Abrir archivo de configuración** en la cabecera de Configuración; los adaptadores lo releen en la siguiente solicitud, así que nada necesita reiniciarse. Las subsecciones siguientes cubren los campos que la mayoría de las puertas de enlace necesitan.

Para el lanzamiento estándar de la Web UI con `dsh web`, `<profile>` es `web`, así que la ruta es `$DSH_HOME/profiles/web/cordis.patch.yml`. Si lanzas un perfil personalizado, usar en su lugar el nombre elegido al arrancar.
:::

### Entrada de imágenes

En **Configuración → Modelos**, editar el proveedor, abrir **Ajustes personalizados** y expandir las **Opciones de modelo** del modelo. **Tipos de entrada** ocupa su propia fila debajo de los campos de capacidad. Seleccionar **Imagen** para un modelo que acepta imágenes y guardar. **Texto** empieza seleccionado para un modelo personalizado nuevo sin capacidad de imagen heredada. Al menos un tipo debe permanecer seleccionado; seleccionar Imagen antes de quitar Texto para un modelo de solo imágenes.

Las casillas guardan `input` para los modelos pi-ai. También puedes editar el modelo en `$DSH_HOME/profiles/<profile>/cordis.patch.yml`; por ejemplo, este proveedor pi-ai personalizado declara un modelo de solo texto y un modelo con visión:

Estos ejemplos muestran campos de configuración dentro de un parche de perfil. Una sobrescritura de configuración de Cordis reemplaza la configuración completa de la entrada; conservar los demás proveedores y campos al editar una sobrescritura existente.

```yaml
- id: llm-pi-ai
  config:
    providers:
      my-gateway:
        apiKeyEnv: GATEWAY_API_KEY
        api: openai-completions
        baseURL: https://gateway.example/v1
        models:
          - id: legacy-chat
          - id: vision-preview
            input: [text, image]
```

El `input` de pi-ai acepta `text` e `image` y se aplica solo a ese modelo. Una selección explícita no vacía tiene prioridad. Un `input` omitido o vacío hereda los tipos de entrada del catálogo instalado y después el `defaultInput` de la ruta, que por defecto es `[text]`. Las casillas muestran estos valores heredados sin guardar una sobrescritura cuando solo se abre la fila.

Para restaurar la herencia tras editar las casillas, eliminar el campo `input` o `inputModalities` del modelo de `cordis.patch.yml`. **Restaurar valores por defecto** elimina toda la sobrescritura del catálogo de modelos, incluidas otras ediciones de modelos, así que usarlo solo cuando se quiera restaurar el catálogo completo.

Si todos los modelos introducidos a mano aceptan imágenes, definir el valor de reserva una vez en la ruta en lugar de en cada uno:

```yaml
- id: llm-pi-ai
  config:
    providers:
      vision-gateway:
        apiKeyEnv: GATEWAY_API_KEY
        api: openai-completions
        baseURL: https://vision.example/v1
        defaultInput: [text, image]
        models:
          - id: first-model
          - id: second-model
```

`defaultInput` es un valor de reserva, no una sobrescritura, y por defecto es `[text]`: en un proveedor integrado solo responde por los modelos que su catálogo no describe, así que nunca quita imágenes a un modelo de catálogo que las tiene. Restringir uno de esos con el `input` propio de ese modelo. Cuando un proveedor integrado no tiene lista `models` explícita, escribirla bajo `modelOverrides`, indexada por id de modelo:

```yaml
- id: llm-pi-ai
  config:
    providers:
      anthropic:
        modelOverrides:
          claude-sonnet-4-5:
            input: [text]
```

En la configuración de pi-ai, toda lista debe nombrar al menos una modalidad excepto el `input` propio de un modelo, donde una lista vacía significa lo mismo que omitirlo. Una modalidad desconocida se rechaza dondequiera que se escriba.

Ambos campos declaran algo sobre tu endpoint en lugar de comprobarlo. Un modelo que declara imágenes que su endpoint no sirve no se detecta aquí; el proveedor rechaza la solicitud en su lugar.

### Esfuerzo de razonamiento

El selector de modelos ofrece un menú **Esfuerzo** para un modelo que declara niveles de razonamiento (reasoning). Los modelos de un proveedor integrado heredan sus niveles del catálogo instalado. Un modelo introducido a mano no declara ninguno, así que la entrada Esfuerzo no aparece en el menú y el valor por defecto del propio endpoint decide si el modelo piensa. Declarar los niveles con `reasoningEfforts` en `$DSH_HOME/profiles/<profile>/cordis.patch.yml`:

```yaml
- id: llm-pi-ai
  config:
    providers:
      my-gateway:
        apiKeyEnv: GATEWAY_API_KEY
        api: openai-completions
        baseURL: https://gateway.example/v1
        reasoning: high
        models:
          - id: my-reasoner
            reasoningEfforts:
              off:
              high: high
              max: max
```

Cada clave es un nivel que ofrece el menú, y su valor es la grafía enviada por cable como `reasoning_effort`, así que `max: xhigh` renombra un nivel para una puerta de enlace con vocabulario propio. Solo `off` puede quedar vacío, porque para la mayoría de los endpoints no pensar es la ausencia del parámetro. El `reasoning` de la ruta es el nivel usado mientras una sesión no ha elegido ninguno; elegir un esfuerzo en el selector lo guarda, junto con el modelo, como predeterminado para las sesiones nuevas.

Un `off` dejado vacío no envía nada, lo que solo detiene a un modelo que piensa cuando se le pide; un `off` con valor envía ese valor como `reasoning_effort` en su lugar. Un modelo que piensa a menos que se le diga lo contrario (un modelo que habla DeepSeek detrás de una puerta de enlace compatible con OpenAI, por ejemplo) necesita `compat.thinkingFormat: deepseek`, que hace que `off` envíe `thinking: {type: disabled}` y que cualquier otro nivel envíe `thinking: {type: enabled}` junto al esfuerzo:

```yaml
        models:
          - id: my-thinker
            compat:
              thinkingFormat: deepseek
            reasoningEfforts:
              off:
              high: high
              max: max
```

El modelo de un proveedor integrado cuya puerta de enlace no razona pierde sus niveles con `reasoningEfforts: false` bajo `modelOverrides`; seleccionar un esfuerzo para él se rechaza entonces como `UNSUPPORTED_REASONING_EFFORT`.

### Compatibilidad de solicitudes

Una puerta de enlace puede tener una clave válida en una dirección accesible y aun así rechazar cada solicitud. pi-ai decide la forma de una solicitud (qué rol lleva el prompt del sistema, qué campo limita la salida, cómo viaja un nivel de pensamiento) a partir de la URL del endpoint, y una dirección que no reconoce se trata como si fuera el propio OpenAI. La mayoría de las puertas de enlace compatibles con OpenAI rechazan al menos una cosa que OpenAI acepta.

Dos lo explican casi todo. Un modelo que declara razonamiento envía su prompt del sistema como `role: "developer"`, que muchas puertas de enlace rechazan de plano, y el límite de salida se envía como `max_completion_tokens`, que un servidor que solo conoce `max_tokens` rechaza. El formulario no tiene campo para ninguno de los dos; corregirlos en la ruta en `$DSH_HOME/profiles/<profile>/cordis.patch.yml`:

```yaml
- id: llm-pi-ai
  config:
    providers:
      my-gateway:
        apiKeyEnv: GATEWAY_API_KEY
        api: openai-completions
        baseURL: https://gateway.example/v1
        compat:
          supportsDeveloperRole: false
          maxTokensField: max_tokens
        models:
          - id: my-model
```

El `compat` de una ruta es el valor por defecto de sus modelos, y el propio de un modelo prevalece campo a campo, así que se puede corregir un modelo sin repetir la ruta:

```yaml
        models:
          - id: my-model
          - id: my-reasoner
            compat:
              thinkingFormat: deepseek
```

Lo que ninguno de los dos define conserva el valor del catálogo instalado para ese modelo, y lo que el catálogo no describe recae en la detección de pi-ai. Dar un valor a cada interruptor que se nombre: una clave dejada vacía (`supportsDeveloperRole:`) se rechaza en lugar de ignorarse, porque un valor vacío borraría lo que el catálogo sabe sin decir nada en su lugar. Un nombre que ningún protocolo acepta también se rechaza, y el mensaje enumera los disponibles.

Cada interruptor pertenece a los protocolos que lo declaran, así que un interruptor válido en un `api` puede ser rechazado en otro; el mensaje nombra lo que ese protocolo sí ofrece. Como `input` más arriba, un interruptor declara algo sobre tu endpoint en lugar de comprobarlo: activar uno que tu puerta de enlace no necesita realmente simplemente envía una solicitud diferente.

Todos los interruptores, sus valores aceptados y los protocolos que los admiten están enumerados bajo `PiAiCompatProfile` en la [referencia de configuración generada de `dsh-llm-pi-ai`](../../config-catalog.es.md#deepseek-aidsh-llm-pi-ai), que se deriva del código fuente, así que no puede quedarse atrás respecto a lo que el adaptador acepta.

## Solución de problemas

- **`MISSING_CREDENTIAL`**: almacenar la clave del proveedor a través de la página Modelos o proporcionar la variable de entorno referenciada.
- **`UNKNOWN_MODEL`**: seleccionar un modelo configurado o añadir el modelo que falta al proveedor personalizado.
- **Obtener modelos disponibles devuelve 401**: comprobar la clave. El descubrimiento de modelos llama al endpoint `GET /models` compatible con OpenAI; introducir los modelos manualmente para endpoints que no lo proporcionan.
- **Obtener modelos disponibles no reporta ni un array `data` ni un objeto `models`**: el listado del endpoint está en un formato que el descubrimiento no lee. Introducir los modelos a mano.
- **La puerta de enlace rechaza todas las solicitudes aunque la clave y la URL son correctas**: la forma de su solicitud difiere de la de OpenAI. Empezar con `compat.supportsDeveloperRole: false` y `compat.maxTokensField: max_tokens` en la ruta.
- **Solo fallan los modelos de razonamiento**: pi-ai envía su prompt del sistema como el rol `developer`, que la puerta de enlace rechaza. Definir `compat.supportsDeveloperRole: false`.
- **El menú Esfuerzo no aparece para un modelo introducido a mano**: no declara ningún nivel. Añadir `reasoningEfforts` al modelo en `cordis.patch.yml`.
- **`off` no impide que el modelo piense**: un `off` vacío no envía ningún campo de razonamiento, y un endpoint que piensa por defecto sigue pensando. Definir `compat.thinkingFormat: deepseek` en el modelo o en la ruta.
- **Un interruptor compat se rechaza por no tener valor**: una clave escrita sin nada tras los dos puntos. Darle un valor, o quitar la clave para conservar la del catálogo instalado.
- **Una imagen se rechaza antes de enviarse**: el modelo no declara modalidad de imagen. Dar al modelo del proveedor `input: [text, image]` y confirmar que tu puerta de enlace sirve ese modelo con entrada de imágenes.
- **El proveedor rechaza una solicitud que lleva una imagen**: el modelo declara imágenes que su endpoint no sirve realmente. Quitar `image` de la lista que se la concedió (el `input` del modelo o el `defaultInput` de la ruta) y después iniciar una sesión nueva: la imagen adjunta permanece en el registro de sesión, así que la misma solicitud se repite hasta que la sesión sale de ella.
