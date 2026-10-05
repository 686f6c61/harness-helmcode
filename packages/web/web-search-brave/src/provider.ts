/**
 * `BraveSearchProvider`: a `WebSearchProvider` backed by the Brave Search API
 * (`GET /res/v1/web/search` with an `X-Subscription-Token`). It strips the
 * `<strong>` highlight markers from `description` to derive the snippet, maps
 * `page_age` to `publishedAt` (only when the plan returns it), drops entries
 * without a portable snippet, and omits `content` because Brave returns no
 * generated answer. A thunk supplies the options so one settings-section
 * change serves the next search without re-registering the provider.
 * @module @deepseek-ai/dsh-web-search-brave/provider
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'
import type { BraveError, BraveSearchResponse, BraveWebResult } from './types.ts'

/** Stable id this provider registers under. */
export const BRAVE_PROVIDER_ID = 'brave'

/** Default Brave search endpoint; `/res/v1/web/search` is the operation. */
export const BRAVE_DEFAULT_BASE_URL = 'https://api.search.brave.com'

/** Highest result count Brave accepts per request. */
export const BRAVE_MAX_COUNT = 20

/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = 'helmcode/0.0.1'

/** Resolved provider options for one operation (the plugin snapshots them at entry). */
export interface BraveSearchProviderOptions {
  /** Literal Brave subscription token; when absent, {@link resolveApiKey} answers. */
  apiKey?: string
  /**
   * Resolve the operation's token from the credential planes (vault, then
   * launch environment). Presence itself marks the provider available: the
   * key may appear between two searches without a settings write.
   */
  resolveApiKey?: () => Promise<string | undefined>
  /** Endpoint base; `/res/v1/web/search` is appended. */
  baseURL: string
  /** Default result count when a request carries no `maxResults`. */
  numResults?: number
  /** Brave safe-search level. */
  safeSearch?: 'off' | 'moderate' | 'strict'
}

/**
 * Strip the `<strong>` (and any other) markup Brave puts inside
 * `description`, and collapse the whitespace the tags leave behind.
 * @param description - the raw HTML-bearing description Brave returned.
 * @returns the plain-text snippet with collapsed whitespace.
 */
export function stripHighlightMarkup(description: string): string {
  return description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Map one Brave result to a normalized source, or `undefined` when it carries
 * no portable snippet (an entry whose description is absent or blank after
 * markup stripping is dropped — inventing one would lie).
 * @param result - the raw web result from the Brave response envelope.
 * @returns the normalized source, or `undefined` when no snippet survives.
 */
export function mapBraveResult(result: BraveWebResult): WebSearchSource | undefined {
  if (result.description == null) return undefined
  const snippet = stripHighlightMarkup(result.description)
  if (snippet.length === 0) return undefined
  return {
    url: result.url,
    ...result.title != null && result.title.length > 0 ? { title: result.title } : {},
    snippet,
    ...result.page_age != null && result.page_age.length > 0 ? { publishedAt: result.page_age } : {},
  }
}

/**
 * Map a Brave response envelope to a normalized search result.
 *
 * @param response - the parsed `GET /res/v1/web/search` response body.
 * @returns the normalized result; snippet-less entries are dropped
 *   ({@link mapBraveResult}).
 */
export function mapBraveResponse(response: BraveSearchResponse): WebSearchResult {
  const sources = (response.web?.results ?? [])
    .map(mapBraveResult)
    .filter((source): source is WebSearchSource => source !== undefined)
  // Brave returns no generated answer, so `content` is omitted. The web
  // service owns the final `maxResults` truncation, so `truncated: false`.
  return { sources, truncated: false }
}

/** The Brave-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class BraveSearchProvider implements WebSearchProvider {
  readonly id = BRAVE_PROVIDER_ID

  /**
   * @param resolveOptions - options for the NEXT operation, snapshotted once
   *   at each operation's entry so one search never mixes two settings
   *   sections. A thunk rather than a value because the settings section can
   *   change between searches, and re-registering the provider to carry a new
   *   endpoint would make the seam's selection observable as a flicker.
   */
  constructor(private readonly resolveOptions: () => BraveSearchProviderOptions) {}

  available(): boolean {
    const options = this.resolveOptions()
    const keyAvailable = (options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== undefined
    return keyAvailable
      && URL.canParse(options.baseURL)
      && (options.numResults === undefined || (Number.isInteger(options.numResults) && options.numResults > 0))
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    // One snapshot for the whole operation: credential resolution awaits, and a
    // settings write landing inside that await must not send the key resolved
    // from the old section to the endpoint named by the new one.
    const options = this.resolveOptions()
    // An empty literal is no key at all: the thunk answers instead.
    const apiKey = options.apiKey ? options.apiKey : (await options.resolveApiKey?.()) ?? ''
    // A per-request bound wins over the configured default; either may be
    // absent, and Brave rejects counts above its per-request ceiling.
    const requested = request.maxResults ?? options.numResults
    const count = requested === undefined ? undefined : Math.min(requested, BRAVE_MAX_COUNT)
    const url = new URL('/res/v1/web/search', options.baseURL)
    url.searchParams.set('q', request.query)
    if (count !== undefined) url.searchParams.set('count', String(count))
    url.searchParams.set('safesearch', options.safeSearch ?? 'moderate')
    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'error',
        headers: {
          'accept': 'application/json',
          'x-subscription-token': apiKey,
          'user-agent': USER_AGENT,
        },
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new WebError('Brave search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`Brave search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }

    if (!response.ok) {
      const status = response.status
      let message = `Brave API error (HTTP ${status})`
      try {
        const parsed = await response.json() as BraveError
        const detail = typeof parsed.error === 'string' ? parsed.error : parsed.message
        if (detail !== undefined && detail.length > 0) message = detail
      } catch (error: unknown) {
        // An abort fired mid-body must surface as WEB_ABORTED, not be swallowed
        // into a generic HTTP-error message — cancellation is not a provider
        // error (the seam's cancellation contract).
        if (error instanceof DOMException && error.name === 'AbortError') throw new WebError('Brave search aborted', 'WEB_ABORTED', { cause: error })
        // Otherwise: the HTTP status is already captured in `message` above; a
        // malformed/non-JSON error body (normal for gateway 5xx/429s) can only
        // cost a richer provider message, never the real error.
      }
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }

    try {
      const payload = await response.json() as BraveSearchResponse
      return mapBraveResponse(payload)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new WebError('Brave search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`Brave returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }
}
