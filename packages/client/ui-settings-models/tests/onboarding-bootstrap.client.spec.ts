/** Host half of the Models onboarding bootstrap: apply publishes the page-global options. */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply, Config } from '../src/index.ts'
import { ONBOARDING_CONFIG_GLOBAL } from '../src/onboarding-config.ts'

describe('models onboarding bootstrap options', () => {
  it('defaults the credential step on and honors an explicit off', () => {
    expect(Config({})).toEqual({ credentialOnboarding: true })
    expect(Config({ credentialOnboarding: false })).toEqual({ credentialOnboarding: false })
  })

  it('publishes one page-global key for the public options', () => {
    expect(ONBOARDING_CONFIG_GLOBAL).toBe('__DSH_MODELS_ONBOARDING__')
  })

  it('apply publishes the credential-onboarding choice on the index inject table', () => {
    const ctx = new Context()
    const table: Array<{ kind: string; name: string; value: unknown }> = []
    ;(apply as (ctx: unknown, config: { credentialOnboarding: boolean }) => void)(ctx, { credentialOnboarding: false })
    ctx.emit('webserver/index-inject', table as never)
    expect(table).toEqual([{
      kind: 'global',
      name: '__DSH_MODELS_ONBOARDING__',
      value: { credentialOnboarding: false },
    }])
  })
})
