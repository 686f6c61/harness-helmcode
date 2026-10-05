/**
 * `sidebarRight` namespace dictionaries.
 *
 * Everything a user reads in this column is here, including the strings handed
 * to the docking kit — the kit renders no copy of its own, so its whole
 * vocabulary is this package's to own and translate.
 */

/** Spanish dictionary and key-set source of truth. */
export const es = {
  'command.close': 'Cerrar la página o ventana actual',
  'command.refresh': 'Actualizar la página actual',
  'command.noRefresh': 'Esta página no se puede actualizar',
  'command.toggle': 'Expandir/contraer la barra lateral derecha',
  'command.fullscreen': 'Alternar pantalla completa del panel',
  'command.noSession': 'Selecciona primero una sesión',
  'command.noFocus': 'Enfoca primero un panel de la barra lateral derecha',
  'command.stale': 'La página ha cambiado; enfócala de nuevo',
  'command.collapsed': 'Expande primero la barra lateral derecha',
  'command.float': 'Esta acción no está disponible en un panel flotante',
  'command.empty': 'Abre primero una página',
  'command.budget': 'El límite es de dos paneles',
  'command.width': 'No hay ancho suficiente para dividir; ensancha la barra lateral',
  'chrome.expand': 'Abrir barra lateral',
  'chrome.expandAria': 'Abrir barra lateral derecha',
  'chrome.collapse': 'Contraer barra lateral',
  'chrome.collapseAria': 'Contraer barra lateral derecha',
  'chrome.toFullscreen': 'Pantalla completa',
  'chrome.exitFullscreen': 'Salir de pantalla completa',
  'dock.emptyPane': 'Panel vacío',
  'dock.splitPane': 'Dividir',
  'dock.splitPaneDisabled': 'El límite es de dos paneles',
  'dock.splitPaneNarrow': 'No hay ancho suficiente para dividir; ensancha la barra lateral',
  'dock.closeTab': 'Cerrar',
  'dock.addTab': 'Nueva pestaña',
  'dock.dockFloat': 'Devolver a la barra lateral',
  'dock.closeFloat': 'Cerrar',
  'dock.drop.center': 'Mover aquí',
  'dock.drop.left': 'Dividir a la izquierda',
  'dock.drop.right': 'Dividir a la derecha',
  'dock.drop.top': 'Dividir arriba',
  'dock.drop.bottom': 'Dividir abajo',
  'tab.guide.title': 'Inicio',
  'tab.unavailable': 'Aún no hay ninguna forma de ver este tipo de contenido.',
} satisfies Record<string, string>

/** Right-Sidebar dictionary key union. */
export type SidebarRightKey = keyof typeof es

/** English dictionary, checked against the Spanish key set. */
export const en = {
  'command.close': 'Close current page or window',
  'command.refresh': 'Refresh current page',
  'command.noRefresh': 'This page cannot be refreshed',
  'command.toggle': 'Toggle right sidebar',
  'command.fullscreen': 'Toggle panel fullscreen',
  'command.noSession': 'Select a session first',
  'command.noFocus': 'Focus a right sidebar pane first',
  'command.stale': 'The page changed; focus it again',
  'command.collapsed': 'Expand the right sidebar first',
  'command.float': 'This action is unavailable in a floating panel',
  'command.empty': 'Open a page first',
  'command.budget': 'Two panes is the limit',
  'command.width': 'Not enough width to split, widen the sidebar',
  'chrome.expand': 'Open sidebar',
  'chrome.expandAria': 'Open right sidebar',
  'chrome.collapse': 'Collapse sidebar',
  'chrome.collapseAria': 'Collapse right sidebar',
  'chrome.toFullscreen': 'Fullscreen',
  'chrome.exitFullscreen': 'Exit fullscreen',
  'dock.emptyPane': 'Empty pane',
  'dock.splitPane': 'Split',
  'dock.splitPaneDisabled': 'Two panes is the limit',
  'dock.splitPaneNarrow': 'Not enough width to split, widen the sidebar',
  'dock.closeTab': 'Close',
  'dock.addTab': 'New tab',
  'dock.dockFloat': 'Send back to the sidebar',
  'dock.closeFloat': 'Close',
  'dock.drop.center': 'Move here',
  'dock.drop.left': 'Add left split',
  'dock.drop.right': 'Add right split',
  'dock.drop.top': 'Add top split',
  'dock.drop.bottom': 'Add bottom split',
  'tab.guide.title': 'Start',
  'tab.unavailable': 'Nothing here can view this kind of content yet.',
} satisfies Record<SidebarRightKey, string>
