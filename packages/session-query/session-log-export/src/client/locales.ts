/** Locale namespace owned by Session export browser feedback. */
export const NS = 'session-log-download'

/** Spanish Session export strings. */
export const es = {
  'header.more': 'Más acciones',
  'menu.download': 'Descargar el registro de la sesión',
  'menu.feedback': 'Comentarios',
  'dialog.preparingTitle': 'Exportando la sesión',
  'dialog.preparingDescription': 'Preparando un archivo ZIP con la sesión actual, sus subsesiones y los adjuntos.',
  'dialog.successTitle': 'La descarga de la sesión ha comenzado',
  'dialog.successDescription': 'El navegador está descargando el archivo ZIP de la sesión.',
  'dialog.errorTitle': 'La exportación de la sesión falló',
  'dialog.close': 'Cerrar',
  'dialog.commandFailed': 'No se pudo iniciar la exportación de la sesión.',
} as const

/** English Session export strings. */
export const en: Record<keyof typeof es, string> = {
  'header.more': 'More actions',
  'menu.download': 'Download session log',
  'menu.feedback': 'Feedback',
  'dialog.preparingTitle': 'Exporting Session',
  'dialog.preparingDescription': 'Preparing a ZIP containing this Session, its sub-Sessions, and attachments.',
  'dialog.successTitle': 'Session download started',
  'dialog.successDescription': 'The browser is downloading the Session ZIP.',
  'dialog.errorTitle': 'Session export failed',
  'dialog.close': 'Close',
  'dialog.commandFailed': 'Could not start the Session export.',
}

/** Stable locale keys consumed by the shared modal. */
export type SessionLogDownloadKey = keyof typeof es
