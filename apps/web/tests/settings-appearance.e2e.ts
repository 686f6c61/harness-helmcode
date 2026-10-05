/** Built settings controls share radius and card materials across model and plugin pages. */
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium, type Locator } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import {
  compareOrRefreshGolden, launchWebScaffold, webSnapshotMode,
} from './scaffold.ts'
import { openSettings, ES_BROWSER_LOCALE } from './support.ts'

const EXPECTED = fileURLToPath(new URL('./expected/settings-appearance', import.meta.url))

/** @param element - Rendered control or card. @returns Its visible geometry and material. */
function appearance(element: Locator) {
  return element.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      radius: style.borderRadius, border: style.borderTopWidth, stroke: style.borderTopColor,
      fill: style.backgroundColor, height: Math.round(node.getBoundingClientRect().height),
    }
  })
}

it('shares settings card materials and control sizes in both palettes', async () => {
  const scaffold = await launchWebScaffold({})
  onTestFinished(() => scaffold.close())
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: ES_BROWSER_LOCALE })
  await page.addInitScript(() => { Object.defineProperty(globalThis, 'dshDesktop', { value: { protocolVersion: 1 } }) })
  await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  await openSettings(page, 'es')
  const dialog = page.getByRole('dialog', { name: '设置', exact: true })

  for (const [palette, label] of [['light', 'Claro'], ['dark', 'Oscuro']] as const) {
    await dialog.getByRole('button', { name: 'General', exact: true }).click()
    await dialog.getByRole('button', { name: label, exact: true }).click()
    await expect.poll(() => page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme'))).toBe(palette === 'dark')
    const selector = await appearance(dialog.getByRole('button', { name: 'Escritura en el espacio de trabajo', exact: true }))
    expect(selector.radius).toBe('12px')
    expect((await appearance(dialog)).radius).toBe('28px')

    await dialog.getByRole('button', { name: '内置插件', exact: true }).click()
    await dialog.getByRole('button', { name: /^全局/ }).click()
    const plugin = dialog.locator('[data-plugin-scope="global"] [data-plugin-entry]').first()
    await plugin.waitFor()
    const card = await appearance(plugin)
    expect(card.radius).toBe('20px')
    expect(card.fill).not.toBe('rgba(0, 0, 0, 0)')

    await dialog.getByRole('button', { name: 'Agent 预设', exact: true }).click()
    const preset = dialog.locator('li').first()
    await preset.waitFor()
    expect((await appearance(preset)).radius).toBe('20px')

    await dialog.getByRole('button', { name: 'Modelo', exact: true }).click()
    await dialog.getByRole('button', { name: 'Añadir proveedor de modelos', exact: true }).click()
    const field = dialog.getByLabel('Proveedor', { exact: true })
    await field.waitFor()
    expect(await appearance(field)).toMatchObject({ radius: '12px', height: 32 })
    const save = await appearance(dialog.getByRole('button', { name: 'Guardar', exact: true }))
    expect(save).toMatchObject({ radius: '12px', height: 36 })
    await compareOrRefreshGolden(join(EXPECTED, `${palette}.expected.md`),
      JSON.stringify({ card, selector, save }, null, 2), webSnapshotMode())
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  }
})
