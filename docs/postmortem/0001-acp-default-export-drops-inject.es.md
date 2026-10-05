# Post-mortem 0001: El servidor ACP se bloqueó al conectar: `export default` descartó el `inject` del plugin

[English](0001-acp-default-export-drops-inject.md) | Español

Estado: resuelto (corrección en el PR (Pull Request) #41 `feat/acp-2-bridge`)

## Resumen ejecutivo

Dos errores de integración rompieron ACP (Agent Client Protocol) a pesar de una cobertura unitaria completa: un export por defecto hizo que el Loader descartara `inject`, y una búsqueda trazada de un servicio opcional falló al cruzar un límite de shadow. Las pruebas montadas a mano evitaron ambas rutas. Las correcciones añadieron cobertura del Loader real sin clave y reglas de paquete para los exports de plugins y el acceso a servicios opcionales.

## Resumen

El servidor ACP (`dsh --profile acp`, `@deepseek-ai/dsh-acp`) se bloqueó en el instante en que un editor real (Zed) se conectó: la primera solicitud `session/new` devolvió `Internal error: cannot get property "agents" without inject`, y `session/load` devolvió lo mismo para `sessionPersistence`. El bridge era completamente inutilizable en producción a pesar de 178 pruebas unitarias en verde y una cobertura de líneas del 100 %. Dos bugs independientes se escondían tras el mismo mensaje de error, y la suite de pruebas pasó ambos por alto por la misma razón: cada prueba montaba el plugin por una ruta que no ejercitaba cómo se carga realmente ni cómo se resuelven realmente sus servicios.

## Impacto

El servidor ACP no podía crear ni cargar una sola sesión: las dos RPC que un editor llama primero. Cualquiera que conectara el agent (agente) a Zed obtenía un fallo grave inmediato. Sin pérdida de datos (nada se persistió antes del bloqueo); el coste fue por completo «la funcionalidad no funciona» más el tiempo de depuración para averiguar por qué, dos veces.

## Cronología

- El bridge (RFC 010) llegó con una suite unitaria completa para el códec, el transporte en memoria, los mensajes de protocolo generados, las rutas de fallo y HMR; un e2e de API real condicionado por clave; y un e2e de pureza de stdout sin clave. Todo en verde, 100 % de cobertura.
- Una sesión real de Zed falló inmediatamente en `session/new` con `cannot get property "agents" without inject`.
- La investigación siguió inicialmente una teoría de «traceable/shadow» de Cordis (plausible, y el mecanismo es real: véase el bug n.º 2), después instrumentó el recorrido real de fibers en el `reflect.ts` vendorizado y ejecutó el subproceso real. La traza mostró el lanzamiento en la línea 179 de `apply()` *en el momento de carga del plugin*, en el fiber ROOT sin shadow, lo que refutó la teoría del shadow para `session/new`.
- Causa raíz n.º 1 encontrada: un `export default apply` errante. Eliminarlo arregló `session/new`.
- Al eliminarlo apareció el bug n.º 2: `session/load` seguía lanzando en `sessionPersistence`, un mecanismo realmente distinto (el recorrido del shadow), confirmado aislando la corrección y volviendo a ejecutar el subproceso real.

## Causa raíz n.º 1: `export default apply` descarta el `inject` del plugin (rompió `session/new`)

`packages/acp/acp/src/index.ts` es un *plugin de espacio de nombres*: exporta `name`, `inject`, `Config` y `apply` como exports con nombre independientes, como hace cualquier otro plugin del repositorio (`invariants`, `llm-deepseek`, `tool-bash`, `tui`, …). Pero *además* terminaba con una línea extra que ningún otro plugin tenía:

```ts ignore-check
export const name = 'acp'
export const inject = ['agents', 'sessions', 'sessionPersistence']
export function apply(ctx: Context, config: AcpConfig): void { /* … */ }
// …
export default apply   // ← the bug
```

Cuando un plugin se carga desde `cordis.yml`, el Loader de Cordis normaliza el módulo importado mediante `Loader.unwrapExports` (`vendor/loader/src/index.ts`):

```ts ignore-check
unwrapExports(exports: any) {
  if (isNullable(exports)) return exports
  exports = exports.default ?? exports        // ← prefers `.default`
  if (!exports.__esModule) return exports
  return exports.default ?? exports
}
```

Con un export por defecto presente, `exports.default ?? exports` se resuelve a la **función `apply` desnuda**. Una función desnuda no tiene `inject`, ni `name`, ni propiedades `Config`: vivían como exports con nombre *hermanos* en el espacio de nombres del módulo, y desenvolver a `.default` tiró el espacio de nombres. El Loader construyó entonces el fiber del plugin a partir de un `inject` vacío.

En consecuencia, `apply` se ejecutó en un fiber **sin servicios inyectados**. La primera línea, `const agents = ctx.agents`, recorrió el árbol de fibers (ROOT → Include → Loader → ROOT) y, al no encontrar `agents` en el almacén de ningún fiber y llegar al fiber raíz (`runtime === null`), lanzó `cannot get property "agents" without inject`. El bloqueo ocurrió *en el momento de carga*, no en un manejador de solicitudes posterior: la solicitud simplemente resultó ser lo que disparó la carga en la traza del fallo.

**Corrección:** eliminar `export default apply`. El Loader usa entonces el espacio de nombres del módulo, respeta `inject`/`name`/`Config`, y `apply` se ejecuta dentro de un fiber que realmente concede los servicios declarados.

## Causa raíz n.º 2: la lectura de un servicio opcional dispara la guarda de inject a través de un shadow traceable (rompió `session/load`)

Con el n.º 1 corregido, `session/new` funcionaba pero `session/load` seguía lanzando `cannot get property "sessionPersistence" without inject`. Este *sí* es el mecanismo traceable/shadow de Cordis, y conviene entenderlo con precisión.

`session/load` llama a `agents.resume(...)`, que delega en `AgentLoop.resume()`, que leía `this.ctx.sessionPersistence`. El `static inject` de `AgentLoop` deliberadamente NO incluye `sessionPersistence`: inyectarlo haría que las demos no persistentes se quedaran pendientes para siempre esperando un backend que nunca se carga. El servicio lo proporciona un plugin/fiber hermano independiente y se lee de forma oportunista.

El acceso a servicios en Cordis pasa por un proxy de contexto (`vendor/cordis/src/reflect.ts`). Cuando se invoca un método de servicio a través de un *proxy traceable* obtenido desde un fiber ajeno (aquí: el fiber del bridge llama a `ctx.agents.resume`, y el registry devuelve `this.factory`, el `AgentLoop`, reenvuelto como un nuevo proxy traceable vinculado al llamante), `createShadowMethod` (`vendor/cordis/src/utils.ts`) revincula `this` a un objeto *shadow* cuyo `ctx` lleva `[symbols.shadow]` apuntando al contexto de construcción propio de `AgentLoop`. Dentro de `resume`, entonces, `this.ctx.sessionPersistence` se resuelve con el manejador del proxy iniciando su recorrido de fibers desde el fiber del shadow:

```ts ignore-check
// reflect.ts get handler
let fiber = (ctx[symbols.shadow] as Context ?? ctx).fiber   // ← starts at AgentLoop's fiber
while (true) {
  const impl = fiber.store?.[prop]
  if (impl) return getTraceable(ctx, impl.value)
  if (prop in fiber.inject) { /* inactive-context error */ }
  if (!fiber.runtime) throw error                            // ← reached root, throw
  if (fiber.parent[symbols.isolate][prop] !== key) throw error
  fiber = fiber.parent.fiber                                 // ← ancestor-only
}
```

El recorrido es **solo hacia los ancestros**. `sessionPersistence` no está ni en el almacén del fiber de `AgentLoop` (no está en su `static inject`) ni en ningún ancestro camino de la raíz (vive en una rama *hermana*), así que el recorrido llega al fiber raíz y lanza.

¿Por qué no lo detectaron las pruebas de resume de `AgentLoop` en memoria? Porque llaman a `ctx.agents.resume(...)` directamente desde el código de prueba, *fuera de cualquier fiber de plugin*. Allí, `ctx.fiber.runtime` es `null`, así que el manejador del proxy toma un atajo temprano:

```ts ignore-check
if (!ctx.fiber.runtime) return ctx.reflect.get(prop, false)   // ← direct global-store lookup, no fiber walk
```

`ctx.reflect.get(name, false)` es una búsqueda directa en el almacén global de servicios indexado por el símbolo isolate: ignora por completo la topología de fibers y encuentra el servicio. Así, desde una prueba de nivel superior la lectura funciona; desde dentro de un fiber de plugin real, alcanzada a través de un shadow, lanza. El bridge es exactamente lo segundo.

**Corrección:** leer el servicio opcional con `ctx.get('sessionPersistence')`, que usa el almacén global indexado por isolate conservando las comprobaciones de estado activo. Las lecturas directas de propiedades siguen siendo apropiadas para los servicios del conjunto de inyección declarado del plugin.

## Por qué todas las pruebas lo pasaron por alto (el fallo real)

Ambos bugs comparten una misma laguna de proceso: **ninguna prueba ejercitó el plugin a través de su ruta de carga real ni de su topología de llamadas real.**

- El harness en memoria monta el bridge construyendo a mano un objeto plugin: `ctx.plugin({ name, inject, apply })`. Eso suministra `inject` manualmente, así que nunca puede reproducir el bug n.º 1: `unwrapExports` solo lo llama el *Loader*, nunca `ctx.plugin`. Ni siquiera `ctx.plugin(NamespaceImport)` lo habría detectado.
- El mismo harness monta todo plano sobre un único contexto raíz, así que un resume de `AgentLoop` alcanzado desde él se ejecuta a nivel superior (el atajo de `!runtime`) o a través de un shadow cuyo origen sigue resolviendo en la raíz, lo que enmascara el fallo de recorrido de ancestros del bug n.º 2.
- El único e2e sin clave enviaba `initialize` y comprobaba la pureza de stdout. `initialize` nunca llega a la factory, así que pasó de largo por ambos bugs.
- La única prueba que ejercitaba `session/new`/`session/load` estaba condicionada por clave, así que CI (sin clave) la saltaba, y localmente «pasaba» solo porque un `lib/` compilado y desactualizado (con el código viejo) resultó satisfacer la resolución de módulos.

La cobertura de líneas del 100 % se cumplió todo el tiempo. La cobertura demuestra que las líneas *se ejecutaron*; no dice nada sobre si la funcionalidad trabaja *de la forma en que se entrega*.

## Salvaguardas añadidas

- **Se eliminó `export default apply`** (`packages/acp/acp/src/index.ts`): la corrección del bug n.º 1.
- **`AgentLoop.resume` lee `this.ctx.get('sessionPersistence')`** (`packages/core/agent-loop/src/index.ts`): la corrección del bug n.º 2, con un comentario que explica la trampa del recorrido del shadow.
- **E2e de `session/new` sin clave sobre stdio real** (`apps/cli/tests/profiles/acp/tests/acp.e2e.ts`): arranca el perfil como subproceso a través del Loader real y afirma que `session/new` se resuelve. Esto falla ruidosamente con el bug n.º 1 sin clave de API. Se verificó que falla al restaurar `export default apply`.
- **`TSX_TSCONFIG_PATH` en el spawn del e2e**: el subproceso se ejecuta desde un cwd temporal, donde tsx no puede encontrar el mapa `paths` del tsconfig raíz del repositorio buscando hacia arriba, así que los imports dsh-* recaían silenciosamente en el `lib/` compilado. Apuntar tsx al tsconfig del repositorio hace la resolución independiente del cwd y garantiza que la prueba ejecuta el *código fuente*, no una compilación posiblemente desactualizada.
- **Regla en [docs/testing.md](../testing.es.md)**: «probar la ruta de entrada real», la cobertura de líneas no es cobertura de comportamiento: codifica la lección para todo plugin futuro.

## Lecciones

- Un plugin de espacio de nombres y un export por defecto son mutuamente excluyentes con el Loader de Cordis. Elegir la forma de espacio de nombres (`name`/`inject`/`Config`/`apply`) y no añadir `export default`: `unwrapExports` descartará el espacio de nombres.
- Para un servicio que un plugin lee de forma oportunista pero NO declara en `static inject`, usar `ctx.get(name)`, nunca `ctx.<name>`. El proxy de propiedad resuelve mediante un recorrido de fibers solo hacia ancestros que falla a través de un shadow ajeno; `ctx.get(name)` es la búsqueda independiente de la topología (y estricta por defecto: un backend inactivo se lee como `undefined` en lugar de entregarse a mitad de un desmontaje).
- Una prueba que construye un plugin a mano no puede validar cómo se carga el plugin. Al menos una prueba debe recorrer la ruta real del Loader y los exports de extremo a extremo. Cuando la operación principal no llama al modelo, esa prueba no necesita clave de API, así que pertenece a CI, no detrás de una puerta de clave.
- Confiar en la traza, no en la teoría. La elegante explicación del shadow era real pero era el *segundo* bug; el *primero* era un error de export de una línea que un `console.error` en el recorrido de fibers encontró en minutos tras horas de razonamiento plausible pero equivocado.
