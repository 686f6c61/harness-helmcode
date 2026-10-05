/**
 * Brave-backed `WebSearchProvider` plugin. It contributes to the `ctx.web`
 * registry without owning the service, and carries the `web-search-brave`
 * settings section the Web UI's search page edits: endpoint, per-request
 * result bound, safe-search level, and the credential reference the key lives
 * behind. The key resolves per search from the credential vault, falling back
 * to `$BRAVE_API_KEY` in the launch environment.
 *
 * @module @deepseek-ai/dsh-web-search-brave
 */

import type { Volatile } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import {
  BraveSearchProvider,
  BRAVE_DEFAULT_BASE_URL,
} from './provider.ts'
import type { BraveSearchProviderOptions } from './provider.ts'

export {
  BRAVE_DEFAULT_BASE_URL,
  BRAVE_MAX_COUNT,
  BRAVE_PROVIDER_ID,
  BraveSearchProvider,
} from './provider.ts'
export type { BraveSearchProviderOptions } from './provider.ts'

/** Cordis plugin name used by loader diagnostics; also the settings namespace. */
export const name = 'web-search-brave'

/** The web seam this provider registers into. */
export const inject = ['web']

/** Credential reference the section names when it declares none. */
export const BRAVE_DEFAULT_KEY_REF = 'BRAVE_API_KEY'

/** Plugin config (the settings section; every field editable live). */
export interface Config {
  /** Literal Brave key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey: Volatile<string | undefined>
  /** Credential reference naming the environment key. Defaults to `BRAVE_API_KEY`. */
  apiKeyEnv: Volatile<string>
  /** Endpoint base; `/res/v1/web/search` is appended. Defaults to the public API. */
  baseURL: Volatile<string | undefined>
  /** Default result count when a request carries no `maxResults`. Omitted = none. */
  numResults: Volatile<number | undefined>
  /** Brave safe-search level. Defaults to `moderate`. */
  safeSearch: Volatile<'off' | 'moderate' | 'strict' | undefined>
}

export const Config = z.object({
  apiKey: z.string().role('secret').volatile(),
  apiKeyEnv: z.string().role('credential-ref').default(BRAVE_DEFAULT_KEY_REF).volatile(),
  baseURL: z.string().volatile(),
  numResults: z.number().step(1).min(1).volatile(),
  safeSearch: z.union(['off', 'moderate', 'strict'] as const).volatile(),
})

/**
 * Snapshot one section into the options the provider serves its next search
 * with. Environment fallbacks stay here rather than in the provider: every
 * value it reads is already fully defaulted. The literal key wins; without
 * one, the provider resolves the section's credential reference per search
 * (vault first, then the launch environment), so a rotated key reaches the
 * very next request.
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param config - the currently authoritative section.
 * @returns options for one search.
 */
function resolveOptions(
  ctx: Context,
  config: { [K in keyof Config]: ReturnType<Config[K]['get']> | undefined },
): BraveSearchProviderOptions {
  const literalKey = config.apiKey !== undefined && config.apiKey.length > 0
    ? config.apiKey
    : undefined
  const apiKeyEnv = config.apiKeyEnv ?? BRAVE_DEFAULT_KEY_REF
  return {
    baseURL: config.baseURL ?? BRAVE_DEFAULT_BASE_URL,
    ...config.numResults === undefined ? {} : { numResults: config.numResults },
    ...config.safeSearch === undefined ? {} : { safeSearch: config.safeSearch },
    ...literalKey === undefined
      ? {
        resolveApiKey: async (): Promise<string | undefined> => {
          const credentials = ctx.get('credentials')
          if (credentials !== undefined) {
            return (await credentials.resolve(credentialRef(apiKeyEnv)))?.value
          }
          // Without the seam the environment is the whole credential plane.
          return launchEnvironmentOf(ctx).get(apiKeyEnv)?.value
        },
      }
      : { apiKey: literalKey },
  }
}

/** Register the Brave search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  ctx.web.registerSearchProvider(new BraveSearchProvider(() => resolveOptions(ctx, {
    apiKey: read(config.apiKey) as string | undefined,
    apiKeyEnv: (read(config.apiKeyEnv) as string | undefined) ?? BRAVE_DEFAULT_KEY_REF,
    baseURL: read(config.baseURL) as string | undefined,
    numResults: read(config.numResults) as number | undefined,
    safeSearch: read(config.safeSearch) as 'off' | 'moderate' | 'strict' | undefined,
  })))
}

/**
 * Read one config field. The Loader serves volatile sections as schemastery
 * fields carrying `.get()`; direct mounts (tests, composition overrides that
 * pass plain values) carry the raw value. Both shapes answer here.
 */
function read(field: unknown): unknown {
  if (field === undefined || field === null) return undefined
  if (typeof field === 'object' && 'get' in field && typeof field.get === 'function') {
    return (field as { get(): unknown }).get()
  }
  return field
}
