# Uso del navegador

[English](browser-use.md) | Español

El uso del navegador permite a un modelo inspeccionar y operar páginas web a través de un backend configurado. DSH es dueño del bucle de tareas; el proveedor suministra las operaciones de navegador y conserva el estado del navegador entre turnos de una sesión en vivo.

## Elegir un proveedor

Montar [`dsh-browser-use`](../../packages/browser-use/browser-use/README.md) y un proveedor en la misma composición. Los proveedores son paquetes NPM públicos experimentales y requieren activación explícita. Su motor de navegador inicial es Chromium.

| Proveedor | Integración |
|---|---|
| [Playwright MCP](../../packages/experimental/browser-use-playwright-mcp/README.md) | Tools MCP de control de navegador de Playwright |
| [Chrome DevTools MCP](../../packages/experimental/browser-use-chrome-devtools-mcp/README.md) | Inspección y control de Chrome DevTools a través de MCP |
| [Stagehand](../../packages/experimental/browser-use-stagehand-native/README.md) | Operaciones de navegador nativas con acciones, observación y extracción asistidas por AI (inteligencia artificial) |

El servicio compartido registra solo un nombre y rechaza cualquier segundo proveedor, incluida otra instancia con el mismo nombre. No tiene métodos comunes de operación de navegador, recursos de navegador ni selector controlado por el modelo. La configuración del proveedor en un perfil o preset selecciona lanzamiento o attach para esa activación.

## Propiedad de la sesión

Un navegador lanzado pertenece al Agent y a la sesión en vivo exactos que lo usan. Las llamadas entre turnos reutilizan ese navegador. El dispose del runtime de sesión cierra sus recursos lanzados; recargar una sesión o hacerle fork inicia un estado de navegador nuevo. Los perfiles de navegador y el estado de inicio de sesión no se restauran desde el registro de sesión.

Un navegador en modo attach sigue siendo de propiedad externa. El proveedor lo reserva para una sesión dentro de esa instancia del proveedor, conserva su estado de navegador existente y rechaza el attach simultáneo por parte de otra sesión. El desmontaje desconecta y deja el navegador externo en ejecución. Los procesos DSH separados y otros clientes quedan fuera de esta reserva.

El apagado del proveedor detiene la admisión de tools y espera al trabajo propio y a la limpieza de recursos antes de liberar el registro de proveedor compartido. La cancelación no puede deshacer una acción de navegador ya entregada.

## Inicialización de MCP

Un proveedor MCP inicializa un cliente para cada Agent en vivo creado después de que el proveedor se carga. El evento serial existente `agent/created` espera a la conexión y el descubrimiento antes de que la creación o la reanudación se completen y la entrada encolada se ejecute. El cliente permanece con la sesión entre turnos. Un fallo de arranque o una cancelación rechaza la creación o la reanudación y dispara la limpieza del cliente.

Si un attach está ocupado, esa activación continúa sin el navegador y no reintenta en turnos posteriores. Tras la liberación, una activación recién creada o reanudada puede adquirirlo. Cargar o recargar el proveedor no adopta sesiones ya activas; el [runtime compartido](../../packages/experimental/browser-use-runtime/README.md) es dueño de estas reglas de inicialización.

## Tools y resultados registrados

Las tools del proveedor usan el pipeline de ejecución y el registro de sesión normales de DSH. Los proveedores son dueños de sus schemas de tool, el renderizado de resultados, el soporte de imágenes, la configuración y las limitaciones del upstream; el servicio compartido no añade contenido visible para el modelo. Las operaciones asistidas por AI de Stagehand usan su modelo nativo configurado explícitamente mientras DSH conserva el bucle de tareas. El enrutado de modelos de DSH, la reutilización de credenciales, la captura subyacente de solicitud/respuesta de inferencia (inference) y la integración en la contabilidad de uso de sesión están diferidos; los datos y metadatos SDK devueltos siguen siendo resultados de tool registrados ordinarios.

Las conexiones MCP de navegador también exponen [recursos e instrucciones de servidor](mcp.es.md). Las llamadas a recursos dirigidas a un servidor de navegador usan su cola de sesión y rechazan otras sesiones; las instrucciones de servidor se ensamblan solo para su sesión propietaria.

El [registro de decisión](../../.agents/notes/implemented/architecture/2026-09-12-browser-use-provider-registration.md) explica el servicio de solo registro y la propiedad por sesión.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxbrowseruse--browseruseregistry"></a>

### `ctx.browserUse` — `BrowserUseRegistry`

Owns one optional provider registration in the shared browser-use service.

```ts cordis-catalog
/**
 * Reserve the sole provider slot until the contribution is disposed.
 * A second registration fails even when it repeats the current name. Providers
 * must stop their tools and await owned work before releasing this registration.
 * @param name - provider-owned name used in registration diagnostics.
 * @returns the effect disposer for this exact registration.
 */
register(name: BrowserUseProviderName): () => Promise<void>
```

Source: [`packages/browser-use/browser-use/src/index.ts`](../../packages/browser-use/browser-use/src/index.ts)
<!-- END GENERATED cordis-surface -->
