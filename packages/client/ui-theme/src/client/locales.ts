/** `settings.theme` namespace dictionaries (the Appearance and font-size rows' copy). */

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'appearance.title': 'Apariencia',
  'appearance.light': 'Claro',
  'appearance.dark': 'Oscuro',
  'appearance.system': 'Sistema',
  'fontSize.title': 'Tamaño de fuente',
  'fontSize.description': 'Solo afecta al contenido de la conversación',
  'fontSize.unit': 'px',
  'fontSize.increase': 'Aumentar tamaño de fuente',
  'fontSize.decrease': 'Reducir tamaño de fuente',
} satisfies Record<string, string>

/** The settings.theme namespace key union. */
export type ThemeKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'appearance.title': 'Appearance',
  'appearance.light': 'Light',
  'appearance.dark': 'Dark',
  'appearance.system': 'System',
  'fontSize.title': 'Font size',
  'fontSize.description': 'Only affects conversation content',
  'fontSize.unit': 'px',
  'fontSize.increase': 'Increase font size',
  'fontSize.decrease': 'Decrease font size',
} satisfies Record<ThemeKey, string>
