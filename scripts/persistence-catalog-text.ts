/** Authored language pairs for generated persistence reference prose. */

/** Language of a generated persistence reference. */
export type PersistenceCatalogLocale = 'en' | 'es'

const english = {
  title: 'Session Persistence Event Catalog',
  intro: 'Every repository-declared durable Session event appears here with its source declaration and resolved types. The catalog covers the logical and physical headers, event envelopes, and every plugin declaration merge. See [Session](subsystems/session.md) for replay and [persistence](subsystems/persistence.md) for storage.',
  generation: 'Run `pnpm run gen-persistence-catalog` to regenerate both catalog languages, their pairing record, the known-event module, and the machine schema inventory. `pnpm run verify-persistence-catalog` checks all generated files. Declaration fences preserve source JSDoc and type references; resolved definitions expose their transitive structure.',
  envelopeIntro: 'The envelope carries `type`, `seq`, `time`, `data`, optional `ignorable`, and conditional `surfaceOp` / `sourceEventSeqs`. A **surface** event produces model history; a **log-only** event does not. The inventory covers this repository; external plugin types require their own declarations and are outside this catalog.',
  envelope: 'Event envelope', events: 'Events', sources: 'Sources: ', source: 'Source: ', types: 'Types: ',
  fingerprints: 'Persistence type fingerprints',
  fingerprintsIntro: 'The [machine inventory](persistence-schema.json) contains every reachable normalized type and its SHA-256 digest. Root digests include referenced types. Comments, source locations, alias names, erased brands, readonly markers, and harmless field, union, or intersection reordering do not affect these fingerprints. Tuple order, property names, value types, and optionality do. Catalog text and source locations can still produce a diff when digests stay unchanged.',
  historyIntro: 'The [format references](persistence-changes/historical-formats/README.md) cover every historical Session format. The [change records](persistence-changes/README.md) acknowledge exact transitions using snapshots kept in this tree. Follow the [review workflow](cookbook/reviewing-persistence-type-changes.md) to classify a change and record it. These checks cover declared type structure; opaque payload contents and behavior without type changes are outside their scope.',
  rootColumns: '| Root | Kind | SHA-256 | Resolved type |',
  definitions: 'Resolved persistence types',
  definitionsIntro: 'Each definition appears once. References preserve sharing and recursion; the digest beside a definition includes its complete reachable structure. Source names and locations identify its declarations but are excluded from its digest.',
  propertyColumns: '| Property | Presence | Type |', positionColumns: '| Position | Presence | Type |',
  optional: 'optional', required: 'required', rest: 'rest', index: 'index signature',
  emptyObject: 'Object with no declared properties.', arrayPrefix: 'Array of ', arraySuffix: '.',
  oneOf: 'One of:', opaque: ' (opaque)', opaqueExplanation: ": the declaration does not expose the stored value's internal fields.",
  sourceCompatibility: 'Source compatibility: ', attributionAdditions: 'Attribution-only additions: ',
  sourceColumns: '| kind | Form property | Other required fields | Full definition |',
  notDeclared: 'not declared', none: 'none',
}

const spanish: Record<keyof typeof english, string> = {
  title: 'Catálogo de eventos de persistencia de Session',
  intro: 'Cada evento durable de Session declarado en el repositorio aparece aquí con su declaración fuente y sus tipos resueltos. El catálogo cubre los headers lógicos y físicos, los sobres de eventos y cada fusión de declaraciones de plugins. Consulta [Session](subsystems/session.es.md) para la reproducción y [persistencia](subsystems/persistence.es.md) para el almacenamiento.',
  generation: 'Ejecuta `pnpm run gen-persistence-catalog` para regenerar los dos idiomas del catálogo, su registro de emparejamiento, el módulo de eventos conocidos y el inventario de esquemas máquina. `pnpm run verify-persistence-catalog` comprueba todos los archivos generados. Las cercas de declaración conservan el JSDoc fuente y las referencias de tipos; las definiciones resueltas exponen su estructura transitiva.',
  envelopeIntro: 'El sobre lleva `type`, `seq`, `time`, `data`, el campo opcional `ignorable` y los condicionales `surfaceOp` / `sourceEventSeqs`. Un evento **surface** produce historial del modelo; uno **log-only** no. El inventario cubre este repositorio; los tipos de plugins externos requieren sus propias declaraciones y quedan fuera de este catálogo.',
  envelope: 'Sobre del evento', events: 'Eventos', sources: 'Fuentes: ', source: 'Fuente: ', types: 'Tipos: ',
  fingerprints: 'Huellas de tipos de persistencia',
  fingerprintsIntro: 'El [inventario máquina](persistence-schema.json) contiene cada tipo normalizado alcanzable y su resumen SHA-256. Los resúmenes raíz incluyen los tipos referenciados. Los comentarios, las ubicaciones fuente, los alias, las marcas borradas, los modificadores readonly y los reordenamientos sin cambio semántico de campos, uniones o intersecciones no afectan a estas huellas. El orden de tuplas, los nombres de propiedades, los tipos de valores y la opcionalidad sí. El texto del catálogo y las ubicaciones fuente pueden seguir produciendo un diff cuando las huellas no cambian.',
  historyIntro: 'Las [referencias de formato](persistence-changes/historical-formats/README.es.md) cubren cada formato histórico de Session. Los [registros de cambios](persistence-changes/README.es.md) confirman transiciones exactas mediante snapshots conservados en este árbol. Sigue el [flujo de revisión](cookbook/reviewing-persistence-type-changes.es.md) para clasificar un cambio y registrarlo. Estas comprobaciones cubren la estructura de tipos declarada; el contenido de cargas opacas y el comportamiento sin cambios de tipos quedan fuera de su alcance.',
  rootColumns: '| Raíz | Categoría | SHA-256 | Tipo resuelto |',
  definitions: 'Tipos de persistencia resueltos',
  definitionsIntro: 'Cada definición aparece una sola vez. Las referencias conservan las relaciones compartidas y recursivas; el resumen junto a una definición incluye su estructura alcanzable completa. Los nombres y ubicaciones fuente identifican sus declaraciones pero quedan excluidos de su resumen.',
  propertyColumns: '| Propiedad | Presencia | Tipo |', positionColumns: '| Posición | Presencia | Tipo |',
  optional: 'opcional', required: 'obligatorio', rest: 'resto', index: 'firma de índice',
  emptyObject: 'Objeto sin propiedades declaradas.', arrayPrefix: 'Array de ', arraySuffix: '.',
  oneOf: 'Uno de:', opaque: ' (opaco)', opaqueExplanation: ': la declaración no expone los campos internos del valor almacenado.',
  sourceCompatibility: 'Política de compatibilidad de fuentes: ', attributionAdditions: 'Kinds añadidos solo para atribución: ',
  sourceColumns: '| kind | Propiedad form | Otros campos obligatorios | Definición completa |',
  notDeclared: 'no declarado', none: 'ninguno',
}

/** Complete translated prose; adding an English key requires its Spanish counterpart. */
export const persistenceCatalogText = { en: english, es: spanish }
