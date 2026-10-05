/** `skill` namespace dictionaries for the dedicated tool row. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'skill'

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'row.title': 'Habilidad',
  'row.running': 'Cargando habilidad',
  'row.preparing': 'Preparando la carga de una habilidad',
  'row.failed': 'Error al cargar la habilidad',
  'row.stopped': 'Carga de la habilidad detenida',
  'row.instructions': 'Instrucciones',
  'row.inspect': 'Inspeccionar',
  'menu.userOnly': 'solo usuario',
} satisfies Record<string, string>

/** The skill namespace key union. */
export type SkillKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'row.title': 'Skill',
  'row.running': 'Loading skill',
  'row.preparing': 'Preparing to load a skill',
  'row.failed': 'Skill load failed',
  'row.stopped': 'Skill load stopped',
  'row.instructions': 'Instructions',
  'row.inspect': 'Inspect',
  'menu.userOnly': 'user-only',
} satisfies Record<SkillKey, string>
