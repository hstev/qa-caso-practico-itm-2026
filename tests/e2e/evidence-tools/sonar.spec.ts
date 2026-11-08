// Captura del dashboard de SonarQube para el informe (no es parte de la suite TA-xx)
import { test } from '@playwright/test'
const SONAR = process.env.SONAR_URL ?? 'http://sonarqube:9000'
const OUT = '/reports/sonar'
test('capturas SonarQube', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${SONAR}/sessions/new`)
  await page.locator('#login-input').fill('admin')
  await page.locator('#password-input').fill(process.env.SONAR_ADMIN_PASSWORD!)
  await page.keyboard.press('Enter')
  await page.waitForURL(/projects|dashboard/)
  const pages: Array<[string, string]> = [
    ['01-dashboard', `/dashboard?id=juice-shop-itm&codeScope=overall`],
    ['02-issues-vulnerabilidades', `/project/issues?id=juice-shop-itm&issueStatuses=OPEN%2CCONFIRMED&types=VULNERABILITY`],
    ['03-issues-bugs', `/project/issues?id=juice-shop-itm&issueStatuses=OPEN%2CCONFIRMED&types=BUG`],
    ['04-medidas', `/component_measures?id=juice-shop-itm`],
    ['05-cobertura', `/component_measures?id=juice-shop-itm&metric=coverage&view=list`],
    ['06-duplicacion', `/component_measures?id=juice-shop-itm&metric=duplicated_lines_density&view=list`]
  ]
  for (const [name, path] of pages) {
    await page.goto(SONAR + path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2500)
    for (const b of [page.getByRole('button', { name: 'Dismiss' }), page.getByRole('button', { name: /^Close|Dismiss$/ })]) {
      for (const el of await b.all()) { if (await el.isVisible()) await el.click().catch(() => {}) }
    }
    await page.addStyleTag({ content: '[role=alert], .sw-banner, [class*="Banner"] { display:none !important }' }).catch(() => {})
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  }
})
