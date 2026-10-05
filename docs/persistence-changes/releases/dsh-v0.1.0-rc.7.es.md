---
description: "Tipos de persistencia de sesión retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.0-rc.7."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.0-rc.7

[English](dsh-v0.1.0-rc.7.md) | Español

## Resumen

El replayState de assistant/chunk cambia de unknown a un objeto con response obligatorio y blocks opcional. El formato de escritura sigue siendo 0.

## Índice

- [Evidencia de la versión](#evidence)
- [Declaración](#declaration)
- [Cambios estructurales](#changes)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

-----

<a id="evidence"></a>
## Evidencia de la versión

Este relleno retrospectivo aproximado respalda la lectura y la validación del formato; no es un reconocimiento de compatibilidad contemporáneo. Consultar la [referencia del archivo histórico](README.es.md) para conocer los límites de extracción y cobertura.

| Elemento | Valor registrado |
|---|---|
| Tag de origen | `dsh-v0.1.0-rc.7` |
| Fecha de origen | 2026-08-17T11:03:17.000Z |
| Registro de la versión | Objeto de versión presente. |
| Versión anterior | [dsh-v0.1.0-rc.6](dsh-v0.1.0-rc.6.es.md) |
| Versión del escritor de sesión | 0 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->47 raíces / 376 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.0-rc.7.schema.json](dsh-v0.1.0-rc.7.schema.json) |

Evidencia de origen de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 0`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.0-rc.7
previous: dsh-v0.1.0-rc.6
sessionFormatVersion: 0
changes:
  - root: event:assistant/chunk
    before: 7fd942b2189b8dbf6e1a2c7b026e9ddd1e7dba3fbe5645708a76f4cddabb281d
    after: de04e4ae000cc4422a15fb86dce7c398c8a9970ac963b6f7f785e2276a939e62
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Se detectaron 1 raíces cambiadas y 1 diferencias estructurales. Los mínimos de la tabla se calculan con las reglas actuales solo a efectos de comparación; no afirman cumplimiento histórico ni corrección de migración o compatibilidad en runtime.

| Ruta | Cambio | Mínimo actual |
|---|---|---|
| `event:assistant/chunk.data.chunk.replayState` | `type-changed` | `version-bump` |

<!-- persistence-release-changes:end -->

<a id="verification"></a>
## Verificación

La extracción superó la validación del grafo canónico, del hash de raíz y del hash de tipos alcanzables, y permitió el `surfaceOp` opcional original únicamente para los eventos de superficie históricos. La verificación del repositorio reconstruye cada tag a partir de su predecesor y comprueba los valores before/after, la cobertura de snapshots y las declaraciones de máquina bilingües.

```sh
pnpm run verify-persistence-releases
```

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
