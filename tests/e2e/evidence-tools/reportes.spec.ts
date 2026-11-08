// Captura de reportes (Playwright HTML, k6, ZAP) como imágenes de evidencia para el informe
import { test } from '@playwright/test'
import * as fs from 'fs'
const R = '/r'            // carpeta reports/ montada
const OUT = '/r/capturas'
test.beforeAll(() => { fs.mkdirSync(OUT, { recursive: true }) })

const terminal = (title: string, text: string) => `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0f1724;color:#e6edf3;font:13px/1.45 'DejaVu Sans Mono',monospace;padding:18px 22px;width:1100px">
<div style="color:#56ACDE;font-weight:bold;margin-bottom:8px">$ ${title}</div><pre style="margin:0;white-space:pre-wrap">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body>`

test('playwright html report', async ({ page }) => {
  test.skip(!fs.existsSync(`${R}/playwright/html/index.html`))
  await page.setViewportSize({ width: 1300, height: 900 })
  await page.goto(`file://${R}/playwright/html/index.html`)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/playwright-resumen.png`, fullPage: true })
  await page.getByText('TA-12 Login resiste inyección SQL').first().click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/playwright-TA-12-detalle.png` })
  await page.goto(`file://${R}/playwright/html/index.html`)
  await page.getByText('TA-10 Calificación 6').first().click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/playwright-TA-10-detalle.png` })
})

test('terminales', async ({ page }) => {
  await page.setViewportSize({ width: 1144, height: 400 })
  const items: Array<[string, string, string, number?]> = [
    ['k6-salida', 'docker compose --profile tools run --rm k6 run /scripts/carga-basica.js', `${R}/k6/k6-output.txt`],
    ['k6-estres-salida', 'docker compose --profile tools run --rm k6 run /scripts/estres.js', `${R}/k6/k6-estres-output.txt`],
    ['playwright-consola', 'docker compose --profile tools run --rm playwright npx playwright test', `${R}/playwright/ejecucion.log`],
    ['unit-servidor', 'nyc npm run test:server   # pruebas unitarias del servidor Juice Shop', `${R}/evidence/server-unit-tests.log`],
    ['juice-shop-oom', 'docker logs qa-itm-juice-shop-1   # caída durante escaneo activo ZAP', `${R}/evidence/juice-shop-oom-crash.log`]
  ]
  for (const [name, cmd, file] of items) {
    if (!fs.existsSync(file)) continue
    let txt = fs.readFileSync(file, 'utf8').replace(/\x1b\[[0-9;]*m/g, '')
    if (name === 'playwright-consola') txt = txt.split('\n').filter(l => /✓|✘|passed|failed|Running/.test(l)).map(l => l.replace(/ › tests\//, ' › ').slice(0, 150)).join('\n')
    if (name === 'k6-salida' || name === 'k6-estres-salida') txt = txt.split('\n').slice(-48).join('\n')
    if (name === 'unit-servidor') txt = txt.split('\n').slice(-16).join('\n')
    if (name === 'juice-shop-oom') { const l = txt.split('\n'); const i = l.findIndex(x => /FATAL ERROR/.test(x)); txt = l.slice(Math.max(0, i - 6), i + 6).concat(l.slice(-1)).join('\n') }
    await page.setContent(terminal(cmd, txt))
    await page.locator('body').screenshot({ path: `${OUT}/${name}.png` })
  }
})

test('zap reportes', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 1000 })
  for (const f of ['zap-baseline', 'zap-full-report']) {
    const p = `${R}/zap/${f}.html`
    if (!fs.existsSync(p)) continue
    await page.goto(`file://${p}`)
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${f}.png` })
  }
})
