/** Identity-passing V4-to-V5 migration: re-stamp the header, refuse removed event roots. */

import { defineSessionFormatMigration, SessionFormatError, isSessionFormatJsonObject, sessionFormatCount } from '@deepseek-ai/dsh-session-format'
import type { SessionFormatEvent, SessionFormatEventRun, SessionFormatMigrationContext, SessionFormatMigrationStage, SessionFormatMigrationStageInput } from '@deepseek-ai/dsh-session-format'
import { assertReleasedV4Header } from '@deepseek-ai/dsh-session-format-v3-to-v4'
import { REMOVED_V5_EVENT_TYPES, assertReleasedV5Header } from './validation.ts'

/**
 * V5 changed no framing and no surviving event shape, so the migration is a
 * header re-stamp with a dense identity pass over events. The two removed
 * DeepSeek-only roots keep their historical payloads but arrive marked
 * ignorable: the current Session vocabulary no longer interprets them, and a
 * lineage written by Helmcode never emits them new.
 */
export const sessionFormatV4ToV5 = defineSessionFormatMigration({
  name: '@deepseek-ai/dsh-session-format-v4-to-v5',
  fromVersion: 4,
  toVersion: 5,
  migrateHeader(header) {
    assertReleasedV4Header(header)
    return { ...header, version: 5 }
  },
  createStage: input => new ReleasedV4ToV5Stage(input),
  validateTargetHeader: assertReleasedV5Header,
})

class ReleasedV4ToV5Stage implements SessionFormatMigrationStage {
  readonly headerInheritedEventCount?: number
  private nextSeq = 0
  private cut: number | undefined

  constructor(private readonly input: SessionFormatMigrationStageInput) {
    // A seeded source declares its inherited cut through the end-seed marker
    // that this stage passes through unchanged; an unseeded source has none.
    this.cut = input.sourceHeader.isSeeded ? undefined : 0
    if (this.cut !== undefined) this.headerInheritedEventCount = this.cut
  }

  transformEvent(event: SessionFormatEvent, context: SessionFormatMigrationContext): void {
    if (event.seq !== this.nextSeq) throw new SessionFormatError('V4 source events must be dense')
    const targetSeq = this.nextSeq
    if (REMOVED_V5_EVENT_TYPES.has(event.type)) {
      // Historical telemetry from an older lineage: retained as an opaque,
      // ignorable envelope the current reader skips instead of interpreting.
      context.emitEvent({ ...event, seq: targetSeq, ignorable: true })
      this.nextSeq = targetSeq + 1
      return
    }
    context.emitEvent({ ...event, seq: targetSeq })
    this.nextSeq = targetSeq + 1
    if (event.type === 'session/end-seed' && isSessionFormatJsonObject(event.data) && event.data['inherited'] === true) {
      this.cut = targetSeq
    }
  }

  transformRun(run: SessionFormatEventRun, context: SessionFormatMigrationContext): void {
    for (const event of run.expand()) this.transformEvent(event, context)
  }

  finish(): number {
    const cut = sessionFormatCount(this.cut, 'V4 inherited event count')
    if (this.input.sourceInheritedEventCount !== undefined && cut !== this.input.sourceInheritedEventCount) {
      throw new SessionFormatError('format v4 inherited cut disagrees with its source metadata')
    }
    return cut
  }
}
