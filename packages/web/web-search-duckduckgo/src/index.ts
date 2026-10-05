/**
 * Keyless DuckDuckGo `WebSearchProvider` plugin. It contributes to the
 * `ctx.web` registry without owning the service. Being keyless, it is the
 * search that works on first run: install and use. Queries reach DuckDuckGo
 * only when a search is actually requested — requested functionality, not
 * telemetry.
 *
 * @module @deepseek-ai/dsh-web-search-duckduckgo
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { DuckDuckGoSearchProvider, DUCKDUCKGO_DEFAULT_BASE_URL } from './provider.ts'

export {
  DUCKDUCKGO_DEFAULT_BASE_URL,
  DUCKDUCKGO_PROVIDER_ID,
  DuckDuckGoSearchProvider,
  isNoResultsPage,
  mapHtml,
  mapResults,
  parseResults,
  stripMarkup,
  unwrapResultUrl,
} from './provider.ts'
export type { DuckDuckGoSearchProviderOptions, ParsedResult } from './provider.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-duckduckgo'

/** The web seam this provider registers into. */
export const inject = ['web']

/** Plugin config (all optional). */
export interface Config {
  /** Endpoint base; `/lite/` is appended. Defaults to the public endpoint. */
  baseURL?: string
}

export const Config = z.object({
  baseURL: z.string(),
})

/** Register the keyless DuckDuckGo search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  ctx.web.registerSearchProvider(new DuckDuckGoSearchProvider({
    baseURL: config.baseURL ?? DUCKDUCKGO_DEFAULT_BASE_URL,
  }))
}
