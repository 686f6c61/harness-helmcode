# Tutorial de Cordis

[English](index.md) | Español

Cordis es el framework de plugins que está debajo de DeepSeek Harness: un runtime pequeño donde cada capacidad (tools, adaptadores de LLM (modelo de lenguaje grande), acceso a archivos, el propio agent loop (bucle de agent)) es un plugin montado en un contexto compartido. Este tutorial enseña Cordis de forma práctica: cada capítulo es un ejemplo ejecutable que se construye en un directorio temporal dentro de este repositorio, y termina con un plugin conectado a servicios reales del harness.

El público son los desarrolladores de agents. No hace falta experiencia profunda en TypeScript: las [notas de TypeScript](#typescript-notes) de más abajo explican la sintaxis que puede resultar desconocida, y cada capítulo muestra los comandos exactos y la salida esperada.

Si se prefiere la referencia condensada de conceptos en lugar de un recorrido guiado, leer la [introducción a Cordis](../cordis-primer.es.md). La referencia exhaustiva de la API vive en las regiones `cordis-surface` generadas de las [páginas de subsistemas](../subsystems/core.es.md) y en las páginas de la [API principal de Cordis](../cordis-api/context.es.md).

Para escribir plugins para el propio harness (cargados desde un `cordis.yml` y dirigidos desde la Web UI en lugar del lanzador de más abajo), empezar por [tu primer plugin de Harness](../user/develop/basic/index.es.md).

<a id="setup"></a>

## Preparación

Se necesita un clon de este repositorio con las dependencias instaladas; la [guía de desarrollo](../development.es.md#setup-tutorial) lista los prerrequisitos. No se necesita ninguna clave de API para este tutorial; todos los ejemplos se ejecutan sin clave.

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
```

Crear el directorio temporal en el que trabajan los capítulos. `tmp/` está ignorado por git, así que nada de lo que se escriba ahí toca el control de versiones:

```sh
mkdir -p tmp/cordis-tutorial
cd tmp/cordis-tutorial
```

Todos los capítulos ejecutan el mismo comando desde este directorio:

```sh
node --import tsx ../../vendor/cordis/bin.js
```

Ese lanzador de un solo archivo (véase [vendor/cordis/bin.js](../../vendor/cordis/bin.js)) crea un `Context` raíz, monta el plugin Loader y le indica que cargue `./cordis.yml` desde el directorio actual. Todo lo demás (qué plugins existen, cómo se configuran) proviene de ese archivo YAML, que se escribirá en un momento. El flag `--import tsx` permite a Node ejecutar los archivos TypeScript a los que apunta la configuración sin un paso de compilación.

## Capítulos

1. [Tu primer plugin](01-first-plugin.es.md): un plugin es una función; el loader lo monta.
2. [Ciclo de vida y efectos](02-lifecycle-and-effects.es.md): los registros gestionados por Cordis se deshacen cuando su plugin se descarga.
3. [Servicios](03-services.es.md): exponer una capacidad en `ctx` y depender de ella con `inject`.
4. [Eventos](04-events.es.md): eventos tipados, despacho por difusión y el cortocircuito de waterfall.
5. [Configuración](05-config.es.md): configuración validada desde `cordis.yml`, con fallo en voz alta ante entradas inválidas.
6. [Composición y HMR](06-composition-and-hmr.es.md): el archivo de configuración como árbol de plugins, la recarga en caliente y el diagnóstico de un plugin que nunca carga.
7. [Dentro del harness](07-into-the-harness.es.md): registrar un tool invocable por el modelo contra servicios reales del harness.

<a id="typescript-notes"></a>

## Notas de TypeScript

Los ejemplos usan tres funcionalidades de TypeScript más allá del JavaScript moderno habitual:

- Las **anotaciones de tipo** describen valores sin cambiar el comportamiento en runtime: `ctx: Context` dice que `ctx` tiene la API de contexto de Cordis, `who: string` acepta texto, y `string[]` significa un array de strings.
- **`import type { Context } from '@deepseek-ai/cordis'`** importa solo información de tipos. Desaparece en runtime, así que un archivo de plugin que necesita `Context` únicamente para anotaciones no añade ninguna dependencia en runtime.
- La **fusión de declaraciones** (`declare module '@deepseek-ai/cordis' { ... }`) añade tus entradas a interfaces que Cordis ya declara, por ejemplo el tipo de una nueva propiedad `ctx.greeter` o un nombre de evento. No genera ningún cableado en runtime; el plugin provee el servicio o emite el evento por separado. El capítulo 3 muestra el patrón completo.

El capítulo 5 también usa una `interface` para describir los campos de un objeto de configuración y un tipo genérico como `Schema<Config>` para decir qué campos de objeto valida un schema. Esas declaraciones se pueden copiar tal cual se muestran; el texto que las rodea explica qué conecta cada una.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
