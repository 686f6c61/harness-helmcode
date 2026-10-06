/** Stored catalog drift remains repairable through the assembled Models settings page. */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  captureStableAria, compareOrRefreshGolden, launchWebScaffold,
  watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { openSettings, saveFailureShot, ES_BROWSER_LOCALE } from './support.ts'

const EXPECTED = fileURLToPath(new URL('./expected/models-settings-recovery/stored-error.expected.md', import.meta.url))
const FAILURE = 'llm-pi-ai: provider "openrouter" model "111" needs an api; '
  + 'the installed catalog does not describe it, so set the route\'s api to the wire protocol its endpoint speaks'
const CUSTOM_FAILURE = 'llm-pi-ai: provider "acme-gateway" model "custom-model" needs an api; '
  + 'the installed catalog does not describe it, so set the route\'s api to the wire protocol its endpoint speaks'

describe('web e2e: repairs a stored provider after catalog drift', () => {
  let home: string
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), 'dsh-models-recovery-'))
    await mkdir(join(home, 'profiles', 'scaffold'), { recursive: true })
    await writeFile(join(home, 'profiles', 'scaffold', 'cordis.patch.yml'), [
      '- id: llm-pi-ai', '  config:', '    providers:', '      openrouter:', '        models:',
      '          - id: "111"', '      zai: {}', '      acme-gateway:',
      '        baseURL: https://gateway.example/v1', '        models:', '          - id: "custom-model"', '',
    ].join('\n'))
    scaffold = await launchWebScaffold({ harnessHome: home })
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ES_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await openSettings(page, 'es')
    const dialog = page.getByRole('dialog', { name: 'Configuración' })
    await dialog.getByRole('button', { name: 'Modelos', exact: true }).click()
    await dialog.getByText(FAILURE, { exact: true }).waitFor()
  }, 120_000)

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      try {
        await scaffold?.close()
      } finally {
        if (home !== undefined) await rm(home, { recursive: true, force: true })
      }
    }
  })

  it('shows the failed provider beside healthy providers and keeps the add action usable', async () => {
    onTestFailed(() => saveFailureShot(page, 'models-settings-recovery'))
    const dialog = page.getByRole('dialog', { name: 'Configuración' })
    expect(await dialog.getByRole('button', { name: 'Editar openrouter', exact: true }).count()).toBe(1)
    expect(await dialog.getByRole('button', { name: 'Editar zai', exact: true }).count()).toBe(1)
    expect(await dialog.getByRole('button', { name: 'Editar acme-gateway', exact: true }).count()).toBe(1)
    expect(await dialog.getByText(CUSTOM_FAILURE, { exact: true }).count()).toBe(1)
    expect(await dialog.getByRole('button', { name: 'Añadir proveedor de modelos', exact: true }).isEnabled()).toBe(true)
    await compareOrRefreshGolden(EXPECTED, await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd), webSnapshotMode())

    await dialog.getByRole('button', { name: 'Añadir proveedor de modelos', exact: true }).click()
    // Both modes stay offered beside a failed route: the card opens on the
    // third-party mode with the custom-API segment enabled.
    expect(await dialog.getByRole('tab', { name: 'API de modelos personalizada' }).isEnabled()).toBe(true)
    await dialog.getByLabel('Proveedor', { exact: true }).selectOption('minimax-cn')
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click()
    await dialog.getByText('minimax-cn guardado.', { exact: true }).waitFor()
    expect(await readFile(join(home, 'profiles', 'scaffold', 'cordis.patch.yml'), 'utf8')).toContain('minimax-cn: {}')
    expect(await dialog.getByText(FAILURE, { exact: true }).count()).toBe(1)
  })

  it('rejects an invalid edit without persisting and accepts removal of the obsolete model', async () => {
    const dialog = page.getByRole('dialog', { name: 'Configuración' })
    await dialog.getByRole('button', { name: 'Editar openrouter', exact: true }).click()
    await dialog.getByText('Configuración personalizada', { exact: true }).click()
    await dialog.getByLabel('URL base', { exact: true }).fill('https://gateway.example/v1')
    const before = await readFile(join(home, 'profiles', 'scaffold', 'cordis.patch.yml'), 'utf8')
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect.poll(() => dialog.getByText(FAILURE, { exact: true }).count()).toBe(2)
    expect(await readFile(join(home, 'profiles', 'scaffold', 'cordis.patch.yml'), 'utf8')).toBe(before)
    await dialog.getByRole('button', { name: 'Eliminar modelo 1', exact: true }).click()
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click()
    await dialog.getByText('openrouter guardado.', { exact: true }).waitFor()
    expect(await dialog.getByText(FAILURE, { exact: true }).count()).toBe(0)
    const repaired = await readFile(join(home, 'profiles', 'scaffold', 'cordis.patch.yml'), 'utf8')
    expect(repaired).not.toContain('111')
    expect(repaired).toContain('baseURL: https://gateway.example/v1')
    expect(tripwire.pageErrors).toEqual([])
  })
})
