/** Locale bundles for the web-search provider's settings page. */

import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'

/** Locale keys the page renders. */
export type WebSearchSettingsLocaleKey =
  | 'title' | 'description'
  | 'apiKey' | 'apiKeyHint' | 'apiKeySet' | 'apiKeyUnset'
  | 'baseUrl' | 'baseUrlHint' | 'numResults' | 'numResultsHint'
  | 'overridden' | 'reset' | 'readOnly' | 'unavailable'
  | 'save' | 'saving' | 'saveFailed' | 'invalidNumber'

/** English copy. */
export const en: Record<WebSearchSettingsLocaleKey, string> = {
  title: 'Web search',
  description: 'Set up the Brave search provider.',
  apiKey: 'API key',
  apiKeyHint: 'Stored outside the settings file. Leave blank to keep the current key.',
  apiKeySet: 'A key is configured.',
  apiKeyUnset: 'No key is configured, so web search reports itself unavailable until one is saved here or supplied through the environment.',
  baseUrl: 'Endpoint',
  baseUrlHint: 'Leave blank to use the provider default.',
  numResults: 'Default result count',
  numResultsHint: 'Sources returned when a search names no bound of its own.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  readOnly: 'This deployment stores settings read-only.',
  unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
  save: 'Save',
  saving: 'Saving…',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  invalidNumber: 'Enter a number, or leave blank to use the default.',
}

/** Spanish copy. */
export const es: Record<WebSearchSettingsLocaleKey, string> = {
  title: 'Búsqueda web',
  description: 'Configurar el proveedor de búsqueda de Brave.',
  apiKey: 'Clave de API',
  apiKeyHint: 'Se almacena fuera del archivo de configuración. Déjala en blanco para conservar la clave actual.',
  apiKeySet: 'Hay una clave configurada.',
  apiKeyUnset: 'No hay ninguna clave configurada; la búsqueda web se declara no disponible hasta que guardes una aquí o la supplies mediante el entorno.',
  baseUrl: 'Endpoint',
  baseUrlHint: 'Déjalo en blanco para usar el valor predeterminado del proveedor.',
  numResults: 'Número de resultados por defecto',
  numResultsHint: 'Fuentes devueltas cuando una búsqueda no indica un límite propio.',
  overridden: 'Anulado',
  reset: 'Restablecer valor predeterminado',
  readOnly: 'Esta implementación almacena la configuración en solo lectura.',
  unavailable: 'Este plugin no está cargado, por lo que no se puede configurar ahora.',
  save: 'Guardar',
  saving: 'Guardando…',
  saveFailed: 'La implementación no aceptó estos valores; se conservaron para que los corrijas.',
  invalidNumber: 'Introduce un número o déjalo en blanco para usar el valor predeterminado.',
}

/**
 * The form frame's copy, read from this page's dictionary.
 * @param t - the page's locale reader.
 * @returns the labels the shared settings form renders.
 */
export function formLabels(t: (key: WebSearchSettingsLocaleKey) => string): SettingsFormLabels {
  return { unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') }
}
