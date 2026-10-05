# Manual de referencia: añadir un paquete vendored

[English](adding-a-vendored-package.md) | Español

Cuando el harness necesita otro paquete de Cordis upstream (p. ej. `@cordisjs/plugin-http`), se **vendoriza** como fuente fijada bajo `vendor/`, no se añade como dependencia de npm. [vendor/README.md](../../vendor/README.md) explica por qué y cubre la *actualización* de un paquete ya vendorizado; esta guía es la lista de verificación archivo por archivo para añadir uno **nuevo**. (Verificada contra el conjunto vendored existente; si diverge, corregirla aquí.)

## 1. Copiar el fuente

```
vendor/<dir>/
  package.json     # from upstream; rescope the name, keep exports/type (publishable release member, no private flag)
  tsconfig.json    # extends ../../tsconfig.base.json (see configuration below)
  src/             # the upstream src/ verbatim
  README.md LICENSE # if upstream ships them
```

`tsconfig.json` refleja los de los demás paquetes vendored: `rootDir: src`, `outDir: lib/types`, las relajaciones de rigurosidad que el código upstream necesita, y una entrada en `references` por cada otro paquete vendored que importa:

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src", "outDir": "lib/types",
    "noUncheckedIndexedAccess": false, "exactOptionalPropertyTypes": false,
    "noImplicitOverride": false, "noUnusedLocals": false, "noUnusedParameters": false
  },
  "include": ["src"],
  "references": [{ "path": "../cordis" }, { "path": "../cosmokit" }]
}
```

Invariantes de `package.json`: cambiar el scope del `name` ([mapeo](../rescope.es.md)) conservando los `exports`/`type` de upstream, apuntar los metadatos de declaraciones a `lib/types`, publicar las salidas de declaración `.d.ts` y `.d.ts.map`, y listar sus dependencias de cordis en `peerDependencies` (coincidiendo con el manifest upstream). Los paquetes vendored son miembros publicables de la publicación, así que NO deben establecer `private: true` y deben establecer `publishConfig.access: public`; el campo `version` sigue la secuencia de publicación del harness (véase [vendor/README.md](../../vendor/README.md)). Las dependencias transitivas de upstream deben estar a su vez vendorizadas o ya presentes: vendorizar un paquete a menudo significa vendorizar su árbol de dependencias (p. ej. `@cordisjs/plugin-http` arrastra `@cordisjs/fetch-file`).

Los imports/exports relativos locales en el fuente TypeScript vendorizado usan especificadores `.ts` explícitos tras la copia. Esta es una diferencia de compilación local del repositorio respecto a upstream: `rewriteRelativeImportExtensions` emite imports `.js` en runtime mientras las declaraciones conservan especificadores `.ts` explícitos que los consumidores de TypeScript NodeNext/Node16 pueden resolver.

## 2. Registrarlo en las configuraciones raíz

| Archivo | Cambio |
|---|---|
| `tsconfig.base.json` | añadir `"<npm-name>": ["./vendor/<dir>/src"]` a `paths` |
| `tsconfig.host.json` | añadir `{ "path": "./vendor/<dir>" }` a `references` (antes de las entradas `packages/*`; el código vendored entra en el grafo solo a través del agregado host) |
| `vendor/README.md` | añadir una fila a la tabla del manifest (lista de metadatos) (dir, nombre npm, versión, repositorio upstream, SHA de commit) y registrar cualquier modificación local |
| `scripts/publint-all.ts` | solo si el propio paquete vendored se publica desde aquí (las dependencias vendored normalmente no lo son: omitir) |

Cubierto automáticamente por globs, sin ediciones necesarias: los workspaces del `package.json` raíz (`vendor/*`), `tsdown.config.ts`, `vitest.config.ts`, `.oxlintrc.json`. Un `vendor/<dir>/tsdown.config.ts` por paquete solo es necesario SI la configuración de compilación difiere de la del root por defecto (ESM/CJS dual o múltiples entradas: véanse `vendor/schemastery` y `vendor/logger-console`); su entrada debe leer el JS emitido bajo `lib/types`.

## 3. Atender al guardián del manifest

`scripts/check-vendor-manifest.sh` (un hook de pre-commit) falla si algo bajo `vendor/*/src` está en stage sin que `vendor/README.md` también lo esté. Poner en stage la actualización del manifest junto al fuente para que el commit pase.

## 4. Verificar

```sh
pnpm install        # registers the workspace
pnpm run typecheck
pnpm run build && pnpm run constraints
```

Ejecutar las comprobaciones de comportamiento que selecciona la [política de testing](../testing.es.md). El mapa `paths` del fuente vive una sola vez en `tsconfig.base.json` y sirve a todos los grafos. El límite de aislamiento importante es el grafo de referencias de proyecto: el fuente vendored debe referenciarse a través de su propio `vendor/<dir>/tsconfig.json`, no incorporarse al programa estricto de un agregado ([layout](../development.es.md#typescript-project-layout)).
