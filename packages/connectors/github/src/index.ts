/**
 * Outbound GitHub connector: one `github` tool the Agent uses to read, search,
 * and (when the deployment enables writes) comment on issues and pull
 * requests through the GitHub REST API. The token lives in the credential
 * vault behind an environment-style reference; requests leave the machine
 * only when the model calls the tool on the user's behalf.
 * @module @deepseek-ai/dsh-github-connector
 */
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import {
  formatIssue,
  formatIssueList,
  githubRequest,
  GITHUB_DEFAULT_BASE_URL,
  type GithubIssue,
  type GithubSearchResponse,
} from './api.ts'

export {
  formatIssue,
  formatIssueList,
  githubRequest,
  GITHUB_DEFAULT_BASE_URL,
  isPullRequest,
} from './api.ts'
export type { GithubApiClientOptions, GithubIssue } from './api.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'github-connector'

/** The seams this connector consumes. */
export const inject = ['tools', 'credentials']

/** Plugin configuration. */
export interface Config {
  /** REST API root; defaults to the public GitHub API. */
  apiBaseUrl?: string
  /**
   * Credential reference name holding the token. Defaults to `GITHUB_TOKEN`:
   * the environment variable, the managed store, or a project `.env` entry
   * under that name supplies the secret.
   */
  tokenRef?: string
  /**
   * Allow write actions (`issue-comment`). Read and search are always
   * available; writes stay opt-in so a composition enables commenting
   * deliberately.
   */
  allowWrites?: boolean
}

/** Schemastery configuration for the connector consumer. */
export const Config: z<Config> = z.object({
  apiBaseUrl: z.string(),
  tokenRef: z.string(),
  allowWrites: z.boolean(),
})

interface ToolArgs {
  action: 'issue-search' | 'issue-get' | 'issue-comment' | 'pr-search' | 'pr-get' | 'pr-list'
  query?: string
  owner?: string
  repo?: string
  number?: number
  body?: string
  state?: 'open' | 'closed' | 'all'
}

export function apply(ctx: Context, config: Config): void {
  const baseURL = config.apiBaseUrl ?? GITHUB_DEFAULT_BASE_URL
  const tokenRefName = config.tokenRef ?? 'GITHUB_TOKEN'
  const allowWrites = config.allowWrites === true

  ctx.tools.register(defineTool({
    name: 'github',
    description:
      'Read, search, and comment on GitHub issues and pull requests through the REST API. '
      + 'Actions: issue-search (query), issue-get (owner/repo/number), issue-comment (owner/repo/number/body, '
      + 'needs write access), pr-search (query), pr-get (owner/repo/number), pr-list (owner/repo, optional state). '
      + 'Requires a configured GitHub token.',
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ['issue-search', 'issue-get', 'issue-comment', 'pr-search', 'pr-get', 'pr-list'],
        description: 'Operation to perform.',
      },
      query: { type: 'string', description: 'Search text; required for the *-search actions.' },
      owner: { type: 'string', description: 'Repository owner; required for single-repo actions.' },
      repo: { type: 'string', description: 'Repository name; required for single-repo actions.' },
      number: { type: 'integer', description: 'Issue or pull request number; required for get and comment.' },
      body: { type: 'string', description: 'Comment text; required for issue-comment.' },
      state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Pull request state filter for pr-list; defaults to open.' },
    },
    output: {
      schema: {
        additionalProperties: false,
        properties: {
          message: { type: 'string', required: true },
        },
        type: 'object',
      },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    async execute(args: ToolArgs) {
      const token = await ctx.credentials.resolve(credentialRef(tokenRefName))
      if (token === undefined) {
        return {
          message: `GitHub token is not configured. Save it on the GitHub connector settings or set ${tokenRefName} in the environment.`,
        }
      }
      const options = { token: token.value, baseURL }
      try {
        switch (args.action) {
          case 'issue-search':
          case 'pr-search': {
            if (args.query === undefined || args.query.trim().length === 0) {
              return { message: `github: "${args.action}" requires a query.` }
            }
            const qualifier = args.action === 'pr-search' ? 'type:pr' : 'type:issue'
            const search = await githubRequest<GithubSearchResponse>(
              options, 'GET',
              `/search/issues?q=${encodeURIComponent(`${args.query} ${qualifier}`)}&per_page=20`,
            )
            return { message: formatIssueList(search.items ?? [], search.total_count) }
          }
          case 'issue-get':
          case 'pr-get': {
            const missing = requireRepoTarget(args)
            if (missing !== undefined) return { message: `github: "${args.action}" requires ${missing}.` }
            const issue = await githubRequest<GithubIssue>(
              options, 'GET', `/repos/${args.owner}/${args.repo}/issues/${String(args.number)}`,
            )
            return { message: formatIssue(issue) }
          }
          case 'issue-comment': {
            if (!allowWrites) {
              return { message: 'github: commenting is disabled in this deployment (allowWrites: false).' }
            }
            const missing = requireRepoTarget(args)
            if (missing !== undefined) return { message: `github: "issue-comment" requires ${missing}.` }
            if (args.body === undefined || args.body.trim().length === 0) {
              return { message: 'github: "issue-comment" requires body text.' }
            }
            const created = await githubRequest<{ html_url: string }>(
              options, 'POST',
              `/repos/${args.owner}/${args.repo}/issues/${String(args.number)}/comments`,
              { body: args.body },
            )
            return { message: `Comment posted: ${created.html_url}` }
          }
          case 'pr-list': {
            const missing = requireRepo(args)
            if (missing !== undefined) return { message: `github: "pr-list" requires ${missing}.` }
            const pulls = await githubRequest<GithubIssue[]>(
              options, 'GET',
              `/repos/${args.owner}/${args.repo}/pulls?state=${args.state ?? 'open'}&per_page=20`,
            )
            return { message: formatIssueList(pulls, undefined) }
          }
        }
      } catch (error: unknown) {
        return { message: `github: ${error instanceof Error ? error.message : String(error)}` }
      }
    },
    presentCall: args => ({ card: 'generic', title: `GitHub ${args.action}`, kind: 'other', rawInput: args }),
  }))
}

/** Validate the owner/repo(/number) triple; returns the missing-field message. */
function requireRepoTarget(args: ToolArgs): string | undefined {
  const missing = requireRepo(args)
  if (missing !== undefined) return missing
  if (typeof args.number !== 'number' || !Number.isInteger(args.number)) return 'an issue or pull request number'
  return undefined
}

/** Validate owner/repo; returns the missing-field message. */
function requireRepo(args: ToolArgs): string | undefined {
  if (args.owner === undefined || args.owner.trim().length === 0) return 'a repository owner'
  if (args.repo === undefined || args.repo.trim().length === 0) return 'a repository name'
  return undefined
}
