// The Host's native-onboarding setting must reach the assembled browser before its dialogs register.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  acknowledgeReloadConnectionLoss, assertFixtureInventory, captureStableAria, compareOrRefreshGolden,
  launchWebScaffold, watchConsole, webSnapshotMode, WELCOME_NOTICE_COPY, type WebScaffold,
} from './scaffold.ts'
import { openSettings, ES_BROWSER_LOCALE, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./expected/onboarding-native', import.meta.url))
const MODE = webSnapshotMode()

describe.skipIf(MODE === 'record').each([false, true])('web e2e: native credential onboarding (desktop marker: %s)', (desktop) => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({
      welcomeNoticePending: true,
      ...desktop ? {} : { extraOverlayPath: fileURLToPath(new URL('./fixtures/onboarding-native/cordis.patch.yml', import.meta.url)) },
    })
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: ES_BROWSER_LOCALE })
    // The shared menu golden uses the Linux shortcut profile on every test host.
    await page.addInitScript(() => { Object.defineProperty(navigator, 'platform', { value: 'Linux x86_64' }) })
    if (desktop) await page.addInitScript(() => { Object.defineProperty(globalThis, 'dshDesktop', { value: { protocolVersion: 1 } }) })
    tripwire = watchConsole(page)
  })

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('keeps the first-run page and Models settings free of credential writes', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-native'))
    const credentialPath = join(scaffold.harnessHome, '.credentials.yaml')
    const credentials = await readFile(credentialPath, 'utf8')
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    // The desktop shell owns its first-run flow, so the preview notice only
    // appears in the plain web shell.
    if (!desktop) {
      const welcome = page.getByRole('dialog', { name: WELCOME_NOTICE_COPY.es.title })
      await welcome.waitFor()
      await welcome.getByRole('button', { name: WELCOME_NOTICE_COPY.es.continueLabel }).click()
      await welcome.waitFor({ state: 'detached' })
    }

    for (const reload of [false, true]) {
      if (reload) {
        const warningsBefore = tripwire.warnings.length
        await page.reload({ waitUntil: 'load' })
        acknowledgeReloadConnectionLoss(tripwire, warningsBefore)
      }
      await page.getByRole('button', { name: 'Configuración', exact: true }).waitFor()
      // The fork disables the account plugin, so no signed-out account menu
      // exists in either shell; the desktop marker only changes which shell
      // owns the first run.
      expect(await page.getByRole('button', { name: 'Menú de cuenta', exact: true }).count()).toBe(0)
      await openSettings(page, 'es')
      const settings = page.getByRole('dialog', { name: 'Configuración', exact: true })
      await settings.getByRole('button', { name: 'Modelos', exact: true }).click()
      await settings.getByRole('button', { name: 'Añadir proveedor de modelos' }).waitFor({ timeout: 10_000 })
      expect(await page.getByRole('dialog', { name: 'Añade una clave de API para empezar' }).count()).toBe(0)
      expect(await readFile(credentialPath, 'utf8')).toBe(credentials)
      const aria = await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd)
      await compareOrRefreshGolden(join(SNAPSHOT_DIR, 'models.expected.md'), aria, MODE)
      await page.keyboard.press('Escape')
    }
    expect(tripwire.warnings).toEqual([])
    expect(tripwire.pageErrors).toEqual([])
    await assertFixtureInventory(SNAPSHOT_DIR, ['models.expected.md'])
  })
})
