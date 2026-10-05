/** The offload selector over a real session and the recovery listeners it serves. */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { agentEvents, type Agent, type RequestErrorAction } from '@deepseek-ai/dsh-agent'
import type { ContentBlock, ImageBlock } from '@deepseek-ai/dsh-llm'
import { createToolResultMessage, createUserMessage, IMAGE_OFFLOAD_REQUIRED_CODE, LlmError, ToolCallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { offloadOldestImages } from '../src/image-offload.ts'
import { imageOffloadProjection } from '../src/projection.ts'
import * as plugin from '../src/index.ts'

const image: ImageBlock = {
  type: 'image',
  attachment: { attachmentId: `sha256:${'a'.repeat(64)}` as never, mediaType: 'image/png', bytes: 1, width: 1, height: 1 },
}

function createSession(...args: Parameters<typeof Session.create>): Session {
  args[4] = [imageOffloadProjection]
  return Session.create(...args)
}

function userImages(session: Session, content: ContentBlock[] = [image, image]) {
  return session.append('user/message', createUserMessage({ content, source: { kind: 'user' } }), { surfaceOp: 'append' })
}

function toolImages(session: Session, content: ContentBlock[] = [image]) {
  return session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId: ToolCallId('call-1'),
      content,
      isError: false,
    }),
  }, { surfaceOp: 'append' })
}

/** The session header precedes every appended event. */
function offloadCount(session: Session): number {
  return session.snapshotEvents().filter(event => event.type === 'image/offload').length
}

function lastOffload(session: Session): unknown {
  return session.snapshotEvents().findLast(event => event.type === 'image/offload')!.data
}

describe('offloadOldestImages', () => {
  it('selects the oldest retained occurrences across user and tool messages in request order', () => {
    const session = createSession(SessionId('select'))
    const first = userImages(session, [image, { type: 'text', text: 'middle' }, image])
    const second = toolImages(session)
    expect(offloadOldestImages(session, [first.seq, second.seq], 3)).toBe(true)
    expect(lastOffload(session)).toEqual({ targets: [
      { seq: first.seq, imageIndexes: [0, 1] },
      { seq: second.seq, imageIndexes: [0] },
    ] })
  })

  it('counts previously offloaded occurrences toward indexes but never reselects them', () => {
    const session = createSession(SessionId('already-offloaded'))
    const source = userImages(session, [image, image])
    session.append('image/offload', { targets: [{ seq: source.seq, imageIndexes: [0] }] })
    expect(offloadOldestImages(session, [source.seq], 1)).toBe(true)
    expect(lastOffload(session)).toEqual({ targets: [{ seq: source.seq, imageIndexes: [1] }] })
    expect(offloadCount(session)).toBe(2)
    expect(offloadOldestImages(session, [source.seq], 1)).toBe(false)
    expect(offloadCount(session)).toBe(2)
  })

  it('stops once the requested count is reached and skips non-input messages', () => {
    const session = createSession(SessionId('cap'))
    const first = userImages(session)
    userImages(session)
    expect(offloadOldestImages(session, session.surface.nodes, 1)).toBe(true)
    expect(lastOffload(session)).toEqual({ targets: [{ seq: first.seq, imageIndexes: [0] }] })
  })

  it('reports nothing to offload for an empty surface or zero count', () => {
    const empty = createSession(SessionId('empty'))
    expect(offloadOldestImages(empty, [], 2)).toBe(false)
    const session = createSession(SessionId('zero'))
    const source = userImages(session)
    expect(offloadOldestImages(session, [source.seq], 0)).toBe(false)
    expect(offloadCount(session)).toBe(0)
  })

  it('skips input messages that carry no images at all', () => {
    const session = createSession(SessionId('text-only'))
    const source = userImages(session, [{ type: 'text', text: 'no images here' }])
    expect(offloadOldestImages(session, [source.seq], 1)).toBe(false)
  })

  it('skips non-input events such as assistant messages', () => {
    const session = createSession(SessionId('assistant-mixed'))
    const source = userImages(session)
    const assistant = session.append('assistant/message', {
      turn: 1, step: 1, stream: [],
      message: { role: 'assistant', content: [{ type: 'text', text: 'done' }], source: { kind: 'model', provider: 'mock', model: 'mock' } },
    }, { surfaceOp: 'append' })
    expect(offloadOldestImages(session, [assistant.seq, source.seq], 1)).toBe(true)
    expect(lastOffload(session)).toEqual({ targets: [{ seq: source.seq, imageIndexes: [0] }] })
  })
})

describe('recovery listeners', () => {
  async function mount(): Promise<Context> {
    const ctx = new Context()
    // The listeners only read these services at registration time.
    ctx.provide('agents', {})
    ctx.provide('sessions', { registerMessageProjection() {} })
    await ctx.plugin(plugin)
    return ctx
  }

  function agentOf(session: Session): Agent {
    return { session } as unknown as Agent
  }

  type RecoveryFailure = { code: string; offloadImages?: number }

  async function recover(ctx: Context, agent: Agent, failure: RecoveryFailure): Promise<RequestErrorAction | undefined> {
    return agentEvents(ctx, agent).waterfall('agent/request-error', {
      turn: 1, step: 1, provider: 'test', failure, retryPolicy: undefined,
    }, () => Promise.resolve(undefined))
  }

  it('retries through the agent waterfall after a durable offload and falls through otherwise', async () => {
    const ctx = await mount()
    const session = createSession(SessionId('agent-recovery'))
    const source = userImages(session)
    const agent = agentOf(session)

    await expect(recover(ctx, agent, { code: 'CONTEXT_OVERFLOW' })).resolves.toBeUndefined()
    await expect(recover(ctx, agent, { code: IMAGE_OFFLOAD_REQUIRED_CODE })).resolves.toBeUndefined()
    await expect(recover(ctx, agent, { code: IMAGE_OFFLOAD_REQUIRED_CODE, offloadImages: 2 })).resolves.toEqual({ kind: 'retry' })
    expect(lastOffload(session)).toEqual({ targets: [{ seq: source.seq, imageIndexes: [0, 1] }] })
    await expect(recover(ctx, agent, { code: IMAGE_OFFLOAD_REQUIRED_CODE, offloadImages: 1 })).resolves.toBeUndefined()
  })

  async function summarize(
    ctx: Context, session: Session, error: unknown, seqs: readonly number[], signal?: AbortSignal,
  ): Promise<boolean> {
    return ctx.waterfall('compaction/summary-error', {
      session,
      sourceEventSeqs: seqs,
      error,
      ...signal === undefined ? {} : { signal },
    }, () => false)
  }

  it('retries the summary only for an offload-capable error with something left to omit', async () => {
    const ctx = await mount()
    const session = createSession(SessionId('summary-recovery'))
    const source = userImages(session, [image, image, image])
    const plain = new Error('provider overflow')

    await expect(summarize(ctx, session, plain, [source.seq])).resolves.toBe(false)
    await expect(summarize(ctx, session, new LlmError('offload', 'CONTEXT_OVERFLOW'), [source.seq])).resolves.toBe(false)
    await expect(summarize(ctx, session, new LlmError('offload', IMAGE_OFFLOAD_REQUIRED_CODE), [source.seq])).resolves.toBe(false)
    await expect(summarize(ctx, session, new LlmError('offload', IMAGE_OFFLOAD_REQUIRED_CODE, { offloadImages: 2 }), [source.seq]))
      .resolves.toBe(true)
    await expect(summarize(ctx, session, new LlmError('offload', IMAGE_OFFLOAD_REQUIRED_CODE, { offloadImages: 1 }), [source.seq]))
      .resolves.toBe(true)
    await expect(summarize(ctx, session, new LlmError('offload', IMAGE_OFFLOAD_REQUIRED_CODE, { offloadImages: 1 }), [source.seq]))
      .resolves.toBe(false)
    await expect(summarize(
      ctx, session, new LlmError('offload', IMAGE_OFFLOAD_REQUIRED_CODE, { offloadImages: 1 }), [source.seq], AbortSignal.abort(),
    )).rejects.toThrow()
  })
})
