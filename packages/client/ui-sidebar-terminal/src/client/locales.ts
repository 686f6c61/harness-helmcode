/** Copy owned by the sidebar terminal feature. */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    sidebarTerminal: keyof typeof es
  }
}

/** Spanish terminal copy. */
export const es = {
  'shortcut.noSession': 'Selecciona primero una sesión',
  recoveryFailed: 'Error al recuperar el terminal: {message}', retryRecovery: 'Reintentar la recuperación del terminal',
  shell: 'Seleccionar shell', shellLoading: 'Cargando shells…', shellEmpty: 'No hay shells disponibles', description: 'Ejecutar comandos en el espacio de trabajo de la sesión',
  title: 'Terminal', new: 'Nuevo terminal', loading: 'Leyendo el entorno del terminal…', creating: 'Iniciando…',
  connecting: 'Conectando…', disconnected: 'Desconectado.', reconnect: 'Volver a conectar',
  readonly: 'Esta vista es de solo lectura.', control: 'Tomar el control',
  closed: 'Terminal cerrado.', exited: 'El proceso ha finalizado ({code})', failed: 'Error del terminal: {message}',
  rename: 'Nombre del terminal', unavailable: 'No disponible', retry: 'Reintentar',
  cleanupFailed: 'No se pudo finalizar el terminal «{title}»: {message}',
  missingTerminal: 'Este terminal ya no existe. Abre un terminal nuevo.',
  inputFull: 'El búfer de entrada está lleno. Vuelve a conectar e inténtalo de nuevo.',
  attachmentEnded: 'La conexión del terminal ha finalizado. Vuelve a conectar para continuar.',
  invalidOutput: 'No se pudo recibir la pantalla del terminal. Vuelve a conectar para recuperarla.',
  terminalLimit: 'Se ha alcanzado el límite de terminales. Cierra los terminales que no uses e inténtalo de nuevo. Los terminales finalizados también cuentan para el límite.',
} satisfies Record<string, string>

/** English terminal copy. */
export const en = {
  'shortcut.noSession': 'Select a session first',
  recoveryFailed: 'Terminal recovery failed: {message}', retryRecovery: 'Retry terminal recovery',
  shell: 'Choose shell', shellLoading: 'Loading shells…', shellEmpty: 'No shells available', description: 'Run commands in the Session workspace',
  title: 'Terminal', new: 'New terminal', loading: 'Reading terminal environment…', creating: 'Starting…',
  connecting: 'Connecting…', disconnected: 'Disconnected.', reconnect: 'Reconnect',
  readonly: 'This view is read-only.', control: 'Take control',
  closed: 'Terminal closed.', exited: 'Process exited ({code})', failed: 'Terminal error: {message}',
  rename: 'Terminal name', unavailable: 'Unavailable', retry: 'Retry',
  cleanupFailed: 'Terminal “{title}” could not be ended: {message}',
  missingTerminal: 'This terminal no longer exists. Open a new terminal.',
  inputFull: 'The input buffer is full. Reconnect and try again.',
  attachmentEnded: 'The terminal connection ended. Reconnect to continue.',
  invalidOutput: 'The terminal screen could not be received. Reconnect to recover it.',
  terminalLimit: 'The terminal limit has been reached. Close unused terminals and try again. Exited terminals also count toward the limit.',
} satisfies Record<keyof typeof es, string>
