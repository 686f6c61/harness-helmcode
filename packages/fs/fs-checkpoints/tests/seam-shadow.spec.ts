/** fs-checkpoints seam tests: the shadow captures on real fs waterfalls and the store brings bytes back. */
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as checkpoints from '../src/index.ts'
import { CheckpointStore } from '../src/store.ts'

const roots: string[] = []
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

interface World {
  ctx: Context
  workspace: string
  storeRoot: string
}

async function setup(config: { maxBytes?: number } = {}): Promise<World> {
  const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-checkpoints-ws-')))
  const storeRoot = mkdtempSync(join(tmpdir(), 'dsh-checkpoints-store-'))
  roots.push(workspace, storeRoot)
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LocalFileSystem, { cwd: workspace })
  await ctx.plugin(checkpoints, {
    root: storeRoot,
    ...(config.maxBytes === undefined ? {} : { maxBytes: config.maxBytes }),
  })
  return { ctx, workspace, storeRoot }
}

/** Drive the fs seam's own write waterfall exactly as the write tool does. */
async function shadowWrite(ctx: Context, filePath: string): Promise<void> {
  const target = await ctx.fs.resolve(filePath)
  await ctx.waterfall('fs/write-intent', target, {}, () => undefined)
}

/** Same for the edit waterfall. */
async function shadowEdit(ctx: Context, filePath: string): Promise<void> {
  const target = await ctx.fs.resolve(filePath)
  await ctx.waterfall('fs/edit-intent', target, {}, () => undefined)
}

/** Newest-first ids from the tool-facing listing. */
function idsOf(store: CheckpointStore): string[] {
  return store.list().map(meta => meta.id)
}

describe('fs-checkpoints', () => {
  it('registers the `checkpoint` tool with the two actions', async () => {
    const { ctx } = await setup()
    const schema = ctx.tools.schemas().find(entry => entry.name === 'checkpoint')
    expect(schema).toBeDefined()
    const props = (schema?.parameters as { properties?: Record<string, { enum?: string[] }> }).properties ?? {}
    expect(props.action?.enum).toEqual(['list', 'restore'])
  })

  it('shadows a write intent and the store brings the pre-change bytes back', async () => {
    const { ctx, workspace, storeRoot } = await setup()
    const file = join(workspace, 'src.txt')
    writeFileSync(file, 'version one', 'utf8')

    await shadowWrite(ctx, file)
    writeFileSync(file, 'version two', 'utf8')
    expect(readFileSync(file, 'utf8')).toBe('version two')

    const store = new CheckpointStore({ root: storeRoot, maxBytes: 1024 * 1024 })
    const entries = store.list()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.originalPath).toBe(file)

    expect(store.restore(entries[0]?.id ?? '')).toBe(file)
    expect(readFileSync(file, 'utf8')).toBe('version one')
  })

  it('shadows edit intents through the same store', async () => {
    const { ctx, workspace, storeRoot } = await setup()
    const file = join(workspace, 'edit.txt')
    writeFileSync(file, 'alpha beta gamma', 'utf8')
    await shadowEdit(ctx, file)
    writeFileSync(file, 'alpha delta gamma', 'utf8')

    const store = new CheckpointStore({ root: storeRoot, maxBytes: 1024 * 1024 })
    const entries = store.list()
    expect(entries).toHaveLength(1)
    expect(store.restore(entries[0]?.id ?? '')).toBe(file)
    expect(readFileSync(file, 'utf8')).toBe('alpha beta gamma')
  })

  it('does not shadow the target of a creation (nothing recorded)', async () => {
    const { ctx, workspace, storeRoot } = await setup()
    await shadowWrite(ctx, join(workspace, 'fresh.txt'))
    const store = new CheckpointStore({ root: storeRoot, maxBytes: 1024 * 1024 })
    expect(store.list()).toEqual([])
  })

  it('never shadows paths inside its own store', async () => {
    const { ctx, storeRoot } = await setup()
    mkdirSync(join(storeRoot, 'x'), { recursive: true })
    writeFileSync(join(storeRoot, 'x', 'content'), 'internal', 'utf8')
    await shadowWrite(ctx, join(storeRoot, 'x', 'content'))
    const store = new CheckpointStore({ root: storeRoot, maxBytes: 1024 * 1024 })
    expect(store.list()).toEqual([])
  })

  it('skips files above the configured size budget', async () => {
    const { ctx, workspace, storeRoot } = await setup({ maxBytes: 4 })
    const file = join(workspace, 'big.txt')
    writeFileSync(file, '0123456789', 'utf8')
    await shadowWrite(ctx, file)
    const store = new CheckpointStore({ root: storeRoot, maxBytes: 1024 * 1024 })
    expect(store.list()).toEqual([])
  })

  it('defaults the store under $DSH_HOME and skips relative waterfall targets', async () => {
    const home = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-checkpoints-home-')))
    roots.push(home)
    vi.stubEnv('DSH_HOME', home)
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-checkpoints-ws-')))
    roots.push(workspace)
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(LocalFileSystem, { cwd: workspace })
    await ctx.plugin(checkpoints)

    // A second store instance on the defaulted root is the same physical store.
    const store = new CheckpointStore({ root: join(home, 'checkpoints'), maxBytes: 5 * 1024 * 1024 })
    writeFileSync(join(workspace, 'defaulted.txt'), 'pre', 'utf8')
    expect(store.capture(join(workspace, 'defaulted.txt'), undefined)?.tool).toBeUndefined()
    expect(store.list()).toHaveLength(1)
    await shadowWrite(ctx, join(workspace, 'defaulted.txt'))
    expect(store.list()).toHaveLength(2)

    // A relative target key is not a local filesystem path; capture skips it.
    await ctx.waterfall('fs/write-intent', { targetKey: 'relative/without/root' } as never, {}, () => undefined)
    expect(store.list()).toHaveLength(2)
    vi.unstubAllEnvs()
  })

  it('the store survives a missing root, an unrapturable directory, and hostile ids', () => {
    const missing = join(tmpdir(), 'dsh-checkpoints-missing-root')
    expect(new CheckpointStore({ root: missing, maxBytes: 1024 }).list()).toEqual([])

    const root = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-checkpoints-hostile-')))
    roots.push(root)
    const store = new CheckpointStore({ root, maxBytes: 1024 * 1024 })
    const directory = join(root, 'workspace')
    mkdirSync(directory, { recursive: true })
    // A directory target stats fine but cannot be copied: the capture cleans
    // up after itself and reports nothing.
    expect(store.capture(join(root, 'unshadowable-dir'), 'bash')).toBeUndefined()

    // A read-only store root fails the capture's own directory creation; the
    // failure never propagates to the write being shadowed.
    const locked = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-checkpoints-locked-')))
    roots.push(locked)
    const lockedStore = new CheckpointStore({ root: locked, maxBytes: 1024 * 1024 })
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-checkpoints-outside-')))
    roots.push(outside)
    const writable = join(outside, 'file.txt')
    writeFileSync(writable, 'content', 'utf8')
    chmodSync(locked, 0o500)
    try {
      expect(lockedStore.capture(writable, 'bash')).toBeUndefined()
    } finally {
      chmodSync(locked, 0o700)
    }
    expect(new CheckpointStore({ root, maxBytes: 1024 * 1024 }).list()).toEqual([])

    // Hostile ids never escape the store root: the meta reader swallows the
    // guard's rejection and the callers report the checkpoint as absent.
    expect(store.meta('nested/id')).toBeUndefined()
    expect(store.restore('nested/id')).toBeUndefined()
    expect(store.discard('../escape')).toBe(false)
  })

  it('keeps newest-first ordering with id-addressable entries', async () => {
    const { ctx, workspace, storeRoot } = await setup()
    const file = join(workspace, 'order.txt')
    writeFileSync(file, 'one', 'utf8')
    await shadowWrite(ctx, file)
    writeFileSync(file, 'two', 'utf8')
    writeFileSync(file, 'three', 'utf8')
    await shadowWrite(ctx, file)
    writeFileSync(file, 'four', 'utf8')

    const store = new CheckpointStore({ root: storeRoot, maxBytes: 1024 * 1024 })
    const ids = idsOf(store)
    expect(ids).toHaveLength(2)
    expect(store.restore(ids[0] ?? '')).toBe(file)
    // The newest shadow's pre-state was 'three'.
    expect(readFileSync(file, 'utf8')).toBe('three')
  })

  it('the store discards entries and refuses unknown ones', async () => {
    const { ctx, workspace, storeRoot } = await setup()
    const file = join(workspace, 'discard.txt')
    writeFileSync(file, 'before', 'utf8')
    await shadowWrite(ctx, file)

    const store = new CheckpointStore({ root: storeRoot, maxBytes: 1024 * 1024 })
    const id = idsOf(store)[0] ?? ''
    writeFileSync(file, 'after', 'utf8')
    expect(store.restore(id)).toBe(file)
    expect(readFileSync(file, 'utf8')).toBe('before')
    expect(store.discard(id)).toBe(true)
    expect(store.restore(id)).toBeUndefined()
    expect(store.discard(id)).toBe(false)
  })

  /** Drive the checkpoint tool and return its rendered text. */
  async function callCheckpoint(ctx: Context, args: Record<string, unknown>): Promise<string> {
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId(`checkpoint-${String(Math.random())}`),
      name: 'checkpoint',
      arguments: args,
    })
    return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
  }

  it('the checkpoint tool lists shadowed snapshots and restores by id', async () => {
    const { ctx, workspace, storeRoot } = await setup()
    const file = join(workspace, 'tool.txt')
    writeFileSync(file, 'before tool', 'utf8')
    await shadowWrite(ctx, file)
    writeFileSync(file, 'after tool', 'utf8')
    await shadowEdit(ctx, file)
    writeFileSync(file, 'final', 'utf8')

    const listing = await callCheckpoint(ctx, { action: 'list' })
    expect(listing.split('\n')).toHaveLength(2)
    expect(listing).toContain(file)
    // The waterfall capture never knows the tool; a direct store capture does.
    const listingWithTool = await callCheckpoint(ctx, { action: 'list' })
    expect(listingWithTool).toBe(listing)

    const store = new CheckpointStore({ root: storeRoot, maxBytes: 1024 * 1024 })
    writeFileSync(file, 'final before direct', 'utf8')
    expect(store.capture(file, 'bash')?.tool).toBe('bash')
    const withTool = await callCheckpoint(ctx, { action: 'list' })
    expect(withTool.split('\n')).toHaveLength(3)
    expect(withTool).toContain('(via bash)')

    const firstLine = listing.split('\n')[0] ?? ''
    const id = firstLine.slice(0, firstLine.indexOf('  '))
    expect(await callCheckpoint(ctx, { action: 'restore', id })).toBe(`Restored ${file} from checkpoint ${id}.`)
    expect(readFileSync(file, 'utf8')).toBe('after tool')
  })

  it('the checkpoint tool reports an empty history, a missing id, and a blank id', async () => {
    const { ctx } = await setup()
    expect(await callCheckpoint(ctx, { action: 'list' })).toBe('No checkpoints yet.')
    expect(await callCheckpoint(ctx, { action: 'restore', id: 'missing-id' })).toBe('No checkpoint with id "missing-id".')
    expect(await callCheckpoint(ctx, { action: 'restore', id: '   ' })).toContain('requires an id from list')
    expect(await callCheckpoint(ctx, { action: 'restore' })).toContain('requires an id from list')
  })

  it('the tool card titles the action and keeps the id optional in its raw input', async () => {
    const { ctx } = await setup()
    const definition = ctx.tools.get('checkpoint')!
    expect(definition.presentCall?.({ action: 'list' })).toEqual({
      card: 'generic', title: 'Checkpoint list', kind: 'other', rawInput: null,
    })
    expect(definition.presentCall?.({ action: 'restore', id: 'cp-1' })).toEqual({
      card: 'generic', title: 'Checkpoint restore', kind: 'other', rawInput: 'cp-1',
    })
  })
})
