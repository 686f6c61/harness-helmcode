/**
 * The bundle's substance is its patch file: the `dsh.bundle.patch` manifest
 * field must name a real, parseable patch list.
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { evaluate } from '@deepseek-ai/cordis-plugin-loader'
import { resolveProfiles } from '@deepseek-ai/dsh-llm-pi-ai/src/config.ts'

describe('dsh-base bundle', () => {
  it('declares a parseable patch list through the dsh.bundle.patch manifest field', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>
      dsh?: { bundle?: { patch?: string } }
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    const parsed = yaml.load(
      readFileSync(resolve(root, manifest.dsh!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    )
    expect(Array.isArray(parsed)).toBe(true)
    // The base layer is one insert list over the empty profile root.
    const rows = (parsed as { insert?: { id?: string; config?: Record<string, unknown>; disabled?: boolean }[] }[]).flatMap(
      patch => patch.insert ?? [],
    )
    expect(rows.length).toBeGreaterThan(50)
    expect(rows.some(row => row.id === 'agent-loop')).toBe(true)
    expect(rows.find(row => row.id === 'session-telemetry-otel')).toBeUndefined()
    expect(rows.find(row => row.id === 'hmr')).toMatchObject({
      config: { root: [] },
    })
    expect(rows.filter(row => row.id === 'subagent-codex')).toHaveLength(0)
    expect(rows.filter(row => row.id === 'subagent-claude-code')).toHaveLength(0)
    expect(rows.find(row => row.id === 'web')?.config).toMatchObject({ fetchProvider: 'http' })
    expect(rows.find(row => row.id === 'web-fetch-http')).toBeDefined()
    expect(rows.find(row => row.id === 'tool-web')?.config).toMatchObject({ fetch: true })
    expect(manifest.dependencies).not.toHaveProperty('@deepseek-ai/dsh-subagent-codex')
    expect(manifest.dependencies).not.toHaveProperty('@deepseek-ai/dsh-subagent-claude-code')
    expect(manifest.dependencies).toHaveProperty('@deepseek-ai/dsh-web-fetch-http')
  })

  it('gates each shell stack by platform with a symmetric disabled expression', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const parsed = yaml.load(
      readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8'),
      { schema: entryListSchema },
    )
    if (!Array.isArray(parsed)) throw new TypeError('base patch must parse to a patch list')
    const rows = parsed.flatMap((patch): Record<string, unknown>[] =>
      typeof patch === 'object' && patch !== null
        ? (patch as { insert?: Record<string, unknown>[] }).insert ?? []
        : [],
    )
    // Symmetric gating: each stack's executor and tool rows carry the same
    // platform fact, inverted between the bash and pwsh twins, so exactly one
    // shell stack mounts per host. Evaluate with a platform-scoped context
    // (the `with` scope shadows the global `process`) so both outcomes pin on
    // every host.
    for (const [id, win32, linux] of [
      ['bash-sandbox', true, false],
      ['tool-bash', true, false],
      ['pwsh-sandbox', false, true],
      ['tool-pwsh', false, true],
    ] as const) {
      const row = rows.find(candidate => candidate.id === id)
      if (row === undefined) throw new Error(`base patch must mount ${id}`)
      const expression = (row.disabled as { __jsExpr?: string } | undefined)?.__jsExpr
      if (expression === undefined) throw new Error(`${id} must gate on a !!js disabled expression`)
      expect(Boolean(evaluate({ process: { platform: 'win32' } }, expression)), `${id} on win32`).toBe(win32)
      expect(Boolean(evaluate({ process: { platform: 'linux' } }, expression)), `${id} on linux`).toBe(linux)
    }
    // The platform layer folded into these rows: no separate patch file ships.
    expect(existsSync(resolve(root, 'windows.cordis.patch.yml'))).toBe(false)
  })

  it('ships the NaN Builders route with cluster-accurate model facts', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const parsed = yaml.load(
      readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8'),
      { schema: entryListSchema },
    )
    const rows = (parsed as { insert?: { id?: string; config?: Record<string, unknown> }[] }[])
      .flatMap(patch => patch.insert ?? [])
    // The shipped default: the cluster model with the widest shared quota.
    expect(rows.find(row => row.id === 'agent-default-model')?.config).toMatchObject({
      provider: 'nan-builders',
      model: 'deepseek-v4.1-flash',
    })
    const providers = rows.find(row => row.id === 'llm-pi-ai')?.config?.providers as
      | Parameters<typeof resolveProfiles>[0]
      | undefined
    if (providers === undefined) throw new Error('base patch must configure the llm-pi-ai route')
    // Full materialization: a malformed model fact (unknown effort level,
    // empty wire value) fails here exactly as it would at boot.
    const models = resolveProfiles(providers).get('nan-builders')?.piProvider?.getModels() ?? []
    const byId = new Map(models.map(model => [model.id, model]))
    expect([...byId.keys()]).toEqual([
      'deepseek-v4.1-flash',
      'glm5.3-flash',
      'qwen3.6',
      'qwen3.8-flash',
      'gemma4',
      'mimo-v2.6-flash',
    ])
    // NaN skips reasoning when the parameter reads `none`; the `off` level
    // dispatches that wire spelling for the models that offer it.
    expect(byId.get('qwen3.6')?.thinkingLevelMap).toMatchObject({ off: 'none', minimal: 'minimal', max: 'max' })
    expect(byId.get('gemma4')?.thinkingLevelMap).toMatchObject({ off: 'none', max: 'max' })
    expect(byId.get('glm5.3-flash')?.thinkingLevelMap).toMatchObject({ low: 'low', max: 'max' })
    // Every declared model carries the cluster's per-answer token ceiling and
    // context window; reasoning draws from the same budget.
    for (const [id, contextWindow, maxTokens] of [
      ['deepseek-v4.1-flash', 1048576, 32768],
      ['glm5.3-flash', 1048576, 32768],
      ['qwen3.6', 262144, 65536],
      ['qwen3.8-flash', 262144, 32768],
      ['gemma4', 262144, 65536],
      ['mimo-v2.6-flash', 1048576, 32768],
    ] as const) {
      const model = byId.get(id)
      if (model === undefined) throw new Error(`nan-builders must declare ${id}`)
      expect(model.contextWindow, `${id} context window`).toBe(contextWindow)
      expect(model.maxTokens, `${id} maxTokens`).toBe(maxTokens)
    }
  })
})
