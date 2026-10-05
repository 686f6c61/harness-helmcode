---
description: "Tipos de persistencia de sesión retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.1-rc.1."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.1-rc.1

[English](dsh-v0.1.1-rc.1.md) | Español

## Resumen

permission/preset incorpora la propiedad opcional origin con los valores default, selection e inferred. El formato de escritura sigue siendo 0.

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
| Tag de origen | `dsh-v0.1.1-rc.1` |
| Fecha de origen | 2026-08-21T06:21:44.000Z |
| Registro de la versión | Objeto de versión presente. |
| Versión anterior | [dsh-v0.1.0-rc.8](dsh-v0.1.0-rc.8.es.md) |
| Versión del escritor de sesión | 0 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->51 raíces / 407 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.1-rc.1.schema.json](dsh-v0.1.1-rc.1.schema.json) |

Evidencia de origen de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 0`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.1-rc.1
previous: dsh-v0.1.0-rc.8
sessionFormatVersion: 0
changes:
  - root: event:permission/preset
    before: 5c45bf4c544a7211dcd8ba6ba7e5f1bc39b49e7a9df9d5cbdc8e87c22771b37b
    after: 7271e4b771406aaf06014c2269edd6cb68055bb8b8686571730813ce0ababc22
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Se detectaron 1 raíces cambiadas y 1 diferencias estructurales. Los mínimos de la tabla se calculan con las reglas actuales solo a efectos de comparación; no afirman cumplimiento histórico ni corrección de migración o compatibilidad en runtime.

| Ruta | Cambio | Mínimo actual |
|---|---|---|
| `event:permission/preset.data.origin` | `optional-property-added` | `same-version` |

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
