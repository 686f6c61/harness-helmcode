---
description: "Tipos de persistencia de sesión retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.1-rc.2."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.1-rc.2

[English](dsh-v0.1.1-rc.2.md) | Español

## Resumen

permission/preset elimina origin, mientras que los registros de adjuntos incorporan la propiedad opcional originalDimensions en los payloads de mensaje y de tool que los referencian. El formato de escritura sigue siendo 0.

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
| Tag de origen | `dsh-v0.1.1-rc.2` |
| Fecha de origen | 2026-08-21T12:03:37.000Z |
| Registro de la versión | Objeto de versión presente. |
| Versión anterior | [dsh-v0.1.1-rc.1](dsh-v0.1.1-rc.1.es.md) |
| Versión del escritor de sesión | 0 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->51 raíces / 404 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.1-rc.2.schema.json](dsh-v0.1.1-rc.2.schema.json) |

Evidencia de origen de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 0`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.1-rc.2
previous: dsh-v0.1.1-rc.1
sessionFormatVersion: 0
changes:
  - root: event:agent/inbox/spliced
    before: 7a0b347ba6a465a7813490036bde98bdc658609c6de9545ba58be26c372c5030
    after: 402ee62cd1447d03340e206138fb107d865a3452ea73c15c22fb6bc48fdf181a
  - root: event:assistant/chunk
    before: de04e4ae000cc4422a15fb86dce7c398c8a9970ac963b6f7f785e2276a939e62
    after: 51045f351a56e61da8be1dd5bba8080ac5e8ac2ff3d62a308a7f3e710b7cb18b
  - root: event:assistant/message
    before: fb7d974e1945b4c8e72ee540daf64eb9e81984030ff52e1a97a4e1f71b9dd2f9
    after: 395d04e6fd6f40eae4099cfaf3793fb710cee646fac53378433bc2d74bebd386
  - root: event:compaction/summary
    before: 67c53a0cdc70f8330a84b9a16481bc6cc45e23d1ae8041485a0b0453c11fc9aa
    after: 80316c3b92f42f246ab57d649dc546a8adeb11b96db3b11361ea32709b6bdc35
  - root: event:permission/preset
    before: 7271e4b771406aaf06014c2269edd6cb68055bb8b8686571730813ce0ababc22
    after: 5c45bf4c544a7211dcd8ba6ba7e5f1bc39b49e7a9df9d5cbdc8e87c22771b37b
  - root: event:session/title-llm-request
    before: ee6c879669bb83325e4cd3011227f238bf51765744990fc4bb12089d6dd6563a
    after: 9d5c0dabeec05f0ba9edd8ca24754de13dc2d3af5c302ff44eda04fb1a602257
  - root: event:team/message/queued
    before: 577054184d5f038bd96d6db70b76983a2bb62a8eea8eeed8ca3b0d47af0f462a
    after: a6a26c92459c96e4f342e58d7e41c71956e7e62c9280e30e260df58409a3012c
  - root: event:tool/code-dispatch
    before: c39526f02abfb7a3b47a7e4f12da2125d4025bf588286e16a0d22baedbb1a83b
    after: c14c2fdd439461cfc85105c6f620b0f62f799e3a69fb48196e938ec045aa0390
  - root: event:tool/result
    before: 3b8a618295a9388a612e8de2e0997c6e59d0e82d034419317bf616a496ae593c
    after: a79feb023a08a8b73d254e29e78f13045b6773ce377b0c4156fcdf1368c146ab
  - root: event:user/message
    before: e7eec68e39f9f44b2e53d799e5d5dd08f559558a27e93eb2a272782f040be50a
    after: 70a39b3639ca6c2eeabf1e2c8ef4cbc23e24c947e72bf0c28754e7c2f713be26
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Se detectaron 10 raíces cambiadas y 11 diferencias estructurales. Los mínimos de la tabla se calculan con las reglas actuales solo a efectos de comparación; no afirman cumplimiento histórico ni corrección de migración o compatibilidad en runtime.

| Ruta | Cambio | Mínimo actual |
|---|---|---|
| `event:agent/inbox/spliced.data.inserted[].content[].attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:assistant/chunk.data.chunk.block.attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:assistant/message.data.message.content[].attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:compaction/summary.data.rawOutput[].attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:compaction/summary.data.summary[].attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:permission/preset.data.origin` | `property-removed` | `version-bump` |
| `event:session/title-llm-request.data.messages[].content[].attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:team/message/queued.data.message.content[].attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:tool/code-dispatch.data.content[].attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:tool/result.data.message.content[0].content[].attachment.originalDimensions` | `optional-property-added` | `same-version` |
| `event:user/message.data.content[].attachment.originalDimensions` | `optional-property-added` | `same-version` |

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
