/** `settings.locale` namespace dictionaries (the Language row's copy). */

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'language.title': 'Idioma',
} satisfies Record<string, string>

/** The settings.locale namespace key union. */
export type SettingsLocaleKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'language.title': 'Language',
} satisfies Record<SettingsLocaleKey, string>
