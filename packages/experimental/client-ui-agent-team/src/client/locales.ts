/** Agent Teams Web dictionaries. */

/** Locale namespace owned by the Agent Teams Web UI. */
export const NS = 'agent-team'

/** Spanish dictionary and key source. */
export const es = {
  trigger: 'Equipo de agentes',
  loading: 'Cargando el equipo…',
  unavailable: 'El equipo no está disponible',
  failure: 'Registro persistente del equipo no válido: {message}',
  empty: 'Aún no hay tareas compartidas. Créalas a través de la conversación.',
  roster: 'Miembros',
  tasks: 'Tareas compartidas',
  model: 'Modelo',
  open: 'Abrir conversación del miembro',
  current: 'Chat actual',
  owner: 'Propietario',
  unowned: 'Sin asignar',
  blockedBy: 'Bloqueada por',
  writeScopes: 'Ámbitos de escritura',
  ready: 'Lista',
  blocked: 'Bloqueada por dependencias',
  'task.expand': 'Expandir',
  'task.collapse': 'Contraer',
  'memberStatus.running': 'En ejecución',
  'memberStatus.inactive': 'Inactivo',
  'memberStatus.provisioning': 'Aprovisionando',
  'memberStatus.failed': 'Fallido',
  'status.pending': 'Pendiente',
  'status.in_progress': 'En curso',
  'status.completed': 'Completada',
} satisfies Record<string, string>

/** Agent Teams locale key union. */
export type TeamKey = keyof typeof es

/** English dictionary checked against the Spanish key set. */
export const en = {
  trigger: 'Agent Team',
  loading: 'Loading Team…',
  unavailable: 'Team is unavailable',
  failure: 'Invalid persisted Team record: {message}',
  empty: 'No shared tasks yet. Create them through the conversation.',
  roster: 'Members',
  tasks: 'Shared tasks',
  model: 'Model',
  open: 'Open member conversation',
  current: 'Current chat',
  owner: 'Owner',
  unowned: 'Unowned',
  blockedBy: 'Blocked by',
  writeScopes: 'Write scopes',
  ready: 'Ready',
  blocked: 'Blocked by dependencies',
  'task.expand': 'Show more',
  'task.collapse': 'Show less',
  'memberStatus.running': 'Running',
  'memberStatus.inactive': 'Inactive',
  'memberStatus.provisioning': 'Provisioning',
  'memberStatus.failed': 'Failed',
  'status.pending': 'Pending',
  'status.in_progress': 'In progress',
  'status.completed': 'Completed',
} satisfies Record<TeamKey, string>
