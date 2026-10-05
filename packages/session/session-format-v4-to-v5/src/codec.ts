/** V5 framing: V4 rows and admission with the DeepSeek-only event roots out of the writer vocabulary. */

import { SessionFormatError, isSessionFormatJsonObject } from '@deepseek-ai/dsh-session-format'
import type { SessionFormatCodec, SessionFormatCurrentEncoder, SessionFormatHeader } from '@deepseek-ai/dsh-session-format'
import { releasedV4SessionFormatCodec } from '@deepseek-ai/dsh-session-format-v3-to-v4'
import { assertReleasedV5Header } from './validation.ts'

function physicalV4(value: unknown): SessionFormatHeader {
  if (!isSessionFormatJsonObject(value) || value['version'] !== 5) throw new SessionFormatError('expected format v5 physical header')
  return { ...value, version: 4 } as SessionFormatHeader
}

/**
 * V5 physical encoder and decoder reuse the released V4 row framing and
 * admission (V5 changed no framing, only the event vocabulary) while carrying
 * the version-5 header literal.
 */
export const releasedV5SessionFormatCodec = Object.freeze({
  version: 5,
  decodeHeader(value: unknown) {
    return { ...releasedV4SessionFormatCodec.decodeHeader(physicalV4(value)), version: 5 }
  },
  createDecoder(value: unknown, recovery: Parameters<typeof releasedV4SessionFormatCodec.createDecoder>[1]) {
    const decoder = releasedV4SessionFormatCodec.createDecoder(physicalV4(value), recovery)
    return {
      ...decoder,
      header: { ...decoder.header, version: 5 },
      decodeRow(row: unknown, context: { emitRun: (run: never) => void; emitEvent: (event: never) => void }) {
        decoder.decodeRow(row, {
          emitRun: context.emitRun.bind(context),
          emitEvent: context.emitEvent.bind(context),
        })
      },
    }
  },
  encodeHeader(header: Parameters<typeof releasedV4SessionFormatCodec.encodeHeader>[0], inheritedEventCount: number) {
    assertReleasedV5Header(header)
    return { ...releasedV4SessionFormatCodec.encodeHeader({ ...header, version: 4 }, inheritedEventCount), version: 5 }
  },
  encodeEvent(event: Parameters<typeof releasedV4SessionFormatCodec.encodeEvent>[0]) {
    return releasedV4SessionFormatCodec.encodeEvent(event)
  },
} satisfies SessionFormatCodec & SessionFormatCurrentEncoder)
