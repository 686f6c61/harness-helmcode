---
description: "Tipos de persistencia de sesión retrospectivos y cambios entre versiones adyacentes para dsh-v0.1.0-rc.5."
kind: persistence-release
---

# Versión de persistencia: dsh-v0.1.0-rc.5

[English](dsh-v0.1.0-rc.5.md) | Español

## Resumen

Todos los hashes de raíz de persistencia reconstruidos coinciden con el tag alpha/rc precedente. El formato de escritura sigue siendo 0.

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
| Tag de origen | `dsh-v0.1.0-rc.5` |
| Fecha de origen | 2026-08-13T11:38:46.000Z |
| Registro de la versión | Solo tag; sin objeto de versión. |
| Versión anterior | [dsh-v0.1.0-rc.3](dsh-v0.1.0-rc.3.es.md) |
| Versión del escritor de sesión | 0 |
| Inventario reconstruido | <!-- persistence-release-inventory:start -->47 raíces / 374 tipos<!-- persistence-release-inventory:end --> |
| Este snapshot | [dsh-v0.1.0-rc.5.schema.json](dsh-v0.1.0-rc.5.schema.json) |

Evidencia de origen de la constante de versión del escritor en este tag:

- `packages/core/session/src/types.ts`: `export const SESSION_FORMAT_VERSION = 0`

<a id="declaration"></a>
## Declaración

```yaml persistence-release
schemaVersion: 1
tag: dsh-v0.1.0-rc.5
previous: dsh-v0.1.0-rc.3
sessionFormatVersion: 0
changes: []
```

<a id="changes"></a>
## Cambios estructurales

<!-- persistence-release-changes:start -->

Los tipos raíz normalizados y sus resúmenes transitivos son idénticos a los del tag anterior.

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
