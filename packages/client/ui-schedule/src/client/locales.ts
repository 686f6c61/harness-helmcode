/**
 * `schedule.catalog` namespace dictionaries: the Session header catalog and the
 * Sidebar row mark with its hover-card task section.
 */
import { frequencyEn, frequencyEs } from './frequency-locales.ts'

/** Dictionary namespace owned by this plugin. */
export const NS = 'schedule.catalog'

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'trigger.label': 'Recordatorios',
  'list.loading': 'Cargando recordatorios…',
  'list.error': 'No se pudieron cargar los recordatorios.',
  'list.retry': 'Reintentar',
  'delete.action': 'Eliminar',
  'delete.pending': 'Eliminando…',
  'delete.label': 'Eliminar recordatorio: {title}',
  'list.open': 'Abrir detalles del recordatorio: {title}',
  'trigger.one': '{count} recordatorio',
  'trigger.other': '{count} recordatorios',
  'list.aria': 'Recordatorios activos',
  'list.nextRun': 'Próxima ejecución',
  'frequency.once': 'Una vez',
  'frequency.every': 'Cada {value} {unit}',
  ...frequencyEs,
  'mark.aria': '{count} tareas de automatización',
  'hover.more': '{count} tareas más',
} as const

/** English dictionary, key-identical to the Spanish source of truth. */
export const en: Record<ScheduleCatalogKey, string> = {
  'trigger.label': 'Reminders',
  'list.loading': 'Loading reminders…',
  'list.error': 'Could not load reminders.',
  'list.retry': 'Retry',
  'delete.action': 'Delete',
  'delete.pending': 'Deleting…',
  'delete.label': 'Delete reminder: {title}',
  'list.open': 'Open reminder details: {title}',
  'trigger.one': '{count} reminder',
  'trigger.other': '{count} reminders',
  'list.aria': 'Active reminders',
  'list.nextRun': 'Next run',
  'frequency.once': 'Once',
  'frequency.every': 'Every {value} {unit}',
  ...frequencyEn,
  'mark.aria': '{count} scheduled tasks',
  'hover.more': '{count} more',
}

/** Key domain of the Schedule catalog namespace. */
export type ScheduleCatalogKey = keyof typeof es
