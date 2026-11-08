// Renderiza los diagramas HTML del informe a PNG (no es parte de la suite TA-xx)
import { test } from '@playwright/test'
import * as fs from 'fs'
test('diagramas', async ({ page }) => {
  for (const f of fs.readdirSync('/diagramas/src').filter(x => x.endsWith('.html'))) {
    await page.setViewportSize({ width: 1400, height: 800 })
    await page.goto('file:///diagramas/src/' + f)
    const deco = f.startsWith('deco')
    if (deco) await page.setViewportSize({ width: 900, height: 760 })
    await (deco ? page : page.locator('body')).screenshot({ path: `/diagramas/${f.replace('.html', '.png')}`, omitBackground: deco })
  }
})
