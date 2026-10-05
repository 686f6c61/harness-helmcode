# Conectar un servidor MCP de memoria de terceros

[English](mcp-memory.md) | Español

Estas tres **configuraciones de referencia desactivadas por defecto** conectan un sistema de memoria a DSH a través de [`@deepseek-ai/dsh-mcp-client`](../../../packages/mcp/mcp-client/README.md). Elegir una, o copiar la misma fila MCP genérica para otro servidor.

Estas configuraciones de terceros se proporcionan únicamente como ejemplos de interoperabilidad. Su inclusión no implica respaldo, recomendación, asociación ni soporte continuado por parte de DeepSeek.

## Qué hace DSH

DSH analiza el overlay de Cordis seleccionado, inicia un comando stdio configurado o se conecta a una URL Streamable HTTP configurada, descubre las tools MCP y las expone como `mcp__<serverName>__<tool>`. DSH **no** descarga el servidor, inicializa su base de datos, elige su modelo o proveedor de embeddings, crea una cuenta en la nube, migra datos del proveedor ni supervisa un servicio HTTP separado. Para stdio, el cliente genérico lanza y detiene el proceso hijo con el ciclo de vida del plugin de DSH; para HTTP, el servicio ascendente ya debe estar en ejecución.

El puente stdio elimina deliberadamente las variables de entorno cuyos nombres suelen identificar credenciales y todas las variables `DSH_*` antes de lanzar un hijo; las demás variables de entorno se heredan. Cada ejemplo añade solo la sobrescritura mínima que necesita. Si una funcionalidad opcional del upstream necesita otro secreto, añadir esa variable al `config.env` de la fila en lugar de poner el secreto directamente en el YAML.

## Elegir uno

| Sistema | Pin probado | Transporte | Prerrequisito del upstream |
|---|---:|---|---|
| [Memorix](https://github.com/AVIDS2/memorix) | `memorix@1.3.0` (`500792cad3144142293bfbb20acb4841c9f7fcfa`) | stdio | Node 22.18+ y `npm install --global memorix@1.3.0` |
| [MCP Reference Memory](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) | `@modelcontextprotocol/server-memory@2026.7.4` (`6dd0a683e198783e30feabf7abaf42f925bd18b1`) | stdio | `npm install --global @modelcontextprotocol/server-memory@2026.7.4` |
| [Engram](https://github.com/Gentleman-Programming/engram) | `v1.20.0` (`ba9e46ced152c37a7cb9e576153c41995873e2fc`) | stdio | Go 1.25.10+ y `go install github.com/Gentleman-Programming/engram/cmd/engram@v1.20.0`, o el binario de la release correspondiente |

## Activar uno

Pasar un overlay a DSH:

```sh
dsh web --patch "$PWD/apps/cli/config/examples/mcp-memory/memorix.cordis.yml"
```

Sustituir el nombre de archivo por `mcp-reference-memory.cordis.yml` o `engram.cordis.yml`. La ruta puede apuntar a un archivo copiado en cualquier lugar del disco. Ningún servidor de memoria está presente en la composición distribuida, así que omitir `--patch` mantiene los tres desactivados.

Para conservar la selección entre ejecuciones, fusionar el único parche `insert` del archivo elegido en una capa de parche de usuario: `$DSH_HOME/profiles/<name>/cordis.patch.yml` para un perfil, o `$DSH_HOME/cordis.patch.yml` para todos los perfiles de la máquina. No copiar sobre un archivo existente: puede contener ya parches de usuario no relacionados.

## Configuración del proveedor

### Memorix

```sh
npm install --global memorix@1.3.0
dsh web --patch "$PWD/apps/cli/config/examples/mcp-memory/memorix.cordis.yml"
```

Memorix funciona en modo heurístico local sin un LLM ni servicio de embeddings. Configurar los proveedores opcionales en el propio `~/.memorix/config.toml` de Memorix o en el `memorix.toml` del proyecto. El ejemplo conserva la identidad de proyecto Git de Memorix a partir del directorio de trabajo de DSH y usa el valor por defecto `~/.memorix/data` del propio Memorix. Definir `MEMORIX_DATA_DIR` antes de iniciar DSH para sobrescribirlo.

### MCP Reference Memory

```sh
npm install --global @modelcontextprotocol/server-memory@2026.7.4
dsh web --patch "$PWD/apps/cli/config/examples/mcp-memory/mcp-reference-memory.cordis.yml"
```

Este servidor de referencia almacena un grafo de conocimiento local y expone tools de entidad, relación, observación, lectura, búsqueda y apertura. No necesita modelo ni servicio de embeddings. El ejemplo almacena su JSONL en `$HOME/.dsh-mcp-reference-memory.jsonl` en lugar del directorio del paquete npm instalado. Definir `MEMORY_FILE_PATH` antes de iniciar DSH para sobrescribirlo.

La búsqueda es una coincidencia de subcadena sin distinción de mayúsculas sobre nombres, tipos y observaciones de entidades, no una recuperación semántica. El servidor no añade embeddings, resúmenes automáticos, resolución de conflictos ni política de olvido.

### Engram

```sh
go install github.com/Gentleman-Programming/engram/cmd/engram@v1.20.0
dsh web --patch "$PWD/apps/cli/config/examples/mcp-memory/engram.cordis.yml"
```

Engram posee el almacenamiento y la selección de proyecto: usa `~/.engram` por defecto, detecta el proyecto Git a partir del directorio de trabajo de DSH y acepta `ENGRAM_DATA_DIR` o `ENGRAM_PROJECT` como sobrescrituras de entorno.

## Instrucción de modelo compartida opcional

Añadir esta instrucción breve y agnóstica de proveedor a las instrucciones de modelo existentes si las descripciones de las tools del servidor no activan el uso de memoria de forma fiable:

> Cuando el usuario pida recordar algo, llama a una tool de escritura de memoria. Cuando la información histórica pueda ser relevante, busca en la memoria y usa los resultados relevantes.

Es solo una guía aditiva. Los ejemplos no reemplazan la persona del prompt del sistema de DSH.

## Verificar escritura, recuerdo en sesión nueva y uso

Usar un valor único y mantener sin cambios el ámbito de almacenamiento del proveedor durante todo el proceso:

1. En la sesión A de DSH, pedir: `Remember that my validation drink is lapsang-<unique suffix>.` Confirmar que el modelo llamó a la tool de escritura del proveedor y que la tool devolvió éxito.
2. Crear la sesión B de DSH en el mismo Host en ejecución. No copiar la conversación de la sesión A. Preguntar: `What is my validation drink? Check memory.` Confirmar que el modelo llamó a la tool de búsqueda o recuerdo del proveedor y devolvió el valor.
3. Aún en la sesión B, pedir: `Use that preference to suggest one drink for the meeting.` Confirmar que la respuesta usa el valor recordado.

Se requiere una sesión nueva de DSH; no hace falta reiniciar el Host. Un hijo MCP que falla desencadena una reconexión automática con backoff y una resincronización de tools; las tools permanecen listadas y las llamadas fallan solo durante la interrupción y, una vez agotado el presupuesto de reconexión, las tools se desregistran y la reconexión se detiene hasta una recarga o un reinicio. El descubrimiento inicial es asíncrono, así que esperar a que aparezcan las tools `mcp__...` del proveedor antes de enviar el primer prompt de validación.

## Traer otro servidor MCP

Copiar los mismos campos de la entrada y usar un `id` y un `serverName` únicos:

```yaml
- insert:
    - id: memory-my-server
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: my-memory
        transport: stdio
        command: my-memory-mcp
        args: []
        env: {}
        cwd: !!js process.cwd()
```

Para un servidor remoto, usar `transport: streamable-http`, `url` y `headers` en su lugar. La instalación, identidad, autenticación, modelos, embeddings, persistencia y licencias específicas del proveedor siguen siendo responsabilidad del proveedor.
