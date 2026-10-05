/**
 * Wire types for the Brave Search API (`GET
 * https://api.search.brave.com/res/v1/web/search`). Types only — no runtime
 * code. Brave nests results under `web.results[]`; each entry carries a URL,
 * title, an HTML-marked `description` (the snippet source), an optional
 * `page_age` (ISO-ish datetime on plans that return it), and a relative
 * `age` label this provider deliberately does not map to a date.
 *
 * @module @deepseek-ai/dsh-web-search-brave/types
 */

/** Parsed query parameters sent to Brave's web search endpoint. */
export interface BraveSearchQuery {
  /** The search text. */
  q: string
  /** Result count (Brave accepts 1-20). */
  count?: number
  /** Safe-search level accepted by the API. */
  safesearch?: 'off' | 'moderate' | 'strict'
}

/** One entry of Brave's `web.results[]`. */
export interface BraveWebResult {
  url: string
  title?: string | null
  /** Snippet source; may carry `<strong>` highlight markers to strip. */
  description?: string | null
  /** ISO-ish publication datetime when the plan returns it. */
  page_age?: string | null
  /** Human-relative age label ("3 days ago"); never mapped to a date. */
  age?: string | null
}

/** Brave's search response envelope. */
export interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[]
  }
}

/** Brave's error response envelope (best-effort; fields vary by failure). */
export interface BraveError {
  error?: string
  message?: string
}
