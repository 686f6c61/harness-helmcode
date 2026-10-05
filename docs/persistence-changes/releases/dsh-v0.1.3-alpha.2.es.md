---
description: "Tipos de persistencia de sesión retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.3-alpha.2."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.3-alpha.2

[English](dsh-v0.1.3-alpha.2.md) | Español

## Resumen

Se añaden feedback/message-put y feedback/message-delete sin cambiar los hashes de raíces de persistencia existentes. El formato de escritura sigue siendo 2.

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
| Tag de origen | `dsh-v0.1.3-alpha.2` |
| Fecha de origen | 2026-09-07T11:45:35.000Z |
| Registro de la versión | Objeto de versión presente. |
| Versión anterior | [dsh-v0.1.3-alpha.1](dsh-v0.1.3-alpha.1.es.md) |
| Versión del escritor de sesión | 2 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->56 raíces / 435 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.3-alpha.2.schema.json](dsh-v0.1.3-alpha.2.schema.json) |

Evidencia de origen de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 2`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.3-alpha.2
previous: dsh-v0.1.3-alpha.1
sessionFormatVersion: 2
changes:
  - root: event:feedback/message-delete
    before: null
    after: 3ee93b06f3a125850337602bcdf155d2538c43a5c944ec55b1b3c365152d6796
  - root: event:feedback/message-put
    before: null
    after: 3b04fde0dc763cf84fbde7b6611b3194dd56d95d0c0bf0204311640468d586e1
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Se detectaron 2 raíces cambiadas y 2 diferencias estructurales. Los mínimos de la tabla se calculan con las reglas actuales solo a efectos de comparación; no afirman cumplimiento histórico ni corrección de migración o compatibilidad en runtime.

| Ruta | Cambio | Mínimo actual |
|---|---|---|
| `event:feedback/message-delete` | `root-added` | `same-version` |
| `event:feedback/message-put` | `root-added` | `same-version` |

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
