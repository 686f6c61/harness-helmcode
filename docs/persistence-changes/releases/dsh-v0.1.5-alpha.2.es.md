---
description: "Tipos de persistencia de sesión retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.5-alpha.2."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.5-alpha.2

[English](dsh-v0.1.5-alpha.2.md) | Español

## Resumen

Se añaden deliverables/presented y subagent/catalog. Los registros de feedback incorporan la propiedad opcional category, el texto de feedback/record pasa a ser opcional y el formato de escritura sigue siendo 3.

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
| Tag de origen | `dsh-v0.1.5-alpha.2` |
| Fecha de origen | 2026-09-09T14:13:03.000Z |
| Registro de la versión | Objeto de versión presente. |
| Versión anterior | [dsh-v0.1.5-alpha.1](dsh-v0.1.5-alpha.1.es.md) |
| Versión del escritor de sesión | 3 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->59 raíces / 462 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.5-alpha.2.schema.json](dsh-v0.1.5-alpha.2.schema.json) |

Evidencia de origen de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 3`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.5-alpha.2
previous: dsh-v0.1.5-alpha.1
sessionFormatVersion: 3
changes:
  - root: event:deliverables/presented
    before: null
    after: 13d3d180f977bf78081d487ffa0ecb75857349bcab29a5a3fb48189fca2a6176
  - root: event:feedback/message-put
    before: 3b04fde0dc763cf84fbde7b6611b3194dd56d95d0c0bf0204311640468d586e1
    after: b5086d249e8502e9ead1d39156bb8d559bde7951cac0f14ce150345b4e42a2bf
  - root: event:feedback/record
    before: fb9df8180a202f3c845d5aa6a81697b2f7213f6735abc17535a55656be60a575
    after: b54940ff095c17e874c5be03815f4c2145a256cf3a1d34dae4ab2f7769dfffe8
  - root: event:subagent/catalog
    before: null
    after: ae1f7110feeec697b8cab42b68f7709aa7b3279764099dfb53c25890d2e5c871
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Se detectaron 4 raíces cambiadas y 5 diferencias estructurales. Los mínimos de la tabla se calculan con las reglas actuales solo a efectos de comparación; no afirman cumplimiento histórico ni corrección de migración o compatibilidad en runtime.

| Ruta | Cambio | Mínimo actual |
|---|---|---|
| `event:deliverables/presented` | `root-added` | `same-version` |
| `event:feedback/message-put.data.item.category` | `optional-property-added` | `same-version` |
| `event:feedback/record.data.text` | `property-made-optional` | `same-version` |
| `event:feedback/record.data.category` | `optional-property-added` | `same-version` |
| `event:subagent/catalog` | `root-added` | `same-version` |

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
