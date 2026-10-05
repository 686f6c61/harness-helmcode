# Manual de referencia: añadir una Remote API

[English](adding-a-remote-api.md) | Español

Añadir o cambiar un endpoint de `ctx.remote` sigue los cinco pasos de esta página: declarar el método, declarar sus fallos, registrarlo en el paquete, consumirlo en el Client y probarlo. La semántica de los decoradores, la resolución de lookups, el pipeline de generación y la ruta `/api` son el mecanismo y pertenecen a la [referencia de API Gateway](../api-gateway.es.md); esta página da la acción de cada paso y las convenciones que debe satisfacer. Por qué la interfaz de programación tiene este aspecto está en el [Agent Note de llamadas a métodos Remote de Typert](../../.agents/notes/implemented/architecture/2026-08-02-typert-remote-method-calls.md), y por qué un fallo es un `RemoteError` más una tabla de códigos está en el [Agent Note del vocabulario de fallos](../../.agents/notes/implemented/architecture/2026-08-28-ctx-remote-failure-vocabulary.md).

## 1. Declarar la API

El propietario es un servicio de Cordis del lado Host: extender `TypertRemoteService` para que la clave del servicio y el namespace de cable queden vinculados, y luego marcar los métodos expuestos con `@Remote`. Marcar el propio método de negocio cuando su firma ya satisface las convenciones de cable; escribir un adaptador `remoteExport*` solo cuando la forma tiene que cambiar (añadir `signal`, reordenar parámetros, exportar otro nombre), y dejar que ese adaptador llame al método de negocio sin renombrar. Los objetos de lookup (`Agent`, `Session`) solo pueden ocupar posiciones de parámetro de nivel superior, y un método que soporta cancelación cooperativa toma `signal: AbortSignal` como parámetro final.

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

/** One stored note as a Client reads it. */
export interface NoteRow {
  readonly noteId: string
  readonly title: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    notesController: NotesController
  }
}

export class NotesController extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'notesController', { namespace: 'notes' })
  }

  /**
   * @param agent - lookup parameter the Gateway resolves from its wire identity.
   * @param signal - carrier cancellation, always the final parameter.
   * @returns the notes this Agent's session owns.
   */
  @Remote('list')
  async remoteExportList(agent: Agent, signal: AbortSignal): Promise<NoteRow[]> {
    return await this.list(agent, signal)
  }

  /** The in-process API the adapter above delegates to, unchanged by it. */
  async list(agent: Agent, signal: AbortSignal): Promise<NoteRow[]> {
    signal.throwIfAborted()
    return await Promise.resolve([{ noteId: `${agent.id}-1`, title: 'draft' }])
  }
}
```

## 2. Declarar los fallos

Un fallo Remote es una sola clase, `RemoteError`: fusionar los códigos del dominio en `RemoteErrorDetailsMap` mediante declaration merging y lanzar `throw new RemoteError(code, message, details)` en el punto del fallo. No construir una familia de clases de error de dominio ni escribir una función de mapeo de salidas; una excepción no relacionada con este endpoint no está pre-clasificada, porque el Gateway la pliega en `gateway/internal`. Escribir un `catch` solo para clasificar una excepción arbitraria de un proveedor como un código de dominio, y adjuntar la excepción original como `cause`.

Un código se lee `<domain>/<reason>`, y su declaración tiene cuatro reglas de ubicación:

- Un solo productor: declararlo en el paquete productor, junto al throw.
- Varios paquetes lo producen: declararlo en el paquete de dominio más bajo del que ambos dependen (`session/not-found` en `core/session`, `workspace/not-found` en `dsh-workspace`).
- Los códigos del portador `gateway/bad-request`, `gateway/cancelled` y `gateway/internal` están declarados en protocol, y los códigos de infraestructura del Gateway en gateway: usarlos, nunca copiarlos.
- Un fallo local que nunca cruza el cable se queda fuera de la tabla de códigos; expresarlo con el tipo propio del llamante.

```ts
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** No stored note carries that id. */
    'note/not-found': { readonly noteId: string }
    /** The store refused an otherwise valid write. */
    'note/rejected': { readonly noteId: string }
  }
}

declare const stored: ReadonlyMap<string, string>
declare function persist(noteId: string, title: string): Promise<void>

export async function rename(noteId: string, title: string): Promise<void> {
  if (!stored.has(noteId)) {
    throw new RemoteError('note/not-found', `no note "${noteId}"`, { noteId })
  }
  try {
    await persist(noteId, title)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new RemoteError('note/rejected', message, { noteId }, { cause: error })
  }
}
```

## 3. Registrarla en el paquete

`@Remote` debe vivir en un paquete de plugin entrada del Loader; cuando el propietario es un seam abstracto, el controlador va en el paquete correspondiente bajo `packages/api/`. El manifest gana las dos entradas generadas y la dependencia de pares (peer dependency) del protocolo, mientras que en el lado Client el ensamblado `@deepseek-ai/dsh-api-remotes` monta la contribución y re-exporta el vocabulario de tipos que los consumidores necesitan. A qué artefacto generado apunta cada entrada y cómo se ordena el pipeline de generación están en la [referencia de API Gateway](../api-gateway.es.md).

```json
{
  "exports": {
    "./typert": { "types": "./lib/typert.host.d.ts", "default": "./lib/typert.host.js" },
    "./remote": { "types": "./lib/typert.remote-client.d.ts", "default": "./lib/typert.remote-client.js" }
  },
  "peerDependencies": { "@deepseek-ai/dsh-typert-protocol": "workspace:*" },
  "devDependencies": { "@deepseek-ai/dsh-typert-protocol": "workspace:*" }
}
```

Volver a ejecutar `pnpm run build:lib` tras cambiar una firma, la tabla de códigos, el namespace o un nombre de exportación, porque eso es lo que entrega al Client sus nuevas declaraciones y códecs; cambiar solo el cuerpo de una implementación no necesita regeneración.

## 4. Consumirla en el Client

El plugin llamante declara tanto `remote` como `remote.<namespace>` en su `inject`, y el sitio de la llamada escribe `ctx.remote.<namespace>.<method>(...)` directamente: sin narrowing con `Pick<ClientRemote, …>`, sin firma de método escrita a mano, sin objeto de retransmisión de cable. El resultado es un `RemoteResult<T>`, así que ramificar con `if (!result.ok)` en el sitio y discriminar por `code` en lugar de `instanceof`: una rama de código estrecha `details` por sí sola. Un sitio de flujo por excepción escribe `throw result.error` (es un Error real); quien lo captura usa `isRemoteFailure` para distinguir un fallo Remote de un defecto local y relanza el defecto. No escribir un catch defensivo: una llamada Remote no rechaza, y un error de ensamblado debe romper.

Los hechos fijos del Host vienen de `ctx.remote.$host`: `home` e `isLoopback` son lecturas simples sin suscripción ni contador de generación, y `home` es `undefined` hasta el primer frame ready. Refrescar tras una reconexión mediante `ctx.on('connection/reset')` o un evento remote propio del dominio. Cuando el llamante aborta una llamada unaria, el resultado es `gateway/cancelled` en la rama de error en lugar de un throw.

```ts ignore-check
import type { Context } from '@deepseek-ai/cordis'
import { isRemoteFailure } from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'

export const inject = ['remote', 'remote.notes']

declare const ctx: Context

/** Store-side read: the error branch is handled where the code is meaningful. */
export async function noteTitles(): Promise<readonly string[]> {
  const result = await ctx.remote.notes.list()
  if (!result.ok) {
    if (result.error.code === 'note/not-found') return []
    throw result.error
  }
  return result.value.map(row => row.title)
}

/** Action-side: a Remote failure becomes copy; a local fault keeps crashing. */
export async function renderTitles(): Promise<string> {
  try {
    return (await noteTitles()).join(', ')
  } catch (error: unknown) {
    if (!isRemoteFailure(error)) throw error
    return `unavailable (${error.code})`
  }
}

/** Fixed Host facts as plain reads. */
export function hostLabel(): string {
  const { home, isLoopback } = ctx.remote.$host
  return home ?? (isLoopback ? 'local host' : 'remote host')
}
```

## 5. Probarla

En el lado propietario, asertar el código que se lanzó: recuperar el fallo con `remoteErrorOf` tras capturarlo, y luego comparar `code` y los campos de detalles relevantes con `toMatchObject`; nunca comparar en profundidad el objeto de error con `toEqual` ni asertar `instanceof`.

```ts
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import { expect, it } from 'vitest'

declare function rename(noteId: string, title: string): Promise<void>

it('refuses an unknown note before writing', async () => {
  const failure = await rename('n-404', 'fresh title').catch((error: unknown) => error)

  expect(remoteErrorOf(failure)).toMatchObject({
    code: 'note/not-found',
    details: { noteId: 'n-404' },
  })
})
```

Un doble del lado Client devuelve instancias reales: tomar los imports de valor `RemoteError` y `TestRemote` de `@deepseek-ai/dsh-client-test-runtime`, porque un import de valor desde la fachada `api-remotes` cargaría la cadena de ensamblado sin compilar. `TestRemote.$host` es un campo simple que un spec asigna directamente.

```ts ignore-check
import { Context } from '@deepseek-ai/cordis'
import { RemoteError, TestRemote } from '@deepseek-ai/dsh-client-test-runtime'
import { expect, it } from 'vitest'

it('renders the failure code the Host reported', async () => {
  const ctx = new Context()
  const remote = new TestRemote(ctx, {
    notes: {
      list: () => Promise.resolve({
        ok: false as const,
        error: new RemoteError('note/not-found', 'no note "n-404"', { noteId: 'n-404' }),
      }),
    },
  })
  remote.$host = { home: '/home/fixture', isLoopback: true }

  await expect(ctx.remote.notes.list()).resolves.toMatchObject({ error: { code: 'note/not-found' } })
})
```

## Verificar

1. `pnpm run build:lib`: obligatorio una vez que cambió una firma, la tabla de códigos, el namespace o un nombre de exportación, porque produce las declaraciones y códecs del Client.
2. `pnpm run typecheck`: tanto el programa Host como el Client, donde un código fusionado en un paquete inalcanzable se pone en rojo.
3. Ejecutar los specs de ambos lados por nombre: `npx vitest run <owner spec> <client spec>`.
4. Añadir un snapshot de sesión grabada cuando el endpoint alcanza una superficie visible del producto, según la [política de testing](../testing.es.md).
