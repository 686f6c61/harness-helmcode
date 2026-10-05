/** GitHub connector tests: the real plugin against a stubbed REST endpoint and the local credential vault. */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { formatIssue, githubRequest } from '../src/api.ts'
import * as tool from '../src/index.ts'

const homes: string[] = []
afterEach(() => {
  for (const dir of homes.splice(0)) rmSync(dir, { recursive: true, force: true })
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function setup(options: { token?: string | undefined; allowWrites?: boolean } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'dsh-github-'))
  homes.push(home)
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LocalCredentialProvider, { dshHome: home, watch: false, debounceMs: 0 })
  if (options.token !== undefined) await ctx.credentials.set(credentialRef('GITHUB_TOKEN'), options.token)
  await ctx.plugin(tool, { ...(options.allowWrites === undefined ? {} : { allowWrites: options.allowWrites }) })
  return ctx
}

let callCounter = 0
async function call(ctx: Context, args: Record<string, unknown>) {
  return ctx.tools.execute({
    signal: new AbortController().signal,
    callId: ToolCallId(`call-${++callCounter}`),
    name: 'github',
    arguments: args,
  })
}

function messageOf(result: ToolExecutionResult): string {
  expect(result.isError).toBe(false)
  return ((result as { value: unknown }).value as { message: string }).message
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

const ISSUE = {
  number: 7, title: 'Blinking cursor', state: 'open', html_url: 'https://github.test/o/r/issues/7',
  user: { login: 'octo' }, updated_at: '2026-10-01T00:00:00Z', body: 'It blinks.',
}

describe('github connector', () => {
  it('registers a `github` tool with the six actions', async () => {
    const ctx = await setup()
    const schema = ctx.tools.schemas().find(entry => entry.name === 'github')
    expect(schema).toBeDefined()
    const props = (schema!.parameters as { properties?: Record<string, { enum?: string[] }> }).properties ?? {}
    expect(props.action?.enum).toEqual(['issue-search', 'issue-get', 'issue-comment', 'pr-search', 'pr-get', 'pr-list'])
  })

  it('reports a missing token instead of calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup()
    expect(messageOf(await call(ctx, { action: 'issue-search', query: 'x' }))).toContain('token is not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('searches issues with the type qualifier through the vault token', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ total_count: 1, items: [ISSUE] }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    const message = messageOf(await call(ctx, { action: 'issue-search', query: 'cursor' }))
    expect(message).toContain('#7 [open] Blinking cursor')
    expect(message).toContain('1 total match')

    const [url, init] = fetchMock.mock.calls[0] ?? []
    if (!(url instanceof URL)) throw new TypeError('expected a URL request')
    expect(url.href).toBe('https://api.github.com/search/issues?q=cursor%20type%3Aissue&per_page=20')
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBe('Bearer tok-1')
    expect(headers.get('x-github-api-version')).toBe('2022-11-28')
  })

  it('narrows pull-request search with the pr qualifier', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ total_count: 0, items: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    expect(messageOf(await call(ctx, { action: 'pr-search', query: 'checkpoint' }))).toContain('No matching results.')
    const [rawUrl] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(decodeURIComponent(url.searchParams.get('q') ?? '')).toBe('checkpoint type:pr')
  })

  it('fetches one issue by owner/repo/number', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse(ISSUE))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    const message = messageOf(await call(ctx, { action: 'issue-get', owner: 'o', repo: 'r', number: 7 }))
    expect(message).toContain('https://github.test/o/r/issues/7')
    expect(message).toContain('It blinks.')
    const [rawUrl] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.pathname).toBe('/repos/o/r/issues/7')
  })

  it('lists pull requests with a state filter', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) =>
      jsonResponse([{ ...ISSUE, number: 9, pull_request: {} }]))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    const message = messageOf(await call(ctx, { action: 'pr-list', owner: 'o', repo: 'r', state: 'all' }))
    expect(message).toContain('pull request by octo')
    const [rawUrl] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.pathname).toBe('/repos/o/r/pulls')
    expect(url.searchParams.get('state')).toBe('all')
  })

  it('refuses comments unless the deployment enables writes', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    expect(messageOf(await call(ctx, { action: 'issue-comment', owner: 'o', repo: 'r', number: 7, body: 'hi' })))
      .toContain('commenting is disabled')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts a comment when writes are enabled', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ html_url: 'https://github.test/o/r/issues/7#comment-1' }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1', allowWrites: true })
    const message = messageOf(await call(ctx, { action: 'issue-comment', owner: 'o', repo: 'r', number: 7, body: 'Looking into it.' }))
    expect(message).toContain('Comment posted')
    const [rawUrl, init] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.pathname).toBe('/repos/o/r/issues/7/comments')
    expect(init?.method).toBe('POST')
    expect(JSON.parse((init?.body as string) ?? '{}')).toEqual({ body: 'Looking into it.' })
  })

  it('surfaces the API error message on failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ message: 'Bad credentials' }, { status: 401 })))
    const ctx = await setup({ token: 'tok-1' })
    expect(messageOf(await call(ctx, { action: 'issue-get', owner: 'o', repo: 'r', number: 7 })))
      .toContain('Bad credentials')
  })

  it('rejects incomplete targets without a network call', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    expect(messageOf(await call(ctx, { action: 'issue-get', owner: 'o' }))).toContain('requires a repository name')
    expect(messageOf(await call(ctx, { action: 'pr-get', repo: 'r' }))).toContain('requires a repository owner')
    expect(messageOf(await call(ctx, { action: 'pr-get', owner: 'o', repo: 'r' }))).toContain('requires an issue or pull request number')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('github request plumbing', () => {
  it('rejects a redirect (the API root must never be followed elsewhere)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => { throw new TypeError('unexpected redirect') }))
    await expect(githubRequest({ token: 't', baseURL: 'https://api.github.test' }, 'GET', '/rate_limit'))
      .rejects.toThrow('GitHub request failed')
  })
})

describe('formatting edges and argument validation', () => {
  it('renders entries without author, update time, or body, and keeps short bodies whole', () => {
    const bare = { number: 3, title: 'Bare', state: 'closed', html_url: 'https://github.test/o/r/issues/3' }
    const rendered = formatIssue(bare)
    expect(rendered.split('\n')).toEqual([
      '#3 [closed] Bare',
      'issue',
      'https://github.test/o/r/issues/3',
    ])
    const withBody = formatIssue({ ...bare, body: 'short body' })
    expect(withBody.split('\n').at(-1)).toBe('short body')
  })

  it('pluralizes the match count', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ total_count: 5, items: [ISSUE, { ...ISSUE, number: 8 }, { ...ISSUE, number: 9 }] }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    const message = messageOf(await call(ctx, { action: 'issue-search', query: 'many' }))
    expect(message).toContain('5 total matches, showing 3')
  })

  it('reports a blank search query without a network call', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    expect(messageOf(await call(ctx, { action: 'issue-search', query: '   ' })))
      .toBe('github: "issue-search" requires a query.')
    expect(messageOf(await call(ctx, { action: 'pr-search' })))
      .toBe('github: "pr-search" requires a query.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the default status message when an API error body carries no message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, { status: 422 })))
    const ctx = await setup({ token: 'tok-1' })
    expect(messageOf(await call(ctx, { action: 'issue-get', owner: 'o', repo: 'r', number: 1 })))
      .toBe('github: GitHub API error (HTTP 422)')
  })

  it('validates comment targets and body text once writes are enabled', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1', allowWrites: true })
    expect(messageOf(await call(ctx, { action: 'issue-comment', owner: 'o', number: 1 })))
      .toBe('github: "issue-comment" requires a repository name.')
    expect(messageOf(await call(ctx, { action: 'issue-comment', owner: 'o', repo: 'r', number: 1, body: '   ' })))
      .toBe('github: "issue-comment" requires body text.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires a repository for pr-list', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ctx = await setup({ token: 'tok-1' })
    expect(messageOf(await call(ctx, { action: 'pr-list', owner: 'o' })))
      .toBe('github: "pr-list" requires a repository name.')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

it('tolerates a search reply without an items array', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ total_count: 0 })))
  const ctx = await setup({ token: 'tok-1' })
  expect(messageOf(await call(ctx, { action: 'issue-search', query: 'x' }))).toContain('No matching results.')
})

it('defaults the pr-list state to open and uses the non-Error error text', async () => {
  const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse([ISSUE]))
  vi.stubGlobal('fetch', fetchMock)
  const ctx = await setup({ token: 'tok-1' })
  const message = messageOf(await call(ctx, { action: 'pr-list', owner: 'o', repo: 'r' }))
  expect(message).toContain('#7 [open] Blinking cursor')
  expect(message).not.toContain('total match')
  const [rawUrl] = fetchMock.mock.calls[0] ?? []
  if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
  expect(rawUrl.searchParams.get('state')).toBe('open')

  // A thrown string (never an Error) still lands in the message through String().
  vi.stubGlobal('fetch', vi.fn(async () => { throw 'gateway exploded' }))
  expect(messageOf(await call(ctx, { action: 'issue-get', owner: 'o', repo: 'r', number: 2 })))
    .toBe('github: GitHub request failed: gateway exploded')
})

it('truncates bodies beyond 800 characters and records the raw input on the card', async () => {
  const longBody = 'b'.repeat(1200)
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ...ISSUE, body: longBody })))
  const ctx = await setup({ token: 'tok-1' })
  const message = messageOf(await call(ctx, { action: 'issue-get', owner: 'o', repo: 'r', number: 7 }))
  expect(message).toContain(`${'b'.repeat(800)}…`)
  expect(message).not.toContain('b'.repeat(801))
  expect(ctx.tools.get('github')!.presentCall?.({ action: 'issue-get', owner: 'o', repo: 'r', number: 7 }))
    .toEqual({ card: 'generic', title: 'GitHub issue-get', kind: 'other', rawInput: { action: 'issue-get', owner: 'o', repo: 'r', number: 7 } })
})
