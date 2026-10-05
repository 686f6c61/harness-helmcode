/**
 * Scriptable Messages and Chat-Completions HTTP/SSE server for transport,
 * protocol, and semantic-empty LLM recovery tests. Each accepted request
 * consumes one behavior; the server never retries or interprets harness policy.
 * The Messages dialect (`POST /v1/messages`, `x-api-key`) and the
 * OpenAI-compatible Chat-Completions dialect (`POST /v1/chat/completions`,
 * `Authorization: Bearer`) share one behavior script: a behavior names the
 * wire shape, and each dialect renders it in its own framing.
 *
 * @module @deepseek-ai/dsh-llm-mock-server
 */

import { createServer } from 'node:http'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { isIP, type AddressInfo } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'

/** Request-scoped behaviors accepted by {@link startMockLlmServer}. */
export const MOCK_LLM_BEHAVIORS = [
  'connection_reset',
  'stream_disconnect',
  'empty',
  'empty_body',
  'stream_eof',
  'partial_eof',
  'partial_disconnect',
  'stall',
  'malformed_json',
  'malformed_event',
  'wrong_content_type',
  'rate_limit',
  'server_error',
  'service_unavailable',
  'auth_error',
  'invalid_request',
  'context_overflow',
  'quota_exceeded',
  'success',
  'reasoning_success',
  'tool_call_success',
  'max_tokens',
  'slow_success',
  'random',
] as const

/** One scripted mock behavior name; `random` selects a concrete behavior per request. */
export type MockLlmBehavior = typeof MOCK_LLM_BEHAVIORS[number]

/** One concrete request behavior after resolving a `random` script entry. */
export type ConcreteMockLlmBehavior = Exclude<MockLlmBehavior, 'random'>

/** Relative non-negative weights for random request behavior selection. */
export type MockLlmRandomWeights = Partial<Record<ConcreteMockLlmBehavior, number>>

/**
 * Default stress profile for `random`. Weights are configurable test pressure,
 * not a claim about production incident frequency.
 */
export const DEFAULT_MOCK_LLM_RANDOM_WEIGHTS: Readonly<MockLlmRandomWeights> = Object.freeze({
  success: 48,
  slow_success: 10,
  max_tokens: 2,
  connection_reset: 5,
  stream_disconnect: 5,
  partial_disconnect: 10,
  empty: 5,
  stall: 2,
  rate_limit: 5,
  server_error: 4,
  service_unavailable: 2,
  partial_eof: 1,
  malformed_json: 1,
})

/** Largest millisecond delay accepted by Node timers without truncation. */
export const MAX_MOCK_LLM_TIMER_DELAY_MS = 2_147_483_647

/** How one accepted request ended at the mock boundary. */
export type MockLlmRequestOutcome = 'completed' | 'reset' | 'stalled' | 'client_closed' | 'server_error'

/** The protocol dialect an accepted request spoke. */
export type MockLlmEndpoint = 'messages' | 'completions'

/** Immutable telemetry emitted when a request starts or reaches an outcome. */
export type MockLlmServerEvent =
  | {
    readonly type: 'request'
    readonly attempt: number
    readonly scriptBehavior: MockLlmBehavior | 'script_exhausted'
    readonly behavior: ConcreteMockLlmBehavior | 'script_exhausted'
    readonly path: string
  }
  | {
    readonly type: 'result'
    readonly attempt: number
    readonly scriptBehavior: MockLlmBehavior | 'script_exhausted'
    readonly behavior: ConcreteMockLlmBehavior | 'script_exhausted'
    readonly outcome: MockLlmRequestOutcome
    readonly chunksSent: number
  }

/** Captured wire request and its final server-side outcome. */
export interface MockLlmRequestRecord {
  /** One-based accepted request number. */
  readonly attempt: number
  /** Script entry consumed for this request before random resolution. */
  readonly scriptBehavior: MockLlmBehavior | 'script_exhausted'
  /** Concrete behavior selected for this request, or exhaustion after the configured script. */
  readonly behavior: ConcreteMockLlmBehavior | 'script_exhausted'
  /** Protocol dialect the request spoke, decided by its path. */
  readonly endpoint: MockLlmEndpoint
  /** Original request path, including a `/v1` prefix when the client supplied one. */
  readonly path: string
  /** Detached request headers. */
  readonly headers: Readonly<IncomingHttpHeaders>
  /** Parsed JSON request body. */
  readonly body: unknown
  /** Number of SSE `data:` events handed to Node before the outcome. */
  chunksSent: number
  /** Final server-side outcome; absent while a stalled request remains open. */
  outcome?: MockLlmRequestOutcome
}

/** Configuration for one mock server instance. */
export interface MockLlmServerOptions {
  /** Loopback host by default. */
  readonly host?: string
  /** TCP port; zero requests an OS-assigned port. */
  readonly port?: number
  /** Optional exact API key; omission accepts any x-api-key header. */
  readonly apiKey?: string
  /** Ordered request behaviors; exhaustion fails loud unless `repeatLast` is true. */
  readonly sequence: readonly MockLlmBehavior[]
  /** Reuse the final behavior after the sequence is consumed. */
  readonly repeatLast?: boolean
  /** Optional deterministic unsigned 32-bit seed; omission generates and exposes one. */
  readonly randomSeed?: number
  /** Relative weights used whenever a script entry is `random`. */
  readonly randomWeights?: Readonly<MockLlmRandomWeights>
  /** Complete text returned by success-shaped behaviors. */
  readonly successText?: string
  /** Text emitted before partial EOF/reset behaviors terminate. */
  readonly partialText?: string
  /** Reasoning text emitted by `reasoning_success`. */
  readonly reasoningText?: string
  /** Unicode code-point count per text or reasoning SSE delta. */
  readonly chunkSize?: number
  /** Inter-chunk delay for `slow_success`, in milliseconds. */
  readonly chunkDelayMs?: number
  /** Delay after headers/deltas before a forced disconnect, in milliseconds. */
  readonly disconnectDelayMs?: number
  /** Provider retry delay; the wire `Retry-After` value rounds up to whole seconds. */
  readonly retryAfterMs?: number
  /** Optional provider request id returned on HTTP failures. */
  readonly requestId?: string
  /** Tool name emitted by `tool_call_success`. */
  readonly toolName?: string
  /** Raw JSON arguments emitted by `tool_call_success`. */
  readonly toolArguments?: string
  /** Optional observer for JSONL CLI telemetry; observer failures never affect wire behavior. */
  readonly onEvent?: (event: MockLlmServerEvent) => void
}

/** Running mock server and captured request state. */
export interface MockLlmServer {
  /** Base URL without `/v1`; the endpoints are `/v1/messages` and `/v1/chat/completions`. */
  readonly baseURL: string
  /** Actual bound port, including an OS-assigned value. */
  readonly port: number
  /** Seed used for random behavior selection, including the generated default. */
  readonly randomSeed: number
  /** Live request records in arrival order. */
  readonly requests: readonly MockLlmRequestRecord[]
  /** Stop accepting requests and force-close stalled/streaming connections; idempotent. */
  close(): Promise<void>
}

interface ResolvedOptions {
  readonly host: string
  readonly port: number
  readonly apiKey?: string
  readonly sequence: readonly MockLlmBehavior[]
  readonly lastBehavior: MockLlmBehavior
  readonly repeatLast: boolean
  readonly randomSeed: number
  readonly randomWeights: readonly (readonly [ConcreteMockLlmBehavior, number])[]
  readonly successText: string
  readonly partialText: string
  readonly reasoningText: string
  readonly chunkSize: number
  readonly chunkDelayMs: number
  readonly disconnectDelayMs: number
  readonly retryAfterMs: number
  readonly requestId?: string
  readonly toolName: string
  readonly toolArguments: string
  readonly onEvent?: (event: MockLlmServerEvent) => void
}

const DEFAULT_SUCCESS_TEXT = 'mock response recovered'
const DEFAULT_PARTIAL_TEXT = 'discarded partial response'
const DEFAULT_REASONING_TEXT = 'mock reasoning'
const CONCRETE_BEHAVIORS = new Set<string>(MOCK_LLM_BEHAVIORS.filter(behavior => behavior !== 'random'))

function boundedInteger(name: string, value: number, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`llm-mock-server: ${name} must be an integer between ${min} and ${max}`)
  }
  return value
}

function resolveOptions(options: MockLlmServerOptions): ResolvedOptions {
  const host = options.host ?? '127.0.0.1'
  const port = boundedInteger('port', options.port ?? 0, 0, 65_535)
  const chunkSize = boundedInteger('chunkSize', options.chunkSize ?? 8, 1, Number.MAX_SAFE_INTEGER)
  const chunkDelayMs = boundedInteger(
    'chunkDelayMs',
    options.chunkDelayMs ?? 25,
    0,
    MAX_MOCK_LLM_TIMER_DELAY_MS,
  )
  const disconnectDelayMs = boundedInteger(
    'disconnectDelayMs',
    options.disconnectDelayMs ?? 10,
    0,
    MAX_MOCK_LLM_TIMER_DELAY_MS,
  )
  const retryAfterMs = boundedInteger(
    'retryAfterMs',
    options.retryAfterMs ?? 1_000,
    1,
    MAX_MOCK_LLM_TIMER_DELAY_MS,
  )
  const randomSeed = boundedInteger(
    'randomSeed',
    options.randomSeed ?? randomBytes(4).readUInt32LE(0),
    0,
    0xffff_ffff,
  )
  const successText = options.successText ?? DEFAULT_SUCCESS_TEXT
  const partialText = options.partialText ?? DEFAULT_PARTIAL_TEXT
  const reasoningText = options.reasoningText ?? DEFAULT_REASONING_TEXT
  const toolName = options.toolName ?? 'mock_tool'
  const toolArguments = options.toolArguments ?? '{"value":"mock"}'

  if (host.length === 0) throw new Error('llm-mock-server: host must not be empty')
  if (options.sequence.length === 0) throw new Error('llm-mock-server: sequence must not be empty')
  const lastBehavior = options.sequence.reduce((_previous, behavior) => behavior)
  if (options.apiKey === '') throw new Error('llm-mock-server: apiKey must not be empty')
  if (successText.length === 0) throw new Error('llm-mock-server: successText must not be empty')
  if (partialText.length === 0) throw new Error('llm-mock-server: partialText must not be empty')
  if (reasoningText.length === 0) throw new Error('llm-mock-server: reasoningText must not be empty')
  if (toolName.length === 0) throw new Error('llm-mock-server: toolName must not be empty')
  if (options.requestId === '') throw new Error('llm-mock-server: requestId must not be empty')
  try {
    JSON.parse(toolArguments)
  } catch {
    throw new Error('llm-mock-server: toolArguments must be valid JSON')
  }

  const configuredWeights = options.randomWeights ?? DEFAULT_MOCK_LLM_RANDOM_WEIGHTS
  const randomWeights: Array<readonly [ConcreteMockLlmBehavior, number]> = []
  for (const [behavior, weight] of Object.entries(configuredWeights)) {
    if (!CONCRETE_BEHAVIORS.has(behavior)) {
      throw new Error(`llm-mock-server: randomWeights contains unknown concrete behavior ${JSON.stringify(behavior)}`)
    }
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`llm-mock-server: random weight for ${behavior} must be a non-negative finite number`)
    }
    if (weight > 0) randomWeights.push([behavior as ConcreteMockLlmBehavior, weight])
  }
  if (randomWeights.length === 0) {
    throw new Error('llm-mock-server: randomWeights must contain at least one positive weight')
  }

  return {
    host,
    port,
    ...options.apiKey === undefined ? {} : { apiKey: options.apiKey },
    sequence: [...options.sequence],
    lastBehavior,
    repeatLast: options.repeatLast ?? false,
    randomSeed,
    randomWeights,
    successText,
    partialText,
    reasoningText,
    chunkSize,
    chunkDelayMs,
    disconnectDelayMs,
    retryAfterMs,
    ...options.requestId === undefined ? {} : { requestId: options.requestId },
    toolName,
    toolArguments,
    ...options.onEvent === undefined ? {} : { onEvent: options.onEvent },
  }
}

function emit(options: ResolvedOptions, event: MockLlmServerEvent): void {
  try {
    options.onEvent?.(Object.freeze(event))
  } catch (_telemetryObserverFailure) {
    // Test telemetry is observational; a broken observer cannot change provider wire behavior.
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk as Uint8Array))
  const body = Buffer.concat(chunks).toString('utf8')
  return body.length === 0 ? undefined : JSON.parse(body)
}

function splitText(text: string, size: number): string[] {
  const points = Array.from(text)
  const chunks: string[] = []
  for (let index = 0; index < points.length; index += size) chunks.push(points.slice(index, index + size).join(''))
  return chunks
}

function openSse(response: ServerResponse, contentType = 'text/event-stream; charset=utf-8'): void {
  response.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-cache',
    'connection': 'keep-alive',
  })
  response.flushHeaders()
}

function writeSse(record: MockLlmRequestRecord, response: ServerResponse, payload: unknown): void {
  response.write(`data: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n\n`)
  record.chunksSent += 1
}

function writeDone(record: MockLlmRequestRecord, response: ServerResponse): void {
  writeSse(record, response, { type: 'message_stop' })
}

function finishRecord(
  options: ResolvedOptions,
  record: MockLlmRequestRecord,
  outcome: MockLlmRequestOutcome,
): void {
  if (record.outcome !== undefined) return
  record.outcome = outcome
  emit(options, {
    type: 'result',
    attempt: record.attempt,
    scriptBehavior: record.scriptBehavior,
    behavior: record.behavior,
    outcome,
    chunksSent: record.chunksSent,
  })
}

/** Structured HTTP failure shared verbatim by both dialects (both clients parse `{error:{...}}`). */
const HTTP_ERROR_BEHAVIORS: Record<
  | 'script_exhausted'
  | 'rate_limit'
  | 'server_error'
  | 'service_unavailable'
  | 'auth_error'
  | 'invalid_request'
  | 'context_overflow'
  | 'quota_exceeded',
  { status: number; message: string; code: string; type?: string }
> = {
  script_exhausted: { status: 500, message: 'mock script exhausted', code: 'MOCK_SCRIPT_EXHAUSTED' },
  rate_limit: { status: 429, message: 'mock rate limit', code: 'rate_limit' },
  server_error: { status: 500, message: 'mock server error', code: 'server_error' },
  service_unavailable: { status: 503, message: 'mock service unavailable', code: 'service_unavailable' },
  auth_error: { status: 401, message: 'mock authentication failed', code: 'invalid_api_key' },
  invalid_request: { status: 400, message: 'mock invalid request', code: 'invalid_request' },
  context_overflow: {
    status: 400,
    message: 'mock input exceeds the model context window',
    code: 'context_length_exceeded',
    type: 'invalid_request_error',
  },
  quota_exceeded: { status: 429, message: 'mock insufficient quota', code: 'insufficient_quota' },
}

function httpError(
  options: ResolvedOptions,
  record: MockLlmRequestRecord,
  response: ServerResponse,
  error: { status: number; message: string; code: string; type?: string },
): void {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (record.behavior === 'rate_limit') {
    headers['retry-after'] = String(Math.ceil(options.retryAfterMs / 1_000))
  }
  if (options.requestId !== undefined) headers['x-request-id'] = options.requestId
  response.writeHead(error.status, headers)
  response.end(JSON.stringify({ error: { message: error.message, type: error.type ?? 'mock_error', code: error.code } }))
  finishRecord(options, record, 'completed')
}

function startMessage(record: MockLlmRequestRecord, response: ServerResponse): void {
  writeSse(record, response, {
    type: 'message_start',
    message: { id: 'mock-message', type: 'message', role: 'assistant', model: 'mock-model', content: [], usage: { input_tokens: 3, output_tokens: 0 } },
  })
}

function startText(record: MockLlmRequestRecord, response: ServerResponse, index: number): void {
  writeSse(record, response, { type: 'content_block_start', index, content_block: { type: 'text', text: '' } })
}

function terminalChunk(reason: string, outputTokens: number): unknown {
  return {
    type: 'message_delta',
    delta: { stop_reason: reason, stop_sequence: null },
    usage: { output_tokens: outputTokens },
  }
}

async function pause(milliseconds: number, response: ServerResponse): Promise<boolean> {
  if (milliseconds === 0) return !response.destroyed
  const controller = new AbortController()
  const stop = (): void => { controller.abort() }
  response.once('close', stop)
  try {
    await delay(milliseconds, undefined, { signal: controller.signal })
    return true
  } catch (_responseClosed) {
    // The timer only receives this response-owned abort signal; closing the response cancels its wait.
    return false
  } finally {
    response.off('close', stop)
  }
}

/**
 * One protocol dialect's stream framing. The behavior table below drives
 * these primitives, so a behavior means the same wire shape in both dialects
 * and each dialect renders it in its own framing.
 */
interface DialectWire {
  /** Protocol preamble after the SSE head (`message_start` / assistant role chunk). */
  open(record: MockLlmRequestRecord, response: ServerResponse): void
  /** Open the text block when the protocol frames blocks (`content_block_start` / nothing). */
  beginText(record: MockLlmRequestRecord, response: ServerResponse, index: number): void
  /** One text chunk (`content_block_delta` / `content` delta). */
  text(record: MockLlmRequestRecord, response: ServerResponse, index: number, chunk: string): void
  /** Close the text block when the protocol frames blocks (`content_block_stop` / nothing). */
  endText(record: MockLlmRequestRecord, response: ServerResponse, index: number): void
  /** The stream trailer after a malformed probe (`message_stop` / `[DONE]`). */
  done(record: MockLlmRequestRecord, response: ServerResponse): void
  /** The scripted reasoning block (`thinking` frames / `reasoning_content` deltas). */
  reasoning(options: ResolvedOptions, record: MockLlmRequestRecord, response: ServerResponse): void
  /** The scripted tool call, framed whole (block frames / `tool_calls` deltas). */
  toolCall(options: ResolvedOptions, record: MockLlmRequestRecord, response: ServerResponse): void
  /** The scripted stop reason's terminator, then end-of-response. */
  finish(record: MockLlmRequestRecord, response: ServerResponse, reason: 'end_turn' | 'max_tokens' | 'tool_use', outputTokens: number): void
  /** An unparsable SSE line for the resilience probes. */
  malformedJson(record: MockLlmRequestRecord, response: ServerResponse): void
  /** A parseable but structurally wrong event for the resilience probes. */
  malformedEvent(record: MockLlmRequestRecord, response: ServerResponse): void
}

const MESSAGES_WIRE: DialectWire = {
  open: (record, response) => {
    startMessage(record, response)
  },
  beginText: (record, response, index) => {
    startText(record, response, index)
  },
  text: (record, response, index, chunk) => {
    writeSse(record, response, { type: 'content_block_delta', index, delta: { type: 'text_delta', text: chunk } })
  },
  endText: (record, response, index) => {
    writeSse(record, response, { type: 'content_block_stop', index })
  },
  done: (record, response) => {
    writeDone(record, response)
  },
  reasoning: (options, record, response) => {
    writeSse(record, response, { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } })
    for (const chunk of splitText(options.reasoningText, options.chunkSize)) {
      writeSse(record, response, { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: chunk } })
    }
    writeSse(record, response, { type: 'content_block_stop', index: 0 })
  },
  toolCall: (options, record, response) => {
    for (const chunk of toolCallChunks(options)) writeSse(record, response, chunk)
  },
  finish: (record, response, reason, outputTokens) => {
    writeSse(record, response, terminalChunk(reason, outputTokens))
    writeDone(record, response)
    response.end()
  },
  malformedJson: (record, response) => {
    writeSse(record, response, '{not-json')
  },
  malformedEvent: (record, response) => {
    writeSse(record, response, { type: 'content_block_start', index: 0, content_block: null })
  },
}

const COMPLETIONS_WIRE: DialectWire = {
  open: (record, response) => {
    openCompletionsStart(record, response)
  },
  beginText: () => {},
  text: (record, response, _index, chunk) => {
    writeSse(record, response, completionsChunk({ content: chunk }))
  },
  endText: () => {},
  done: (record, response) => {
    writeSse(record, response, '[DONE]')
  },
  reasoning: (options, record, response) => {
    for (const chunk of splitText(options.reasoningText, options.chunkSize)) {
      writeSse(record, response, completionsChunk({ reasoning_content: chunk }))
    }
  },
  toolCall: (options, record, response) => {
    writeSse(record, response, completionsChunk({
      tool_calls: [{ index: 0, id: 'mock-call-1', type: 'function', function: { name: options.toolName, arguments: '' } }],
    }))
    for (const partial of splitToolArguments(options)) {
      writeSse(record, response, completionsChunk({
        tool_calls: [{ index: 0, function: { arguments: partial } }],
      }))
    }
  },
  finish: (record, response, reason, outputTokens) => {
    finishCompletions(record, response,
      reason === 'end_turn' ? 'stop' : reason === 'max_tokens' ? 'length' : 'tool_calls', outputTokens)
  },
  malformedJson: (record, response) => {
    writeSse(record, response, '{not-json')
  },
  malformedEvent: (record, response) => {
    writeSse(record, response, { object: 'chat.completion.chunk', choices: null })
  },
}

/** Stream the success text through the wire's text frames, then terminate; a mid-stream departure marks the client gone. */
async function completeText(
  wire: DialectWire,
  options: ResolvedOptions,
  record: MockLlmRequestRecord,
  response: ServerResponse,
  reason: 'end_turn' | 'max_tokens',
  delayMs: number,
  textIndex = 0,
): Promise<void> {
  wire.beginText(record, response, textIndex)
  for (const chunk of splitText(options.successText, options.chunkSize)) {
    wire.text(record, response, textIndex, chunk)
    if (!await pause(delayMs, response)) {
      finishRecord(options, record, 'client_closed')
      return
    }
  }
  wire.endText(record, response, textIndex)
  wire.finish(record, response, reason, Array.from(options.successText).length)
  finishRecord(options, record, 'completed')
}

/** Stream the partial text with no terminator; false when the client left mid-stream. */
async function streamPartialText(
  wire: DialectWire,
  options: ResolvedOptions,
  record: MockLlmRequestRecord,
  response: ServerResponse,
  delayMs: number,
): Promise<boolean> {
  for (const chunk of splitText(options.partialText, options.chunkSize)) {
    wire.text(record, response, 0, chunk)
    if (delayMs > 0 && !await pause(delayMs, response)) return false
  }
  return true
}

async function disconnect(
  options: ResolvedOptions,
  record: MockLlmRequestRecord,
  response: ServerResponse,
): Promise<void> {
  if (!await pause(options.disconnectDelayMs, response)) {
    finishRecord(options, record, 'client_closed')
    return
  }
  finishRecord(options, record, 'reset')
  response.destroy()
}

function splitToolArguments(options: ResolvedOptions): readonly [string, string] {
  const midpoint = Math.max(1, Math.floor(options.toolArguments.length / 2))
  return [options.toolArguments.slice(0, midpoint), options.toolArguments.slice(midpoint)]
}

function toolCallChunks(options: ResolvedOptions): readonly unknown[] {
  return [
    { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'mock-call-1', name: options.toolName, input: {} } },
    ...splitToolArguments(options).map(partial => ({
      type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: partial },
    })),
    { type: 'content_block_stop', index: 0 },
  ]
}

/** One Chat-Completions stream chunk in the OpenAI wire shape. */
function completionsChunk(
  delta: Record<string, unknown>,
  finishReason: string | null = null,
  usage?: Record<string, number>,
): unknown {
  return {
    id: 'chatcmpl-mock',
    object: 'chat.completion.chunk',
    created: 0,
    model: 'mock-model',
    choices: [{ index: 0, delta, finish_reason: finishReason }],
    ...usage === undefined ? {} : { usage },
  }
}

function openCompletionsStart(record: MockLlmRequestRecord, response: ServerResponse): void {
  writeSse(record, response, completionsChunk({ role: 'assistant', content: '' }))
}

function finishCompletions(
  record: MockLlmRequestRecord,
  response: ServerResponse,
  reason: 'stop' | 'length' | 'tool_calls',
  completionTokens: number,
): void {
  writeSse(record, response, completionsChunk({}, reason, {
    prompt_tokens: 3,
    completion_tokens: completionTokens,
    total_tokens: 3 + completionTokens,
  }))
  writeSse(record, response, '[DONE]')
  response.end()
}

async function runBehavior(
  options: ResolvedOptions,
  record: MockLlmRequestRecord,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const wire = record.endpoint === 'messages' ? MESSAGES_WIRE : COMPLETIONS_WIRE
  switch (record.behavior) {
    case 'script_exhausted':
    case 'rate_limit':
    case 'server_error':
    case 'service_unavailable':
    case 'auth_error':
    case 'invalid_request':
    case 'context_overflow':
    case 'quota_exceeded':
      httpError(options, record, response, HTTP_ERROR_BEHAVIORS[record.behavior])
      return
    case 'connection_reset':
      finishRecord(options, record, 'reset')
      request.socket.destroy()
      return
    case 'stream_disconnect':
      openSse(response)
      await disconnect(options, record, response)
      return
    case 'empty':
      openSse(response)
      wire.open(record, response)
      wire.finish(record, response, 'end_turn', 0)
      finishRecord(options, record, 'completed')
      return
    case 'empty_body':
      openSse(response)
      response.end()
      finishRecord(options, record, 'completed')
      return
    case 'stream_eof':
      openSse(response)
      wire.open(record, response)
      response.end()
      finishRecord(options, record, 'completed')
      return
    case 'partial_eof':
      openSse(response)
      wire.open(record, response)
      wire.beginText(record, response, 0)
      await streamPartialText(wire, options, record, response, 0)
      response.end()
      finishRecord(options, record, 'completed')
      return
    case 'partial_disconnect':
      openSse(response)
      wire.open(record, response)
      wire.beginText(record, response, 0)
      if (!await streamPartialText(wire, options, record, response, options.chunkDelayMs)) return
      await disconnect(options, record, response)
      return
    case 'stall':
      openSse(response)
      finishRecord(options, record, 'stalled')
      return
    case 'malformed_json':
      openSse(response)
      wire.malformedJson(record, response)
      wire.done(record, response)
      response.end()
      finishRecord(options, record, 'completed')
      return
    case 'malformed_event':
      openSse(response)
      wire.malformedEvent(record, response)
      wire.done(record, response)
      response.end()
      finishRecord(options, record, 'completed')
      return
    case 'wrong_content_type':
      openSse(response, 'application/json')
      wire.open(record, response)
      await completeText(wire, options, record, response, 'end_turn', 0)
      return
    case 'success':
      openSse(response)
      wire.open(record, response)
      await completeText(wire, options, record, response, 'end_turn', 0)
      return
    case 'reasoning_success':
      openSse(response)
      wire.open(record, response)
      wire.reasoning(options, record, response)
      await completeText(wire, options, record, response, 'end_turn', 0, 1)
      return
    case 'tool_call_success':
      openSse(response)
      wire.open(record, response)
      wire.toolCall(options, record, response)
      wire.finish(record, response, 'tool_use', 2)
      finishRecord(options, record, 'completed')
      return
    case 'max_tokens':
      openSse(response)
      wire.open(record, response)
      await completeText(wire, options, record, response, 'max_tokens', 0)
      return
    case 'slow_success':
      openSse(response)
      wire.open(record, response)
      await completeText(wire, options, record, response, 'end_turn', options.chunkDelayMs)
      return
  }
}

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b_79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61)
    return ((mixed ^ mixed >>> 14) >>> 0) / 0x1_0000_0000
  }
}

function chooseRandomBehavior(
  weights: readonly (readonly [ConcreteMockLlmBehavior, number])[],
  random: () => number,
): ConcreteMockLlmBehavior {
  const total = weights.reduce((sum, entry) => sum + entry[1], 0)
  let draw = random() * total
  for (const [behavior, weight] of weights) {
    if (draw < weight) return behavior
    draw -= weight
  }
  // Floating-point subtraction can only leave a rounding residue at the upper boundary.
  /* v8 ignore next -- seededRandom is strictly less than one; this guards floating-point residue only */
  return (weights.at(-1) as readonly [ConcreteMockLlmBehavior, number])[0]
}

/**
 * Start a local Messages/Chat-Completions server that consumes one configured
 * behavior per accepted request. Only a `POST` path ending in `/v1/messages`
 * (x-api-key auth) or `/v1/chat/completions` (Bearer auth) consumes the script;
 * invalid routes, methods, API keys, and JSON receive ordinary 4xx
 * responses. Closing the handle terminates stalled connections.
 *
 * @param options - listener, script, response content, timing, and telemetry options.
 * @returns the listening handle after the port is bound.
 */
export async function startMockLlmServer(options: MockLlmServerOptions): Promise<MockLlmServer> {
  const resolved = resolveOptions(options)
  const requests: MockLlmRequestRecord[] = []
  const random = seededRandom(resolved.randomSeed)
  let cursor = 0

  const selectBehavior = (): {
    scriptBehavior: MockLlmBehavior | 'script_exhausted'
    behavior: ConcreteMockLlmBehavior | 'script_exhausted'
  } => {
    const selected = resolved.sequence[cursor]
    cursor += 1
    const scriptBehavior = selected
      ?? (resolved.repeatLast ? resolved.lastBehavior : 'script_exhausted')
    return {
      scriptBehavior,
      behavior: scriptBehavior === 'random'
        ? chooseRandomBehavior(resolved.randomWeights, random)
        : scriptBehavior,
    }
  }

  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    /* v8 ignore next -- node:http server requests always carry a URL despite the shared optional type */
    const path = new URL(request.url ?? '/', 'http://mock.invalid').pathname
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' }).end()
      return
    }
    const endpoint: MockLlmEndpoint | undefined = path.endsWith('/v1/messages')
      ? 'messages'
      : path.endsWith('/v1/chat/completions') ? 'completions' : undefined
    if (endpoint === undefined) {
      response.writeHead(404).end()
      return
    }
    // Messages clients present `x-api-key`; Chat-Completions clients present
    // `Authorization: Bearer` — each dialect only accepts its own header.
    const authorization = request.headers.authorization
    const bearer = typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined
    const presentedKey = endpoint === 'completions' ? bearer : request.headers['x-api-key']
    if (resolved.apiKey !== undefined && presentedKey !== resolved.apiKey) {
      response.writeHead(401, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: { message: 'invalid mock API key', code: 'invalid_api_key' } }))
      return
    }

    let body: unknown
    try {
      body = await readJsonBody(request)
    } catch {
      response.writeHead(400, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: { message: 'request body must be valid JSON', code: 'invalid_json' } }))
      return
    }

    const selected = selectBehavior()
    const record: MockLlmRequestRecord = {
      attempt: requests.length + 1,
      scriptBehavior: selected.scriptBehavior,
      behavior: selected.behavior,
      endpoint,
      path,
      headers: { ...request.headers },
      body,
      chunksSent: 0,
    }
    requests.push(record)
    response.once('close', () => {
      if (!response.writableFinished && record.outcome === undefined) {
        finishRecord(resolved, record, 'client_closed')
      }
    })
    emit(resolved, {
      type: 'request',
      attempt: record.attempt,
      scriptBehavior: record.scriptBehavior,
      behavior: record.behavior,
      path,
    })
    await runBehavior(resolved, record, request, response)
  }

  const server = createServer((request, response) => {
    /* v8 ignore start -- last-resort containment for Node response failures after validated test inputs */
    handle(request, response).catch((error: unknown) => {
      const record = requests.at(-1)
      if (record !== undefined) finishRecord(resolved, record, 'server_error')
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : new Error(String(error)))
        return
      }
      response.writeHead(500, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: { message: 'mock server handler failed', code: 'MOCK_HANDLER_FAILED' } }))
    })
    /* v8 ignore stop */
  })

  let closing: Promise<void> | undefined
  const close = (): Promise<void> => (closing ??= new Promise((resolveClose) => {
    server.close(() => { resolveClose() })
    server.closeAllConnections()
  }))

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(resolved.port, resolved.host, () => {
      server.off('error', rejectListen)
      resolveListen()
    })
  })

  const address = server.address() as AddressInfo
  const advertisedHost = isIP(resolved.host) === 6 ? `[${resolved.host}]` : resolved.host
  return {
    baseURL: `http://${advertisedHost}:${address.port}`,
    port: address.port,
    randomSeed: resolved.randomSeed,
    requests,
    close,
  }
}
