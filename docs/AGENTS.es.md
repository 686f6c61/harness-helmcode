# AGENTS.md — El estándar de documentación

[English](AGENTS.md) | Español

Este fichero define la estructura de los documentos, los niveles de Markdown, las reglas de escritura y los techos de `verify-doc-budgets`. Usa [dsh-doc](../.agents/skills/dsh-doc/SKILL.md) para ubicación y validación, y [dsh-prose-standard](../.agents/skills/dsh-prose-standard/SKILL.md) para la cobertura exigida y el criterio editorial; la [Agent Note de doc-tiers](../.agents/notes/implemented/process/2026-07-04-doc-tiers-and-budgets.md) es la dueña de la justificación.

## Estructura de los documentos

Estas reglas aplican a la documentación orientada a personas; las [Agent Notes](../.agents/notes/README.md) quedan fuera de su ámbito. Un [postmortem](postmortem/README.es.md) es una referencia acotada a un incidente; la cronología registra evidencia, no una secuencia didáctica. El tema de un documento y su posición en el árbol fijan su alcance: describe su propio tema con el detalle apropiado y refiérete a los hijos directos solo por propósito, responsabilidad y comportamiento de alto nivel; enlaza al descendiente dueño para el detalle de nivel inferior. El tipo de documento no amplía ese alcance. Una referencia puede ser exhaustiva solo acerca de su propio tema. Los mecanismos de testing, los fixtures y los harness viven en el nivel dueño más bajo; los documentos superiores enlazan allí.

Clasifica cada documento dentro del ámbito como tutorial o referencia. Los tutoriales siguen un camino ordenado hacia un resultado y solo introducen lo que cada paso necesita. Las referencias definen un ámbito de consulta y el comportamiento actual sin secuencia didáctica. Separa el contenido sustancial de tutorial y de referencia; etiqueta la sección cuando alguna de las dos partes es pequeña.

Antes de escribir un tutorial, clasifica en privado el conocimiento de partida del lector y cada concepto como básico, intermedio o avanzado. Establece los prerrequisitos antes de los conceptos que dependen de ellos, aumenta la dificultad gradualmente y mueve el material avanzado innecesario a un tutorial posterior o a una referencia.

Redacta en este orden: ubica el documento en el árbol; fija su detalle permitido; elige tutorial o referencia; en un tutorial, ordena los conceptos por prerrequisito y dificultad; reubica el detalle que sea propiedad de descendientes; sustituye las explicaciones de nivel inferior por enlaces a sus dueños.

## La taxonomía de niveles: un hogar por cada hecho

Cada hecho tiene un hogar: el nivel cuyo trabajo es; en cualquier otro sitio, enlaza allí.

| Nivel | Trabajo | NO pertenece ahí |
|---|---|---|
| `AGENTS.md` raíz | Órdenes permanentes: reglas que un agent necesita en contexto en cada sesión, de una a tres líneas cada una, enlazando a su hogar | Historias, ejemplos desarrollados, procedimientos situacionales, cualquier cosa repetida de un hogar enlazado |
| `AGENTS.md` de subárbol (`packages/`, `docs/`, `.agents/notes/`) | Órdenes específicas de ese subárbol | Reglas de todo el repo que el fichero raíz ya lleva |
| [architecture.md](architecture.es.md) | Mapa ordenado: composición, paquetes core, bucle, seams, puntos de extensión; leer antes de tocar `packages/` | Definiciones de tipos (→ subsystems), detalle por paquete (→ READMEs de paquete), justificación de decisiones (→ Agent Notes), anotaciones de estado de implementación |
| [subsystems/](subsystems/README.es.md) | Una página de referencia por subsistema: definiciones de tipos, semántica y la API de Cordis generada | Narración de comportamiento (→ architecture.md) |
| [Agent Notes](../.agents/notes/README.md) | Registros de decisiones activos: el porqué, qué se sacrificó y la verificación requerida; las notas de `implemented/` describen la realidad enviada en tiempo presente | Planes de migración, checklists de aceptación, recorridos de fixtures y lenguaje de especificación («should…») una vez la decisión se envió; las notas archivadas son historia congelada, nunca autoridad actual |
| [postmortem/](postmortem/README.es.md) | Historias de incidentes — el único nivel donde cabe la narración de guerra | — |
| [Historial de persistencia](persistence-changes/README.es.md) y [referencias de formato](persistence-changes/historical-formats/README.es.md) | Reconocimientos de cambios de tipos, comparativas entre releases y schemas históricos completos | Cambios solo de comportamiento; contratos actuales de runtime |
| [cookbook/](cookbook/adding-a-package.es.md) | Guías paso a paso con pasos de verificación numerados | Justificación de diseño (→ la Agent Note que cada guía enlaza) |
| [user/](user/index.es.md) | Guías de producto publicadas por la web de documentación | Tablas de referencia generadas, procedimientos de contribución, historial de decisiones |
| README de paquete | El contrato por paquete: configuración, semántica, limitaciones, puntos de extensión y [Model Experience](cookbook/adding-a-package.es.md#4-write-the-package-readme) | Repetición de JSDoc, repetición de catálogos generados (tablas de eventos/tools), asuntos de otros paquetes |
| [development.md](development.es.md) | Puesta a punto del contribuidor, flujo diario y un resumen de CI; un par bilingüe bajo el [contrato i18n](i18n/README.es.md) | Justificación de runtime/versión (→ Agent Notes), listas checked-por-checked que se desvían de los scripts de `package.json` |
| Referencia generada: las regiones `cordis-surface` por página en [subsystems/](subsystems/README.es.md), el [nivel de API core de Cordis + heredada](cordis-api/context.es.md), [tool-catalog](tool-catalog.es.md), [config-catalog](config-catalog.es.md), [persistence-catalog](persistence-catalog.es.md), [module-graph.md](module-graph.es.md) | Fuentes inglesas exhaustivas regeneradas desde código y con puerta de frescura; las contrapartes revisadas siguen el [flujo de emparejamiento](i18n/README.es.md#scope-and-exclusions) | Ediciones a mano de fuentes o regiones inglesas generadas; las contrapartes se actualizan solo vía emparejamiento |
| Skills (`.agents/skills/`) | Flujos de trabajo reutilizables y estándares de decisión especializados | Contratos de producto y runtime (→ docs o código) |

Ubicación: bugs → postmortems; justificación → Agent Notes; procedimientos → cookbooks; definiciones de tipos → subsystems; contratos de paquete → READMEs; órdenes permanentes → `AGENTS.md` raíz con un enlace a la justificación.

## Reglas de escritura

- **Documenta el estado actual.** Deja el historial en commits, PRs, Agent Notes, postmortems o registros de persistencia acotados. La demás prosa nombra mecanismos vivos, no cambios ni posiciones en la pila. La prosa general del formato de sesión enlaza la [autoridad de versión/estado](session-format-status.es.md); conserva los números para contratos, ejemplos o evidencia específicos de una versión.
- **Aplica los criterios de creación de Agent Notes.** Las ediciones mecánicas/locales están exentas, incluidos los cambios locales de UI; mantiene precisas las notas dueñas existentes ([ámbito](../.agents/notes/README.md#when-to-write-one)).
- **Una línea física por párrafo** (`verify-md-wrap`): usa el soft-wrap del editor. Los bloques de código, las tablas y la estructura de listas conservan su formato; los comentarios de código quedan bajo el límite de columnas del linter.
- **Los bloques `ts` cercados deben compilar** (`doc-typecheck`); una declaración de tipo pegada con su JSDoc original usa ` ```ts type-equiv `, mientras que una declaración de clase pública sin cuerpo usa ` ```ts public-api `; registra cualquiera de las dos en el manifest para que no puedan derivar ([mecánica](development.es.md#documenting-types-verbatim-ts-type-equiv)).
- **La página [subsystems](subsystems/README.es.md) dueña se actualiza en el mismo cambio** que remodela un tipo documentado. `verify-type-equiv` detecta pegados que derivaron, no tipos nuevos nunca documentados; un tipo se documenta en la página del grupo de paquetes que lo declara ([ámbito de página](../.agents/notes/implemented/process/2026-08-03-package-anchored-subsystem-pages.md)).
- **Los pares se actualizan juntos**: el trabajo de agent activo en una sola pasada guiado por la [terminología](i18n/terminology.md) reposiciona las anotaciones de primera aparición, preserva la prosa intacta y re-graba; `dsh-translate-docs` sigue siendo invocado por la persona usuaria ([contrato](i18n/README.es.md)).
- **Los comentarios y el JSDoc declaran contratos completos, no transcripciones de razonamiento.** Preserva comportamiento, fallo, temporización, propiedad, modalidad, excepciones, consecuencias y orientación no obvia; borra narración, recorridos de tests, análisis de revisión y repetición del código. Conserva el contrato local y enlaza su justificación. Usa [dsh-prose-standard](../.agents/skills/dsh-prose-standard/SKILL.md) para el detalle.
- Escribe directo: nombra actores y hechos ([decisión](../.agents/notes/implemented/process/2026-08-09-concrete-prose-names-actors-and-recorded-facts.md)). Reserva `seam` para la capacidad definida. Nombra el check, tipo, API, operación o comportamiento exacto en vez de «puerta», «vocabulario» o «superficie» metafóricos.

## Presupuestos de palabras

[scripts/doc-budgets.manifest.json](../scripts/doc-budgets.manifest.json) fija los techos de documentos permanentes; `pnpm run verify-doc-budgets` rechaza el exceso o la falta de ficheros.

Cuando la puerta se pone roja:

1. **Reubica** el contenido que pertenece a otro nivel; deja un enlace de una línea si hace falta.
2. **Condensa** el contenido que pertenece aquí pero puede ser más corto.
3. **Sube** el techo solo cuando las palabras necesitan el espacio; justifica el diff del manifest en la PR. Un techo demasiado bajo es un bug de presupuesto.

Los techos son barandillas, no objetivos de reducción. En o por debajo del objetivo, conserva al menos un 5 % de margen; por encima, congela el techo hasta que reubicar o condensar devuelva el documento al objetivo. Baja un techo solo cuando al documento aún le sobra espacio. Objetivos: `AGENTS.md` raíz ≤ 1.960; `architecture.md` ≤ 2.400; `AGENTS.md` de subárbol ≤ 600, salvo `packages/AGENTS.md` ≤ 750 y este fichero ≤ 1.320; `packages/README.md` ≤ 994; más `cordis-primer.md` 600, `defensive-patterns.md` 550, `testing.md` 1.300, `examples/AGENTS.md` 310. La revisión gobierna los niveles sin presupuesto.

## La checklist de slop

Cázalos en cualquier doc; [dsh-doc](../.agents/skills/dsh-doc/SKILL.md) recorre esta lista como auditoría:

- Reglas duplicadas: busca una frase distintiva; deja un solo hogar y enlaza el resto.
- Historial fuera de su nivel permitido: declara hechos actuales y enlaza al dueño histórico.
- Anotaciones de estado de implementación en prosa o diagramas («¡implementado!», «futuro: …»). El estado se pudre; el layout del repo y los manifests de paquetes lo llevan.
- Catálogos, JSDoc o inventarios de tests, paquetes y estado reescritos a mano cuando el código o un generador es la autoridad.
- Transcripciones de razonamiento: narración paso a paso de la implementación, demostración de ramas obvias, recorridos de tests o alternativas locales rechazadas. Conserva el contrato resultante o la justificación duradera; borra el camino seguido para deducirlo.
- Justificación repetida junto a métodos hermanos en vez de una vez junto a la capacidad o el helper dueño.
- Muros de párrafo: un párrafo cargando varias reglas y paréntesis. Divídelo o degrada el detalle a su hogar.
- Inflación de énfasis: negritas, MAYÚSCULAS o «críticamente» por todas partes hacen que nada destaque. Reserva el énfasis para la cláusula que cambia el comportamiento.
- Lenguaje de especificación en Agent Notes de `implemented/`: «should», planes de migración, checklists de aceptación. Una Agent Note implementada describe lo que hay, según las [instrucciones de notas implementadas](../.agents/notes/implemented/AGENTS.md).

## Referencias del repositorio

Usa enlaces Markdown relativos para ficheros actuales y tags o números de PR para referencias históricas. `verify-md-links` comprueba los destinos locales. La [validación de referencias](../scripts/verify-repository-references.ts) rechaza identificadores de commit reales y URLs de organización no permitidas en ficheros mantenidos.
