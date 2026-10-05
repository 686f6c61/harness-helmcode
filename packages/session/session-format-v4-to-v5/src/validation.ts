/** Native V5 metadata validation and generation-owned artifact restoration. */

import { SessionFormatError, SessionFormatUnsupportedMigrationError, isSessionFormatJsonObject, sessionFormatCount } from '@deepseek-ai/dsh-session-format'
import type { SessionFormatArtifact } from '@deepseek-ai/dsh-session-format'
import { assertReleasedV4EventContent, assertReleasedV4Header, assertReleasedV4Relationships } from '@deepseek-ai/dsh-session-format-v3-to-v4'

/** The two DeepSeek-only event roots whose removal is the entire V4→V5 change. */
export const REMOVED_V5_EVENT_TYPES: ReadonlySet<string> = new Set([
  'session-log-deepseek/delivery-accepted',
  'web/deepseek-search-llm-request',
])

/**
 * Validate the exact native V5 logical header. V5 changed no header fields,
 * only the version literal.
 * @param header - decoded or otherwise untrusted V5 Session header candidate.
 */
export function assertReleasedV5Header(header: unknown): void {
  if (!isSessionFormatJsonObject(header) || header['version'] !== 5) throw new SessionFormatError('expected format v5 header')
  // V5 changed no header fields, so field validation is the V4 rule applied
  // to the same members under the version-4 literal they validate.
  assertReleasedV4Header({ ...header, version: 4 })
}

/**
 * Validate V5 inheritance, vocabulary, and the V4-owned relationship rules.
 * The two event roots removed by this advance survive only as ignorable,
 * uninterpreted envelopes; a non-ignorable occurrence means a writer still
 * producing removed vocabulary, which V5 refuses.
 * @param artifact - complete detached V5 artifact.
 * @param knownEventTypes - event types understood by the installed Session package.
 * @returns the same validated artifact and event objects.
 */
export function restoreReleasedV5Artifact(artifact: SessionFormatArtifact, knownEventTypes: ReadonlySet<string>): SessionFormatArtifact {
  assertReleasedV5Header(artifact.header)
  const cut = sessionFormatCount(artifact.inheritedEventCount, 'format v5 inherited event count')
  if (cut > artifact.events.length) throw new SessionFormatError('format v5 inherited event count exceeds its events')
  if (!artifact.header.isSeeded && cut !== 0) throw new SessionFormatError('unseeded format v5 Session has inherited events')
  let lastInheritedMarker: number | undefined
  for (const [index, event] of artifact.events.entries()) {
    const removed = REMOVED_V5_EVENT_TYPES.has(event.type)
    const known = knownEventTypes.has(event.type)
    if ((removed || !known) && event['ignorable'] !== true) {
      throw new SessionFormatUnsupportedMigrationError(
        `format v5 contains ${removed ? 'the removed event type' : 'unknown event type'} ${JSON.stringify(event.type)} at seq ${index}`,
      )
    }
    if (event.seq !== index) throw new SessionFormatError(`format v5 event ${index} is not dense`)
    if (!known) continue
    try {
      assertReleasedV4EventContent(event)
    } catch (error: unknown) {
      // Retired content must fail as a migration refusal (before any
      // publication), never as silent corruption of a migrated artifact.
      // Every V4 content admission throws Error subclasses; String() guards
      // exotic non-Error rejections only.
      /* v8 ignore next 1 -- content admission always rejects with Error instances */
      const detail = error instanceof Error ? error.message : String(error)
      throw new SessionFormatUnsupportedMigrationError(
        `format v5 refuses released content: ${detail}`, { cause: error })
    }
    if (event.type === 'session/end-seed' && isSessionFormatJsonObject(event.data)
      && event.data['inherited'] === true) lastInheritedMarker = index
  }
  if (artifact.header.isSeeded && lastInheritedMarker !== cut) {
    throw new SessionFormatError('format v5 seeded header disagrees with its last inherited end-seed marker')
  }
  if (!artifact.header.isSeeded && lastInheritedMarker !== undefined) {
    throw new SessionFormatError('format v5 unseeded Session contains an inherited end-seed marker')
  }
  assertReleasedV4Relationships(artifact, knownEventTypes)
  return artifact
}
