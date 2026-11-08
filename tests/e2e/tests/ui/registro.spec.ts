import { test, expect } from '@playwright/test'
import { dismissOverlays, str, uniqueEmail } from '../support/helpers'

// RF02 - Registro de usuarios. Regla: contraseña entre 5 y 40 caracteres.
// Valores límite: 4 (inválido), 5 (válido), 40 (válido), 41 (inválido)
const casos = [
  { len: 4, valido: false },
  { len: 5, valido: true },
  { len: 40, valido: true },
  { len: 41, valido: false }
]

test.describe('RF02 Registro - valores límite de contraseña (UI)', () => {
  test.beforeEach(async ({ context, baseURL }) => { await dismissOverlays(context, baseURL!) })

  for (const c of casos) {
    test(`TA-04 Contraseña de ${c.len} caracteres => ${c.valido ? 'aceptada' : 'rechazada'}`, async ({ page }, testInfo) => {
      await page.goto('/#/register')
      const pwd = str(c.len, 'x')
      await page.locator('#emailControl').fill(uniqueEmail('reg'))
      await page.locator('#passwordControl').fill(pwd)
      await page.locator('#repeatPasswordControl').fill(pwd)
      await page.locator('#securityQuestionControl').click()
      await page.getByRole('option').first().click()
      await page.locator('#securityAnswerControl').fill('itm')

      const boton = page.locator('#registerButton')
      if (c.valido) {
        await expect(boton).toBeEnabled()
      } else {
        await expect(boton).toBeDisabled()
        await expect(page.locator('mat-error').first()).toBeVisible()
      }
      await testInfo.attach(`TA-04-pwd-${c.len}`, { body: await page.screenshot(), contentType: 'image/png' })
    })
  }

  test('TA-05 Registro completo de usuario nuevo (flujo feliz)', async ({ page }, testInfo) => {
    await page.goto('/#/register')
    await page.locator('#emailControl').fill(uniqueEmail('flujo'))
    await page.locator('#passwordControl').fill('Itm2026*')
    await page.locator('#repeatPasswordControl').fill('Itm2026*')
    await page.locator('#securityQuestionControl').click()
    await page.getByRole('option').first().click()
    await page.locator('#securityAnswerControl').fill('itm')
    await page.locator('#registerButton').click()
    await expect(page).toHaveURL(/#\/login/)
    await testInfo.attach('TA-05-registro-ok', { body: await page.screenshot(), contentType: 'image/png' })
  })
})
