/**
 * Filesystem checkpoints: every write or edit the fs seam is about to perform
 * is shadowed into a local store first, and the `checkpoint` tool lets the
 * Agent list and restore those snapshots. The store lives under the harness
 * home so a workspace never carries hidden state; nothing leaves the machine.
 * @module @deepseek-ai/dsh-fs-checkpoints
 */
import { mkdirSync, realpathSync } from 'node:fs'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import z from '@deepseek-ai/schemastery'
import { CheckpointStore, type CheckpointMeta } from './store.ts'

export { CheckpointStore } from './store.ts'
export type { CheckpointMeta, CheckpointStoreOptions } from './store.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'fs-checkpoints'

/** The seams this plugin consumes. */
export const inject = ['tools', 'fs']

/** Plugin configuration. */
export interface Config {
  /** Store root; defaults to `$DSH_HOME/checkpoints`. */
  root?: string
  /** Refuse to capture files above this size. Defaults to 5 MiB. */
  maxBytes?: number
}

/** Schemastery configuration for the checkpoint consumer. */
export const Config: z<Config> = z.object({
  root: z.string(),
  maxBytes: z.number().step(1).min(1),
})

/** Every captured checkpoint, summarized as one model-readable line. */
function describe(meta: CheckpointMeta): string {
  return `${meta.id}  ${meta.originalPath}${meta.tool === undefined ? '' : `  (via ${meta.tool})`}  ${meta.time}`
}

export function apply(ctx: Context, config: Config): void {
  // Realpath the store root so the internal-path guard compares like against
  // like: the fs backend resolves targets through the OS, and an unresolved
  // root (symlinked home, macOS /var) would shadow its own store.
  const configuredRoot = config.root ?? resolveDshHome() + '/checkpoints'
  mkdirSync(configuredRoot, { recursive: true })
  const store = new CheckpointStore({
    root: realpathSync(configuredRoot),
    maxBytes: config.maxBytes ?? 5 * 1024 * 1024,
  })

  // Shadow every resolved local write/edit before it lands. The waterfall
  // continues unchanged — capture is a pure observer, and a capture failure
  // never blocks the write. Paths inside the store are skipped so restores
  // and pruning do not recursively snapshot themselves.
  const capture = (path: string): void => {
    if (!path.startsWith('/')) return
    store.capture(path, undefined)
  }
  ctx.on('fs/write-intent', async (target, _actor, next) => {
    capture(target.targetKey)
    return next()
  })
  ctx.on('fs/edit-intent', async (target, _actor, next) => {
    capture(target.targetKey)
    return next()
  })

  ctx.tools.register(defineTool({
    name: 'checkpoint',
    description:
      'Filesystem checkpoints taken automatically before every write or edit. '
      + 'Actions: list (recent snapshots), restore (copy one snapshot back over its file, by id). '
      + 'Use them to undo a change that turned out wrong.',
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ['list', 'restore'],
        description: 'Operation: list or restore.',
      },
      id: { type: 'string', description: 'Checkpoint id from list; required for restore.' },
    },
    output: {
      render: (_args, value) => [{ type: 'text', text: value.message }],
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          message: { required: true, type: 'string' },
        },
      },
    },
    execute(args: { action: 'list' | 'restore'; id?: string }) {
      switch (args.action) {
        case 'list': {
          const entries = store.list().slice(0, 20)
          return Promise.resolve({
            message: entries.length === 0 ? 'No checkpoints yet.' : entries.map(describe).join('\n'),
          })
        }
        case 'restore': {
          if (args.id === undefined || args.id.trim().length === 0) {
            return Promise.resolve({ message: 'checkpoint: the "restore" action requires an id from list.' })
          }
          const restoredPath = store.restore(args.id)
          return Promise.resolve({
            message: restoredPath === undefined
              ? `No checkpoint with id "${args.id}".`
              : `Restored ${restoredPath} from checkpoint ${args.id}.`,
          })
        }
      }
    },
    presentCall: args => ({ card: 'generic', title: `Checkpoint ${args.action}`, kind: 'other', rawInput: args.id ?? null }),
  }))
}
