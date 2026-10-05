---
description: "Registra una transición de tipos de persistencia y su confirmación de compatibilidad."
kind: persistence-change
---

# 2026-10-04-deepseek-legacy-event-removal

[English](2026-10-04-deepseek-legacy-event-removal.md) | Español

## Resumen

Helmcode elimina las dos raíces de eventos de registro de sesión exclusivas de DeepSeek: `event:session-log-deepseek/delivery-accepted` y `event:web/deepseek-search-llm-request`. Registraban telemetría de entrega y búsqueda del proveedor original que la composición zero-log de Helmcode nunca emite, así que sus escritores se eliminaron junto con el resto de la pila de DeepSeek.

## Índice

- [Declaración](#declaration)
- [Compatibilidad](#compatibility)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

<a id="declaration"></a>
## Declaración

```yaml persistence-change
schemaVersion: 1
id: 2026-10-04-deepseek-legacy-event-removal
baseline: false
changes:
  - root: "SessionHeader"
    previous: "2026-09-16-session-format-v4"
    after: "22c6899a78214dd841c266348ae997027ef391174ddb21127f1b71dc1b362824"
    decision: version-bump
  - root: "event:session-log-deepseek/delivery-accepted"
    previous: "2026-09-11-initial"
    after: null
    decision: version-bump
  - root: "event:web/deepseek-search-llm-request"
    previous: "2026-09-11-initial"
    after: null
    decision: version-bump
```

<a id="compatibility"></a>
## Compatibilidad

La eliminación cambia qué raíces podía producir un escritor v4, por lo que el escritor de sesión avanza del formato 4 al 5. La lectura no se ve afectada: las sesiones escritas por runtimes del formato 4 nunca contienen estas raíces bajo Helmcode, y las referencias históricas de formato siguen siendo legibles con los lectores existentes por versión. Ninguna raíz superviviente cambia de forma de manera rupturista: el resto de transiciones de este registro son tipos de atribución aditivos, una propiedad opcional o una versión de payload.

<a id="verification"></a>
## Verificación

`pnpm run verify-persistence-changes` pasa con el escritor en formato 5, el `docs/persistence-schema.json` regenerado y este reconocimiento; `pnpm run verify-persistence-releases` y `verify-persistence-formats` pasan tras su refresco con --write; las suites de persistencia de sesión (generation, lease, migration, native-source admission) pasan con la SESSION_FORMAT_VERSION subida.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
