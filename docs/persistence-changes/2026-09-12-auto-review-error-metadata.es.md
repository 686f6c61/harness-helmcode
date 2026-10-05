---
description: "Registra una transición de tipos de persistencia y su reconocimiento de compatibilidad."
kind: persistence-change
---

# 2026-09-12-auto-review-error-metadata

[English](2026-09-12-auto-review-error-metadata.md) | Español

## Resumen

Añade metadatos de error estructurados opcionales a los despachos PTC persistidos y una razón opcional orientada al usuario a los errores de tools nativas persistidos. Ambas adiciones conservan la versión del formato de Session.

## Índice

- [Declaración](#declaration)
- [Compatibilidad](#compatibility)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

<a id="declaration"></a>
## Declaración

```yaml persistence-change
schemaVersion: 1
id: 2026-09-12-auto-review-error-metadata
baseline: false
changes:
  - root: "event:tool/ptc-dispatch"
    previous: "2026-09-11-initial"
    after: "b5d66eaebed4da391b13498623b11142222149fbf5e025975dbc6d94f0d06796"
    decision: same-version
  - root: "event:tool/result"
    previous: "2026-09-11-initial"
    after: "3a803805bdeb805f32b229e399fb7258be8e32a89f89063a7c99957cfea942f7"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibilidad

Los eventos tool/ptc-dispatch existentes pueden omitir error, y los errores de tool/result existentes pueden omitir reason. Los eventos de despacho PTC no entran en el historial del modelo; la reproducción de resultados de tools nativas proyecta data.message y no incluye metadatos de error. Los lectores antiguos pueden ignorar estas adiciones sin cambiar la reproducción del modelo. Los lectores Web actuales aceptan razones ausentes y solo muestran los detalles de denegación de Auto review cuando la identidad del error registrada coincide. El modo de permisos sigue siendo un string en el evento existente; seleccionar auto no introduce ningún cambio declarado de tipos de persistencia. No cambia ningún header, sobre de evento ni tipo de valor existente, y no se requiere ninguna migración adyacente.

<a id="verification"></a>
## Verificación

pnpm exec vitest run scripts/persistence-changes.spec.ts scripts/persistence-schema.spec.ts superó 64 pruebas. Las pruebas focalizadas de permisos, Auto review, ejecución de tools, agent-loop, herencia de subagents y propietarias del SDK de TypeScript superaron 390 pruebas en 10 archivos, incluidos los metadatos de denegación nativos y de PTC. uv run --python 3.10 --group test --project python/sdk pytest python/sdk/tests/test_client.py -k preserves_auto_review_errors superó 1 prueba. La vista previa de persistencia clasificó solo las dos adiciones opcionales y no requirió aumento de versión.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
