---
description: "Registra una transición de tipos de persistencia y su reconocimiento de compatibilidad."
kind: persistence-change
---

# 2026-09-20-unknown-child-catalog

[English](2026-09-20-unknown-child-catalog.md) | Español

## Resumen

Conserva los hijos históricos ilegibles en subagent/catalog con el modo unknown.

## Índice

- [Declaración](#declaration)
- [Compatibilidad](#compatibility)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

<a id="declaration"></a>
## Declaración

```yaml persistence-change
schemaVersion: 1
id: 2026-09-20-unknown-child-catalog
baseline: false
changes:
  - root: "event:subagent/catalog"
    previous: "2026-09-11-initial"
    after: "3abae7324356f155cb42450c00b806d134ec93bd6439d2063b8d724162d58604"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibilidad

El payload v0 del catálogo no cambia. El payload v1 añade el modo unknown, y los lectores actuales aceptan v0 y v1. Los hechos completos siguen usando v0; la migración emite v1 para los hijos desconocidos. Los registros existentes no necesitan reescritura, y el header de Session sigue siendo V4. Los lectores antiguos rechazan v1. El clasificador permite versiones de payload de evento superiores solo cuando todas las alternativas de payload antiguas permanecen sin cambios; la ampliación dentro de la misma versión y la eliminación de lectores antiguos siguen siendo rupturas.

<a id="verification"></a>
## Verificación

Las regresiones de migración, restauración, proyección y Web conservan la membresía desconocida y los errores locales del hijo. Las pruebas del clasificador aceptan versiones de payload superiores con predecesoras conservadas y rechazan adiciones en la misma versión, versiones inválidas, alternativas antiguas cambiadas o eliminadas, y cambios de header/surface.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
