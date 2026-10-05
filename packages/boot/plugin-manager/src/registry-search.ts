/**
 * npm registry discovery for Helmcode plugins: packages tagged `dsh-plugin`.
 * The Host serves the search through the plugin-manager remote; the CLI's
 * `dsh plugin search` re-exports this module, so both surfaces follow one
 * rule. The call happens only when the user asks for it — requested
 * functionality, not background traffic.
 * @module @deepseek-ai/dsh-plugin-manager/registry-search
 */

import { stringify } from 'node:querystring'

/** Default npm registry root searched for plugins. */
export const NPM_REGISTRY_URL = 'https://registry.npmjs.org'

/** The discovery topic matching third-party plugins. */
export const PLUGIN_KEYWORD = 'dsh-plugin'

/** One registry search hit, reduced to what a listing prints. */
export interface RegistryPluginResult {
  name: string
  version: string
  description: string
}

/** Options for one registry search. */
export interface RegistrySearchOptions {
  /** Free-text query; empty means "everything tagged with the plugin topic". */
  query?: string
  /** Maximum hits, clamped to the registry's 1-250 page size. Defaults to 20. */
  limit?: number
  /** Registry root for tests and alternative registries. */
  registryUrl?: string
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch
}

/**
 * Search the npm registry for plugin packages.
 * @param options - query, limit, registry root, and injectable fetch; every field optional.
 * @returns the hits reduced to name, version, and description, in registry order.
 * @throws on a non-2xx registry reply or a transport failure.
 */
export async function searchRegistryPlugins(options: RegistrySearchOptions = {}): Promise<RegistryPluginResult[]> {
  const text = options.query === undefined || options.query.trim().length === 0 ? `keywords:${PLUGIN_KEYWORD}` : options.query.trim()
  const size = Math.min(Math.max(options.limit ?? 20, 1), 250)
  const url = new URL('/-/v1/search', options.registryUrl ?? NPM_REGISTRY_URL)
  url.search = stringify({ text, size: String(size) })
  const response = await (options.fetchImpl ?? fetch)(url)
  if (!response.ok) throw new Error(`plugin search failed (HTTP ${String(response.status)})`)
  const body = await response.json() as {
    objects?: { package: { name: string; version: string; description?: string } }[]
  }
  return (body.objects ?? []).map(object => ({
    name: object.package.name,
    version: object.package.version,
    description: object.package.description ?? '',
  }))
}

/**
 * Render search hits as aligned `name@version — description` lines.
 * @param results - the hits to render, in display order.
 * @returns the aligned listing, or a no-results line for an empty hit set.
 */
export function formatPluginSearch(results: RegistryPluginResult[]): string {
  if (results.length === 0) return 'No plugins found.'
  const labelWidth = Math.max(...results.map(result => `${result.name}@${result.version}`.length))
  return results
    .map((result) => {
      const label = `${result.name}@${result.version}`.padEnd(labelWidth, ' ')
      return result.description === '' ? label : `${label}  ${result.description.replace(/\s+/g, ' ')}`
    })
    .join('\n')
}
