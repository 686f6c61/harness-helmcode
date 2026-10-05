# API Gateway

[English](api-gateway.md) | Español

Esta es la referencia del estado actual de la API Gateway de Typert. Describe cómo los servicios de negocio declaran métodos Remote unarios y de flujo, cómo la compilación genera los contratos de Host y de Client, y cómo las llamadas reutilizan el RPC de Connection y la ruta `/api`. Los eventos de sesión, los datos incrementales y otros protocolos de flujo quedan fuera del ámbito de este documento; pueden usar la misma Connection, pero no usan descriptores de métodos Remote.

## Modelo de programación

Los servicios de negocio usan `@Remote` o `@RemoteScope` para seleccionar los métodos expuestos al Client. Los métodos sin marcar no entran en los tipos de Client generados ni en las contribuciones en runtime, y no pueden llamarse a través de `ctx.remote`.

`@Remote` denota la llamada a un servicio de Cordis registrado en el Context raíz del Host. Los objetos complejos del Host no pueden cruzar el cable directamente; el paquete de negocio debe declarar su asociación con una identidad de cable mediante `TypertLookupMap` y registrar un proveedor de resolución por defecto con `ctx.typert.lookups` en runtime. Por ejemplo, un parámetro `Agent` llamado `agent` en la firma del Host produce un campo de cable `agentId`, y el Gateway resuelve ese id a un objeto del Host antes de invocar el método de negocio. La composición del Host puede usar `ctx.typert.lookups.configure()` para sobreescribir la política de resolución de una clave de lookup sin cambiar el nombre del parámetro, el campo de cable ni el símbolo de tipo canónico que posee el paquete de negocio.

`@RemoteScope(key)` primero resuelve una identidad a un Context con ámbito a través de `ctx.typert.contexts`, después obtiene el servicio de ese Context e invoca el método. Se aplica cuando el propio método depende de la composición con ámbito y no necesita recibir explícitamente objetos como `Agent`.

Los servicios normalmente extienden `TypertRemoteService` para que el constructor vincule explícitamente la clave del servicio de Cordis y el espacio de nombres Remote por defecto. Un servicio que ya tiene otra clase base puede declarar en su lugar `readonly typertRemote = bindTypertRemote(this, serviceKey)`; ambas formas dejan una vinculación pública inspeccionable y no dependen de que el compilador inyecte un símbolo en el constructor.

```ts
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TypertRemoteService, Remote, RemoteScope } from '@deepseek-ai/dsh-typert-protocol'
import type { Context } from '@deepseek-ai/cordis'

export interface CreateGoalRequest {
  objective: string
}

export interface CreateGoalResult {
  accepted: boolean
}

export class GoalService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'goals')
  }

  @Remote('create')
  createForClient(
    agent: Agent,
    request: CreateGoalRequest,
    signal: AbortSignal,
  ): CreateGoalResult {
    signal.throwIfAborted()
    return this.create(agent, request)
  }

  @RemoteScope('agent', 'current')
  currentForClient(): CreateGoalResult {
    return { accepted: true }
  }

  private create(_agent: Agent, request: CreateGoalRequest): CreateGoalResult {
    return { accepted: request.objective.length > 0 }
  }
}
```

Los métodos Remote pueden devolver un valor de forma síncrona o devolver una Promise. Para la cancelación cooperativa, el último parámetro de la firma del Host debe ser `signal: AbortSignal` usando el tipo global; se registra en el descriptor en lugar de entrar en `args`, mientras que el método de Client generado acepta un `AbortSignal` final opcional.

`@Remote({ mode: 'stream' })` marca un método que devuelve `Iterable`, `AsyncIterable` o `RemoteStream<Out, In>`: el Gateway entrega cada elemento emitido, un valor que el método del Host produjo, a través de su WebSocket multiplexado `/api/remote.mux` o de un portador en proceso, y el método de Client generado devuelve un `RemoteStreamHandle<Out, In>` que itera los elementos y expone `send`, `end` y `dispose` para el enlace ascendente de Client a Host del mismo flujo lógico. El segundo argumento de tipo de `RemoteStream<Out, In>` declara el tipo de elemento del enlace ascendente; el Gateway valida cada elemento que el Client envía, porque llega desde el navegador, con el códec `In` generado antes de que el método del Host lo lea a través de `this.ctx.invocation.uplink<In>()`. El enlace ascendente no entra ni en `args` ni en la lista de parámetros; el [README del Gateway](../packages/api/gateway/README.md) posee los contratos de trama, semicierre, cancelación y entrega en la bandeja de entrada.

El Client usa funciones concretas sobre objetos ordinarios, no un Proxy de JavaScript. Las llamadas directas y con ámbito aparecen bajo `ctx.remote.<namespace>` y `agentCtx.remote.<namespace>`. Cada espacio de nombres es un Service hijo de Cordis trazado, registrado como `remote.<namespace>`; el ensamblado del Client monta las contribuciones a través de `ctx.remote.$mount()`, y el espacio de nombres se descarga después de retirar su último método. Las declaraciones de dependencias pertenecen al llamante real: solo un paquete de negocio que lee `ctx.remote.<namespace>` o `agentCtx.remote.<namespace>` declara tanto `remote` como `remote.<namespace>` en su propio `inject`; los ensamblados que solo montan contribuciones y los runtimes de nivel superior que no llaman a ese espacio de nombres no declaran la dependencia del espacio de nombres en nombre del paquete de negocio. Cuando un método `@Remote` tiene exactamente un parámetro de lookup y un `TypertContextMap` con el mismo nombre usa la misma identidad de cable, la firma con ámbito generada omite ese parámetro de identidad. `@RemoteScope` genera únicamente la interfaz de invocación con ámbito.

```ts ignore-check
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { AgentContext } from '@deepseek-ai/dsh-api-session-controller/client'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'

export const inject = ['remote', 'remote.goals']

declare const ctx: Context
declare const agentCtx: AgentContext
declare const agentId: SessionId

await ctx.remote.goals.create(agentId, { objective: 'ship it' })
await agentCtx.remote.goals.create({ objective: 'ship it' })
```

Las aplicaciones de Client ensamblan únicamente `@deepseek-ai/dsh-api-remotes`. Ese paquete importa las subrutas `/remote` de los paquetes de negocio seleccionados como valores de runtime, monta sus contribuciones a través de `ctx.remote.$mount()` y reexporta las fusiones de declaraciones de los mismos archivos. Añadir un paquete Remote de Host es una elección explícita del propietario de la composición del Client; los componentes de negocio no necesitan cargar por separado el Typert Gateway ni el JS Remote del paquete de negocio.

El ensamblado `api-remotes` y el contrato `ctx.remote` son independientes de React; los métodos del Host visibles para cualquier ensamblado de Client se limitan a los métodos Remote seleccionados en el momento de la generación.

## Responsabilidades de los componentes

| Ubicación | Paquete o entrada | Responsabilidad |
|---|---|---|
| Compartido | `@deepseek-ai/dsh-typert-protocol` | Declara decoradores, vinculaciones del Gateway, mapas de protocolo extensibles por fusión, descriptores de invocación y tipos de proveedores; no inicia ningún análisis de TypeScript ni registra servicios de Cordis |
| Compilación | `@deepseek-ai/dsh-typert-generator` | Analiza estrictamente las firmas Remote, el grafo de tipos, los lookups, los Contexts y las ubicaciones en el código fuente a partir del `ts.Program` del Host, y después genera los artefactos de Host y de Host-para-Client |
| Host | `@deepseek-ai/dsh-typert-registry` y Loader | Coloca los descriptores de Host generados, los schemas y los registros de paquetes de negocio en `ctx.typert`, y mantiene los proveedores de lookups y de Contexts |
| Host | `@deepseek-ai/dsh-api-session-controller` | Posee la política de identidad Agent/Session de la aplicación y configura los lookups de Typert correspondientes |
| Host | `@deepseek-ai/dsh-api-gateway` | Proporciona `ctx.typertGateway`, reclama los endpoints Remote, valida los valores de las solicitudes, resuelve objetos o Contexts e invoca los servicios de Cordis en vivo |
| Client | `@deepseek-ai/dsh-api-gateway/client` | Proporciona `ctx.remote` y los Services hijos `remote.<namespace>`, monta los descriptores generados como métodos concretos, e inicia y cancela llamadas a través de la Connection |
| Client | `@deepseek-ai/dsh-api-remotes/client` | Selecciona y monta explícitamente las contribuciones `/remote` permitidas por la aplicación e incorpora las fusiones de declaraciones correspondientes al código de negocio |
| Ambos | `@deepseek-ai/dsh-client-connection` | Proporciona el portador RPC, la correlación de solicitudes, la frontera de confianza, la cancelación, el sobre de respuesta y el puente HTTP `/api` |

El paquete API Gateway posee el despachador del Host y el endpoint Remote del Client como entradas pares, pero las dos compilaciones nunca entran en el mismo `ts.Program`. La entrada del Host no importa la fusión del `Context` de Cordis del Client, y la entrada del Client no importa el servicio Gateway del Host.

## Pipeline de generación estricta

La compilación raíz ejecuta `build:lib:host`, `build:lib:client` y `build:web` en orden. La fase lib del Host primero ejecuta `tsc -b tsconfig.host.json` y después `tsdown --env.DSH_BUILD_FACE host`; el grafo normal de Project References del Host compila el generador Typert, que se ejecuta durante esta pasada de tsdown con el agregado del Host como su única semilla de `ts.Program`. La fase lib del Client ejecuta después `tsc -b tsconfig.client.json` y `tsdown --env.DSH_BUILD_FACE client`, consumiendo las declaraciones de Client Remote recién generadas y las contribuciones de runtime sin volver a iniciar Typert.

Ambas pasadas de tsdown coinciden con `vendor/*`, `packages/*/*` y `apps/cli`; la pasada del Host también con `apps/desktop-host` ([orden de compilación](development.es.md#typescript-project-layout)), y ambas empaquetan únicamente el JavaScript emitido a `lib/types` por la fase tsc correspondiente. La configuración raíz no examina los artefactos del Client, no clasifica nombres de paquetes ni pasa un filtro mantenido a tsdown; las configuraciones locales de paquete devuelven entradas para la fase actual según `DSH_BUILD_FACE`. Un plugin de Client ordinario produce tanto su entrada de loader de Node como su paquete de navegador durante la fase del Client.

`api/remotes`, `api/gateway`, `api/session-controller` y `api/workspace-controller` (más `client/connection`) dividen las caras de TypeScript. El proyecto de Client de `api/remotes` depende de las declaraciones `/remote` generadas para los paquetes de negocio durante el tsdown del Host; los agregados raíz y los consumidores directos deben referenciar respectivamente el `tsconfig.host.json` o el `tsconfig.client.json` de cada paquete dividido. El `clientBundle(..., { hostPhase: true })` de `api-remotes` produce su entrada de Host durante el tsdown del Host y deja solo la entrada de navegador para el tsdown del Client. La política de lookups de Agent/Session vive en `@deepseek-ai/dsh-api-session-controller`, no en `api-remotes`.

Cada paquete de negocio contribuyente escribe los archivos generados en su propio directorio `lib/`, no en su directorio de código fuente:

| Archivo | Consumidor | Contenido |
|---|---|---|
| `typert.host.js` | Loader del Host | Reflexión en runtime para la cara del Host, descriptores de invocación estrictos y valores de registro de schemas |
| `typert.host.d.ts` | Sistema de tipos del Host | Declaraciones generadas para la cara del Host |
| `typert.remote-client.js` | `api-remotes` | Una `TypertRemoteContribution` montable que contiene descriptores estrictos y códecs de runtime |
| `typert.remote-client.d.ts` | Sistema de tipos del Client | Fusiones de declaraciones para `TypertRemoteNamespaceMap` y `TypertRemoteScopeMap`, además de referencias de tipos seguras para el Client |
| `typert.remote-client.d.ts.map` | Editor | Mapea las propiedades de métodos generadas de vuelta a las declaraciones de métodos Remote del paquete del Host |

Los paquetes de negocio exponen la entrada del Loader del Host a través de `./typert` y la entrada de Host-para-Client a través de `./remote`. El generador también valida estas exportaciones de paquete y las listas de archivos publicados; genera artefactos únicamente para paquetes de contribución explícitos que proporcionan la entrada correspondiente.

Los nombres de parámetros en las declaraciones de Client Remote provienen de los campos de cable, mientras que los tipos de parámetros y de retorno referencian tipos seguros para el Client exportados por el paquete de negocio original. El mapa de declaraciones resuelve la propiedad generada tras `ctx.remote.goals.create` de vuelta al método fuente del Host marcado con `@Remote`, de modo que los editores compatibles con mapas de declaraciones pueden navegar desde una llamada del Client hasta la implementación real en lugar de detenerse en el `.d.ts` generado.

El análisis estricto exige que un Remote sea un método de instancia público, no estático y con una implementación concreta. El método no puede ser genérico; los parámetros deben ser obligatorios, identificadores simples con nombre, y no pueden usar desestructuración, valores por defecto, parámetros rest ni parámetros opcionales. Typert genera schemas estrictos para los tipos ordinarios representables en JSON; los objetos complejos, como las clases de espacio de trabajo, deben tener una declaración `TypertLookupMap` única. Los paquetes de lookups y de Contexts son responsables tanto de las fusiones de declaraciones estáticas como del registro del proveedor en runtime; si falta cualquiera de los dos lados, la compilación falla o falla la primera llamada que necesita el proveedor.

## Invocación en runtime

Las llamadas Remote usan la ruta `/api` de la Connection. El Remote del Client llama a `connection.rpc.call('/api', '<namespace>/<method>', { args }, signal)`; el portador HTTP lo mapea a `POST /api/<namespace>/<method>`, con una carga útil que contiene únicamente un objeto `args` con nombre.

La Connection realiza la comprobación de confianza unificada para `/api` antes del puente HTTP, y después despacha dentro del FetchHandler compartido. El Typert Gateway reclama únicamente los endpoints de dos segmentos que tienen un descriptor estricto o un marcador SRC activo; proyecta los campos binarios Remote en metadatos compatibles con JSON y en adjuntos de bytes relativos al resultado, que Connection enmarca como respuestas multipart. Las rutas Fetch exactas propiedad de una funcionalidad manejan las respuestas fuera del sobre RPC, y el resto de solicitudes devuelven 404. Connection posee el transporte, los ids de RPC, los sobres de respuesta y la cancelación de solicitudes, mientras que el Gateway posee el protocolo de datos Remote y el despacho de negocio. Sustituir el portador de Connection no requiere cambios en los descriptores Remote ni en la interfaz de programación del Client.

Para cada llamada, el Gateway resuelve el descriptor y el servicio en vivo a partir de los registries actuales en lugar de cachear objetos de negocio. Exige que los campos de `args` coincidan exactamente con el descriptor, valida los valores de cable con códecs, resuelve objetos o receptores a través de proveedores de lookup o de Context registrados, e invoca el método del servicio al que apunta la vinculación. El Gateway del Client valida los resultados binarios decodificados con el códec de resultado generado; los resultados JSON ordinarios conservan su manejo existente. Un proveedor ausente, una identidad desconocida, una vinculación discordante, un argumento ausente o de más, un fallo de schema o un método ausente fallan antes de entrar o después de salir del código de negocio.

El `register()` del proveedor de lookup suministra tanto la declaración estable como el resolvedor por defecto; `configure()` suministra un resolvedor propiedad de la composición del Host que puede ejecutarse de forma asíncrona y tiene como ámbito el tiempo de vida de un efecto. La configuración puede preceder al montaje del proveedor; sin un proveedor, la invocación sigue fallando con `gateway/lookup-unavailable`, y descargar la configuración restaura la política por defecto del proveedor. El Session Controller posee la semántica estándar del resolvedor para `agent` y `session`: reutiliza un Agent en vivo, reanuda automáticamente las sesiones frías ordinarias, desduplica las reanudaciones concurrentes y rechaza las identidades propiedad del enrutamiento de subagents; el lookup `session` devuelve la Session de ese Agent. Un fallo de reanudación y una barrera de propiedad levantan un `RemoteError` que porta su propio código, `session/not-found` o `session/agent-busy`, que el Gateway codifica en el cable sin cambios; solo un lanzamiento no clasificado se pliega en `gateway/internal`.

Descargar una contribución del Client elimina sus descriptores y métodos concretos a la vez, aborta sus llamadas en curso y hace que los identificadores de métodos desactualizados retenidos por código externo rechacen las llamadas posteriores. Un endpoint estricto retirado en el Host tampoco degrada a inferencia SRC, lo que evita que una descarga en caliente debilite silenciosamente la validación.

## Fallback de desarrollo SRC

Cuando el Host arranca desde el código fuente a través de `node --import tsx/esm`, no ejecuta el plugin compilador de Typert. Los inicializadores de decoradores estándar siguen registrando el nombre del método y el modo de invocación en un descriptor versionado sobre el prototipo del Service, mientras que `TypertRemoteService` o `bindTypertRemote()` suministran la vinculación explícita del servicio; por tanto, el Gateway puede construir un descriptor temporal más débil sin iniciar un `ts.Program`. El nombre de propiedad de cadena estable del descriptor permite que `remoteMethods()` lea los marcadores escritos por otra copia instalada del paquete de protocolo.

El fallback SRC analiza los nombres de parámetros simples a partir de la función en vivo. Cuando el nombre de un parámetro coincide con el `parameter` de un lookup registrado, como `agent` o `session`, usa el campo de cable `agentId` o `sessionId` del lookup y resuelve el objeto en el Host; los demás parámetros solo se comprueban por datos seguros para JSON, sin ciclos y sin prototipo especial. `@RemoteScope` usa directamente el campo de cable de un proveedor de Context del Host registrado. SRC no lee tipos de TypeScript, no genera schemas de Zod, no infiere parámetros opcionales ni admite desestructuración, valores por defecto, parámetros rest o nombres de parámetros duplicados.

SRC solo resuelve el despacho para un proceso de Host que se ejecuta desde el código fuente. El Client no descubre decoradores del Host en ejecución, y el Remote del Client se niega a montar descriptores SRC sin códecs estrictos; sus tipos, códecs y valores de registro Remote siempre provienen de los artefactos `lib/typert.remote-client.*` generados más recientemente.

## Modo de desarrollo

El desarrollo web ejecuta un solo comando, que compila los artefactos actuales de Host, Client y Web, arranca el Host desde el código fuente y mantiene recompilados los paquetes del Client:

```sh
pnpm run dev:web
```

`dsh` arranca el código fuente del Host a través de tsx, de modo que el Host puede usar el fallback SRC; los watchers de `dev:web` recompilan la emisión de tipos de la cara del cliente, los paquetes de plugins y bibliotecas del Client y el shell Web al editar el código fuente. No analizan los decoradores del Host ni generan el DTS de Client Remote; solo lo hace la compilación completa que `dev:web` ejecuta primero (o `pnpm run build`).

Cambiar únicamente el cuerpo de implementación de un método Remote sin cambiar su contrato no requiere regenerar los archivos de Typert. Después de añadir o eliminar un decorador, o de cambiar un nombre de exportación, espacio de nombres, parámetro, valor de retorno, lookup, Context o firma de cancelación, volver a ejecutar la compilación lib ordenada para que el Host genere el contrato estricto antes de que el Client compile y empaquete la nueva contribución:

```sh
pnpm run build:lib
```

El watcher del Client en ejecución consume estos archivos generados al reempaquetar. Si `pnpm run build:lib:host` ya ha actualizado el contrato del Host, `pnpm run build:lib:client` puede completar el lado del Client; un worktree limpio no puede saltarse la fase del Host. Recompilar únicamente el código fuente del frontend no puede inferir nuevos tipos a partir de los decoradores del Host. `pnpm run typecheck` ejecuta la fase lib del Host antes del tsc del Client, y CI y las compilaciones de release usan el mismo orden.

## Límites

Remote maneja llamadas a métodos unarios con una solicitud y un resultado, y métodos de flujo cuyos elementos fluyen de Host → Client mientras los elementos del Client llegan al método del Host en ejecución a través de `this.ctx.invocation.uplink()`. Los flujos de eventos de sesión, la paginación, la reducción incremental, la proyección y los subflujos de entidades siguen requiriendo un protocolo de datos y un modelo de registro separados; incluso cuando reutilizan la Connection, no deben hacerse pasar por métodos Remote ni entrar en los descriptores de invocación.

Las capas de la API se organizan como `remotes → gateway → connection → webserver`. Las capas BFF y RPC de Typert viven bajo `packages/api`; Connection y WebServer viven en `packages/client/connection` y `packages/host/webserver`. Los resultados unarios que contienen `Uint8Array`, incluidos los campos anidados y las entradas de arrays, usan la [transferencia binaria Remote](../.agents/notes/implemented/architecture/2026-09-17-workspace-file-binary-transfer.md). Una funcionalidad que necesita una respuesta fuera del sobre RPC registra una ruta Fetch exacta de Connection.

La política de lookups se configura por clave, de modo que todos los parámetros `agent` o `session` comparten el comportamiento de reanudación en frío. Aceptar únicamente objetos en vivo requeriría una política explícita por parámetro o por endpoint, que no existe; el método de negocio no debe adivinar si el objeto provino de una restauración.
