---
description: "Revisa y mantiene los cambios registrados de tipos de persistencia de Session, sus snapshots de schemas y las decisiones de compatibilidad."
---

# Registros de cambios de tipos de persistencia

[English](README.md) | Español

## Resumen

Usa esta referencia para inspeccionar un cambio reconocido de tipos de persistencia de Session y su predecesor. Cada registro vincula una decisión de compatibilidad a schemas generados exactos. Las comprobaciones locales comparan la fuente actual con el historial registrado usando solo archivos del checkout. Empieza por el [manual de referencia (cookbook) de revisión](../cookbook/reviewing-persistence-type-changes.es.md) al cambiar un tipo persistido.

Para versiones etiquetadas más antiguas, usa el [archivo de versiones preliminares](releases/README.es.md). Reconstruye las diferencias de tipos alpha/RC para lectura histórica y validación de formatos; sus observaciones no sirven como reconocimientos de compatibilidad actuales.

Para schemas completos agrupados por formato de Session, usa las [referencias de formato](historical-formats/README.es.md). Su cobertura sigue la constante del escritor, incluidos los formatos intermedios sin tag de versión.

## Índice

- [Archivos y propiedad](#files-and-ownership)
- [Reglas de compatibilidad](#compatibility-rules)
- [Historial y limitaciones](#history-and-limitations)
- [Nota de desarrollo](#dev-note)

-----

<a id="files-and-ownership"></a>
## Archivos y propiedad

El [catálogo](../persistence-catalog.es.md) generado ofrece declaraciones legibles y resúmenes; el [inventario de schemas](../persistence-schema.json) contiene los tipos normalizados. Las raíces cubren el header lógico de Session, la línea de header JSONL física, el sobre de evento y cada evento declarado en el repositorio. Los tipos referenciados contribuyen transitivamente al resumen de cada raíz afectada.

Cada registro fechado tiene cuatro archivos hermanos:

| Archivo | Propietario |
|---|---|
| `YYYY-MM-DD-slug.md` | Reconocimiento en inglés con `kind: persistence-change`, una declaración máquina, razonamiento de compatibilidad y evidencia de verificación |
| `YYYY-MM-DD-slug.es.md` | Contraparte en español con la declaración máquina idéntica |
| `YYYY-MM-DD-slug.i18n.yaml` | Registro generado de consistencia bilingüe |
| `YYYY-MM-DD-slug.schema.json` | Schemas after completos generados para las raíces afectadas que siguen presentes |

`finalized/vN.json` registra las clasificaciones y resúmenes de raíces completos de una línea base de compatibilidad aceptada y los hashes semánticos de sus registros aceptados. El [registro de finalización](../session-format-status.es.md#finalization-record) requiere su punto de control. Los schemas V4 actuales pueden evolucionar de forma compatible; el punto de control protege las declaraciones máquina aceptadas y los schemas after incluso después de que el escritor avance, excluyendo la prosa, los alias y las ubicaciones fuente de los hashes de los registros.

Un mantenedor captura un formato acordado con [`createPersistenceFinalizationCheckpoint`](../../scripts/persistence-finalization.ts), escribe un nuevo punto de control con nombre de versión sin reemplazar uno anterior y avanza el `latestFinalizedVersion` emparejado. El auxiliar requiere que los schemas actuales coincidan con el historial reconocido completo. Ejecuta el verificador ordinario antes de hacer commit.

La [plantilla de registro](../../.agents/skills/dsh-doc/templates/persistence-change.md) define el formato de autoría. La creación de registros acepta una entrada de prosa bilingüe y genera la declaración máquina, los snapshots, el par del catálogo y los registros de consistencia. El verificador lee la declaración máquina una vez del archivo en inglés y comprueba la igualdad de la declaración en español. Una declaración nombra cada raíz afectada, su registro predecesor, su resumen after y su decisión de compatibilidad. Una raíz nueva no tiene predecesora; una eliminación no tiene schema after y conserva una lápida explícita.

<a id="compatibility-rules"></a>
## Reglas de compatibilidad

Todo cambio estructural detectado requiere un reconocimiento. La creación y actualización de registros infieren la decisión mínima a partir de estas reglas fijas; un `--decision` explícito es una afirmación comprobada. Las reglas se aplican al cambio completo, de modo que un cambio permitido no puede ocultar un cambio rupturista simultáneo.

| Cambio detectado | Decisión mínima |
|---|---|
| Añadir una propiedad opcional al cuerpo de un evento, incluido su subárbol completo | `same-version` |
| Hacer opcional una propiedad obligatoria del cuerpo de un evento | `same-version` |
| Añadir un tipo de evento ordinario | `same-version` |
| Añadir un `data.version` numérico superior a un evento ordinario conservando sin cambios cada alternativa de payload antigua | `same-version` |
| Añadir un kind de atribución explícitamente calificado a un slot de fuente user/developer cuyos schemas before y after llevan la misma política soportada | `same-version` |
| Hacer obligatoria una propiedad opcional, añadir una propiedad obligatoria, cambiar un tipo existente o eliminar/renombrar una propiedad o un evento | `version-bump` |
| Cambiar el header de Session o el sobre de evento | `version-bump` |

Un punto de control finalizado protege la línea base aceptada sin reemplazar estas reglas de compatibilidad. En V4, las adiciones opcionales, los eventos ordinarios y las adiciones de atribución calificada pueden recibir nuevos registros same-version. Las diferencias rupturistas requieren una versión de escritor superior y un reconocimiento que contenga su propio aumento de header. El registro V4 aceptado no puede actualizarse para reutilizar su transición original 3→4.

Un evento ordinario puede añadir alternativas de payload con un `data.version` entero no negativo obligatorio mayor que cualquier versión de payload existente, siempre que todas las alternativas existentes permanezcan estructuralmente sin cambios. El lector debe conservar el soporte de los payloads antiguos; añadir variantes en una versión existente, eliminar versiones antiguas y cambiar el header de Session o el sobre siguen siendo rupturas. Los lectores antiguos pueden rechazar la nueva versión de payload. El [reconocimiento del catálogo](2026-09-20-unknown-child-catalog.es.md) registra una transición de ese tipo.

El extractor acepta una vinculación explícita `@persistenceSource` para una propiedad de fuente propiedad del núcleo sobre un rol literal user o developer; no infiere una vinculación a partir de un tipo no anotado. Un productor califica su entrada de `MessageSourceMap` con `@persistenceAttribution`. La calificación promete que un kind desconocido y sus metadatos JSON sobreviven a la lectura sin el productor, y que el kind no impone ningún requisito de validación, reproducción ni autoridad. Un productor puede inspeccionar su propio kind para reanudar la supresión de duplicados; los demás lectores deben conservar los mensajes registrados y derivarlos sin esa proyección. El schema registrado conserva la vinculación, la versión de la política, el discriminador literal `kind`, la promesa de conservación y el conjunto de kinds calificados. El formato de inventario 2 almacena esas promesas; la extracción sin una política vinculada conserva el formato 1. Las versiones del formato de Session son independientes. Los dos snapshots comparados deben llevar un estado de política compatible. Los grupos de kinds existentes siguen recibiendo la comparación estructural ordinaria; las eliminaciones, las adiciones no marcadas, los cambios de política y los cambios rupturistas no relacionados siguen siendo estrictos. Varias alternativas context-form con el mismo kind de cable forman un solo grupo.

Una explicación same-version indica cómo los registros antiguos siguen siendo legibles y cómo los lectores antiguos manejan los registros nuevos. Las adiciones opcionales explican por qué los lectores antiguos pueden ignorarlas sin cambiar la reproducción; una nueva versión de payload registra el rechazo del lector antiguo. Para los cambios de obligatorio a opcional, explica cómo manejan los lectores un valor ausente. El comprobador valida la clasificación de tipos; los revisores evalúan la explicación. Un registro version-bump incluye la versión de header creciente en la misma transición y sigue el [procedimiento de formatos de Session](../cookbook/adding-a-session-format-version.es.md).

Cuando un lector rechaza una propiedad JSON por nombre, declara la propiedad como `never` opcional y márcala con `@persistenceReserved` sin argumentos. El extractor conserva el campo prohibido, de modo que permitir un valor JSON más adelante requiere un cambio de tipo de un campo existente. Las propiedades obligatorias o con valor JSON no pueden llevar este marcador. Las propiedades `never` y `undefined` opcionales sin marcar conservan su comportamiento de omisión existente.

<a id="history-and-limitations"></a>
## Historial y limitaciones

Una línea base registra el inventario inicial completo. Los registros posteriores usan el schema after de su predecesor como schema before. El verificador rechaza predecesoras ausentes, ciclos, sucesores duplicados para una raíz, resúmenes que no coinciden y raíces actuales que discrepan de sus últimos registros. Las raíces independientes pueden avanzar de forma independiente. Dos cambios sobre la misma predecesora requieren un único historial ordenado tras la integración.

Los registros aceptados describen transiciones históricas; conserva sus declaraciones máquina y snapshots de schemas al añadir un sucesor. Un registro terminal no aceptado puede regenerarse explícitamente; el comando rechaza líneas base, registros con dependientes y registros bloqueados por puntos de control antes de producir artefactos. La verificación comprueba los hashes de puntos de control conservados; no demuestra que los puntos de control y su registro de autoridad nunca se editaran juntos. Ninguna ref de Git, servicio remoto o checkout publicado proporciona la línea base.

Los resúmenes describen tipos de persistencia declarados, no la validación ni el comportamiento en runtime. Los comentarios ordinarios, las ubicaciones fuente, los nombres de alias y los reordenamientos de declaraciones sin cambio semántico no les afectan. Las anotaciones de compatibilidad son datos de política registrados y sí afectan a los resúmenes. Los snapshots de la versión 1 sin anotar conservan su normalización, huellas y clasificación estricta originales; los grafos con política usan un dominio de huellas separado. Los campos de objeto, las alternativas de unión, los operandos de intersección y las firmas de índice pueden reordenarse cuando sus tipos resueltos siguen siendo los mismos; las posiciones de tuplas y los valores numéricos de enum siguen siendo significativos. El texto del catálogo y las ubicaciones fuente pueden seguir cambiando, así que regenera los artefactos desactualizados sin añadir un reconocimiento para un resumen sin cambios. Los tipos opacos como `unknown` no exponen ninguna estructura oculta que comparar. Los cambios solo de comportamiento y las estructuras ocultas dentro de valores opacos quedan fuera del alcance de este mecanismo. La [decisión](../../.agents/notes/implemented/process/2026-09-11-persistence-type-history.md) registra estas compensaciones.

<a id="dev-note"></a>
## Nota de desarrollo

<details>
<summary>Contexto de trabajo para mantenedores (pulsa para expandir)</summary>

Ninguna.

</details>
