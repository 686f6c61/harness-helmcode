# Cambio de scope de los paquetes vendored

[English](rescope.md) | Español

El framework Cordis y sus bibliotecas de base están vendored bajo [`vendor/`](../vendor/README.md) y se publican bajo el scope `@deepseek-ai`, porque cada paquete del harness declara el framework como dependencia de pares: publicar el harness publica esta capa con él, y con los nombres de upstream esa publicación ocuparía esos nombres en el registry. Esta página es la tabla de nombres; la decisión y sus consecuencias viven en el [Agent Note del cambio de scope](../.agents/notes/archived/process/2026-08-10-vendor-package-rescope.md), y los commits de upstream en [`vendor/README.md`](../vendor/README.md).

## Tabla de nombres

| Directorio | Nombre de upstream | Nombre publicado | Versión de upstream | Rol |
|---|---|---|---|---|
| `vendor/cordis/` | `cordis` | `@deepseek-ai/cordis` | 4.0.0-rc.7 | Núcleo del framework: `Context`, `Service`, `Fiber`, eventos |
| `vendor/cosmokit/` | `cosmokit` | `@deepseek-ai/cosmokit` | 1.8.1 | Utilidades compartidas sobre las que se construyen el framework y Schemastery |
| `vendor/schemastery/` | `schemastery` | `@deepseek-ai/schemastery` | 3.18.0 | Schemas de configuración (`Schema`) detrás del `Config` de cada plugin |
| `vendor/loader/` | `@cordisjs/plugin-loader` | `@deepseek-ai/cordis-plugin-loader` | 1.0.0-rc.5 | Carga de `cordis.yml`, resolución de plugins, caché de repositorios |
| `vendor/include/` | `@cordisjs/plugin-include` | `@deepseek-ai/cordis-plugin-include` | 1.0.4 | Includes de configuración y overlays de parche |
| `vendor/group/` | `@cordisjs/plugin-group` | `@deepseek-ai/cordis-plugin-group` | 1.0.0 | Grupos anidados de plugins |
| `vendor/timer/` | `@cordisjs/plugin-timer` | `@deepseek-ai/cordis-plugin-timer` | 1.1.2 | Temporizadores conscientes de dispose en `ctx` |
| `vendor/hmr/` | `@cordisjs/plugin-hmr` | `@deepseek-ai/cordis-plugin-hmr` | 1.0.15 | Reemplazo de módulos en caliente para plugins y configuración |
| `vendor/logger-console/` | `@cordisjs/plugin-logger-console` | `@deepseek-ai/cordis-plugin-logger-console` | 1.0.0 | Exportador de logs a consola |

Los exports de subruta conservan su ruta: `@cordisjs/plugin-loader/repository` pasa a ser `@deepseek-ai/cordis-plugin-loader/repository`.

## Lo que el renombrado no toca

- **Nombres de directorio y versiones fuente de upstream.** `vendor/hmr/` sigue siendo `vendor/hmr/`, y la tabla registra la versión de upstream del snapshot fuente fijado, de modo que el manifest se lee como un snapshot de upstream; el campo `version` propio del `package.json` vendored es la versión de manifest publicada por el harness, que `pnpm run release:vendor` incrementa y una resincronización restaura a la versión de upstream.
- **Rangos de dependencias.** Renombrar cambia las claves de dependencia sin cambiar los rangos. Los manifests del workspace usan el protocolo `workspace:`; las [reglas del repositorio](../AGENTS.md#conventions) distinguen las referencias DSH exactas de los rangos con tilde de vendor/native.
- **El prefijo incorporado `cordis:` del Loader.** `cordis:include` y `cordis:group` son un prefijo de protocolo, no un nombre de paquete.
- **La familia de configuración `cordis.yml`**, incluidos `*.cordis.yml`, `*.cordis.snapshot.yml` y `cordis.patch.yml`.
- **Los paquetes del harness cuyos nombres contienen la palabra**, como `@deepseek-ai/dsh-tool-cordis`.
- **Los identificadores de runtime de upstream**, como el `Symbol.for('schemastery')` de Schemastery y su campo de metadatos `vendor:`.
- **La prosa fuera de `docs/`.** `vendor/*/README.md`, los README de paquetes y los Agent Notes conservan los nombres con los que se escribieron; un `cordis` a secas allí también puede ser el nombre de opción del SDK de Python o un id de agent-preset. Dentro de `docs/`, la prosa y cada cerca de Markdown siguen el renombrado.

## Lo que tu código tiene que cambiar

| Sitio | Antes | Después |
|---|---|---|
| Import de módulo | `import { Context } from 'cordis'` | `import { Context } from '@deepseek-ai/cordis'` |
| Fusión de eventos tipados | `declare module 'cordis'` | `declare module '@deepseek-ai/cordis'` |
| Clave de dependencia en `package.json` | `"@cordisjs/plugin-hmr": "^1.0.15"` | `"@deepseek-ai/cordis-plugin-hmr": "^1.0.15"` |
| Entrada de plugin en `cordis.yml` | `name: '@cordisjs/plugin-include'` | `name: '@deepseek-ai/cordis-plugin-include'` |

## Aplicar, verificar y revertir

[`scripts/rescope-vendor.ts`](../scripts/rescope-vendor.ts) posee la tabla anterior y ejecuta el renombrado, de modo que ninguna referencia se renombra a mano:

```sh
pnpm run rescope-vendor            # report what would change
pnpm run rescope-vendor --apply    # rewrite every reference
pnpm run rescope-vendor:check      # assert the post-state; runs in the hygiene gate
pnpm run rescope-vendor --apply --reverse   # return to the upstream names
```

Reaplicarlo tras una sincronización con upstream ([procedimiento](../vendor/README.md)), y seguirlo con la regeneración que imprime: `pnpm install` para el lockfile, `pnpm run gen-third-party-notices` y `pnpm run verify-translation-pairing --write` para los pares bilingües que haya tocado.
