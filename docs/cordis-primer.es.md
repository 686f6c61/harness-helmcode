# Introducción a Cordis

[English](cordis-primer.md) | Español

Cordis es el framework de plugins vendorizado que está por debajo de DeepSeek Harness. Esta introducción enseña las ideas de Cordis que un autor de plugins del harness necesita antes de leer la referencia generada de servicios y eventos en las [páginas de subsistemas](subsystems/core.es.md); el [tutorial de Cordis](cordis-tutorial/index.es.md) recorre las mismas ideas de forma práctica. El código fuente vendorizado y el procedimiento de sincronización están en [vendor/README.md](../vendor/README.md).

## Cordis en cinco ideas

- **Un plugin es un objeto que implementa Service.** Puede ser una función con los campos opcionales `inject` y `apply(ctx)`, o una subclase de `Service` cuyo ciclo de vida Cordis monta en el contexto actual.
- **Un contexto es un repositorio de servicios.** Un servicio reclama un `ctx.<key>` estable, como `ctx.tools`, `ctx.llm` o `ctx.sessions`, a partir de un contexto; los demás plugins encuentran los servicios por clave en lugar de importar una implementación concreta.
- **Declarar la dependencia de servicios mediante `inject`.** Un plugin que nombra los servicios requeridos espera hasta que esos servicios existen, de modo que el orden de carga se expresa mediante requisitos de servicios en lugar de una secuencia de arranque manual.
- **Eventos tipados para la comunicación.** Los servicios declaran nombres de eventos mediante la fusión de declaraciones de TypeScript, y después los despachan como `emit`, `waterfall`, `parallel`, `serial` o `bail` según si los listeners observan, envuelven, se ramifican en paralelo, se ejecutan en orden o se detienen en el primer valor bail.
- **Los registros son efectos reversibles.** Las secciones de prompt, los schemas de tools, los adaptadores, los proveedores y los listeners se instalan mediante `ctx.effect()` o `ctx.on()` para que la recarga y el desmontaje los deshagan de forma predecible.

<a id="dispatch-modes"></a>

## Modos de despacho

Cada evento puede tener uno de los siguientes modos de despacho y solo puede despacharse con los métodos correspondientes.

| Modo | ¿Se espera? | Orden de despacho | ¿Tiene valor de retorno? |
|---|---|---|---|
| `emit` | No | los listeners observan en orden de registro | No |
| `waterfall` | No | los listeners observan en orden de registro | Sí |
| `parallel` | Sí | todos los listeners observan el evento en paralelo | No |
| `serial` | Sí | los listeners observan en orden de registro | Sí |
| `bail` | No | los listeners observan en orden de registro hasta que uno devuelve bail | Sí |

El modo de despacho forma parte del contrato público del evento. Los eventos nuevos del harness lo documentan con una etiqueta `@mode` para que el catálogo generado pueda comprobar las declaraciones contra los puntos de despacho.

<a id="cordis-waterfall-semantics"></a>

## Semántica del waterfall de Cordis

`ctx.waterfall` es middleware de envoltura. Un listener recibe `(...args, next)`. Llamar a `next()` delega el resultado, posiblemente envuelto, al siguiente servicio; devolver sin `next()` cortocircuita. Los valores se propagan a través del valor de retorno de `next()`.

Los listeners cooperativos normalmente mutan un objeto de solicitud o de decisión compartido y después delegan. Un listener también puede optar por reemplazar el resultado por completo, y los listeners posteriores solo verán el resultado después del reemplazo. Usar `prepend: true` solo cuando el listener deba ejecutarse antes que los registros ordinarios.

Para los eventos de decisión única, el cortocircuito es el diseño previsto. Un listener de política puede devolver sin `next()` cuando posee la decisión, mientras que un listener que solo anota u observa debe delegar.

<a id="loader-configuration"></a>

## Configuración del loader

`@deepseek-ai/cordis-plugin-include` analiza `!!js` como nodos de expresión. El loader interpola el campo `config` de una entrada (después de que las inyecciones declaradas se activen, contra el contexto de ese plugin, `ctx.serviceName`) y su campo `disabled` (en cada decisión de montaje, contra el contexto del loader); Include conserva las expresiones de filas anidadas hasta la activación del objetivo. El resto de los metadatos de la entrada permanece literal. Usar overlays cuando el entorno selecciona los plugins.

## Reglas prácticas

Encapsular el comportamiento en plugins: un evento del pipeline de tools pertenece a `ctx.tools`, el flujo de modelos pertenece a `ctx.llm`, y la coordinación de agents en vivo pertenece a `ctx.agents`. Preferir los eventos para la interceptación y las políticas; preferir los métodos de servicio para las llamadas directas a capacidades.

Cada registro debería tener un disposer (función de liberación de recursos), ya sea devolviendo uno desde `ctx.effect()` o usando un helper de Cordis que lo haga automáticamente. Si el orden de desmontaje importa, mantener el trabajo relacionado en un solo efecto para que la liberación se deshaga en la secuencia prevista.
