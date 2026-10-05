/** Web DeepSeek configuration, credential reuse, and saved model selection. */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  captureStableAria, compareOrRefreshGolden, launchWebScaffold,
  watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { openSettings, connectFreshWorkspaceEs, saveFailureShot, ES_BROWSER_LOCALE } from './support.ts'

const EXPECTED = fileURLToPath(new URL('./expected/deepseek-messages-settings/', import.meta.url))

describe.skipIf(webSnapshotMode() === 'record')('web e2e: DeepSeek Messages settings', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({ deepSeekMissingCredential: true })
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ES_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  }, 120_000)

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await scaffold?.close()
    }
  })

  it('offers one DeepSeek card and saves Messages settings using the existing credential reference', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-deepseek-messages-settings'))
    expect(scaffold.ctx.llm.listProviders()).toContainEqual({ id: 'deepseek-official', name: 'DeepSeek' })
    expect(scaffold.ctx.llm.listProviders().filter(provider => provider.id === 'deepseek-official')).toHaveLength(1)
    expect(scaffold.ctx.agentDefaultModel.currentSelection()).toEqual({ provider: 'deepseek-official', model: 'deepseek-flash' })
    const onboarding = page.getByRole('dialog', { name: 'Añade una clave de API para empezar' })
    await onboarding.getByLabel('Clave de API', { exact: true }).fill('sk-messages-onboarding')
    await onboarding.getByRole('button', { name: 'Guardar y continuar' }).click()
    await onboarding.waitFor({ state: 'detached' })
    await openSettings(page, 'es')
    const dialog = page.getByRole('dialog', { name: 'Configuración', exact: true })
    await dialog.getByRole('button', { name: 'Modelo', exact: true }).click()
    await dialog.getByText('DeepSeek', { exact: true }).waitFor()
    expect(await dialog.getByText('DeepSeek', { exact: true }).count()).toBe(1)
    await dialog.getByText('DeepSeek', { exact: true }).locator('xpath=ancestor::li').getByRole('button', { name: 'Editar' }).click()
    const messages = dialog
    await messages.getByText('Configuración personalizada', { exact: true }).click()
    expect(await messages.getByLabel('URL base', { exact: true }).getAttribute('placeholder'))
      .toBe('https://api.deepseek.com/anthropic')
    await compareOrRefreshGolden(join(EXPECTED, 'cards.expected.md'),
      await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd), webSnapshotMode())
    await messages.getByLabel('Clave de API', { exact: true }).fill('sk-e2e-messages')
    await messages.getByLabel('URL base', { exact: true }).fill('https://messages.example/anthropic')
    expect(await messages.getByLabel('ID de modelo 1').inputValue()).toBe('deepseek-flash')
    await messages.getByLabel('Nombre para mostrar 1', { exact: true }).fill('Messages Flash')
    await messages.getByRole('button', { name: 'Guardar', exact: true }).click()
    await dialog.getByText('DeepSeek (deepseek-official) guardado.', { exact: true }).waitFor()

    const settings = await readFile(join(scaffold.harnessHome, 'profiles', 'scaffold', 'cordis.patch.yml'), 'utf8')
    expect(settings).toContain('https://messages.example/anthropic')
    expect(settings).toContain('id: llm-deepseek')
    await expect(scaffold.ctx.llm.resolveModelInfo('deepseek-official', 'deepseek-flash')).resolves.toMatchObject({
      name: 'Messages Flash', inputModalities: ['text', 'image'], systemPromptUpdate: 'in-history',
    })
    expect(scaffold.ctx.settings.describe().find(row => row.ns === 'llm-deepseek')?.value).not.toHaveProperty('protocol')
    expect(settings).not.toContain('sk-e2e-')
    const credentials = await readFile(join(scaffold.harnessHome, '.credentials.yaml'), 'utf8')
    expect(credentials).toContain('DEEPSEEK_API_KEY: sk-e2e-messages')
    expect(credentials).not.toContain('DEEPSEEK_MESSAGES_API_KEY')
    expect(await page.locator('body').innerText()).not.toContain('sk-e2e-')
    await page.keyboard.press('Escape')
    await connectFreshWorkspaceEs(page, scaffold.workspaceCwd, 'messages-settings-e2e')
    await page.getByRole('button', { name: /^Seleccionar modelo/ }).click()
    await page.getByRole('menuitem', { name: /Modelo/ }).click()
    await page.getByRole('menuitemradio', { name: 'Messages Flash', exact: true }).waitFor()
    await compareOrRefreshGolden(join(EXPECTED, 'picker.expected.md'),
      await captureStableAria(page, '[role="group"][aria-label="Modelo y nivel de razonamiento"]', scaffold.workspaceCwd), webSnapshotMode())
    await page.keyboard.press('Escape')
    await page.getByRole('menuitem', { name: /Nivel de razonamiento/ }).click()
    const effortWeights = await page.getByRole('menuitemradio').evaluateAll(rows => rows.map(row =>
      getComputedStyle(row.querySelector('span span')!).fontWeight,
    ))
    expect(new Set(effortWeights)).toEqual(new Set(['400']))
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('selects an available DeepSeek model after provider settings remove the default', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-deepseek-messages-default'))
    await page.keyboard.press('Escape')
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: 'deepseek-official', model: 'deepseek-v4-flash' })
    await page.reload({ waitUntil: 'load' })
    const input = page.locator('[data-composer-input]').first()
    const trigger = page.getByRole('button', { name: /^Seleccionar modelo.*deepseek-official\/deepseek-v4-flash/ })
    await trigger.waitFor()
    await expect.poll(() => input.getAttribute('contenteditable')).toBe('true')
    await trigger.click()
    await page.getByRole('menuitem', { name: /Modelo/ }).click()
    await page.getByRole('menuitemradio', { name: 'Messages Flash', exact: true }).click()
    await expect.poll(() => input.getAttribute('contenteditable')).toBe('true')
    await expect.poll(() => scaffold.ctx.agentDefaultModel.currentSelection().provider).toBe('deepseek-official')
    const settings = await readFile(join(scaffold.harnessHome, 'profiles', 'scaffold', 'cordis.patch.yml'), 'utf8')
    expect(settings).toContain('provider: deepseek-official')
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)
})
