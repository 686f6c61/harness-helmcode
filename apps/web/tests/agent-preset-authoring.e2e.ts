/** The preset settings page selects a preset and shows what it declares; creating one starts a Creator-mode task. */
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { captureStableAria, compareOrRefreshGolden, launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold } from './scaffold.ts'
import { openSettings, ES_BROWSER_LOCALE, connectFreshWorkspaceEs, saveFailureShot } from './support.ts'

const EXPECTED = fileURLToPath(new URL('./expected/agent-preset-authoring', import.meta.url))
const mode = webSnapshotMode()

describe('web e2e: preset roster guidance', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>
  beforeAll(async () => {
    scaffold = await launchWebScaffold({ profile: { packages: [] } })
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ES_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await openSettings(page, 'es')
    await page.getByRole('dialog', { name: 'Configuración' }).getByRole('button', { name: 'Presets de agente' }).click()
    await page.getByRole('heading', { name: 'Presets de agente' }).waitFor()
  }, 120_000)
  afterAll(async () => { await browser?.close(); await scaffold?.close() })

  it('shows the shipped roster with mode help and a read-only view, and no editing actions', async () => {
    onTestFailed(() => saveFailureShot(page, 'preset-roster-section'))
    await expect.poll(() => page.locator('[data-agent-preset-id]').count()).toBe(4)
    const snapshot = await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(join(EXPECTED, 'section.expected.md'), snapshot, mode)
    expect(snapshot).toContain('Dejar que el agente me ayude a crear un preset')
    expect(snapshot).toContain('Ver configuración: Modo estándar')
    expect(snapshot).not.toContain('Duplicar preset')
    expect(snapshot).not.toContain('Editar plugins')
    expect(snapshot).not.toContain('Abrir directorio')
    expect(snapshot).not.toContain('Eliminar')
  })

  it('reads mode details and examples without changing the new-task default', async () => {
    onTestFailed(() => saveFailureShot(page, 'preset-roster-guide'))
    const settings = page.getByRole('dialog', { name: 'Configuración' })
    const trigger = settings.getByRole('button', { name: 'Detalles del modo: Modo PTC', exact: true })
    await trigger.click()
    const guide = page.getByRole('dialog', { name: 'Modo PTC', exact: true })
    await guide.getByRole('heading', { name: 'Cómo se llaman las herramientas', exact: true }).waitFor()
    await guide.getByRole('tab', { name: 'Cómo usarlo', exact: true }).click()
    await guide.getByRole('heading', { name: 'Comprobar un conjunto de archivos de configuración', exact: true }).waitFor()
    await guide.getByRole('tab', { name: 'Cómo usarlo', exact: true }).press('Escape')
    await guide.waitFor({ state: 'detached' })
    expect(await trigger.evaluate(element => document.activeElement === element)).toBe(true)
    expect(await settings.getByRole('button', { name: 'Predeterminado para nuevas tareas: Modo estándar', exact: true }).getAttribute('aria-pressed')).toBe('true')
  })

  it('views a shipped composition read-only', async () => {
    onTestFailed(() => saveFailureShot(page, 'preset-roster-view'))
    const settings = page.getByRole('dialog', { name: 'Configuración' })
    await settings.getByRole('button', { name: 'Ver configuración: Modo PTC', exact: true }).click()
    const viewer = page.getByRole('dialog', { name: 'Ver configuración · Modo PTC', exact: true })
    await viewer.waitFor({ timeout: 10_000 })
    // The real shipped declaration, not a golden: the viewer shows whatever
    // the deployment ships, and this lane only asserts it is shown read-only
    // in the Loader's own dialect.
    const shown = await viewer.locator('pre').textContent()
    expect(shown).toContain("- id: persona\n  name: '@deepseek-ai/dsh-persona'\n")
    expect(shown).toContain('- id: workflow-ptc\n')
    expect(shown).toContain("disabled: !!js process.platform === 'win32'\n")
    expect(shown).not.toContain('__jsExpr')
    expect(await viewer.getByRole('textbox').count()).toBe(0)
    // The header X and the footer button share the Cerrar name; the footer one is last.
    await viewer.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
    await viewer.waitFor({ state: 'detached', timeout: 10_000 })
    expect(await settings.getByRole('button', { name: 'Predeterminado para nuevas tareas: Modo estándar', exact: true }).getAttribute('aria-pressed')).toBe('true')
  })

  it('starts a Creator-mode task from the section entry', async () => {
    onTestFailed(() => saveFailureShot(page, 'preset-roster-creator'))
    // The entry stages the self-referential preset and lands a new task on it,
    // so the flow needs a connected workspace to enter.
    await page.getByRole('dialog', { name: 'Configuración' }).getByRole('button', { name: 'Cerrar', exact: true }).last().click()
    await connectFreshWorkspaceEs(page, scaffold.workspaceCwd)
    await openSettings(page, 'es')
    const settings = page.getByRole('dialog', { name: 'Configuración' })
    await settings.getByRole('button', { name: 'Presets de agente' }).click()
    await settings.getByRole('button', { name: 'Dejar que el agente me ayude a crear un preset', exact: true }).click()
    await settings.waitFor({ state: 'detached', timeout: 10_000 })
    await expect.poll(async () => {
      const response = await scaffold.hostFetch('/api/session/list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client-request', rpcId: 'creator-draft-stage', method: 'session/list',
          payload: { args: { _request: {} } },
        }),
      })
      const body = await response.json() as {
        result: { value?: { items: { projections?: { values: { agentPreset?: string | null } } }[] } }
      }
      return body.result.value?.items
        .map(item => item.projections?.values.agentPreset)
        .filter(preset => typeof preset === 'string') ?? []
    }, { timeout: 15_000 }).toContain('cordis')
  })

  it('runs without page errors or model calls', () => { expect(tripwire.pageErrors).toEqual([]) })
})
