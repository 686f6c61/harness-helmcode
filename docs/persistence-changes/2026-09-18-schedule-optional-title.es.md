---
description: "Registra una transición de tipos de persistencia y su reconocimiento de compatibilidad."
kind: persistence-change
---

# 2026-09-18-schedule-optional-title

[English](2026-09-18-schedule-optional-title.md) | Español

## Resumen

Hace opcional el título almacenado en las variantes after, at y every de un registro de creación de schedule/change persistido.

## Índice

- [Declaración](#declaration)
- [Compatibilidad](#compatibility)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

<a id="declaration"></a>
## Declaración

```yaml persistence-change
schemaVersion: 1
id: 2026-09-18-schedule-optional-title
baseline: false
changes:
  - root: "event:schedule/change"
    previous: "2026-09-11-initial"
    after: "a0a2e5c42e1c929445ecd1cd70f49be6b66441894ec72c08e8ae332821d4a3cb"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibilidad

Un evento de sesión de la versión 1 escrito antes de que existieran los títulos no tiene el miembro title, por lo que esos registros se decodifican y se pliegan sin él en lugar de ser rechazados. Los lectores que requieren un nombre tratan un título ausente como una tarea sin nombre. El registro de tareas del Host sigue requiriendo el miembro: el decodificador de almacenamiento rechaza una tarea almacenada sin él, y la creación, la actualización y las tools de schedule siguen requiriéndolo.

<a id="verification"></a>
## Verificación

pnpm exec vitest run packages/schedule/schedule/tests: 18 archivos, 789 pruebas superadas.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
