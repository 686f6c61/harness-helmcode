/**
 * GitHub REST calls for the `github` tool: request plumbing (token header,
 * API version, error mapping) plus response formatting into model-readable
 * text. Pure functions over `fetch` — no cordis, no storage.
 * @module @deepseek-ai/dsh-github-connector/api
 */

/** Default GitHub REST API root; a deployment may point at GitHub Enterprise. */
export const GITHUB_DEFAULT_BASE_URL = 'https://api.github.com'

/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = 'helmcode/0.0.1'

/** Resolved client options (the plugin's `apply` supplies config defaults). */
export interface GithubApiClientOptions {
  /** Token value from the credential vault; sent as a Bearer header. */
  token: string
  /** REST root; `/…` paths are appended verbatim. */
  baseURL: string
}

/** One parsed GitHub API error body (best-effort; fields vary by failure). */
interface GithubErrorBody {
  message?: string
}

/** One GitHub issue or pull request as the search/list/get endpoints return it. */
export interface GithubIssue {
  number: number
  title: string
  state: string
  html_url: string
  user?: { login?: string } | null
  created_at?: string
  updated_at?: string
  pull_request?: { html_url?: string } | null
  body?: string | null
}

/** One search-response envelope. */
export interface GithubSearchResponse {
  total_count?: number
  items?: GithubIssue[]
}

/**
 * Perform one GitHub REST call and parse the JSON body.
 * @param options - client options naming the API root and bearer token.
 * @param method - HTTP verb; GET for reads, POST for writes.
 * @param path - endpoint path resolved against the client's base URL.
 * @param body - JSON request body, omitted for undefined.
 * @returns the parsed response body.
 * @throws with the API's own message (or the HTTP status) on a non-2xx reply.
 */
export async function githubRequest<T>(
  options: GithubApiClientOptions,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(new URL(path, options.baseURL), {
      method,
      redirect: 'error',
      headers: {
        'accept': 'application/vnd.github+json',
        'authorization': `Bearer ${options.token}`,
        'user-agent': USER_AGENT,
        'x-github-api-version': '2022-11-28',
        ...body === undefined ? {} : { 'content-type': 'application/json' },
      },
      ...body === undefined ? {} : { body: JSON.stringify(body) },
    })
  } catch (error: unknown) {
    throw new Error(`GitHub request failed: ${String(error)}`)
  }
  if (!response.ok) {
    let message = `GitHub API error (HTTP ${response.status})`
    try {
      const parsed = await response.json() as GithubErrorBody
      if (parsed.message !== undefined && parsed.message.length > 0) message = parsed.message
    } catch {
      // The HTTP status is already captured; a non-JSON error body only costs
      // a richer provider message, never the real error.
    }
    throw new Error(message)
  }
  return await response.json() as T
}

/**
 * True when the entry is a pull request (the search endpoint mixes both).
 * @param issue - the search or list entry to classify.
 * @returns whether the entry carries pull-request metadata.
 */
export function isPullRequest(issue: GithubIssue): boolean {
  return issue.pull_request !== undefined && issue.pull_request !== null
}

/**
 * Render one issue/PR as compact model-readable text.
 * @param issue - the issue or pull request to render.
 * @returns the header lines, URL, and truncated body.
 */
export function formatIssue(issue: GithubIssue): string {
  const kind = isPullRequest(issue) ? 'pull request' : 'issue'
  const login = issue.user?.login
  const author = login === undefined ? '' : ` by ${login}`
  const lines = [
    `#${issue.number} [${issue.state}] ${issue.title}`,
    `${kind}${author}${issue.updated_at === undefined ? '' : ` · updated ${issue.updated_at}`}`,
    issue.html_url,
  ]
  const body = issue.body?.trim()
  if (body !== undefined && body.length > 0) lines.push('', body.length > 800 ? `${body.slice(0, 800)}…` : body)
  return lines.join('\n')
}

/**
 * Render a search/list result list; empty results state the fact.
 * @param items - the entries to render, in API order.
 * @param total - the search endpoint's total match count, when known.
 * @returns the count header followed by each rendered entry.
 */
export function formatIssueList(items: GithubIssue[], total: number | undefined): string {
  if (items.length === 0) return 'No matching results.'
  const header = total === undefined ? '' : `(${String(total)} total match${total === 1 ? '' : 'es'}, showing ${String(items.length)})\n`
  return header + items.map(formatIssue).join('\n\n')
}
