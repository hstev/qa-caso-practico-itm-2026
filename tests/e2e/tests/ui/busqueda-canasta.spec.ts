import { test, expect } from '@playwright/test'
import { dismissOverlays, loginApi, registerUser, uniqueEmail } from '../support/helpers'

test.describe('RF03/RF04 Búsqueda y canasta (UI)', () => {
  test.beforeEach(async ({ context, baseURL }) => { await dismissOverlays(context, baseURL!) })

  test('TA-06 Búsqueda de producto existente muestra resultados', async ({ page }, testInfo) => {
    await page.goto('/#/search?q=apple')
    const tarjetas = page.locator('mat-card')
    await expect(tarjetas.first()).toBeVisible()
    await expect(page.locator('#searchValue')).toHaveText('apple')
    expect(await tarjetas.count()).toBeGreaterThan(0)
    await testInfo.attach('TA-06-busqueda', { body: await page.screenshot(), contentType: 'image/png' })
  })

  test('TA-07 Búsqueda sin coincidencias no muestra productos', async ({ page }, testInfo) => {
    await page.goto('/#/search?q=zzzproductoinexistente')
    await expect(page.locator('#searchValue')).toHaveText('zzzproductoinexistente')
    await expect(page.locator('.mdc-card.mat-mdc-card .item-name')).toHaveCount(0)
    await testInfo.attach('TA-07-busqueda-vacia', { body: await page.screenshot(), contentType: 'image/png' })
  })

  test('TA-08 Agregar producto a la canasta desde la UI', async ({ page, request }, testInfo) => {
    const email = uniqueEmail('cart'); const password = 'Itm2026*'
    await registerUser(request, email, password)
    await page.goto('/#/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#loginButton').click()
    await expect(page).toHaveURL(/#\/search/)

    await page.goto('/#/search?q=apple juice')
    await page.getByRole('button', { name: /Agregar a Carrito|Add to Basket/i }).first().click()
    await expect(page.locator('simple-snack-bar, .mat-mdc-snack-bar-label').first()).toBeVisible()
    await page.getByRole('button', { name: 'Show the shopping cart' }).click()
    await expect(page).toHaveURL(/#\/basket/)
    await expect(page.locator('mat-row').first()).toContainText(/Apple Juice/i)
    await testInfo.attach('TA-08-canasta', { body: await page.screenshot(), contentType: 'image/png' })
  })
})
