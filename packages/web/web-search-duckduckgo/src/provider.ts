/**
 * `DuckDuckGoSearchProvider`: a keyless `WebSearchProvider` backed by the
 * DuckDuckGo lite HTML endpoint. It parses the result table — title links,
 * direct or `/l/?uddg=`-wrapped — into normalized sources, drops entries
 * without a portable snippet, and omits `content` because DuckDuckGo returns
 * no generated answer. Best effort by nature: the endpoint serves HTML for
 * browsers, not a stable API, so a layout change fails the search loudly
 * rather than returning invented results.
 * @module @deepseek-ai/dsh-web-search-duckduckgo/provider
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'

/** Stable id this provider registers under. */
export const DUCKDUCKGO_PROVIDER_ID = 'duckduckgo'

/** Default DuckDuckGo lite endpoint; `/lite/?q=` is the operation. */
export const DUCKDUCKGO_DEFAULT_BASE_URL = 'https://lite.duckduckgo.com'

/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = 'helmcode/0.0.1'

/** Resolved provider options (the plugin's `apply` supplies config defaults). */
export interface DuckDuckGoSearchProviderOptions {
  /** Endpoint base; `/lite/` is appended. */
  baseURL: string
}

/**
 * True when the HTML body carries no results for the query.
 * @param html - the full lite-endpoint response body.
 * @returns whether the page states the no-results fact.
 */
export function isNoResultsPage(html: string): boolean {
  return html.includes('No results') || html.includes('no results')
}

/**
 * Unwrap DuckDuckGo's redirect wrapper: `/l/?uddg=<encoded url>` carries the
 * real destination as the `uddg` parameter. Any other href passes through.
 * @param href - the raw href from a result anchor.
 * @returns the unwrapped destination URL, or the href unchanged.
 */
export function unwrapResultUrl(href: string): string {
  try {
    const parsed = new URL(href, DUCKDUCKGO_DEFAULT_BASE_URL)
    // `has()` above guarantees the parameter; its value may still be empty.
    const target = parsed.pathname === '/l/' ? parsed.searchParams.get('uddg') : null
    if (target === null) return href
    return URL.canParse(target) ? target : href
  } catch {
    return href
  }
}

/**
 * Strip HTML tags and collapse the entities and whitespace into plain text.
 * @param html - the raw fragment to reduce.
 * @returns the plain-text content, trimmed.
 */
export function stripMarkup(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The value of one attribute inside an anchor tag fragment, quoted with
 * either single or double quotes; the lite endpoint mixes both.
 */
function attributeOf(fragment: string, name: string): string | undefined {
  const marker = `${name}=`
  const start = fragment.indexOf(marker)
  if (start < 0) return undefined
  const quote = fragment[start + marker.length]
  if (quote !== '"' && quote !== "'") return undefined
  const end = fragment.indexOf(quote, start + marker.length + 1)
  if (end < 0) return undefined
  return fragment.slice(start + marker.length + 1, end)
}

/** One parsed result row: destination URL, title, and snippet source. */
export interface ParsedResult {
  url: string
  title: string
  snippet: string
}

/**
 * Parse the lite endpoint's HTML into result rows, in page order, by walking
 * the anchor tags that carry the `result-link` class. Each result's snippet
 * is the `result-snippet` cell following its anchor. Rows whose link carries
 * no usable href are dropped; the snippet may be empty (the caller decides
 * whether that is portable).
 * @param html - the full lite-endpoint response body.
 * @returns the parsed rows, in page order.
 */
export function parseResults(html: string): ParsedResult[] {
  const results: ParsedResult[] = []
  for (const chunk of html.split('<a')) {
    const openEnd = chunk.indexOf('>')
    if (openEnd < 0) continue
    const attributes = chunk.slice(0, openEnd)
    if (!attributes.includes('result-link')) continue
    const closeEnd = chunk.indexOf('</a>')
    if (closeEnd < 0) continue
    const rawHref = attributeOf(attributes, 'href')
    if (rawHref === undefined || rawHref.length === 0) continue
    const title = stripMarkup(chunk.slice(openEnd + 1, closeEnd))
    // The snippet cell follows this anchor's row; take the first one after it.
    const after = chunk.slice(closeEnd)
    const snippetMark = after.indexOf('result-snippet')
    let snippet = ''
    if (snippetMark >= 0) {
      const cellStart = after.indexOf('>', snippetMark)
      const cellEnd = after.indexOf('</td>', snippetMark)
      if (cellStart >= 0 && cellEnd > cellStart) snippet = stripMarkup(after.slice(cellStart + 1, cellEnd))
    }
    results.push({ url: unwrapResultUrl(rawHref), title, snippet })
  }
  return results
}

/**
 * Map parsed rows to normalized sources; snippet-less entries are dropped.
 * @param parsed - the rows produced by the HTML parse.
 * @returns the normalized sources carrying a portable snippet.
 */
export function mapResults(parsed: readonly ParsedResult[]): WebSearchSource[] {
  return parsed
    .filter(result => result.url.startsWith('http') && result.snippet.length > 0)
    .map(result => ({
      url: result.url,
      ...result.title.length > 0 ? { title: result.title } : {},
      snippet: result.snippet,
    }))
}

/**
 * Map a whole response body to a normalized search result.
 * @param html - the full lite-endpoint response body.
 * @returns the normalized result, empty when the page reports no results.
 */
export function mapHtml(html: string): WebSearchResult {
  return { sources: isNoResultsPage(html) ? [] : mapResults(parseResults(html)), truncated: false }
}

/** The keyless DuckDuckGo-backed search provider. */
export class DuckDuckGoSearchProvider implements WebSearchProvider {
  readonly id = DUCKDUCKGO_PROVIDER_ID

  /** Keyless: nothing to configure, so the provider is always usable. */
  available(): boolean {
    return true
  }

  constructor(private readonly options: DuckDuckGoSearchProviderOptions) {}

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const url = new URL('/lite/', this.options.baseURL)
    url.searchParams.set('q', request.query)
    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'error',
        headers: {
          'accept': 'text/html,application/xhtml+xml',
          'user-agent': USER_AGENT,
        },
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('DuckDuckGo search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`DuckDuckGo search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }

    if (!response.ok) {
      throw new WebError(`DuckDuckGo API error (HTTP ${response.status})`, 'WEB_PROVIDER_ERROR')
    }

    try {
      const html = await response.text()
      return mapHtml(html)
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('DuckDuckGo search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`DuckDuckGo returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }
}

/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
