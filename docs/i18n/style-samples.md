# Ejemplos de estilo de traducción (style samples)

Este archivo es el ancla de calibración del estilo de traducción: cada grupo de ejemplos es un pasaje en inglés con su traducción española finalizada por una persona, cubriendo los principales géneros documentales de este repositorio. **El estilo de las traducciones se rige por estos ejemplos** — los ejemplos de estilo pesan más que las descripciones de tono en prosa, pero la tabla de terminología y las reglas de fidelidad y estructura siguen teniendo prioridad. Al traducir o revisar, compara con el ejemplo de estilo más cercano. Este archivo es bilingüe por construcción y no participa en el emparejamiento (véase la lista de exclusiones de [README.md](README.md)).

Mantenimiento: cuando la revisión humana calibre un nuevo pasaje de referencia, se añade al género correspondiente; los errores semánticos, estructurales o de terminología se corrigen directamente. Toda incorporación o corrección de ejemplos pasa por revisión de PR.

## ① Narrativa de arquitectura

> This document describes the architecture of the DeepSeek Harness — the foundation of **DeepSeek Code**. The governing principle, from the microkernel design discussion: **everything is a plugin**. The core is deliberately tiny — a handful of abstract services plus one concrete loop plugin (`dsh-agent-loop`) — and every product feature is a plugin against the extension API described here, without modifying the loop.

Este documento describe la arquitectura de DeepSeek Harness, la base sobre la que se construye **DeepSeek Code**. El principio rector, extraído del debate sobre el diseño de microkernel: **todo es un plugin**. El núcleo es deliberadamente mínimo: un puñado de servicios abstractos más un plugin de bucle concreto (`dsh-agent-loop`), y cada funcionalidad de producto es un plugin contra la API de extensión descrita aquí, sin modificar el bucle.

> Dependency rule: extension plugins depend on interfaces, never on `dsh-agent-loop` (the loop is swappable); composition bundles such as `dsh-base` and `dsh-sdk-minimal` may assemble the concrete loop.

Regla de dependencias: los plugins de extensión dependen de interfaces, nunca de `dsh-agent-loop` (el bucle es reemplazable); los paquetes de composición como `dsh-base` y `dsh-sdk-minimal` pueden ensamblar el bucle concreto.

> This document covers **behavior**; type definitions live in [subsystems/](../subsystems/core.md), the per-event/service reference lives in the generated regions of [subsystems/](../subsystems/core.md), and package contracts in the package READMEs state each package's required configuration and behavior ([map](../../packages/README.md)).

Este documento cubre el **comportamiento**; las definiciones de tipos viven en [subsystems/](../subsystems/core.es.md), la referencia por evento y servicio vive en las regiones generadas de [subsystems/](../subsystems/core.es.md), y los contratos de paquete en los README de cada paquete establecen la configuración y el comportamiento requeridos ([mapa](../../packages/README.md)).

## ② Reglas de patrones defensivos

> Hard-won bug-class rules: each pattern below is a class of defect that actually shipped or nearly shipped here, stated as the rule that prevents its recurrence. Read this before writing lifecycle, concurrency, subprocess, or teardown code.

Reglas de clases de defectos aprendidas a las duras: cada patrón descrito abajo es una clase de defecto que llegó a producción — o estuvo a punto — en este repositorio, enunciada como la regla que impide su reaparición. Lee esto antes de escribir código de ciclo de vida, concurrencia, subprocesos o teardown.

> **Dispose must reach quiescence, not just request it** — A teardown that issues kills/aborts but returns before the work stops leaves orphans. Make cleanup async and await the children's exit (kill → await `done`), and close listener/notification registries BEFORE killing so late completions stay silent. Tests prove disposal waited (pid gone right after `await fiber.dispose()`), not merely that the process eventually dies.

**dispose (liberación de recursos) debe alcanzar la quiescencia, no solo solicitarla** — un teardown que emite kills/aborts pero retorna antes de que el trabajo se detenga deja procesos huérfanos. Haz la limpieza asíncrona y espera la salida de los hijos (kill → await `done`), y cierra los registries de listeners y notificaciones ANTES de matar, para que las completaciones tardías queden en silencio. Los tests demuestran que dispose esperó (el pid desaparece justo después de `await fiber.dispose()`), no solo que el proceso muere eventualmente.

> **Async state is not synchronous state** — `agent.followup()` does not flip status before returning; a background job's completion races turn boundaries; `reader.close()` fires for both EOF and disposal. Never gate control flow on a status you only just requested — drive lifecycle off the events/promises that actually fire (`agent/status`, `task.done`), and observe the transition (saw `running` THEN `idle`) instead of treating status as a per-follow-up result: several queued follow-ups run as consecutive turns under one `running` interval, while cancellation or disposal can discard unstarted items.

**El estado asíncrono no es estado síncrono** — `agent.followup()` no cambia el status antes de retornar; la completación de una tarea en segundo plano compite con los límites de turno; `reader.close()` se dispara tanto por EOF como por liberación. Nunca condiciones el flujo de control a un status que acabas de solicitar: guía el ciclo de vida por los eventos y promesas que realmente se disparan (`agent/status`, `task.done`) y observa la transición (primero `running`, DESPUÉS `idle`) en lugar de tratar el status como resultado de cada follow-up: varios follow-ups en cola se ejecutan como turnos consecutivos bajo un mismo intervalo `running`, mientras que la cancelación o la liberación pueden descartar elementos no iniciados.

## ③ Lista de política de testing

> **Coverage gate** (`pnpm run test:coverage`): the gating run, per-file 100% on `packages/*/*/src`. An uncovered line is often dead code the gate is correctly flagging for deletion, not a missing test to bolt on. Line coverage is necessary, never sufficient — it proves lines ran, not that the feature works as shipped.

**Puerta de cobertura** (`pnpm run test:coverage`): la ejecución que bloquea el merge, con 100 % por archivo en `packages/*/*/src`. Una línea sin cobertura es a menudo código muerto que la puerta marca correctamente para eliminar, no un test que falte añadir. La cobertura de líneas es necesaria, nunca suficiente: demuestra que las líneas se ejecutaron, no que la funcionalidad trabaja como se entregó.

> We are DeepSeek — do not ration real-API tests. A no-key test proves the plumbing; only a with-key run proves the agent works against a real model. Write many: real prompts that write files, multi-turn conversations, tool use, cancellation mid-stream. Cheapest and highest-value are **smoke tests** that boot the real example, send one real prompt, and check the world — they catch the "green unit tests, broken product" class that mocks structurally cannot. The self-skip exists only so secretless CI and keyless contributors aren't blocked; it is not a cost signal.

Somos DeepSeek: no raciones los tests contra la API real. Un test sin clave demuestra la fontanería; solo una ejecución con clave demuestra que el agent funciona contra un modelo real. Escribe muchos: prompts reales que escriben archivos, conversaciones de varios turnos, uso de tools, cancelación a mitad del stream. Los más baratos y valiosos son las **pruebas de humo** que arrancan el ejemplo real, envían un prompt real y comprueban el mundo — capturan la clase de fallo «tests unitarios en verde, producto roto» que los mocks estructuralmente no pueden ver. El auto-skip existe solo para que la CI sin secretos y los colaboradores sin clave no queden bloqueados; no es una señal de coste.

> **Prefer the real implementation over a mock** — Mock only genuinely expensive or non-deterministic dependencies (the LLM adapter, the network, the clock); keep everything downstream real. A hand-rolled stand-in proves the bridge moves bytes, not that the shipping tool behaves as asserted — the two drift while the test stays green.

**Prefiere la implementación real sobre un mock** — haz mock solo de dependencias genuinamente caras o no deterministas (el adaptador de LLM (modelo de lenguaje grande), la red, el reloj); mantén real todo lo que está aguas abajo. Un doble hecho a mano demuestra que el puente mueve bytes, no que la herramienta entregada se comporta como se afirma: ambos divergen mientras el test sigue en verde.

## ④ Descripción de mecanismos

> Blob hashes, not commit hashes, so the record is computable for files edited in the same PR (`git hash-object foo.md`) and consistency is a pure content comparison. The recorded hash also recovers the exact last-confirmed text of either side (`git cat-file -p <hash>`), so an out-of-sync pair is updated by diffing the edited side against its last-confirmed state and patching the counterpart minimally — never by re-translating whole files.

Blob hashes, no commit hashes, de modo que el registro sea computable para archivos editados en el mismo PR (`git hash-object foo.md`) y la consistencia sea una comparación pura de contenido. El hash registrado también recupera el texto exacto de cualquiera de los lados en su último estado confirmado (`git cat-file -p <hash>`), así que un par desincronizado se actualiza comparando el lado editado contra su último estado confirmado y aplicando un parche mínimo a la contraparte — nunca re-traduciendo archivos enteros.

## ⑤ Declaración de política

> The gate's limit, stated plainly: a green gate means the pair was confirmed consistent at these exact contents, not that the confirmation was sound. It checks hashes and Markdown structure; it cannot judge whether the two sides actually say the same thing — that is the reviewer's half of the contract. A re-recorded pair with a sloppy counterpart passes the gate; it must not pass review.

El límite de la puerta, dicho sin rodeos: una puerta en verde significa que el par se confirmó consistente con estos contenidos exactos, no que la confirmación fuera acertada. La puerta comprueba hashes y estructura Markdown; no puede juzgar si los dos lados dicen realmente lo mismo — esa es la mitad del contrato que pertenece al revisor. Un par re-registrado con una contraparte descuidada pasa la puerta; no debe pasar la revisión.

## ⑥ Argumentación de Agent Note

> Comparing git timestamps of the pair (no record) — rejected: formatting-only edits would false-positive, and a counterpart committed after an unrelated edit would false-negative; content identity is the only signal that means what the gate claims.

Comparar los timestamps de git del par (sin registro) — rechazado: las ediciones de solo formato producirían falsos positivos, y una contraparte commiteada tras una edición no relacionada produciría falsos negativos; la identidad de contenido es la única señal que significa lo que la puerta afirma.

## ⑦ Requisito universal (demostración de división de párrafos largos)

> **Universal requirement**: every in-scope document merges as a complete bilingual pair. The manifest contains only explicit exclusions: it has no per-file rollout list, date cutoff, or README-specific policy class. […] Pairing is a continuing obligation: every later edit to either side updates the counterpart and consistency record in the same change.

**Requisito universal**: todo documento dentro del alcance se mergea como un par bilingüe completo. El manifest (lista de metadatos) contiene solo exclusiones explícitas: no hay lista de despliegue por archivo, fecha de corte ni clase de política específica para README. […] El emparejamiento es una obligación continua: toda edición posterior de cualquiera de los lados actualiza la contraparte y el registro de consistencia en el mismo cambio.

## Claves extraídas de los ejemplos

- El estilo es prosa técnica institucional: oraciones completas con sujeto, tono seguro; ni coloquial ni académico.
- Da a las frases un actor explícito: los pasivos y sujetos abstractos del inglés se escriben en español con «el sistema / la puerta / la herramienta / el revisor» como sujeto, o con la pasiva refleja natural.
- Sustituye calcos por modismos de ingeniería españoles: false positive/negative → falso positivo/negativo, ratchet → «solo se aprieta, nunca se afloja», reviewable act → «acto revisable».
- Localiza las metáforas en vez de trasplantarlas: bilingual from birth → «bilingüe desde su creación»; grandfathered → «heredado de antes del cambio».
- Los nombres de categoría se dicen en español con glosa inglesa en la primera aparición cuando el nombre inglés es canónico en el repo: manual de referencia (cookbook), postmortem (análisis post-incidente); al referirse a directorios o rutas se conserva el inglés en forma de código.
- Divide los párrafos largos por unidad semántica, una idea por párrafo; despliega las cadenas de sustantivos en oraciones con verbo.
- Reescribir como nativo no es recortar: cada componente semántico de la fuente debe aterrizar en la traducción.
- Si un ejemplo entra en conflicto con [terminology.md](terminology.md), gana la tabla: corrige la terminología del ejemplo según la tabla antes de incorporarlo (p. ej. agent, mock y LLM se conservan en inglés, cancellation se traduce «cancelación»).
- Los identificadores en forma de código (nombres de evento como `agent/status`, valores de estado como `running`, nombres de paquete como `dsh-bash-local`, etc.) se conservan como code span en la traducción, sin reescritura coloquial; la pasada 2 debe verificarlos frase por frase.
