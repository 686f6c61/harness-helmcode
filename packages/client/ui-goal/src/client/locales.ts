/** `goal` namespace dictionaries. */

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'phase.active': 'Objetivo en curso',
  'phase.active.disarmed': 'Objetivo inactivo',
  'phase.paused': 'Objetivo en pausa',
  'phase.blocked': 'Objetivo bloqueado',
  'objective.aria': 'Contenido del objetivo',
  'commandInput.aria': 'Entrada de comandos',
  'action.save': 'Guardar objetivo',
  'action.cancel': 'Cancelar edición',
  'action.pause': 'Pausar objetivo',
  'action.resume': 'Reanudar objetivo',
  'action.edit': 'Editar objetivo',
  'action.clear': 'Borrar objetivo',
} satisfies Record<string, string>

/** The goal namespace key union. */
export type GoalKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'phase.active': 'Ongoing Goal',
  'phase.active.disarmed': 'Inactive Goal',
  'phase.paused': 'Paused Goal',
  'phase.blocked': 'Blocked Goal',
  'objective.aria': 'Goal objective',
  'commandInput.aria': 'Command input',
  'action.save': 'Save goal',
  'action.cancel': 'Cancel edit',
  'action.pause': 'Pause goal',
  'action.resume': 'Resume goal',
  'action.edit': 'Edit goal',
  'action.clear': 'Clear goal',
} satisfies Record<GoalKey, string>
