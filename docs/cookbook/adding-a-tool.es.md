# Referencia de autoría de tools

[English](adding-a-tool.md) | Español

Referencia de los contratos que debe satisfacer una tool orientada al modelo. Para una primera tool ordenada, seguir [Construir una tool](../user/develop/basic/tool.es.md). `packages/shell/tool-bash` es el ejemplo de tres paquetes de calidad de producción.

## La forma mínima

```ts
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'my-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'read_file',
    description: 'Read a file from disk.',          // what the model sees
    parameters: {
      path: { type: 'string', required: true, description: 'Absolute path' },
      limit: { type: 'number' },                     // optional by default
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      // args is TYPED from the schema: { path: string; limit?: number }
      // exec carries immutable identity + token; signal is the operational field
      return readFile(args.path, { encoding: 'utf8', signal: exec.signal })
    },
  }))
}
```

El registro se basa en effects: liberar la fiber del plugin desregistra la tool. Los schemas fluyen automáticamente al ensamblado del prompt del sistema.

## Reglas del contrato de execute()

- **Los args se validan por ti.** `defineTool` valida los `arguments` generados por el modelo contra el `ParameterSchemaSpec` unificado antes de que `execute` se ejecute (tipos, claves requeridas, restricciones de literales, uniones de exactamente uno y valores anidados), así que dentro de `execute` los args coinciden con `InferArgs`. Los nodos de objeto explícitos declaran `additionalProperties: true | false`; la raíz de parámetros implícita permanece abierta. Todavía hay que comprobar a mano las restricciones que el DSL no expresa, como cadenas no vacías, números positivos o reglas entre campos. Las tools de JSON Schema crudo registradas directamente poseen su propia validación de entrada.
- **El registro toma prestada tu definición readonly.** Una contribución tipada dentro del mismo proceso no es un límite de serialización; no mutar su schema ni reemplazar callbacks después del registro. `schemas()` materializa solo la proyección explícita orientada al modelo. Para intercambiar una tool en caliente, liberar su effect propietario y registrar el reemplazo; el estado mutable dentro de la clausura del callback sigue siendo estado ordinario del plugin.
- **La identidad de ejecución está protegida.** El registry materializa `arguments` como JSON sin pérdidas desacoplado en una pasada recursiva, congela ese valor antes de que empiece la política y asigna un `exec.token` opaco; `callId`, `name`, `arguments`, `agent`, `token`, el `signal` requerido propiedad del llamante y un token `parent` opcional del transporte envolvente permanecen inmutables durante el despacho. `parent` es solo identidad y no expone ninguna ejecución externa en vivo. Tratar `args` como entrada readonly. Solo un envoltorio around-dispatch recibe una vista mutable, y puede reemplazar y restaurar el `exec.signal` requerido para imponer un plazo, pero no puede eliminarlo.
- **Declarar y devolver un único valor JSON canónico.** `output.schema` usa `ValueSchemaSpec` y puede tener raíz de objeto, array, escalar o null. `execute` devuelve solo el valor inferido; el registry hace snapshot de él como JSON sin pérdidas, lo valida, lo congela y lo pasa a `output.render(args, value)`. No devolver bloques de contenido desde el cuerpo ni hacer que los llamantes analicen prosa para obtener ids y campos.
- **Lanzar o devolver un valor inválido significa `isError`.** El registry captura los throws y contiene los fallos de schema, renderer, proyector de metadatos y JSON sin pérdidas antes de que se ejecuten los observadores. Lanzar para fallos de infraestructura. Representar un resultado de dominio exitoso en el valor canónico incluso cuando su renderer Native explique un estado no ideal, como una salida de proceso distinta de cero.
- **Respetar `exec.signal`.** Cancelar el trabajo en curso cuando se dispare.
- **Proyectar datos duraderos de tarjeta con `presentationMeta` (opcional).** `output.presentationMeta(args, value)` deriva JSON reproducible del mismo valor canónico. El núcleo lo persiste en `tool/result` y lo entrega a `presentResult`, así que una tarjeta que necesita hechos del momento del resultado (como los hunks aplicados de `write`/`edit`) sobrevive a la reproducción sin persistir el valor canónico. El proyector se omite en los despachos de Code anidados porque no tienen tarjetas.
- **Usar `exec.agent` para notificaciones asíncronas.** `agent.inject({ content, source: { kind: 'plugin', plugin: '<name>' } })` anexa contexto duradero que ve la SIGUIENTE solicitud de modelo; no es un despertar (un agent inactivo sigue inactivo). Protegerse contra agents liberados (try/catch).

## Trabajo de larga duración

Controlar `run_in_background` con la configuración del productor, y luego registrar a través de `ctx.jobs.start({ kind, label, owner: exec.agent, run })`. El registry rechaza una invocación pre-abortada antes del cuerpo del productor; el runtime valida la propiedad y la disponibilidad del controlador de tareas antes de que `run()` empiece a trabajar, y luego suministra el id, la valla de sesión, las tools de control genéricas, los avisos y la limpieza del propietario. Una rama en segundo plano exitosa devuelve un identificador canónico tipado como `{ kind: 'background', jobId }`; su renderer Native puede conservar prosa humana como `started background job bash-1`, pero el modo PTC nunca debe analizar esa prosa para recuperar el id.

El spec suministra `cancel` síncrono, un `done` que no rechaza y se resuelve tras la limpieza de recursos, y fuentes `output` de pull que el registry bombea al anillo de salida de la tarea o de push a través del `JobHandle` que recibe quien la inicia; `dsh-tool-jobs` renderiza la lectura consumidora del modelo desde ese anillo. Una llamada pre-abortada es un fallo porque no existe ninguna tarea cuyo id pudiera satisfacer el schema de salida exitosa. Una vez que `ctx.jobs.start()` publica el id, usar una señal de cancelación propiedad de la tarea en lugar de `exec.signal`: la cancelación posterior de la llamada externa deja de esperar la llamada pero no mata el trabajo publicado; `job_kill`, la liberación del propietario y el teardown del servicio poseen ese ciclo de vida. El trabajo en primer plano sigue acoplado a `exec.signal`. Véase el [Agent Note del runtime de tareas en segundo plano](../../.agents/notes/implemented/architecture/2026-06-20-generic-long-running-tool-runtime.md) y `dsh-tool-bash` para un productor de stream.

<a id="execution-policy-and-observation"></a>

## Política de ejecución y observación

Preferir no incorporar política de despliegue en la tool. Usar `tools/pre-execute` para política extensible de allow/deny/ask (el [ejemplo de puerta de permisos](extension-cookbook.es.md#a-hook-plugin-permission-gate-example)), `ctx.tools.guard()` para una denegación final monótona que los listeners posteriores no pueden deshacer, `tools/execute` para envolver el despacho con un plazo, reintento o recolección de métricas, `tools/post-execute` para reemplazar el contenido de presentación o el valor devuelto, bloquear el resultado o adjuntar contexto orientado al modelo, y `tools/result` para observar el resultado normalizado inmutable. Un reemplazo de contenido deja intacto el acceso programático a `value`; la política de confidencialidad bloquea o reemplaza el valor. Una implementación de sandboxing también puede ejecutarse dentro de la implementación del ejecutor de la tool; el [README de `dsh-tools`](../../packages/core/tools/README.md#extension-points) define las entradas, el orden, los valores de retorno y el comportamiento de fallo de cada punto de extensión.

## El modo PTC alcanza tu tool gratis

En [modo PTC](../../packages/core/tools/README.md), toda tool registrada visible está disponible como `await tools.<name>(args)` sin integración extra. El `ToolArgsMap` y el `ToolOutputMap` generados derivan los tipos exactos de argumentos y de retorno canónico de los mismos schemas, y las llamadas reentran en el pipeline de ejecución normal. Una llamada exitosa se resuelve al valor JSON canónico final tras la política, no al contenido Native renderizado. Una llamada fallida rechaza con el `ToolCallError` real; los programas solo pueden inspeccionar su `name`, `toolName` y `message` legible para humanos, no códigos de error internos ni una unión de fallos.

Diseñar `output.schema` como una API programática útil: devolver identificadores y campos directamente, permitir raíces escalares/array/null cuando son el valor honesto, y mantener la explicación humana en `output.render`. Los valores intermedios son locales a la ejecución, no se persisten ni se truncan por prompt, y no tienen tope de bytes, así que las cotas de adquisición veraces del productor y la memoria del proceso siguen importando. Solo los logs/resultado del `run_code` externo cruzan el tope de salida configurable y el pipeline de spill orientado al modelo.

## Cómo se renderiza tu tool en una UI

El `output.render` de tu tool devuelve contenido orientado al modelo; su **tarjeta de UI** es una preocupación separada, declarada mediante proyecciones de presentación puras y los métodos opcionales `presentCall` / `presentResult`. Diseñarlos junto al valor canónico. Una tool sin presentación de UI cae a una tarjeta genérica (título = nombre de la tool, args crudos como entrada).

Ambos métodos devuelven una **intención de renderizado etiquetada `card`**: elegir la clase de tarjeta que coincide con lo que hace tu tool:

- `presentCall(args)` → un `ToolCallView` (la tarjeta PENDIENTE):
  - `{ card: 'generic', title, kind?, rawInput?, content?, locations? }`: la opción por defecto. Establecer `kind` para un icono (`read`/`search`/…); establecer `locations: [{ path, line? }]` para cualquier archivo que tu tool toque, para que un editor capaz lo siga / salte a él.
  - `{ card: 'terminal', title, description?, cwd? }`: tu llamada ES un comando de shell. `title` es el comando, `description` se renderiza sobre la tarjeta de terminal. (tool-bash.)
  - `{ card: 'diff', title, diffs, locations? }`: tu llamada crea o modifica un archivo. `diffs: [{ path, oldText, newText }]` (`oldText: null` para un archivo nuevo) se renderiza como tarjeta de diff en línea. (`write`/`edit` de tool-fs.)
- `presentResult(args, { content, isError, meta? })` devuelve la tarjeta completada:
  - `generic` suministra un título y contenido opcionales.
  - `terminal` suministra salida cruda y metadatos de salida opcionales; cada UI renderiza su vista capaz o de fallback.
  - `diff` suministra hunks aplicados, a menudo derivados por `output.presentationMeta` y transportados en el `result.meta` persistido para que la reproducción los reproduzca. Las tools de mutación conservan un resultado diff porque la vista completada reemplaza la tarjeta pendiente.
  - `read` suministra una ventana de archivo completada reconstruida desde el `result.meta` persistido: el `path` del archivo, un `offset` de base 1, las `lines` devueltas (cada una conservando su número de línea del archivo), `totalLines` y una pista opcional de resaltado `lang`; una UI sin la capacidad `read` cae al contenido crudo del resultado. No hay vista de llamada `read`: el estado pendiente de una llamada de lectura sigue siendo una tarjeta genérica, ya que el contenido solo existe después de `execute`. (`read` de tool-fs.)
  - `search` suministra un resultado de descubrimiento reconstruido desde el `result.meta` persistido: coincidencias agrupadas por archivo (`shape: 'matches'`, grep) o una lista plana de rutas (`shape: 'paths'`, glob), más `truncated`/`total` para que una UI nunca presente un resultado limitado como completo. La vista no porta texto de resultado (una UI sin tarjeta de búsqueda cae al contenido crudo del resultado), y no hay vista de llamada `search`: el estado pendiente de una llamada de descubrimiento sigue siendo una tarjeta genérica, ya que las coincidencias solo existen después de `execute`. (`grep`/`glob` de tool-fs-search.)
  - `web` suministra una recuperación web completada, discriminada por `kind: 'search' | 'fetch'` (las fuentes de búsqueda estructuradas o el resumen de fetch), derivada de `result.meta`; no porta cuerpo de texto, así que una UI sin la capacidad `web` cae al contenido crudo del resultado. (`web_search`/`web_fetch` de tool-web.)

Reglas duras (muerden si se rompen):

- **Pureza.** Se ejecutan en streaming en vivo Y en REPRODUCCIÓN del registro de sesión, así que deben ser funciones puras de `args` (+ el resultado): SIN E/S, SIN leer estado de sesión, SIN reloj/aleatoriedad. Un diff se deriva de los args (`write` usa `oldText: null` porque un presentador en tiempo de llamada no tiene contenido previo del archivo); el adaptador de UI, no la tool, suministra el contexto de sesión. Si te descubres queriendo el contenido antiguo del archivo o el directorio de trabajo dentro de `presentCall`, detente: eso pertenece a los metadatos duraderos del resultado o al adaptador, no al presentador.
- **El formateo solo-UI se queda fuera del resultado del modelo.** Un bloque delimitado ` ```console `, un diff, una ruta relativizada: nada de eso pertenece al valor canónico ni al contenido Native solo por servir a una UI. `output.render` posee la prosa orientada al modelo; `presentationMeta` más los presentadores de tarjeta poseen el estado de UI reproducible. Una vista de resultado `terminal` porta salida cruda y el adaptador añade cualquier enmarcado de fallback.
- **`defineTool` valida suavemente la ruta de presentación.** Argumentos registrados malformados o más antiguos hacen que el envoltorio devuelva `undefined` (un fallback genérico) en lugar de lanzar: la presentación nunca debe romper una reproducción.

El vocabulario neutro vive en `dsh-tools`; las tools nunca importan un tipo de UI o de transporte. Los consumidores de esta API mapean cada `card` a su propia vista. El diseño y el porqué están en [el Agent Note de la unión de intenciones de renderizado](../../.agents/notes/implemented/architecture/2026-07-02-tool-render-intent-union.md); `dsh-tool-fs` (generic/diff) y `dsh-tool-bash` (terminal) son las implementaciones de referencia.

## Presentación en el Web Client

El Web Client incorporado no consume `presentCall` ni `presentResult`. Las `page` y `follow` de Session transportan eventos crudos `tool/call` y `tool/result`, incluido el `result.meta` persistido. Un plugin de Client registra el nombre de cable de su tool en el slot con clave `tool.call.toolview` y deriva las props del componente de los argumentos, el contenido, el error, los metadatos, el `parentCallId` de despacho PTC existente y los hechos de ruta de Session del `ToolCallBlock`. Valida estos valores de cable localmente y devuelve la fila genérica para entrada malformada o no soportada.

Usar `output.presentationMeta(args, value)` cuando una tarjeta Web existente necesita hechos estructurados acotados del resultado que el contenido orientado al modelo no puede preservar sin pérdidas. No almacenar props de React ni una tarjeta seleccionada en metadatos, no importar una implementación de tool del Host en un bundle de navegador, ni crear otro registry de presentadores de Client. Definir solo métodos de presentación de Host no añade una tarjeta Web especializada. El [Agent Note de presentación derivada del Client](../../.agents/notes/implemented/architecture/2026-08-23-client-derived-tool-presentation.md) define la propiedad, el fallback y los requisitos de equivalencia.

## Verificación

Seguir la [política de testing del repositorio](../testing.es.md) y la documentación de tests del paquete propietario. Un cambio entregado visible para el modelo o la UI requiere la cobertura ensamblada allí especificada.
