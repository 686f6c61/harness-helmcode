/**
 * `command` namespace dictionaries: the composer menu's section headings,
 * the client face (title, description, claim token) of the built-in Host
 * commands whose catalog descriptors carry English text only, and the
 * popupSelect shell's copy.
 */

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'section.add': 'Añadir',
  'section.commands': 'Comandos',
  'label.goal': 'Objetivo',
  'label.plan': 'Plan',
  'label.feedback': 'Comentarios',
  'label.compact': 'Compactar',
  'label.permission': 'Permisos',
  'label.export': 'Descargar registro',
  'description.goal': 'Establecer o ver el objetivo de una tarea de larga duración',
  'description.plan': 'Entrar o salir del modo plan',
  'description.feedback': 'Enviar comentarios sobre la sesión actual',
  'description.compact': 'Compactar el historial de conversación anterior',
  'description.permission': 'Cambiar el preset de permisos (modo sandbox y política de aprobación)',
  'description.export': 'Descargar el registro de esta sesión como archivo ZIP',
  'token.goal': 'objetivo',
  'token.plan': 'plan',
  'token.feedback': 'comentarios',
  'token.compact': 'compactar',
  'token.permission': 'permiso',
  'token.export': 'exportar',
  'search.placeholder': 'Buscar…',
  'search.aria': 'Filtrar opciones',
  'status.loading': 'Cargando opciones…',
  'status.applying': 'Aplicando…',
  'status.empty': 'Sin opciones',
  'overlay.aria': 'Opciones de /{command}',
  'listbox.aria': 'Coincidencias de /{command}',
  'notice.attachmentsUnsupported': '/{command} no acepta archivos adjuntos; quítalos primero',
} satisfies Record<string, string>

/** The command namespace key union. */
export type CommandKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'section.add': 'Add',
  'section.commands': 'Commands',
  'label.goal': 'Goal',
  'label.plan': 'Plan',
  'label.feedback': 'Feedback',
  'label.compact': 'Compact',
  'label.permission': 'Permission',
  'label.export': 'Export',
  'description.goal': 'Set or view the goal for a long-running task',
  'description.plan': 'Enter or leave plan mode',
  'description.feedback': 'Record feedback about this session',
  'description.compact': 'Compact older conversation history',
  'description.permission': 'Switch the permission preset (sandbox mode + approval policy)',
  'description.export': 'Download this Session log as a ZIP archive',
  'token.goal': 'goal',
  'token.plan': 'plan',
  'token.feedback': 'feedback',
  'token.compact': 'compact',
  'token.permission': 'permission',
  'token.export': 'export',
  'search.placeholder': 'Search…',
  'search.aria': 'Filter options',
  'status.loading': 'Loading options…',
  'status.applying': 'Applying…',
  'status.empty': 'No options',
  'overlay.aria': '/{command} options',
  'listbox.aria': '/{command} matches',
  'notice.attachmentsUnsupported': '/{command} does not accept attachments; remove them first',
} satisfies Record<CommandKey, string>
