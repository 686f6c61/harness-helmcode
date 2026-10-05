/** Locale-owned Browser tab copy. */
export const es = {
  'type.label': 'Navegador',
  'guide.title': 'Navegador',
  'guide.description': 'Navegar por páginas web',
  'shortcut.noSession': 'Abre una sesión primero',
  'address.placeholder': 'Introduce una dirección HTTP(S)',
  'address.changed': 'La URL ha cambiado',
  back: 'Atrás',
  forward: 'Adelante',
  reload: 'Recargar',
  go: 'Ir',
  external: 'Abrir en el navegador del sistema',
  'sandbox.disable': 'Desactivar restricciones del sandbox',
  'sandbox.enable': 'Restablecer restricciones del sandbox',
  'sandbox.warning': 'Las restricciones del sandbox están desactivadas; la página puede navegar la aplicación de nivel superior y usar descargas, diálogos modales y bloqueos de entrada.',
  start: 'Introduce una dirección HTTP(S) para empezar a navegar',
  loading: 'Abriendo…',
  'restore.previous': 'Abierta anteriormente',
  'restore.action': 'Restaurar página',
  'error.empty': 'Introduce una dirección.',
  'error.invalid': 'Esa dirección no es válida o es demasiado larga.',
  'error.protocol': 'Solo se admiten direcciones HTTP y HTTPS; usa la vista previa de documentos para archivos locales.',
  'error.credentials': 'Las direcciones no pueden contener nombre de usuario ni contraseña.',
  'error.application-origin': 'El navegador integrado no puede abrir la propia aplicación DSH.',
  'load.failed': 'No se pudo cargar la página; recarga o ábrela en el navegador del sistema.',
  'load.failed.detail': 'Error al cargar la página ({code}): {description}',
  'address.unknown': 'La página ha navegado; este contenedor no puede leer su nueva URL.',
} satisfies Record<string, string>

/** Browser dictionary key union. */
export type SidebarBrowserKey = keyof typeof es

/** English dictionary with the same keys. */
export const en = {
  'type.label': 'Browser',
  'guide.title': 'Browser',
  'guide.description': 'Browse web pages',
  'shortcut.noSession': 'Open a session first',
  'address.placeholder': 'Enter an HTTP(S) address',
  'address.changed': 'URL changed',
  back: 'Back',
  forward: 'Forward',
  reload: 'Reload',
  go: 'Go',
  external: 'Open in system browser',
  'sandbox.disable': 'Disable sandbox restrictions',
  'sandbox.enable': 'Restore sandbox restrictions',
  'sandbox.warning': 'Sandbox restrictions are disabled; the page can navigate the top-level app and use downloads, modal dialogs, and input locks.',
  start: 'Enter an HTTP(S) address to start browsing',
  loading: 'Opening…',
  'restore.previous': 'Previously opened',
  'restore.action': 'Restore page',
  'error.empty': 'Enter an address.',
  'error.invalid': 'That address is invalid or too long.',
  'error.protocol': 'Only HTTP and HTTPS addresses are supported; use Document Preview for local files.',
  'error.credentials': 'Addresses cannot contain a username or password.',
  'error.application-origin': 'The embedded browser cannot open the DSH application itself.',
  'load.failed': 'The page could not load; reload or open it in the system browser.',
  'load.failed.detail': 'Page load failed ({code}): {description}',
  'address.unknown': 'The page navigated; this carrier cannot read its new URL.',
} satisfies Record<SidebarBrowserKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Sidebar Browser labels, navigation controls, and failures. */
    sidebarBrowser: SidebarBrowserKey
  }
}
