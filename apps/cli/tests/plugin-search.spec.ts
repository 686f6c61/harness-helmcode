/** `dsh plugin search` unit tests: registry call shape, parsing, and formatting. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatPluginSearch, PLUGIN_KEYWORD, searchRegistryPlugins } from '../src/plugin-search.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

function registryResponse(objects: { package: { name: string; version: string; description?: string } }[]): Response {
  return new Response(JSON.stringify({ objects }), { status: 200, headers: { 'content-type': 'application/json' } })
}

/** A URL-typed no-op responder is assignable to `fetch` (fewer parameters only). */
function fetchMockOf(responder: () => Response): typeof fetch {
  return vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => responder())
}

describe('searchRegistryPlugins', () => {
  it('searches the plugin topic by default and clamps the page size', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => registryResponse([]))
    await searchRegistryPlugins({ fetchImpl: fetchMock, limit: 999 })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [input] = fetchMock.mock.calls[0] ?? []
    if (!(input instanceof URL)) throw new TypeError('expected a URL request')
    const url = input
    expect(url.origin).toBe('https://registry.npmjs.org')
    expect(url.searchParams.get('text')).toBe(`keywords:${PLUGIN_KEYWORD}`)
    expect(url.searchParams.get('size')).toBe('250')
  })

  it('forwards a free-text query verbatim', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => registryResponse([]))
    await searchRegistryPlugins({ query: 'github automation', fetchImpl: fetchMock })
    const [input] = fetchMock.mock.calls[0] ?? []
    if (!(input instanceof URL)) throw new TypeError('expected a URL request')
    expect(input.searchParams.get('text')).toBe('github automation')
  })

  it('maps registry hits to name/version/description', async () => {
    const results = await searchRegistryPlugins({
      fetchImpl: fetchMockOf(() => registryResponse([
        { package: { name: '@acme/dsh-notes', version: '1.2.0', description: 'Sticky notes for the agent' } },
        { package: { name: 'plain-plugin', version: '0.0.3' } },
      ])),
    })
    expect(results).toEqual([
      { name: '@acme/dsh-notes', version: '1.2.0', description: 'Sticky notes for the agent' },
      { name: 'plain-plugin', version: '0.0.3', description: '' },
    ])
  })

  it('throws on a registry error with the HTTP status', async () => {
    await expect(searchRegistryPlugins({ fetchImpl: fetchMockOf(() => new Response('nope', { status: 503 })) }))
      .rejects.toThrow('plugin search failed (HTTP 503)')
  })
})

describe('formatPluginSearch', () => {
  it('aligns labels and keeps the description on one line', () => {
    const lines = formatPluginSearch([
      { name: '@acme/dsh-notes', version: '1.2.0', description: 'Sticky\nnotes  for   the agent' },
      { name: 'plain-plugin', version: '0.0.3', description: '' },
    ]).split('\n')
    const widest = '@acme/dsh-notes@1.2.0'.length
    expect(lines[0]).toBe('@acme/dsh-notes@1.2.0  Sticky notes for the agent')
    expect(lines[1]).toBe('plain-plugin@0.0.3'.padEnd(widest, ' '))
  })

  it('states the empty result', () => {
    expect(formatPluginSearch([])).toBe('No plugins found.')
  })
})
