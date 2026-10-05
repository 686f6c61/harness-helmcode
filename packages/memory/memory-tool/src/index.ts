/**
 * Persistent memory tool for the Agent: read, write, delete, and list keyed
 * notes stored as local Markdown under `<home>/memory/`. Notes survive across
 * sessions and nothing ever leaves the machine.
 * @module @deepseek-ai/dsh-memory-tool
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import z from '@deepseek-ai/schemastery'

export const name = 'memory-tool'
export const inject = ['tools', 'systemPrompt']

/** Plugin configuration. */
export interface Config {
  /**
   * Harness home owning the `memory/` directory. Deployments pin an isolated
   * root (tests, desktop) so notes never leak into a developer's real home;
   * the default resolves `$DSH_HOME`.
   */
  dshHome?: string
}

/** Schemastery configuration for the memory tool consumer. */
export const Config: z<Config> = z.object({
  dshHome: z.string(),
})

/** Directory holding the note files, created on demand. */
function memoryDir(config: Config): string {
  return join(resolveDshHome(config.dshHome), 'memory')
}

/** Model-visible keys map 1:1 to filenames: keep only portable characters. */
function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function notePath(config: Config, key: string): string {
  return join(memoryDir(config), `${safeKey(key)}.md`)
}

/** Model-visible keys currently stored, or none when the directory is absent. */
function storedKeys(config: Config): string[] {
  try {
    return readdirSync(memoryDir(config))
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace(/\.md$/, ''))
      .sort()
  } catch {
    return []
  }
}

export function apply(ctx: Context, config: Config): void {
  ctx.tools.register(defineTool({
    name: 'memory',
    description:
      'Persistent memory notes that survive across sessions on this machine. Use them to remember '
      + 'project decisions, code style preferences, architecture choices, or any context worth '
      + 'preserving for later sessions. Actions: read (key), write (key + content), delete (key), list.',
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ['read', 'write', 'delete', 'list'],
        description: 'Operation: read, write, delete, or list.',
      },
      key: {
        type: 'string',
        description: 'Memory key (becomes the note filename). Required for read, write, and delete.',
      },
      content: {
        type: 'string',
        description: 'Note body; required for write, ignored otherwise.',
      },
    },
    output: {
      schema: {
        properties: {
          message: { required: true, type: 'string' },
        },
        type: 'object',
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    execute(args) {
      switch (args.action) {
        case 'read': {
          if (args.key === undefined) return Promise.resolve({ message: 'memory: the "read" action requires a key.' })
          try {
            return Promise.resolve({ message: readFileSync(notePath(config, args.key), 'utf8') })
          } catch {
            return Promise.resolve({ message: `No memory note for key "${args.key}".` })
          }
        }
        case 'write': {
          if (args.key === undefined) return Promise.resolve({ message: 'memory: the "write" action requires a key.' })
          mkdirSync(memoryDir(config), { recursive: true })
          writeFileSync(notePath(config, args.key), args.content ?? '', 'utf8')
          return Promise.resolve({ message: `Memory note "${args.key}" written.` })
        }
        case 'delete': {
          if (args.key === undefined) return Promise.resolve({ message: 'memory: the "delete" action requires a key.' })
          try { rmSync(notePath(config, args.key)) } catch { /* already absent */ }
          return Promise.resolve({ message: `Memory note "${args.key}" deleted.` })
        }
        case 'list': {
          try {
            const keys = readdirSync(memoryDir(config))
              .filter(file => file.endsWith('.md'))
              .map(file => file.replace(/\.md$/, ''))
            return Promise.resolve({
              message: keys.length === 0 ? 'No memory notes.' : keys.map(key => `- ${key}`).join('\n'),
            })
          } catch {
            return Promise.resolve({ message: 'No memory notes.' })
          }
        }
        default:
          return Promise.resolve({ message: `Unknown action: ${String(args.action)}` })
      }
    },
    presentCall: args => ({ card: 'generic', title: `Memory ${args.action}`, kind: 'other', rawInput: args.key ?? null }),
  }))

  // The prompt names the keys already remembered (never their contents) so
  // the model consults memory without a blind `list` round-trip, evaluated at
  // each assembly so a note written mid-session reaches the next request.
  ctx.systemPrompt.section({
    name: 'tool:memory',
    order: ctx.systemPrompt.getSectionOrder('TOOL_MEMORY'),
    text: () => {
      const keys = storedKeys(config)
      if (keys.length === 0) return ''
      return 'Persistent memory notes are stored on this machine and survive across sessions. '
        + 'The notes currently recorded (read one with the memory tool before relying on it):\n'
        + keys.map(key => `- ${key}`).join('\n')
    },
  })
}
