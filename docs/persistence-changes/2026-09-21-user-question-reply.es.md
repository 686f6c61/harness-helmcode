---
description: "Registra una transición de tipos de persistencia y su reconocimiento de compatibilidad."
kind: persistence-change
---

# 2026-09-21-user-question-reply

[English](2026-09-21-user-question-reply.md) | Español

## Resumen

Añade una fuente de mensaje calificada user-question-reply para una respuesta tardía a una llamada ask_user_question continuada.

## Índice

- [Declaración](#declaration)
- [Compatibilidad](#compatibility)
- [Verificación](#verification)
- [Nota de desarrollo](#dev-note)

<a id="declaration"></a>
## Declaración

```yaml persistence-change
schemaVersion: 1
id: 2026-09-21-user-question-reply
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-16-session-format-v4"
    after: "6178f1edcb23f361f2a6cb2c859b1c2187220d5695ece4a3400e0d92845a7178"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-16-session-format-v4"
    after: "186159f5f6f67a0b8cd095b8fe55bef42d4f25ca1a1c248f859867af2ece0467"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-16-session-format-v4"
    after: "ae84c5e493f94acc63cfb70389073ba616ed7ae7aa4fadde048bdcc64d49bb46"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-16-session-format-v4"
    after: "b83ed1b1cfffbd7bd5cca06ea72e44be57beb68b39e5a96660ce42a9e21aa411"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibilidad

Los registros existentes no contienen esa fuente y siguen siendo válidos. La nueva fuente es atribución calificada sobre un mensaje de usuario ordinario; los lectores sin dsh-user-questions conservan el mensaje y derivan el historial de su contenido. Solo la proyección userQuestions lee esta fuente para cerrar la pregunta nombrada y registrar sus respuestas. El RPC de respuesta es su único productor y escribe el resultado answered; cerrar el panel del Client no persiste ninguna respuesta. No cambia ningún tipo de evento ni el header de Session.

<a id="verification"></a>
## Verificación

pnpm exec vitest run packages/interaction/user-questions/tests packages/interaction/tool-ask-user/tests: 81 pruebas superadas. La suite focalizada de proyección, respuesta, vista y grupo de procesos superó 70 pruebas. pnpm run typecheck superado. pnpm run doc-sync superó las 42 puertas, incluidos el historial de persistencia y el emparejamiento de traducciones.

<a id="dev-note"></a>
## Nota de desarrollo

Ninguna.
