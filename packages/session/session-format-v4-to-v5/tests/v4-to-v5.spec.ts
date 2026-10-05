/** V4→V5 migration: header re-stamp, identity event pass, removed-root refusal. */
import { describe, expect, it } from 'vitest'
import {
  SessionFormatError,
  SessionFormatUnsupportedMigrationError,
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

  it('exposes exactly the two removed roots', () => {
    expect([...REMOVED_V5_EVENT_TYPES].sort()).toEqual([
      'session-log-deepseek/delivery-accepted',
      'web/deepseek-search-llm-request',
    ])
  })
})
