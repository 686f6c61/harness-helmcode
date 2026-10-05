/**
 * One captured checkpoint: the pre-change bytes of one file, shadowed from
 * the fs seam's write/edit intents into a local store.
 * @module @deepseek-ai/dsh-fs-checkpoints/store
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

/** Metadata persisted beside every captured content blob. */
export interface CheckpointMeta {
  /** Store id, unique per capture. */
  id: string
  /** Absolute path the bytes came from (the fs target key of the local backend). */
  originalPath: string
  /** The tool whose pending write triggered the capture, when known. */
  tool?: string
  /** Capture time, ISO-8601 in the local clock. */
  time: string
}

/** Ordering + size policy for the store. */
export interface CheckpointStoreOptions {
  /** Store root; one directory per capture lives under it. */
  root: string
  /** Files larger than this are never captured (a snapshot is a plain copy). */
  maxBytes: number
}

/** Monotonic suffix so same-second captures never collide. */
let sequence = 0

/**
 * The capture store: plain directories under `root`, one per checkpoint,
 * carrying the pre-change bytes and a sidecar meta.json. Entirely local.
 */
export class CheckpointStore {
  constructor(private readonly options: CheckpointStoreOptions) {}

  /**
   * True when a path lives inside the store itself (never shadow those writes).
   * @param path - the absolute path a mutation is about to touch.
   * @returns whether the path is the store root or below it.
   */
  isInternal(path: string): boolean {
    return path === this.options.root || path.startsWith(this.options.root + '/')
  }

  /**
   * Copy the current bytes of one absolute local file into the store.
   * Absent files and oversized files are skipped (nothing to restore).
   * @param absolutePath - the file whose pre-change bytes to preserve.
   * @param tool - the tool or waterfall that drove the mutation, recorded in metadata.
   * @returns the checkpoint metadata, or `undefined` when nothing was captured.
   */
  capture(absolutePath: string, tool: string | undefined): CheckpointMeta | undefined {
    if (this.isInternal(absolutePath)) return undefined
    let size: number
    try {
      size = statSync(absolutePath).size
    } catch {
      return undefined
    }
    if (!Number.isSafeInteger(size) || size < 0 || size > this.options.maxBytes) return undefined
    const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${String(++sequence).padStart(4, '0')}-${basename(absolutePath)}`
    const directory = join(this.options.root, id)
    try {
      mkdirSync(directory, { recursive: true })
      copyFileSync(absolutePath, join(directory, 'content'))
      const meta: CheckpointMeta = {
        id,
        originalPath: absolutePath,
        ...tool === undefined ? {} : { tool },
        time: new Date().toISOString(),
      }
      writeFileSync(join(directory, 'meta.json'), JSON.stringify(meta, undefined, 2) + '\n', 'utf8')
      return meta
    } catch {
      // A failed capture must never fail the write it shadows.
      try { rmSync(directory, { recursive: true, force: true }) } catch { /* already absent */ }
      return undefined
    }
  }

  /**
   * Read one checkpoint's metadata.
   * @param id - the checkpoint directory name.
   * @returns the parsed metadata, or `undefined` when the checkpoint is absent or unreadable.
   */
  meta(id: string): CheckpointMeta | undefined {
    try {
      return JSON.parse(readFileSync(this.metaPath(id), 'utf8')) as CheckpointMeta
    } catch {
      return undefined
    }
  }

  /**
   * Every checkpoint, newest first.
   * @returns the readable metadata entries sorted by id descending.
   */
  list(): CheckpointMeta[] {
    let entries: string[]
    try {
      entries = readdirSync(this.options.root)
    } catch {
      return []
    }
    return entries
      .sort()
      .reverse()
      .map(id => this.meta(id))
      .filter((meta): meta is CheckpointMeta => meta !== undefined)
  }

  /**
   * Copy one checkpoint's bytes back over the file it came from, creating
   * missing parent directories. The store remembers nothing about success
   * beyond what the caller reports; the restored-over state was itself
   * captured by the write that replaced it.
   * @param id - the checkpoint to restore.
   * @returns the path that was restored.
   */
  restore(id: string): string | undefined {
    const meta = this.meta(id)
    if (meta === undefined || !existsSync(join(this.options.root, id, 'content'))) return undefined
    mkdirSync(join(meta.originalPath, '..'), { recursive: true })
    copyFileSync(join(this.options.root, id, 'content'), meta.originalPath)
    return meta.originalPath
  }

  /**
   * Delete one checkpoint from the store.
   * @param id - the checkpoint to remove.
   * @returns whether an existing checkpoint was discarded.
   */
  discard(id: string): boolean {
    if (this.meta(id) === undefined) return false
    rmSync(join(this.options.root, id), { recursive: true, force: true })
    return true
  }

  private metaPath(id: string): string {
    if (id.includes('/') || id.includes('\\') || id === '.' || id === '..') {
      throw new Error(`checkpoint id must be a store entry name: ${id}`)
    }
    return join(this.options.root, id, 'meta.json')
  }
}
