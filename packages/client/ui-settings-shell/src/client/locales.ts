/** Locale bundles for the shell executor's settings page. */

import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'

/** Locale keys the page renders. */
export type ShellSettingsLocaleKey =
  | 'title' | 'description'
  | 'timeoutMs' | 'timeoutMsHint' | 'maxOutputBytes' | 'maxOutputBytesHint'
  | 'overridden' | 'reset' | 'readOnly' | 'unavailable'
  | 'save' | 'saving' | 'saveFailed' | 'invalidNumber'

/** English copy. */
export const en: Record<ShellSettingsLocaleKey, string> = {
  title: 'Shell',
  description: 'Limit how long each command may run and how much it may output.',
  timeoutMs: 'Command timeout (ms)',
  timeoutMsHint: 'How long one command may run before it is terminated.',
  maxOutputBytes: 'Output cap per stream (bytes)',
  maxOutputBytesHint: 'Output beyond this spills to a temporary file rather than being lost.',
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
export const es: Record<ShellSettingsLocaleKey, string> = {
  title: 'Terminal',
  description: 'Limitar cuánto tiempo puede ejecutarse cada comando y cuánta salida puede producir.',
  timeoutMs: 'Tiempo de espera del comando (ms)',
  timeoutMsHint: 'Cuánto tiempo puede ejecutarse un comando antes de que se termine.',
  maxOutputBytes: 'Límite de salida por flujo (bytes)',
  maxOutputBytesHint: 'La salida que supere este límite se vuelca a un archivo temporal en lugar de perderse.',
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
export function formLabels(t: (key: ShellSettingsLocaleKey) => string): SettingsFormLabels {
  return { unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') }
}
