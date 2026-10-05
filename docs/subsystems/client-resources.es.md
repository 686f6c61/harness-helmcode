# Recursos de cliente

[English](client-resources.md) | Español

El modelo de recursos de cliente convierte una dirección en datos en vivo para cualquier componente del Client Web. [`dsh-client-resources`](../../packages/client/resources/README.md) proporciona el servicio `ctx.resources` y el hook estándar global `useResource`; un paquete que posee un tipo de contenido registra un **proveedor** para su **protocolo**, y un componente lee el estado actual del contenido por **dirección** sin importar el runtime del propietario. Las pestañas de la barra lateral derecha son el primer consumidor del modelo ([barra lateral derecha](sidebar-right.es.md)); el registro de decisión es el [Agent Note del modelo de recursos de cliente](../../.agents/notes/implemented/architecture/2026-09-05-client-resource-model.md).

Esta página es la referencia para desarrolladores: cómo escribir una dirección, cómo registrar un proveedor, cómo leer un recurso, qué significan los estados y los fallos, y cómo el modelo retiene y libera un recurso.

## Direcciones

Una dirección de recurso es una URL `dsh-resource://<type>/…`. El host nombra el protocolo y debe ser una clave de `ResourceProtocolMap`; la ruta es propia del protocolo, y su propietario codifica cada segmento con porcentaje. Un protocolo que necesita un ámbito lo pone en la ruta: las direcciones del protocolo `file` se leen `dsh-resource://file/session/<sessionId>/<path>`, donde path es relativa al espacio de trabajo o absoluta con sus barras iniciales conservadas, se construye con `fileAddressFor(sessionId, cwd, path)` y se lee de vuelta con `parseFileAddress(address)` de [`dsh-util-workspace-path`](../../packages/util/workspace-path/README.md). El propio modelo solo lee el esquema y el host: `protocolOf(address)` devuelve el host en minúsculas de una URL `dsh-resource://` y `undefined` para cualquier otra cosa. Las direcciones bajo cualquier otro esquema, como el `sidebar://guide` de la barra lateral, no nombran ningún recurso y se leen como `none`.

| Dirección | Clave de protocolo | Se lee como |
|---|---|---|
| `dsh-resource://file/session/s1/notes/a.md` | `file` | los metadatos de `notes/a.md` bajo la raíz del espacio de trabajo de la sesión `s1`, cuando el proveedor `file` está registrado |
| `dsh-resource://file/absolute/home/me/notes.md` | `file` | analizable pero falla con `workspace-file/unknown-workspace`: no hay sesión que autorice, y no se toma prestada ni la sesión actual ni la de la pestaña |
| `DSH-RESOURCE://File/session/s1/a` | `file` | un registro distinto: las direcciones se comparan como cadenas, y `openResource` acepta solo la grafía canónica en minúsculas que emite `fileAddressFor` |
| `dsh-resource://subagentchat/session/c1?parent=p1&mode=continuable` | `subagentchat` | una conversación de subagent direccionada cuyo valor posee una `SessionReference` hasta que el recurso se cierra |
| `sidebar://guide` | — | `none`: una dirección de navegación |
| `/home/me/notes.md` | — | `none`: no es una URL |

## Registrar un proveedor

El propietario de un protocolo declara su tipo de valor en `ResourceProtocolMap` y registra un proveedor dentro de su propio `ctx.effect`, de modo que el protocolo vive exactamente lo mismo que el plugin ([proporcionar un protocolo](../../packages/client/resources/README.md#provide-a-protocol)). `open(address, { signal })` devuelve un flujo de frames `RemoteResult` (primero el estado actual, luego un frame por cambio) y debe detenerse cuando `signal` aborta. Un fallo es un frame `ok: false` que porta un `RemoteFailure`; un throw dentro del flujo es un error de programación y no se captura.

```ts ignore-check
import type { Context } from '@deepseek-ai/cordis'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-client-resources/client'

interface NoteView { readonly title: string; readonly updatedAt: string }

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap { note: NoteView }
}

export const inject = ['resources', 'remote']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.resources.register<'note'>({
    protocol: 'note',
    async *open(address, { signal }): AsyncIterable<RemoteResult<NoteView>> {
      const id = new URL(address).pathname.slice(1)
      yield await ctx.remote.notes.read(id, signal)
      for await (const change of ctx.remote.notes.follow(id, signal)) yield change
    },
  }), 'my-notes: note resource provider')
}
```

Un protocolo tiene exactamente un proveedor; un segundo registro lanza. Registrar mientras ya hay direcciones del protocolo retenidas abre sus flujos de inmediato; el dispose del proveedor termina esos flujos y las direcciones se leen `none` hasta que vuelve un proveedor.

## Leer un recurso

Cada componente de slot recibe `useResource` en sus props, cualquiera que sea su ámbito ([Slots](slots.es.md)). `useResource<P>(address)` nombra el protocolo como argumento de tipo y devuelve el snapshot actual de la dirección; suscribirse es lo que mantiene el recurso abierto, y un componente que se monta mientras otro tenedor mantiene vivo el recurso lee el último valor de inmediato sin reabrir el flujo ([leer un recurso](../../packages/client/resources/README.md#read-a-resource)).

| `status` | Significado | `value` | `failure` |
|---|---|---|---|
| `none` | No hay proveedor registrado para el protocolo de la dirección, o la dirección no es una dirección de recurso | `undefined` | `undefined` |
| `loading` | El flujo del proveedor está abierto y aún no ha emitido | `undefined` | `undefined` |
| `live` | El último frame tuvo éxito | el último valor `ok` | `undefined` |
| `failed` | El último frame informó de un fallo | el último valor `ok`, conservado | el `RemoteFailure` del frame |

```tsx ignore-check
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-api-workspace-files/client'

type Props = PropsRuntime<'sidebar.right.pane.tab'>

export function FileHeader({ useTabInfo, useResource, t }: Props) {
  const { tab } = useTabInfo()
  const meta = useResource<'file'>(tab.contentId)
  if (meta.status === 'failed') return <p role="alert">{t('failed', { code: meta.failure.code })}</p>
  return (
    <header>
      {tab.title}
    </header>
  )
}
```

El consumidor presenta `failed` por sí mismo: el modelo conserva el último valor junto al fallo para que un cuerpo pueda mostrar contenido desactualizado con un aviso en lugar de un espacio en blanco, y el siguiente frame `ok` limpia el fallo. Nada en el modelo produce texto visible para el usuario.

## Retener y liberar

Un recurso está vivo mientras tiene un tenedor: un `useResource` suscrito o un pin. `ctx.resources.pin(address, signal)` mantiene un recurso abierto sin suscribirse hasta que `signal` aborta, y una señal ya abortada no fija nada; la barra lateral derecha fija la dirección de cada registro de pestaña abierta durante la vida del registro, de modo que cambiar de pestaña desmonta un cuerpo sin cerrar su flujo. El primer tenedor abre el flujo del proveedor; la última liberación lo aborta, descarta el valor y devuelve el snapshot a `loading` (proveedor presente) o `none` (ausente). Un frame que el proveedor emite después de esa liberación se descarta, y el iterador se devuelve. `ctx.resources.source(address)` es el observable desnudo detrás del hook, estable por referencia por dirección, para llamantes fuera de React; leer su snapshot no retiene el recurso ([ciclo de vida](../../packages/client/resources/README.md#lifecycle)).

La mayoría de los flujos portan metadatos en lugar de contenido. El valor del proveedor `file` es `WorkspaceFileStat { absolutePath, version, bytes? }`: el primer frame viene del `stat` del Host, y las observaciones posteriores actualizan la versión. Un consumidor lee el contenido a través del namespace Remote Workspace Files; Preview es dueño de la actualización de forma independiente por pestaña ([`dsh-api-workspace-files`](../../packages/api/workspace-files/README.md)). El proveedor `subagentchat` retiene la sesión direccionada y emite su `SessionReference`, y después libera esa referencia cuando la señal del recurso aborta.

## Límites

Los registros viven lo que la página: el registro de una dirección permanece después de que su último tenedor se va, sin flujo ni valor, de modo que la memoria crece con el número de direcciones distintas leídas alguna vez. Un proveedor que ignora `signal` sigue ejecutándose hasta su siguiente frame. El tipo de fallo es el `RemoteFailure` de la cara Remote, así que un proveedor cuya fuente no es una llamada Remote acuña uno. Un protocolo mal escrito o una dirección mal formada se leen como `none` sin otro diagnóstico.
