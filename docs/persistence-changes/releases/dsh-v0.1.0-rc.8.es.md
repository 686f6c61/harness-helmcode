---
description: "Tipos de persistencia de sesión retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.0-rc.8."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.0-rc.8

[English](dsh-v0.1.0-rc.8.md) | Español

## Resumen

Se añaden cuatro eventos team/* y la variante de source de user-message team-message; assistant/message incorpora la propiedad opcional interrupted. El formato de escritura sigue siendo 0.

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
| Tag de origen | `dsh-v0.1.0-rc.8` |
| Fecha de origen | 2026-08-19T15:11:50.000Z |
| Registro de la versión | Objeto de versión presente. |
| Versión anterior | [dsh-v0.1.0-rc.7](dsh-v0.1.0-rc.7.es.md) |
| Versión del escritor de sesión | 0 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->51 raíces / 403 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.0-rc.8.schema.json](dsh-v0.1.0-rc.8.schema.json) |

Evidencia de origen de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 0`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.0-rc.8
previous: dsh-v0.1.0-rc.7
sessionFormatVersion: 0
changes:
  - root: event:agent/inbox/spliced
    before: dea3a1d5640e0306a486f92b725a01b57e69439277978ca09dc246fb40016b90
    after: 7a0b347ba6a465a7813490036bde98bdc658609c6de9545ba58be26c372c5030
  - root: event:assistant/message
    before: 390aeb83383643633a1935f09f84fe19d2aee8d4f500a8de70f88d388562cc50
    after: fb7d974e1945b4c8e72ee540daf64eb9e81984030ff52e1a97a4e1f71b9dd2f9
  - root: event:session/title-llm-request
    before: 796a77af2c1452392f0cc62b99fba2d404d1c9eb10a8a2510a808fba6053cf24
    after: ee6c879669bb83325e4cd3011227f238bf51765744990fc4bb12089d6dd6563a
  - root: event:team/member
    before: null
    after: 31d13edbb5fe2f8b7a38056320a8a06275ee4426e0abf12d4741818beda5a9c9
  - root: event:team/message/delivered
    before: null
    after: c53bff743470c8bf11be698ced047072744ef088cce663a774b456d7a8982516
  - root: event:team/message/queued
    before: null
    after: 577054184d5f038bd96d6db70b76983a2bb62a8eea8eeed8ca3b0d47af0f462a
  - root: event:team/task
    before: null
    after: 1688a2451eef9da19eaf45f12c8a27df07b1a6e56fa57ba603118f5201bb435b
  - root: event:user/message
    before: 18c8d77777545808f232cd8d7730ce270cb1b737edd3eaa45e0da9436fd37a13
    after: e7eec68e39f9f44b2e53d799e5d5dd08f559558a27e93eb2a272782f040be50a
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Se detectaron 8 raíces cambiadas y 8 diferencias estructurales. Los mínimos de la tabla se calculan con las reglas actuales solo a efectos de comparación; no afirman cumplimiento histórico ni corrección de migración o compatibilidad en runtime.

| Ruta | Cambio | Mínimo actual |
|---|---|---|
| `event:agent/inbox/spliced.data.inserted[].source` | `union-variants-changed` | `version-bump` |
| `event:assistant/message.data.interrupted` | `optional-property-added` | `same-version` |
| `event:session/title-llm-request.data.messages[].source` | `union-variants-changed` | `version-bump` |
| `event:team/member` | `root-added` | `same-version` |
| `event:team/message/delivered` | `root-added` | `same-version` |
| `event:team/message/queued` | `root-added` | `same-version` |
| `event:team/task` | `root-added` | `same-version` |
| `event:user/message.data.source` | `union-variants-changed` | `version-bump` |

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
