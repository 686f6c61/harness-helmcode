/** Locale bundles for the Subagent settings page. */

import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'

/** Locale keys the page renders. */
export type SubagentSettingsLocaleKey =
  | 'overridden' | 'reset' | 'readOnly' | 'unavailable'
  | 'save' | 'saving' | 'saveFailed'
  | 'subagentTitle' | 'subagentDescription' | 'subagentLimitsTitle'
  | 'subagentMaxDepth'
  | 'subagentDepthHelpLabel' | 'subagentDepthHelp'
  | 'subagentDepthZero' | 'subagentDepthOne' | 'subagentDepthOverride'
  | 'subagentMaxActive'
  | 'subagentCapacityHelpLabel' | 'subagentCapacityHelp'
  | 'subagentDepthInvalid'
  | 'subagentCapacityInvalid'
  | 'subagentModelSelectionTitle'
  | 'subagentModelSelectionToggle' | 'subagentModelSelectionChoose' | 'subagentModelSelectionAllowed'
  | 'subagentModelSelectionLoading' | 'subagentModelSelectionLoadFailed' | 'subagentModelSelectionRetry'
  | 'subagentModelSelectionPartial' | 'subagentModelSelectionUnavailable'
  | 'subagentModelSelectionUnavailableGroup' | 'subagentModelSelectionEmpty'
  | 'subagentModelSelectionRequired' | 'subagentModelSelectionConflict' | 'subagentModelSelectionOff'

/** English copy. */
export const en: Record<SubagentSettingsLocaleKey, string> = {
  overridden: 'Overridden',
  reset: 'Reset to default',
  readOnly: 'This deployment stores settings read-only.',
  unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
  save: 'Save',
  saving: 'Saving…',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  subagentTitle: 'Subagent',
  subagentDescription: 'Set Subagent recursion depth, count, and models.',
  subagentLimitsTitle: 'Limits',
  subagentMaxDepth: 'Maximum recursion depth',
  subagentDepthHelpLabel: 'About maximum recursion depth',
  subagentDepthHelp: 'Limits how many levels of Subagents an Agent can create.',
  subagentDepthZero: 'Disable Subagents',
  subagentDepthOne: 'Only the main Agent can create Subagents',
  subagentDepthOverride: 'If a tool defines its own maximum recursion depth, that setting takes precedence.',
  subagentMaxActive: 'Subagent parallelism limit',
  subagentCapacityHelpLabel: 'About the Subagent parallelism limit',
  subagentCapacityHelp: 'Total live Subagents under the same main Agent, across all recursion levels. The main Agent is excluded. New start requests are rejected when the limit is reached.',
  subagentDepthInvalid: 'Enter a whole number of 0 or more.',
  subagentCapacityInvalid: 'Enter a whole number of 1 or more.',
  subagentModelSelectionTitle: 'Model selection',
  subagentModelSelectionToggle: 'Allow agents to choose models for Subagents',
  subagentModelSelectionChoose: 'When enabled, agents can choose a provider, model, and reasoning effort for each Subagent from the authorized models below. Applies only to new sessions.',
  subagentModelSelectionAllowed: 'Models agents may choose',
  subagentModelSelectionLoading: 'Loading models…',
  subagentModelSelectionLoadFailed: 'Models could not be loaded.',
  subagentModelSelectionRetry: 'Retry',
  subagentModelSelectionPartial: 'Some model providers could not be loaded; saved choices remain removable.',
  subagentModelSelectionUnavailable: 'Currently unavailable',
  subagentModelSelectionUnavailableGroup: 'Saved but currently unavailable',
  subagentModelSelectionEmpty: 'No model provider currently advertises a model.',
  subagentModelSelectionRequired: 'Select at least one model before saving.',
  subagentModelSelectionConflict: 'Settings changed elsewhere. Discard your draft and try again.',
  subagentModelSelectionOff: 'Subagents use configured defaults or inherit the parent agent\'s model. Saved model choices are retained.',
}

/** Spanish copy. */
export const es: Record<SubagentSettingsLocaleKey, string> = {
  overridden: 'Anulado',
  reset: 'Restablecer valor predeterminado',
  readOnly: 'Esta implementación almacena la configuración en solo lectura.',
  unavailable: 'Este plugin no está cargado, por lo que no se puede configurar ahora.',
  save: 'Guardar',
  saving: 'Guardando…',
  saveFailed: 'La implementación no aceptó estos valores; se conservaron para que los corrijas.',
  subagentTitle: 'Subagente',
  subagentDescription: 'Configurar la profundidad de recursión, la cantidad y los modelos de los subagentes.',
  subagentLimitsTitle: 'Límites',
  subagentMaxDepth: 'Profundidad máxima de recursión',
  subagentDepthHelpLabel: 'Acerca de la profundidad máxima de recursión',
  subagentDepthHelp: 'Limita cuántos niveles de subagentes puede crear un agente.',
  subagentDepthZero: 'Desactivar subagentes',
  subagentDepthOne: 'Solo el agente principal puede crear subagentes',
  subagentDepthOverride: 'Si una herramienta define su propia profundidad máxima de recursión, esa configuración tiene prioridad.',
  subagentMaxActive: 'Límite de paralelismo de subagentes',
  subagentCapacityHelpLabel: 'Acerca del límite de paralelismo de subagentes',
  subagentCapacityHelp: 'Total de subagentes activos bajo el mismo agente principal, en todos los niveles de recursión. El agente principal no se cuenta. Las nuevas solicitudes de inicio se rechazan cuando se alcanza el límite.',
  subagentDepthInvalid: 'Introduce un número entero igual o mayor que 0.',
  subagentCapacityInvalid: 'Introduce un número entero igual o mayor que 1.',
  subagentModelSelectionTitle: 'Selección de modelo',
  subagentModelSelectionToggle: 'Permitir que los agentes elijan modelos para los subagentes',
  subagentModelSelectionChoose: 'Cuando está activado, los agentes pueden elegir un proveedor, un modelo y un esfuerzo de razonamiento para cada subagente entre los modelos autorizados a continuación. Se aplica solo a las sesiones nuevas.',
  subagentModelSelectionAllowed: 'Modelos que los agentes pueden elegir',
  subagentModelSelectionLoading: 'Cargando modelos…',
  subagentModelSelectionLoadFailed: 'No se pudieron cargar los modelos.',
  subagentModelSelectionRetry: 'Reintentar',
  subagentModelSelectionPartial: 'No se pudieron cargar algunos proveedores de modelos; las opciones guardadas se pueden seguir eliminando.',
  subagentModelSelectionUnavailable: 'No disponible actualmente',
  subagentModelSelectionUnavailableGroup: 'Guardado pero no disponible actualmente',
  subagentModelSelectionEmpty: 'Ningún proveedor de modelos anuncia un modelo actualmente.',
  subagentModelSelectionRequired: 'Selecciona al menos un modelo antes de guardar.',
  subagentModelSelectionConflict: 'La configuración cambió en otro lugar. Descarta tu borrador e inténtalo de nuevo.',
  subagentModelSelectionOff: 'Los subagentes usan los valores predeterminados configurados o heredan el modelo del agente padre. Las opciones de modelo guardadas se conservan.',
}

/**
 * The form frame's copy, read from this page's dictionary.
 * @param t - the page's locale reader.
 * @returns the labels the shared settings form renders.
 */
export function formLabels(t: (key: SubagentSettingsLocaleKey) => string): SettingsFormLabels {
  return { unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') }
}
