/** Locale bundles for the agent-preset hero chip, header label, and management section. */

import { guideEn, guideEs, type PresetGuideKey } from './guide-locales.ts'

/** Locale keys these surfaces render. */
export type AgentPresetSettingsKey =
  | PresetGuideKey
  | 'builtInGroup'
  | 'customGroup'
  | 'seatHint'
  | 'headerHint'
  | 'nav'
  | 'sectionIntro'
  | 'setDefault'
  | 'view'
  | 'presetStandardName'
  | 'presetStandardDescription'
  | 'presetPtcName'
  | 'presetPtcDescription'
  | 'presetMinimalName'
  | 'presetMinimalDescription'
  | 'presetCordisName'
  | 'presetCordisDescription'
  | 'inUse'
  | 'noDescription'
  | 'brokenBadge'
  | 'switchRefused'
  | 'close'
  | 'creatorDraft'

/** English copy. */
export const en: Record<AgentPresetSettingsKey, string> = {
  ...guideEn,
  builtInGroup: 'Built-in', customGroup: 'Custom',
  sectionIntro: 'Choose the agent’s tools and how it works. Use Standard mode for everyday tasks, or Creator mode to add capabilities to DSH.',

  seatHint: 'Choose the agent preset for your new task',
  headerHint: 'The agent preset chosen when this task started',
  nav: 'Agent presets',

  setDefault: 'Set as new task default',
  view: 'View configuration',

  presetStandardName: 'Standard mode',
  presetStandardDescription:
    'Work with code, files, and information. Suitable for most tasks, with search, editing, terminal commands, and other tools available as needed.',
  presetPtcName: 'PTC mode',
  presetPtcDescription:
    'Includes all Standard mode capabilities. Better suited to tasks that call tools in batches and then filter, organize, deduplicate, count, or summarize the results.',
  presetMinimalName: 'Minimal mode',
  presetMinimalDescription:
    'The agent works using only a terminal tool. Useful for testing and comparing its basic performance.',
  presetCordisName: 'Creator mode',
  presetCordisDescription:
    'Customize DSH through conversation. Let the agent write plugins that add features or UI, or combine tools and prompts to create your own mode.',

  inUse: 'New task default',

  noDescription: 'No description.',
  brokenBadge: 'Failed to load',

  switchRefused: 'Could not switch to {name}: {reason}',

  close: 'Close',

  creatorDraft: 'Let the agent help me create a preset',

}

/** Spanish copy. */
export const es: Record<AgentPresetSettingsKey, string> = {
  ...guideEs,
  builtInGroup: 'Integrados', customGroup: 'Personalizados',
  sectionIntro: 'Elige las herramientas del agente y su forma de trabajar. Usa el modo Estándar para las tareas diarias, o el modo Creador para añadir capacidades a DSH.',

  seatHint: 'Elige el preset de agente para tu nueva tarea',
  headerHint: 'El preset de agente elegido al iniciar esta tarea',
  nav: 'Presets de agente',

  setDefault: 'Establecer como predeterminado para nuevas tareas',
  view: 'Ver configuración',

  presetStandardName: 'Modo estándar',
  presetStandardDescription:
    'Trabaja con código, archivos e información. Adecuado para la mayoría de las tareas, con búsqueda, edición, comandos de terminal y otras herramientas disponibles según sea necesario.',
  presetPtcName: 'Modo PTC',
  presetPtcDescription:
    'Incluye todas las capacidades del modo Estándar. Más adecuado para tareas que llaman herramientas por lotes y luego filtran, organizan, deduplican, cuentan o resumen los resultados.',
  presetMinimalName: 'Modo mínimo',
  presetMinimalDescription:
    'El agente trabaja usando solo una herramienta de terminal. Útil para probar y comparar su rendimiento básico.',
  presetCordisName: 'Modo creador',
  presetCordisDescription:
    'Personaliza DSH mediante conversación. Deja que el agente escriba plugins que añadan funciones o interfaz, o combina herramientas y prompts para crear tu propio modo.',

  inUse: 'Predeterminado para nuevas tareas',

  noDescription: 'Sin descripción.',
  brokenBadge: 'Error al cargar',

  switchRefused: 'No se pudo cambiar a {name}: {reason}',

  close: 'Cerrar',

  creatorDraft: 'Dejar que el agente me ayude a crear un preset',

}

// The resolution itself is the shared fold in `dsh-agent-preset-registry/display`,
// re-exported here so every surface in this plugin reads one path; the
// Settings plugin list inlines the same fold over this plugin's dictionaries.
export { isBuiltInPreset, presetDisplayText } from '@deepseek-ai/dsh-agent-preset-registry/display'
export type { PresetDisplaySource, PresetDisplayText } from '@deepseek-ai/dsh-agent-preset-registry/display'
