/** `plan` namespace dictionaries (the composer plan chip's copy). */

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'chip.label': 'Plan',
  'preview.title': 'Plan',
  'preview.document': 'Plan · Markdown',
  'preview.action': 'Abrir',
  'preview.open': 'Abrir plan en la barra lateral',
  'preview.full': 'Ver plan completo',
  'preview.openNamed': 'Abrir plan: {title}',
  'preview.loading': 'Cargando plan…',
  'preview.failed': 'No se pudo cargar el plan',
  'preview.invalidAddress': 'Dirección de plan no válida',
  'preview.historyUnavailable': 'El historial de la sesión no está disponible',
  'preview.notFound': 'No se encontró este plan',
  'preview.unavailable': 'La vista previa del plan no está disponible',
  'preview.expired': 'Esta vista previa temporal del plan ha caducado. Vuelve a abrirla desde la tarjeta pendiente de revisión.',
  'chip.on.aria': 'Modo plan activado, pulsa para desactivarlo',
  'chip.on.title': 'Modo plan activado — clic para desactivarlo (/plan off)',
  'chip.exitFailed': 'Error al salir del modo plan',
} satisfies Record<string, string>

/** The plan namespace key union. */
export type PlanKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'chip.label': 'Plan',
  'preview.title': 'Plan',
  'preview.document': 'Plan · Markdown',
  'preview.action': 'Open',
  'preview.open': 'Open plan in sidebar',
  'preview.full': 'View full plan',
  'preview.openNamed': 'Open plan: {title}',
  'preview.loading': 'Loading plan…',
  'preview.failed': 'Could not load plan',
  'preview.invalidAddress': 'Invalid plan address',
  'preview.historyUnavailable': 'Session history is unavailable',
  'preview.notFound': 'This plan was not found',
  'preview.unavailable': 'Plan preview is unavailable',
  'preview.expired': 'This temporary plan preview has expired. Reopen it from the pending review card.',
  'chip.on.aria': 'Plan mode on, press to turn off',
  'chip.on.title': 'Plan mode on — click to turn off (/plan off)',
  'chip.exitFailed': 'Failed to exit plan mode',
} satisfies Record<PlanKey, string>
