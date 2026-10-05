/** Memory tool unit tests: the real plugin body against a pinned temp home. */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'

import * as tool from '../src/index.ts'

const homes: string[] = []
afterEach(() => {
  for (const dir of homes.splice(0)) rmSync(dir, { recursive: true, force: true })
})

async function setup(): Promise<Context> {
  const home = mkdtempSync(join(tmpdir(), 'dsh-memory-'))
  homes.push(home)
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(tool, { dshHome: home })
  return ctx
}

/** The one temp home of the most recent setup. */
function home(): string {
  const dir = homes[homes.length - 1]
  if (dir === undefined) throw new Error('setup() ran no temp home')
  return dir
}

let callCounter = 0
async function call(ctx: Context, args: Record<string, unknown>) {
  return ctx.tools.execute({
    signal: new AbortController().signal,
    callId: ToolCallId(`call-${++callCounter}`),
    name: 'memory',
    arguments: args,
  })
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

/** The canonical `{ message }` output, asserted out of the untyped JsonValue. */
function messageOf(result: ToolExecutionResult): string {
  expect(result.isError).toBe(false)
  const value = (result as { value: unknown }).value as { message: string }
  expect(typeof value.message).toBe('string')
  return value.message
}

describe('dsh-memory-tool', () => {
  it('registers a `memory` tool with the four actions', async () => {
    const ctx = await setup()
    const schema = ctx.tools.schemas().find(entry => entry.name === 'memory')
    expect(schema).toBeDefined()
    const props = (schema!.parameters as { properties?: Record<string, { enum?: string[] }> }).properties ?? {}
    expect(props.action?.enum).toEqual(['read', 'write', 'delete', 'list'])
  })

  it('writes and reads a note as Markdown under <home>/memory', async () => {
    const ctx = await setup()
    const write = await call(ctx, { action: 'write', key: 'code-style', content: 'Use tabs, not spaces.' })
    expect(write.isError).toBe(false)

    const note = join(home(), 'memory', 'code-style.md')
    expect(existsSync(note)).toBe(true)
    expect(readFileSync(note, 'utf8')).toBe('Use tabs, not spaces.')

    const read = await call(ctx, { action: 'read', key: 'code-style' })
    expect(messageOf(read)).toBe('Use tabs, not spaces.')
    expect(text(read)).toBe('Use tabs, not spaces.')
  })

  it('reading an absent key reports the miss without failing', async () => {
    const ctx = await setup()
    expect(messageOf(await call(ctx, { action: 'read', key: 'nonexistent' })))
      .toBe('No memory note for key "nonexistent".')
  })

  it('deletes a note', async () => {
    const ctx = await setup()
    await call(ctx, { action: 'write', key: 'temp', content: 'data' })
    const remove = await call(ctx, { action: 'delete', key: 'temp' })
    expect(remove.isError).toBe(false)
    expect(existsSync(join(home(), 'memory', 'temp.md'))).toBe(false)
  })

  it('lists note keys', async () => {
    const ctx = await setup()
    await call(ctx, { action: 'write', key: 'alpha', content: 'a' })
    await call(ctx, { action: 'write', key: 'beta', content: 'b' })
    expect(messageOf(await call(ctx, { action: 'list' })).split('\n')).toEqual(['- alpha', '- beta'])
  })

  it('listing an empty memory reports the empty state', async () => {
    const ctx = await setup()
    expect(messageOf(await call(ctx, { action: 'list' }))).toBe('No memory notes.')
  })

  it('lists the empty state over an existing but emptied memory directory', async () => {
    const ctx = await setup()
    await call(ctx, { action: 'write', key: 'temporary', content: 'data' })
    await call(ctx, { action: 'delete', key: 'temporary' })
    expect(messageOf(await call(ctx, { action: 'list' }))).toBe('No memory notes.')
  })

  it('overwrites an existing note (last write wins)', async () => {
    const ctx = await setup()
    await call(ctx, { action: 'write', key: 'key', content: 'v1' })
    await call(ctx, { action: 'write', key: 'key', content: 'v2' })
    expect(readFileSync(join(home(), 'memory', 'key.md'), 'utf8')).toBe('v2')
  })

  it('sanitizes keys with special characters into portable filenames', async () => {
    const ctx = await setup()
    await call(ctx, { action: 'write', key: 'has space/slash!', content: 'safe' })
    const files = readdirSync(join(home(), 'memory')).filter(file => file.endsWith('.md'))
    expect(files).toEqual(['has_space_slash_.md'])
  })

  it('key-requiring actions reject a missing key', async () => {
    const ctx = await setup()
    expect(messageOf(await call(ctx, { action: 'read' }))).toContain('requires a key')
    expect(messageOf(await call(ctx, { action: 'write' }))).toContain('the "write" action requires a key')
    expect(messageOf(await call(ctx, { action: 'delete' }))).toContain('the "delete" action requires a key')
  })

  it('writes store an empty body when no content is supplied, and list over an existing empty directory', async () => {
    const ctx = await setup()
    expect(messageOf(await call(ctx, { action: 'write', key: 'empty-body' }))).toBe('Memory note "empty-body" written.')
    expect(readFileSync(join(home(), 'memory', 'empty-body.md'), 'utf8')).toBe('')
    expect(messageOf(await call(ctx, { action: 'list' }))).toBe('- empty-body')
  })

  it('the tool card titles the action and keeps the key optional in its raw input', async () => {
    const ctx = await setup()
    const definition = ctx.tools.get('memory')!
    expect(definition.presentCall?.({ action: 'read', key: 'notes' })).toEqual({
      card: 'generic', title: 'Memory read', kind: 'other', rawInput: 'notes',
    })
    expect(definition.presentCall?.({ action: 'list' })).toEqual({
      card: 'generic', title: 'Memory list', kind: 'other', rawInput: null,
    })
  })

  it('notes persist as plain files, independent of any session (no egress)', async () => {
    const ctx = await setup()
    await call(ctx, { action: 'write', key: 'persist-test', content: 'content' })
    expect(existsSync(join(home(), 'memory', 'persist-test.md'))).toBe(true)
  })

  it('the system prompt names the remembered keys so the model can consult them', async () => {
    const ctx = await setup()
    // No notes: the section contributes nothing rather than an empty list.
    const empty = renderPrompt(await ctx.systemPrompt.assemble())
    expect(empty).not.toContain('Persistent memory notes')

    await call(ctx, { action: 'write', key: 'code-style', content: 'Use tabs, not spaces.' })
    const withNote = renderPrompt(await ctx.systemPrompt.assemble())
    expect(withNote).toContain('Persistent memory notes')
    expect(withNote).toContain('- code-style')
    // The prompt lists keys, never the note bodies.
    expect(withNote).not.toContain('Use tabs, not spaces.')
  })
})
