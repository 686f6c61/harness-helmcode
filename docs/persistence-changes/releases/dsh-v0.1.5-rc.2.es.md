---
description: "Tipos de persistencia de Session retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.5-rc.2."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.5-rc.2

[English](dsh-v0.1.5-rc.2.md) | Español

## Resumen

Todas las huellas de las raíces de persistencia reconstruidas coinciden con el tag alpha/rc anterior. El formato del escritor sigue siendo 3.

## Índice

- [Evidencia de la versión](#evidence)
- [Declaración](#declaration)
- [Cambios estructurales](#changes)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

-----

<a id="evidence"></a>
## Evidencia de la versión

Este relleno aproximado a posteriori sirve para la lectura y la validación de formato; no es una confirmación de compatibilidad contemporánea. Los límites de extracción y cobertura se describen en la [referencia del archivo](README.es.md).

| Elemento | Valor registrado |
|---|---|
| Tag de origen | `dsh-v0.1.5-rc.2` |
| Fecha de origen | 2026-09-10T13:50:19.000Z |
| Registro de la versión | Objeto release presente. |
| Versión anterior | [dsh-v0.1.5-rc.1](dsh-v0.1.5-rc.1.es.md) |
| Versión del escritor de Session | 3 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->59 raíces / 462 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.5-rc.2.schema.json](dsh-v0.1.5-rc.2.schema.json) |

Evidencia en el código fuente de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 3`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.5-rc.2
previous: dsh-v0.1.5-rc.1
sessionFormatVersion: 3
changes: []
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Los tipos raíz normalizados y sus resúmenes transitivos son idénticos a los del tag anterior.

<!-- persistence-release-changes:end -->

<a id="verification"></a>
## Verificación

La extracción superó la validación de grafo canónico, huellas de raíces y huellas de tipos alcanzables, permitiendo el `surfaceOp` opcional original solo para los eventos surface históricos. La comprobación interna del repositorio reconstruye cada tag a partir de su predecesor y verifica los valores antes/después, la cobertura de snapshots y las declaraciones de máquina bilingües.

```sh
pnpm run verify-persistence-releases
```

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
