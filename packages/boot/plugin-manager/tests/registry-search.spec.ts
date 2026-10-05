/** Registry discovery over an injected fetch: query/limit clamps, wire shapes, and the rendered listing. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { formatPluginSearch, NPM_REGISTRY_URL, PLUGIN_KEYWORD, searchRegistryPlugins } from '../src/registry-search.ts'

/** One OK registry reply carrying the given package objects. */
function registryReply(objects: Array<{ package: { name: string; version: string; description?: string } }>): Response {
  return new Response(JSON.stringify({ objects }), { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchRegistryPlugins', () => {
  it('searches the plugin topic when the query is missing, blank, or whitespace', async () => {
    const seen: URL[] = []
    const fetchImpl: typeof fetch = (input) => {
      seen.push(new URL(typeof input === 'string' ? input : 'href' in input ? input.href : input.url))
      return Promise.resolve(registryReply([]))
    }
    await searchRegistryPlugins({ fetchImpl })
    await searchRegistryPlugins({ query: '   ', fetchImpl })
    expect(seen.map(url => url.searchParams.get('text'))).toEqual([`keywords:${PLUGIN_KEYWORD}`, `keywords:${PLUGIN_KEYWORD}`])
    expect(seen[0]!.searchParams.get('size')).toBe('20')
  })

  it('trims a free-text query and clamps the page size to the registry bounds', async () => {
    const seen: URL[] = []
    const fetchImpl: typeof fetch = (input) => {
      seen.push(new URL(typeof input === 'string' ? input : 'href' in input ? input.href : input.url))
      return Promise.resolve(registryReply([]))
    }
    await searchRegistryPlugins({ query: '  git tools  ', fetchImpl })
    await searchRegistryPlugins({ limit: 0, fetchImpl })
    await searchRegistryPlugins({ limit: 999, fetchImpl })
    await searchRegistryPlugins({ limit: 7, fetchImpl })
    expect(seen.map(url => url.searchParams.get('text'))).toEqual(['git tools', `keywords:${PLUGIN_KEYWORD}`, `keywords:${PLUGIN_KEYWORD}`, `keywords:${PLUGIN_KEYWORD}`])
    expect(seen.map(url => url.searchParams.get('size'))).toEqual(['20', '1', '250', '7'])
  })

  it('targets /-/v1/search under the shipped registry or an explicit alternative root', async () => {
    const seen: URL[] = []
    const fetchImpl: typeof fetch = (input) => {
      seen.push(new URL(typeof input === 'string' ? input : 'href' in input ? input.href : input.url))
      return Promise.resolve(registryReply([]))
    }
    await searchRegistryPlugins({ fetchImpl })
    await searchRegistryPlugins({ registryUrl: 'https://npm.corp.example/', fetchImpl })
    expect(seen.map(url => `${url.origin}${url.pathname}`)).toEqual([
      `${NPM_REGISTRY_URL}/-/v1/search`,
      'https://npm.corp.example/-/v1/search',
    ])
  })

  it('reduces hits to name, version, and description, defaulting absent fields', async () => {
    const fetchImpl: typeof fetch = () => Promise.resolve(registryReply([
      { package: { name: 'helmcode-github', version: '1.2.3', description: 'GitHub connector' } },
      { package: { name: 'helmcode-bare', version: '0.0.1' } },
    ]))
    await expect(searchRegistryPlugins({ fetchImpl })).resolves.toEqual([
      { name: 'helmcode-github', version: '1.2.3', description: 'GitHub connector' },
      { name: 'helmcode-bare', version: '0.0.1', description: '' },
    ])
  })

  it('tolerates a registry reply without an objects array', async () => {
    const fetchImpl: typeof fetch = () => Promise.resolve(new Response('{}', { status: 200 }))
    await expect(searchRegistryPlugins({ fetchImpl })).resolves.toEqual([])
  })

  it('throws loud on a non-2xx registry reply', async () => {
    const fetchImpl: typeof fetch = () => Promise.resolve(new Response('nope', { status: 503 }))
    await expect(searchRegistryPlugins({ fetchImpl })).rejects.toThrow('plugin search failed (HTTP 503)')
  })

  it('propagates a transport failure and can run through the ambient fetch', async () => {
    await expect(searchRegistryPlugins({
      fetchImpl: () => Promise.reject(new Error('dial tcp: connection refused')),
    })).rejects.toThrow('connection refused')

    const ambient = vi.fn(() => Promise.resolve(registryReply([]))) as unknown as MockInstance<typeof fetch>
    vi.stubGlobal('fetch', ambient)
    await searchRegistryPlugins()
    expect(ambient).toHaveBeenCalledOnce()
  })
})

describe('formatPluginSearch', () => {
  it('returns the no-results line for an empty hit set', () => {
    expect(formatPluginSearch([])).toBe('No plugins found.')
  })

  it('aligns name@version labels and collapses description whitespace', () => {
    expect(formatPluginSearch([
      { name: 'helmcode-github', version: '1.2.3', description: 'GitHub   connector\nwith a wrapped  line' },
      { name: 'bare', version: '0.0.1', description: '' },
    ])).toBe([
      'helmcode-github@1.2.3  GitHub connector with a wrapped line',
      'bare@0.0.1           ',
    ].join('\n'))
  })

  it('omits the description gap entirely when no hit describes itself', () => {
    expect(formatPluginSearch([
      { name: 'a', version: '1.0.0', description: '' },
      { name: 'bb', version: '2.3.4', description: '' },
    ])).toBe('a@1.0.0 \nbb@2.3.4')
  })
})
