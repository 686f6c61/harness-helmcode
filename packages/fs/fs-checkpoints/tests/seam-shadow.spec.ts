/** fs-checkpoints seam tests: the shadow captures on real fs waterfalls and the store brings bytes back. */
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
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
})
