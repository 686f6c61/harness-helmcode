/** Throwaway probe: plugins panel header actions and bundle rows. Not committed. */
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { launchWebScaffold } from './scaffold.ts'
import { ES_BROWSER_LOCALE } from './support.ts'

describe('probe plugins panel', () => {
  let scaffold: Awaited<ReturnType<typeof launchWebScaffold>>
  beforeAll(async () => {
    scaffold = await launchWebScaffold({
      extraOverlayPath: undefined,
    })
  }, 120_000)
  afterAll(async () => { await scaffold?.close() })

  it('dumps', async () => {
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ES_BROWSER_LOCALE })
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await page.getByRole('navigation', { name: 'Paneles globales' }).getByRole('button', { name: 'Plugins', exact: true }).click()
    await page.waitForTimeout(2000)
    const panel = page.locator('[data-plugin-panel]')
    const headerButtons = panel.locator(':scope > header button')
    for (const btn of await headerButtons.all()) {
      console.log('=== HEADER BUTTON:', JSON.stringify(await btn.textContent()), 'label:', JSON.stringify(await btn.getAttribute('aria-label')), 'disabled:', await btn.isDisabled())
    }
    const rows = panel.locator('[data-plugin-group="bundles"] [data-plugin-row]')
    console.log('=== BUNDLE ROWS:', await rows.count())
    for (const row of await rows.all()) {
      console.log('=== ROW:', JSON.stringify((await row.textContent())?.slice(0, 80)))
    }
    await browser.close()
  }, 120_000)
})
