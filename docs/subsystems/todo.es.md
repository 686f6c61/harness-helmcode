# Todo

[English](todo.md) | Español

El vocabulario duradero de todo que pertenece a [`@deepseek-ai/dsh-tool-todo`](../../packages/todo/tool-todo/README.md). El tool orientado al modelo reemplaza la lista completa de la sesión de un agent (agente); el paquete también posee la declaración del evento, la proyección de reproducción y el complemento de invariante. El comportamiento y la configuración del tool están en el [README del paquete](../../packages/todo/tool-todo/README.md).

Fuente: [`packages/todo/tool-todo/src/types.ts`](../../packages/todo/tool-todo/src/types.ts)

## `TodoItem`: una entrada de la lista

```ts type-equiv
/**
 * One entry in an agent's todo list — the unit of the `todo/write`
 * whole-list snapshot declared by this package.
 *
 * Deliberately minimal: a human-readable `content` line and a three-state
 * `status`. No id, priority, or `activeForm` — the list is replaced wholesale
 * on every write (last-write-wins), so entries need no stable identity. The
 * three statuses describe the complete portable lifecycle needed by model and
 * UI consumers.
 */
interface TodoItem {
  /** What this task is — a short imperative line shown in the UI. */
  content: string
  /** Lifecycle state. `in_progress` marks a task being worked now; parallel work may mark several. */
  status: 'pending' | 'in_progress' | 'completed'
}
```

## Evento duradero e invariante

El paquete fusiona por declaración `todo/write: { todos: TodoItem[] }` en `SessionEventMap`. El evento es solo de registro y lleva la lista de reemplazo completa; el [catálogo de persistencia](../persistence-catalog.es.md#todowrite--log-only) generado registra su sitio de declaración. El complemento de invariante del paquete valida las sesiones existentes y las recién anunciadas en una sola pasada y luego sigue de forma incremental los límites de turno confirmados, de modo que cada `todo/write` en vivo se verifica antes de anexarlo sin volver a recorrer el registro.
