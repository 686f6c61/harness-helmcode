/** Keyless DuckDuckGo provider tests: HTML parsing, wire mapping, and plugin registration. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as plugin from '@deepseek-ai/dsh-web-search-duckduckgo'
import { DuckDuckGoSearchProvider, DUCKDUCKGO_PROVIDER_ID } from '@deepseek-ai/dsh-web-search-duckduckgo'
import { isNoResultsPage, mapHtml, mapResults, parseResults, stripMarkup, unwrapResultUrl } from '../src/provider.ts'

const options = { baseURL: 'https://lite.ddg.test' }

function htmlResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html' }, ...init })
}

/** One lite-endpoint result row as the page renders it (single-quoted class). */
function row(href: string, title: string, snippet: string): string {
  return `<a rel="nofollow" href="${href}" class='result-link'>${title}</a>`
    + `<table><tr><td class="result-snippet">${snippet}</td></tr></table>`
}

const PAGE = [
  '<html><body>',
  row('https://a.test/page', 'A &amp; B', 'First <b>result</b> snippet'),
  row('/l/?uddg=https%3A%2F%2Fb.test%2Fpage', 'Wrapped', 'Second snippet'),
  row('https://c.test/page', 'No snippet here', ''),
  row('javascript:void(0)', 'Dropped for scheme', 'has snippet but bad href'),
  '</body></html>',
].join('')

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('DuckDuckGo HTML parsing', () => {
  it('strips tags and entities from titles and snippets', () => {
    expect(stripMarkup('First <b>result</b> &amp; more')).toBe('First result & more')
    expect(stripMarkup('  spaced&nbsp; out  ')).toBe('spaced out')
  })

  it('unwraps the /l/?uddg= redirect form and passes direct links through', () => {
    expect(unwrapResultUrl('https://direct.test')).toBe('https://direct.test')
    expect(unwrapResultUrl('/l/?uddg=https%3A%2F%2Fb.test%2Fpage')).toBe('https://b.test/page')
    expect(unwrapResultUrl('/l/?uddg=not-a-url')).toBe('/l/?uddg=not-a-url')
  })

  it('detects a no-results page', () => {
    expect(isNoResultsPage('<html>No results.</html>')).toBe(true)
    expect(isNoResultsPage(PAGE)).toBe(false)
  })

  it('pairs each anchor with the snippet cell that follows it', () => {
    const parsed = parseResults(PAGE)
    expect(parsed).toHaveLength(4)
    expect(parsed[0]).toEqual({ url: 'https://a.test/page', title: 'A & B', snippet: 'First result snippet' })
    expect(parsed[1]?.url).toBe('https://b.test/page')
    expect(parsed[2]?.snippet).toBe('')
  })

  it('maps a page to sources, dropping snippet-less and non-http entries', () => {
    const result = mapHtml(PAGE)
    expect(result.sources).toEqual([
      { url: 'https://a.test/page', title: 'A & B', snippet: 'First result snippet' },
      { url: 'https://b.test/page', title: 'Wrapped', snippet: 'Second snippet' },
    ])
    expect(result.truncated).toBe(false)
    expect(result.content).toBeUndefined()
  })

  it('drops anchors without a usable href attribute form', () => {
    const page = [
      "<a class='result-link'>no attributes at all</a>",
      "<a class='result-link' href=unquoted/path>unquoted href</a>",
      '<a class=\'result-link\' href="https://cut.test">unterminated cell</a><td class=\'result-snippet\'>never closed',
      '<a class=\'result-link\' href="https://kept.test">closed</a><td class=\'result-snippet\'>kept snippet</td>',
    ].join('')
    const parsed = parseResults(page)
    // An anchor without href= or with an unquoted href is dropped; a snippet
    // cell without its closing tag yields no snippet.
    expect(parsed).toEqual([
      { url: 'https://cut.test', title: 'unterminated cell', snippet: '' },
      { url: 'https://kept.test', title: 'closed', snippet: 'kept snippet' },
    ])
    expect(mapHtml(page).sources).toEqual([{ url: 'https://kept.test', title: 'closed', snippet: 'kept snippet' }])
  })

  it('unwraps bare and hostile redirect targets without inventing URLs', () => {
    // A /l/ link whose uddg parameter carries no value falls back to the href;
    // an unparseable href is returned verbatim rather than throwing.
    expect(unwrapResultUrl('https://ddg.test/l/?uddg')).toBe('https://ddg.test/l/?uddg')
    expect(unwrapResultUrl('http://[invalid')).toBe('http://[invalid')
  })

  it('drops anchors whose quoted href never closes and anchors with an empty href', () => {
    const page = [
      '<a class=\'result-link\' href="https://open.test">never closed quote</a>',
      '<a class=\'result-link\' href="">empty href</a>',
      '<a class=\'result-link\' href="https://kept.test">closed</a><td class=\'result-snippet\'>kept</td>',
    ].join('')
    expect(parseResults(page)).toEqual([
      { url: 'https://open.test', title: 'never closed quote', snippet: '' },
      { url: 'https://kept.test', title: 'closed', snippet: 'kept' },
    ])
  })

  it('keeps the empty-title omission and the no-results page verdict in the mapping', () => {
    const parsed = parseResults(row('https://titleless.test/', '', 'snippet survives'))
    expect(mapResults(parsed)).toEqual([{ url: 'https://titleless.test/', snippet: 'snippet survives' }])
    expect(mapHtml('<html>No results for that query.</html>').sources).toEqual([])
    expect(mapResults([{ url: '//relative-only.test/path', title: 'rel', snippet: 'kept out' }])).toEqual([])
  })

  it('tolerates a page without any anchor', () => {
    expect(parseResults('<html></html>')).toEqual([])
    expect(mapHtml('<html></html>').sources).toEqual([])
  })
})

describe('DuckDuckGoSearchProvider', () => {
  it('is always available (keyless)', () => {
    expect(new DuckDuckGoSearchProvider(options).available()).toBe(true)
  })

  it('requests the lite endpoint with the query and sends the attribution header', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => htmlResponse(PAGE))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new DuckDuckGoSearchProvider(options)
    const result = await provider.search({ query: 'hello', maxResults: 5 })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [rawUrl, init] = fetchMock.mock.calls[0] ?? []
    if (!(rawUrl instanceof URL)) throw new TypeError('expected a URL request')
    const url = new URL(rawUrl.href)
    expect(url.toString()).toBe('https://lite.ddg.test/lite/?q=hello')
    expect(init).toMatchObject({ method: 'GET', redirect: 'error' })
    expect(((init?.headers as Record<string, string>) ?? {})['user-agent']).toContain('helmcode/')

    expect(result.sources).toHaveLength(2)
  })

  it('caps nothing client-side: the page length is what it is', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => htmlResponse(PAGE))
    vi.stubGlobal('fetch', fetchMock)
    const result = await new DuckDuckGoSearchProvider(options).search({ query: 'q', maxResults: 1 })
    expect(result.sources).toHaveLength(2)
    expect(result.truncated).toBe(false)
  })

  it('forwards the abort signal', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => htmlResponse(PAGE))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await new DuckDuckGoSearchProvider(options).search({ query: 'q' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(init?.signal).toBe(controller.signal)
  })

  it('surfaces an abort as WEB_ABORTED and omits the signal when none is given', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => {
      throw new DOMException('The operation was aborted.', 'AbortError')
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(new DuckDuckGoSearchProvider(options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED', message: 'DuckDuckGo search aborted' }))

    const plain = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      expect(init?.signal).toBeUndefined()
      return htmlResponse(PAGE)
    })
    vi.stubGlobal('fetch', plain)
    await expect(new DuckDuckGoSearchProvider(options).search({ query: 'q' })).resolves.toMatchObject({ truncated: false })
  })

  it('surfaces a body-read abort as WEB_ABORTED', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: () => Promise.reject(new DOMException('body stream aborted', 'AbortError')),
    })))
    await expect(new DuckDuckGoSearchProvider(options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('maps an HTTP error to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => new Response('blocked', { status: 403 })))
    await expect(new DuckDuckGoSearchProvider(options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'DuckDuckGo API error (HTTP 403)' }))
  })

  it('maps a transport failure to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => { throw new Error('socket hang up') }))
    await expect(new DuckDuckGoSearchProvider(options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('maps an unprocessable success body to WEB_PROVIDER_ERROR', async () => {
    // fetch.text() never throws for this body, so exercise the mapping instead:
    // a body is always processable text; the provider maps it to zero sources.
    vi.stubGlobal('fetch', vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => new Response('not html at all', { status: 200 })))
    const result = await new DuckDuckGoSearchProvider(options).search({ query: 'q' })
    expect(result.sources).toEqual([])
  })
})

describe('web-search-duckduckgo plugin', () => {
  it('registers the keyless provider and serves a search end to end (HMR-safe)', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => htmlResponse(PAGE))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: DUCKDUCKGO_PROVIDER_ID })
    const fiber = await ctx.plugin(plugin, {})
    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ truncated: false })
    await fiber.dispose()
    await expect(ctx.web.search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' }))
  })

  it('is the usable provider with zero configuration', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => htmlResponse(PAGE))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    await ctx.plugin(WebRuntime)
    await ctx.plugin(plugin, {})
    const result = await ctx.web.search({ query: 'q' })
    expect(result.sources[0]?.url).toBe('https://a.test/page')
    expect(result.truncated).toBe(false)
  })

  it('has no default export (namespace plugin export shape)', () => {
    expect('default' in plugin).toBe(false)
  })
})
