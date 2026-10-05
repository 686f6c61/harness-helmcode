/**
 * `slash.menu` namespace dictionaries: group titles keyed by source name
 * (the lookup chain returns the key itself, so an unknown source shows its
 * raw name), the pending row, and the listbox and header aria labels.
 */

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'command': 'Comandos',
  'skill': 'Habilidades',
  'subagent': 'Subagentes',
  'loading': 'Cargando…',
  'drill.aria': 'Explorar carpeta',
  'drill.hint': 'Explorar carpeta',
  'drill.key': 'Tab',
  'crumbs.aria': 'Navegación de carpetas',
  'suggestions.aria': 'Sugerencias de activación',
} satisfies Record<string, string>

/** The slash.menu namespace key union. */
export type MenuKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'command': 'Commands',
  'skill': 'Skills',
  'subagent': 'Subagents',
  'loading': 'Loading…',
  'drill.aria': 'Browse folder',
  'drill.hint': 'Browse folder',
  'drill.key': 'Tab',
  'crumbs.aria': 'Folder navigation',
  'suggestions.aria': 'Trigger suggestions',
} satisfies Record<MenuKey, string>
