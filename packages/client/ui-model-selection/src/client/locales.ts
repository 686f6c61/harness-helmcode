/**
 * `model` namespace dictionaries.
 *
 * `trigger.selectAria` intentionally matches `trigger.fallback` but remains a
 * separate key: the visible fallback label and the accessible name of
 * an unset trigger are free to diverge per locale, and folding it into
 * `trigger.aria` would announce the degenerate "Select model, current Select
 * model".
 */

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'provider.account': 'Cuenta de DeepSeek',
  'command.label': 'Modelo',
  'command.description': 'Seleccionar el modelo de esta conversación',
  'option.loadError': 'Error al cargar el catálogo: {message}',
  'trigger.fallback': 'Seleccionar modelo',
  'trigger.loading': 'Cargando modelos…',
  'trigger.selectAria': 'Seleccionar modelo',
  'trigger.aria': 'Seleccionar modelo, actual {model}',
  'trigger.ariaEffort': 'Seleccionar modelo, actual {model}, nivel de razonamiento {effort}',
  'menu.aria': 'Modelo y nivel de razonamiento',
  'menu.model': 'Modelo',
  'menu.effort': 'Nivel de razonamiento',
  'effort.providerDefault': 'Predeterminado',
  'status.loading': 'Actualizando la lista de modelos…',
  'error.action': 'Error en la operación del modelo: {message}',
  'error.sessionInUse': 'Esta sesión ya está en uso, posiblemente por otra instancia de DSH en ejecución (como dsh web o la aplicación de escritorio). Cierra las demás instancias de DSH en ejecución y vuelve a intentarlo.',
  'action.reload': 'Recargar',
  'warning.groupLoad': 'Error al cargar {name}: {message}',
  'search.placeholder': 'Buscar modelos…',
  'search.clear': 'Borrar búsqueda',
  'search.empty': 'No hay modelos coincidentes.',
  'empty.models': 'No hay modelos disponibles.',
  'empty.efforts': 'Este modelo no ofrece niveles de razonamiento.',
} satisfies Record<string, string>

/** The model namespace key union. */
export type ModelKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'provider.account': 'DeepSeek Account',
  'command.label': 'Model',
  'command.description': 'Select the model for this conversation',
  'option.loadError': 'Catalog failed to load: {message}',
  'trigger.fallback': 'Select model',
  'trigger.loading': 'Loading models…',
  'trigger.selectAria': 'Select model',
  'trigger.aria': 'Select model, current {model}',
  'trigger.ariaEffort': 'Select model, current {model}, reasoning effort {effort}',
  'menu.aria': 'Model and reasoning effort',
  'menu.model': 'Model',
  'menu.effort': 'Effort',
  'effort.providerDefault': 'Default',
  'status.loading': 'Refreshing model list…',
  'error.action': 'Model operation failed: {message}',
  'error.sessionInUse': 'This session is already in use, possibly by another running DSH instance (such as dsh web or the desktop app). Quit other running DSH instances and try again.',
  'action.reload': 'Reload',
  'warning.groupLoad': '{name} failed to load: {message}',
  'search.placeholder': 'Search models…',
  'search.clear': 'Clear search',
  'search.empty': 'No matching models.',
  'empty.models': 'No models available.',
  'empty.efforts': 'This model provides no reasoning effort levels.',
} satisfies Record<ModelKey, string>
