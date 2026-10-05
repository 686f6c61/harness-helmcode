# MCP

[English](mcp.md) | Español

## Resumen

Model Context Protocol (MCP) conecta el modelo con tools suministradas por servidores externos. Cada servidor configurado aporta tools ordinarias del harness con cancelación, comprobaciones de permisos, resultados registrados y salida de imágenes soportada. Las tools compartidas descubren y leen recursos cuando hay un servidor configurado en el ámbito del llamante, mientras que las instrucciones del servidor se incorporan al prompt del sistema registrado. El SDK oficial negocia revisiones del protocolo modernas o revisiones heredadas soportadas. Esta referencia cubre las responsabilidades, el alcance y las decisiones de composición del grupo de paquetes MCP; el [README del cliente](../../packages/mcp/mcp-client/README.md) es dueño de la configuración de servidores.

## Tabla de contenidos

- [Configuración](#configuration)
- [Responsabilidades y alcance](#responsibilities-and-scope)
- [Protocolo y resultados](#protocol-and-results)
- [Recursos e instrucciones](#resources-and-instructions)
- [Tipos de proveedor de recursos](#resource-provider-types)
- [Límites](#limits)
- [Lectura adicional](#further-reading)

-----

<a id="configuration"></a>
## Configuración

Los servidores MCP son opt-in. Configurar una entrada de `@deepseek-ai/dsh-mcp-client` por servidor en el ámbito de Cordis previsto. Cada perfil distribuido suministra el [registry de tools](tools.es.md) y monta el servicio de recursos compartido una vez; los usuarios solo configuran entradas de cliente. Los llamantes sin ningún servidor configurado visible no reciben texto de prompt ni tools de MCP en modo nativo ni en modo PTC.

| Elección | Responsable de la configuración |
|---|---|
| Identidad del servidor, proceso local o endpoint HTTP, credenciales y entorno del proceso | [Configuración del cliente](../../packages/mcp/mcp-client/README.md#use-this-package) |
| Timeout de solicitudes de tools y recursos, política de fallos de arranque y reconexión | [Configuración del cliente](../../packages/mcp/mcp-client/README.md#use-this-package) |
| Descubrimiento y lectura de recursos | El [servicio de recursos MCP](../../packages/mcp/mcp-resources/README.md#use-this-package) está incluido en los perfiles distribuidos; no tiene campos de configuración |
| Límite de tamaño de las instrucciones del servidor | `maxInstructionBytes` del cliente; la composición suministra el [ensamblado del prompt del sistema](system-prompt.es.md) |
| Decisiones de permisos y salida de imágenes soportada | [Ejecución de tools](tools.es.md) y [adjuntos](attachment.es.md) |

La negociación de protocolo sigue las revisiones soportadas del SDK; no hay ningún ajuste de producto que fuerce una revisión del protocolo. El [catálogo de configuración](../config-catalog.es.md#deepseek-aidsh-mcp-client) lista los campos de cliente aceptados y sus valores por defecto.

-----

<a id="responsibilities-and-scope"></a>
## Responsabilidades y alcance

El cliente es un plugin de conexión por servidor y un consumidor del registry de tools del harness. No publica un servicio compartido `ctx.mcp`. El servidor externo implementa las operaciones MCP; el SDK es dueño del intercambio de protocolo; el cliente adapta las tools descubiertas a la ejecución del harness.

`mcp-resources` es dueño de las tools de recursos compartidas y selecciona proveedores en el ámbito del llamante. Cada cliente MCP suministra operaciones de recursos a través de su propia conexión. El primer proveedor de un ámbito habilita las tools compartidas locales, y eliminar el último las elimina; los proveedores heredados siguen siendo visibles. El servicio es dueño de estos registros de tools independientemente de cualquier cliente concreto. Los fallos de conexión no eliminan las tools de recursos compartidas mientras una entrada de cliente visible siga activa.

El `serverName` configurado identifica un servidor en su ámbito de registro. Dos entradas en ese ámbito no pueden reservar el mismo nombre; ámbitos de Agent separados pueden reutilizarlo. Los nombres públicos de las tools incluyen el nombre del servidor configurado, de modo que tools con el mismo nombre procedentes de servidores distintos siguen siendo distintas. Los efectos de registro son dueños de los nombres y de las tools descubiertas; el dispose (liberación de recursos) del plugin cierra la conexión y elimina sus contribuciones.

El [proveedor nativo Cua Driver](../../packages/experimental/computer-use-cua-driver-native/README.md) comparte el adaptador de resultados exportado del cliente sin abrir una conexión MCP. La selección de proveedores de escritorio pertenece al [subsistema computer-use](computer-use.es.md).

-----

<a id="protocol-and-results"></a>
## Protocolo y resultados

Tanto stdio como Streamable HTTP usan la negociación, el descubrimiento, la validación de protocolo y la cancelación del SDK oficial. Los cambios en la lista de tools desencadenan el descubrimiento mediante notificaciones heredadas o una suscripción moderna. Una actualización fallida conserva la generación de tools anterior; la recuperación de la conexión sigue el [ciclo de vida del cliente](../../packages/mcp/mcp-client/README.md#use-this-package).

El adaptador de resultados conserva el JSON canónico de MCP para los llamantes programáticos y prepara contenido de tool ordinario. Las imágenes soportadas usan el sistema de adjuntos; el contenido enriquecido no soportado produce diagnósticos de texto explícitos. El registry de tools sigue siendo autoritativo para los fallos de política y los resultados reemplazados. Los [contratos de tools](tools.es.md) son dueños del registro y la presentación final; la [referencia de resultados del cliente](../../packages/mcp/mcp-client/README.md#use-this-package) es dueña de los detalles de proyección específicos de MCP.

-----

<a id="resources-and-instructions"></a>
## Recursos e instrucciones

Las llamadas a recursos requieren un nombre de servidor configurado explícito. Cuando el ensamblado del prompt del sistema está disponible, el servicio de recursos lista los nombres visibles para el llamante desde el mismo registry usado para el despacho, incluidos los servidores sin tools ni instrucciones. El registry compartido resuelve ese nombre en el ámbito del Agent llamante antes del despacho; los servidores no disponibles fallan sin solicitud de red. El descubrimiento y las lecturas son bajo demanda, incluso para servidores que exponen recursos sin tools. El [paquete de recursos](../../packages/mcp/mcp-resources/README.md) es dueño de la paginación y el renderizado de contenido; sus schemas de tool generados viven en el [catálogo de tools](../tool-catalog.es.md#deepseek-aidsh-mcp-resources).

Los proveedores de recursos siguen perteneciendo a la conexión. El dispose del ámbito elimina los registros; el cliente MCP controla la cancelación y la recuperación. Los resultados canónicos conservan el JSON completo para los llamantes programáticos, mientras que la proyección de texto reemplaza los blobs binarios por descripciones. El texto devuelto entra en el historial ordinario de tools; el contenido no se descarga solo porque un servidor se conecte.

Cuando el ensamblado del prompt del sistema está compuesto, el cliente publica las instrucciones no vacías del servidor como una sección de ámbito atribuida al servidor. Las instrucciones siguen siendo texto literal y pasan el límite de tamaño configurado antes de publicarse. Una conexión de reemplazo publica las instrucciones solo después de que el descubrimiento tenga éxito; las instrucciones ausentes no añaden ninguna sección. El [subsistema system-prompt](system-prompt.es.md) es dueño del ensamblado y el registro.

-----

<a id="resource-provider-types"></a>
## Tipos de proveedor de recursos

El proveedor de conexión recibe una operación y la ejecución de tool original, incluidos su llamante y su señal de cancelación.

```ts type-equiv
/** One supported resource operation, with server-owned cursors and URIs. */
type McpResourceRequest =
  | { method: 'resources/list' | 'resources/templates/list'; cursor?: string }
  | { method: 'resources/read'; uri: string }
```

```ts type-equiv
/** One configured server's resource access, owned by its MCP connection plugin. */
interface McpResourceProvider {
  /**
   * Run an operation against one live connection generation.
   * @param request - MCP resource method and parameters.
   * @param exec - caller identity and cancellation for this invocation.
   * @returns the protocol result as lossless JSON.
   */
  request(request: McpResourceRequest, exec: ToolExecution): Promise<JsonValue>
}
```

-----

<a id="limits"></a>
## Límites

Las plantillas de prompt de MCP, la obtención de entrada humana, la ejecución basada en tareas y las suscripciones a recursos no están soportadas. Las tools de recursos requieren un servidor configurado visible para el llamante; los recursos binarios siguen siendo datos programáticos con descripciones de texto para el modelo. Los servidores sin capacidad de tools se conectan con un conjunto de tools vacío. Los timeouts de conexión y descubrimiento siguen al SDK; el cliente no tiene ajustes separados para ellos.

-----

<a id="further-reading"></a>
## Lectura adicional

- [Grupo de paquetes MCP](../../packages/mcp/README.md): puntos de entrada de los paquetes.
- [Recursos MCP](../../packages/mcp/mcp-resources/README.md): tools compartidas y semántica de los proveedores de recursos.
- [Decisión de visibilidad de recursos](../../.agents/notes/implemented/feature/2026-09-13-mcp-resources-in-profiles.md): montaje compartido en perfiles y visibilidad desde servidores configurados.
- [Servidores de memoria de terceros](../user/guide/mcp-memory.es.md): guía de configuración del producto.
- [Decisión de negociación de protocolo](../../.agents/notes/implemented/feature/2026-09-12-mcp-sdk-protocol-negotiation.md): titularidad del SDK y decisiones de compatibilidad.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.es.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxmcpresources--mcpresourceruntime"></a>

### `ctx.mcpResources` — `McpResourceRuntime`

Scoped resource access plus three tools shared by configured MCP servers.

```ts cordis-catalog
/**
 * Register one server and expose resource tools while that scope has providers.
 * @param server - configured server name, unique in this scope.
 * @param provider - connection-owned resource operations.
 * @returns the effect disposer for this exact registration.
 */
register(server: string, provider: McpResourceProvider): () => void
```

Source: [`packages/mcp/mcp-resources/src/index.ts`](../../packages/mcp/mcp-resources/src/index.ts)
<!-- END GENERATED cordis-surface -->
