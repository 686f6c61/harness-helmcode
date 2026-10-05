/** Operations available to the isolated native welcome renderer. */

import type { DesktopLocale } from './locale.ts'

/** Private native welcome channels, installed only while its window exists. */
export const WELCOME_IPC = {
  saveApiKey: 'dsh-welcome:save-api-key',
  skip: 'dsh-welcome:skip',
} as const

/** Credential writes return a safe outcome without exposing Host diagnostics. */
export type WelcomeSaveResult = { readonly ok: true } | { readonly ok: false }

/** One-time notification retained by the main process until Welcome receives it. */
export type WelcomeNotice = 'session-expired'

/** Host-owned operations used by the welcome window. */
export interface WelcomeOperations {
  /**
   * Store the official provider's key before entering the workspace.
   * @param value - validated, trimmed API key.
   * @returns whether the write completed, without private error details.
   */
  saveApiKey(value: string): Promise<WelcomeSaveResult>
  /**
   * Enter the workspace without writing an onboarding-completion setting.
   * @returns completion after the workspace opens.
   */
  skip(): Promise<void>
}

/** The renderer receives localized copy and the key-save operation. */
export type WelcomeApi = DesktopLocale & WelcomeOperations

/** Authentication facts supplied at cold start. */
export interface WelcomeAuthentication {
  readonly hasApiKey: boolean
}

/**
 * Decide whether a startup requires the welcome entry.
 * @param authentication - the independently stored API-key fact.
 * @returns true only when no provider key is configured.
 */
export function needsWelcome(authentication: WelcomeAuthentication): boolean {
  return !authentication.hasApiKey
}
