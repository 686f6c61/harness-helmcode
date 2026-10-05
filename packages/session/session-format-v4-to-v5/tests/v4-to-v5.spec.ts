/** V4→V5 migration: header re-stamp, identity event pass, removed-root refusal. */
import { describe, expect, it } from 'vitest'
import {
  SessionFormatError,
  SessionFormatUnsupportedMigrationError,
  SessionFormatEventCollector,
} from '@deepseek-ai/dsh-session-format'
import {
  REMOVED_V5_EVENT_TYPES,
  assertReleasedV5Header,
  releasedV5SessionFormatCodec,
  restoreReleasedV5Artifact,
  sessionFormatV4ToV5,
} from '../src/index.ts'

const baseHeader = {
  version: 5,
  id: '0123456789abcdef0123456789abcdef',
  createdAt: 1_700_000_000_000,
  isSeeded: false,
  delegationDepth: 0,
}

describe('assertReleasedV5Header', () => {
  it('accepts a minimal v5 header and rejects other versions', () => {
    expect(() => { assertReleasedV5Header(baseHeader) }).not.toThrow()
    expect(() => { assertReleasedV5Header({ ...baseHeader, version: 4 }) }).toThrow(SessionFormatError)
    expect(() => { assertReleasedV5Header({ ...baseHeader, extra: 1 }) }).toThrow(/unexpected field/)
    expect(() => { assertReleasedV5Header({ ...baseHeader, id: 42 }) }).toThrow(/id must be a string/)
  })
})

describe('releasedV5SessionFormatCodec', () => {
  it('round-trips a header through the v4 framing with the v5 literal', () => {
    const encoded = releasedV5SessionFormatCodec.encodeHeader(baseHeader, 0)
    expect(encoded['version']).toBe(5)
    const decoded = releasedV5SessionFormatCodec.decodeHeader(encoded)
    expect(decoded).toMatchObject({ version: 5, id: baseHeader.id, isSeeded: false })
  })

  it('refuses a foreign version on decode', () => {
    expect(() => releasedV5SessionFormatCodec.decodeHeader({ ...baseHeader, version: 4 })).toThrow(/expected format v5/)
  })
})

describe('sessionFormatV4ToV5', () => {
  it('re-stamps a v4 header to v5', () => {
    const migrated = sessionFormatV4ToV5.migrateHeader({ ...baseHeader, version: 4 })
    expect(migrated['version']).toBe(5)
  })

  it('rejects a source header that is not v4', () => {
    expect(() => sessionFormatV4ToV5.migrateHeader(baseHeader)).toThrow(SessionFormatError)
  })

  it('validates the target header', () => {
    expect(() => { sessionFormatV4ToV5.validateTargetHeader(baseHeader) }).not.toThrow()
    expect(() => { sessionFormatV4ToV5.validateTargetHeader({ ...baseHeader, version: 4 }) }).toThrow(SessionFormatError)
  })
})

describe('restoreReleasedV5Artifact', () => {
  const known = new Set(['session/end-seed', 'user/message'])

  it('accepts a dense unseeded artifact without removed roots', () => {
    const artifact = {
      header: baseHeader,
      inheritedEventCount: 0,
      events: [
        { type: 'future/thing', seq: 0, time: 1, data: {}, ignorable: true },
      ],
    }
    expect(restoreReleasedV5Artifact(artifact, known)).toBe(artifact)
  })

  it('accepts removed DeepSeek-only roots only as ignorable envelopes', () => {
    const migrated = {
      header: baseHeader,
      inheritedEventCount: 0,
      events: [{ type: 'web/deepseek-search-llm-request', seq: 0, time: 1, data: {}, ignorable: true }],
    }
    expect(restoreReleasedV5Artifact(migrated, new Set([...known, 'web/deepseek-search-llm-request']))).toBe(migrated)
    const fresh = {
      header: baseHeader,
      inheritedEventCount: 0,
      events: [{ type: 'web/deepseek-search-llm-request', seq: 0, time: 1, data: {} }],
    }
    expect(() => restoreReleasedV5Artifact(fresh, new Set([...known, 'web/deepseek-search-llm-request'])))
      .toThrow(SessionFormatUnsupportedMigrationError)
  })

  it('refuses unknown non-ignorable types and non-dense sequences', () => {
    const unknownType = {
      header: baseHeader,
      inheritedEventCount: 0,
      events: [{ type: 'future/thing', seq: 0, time: 1, data: {} }],
    }
    expect(() => restoreReleasedV5Artifact(unknownType, known)).toThrow(/unknown event type/)
    const notDense = {
      header: baseHeader,
      inheritedEventCount: 0,
      events: [
        { type: 'user/message', seq: 1, time: 1, data: {} },
      ],
    }
    expect(() => restoreReleasedV5Artifact(notDense, known)).toThrow(/not dense/)
  })


  it('accepts a seeded artifact with an inherited prefix and refuses an unseeded one', () => {
    // The end-seed marker sits AT the cut: seq == inheritedEventCount.
    const seeded = {
      header: { ...baseHeader, isSeeded: true },
      inheritedEventCount: 1,
      events: [
        {
          type: 'user/message', seq: 0, time: 1, surfaceOp: 'append',
          data: { role: 'user', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } },
        },
        { type: 'session/end-seed', seq: 1, time: 2, data: { inherited: true } },
      ],
    }
    expect(restoreReleasedV5Artifact(seeded, known)).toBe(seeded)

    const unseeded = {
      header: baseHeader,
      inheritedEventCount: 2,
      events: [
        {
          type: 'user/message', seq: 0, time: 1, surfaceOp: 'append',
          data: { role: 'user', content: [{ type: 'text', text: 'a' }], source: { kind: 'user' } },
        },
        {
          type: 'user/message', seq: 1, time: 2, surfaceOp: 'append',
          data: { role: 'user', content: [{ type: 'text', text: 'b' }], source: { kind: 'user' } },
        },
      ],
    }
    expect(() => restoreReleasedV5Artifact(unseeded, known)).toThrow(/unseeded format v5 Session has inherited events/)
  })

  it('refuses retained events carrying retired tool-result wrappers as migration refusals', () => {
    const retired = {
      header: baseHeader,
      inheritedEventCount: 0,
      events: [{
        type: 'user/message', seq: 0, time: 1, surfaceOp: 'append',
        data: {
          role: 'user', source: { kind: 'user' },
          content: [{ type: 'tool-result', id: 'legacy-1' }],
        },
      }],
    }
    expect(() => restoreReleasedV5Artifact(retired, known))
      .toThrow(SessionFormatUnsupportedMigrationError)
    expect(() => restoreReleasedV5Artifact(retired, known))
      .toThrow(/refuses released content/)
  })

  it('refuses a seeded marker outside the cut and an unseeded stray marker', () => {
    // Marker at index 2 with cut 1: the seed disagrees with its metadata.
    const misaligned = {
      header: { ...baseHeader, isSeeded: true },
      inheritedEventCount: 1,
      events: [
        {
          type: 'user/message', seq: 0, time: 1, surfaceOp: 'append',
          data: { role: 'user', content: [{ type: 'text', text: 'a' }], source: { kind: 'user' } },
        },
        {
          type: 'user/message', seq: 1, time: 2, surfaceOp: 'append',
          data: { role: 'user', content: [{ type: 'text', text: 'b' }], source: { kind: 'user' } },
        },
        { type: 'session/end-seed', seq: 2, time: 3, data: { inherited: true } },
      ],
    }
    expect(() => restoreReleasedV5Artifact(misaligned, known))
      .toThrow(/seeded header disagrees with its last inherited end-seed marker/)

    const strayMarker = {
      header: baseHeader,
      inheritedEventCount: 0,
      events: [{ type: 'session/end-seed', seq: 0, time: 1, data: { inherited: true } }],
    }
    expect(() => restoreReleasedV5Artifact(strayMarker, known))
      .toThrow(/unseeded Session contains an inherited end-seed marker/)
  })

  it('refuses an inherited cut larger than the event list', () => {
    const oversized = {
      header: baseHeader,
      inheritedEventCount: 5,
      events: [{
        type: 'user/message', seq: 0, time: 1,
        data: { message: { role: 'user', content: [{ type: 'text', text: 'x' }], source: { kind: 'user' } } },
      }],
    }
    expect(() => restoreReleasedV5Artifact(oversized, known)).toThrow(/exceeds its events/)
  })

  it('exposes exactly the two removed roots', () => {
    expect([...REMOVED_V5_EVENT_TYPES].sort()).toEqual([
      'session-log-deepseek/delivery-accepted',
      'web/deepseek-search-llm-request',
    ])
  })
})

describe('ReleasedV4ToV5Stage', () => {
  const targetHeader = { ...baseHeader, version: 5 }
  const input = (sourceInheritedEventCount: number | undefined, isSeeded = false) => ({
    sourceHeader: { ...baseHeader, version: 4 },
    targetHeader,
    sourceInheritedEventCount,
    sourceKind: 'decoded' as const,
    isSeeded,
  })

  class RecordingContext {
    readonly emitted: Array<{ type: string; seq: number; ignorable?: boolean }> = []
    emitEvent(event: { type: string; seq: number; ignorable?: true }): void {
      this.emitted.push(event.ignorable === true
        ? { type: event.type, seq: event.seq, ignorable: true }
        : { type: event.type, seq: event.seq })
    }

    emitRun(): void {
      throw new Error('the v4 stage never forwards compact runs')
    }
  }

  const runOf = (events: Array<{ type: string; seq: number; time: number; data: Record<string, unknown> }>) => ({
    runType: 'probe-run',
    firstSeq: events[0]?.seq ?? 0,
    eventCount: events.length,
    *expand(): Generator<{ type: string; seq: number; time: number; data: Record<string, unknown> }> {
      yield* events
    },
  })

  it('re-stamps dense events, marks removed roots ignorable, and tracks the end-seed cut', () => {
    const stage = sessionFormatV4ToV5.createStage(input(undefined))
    const context = new RecordingContext()
    stage.transformEvent({ type: 'user/message', seq: 0, time: 1, data: {} }, context)
    stage.transformEvent({ type: 'web/deepseek-search-llm-request', seq: 1, time: 2, data: { q: 1 } }, context)
    stage.transformEvent({ type: 'session/end-seed', seq: 2, time: 3, data: { inherited: true } }, context)
    expect(context.emitted).toEqual([
      { type: 'user/message', seq: 0 },
      { type: 'web/deepseek-search-llm-request', seq: 1, ignorable: true },
      { type: 'session/end-seed', seq: 2 },
    ])
    // finish() reports the inherited CUT — the end-seed's own sequence.
    expect(stage.finish(context)).toBe(2)
  })


  it('a seeded source defers the cut to the end-seed marker', () => {
    const seededInput = { ...input(undefined), sourceHeader: { ...baseHeader, version: 4, isSeeded: true }, isSeeded: true }
    const stage = sessionFormatV4ToV5.createStage(seededInput)
    const context = new RecordingContext()
    stage.transformEvent({ type: 'session/end-seed', seq: 0, time: 1, data: { inherited: true } }, context)
    expect(stage.finish(context)).toBe(0)
  })

  it('rejects a sparse source and a cut that disagrees with the source metadata', () => {
    const stage = sessionFormatV4ToV5.createStage(input(undefined))
    expect(() => stage.transformEvent({ type: 'user/message', seq: 4, time: 1, data: {} }, new RecordingContext()))
      .toThrow(/must be dense/)

    const seeded = sessionFormatV4ToV5.createStage(input(9))
    const seededContext = new RecordingContext()
    seeded.transformEvent({ type: 'session/end-seed', seq: 0, time: 1, data: { inherited: true } }, seededContext)
    expect(() => seeded.finish(seededContext)).toThrow(/disagrees with its source metadata/)
  })

  it('expands compact runs through the same transform', () => {
    const stage = sessionFormatV4ToV5.createStage(input(undefined))
    const context = new RecordingContext()
    stage.transformRun(runOf([
      { type: 'user/message', seq: 0, time: 1, data: {} },
      { type: 'session-log-deepseek/delivery-accepted', seq: 1, time: 2, data: {} },
    ]) as never, context)
    expect(context.emitted).toEqual([
      { type: 'user/message', seq: 0 },
      { type: 'session-log-deepseek/delivery-accepted', seq: 1, ignorable: true },
    ])
  })

  it('seeds the inherited cut at zero for an unseeded source', () => {
    const stage = sessionFormatV4ToV5.createStage(input(0))
    const context = new RecordingContext()
    stage.transformEvent({ type: 'user/message', seq: 0, time: 1, data: {} }, context)
    expect(stage.finish(context)).toBe(0)
  })
})

it('decodes rows through the inherited v4 framing and re-stamps to v5', () => {
  const header = { ...baseHeader, isSeeded: false }
  const physical = releasedV5SessionFormatCodec.encodeHeader(header, 0)
  expect(physical.version).toBe(5)
  const decoder = releasedV5SessionFormatCodec.createDecoder(physical, 'strict')
  expect(decoder.header.version).toBe(5)
  const fact = { type: 'user/message', seq: 0, time: 1, data: { text: 'hi' } }
  const row = releasedV5SessionFormatCodec.encodeEvent(fact)
  const output = new SessionFormatEventCollector()
  decoder.decodeRow(row, output)
  expect(output.values).toEqual([fact])
  expect(() => releasedV5SessionFormatCodec.decodeHeader({ ...physical, version: 4 })).toThrow('expected format v5 physical header')
  expect(() => releasedV5SessionFormatCodec.createDecoder({ ...baseHeader, version: 4 }, 'strict')).toThrow('expected format v5 physical header')
})
