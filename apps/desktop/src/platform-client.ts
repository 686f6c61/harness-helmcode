/** Platform request identity helpers local to the Desktop shell. */

/** Identity of the requesting UI for one Platform request. */
export interface ClientMetadata {
  readonly version: string
  /** Active UI language; only its primary subtag selects the Platform wire locale. */
  readonly locale: string
  /** Offset from UTC in seconds, positive east of Greenwich. */
  readonly timezoneOffsetSeconds: number
}

/** Private Platform credentials previously bound to an account; retained for update transport. */
export interface PlatformSession {
  readonly origin: string
  readonly token: string
  readonly userId: string | null
  readonly embeddedPageDist?: string
  readonly requestHeaders?: Readonly<Record<string, string>>
}

/**
 * Reduce a caller's UI language to the region-tagged Platform locale.
 * @param locale - active UI language such as `zh-CN`, `zh_TW`, or `en-US`.
 * @returns the region-tagged Platform locale for that language, `zh_CN` or `en_US`.
 */
export function platformWireLocale(locale: string): 'zh_CN' | 'en_US' {
  return locale.toLowerCase().split(/[-_]/)[0] === 'zh' ? 'zh_CN' : 'en_US'
}

/**
 * Identify native desktop API requests; null leaves non-desktop requests unchanged.
 * @param platform - Operating system supplied by the desktop composition.
 * @returns Platform request headers shared by account and update-policy clients.
 */
export function desktopClientHeaders(platform: 'darwin' | 'win32' | null): Record<string, string> {
  if (platform === null) return {}
  return { 'x-client-platform': platform === 'win32' ? 'desktop-win' : 'desktop-mac' }
}

/**
 * Build the Platform request headers for one desktop client check.
 * @param platform - Operating system hosting the shell.
 * @param client - Sampled build version, language, and UTC offset.
 * @returns Static public request headers without secrets or per-user identifiers.
 */
export function platformClientHeaders(platform: 'darwin' | 'win32' | null, client: ClientMetadata): Record<string, string> {
  return {
    'x-client-bundle-id': '',
    'x-client-platform': 'web',
    ...desktopClientHeaders(platform),
    'x-client-version': client.version,
    'x-client-locale': platformWireLocale(client.locale),
    'x-client-timezone-offset': String(client.timezoneOffsetSeconds),
  }
}

/**
 * Merge two cookie header strings, later values winning per name.
 * @param base - Existing cookie header.
 * @param override - Cookie header whose values take precedence.
 * @returns One deduplicated cookie header string.
 */
export function mergePlatformCookies(base: string, override: string): string {
  const cookies = new Map<string, string>()
  for (const header of [base, override]) {
    for (const pair of header.split(';')) {
      const separator = pair.indexOf('=')
      if (separator < 1) continue
      cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim())
    }
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
}
