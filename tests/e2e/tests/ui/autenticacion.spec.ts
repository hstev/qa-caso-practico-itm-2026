import { test, expect } from '@playwright/test'
import { dismissOverlays, loginApi, registerUser, uniqueEmail } from '../support/helpers'

// RF01 - Autenticación de usuarios
test.describe('RF01 Autenticación (UI)', () => {
  test.beforeEach(async ({ context, baseURL }) => { await dismissOverlays(context, baseURL!) })

  test('TA-01 Inicio de sesión exitoso con credenciales válidas', async ({ page, request }, testInfo) => {
    const email = uniqueEmail('login')
    const password = 'Itm2026*'
    expect((await registerUser(request, email, password)).status()).toBe(201)

    await page.goto('/#/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#loginButton').click()

    await expect(page).toHaveURL(/#\/search/)
    await page.locator('#navbarAccount').click()
    await expect(page.getByRole('menu')).toContainText(email)
    await testInfo.attach('TA-01-login-ok', { body: await page.screenshot(), contentType: 'image/png' })
  })

  test('TA-02 Inicio de sesión rechazado con contraseña incorrecta (clase inválida)', async ({ page }, testInfo) => {
    await page.goto('/#/login')
    await page.locator('#email').fill('no.existe@itm-qa.test')
    await page.locator('#password').fill('incorrecta')
    await page.locator('#loginButton').click()

    const error = page.locator('.error')
    await expect(error).toBeVisible()
    await expect(page).toHaveURL(/#\/login/)
    await testInfo.attach('TA-02-login-fallido', { body: await page.screenshot(), contentType: 'image/png' })
  })

  test('TA-03 Botón de login deshabilitado con campos vacíos (clase inválida)', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page.locator('#loginButton')).toBeDisabled()
    await page.locator('#email').fill('usuario@itm-qa.test')
    await expect(page.locator('#loginButton')).toBeDisabled()
  })
})
