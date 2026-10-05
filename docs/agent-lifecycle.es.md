<!-- El archivo fuente en inglés está generado por scripts/gen-doc-graphs.ts; este archivo en español es la contraparte revisada mantenida mediante el emparejamiento bilingüe.
     Al actualizar, ejecutar primero `pnpm run gen-doc-graphs` para actualizar el inglés, después actualizar este archivo y ejecutar `pnpm run verify-translation-pairing --write docs/agent-lifecycle.md` para volver a registrar el emparejamiento. -->

# Ciclo de vida de turnos y pasos del agent

[English](agent-lifecycle.md) | Español

Esta secuencia es el complemento visual de [architecture.md](architecture.es.md#turn-flow). Mantiene los hechos duraderos de reproducción en `session/event` y el control y el estado en vivo en `agent/*`.

```mermaid
sequenceDiagram
  participant User
  participant Agent
  participant Driver
  participant Hooks as hook listeners
  participant Prompt as ctx.systemPrompt
  participant LLM as ctx.llm
  participant Tools as ctx.tools
  participant Session
  participant SDK as UI or SDK listener
  User->>Agent: followup(content)
  Agent-->>SDK: <code>agent/inbox/spliced</code>
  Agent-->>SDK: <code>agent/inbox/inserted</code> { message }
  Agent->>Driver: queued work wakes driver
  Driver-->>SDK: <code>agent/status</code> running
  Driver->>Session: <code>turn/start</code>
  Note over Agent,Driver: claim pending next-step input plus one queued prompt
  Driver-->>SDK: <code>agent/inbox/spliced</code> pure deletion
  Driver-->>SDK: <code>agent/inbox/claimed</code> { message, turn } per message
  Driver->>Prompt: <code>system-prompt/assemble</code> waterfall
  Driver->>Hooks: <code>agent/pre-step</code> waterfall
  Hooks-->>Driver: authoritative reject or enter(messages)
  alt proposed step rejected, first batch empty, or pre-step failed
    Driver-->>Driver: claimed batch stays removed, the open turn spends no step
  else enter proposed step
  Driver->>Session: <code>step/start</code>
  Driver->>Hooks: <code>agent/request</code> waterfall
  Driver->>LLM: prepareCall(config, signal)
  Note over Driver,LLM: cancellation during either async phase commits neither system nor users
  Note over Driver,Session: synchronous admission using the prepared call capability
  Driver->>Session: <code>system/message</code> ordered per-node reconciliation
  Driver->>Session: <code>user/message</code> per entered message
  Driver->>Session: <code>request/header</code> and <code>request/context</code> as needed
  Driver->>Driver: derive and freeze request from the log
  Driver->>LLM: bound prepared call through <code>llm/stream</code> waterfall
  LLM-->>Driver: StreamChunk*
  Driver-->>SDK: <code>agent/assistant-stream</code> chunk*
  alt final adapter or terminal in-band request failure
    Driver->>Session: <code>assistant/attempt</code>
    Driver-->>SDK: <code>agent/assistant-stream</code> committed end
    Driver->>Hooks: <code>agent/request-error</code> waterfall
    Hooks-->>Driver: return retry action or preserve the original error
    Note over Driver,LLM: retry in the open step: prepare and reconcile the same rendered assembly without repeating pre-step or users
  else model request succeeded
  Driver->>Session: <code>assistant/message</code>
  Driver-->>SDK: <code>agent/assistant-stream</code> committed end
  Driver->>Tools: classify pending call by executionMode
  loop barriers and bounded rolling pool, reclassify before start
    opt call starts
      Driver->>Session: <code>tool/call</code>
      Driver->>Tools: ordered pre, concurrent execute
      Tools-->>Session: tool-owned events when applicable
    end
    opt next model-order result ready
      Driver->>Tools: ordered post
      Driver->>Session: <code>tool/result</code>
    end
  end
  Driver->>Session: <code>step/end</code>
  opt natural stop and next-step inbox empty
    Driver->>Hooks: <code>agent/turn-stopping</code> serial terminal checkpoint
  end
  opt next-step input is pending
    Driver-->>Driver: claim pending next-step input
    Driver-->>SDK: <code>agent/inbox/claimed</code> { message, turn } per message
    Driver->>Hooks: <code>agent/pre-step</code> waterfall
    Hooks-->>Driver: authoritative reject or enter(messages)
  end
  end
  end
  Driver->>Session: <code>turn/end</code>
  Driver-->>SDK: <code>agent/status</code> idle
```

El evento `assistant/message` registra cada llamada exitosa al proveedor, incluidas las finalizaciones sin contenido y las de `max-tokens`, e incorpora el flujo compacto exacto con marcas de tiempo. El contenido vacío queda fuera del historial derivado. Un intento fallido, reintentado, cancelado o con error de flujo que llega al settlement sin un surface message registra su flujo como `assistant/attempt`. Los fragmentos en vivo de `agent/assistant-stream` son transitorios; la reproducción lee cualquiera de los dos settlement duraderos, y una pérdida brusca del proceso antes del settlement no deja ningún flujo de intento duradero.

`dsh-compaction-basic` usa `agent/pre-step` para la presión antes de la derivación de la solicitud, y `agent/request-error` solo para el desbordamiento de contexto canónico. Una vez que cualquiera de los dos disparadores se cumple, la poda opcional de resultados de tool se ejecuta antes de la selección del resumen. La recuperación ocurre dentro del paso abierto y reintenta solo cuando la poda o la generación de resúmenes hace avanzar la generación de surface replacement; de lo contrario, prevalece el error de solicitud original. Cada reintento prepara su llamada y reconcilia el ensamblado renderizado retenido antes de la derivación de la solicitud, sin repetir el ensamblado, el pre-step ni la admisión de usuarios.

La decisión devuelta por `agent/pre-step` es autoritativa; los listeners que envuelven `next()` conservan los mensajes posteriores y `startsRequestSeries` salvo que la sustitución sea intencional. El steering (guía a mitad de camino) y el contexto inyectado pasan por el mismo waterfall (eventos en cascada) después de que una operación de reclamación posterior tome su lote de entrada de paso siguiente.

Los usuarios del SDK que necesitan datos de transcript (transcripción) reproducibles deben consumir `session/event`; `agent/*` es la API de coordinación en vivo para la cola y el estado, la interceptación de prompts, la construcción de solicitudes, el steering, la continuación y los errores.

Modo de mantenimiento: secuencia Mermaid curada; las firmas exactas de los eventos residen en el catálogo de Cordis generado.
