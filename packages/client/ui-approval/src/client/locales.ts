/** `approval` namespace dictionaries. */

/** Spanish dictionary and key-set source of truth. */
export const es = {
  waiting: 'Esperando aprobación',
  'detail.aria': 'Detalles de la aprobación',
  escalation: 'La herramienta {toolName} solicita ejecución con privilegios',
  reject: 'Rechazar',
  allowOnce: 'Permitir una vez',
} satisfies Record<string, string>

/** Approval dictionary key union. */
export type ApprovalKey = keyof typeof es

/** English dictionary, checked against the Spanish key set. */
export const en = {
  waiting: 'Waiting for approval',
  'detail.aria': 'Approval details',
  escalation: 'Tool {toolName} requests privileged execution',
  reject: 'Reject',
  allowOnce: 'Allow once',
} satisfies Record<ApprovalKey, string>
