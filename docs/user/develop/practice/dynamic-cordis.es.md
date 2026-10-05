# Configurar plugins persistentes desde un prompt

[English](dynamic-cordis.md) | Español

El modo Creator proporciona [Plugin Manager](../../../../packages/boot/plugin-manager/README.md) e [inspección del runtime](../../../../packages/extensions/tool-cordis/README.md) de solo lectura. La configuración de plugins pertenece al perfil actual, afecta a sus sesiones y sobrevive a los reinicios del proceso.

## Conectar un servidor MCP

Iniciar el perfil Web y seleccionar el modo Creator. Con un servidor MCP Streamable HTTP accesible que exponga `ping`, enviar este prompt usando su endpoint real:

> Configura el servidor MCP de `<endpoint>` en este perfil como `demo`. Haz que sus tools estén disponibles ahora, luego llama a su tool ping y dime el resultado.

El agent (agente) escribe un bundle de solo configuración cuyo parche inserta `@deepseek-ai/dsh-mcp-client` y luego lo instala con `plugin_manager install_bundle`. Con HMR (reemplazo de módulos en caliente) activado, las tools aparecen en la misma sesión en ejecución. Verificar tanto el resultado de gestión (`application: applied`) como una llamada `mcp__demo__ping` exitosa. Una entrada guardada con `restart-required` aún no se ha activado; una entrada fallida necesita reparación de la configuración.

Leer el parche del bundle antes de editar su configuración. Usar Plugin Manager para desactivar entradas o eliminar el bundle. Consultar la [referencia del cliente MCP](../../../../packages/mcp/mcp-client/README.md) para la configuración aceptada y el comportamiento ante fallos de conexión.
