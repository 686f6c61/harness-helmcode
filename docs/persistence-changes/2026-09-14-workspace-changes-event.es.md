---
description: "Registra una transición de tipos de persistencia y su reconocimiento de compatibilidad."
kind: persistence-change
---

# 2026-09-14-workspace-changes-event

[English](2026-09-14-workspace-changes-event.md) | Español

## Resumen

Añade el evento log-only workspace/changes que registra los archivos que un turno de nivel superior cambió.

## Índice

- [Declaración](#declaration)
- [Compatibilidad](#compatibility)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

<a id="declaration"></a>
## Declaración

```yaml persistence-change
schemaVersion: 1
id: 2026-09-14-workspace-changes-event
baseline: false
changes:
  - root: "event:workspace/changes"
    previous: null
    after: "e308ccf867a5398e316e0af8cb6ce238a8d33a63b9b384c8250a686786285f72"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibilidad

Una raíz nueva en la misma versión del formato de Session. Los registros existentes no contienen ese evento y siguen siendo válidos; los lectores anteriores a él rechazan un registro que lo lleve, como hace todo evento obligatorio en lectura. El evento solo lo anexa el plugin workspace-changes del paquete Web y nunca es visible para el modelo; la tarjeta de archivos cambiados de la Web es su único consumidor y lee el último evento por turno.

<a id="verification"></a>
## Verificación

pnpm exec vitest run packages/deliverables/workspace-changes packages/client/ui-deliverables: 165 pruebas superadas; snapshots/web/changed-files-turn reproduce el evento registrado a través del perfil Web.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
