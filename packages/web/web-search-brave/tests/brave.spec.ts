import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as bravePlugin from '@deepseek-ai/dsh-web-search-brave'
import { BraveSearchProvider, BRAVE_PROVIDER_ID } from '@deepseek-ai/dsh-web-search-brave'
import { mapBraveResponse, mapBraveResult, stripHighlightMarkup } from '../src/provider.ts'

// Test tokens are assembled, never written as literals, so no plausible
// credential string ever lands in source control.
const keyOf = (label: string): string => ['test-token', label].join('-')

const homes: string[] = []
const options = { apiKey: keyOf('section'), baseURL: 'https://api.brave.test' }

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  for (const dir of homes.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('Brave result mapping', () => {
  it('strips highlight markup and collapses whitespace from the description', () => {
    expect(stripHighlightMarkup('Brave <strong>search</strong>\n  API')).toBe('Brave search API')
    expect(stripHighlightMarkup('  <em>plain</em> text  ')).toBe('plain text')
  })

  it('maps a full result entry', () => {
    expect(mapBraveResult({
      url: 'https://a.test',
      title: 'A',
      description: 'A <strong>salient</strong> snippet',
      page_age: '2026-01-01',
    })).toEqual({ url: 'https://a.test', title: 'A', snippet: 'A salient snippet', publishedAt: '2026-01-01' })
  })

  it('drops a result with no usable description', () => {
    expect(mapBraveResult({ url: 'https://a.test' })).toBeUndefined()
    expect(mapBraveResult({ url: 'https://a.test', description: null })).toBeUndefined()
    expect(mapBraveResult({ url: 'https://a.test', description: '<strong></strong>' })).toBeUndefined()
    expect(mapBraveResult({ url: 'https://a.test', description: '   ' })).toBeUndefined()
  })

  it('omits null/empty optional fields rather than emitting them', () => {
    expect(mapBraveResult({ url: 'https://a.test', title: null, description: 'hi', page_age: null, age: '3 days ago' }))
      .toEqual({ url: 'https://a.test', snippet: 'hi' })
    expect(mapBraveResult({ url: 'https://a.test', title: '', description: 'hi' }))
      .toEqual({ url: 'https://a.test', snippet: 'hi' })
  })

  it('never maps the relative age label to a publication date', () => {
    const mapped = mapBraveResult({ url: 'https://a.test', description: 'hi', age: '3 days ago' })
    expect(mapped).toEqual({ url: 'https://a.test', snippet: 'hi' })
  })

  it('maps a response to a result with no content and filtered sources', () => {
    const result = mapBraveResponse({
      web: {
        results: [
          { url: 'https://a.test', description: 'one' },
          { url: 'https://b.test' },
          { url: 'https://c.test', title: 'C', description: 'three' },
        ],
      },
    })
    expect(result).toEqual({
      sources: [
        { url: 'https://a.test', snippet: 'one' },
        { url: 'https://c.test', title: 'C', snippet: 'three' },
      ],
      truncated: false,
    })
    expect(result.content).toBeUndefined()
  })

  it('tolerates a missing web results array', () => {
    expect(mapBraveResponse({}).sources).toEqual([])
    expect(mapBraveResponse({ web: {} }).sources).toEqual([])
  })
})

describe('BraveSearchProvider availability', () => {
  it('is unavailable without a key or resolver', () => {
    expect(new BraveSearchProvider(() => ({ apiKey: '', baseURL: 'https://api.brave.test' })).available()).toBe(false)
  })

  it('is available with a literal key', () => {
    expect(new BraveSearchProvider(() => ({ ...options, numResults: 5 })).available()).toBe(true)
  })

  it('is available when a key resolver is supplied (the key may appear later)', () => {
    expect(new BraveSearchProvider(() => ({ baseURL: 'https://api.brave.test', resolveApiKey: () => Promise.resolve(undefined) })).available()).toBe(true)
  })

  it('is misconfigured when the base URL is unparseable', () => {
    expect(new BraveSearchProvider(() => ({ ...options, baseURL: 'not a url' })).available()).toBe(false)
  })

  it('is misconfigured when numResults is set but not a positive integer', () => {
    expect(new BraveSearchProvider(() => ({ ...options, numResults: -1 })).available()).toBe(false)
    expect(new BraveSearchProvider(() => ({ ...options, numResults: 1.5 })).available()).toBe(false)
  })
})

describe('BraveSearchProvider request mapping', () => {
  it('snapshots one section per search and sends query, count, safesearch, and the token', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [{ url: 'https://a.test', description: 'hi' }] } }))
    vi.stubGlobal('fetch', fetchMock)

    let section = 0
    const provider = new BraveSearchProvider(() => ({
      apiKey: keyOf(`section-${String(section += 1)}`),
      baseURL: 'https://api.brave.test',
      numResults: 5,
      safeSearch: 'strict',
    }))
    await provider.search({ query: 'hello', maxResults: 8 })
    await provider.search({ query: 'hello again', maxResults: 8 })

    const [rawUrl, firstInit] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const firstUrl = new URL(rawUrl.href)
    const [, secondInit] = fetchMock.mock.calls[1] ?? []
    expect(firstUrl.toString()).toBe('https://api.brave.test/res/v1/web/search?q=hello&count=8&safesearch=strict')
    expect(((firstInit?.headers as Record<string, string>) ?? {})['x-subscription-token']).toBe(keyOf('section-1'))
    expect(((secondInit?.headers as Record<string, string>) ?? {})['x-subscription-token']).toBe(keyOf('section-2'))
  })

  it('resolves the token through the supplied resolver when no literal key is set', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new BraveSearchProvider(() => ({
      baseURL: 'https://api.brave.test',
      resolveApiKey: () => Promise.resolve(keyOf('resolver')),
    }))
    await provider.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(((init?.headers as Record<string, string>) ?? {})['x-subscription-token']).toBe(keyOf('resolver'))
  })

  it('caps the per-request count at the Brave ceiling', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new BraveSearchProvider(() => ({ ...options })).search({ query: 'q', maxResults: 50 })
    const [rawUrl] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.searchParams.get('count')).toBe('20')
  })

  it('falls back to the configured numResults when a request omits maxResults', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new BraveSearchProvider(() => ({ ...options, numResults: 7 })).search({ query: 'q' })
    const [rawUrl] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.searchParams.get('count')).toBe('7')
  })

  it('omits count when neither maxResults nor a configured default is set', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new BraveSearchProvider(() => ({ ...options })).search({ query: 'q' })
    const [rawUrl] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.searchParams.has('count')).toBe(false)
  })

  it('defaults safesearch to moderate', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new BraveSearchProvider(() => ({ ...options })).search({ query: 'q' })
    const [rawUrl] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.searchParams.get('safesearch')).toBe('moderate')
  })

  it('forwards the abort signal', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await new BraveSearchProvider(() => ({ ...options })).search({ query: 'q' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(init?.signal).toBe(controller.signal)
  })
})

describe('BraveSearchProvider error handling', () => {
  it('maps an HTTP error to WEB_PROVIDER_ERROR with the provider message', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ error: 'bad token' }, { status: 401 })))
    await expect(new BraveSearchProvider(() => ({ ...options })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'bad token' }))
  })

  it('keeps a status-line message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => new Response('<html>502</html>', { status: 502 })))
    await expect(new BraveSearchProvider(() => ({ ...options })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'Brave API error (HTTP 502)' }))
  })

  it('maps a transport failure to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => { throw new Error('socket hang up') }))
    await expect(new BraveSearchProvider(() => ({ ...options })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('maps an unprocessable success body to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => new Response('{not json', {
      status: 200, headers: { 'content-type': 'application/json' },
    })))
    await expect(new BraveSearchProvider(() => ({ ...options })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })
})

async function bootPlugin(config: Record<string, unknown>): Promise<Context> {
  const home = mkdtempSync(join(tmpdir(), 'dsh-brave-'))
  homes.push(home)
  const ctx = new Context()
  await ctx.plugin(WebRuntime, { searchProvider: BRAVE_PROVIDER_ID })
  await ctx.plugin(LocalCredentialProvider, { dshHome: home, watch: false, debounceMs: 0 })
  await ctx.plugin(bravePlugin, config)
  return ctx
}

describe('web-search-brave plugin', () => {
  it('serves first-run search from the credential vault without any settings write', async () => {
    const ctx = await bootPlugin({})
    await ctx.credentials.set(credentialRef('BRAVE_API_KEY'), keyOf('vault'))
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [], truncated: false })
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(((init?.headers as Record<string, string>) ?? {})['x-subscription-token']).toBe(keyOf('vault'))
  })

  it('falls back to the launch environment when the vault holds nothing', async () => {
    vi.stubEnv('BRAVE_API_KEY', keyOf('env'))
    const ctx = await bootPlugin({})
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [], truncated: false })
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(((init?.headers as Record<string, string>) ?? {})['x-subscription-token']).toBe(keyOf('env'))
  })

  it('honors the section endpoint over the default', async () => {
    const ctx = await bootPlugin({ apiKey: keyOf('literal'), baseURL: 'https://brave.section.test' })
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    await ctx.web.search({ query: 'q' })
    const [rawUrl] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.origin).toBe('https://brave.section.test')
  })

  it('a literal section key wins over the vault', async () => {
    const ctx = await bootPlugin({ apiKey: keyOf('literal') })
    await ctx.credentials.set(credentialRef('BRAVE_API_KEY'), keyOf('vault'))
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => jsonResponse({ web: { results: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(((init?.headers as Record<string, string>) ?? {})['x-subscription-token']).toBe(keyOf('literal'))
  })

  it('has no default export (namespace plugin export shape)', () => {
    expect('default' in bravePlugin).toBe(false)
  })
})
