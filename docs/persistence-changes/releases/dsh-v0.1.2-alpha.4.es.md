---
description: "Tipos de persistencia de sesión retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.2-alpha.4."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.2-alpha.4

[English](dsh-v0.1.2-alpha.4.md) | Español

## Resumen

El SessionHeader lógico sustituye la propiedad opcional seedLength por la requerida isSeeded, mientras que la cabecera JSONL física sigue declarando seedLength. Las variantes de fuente de mensaje de usuario subagent-report y coordinator pasan a ser agent-message. El formato de escritura sigue siendo 0.

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
| Tag de origen | `dsh-v0.1.2-alpha.4` |
| Fecha de origen | 2026-09-01T15:37:26.000Z |
| Registro de la versión | Objeto de versión presente. |
| Versión anterior | [dsh-v0.1.2-alpha.3](dsh-v0.1.2-alpha.3.es.md) |
| Versión del escritor de sesión | 0 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->54 raíces / 415 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.2-alpha.4.schema.json](dsh-v0.1.2-alpha.4.schema.json) |

Evidencia de origen de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 0`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.2-alpha.4
previous: dsh-v0.1.2-alpha.3
sessionFormatVersion: 0
changes:
  - root: SessionHeader
    before: a50373168c4935222b1681223d919a56d095ce37ad45c5ba2c20d75235adf937
    after: 001ed6f66d67fac9cb9594b55f13557db94174fe5d5954789bb5a2d6d5927226
  - root: event:agent/inbox/spliced
    before: ee796690277eafbcda4437478de7a8f01d983424d6238fe472df9b3b0d97a89f
    after: 15cdff6391d58ea00d7e2fe113b663d5479cbb3fd1af26717ad933c770bca081
  - root: event:session/title-llm-request
    before: 61651f4ca07ab9ebef773d82fafbcb74d39190a255c69ecc36084046123a9cb4
    after: 2cfb71f7819bc88a6bccbffa8b7ae5664233af6f6e1dfb068db25e2e17ddd8c7
  - root: event:user/message
    before: e23368db1646a9ac10d2bd4629084fdff583a1db2c83ffaa3f2f201d0c45f3e4
    after: e950c87ba49bd8175b8a670b319a599d5ed14cde996540d5ba91a141fad68781
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Se detectaron 4 raíces cambiadas y 5 diferencias estructurales. Los mínimos de la tabla se calculan con las reglas actuales solo a efectos de comparación; no afirman cumplimiento histórico ni corrección de migración o compatibilidad en runtime.

| Ruta | Cambio | Mínimo actual |
|---|---|---|
| `SessionHeader.seedLength` | `property-removed` | `version-bump` |
| `SessionHeader.isSeeded` | `required-property-added` | `version-bump` |
| `event:agent/inbox/spliced.data.inserted[].source` | `union-variants-changed` | `version-bump` |
| `event:session/title-llm-request.data.messages[].source` | `union-variants-changed` | `version-bump` |
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
