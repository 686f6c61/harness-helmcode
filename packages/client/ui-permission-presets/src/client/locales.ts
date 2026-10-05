/** `settings.permission` namespace dictionaries (the Permission row's copy). */

/** Locale namespace shared by both current-session permission pickers. */
export const PERMISSION_ACCESS_NS = 'permission.access'

/** Spanish dictionary (the key-set source of truth). */
export const es = {
  'title': 'Permisos',
  'description': 'Elegir el modo de permisos predeterminado para las nuevas sesiones',
  'loading': 'Cargando',
  'unavailable': 'No disponible',
  'preset.readOnly': 'Solo lectura',
  'preset.workspaceWrite': 'Escritura en el espacio de trabajo',
  'preset.fullAccess': 'Acceso completo',
  'confirm.title': '¿Activar el acceso completo?',
  'confirm.description': 'El acceso completo permite que las nuevas sesiones reduzcan los pasos de confirmación y realicen más acciones directamente, incluidas operaciones sensibles, cambios en archivos o comandos externos. Úsalo solo cuando confíes en las tareas posteriores.',
  'confirm.acknowledge': 'Entiendo los riesgos y quiero continuar',
  'confirm.cancel': 'Cancelar',
  'confirm.enable': 'Activar el acceso completo',
} satisfies Record<string, string>

/** The settings.permission namespace key union. */
export type PermissionSettingsKey = keyof typeof es

/** English dictionary, checked complete against the es key set. */
export const en = {
  'title': 'Permission',
  'description': 'Choose the default permission mode for new sessions',
  'loading': 'Loading',
  'unavailable': 'Unavailable',
  'preset.readOnly': 'Read Only',
  'preset.workspaceWrite': 'Workspace Write',
  'preset.fullAccess': 'Full access',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access lets new sessions reduce confirmation steps and perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust subsequent tasks.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
} satisfies Record<PermissionSettingsKey, string>

/** Spanish dictionary for the current-session popup gate. */
export const accessEs = {
  'mode': 'Modo de acceso, actual: {name}',
  'close': 'Cerrar',
  'preset.readOnly': 'Solo lectura',
  'preset.workspaceWrite': 'Escritura en el espacio de trabajo',
  'preset.fullAccess': 'Acceso completo',
  'confirm.title': '¿Activar el acceso completo?',
  'confirm.description': 'El acceso completo reduce los pasos de confirmación y permite que el agente realice más acciones directamente, incluidas operaciones sensibles, cambios en archivos o comandos externos. Úsalo solo cuando confíes en la tarea actual.',
  'confirm.acknowledge': 'Entiendo los riesgos y quiero continuar',
  'confirm.cancel': 'Cancelar',
  'confirm.enable': 'Activar el acceso completo',
  'auto.label': 'Auto review',
  'auto.badge': 'EXP',
  'auto.description': 'Ejecución sin sandbox; una revisión experimental con el mismo modelo antes de cada llamada a herramienta nativa y cada llamada interna de PTC.',
  'auto.confirm.title': '¿Activar Auto review (experimental)?',
  'auto.confirm.description': 'Auto review no usa sandbox. Antes de cada llamada a herramienta nativa y cada llamada interna de PTC, el mismo modelo que el agente actual revisa si se permite; tú apruebas o rechazas cada llamada que deniega. Esta función es experimental, puede permitir o denegar acciones por error y consume tokens adicionales.',
  'auto.confirm.acknowledge': 'Entiendo estos riesgos y quiero continuar',
  'auto.confirm.enable': 'Activar Auto review',
} satisfies Record<string, string>

/** Current-session popup-gate key union. */
export type PermissionAccessKey = keyof typeof accessEs

/** English dictionary for the current-session popup gate. */
export const accessEn = {
  'mode': 'Access mode, current: {name}',
  'close': 'Close',
  'preset.readOnly': 'Read Only',
  'preset.workspaceWrite': 'Workspace Write',
  'preset.fullAccess': 'Full access',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust the current task.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
  'auto.label': 'Auto review',
  'auto.badge': 'EXP',
  'auto.description': 'Run without a sandbox after an experimental same-model review of every native tool call and PTC inner call.',
  'auto.confirm.title': 'Enable Auto review (experimental)?',
  'auto.confirm.description': 'Auto review runs without a sandbox. Before every native tool call and PTC inner call, the same model as the current agent reviews whether to allow it; you approve or reject each call it denies. This feature is experimental, can falsely allow or deny actions, and uses additional tokens.',
  'auto.confirm.acknowledge': 'I understand these risks and want to continue',
  'auto.confirm.enable': 'Enable Auto review',
} satisfies Record<PermissionAccessKey, string>
