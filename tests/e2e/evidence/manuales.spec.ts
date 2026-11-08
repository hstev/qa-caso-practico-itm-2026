import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import { dismissOverlays, loginApi, registerUser, uniqueEmail, str } from '../tests/support/helpers'

const OUT = '/reports/manual'
fs.mkdirSync(OUT, { recursive: true })
const obs: Record<string, string> = {}
const shot = async (page: Page, name: string) => { await page.screenshot({ path: `${OUT}/${name}.png` }) }
const note = (id: string, text: string) => { obs[id] = (obs[id] ? obs[id] + ' | ' : '') + text }

test.afterAll(() => {
  const file = `${OUT}/observaciones.json`
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...obs }, null, 2))
})

test.beforeEach(async ({ context, baseURL }) => { await dismissOverlays(context, baseURL!) })

async function loginUi (page: Page, email: string, password: string) {
  await page.goto('/#/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#loginButton').click()
  await expect(page).toHaveURL(/#\/search/)
}

test('CP-01 login válido', async ({ page, request }) => {
  const email = uniqueEmail('cp01'); await registerUser(request, email, 'Itm2026*')
  await page.goto('/#/login'); await page.locator('#email').fill(email); await page.locator('#password').fill('Itm2026*')
  await shot(page, 'CP-01-a-datos')
  await page.locator('#loginButton').click(); await expect(page).toHaveURL(/#\/search/)
  await page.locator('#navbarAccount').click(); await shot(page, 'CP-01-b-sesion-iniciada')
  note('CP-01', `Redirige a /search y el menú de cuenta muestra ${email}`)
})

test('CP-02 login email con formato inválido', async ({ page }) => {
  await page.goto('/#/login'); await page.locator('#email').fill('usuario.itm'); await page.locator('#password').fill('Itm2026*')
  await page.locator('#loginButton').click(); await page.waitForTimeout(800)
  await shot(page, 'CP-02-login-email-invalido')
  note('CP-02', `Mensaje: "${(await page.locator('.error').textContent())?.trim()}"; permanece en /login`)
})

async function llenarRegistro (page: Page, email: string, p1: string, p2: string) {
  await page.goto('/#/register')
  await page.locator('#emailControl').fill(email)
  await page.locator('#passwordControl').fill(p1)
  await page.locator('#repeatPasswordControl').fill(p2)
  await page.locator('#securityQuestionControl').click(); await page.getByRole('option').first().click()
  await page.locator('#securityAnswerControl').fill('itm')
  await page.locator('#emailControl').click()
}

test('CP-03 registro contraseñas no coinciden', async ({ page }) => {
  await llenarRegistro(page, uniqueEmail('cp03'), 'Itm2026*', 'Itm2026#')
  await shot(page, 'CP-03-registro-no-coinciden')
  note('CP-03', `Botón Registrar ${await page.locator('#registerButton').isDisabled() ? 'deshabilitado' : 'HABILITADO'}; errores: ${(await page.locator('mat-error').allTextContents()).join(' / ')}`)
})

test('CP-04 registro email inválido', async ({ page }) => {
  await llenarRegistro(page, 'correo@', 'Itm2026*', 'Itm2026*')
  await shot(page, 'CP-04-registro-email-invalido')
  note('CP-04', `Botón Registrar ${await page.locator('#registerButton').isDisabled() ? 'deshabilitado' : 'HABILITADO'}; errores: ${(await page.locator('mat-error').allTextContents()).join(' / ')}`)
})

test('CP-05 feedback longitud comentario 159/160/161', async ({ page }) => {
  await page.goto('/#/contact')
  for (const n of [159, 160, 161]) {
    await page.locator('#comment').fill('')
    await page.locator('#comment').pressSequentially(str(n, 'c'), { delay: 0 })
    const len = (await page.locator('#comment').inputValue()).length
    note('CP-05', `Escritos ${n} => aceptados ${len}`)
  }
  await shot(page, 'CP-05-feedback-161')
})

test('CP-06 feedback sin calificación', async ({ page }) => {
  await page.goto('/#/contact')
  await page.locator('#comment').fill('Excelente servicio - prueba QA ITM')
  await expect(page.locator('#captcha')).toHaveText(/\d/)
  const cap = (await page.locator('#captcha').textContent())!.trim()
  // eslint-disable-next-line no-new-func
  await page.locator('#captchaControl').fill(String(new Function(`return (${cap.replace(/[^\d+\-*]/g, '')})`)()))
  const sinRating = await page.locator('#submitButton').isDisabled()
  await shot(page, 'CP-06-a-sin-calificacion')
  const slider = page.getByRole('slider').first()
  await slider.focus(); await page.keyboard.press('End'); await page.waitForTimeout(300)
  await shot(page, 'CP-06-b-calificacion-5')
  const conRating = await page.locator('#submitButton').isDisabled()
  if (!conRating) { await page.locator('#submitButton').click(); await page.waitForTimeout(800) }
  await shot(page, 'CP-06-c-enviado')
  note('CP-06', `Sin calificación botón deshabilitado=${sinRating}; con 5 estrellas deshabilitado=${conRating}; ${conRating ? 'no se pudo enviar' : 'feedback enviado'}`)
})

test('CP-07 canasta límite 5 unidades', async ({ page, request }) => {
  const email = uniqueEmail('cp07'); await registerUser(request, email, 'Itm2026*')
  // Precondición: Apple Juice (1000ml) (ProductId 1, limitPerUser 5) con 1 unidad en la canasta
  const { token, bid } = await loginApi(request, email, 'Itm2026*')
  await request.post('/api/BasketItems', { headers: { Authorization: `Bearer ${token}` }, data: { ProductId: 1, BasketId: String(bid), quantity: 1 } })
  await loginUi(page, email, 'Itm2026*')
  await page.getByRole('button', { name: 'Show the shopping cart' }).click()
  await expect(page.locator('mat-row').first()).toContainText(/Apple Juice \(1000ml\)|Jugo de manzana \(1000ml\)/)
  const mas = page.locator('mat-row').first().locator('button').nth(1)
  for (let i = 0; i < 5; i++) { await mas.click(); await page.waitForTimeout(500) }
  await shot(page, 'CP-07-canasta-limite')
  const qty = (await page.locator('mat-row').first().textContent())?.replace(/\s+/g, ' ')
  const msg = (await page.locator('.confirmation, .error, simple-snack-bar, .mat-mdc-snack-bar-label').allTextContents()).join(' ').trim()
  note('CP-07', `Fila: ${qty}; mensaje: "${msg}"`)
})

test('CP-08 dirección teléfono valores límite', async ({ page, request }) => {
  const email = uniqueEmail('cp08'); await registerUser(request, email, 'Itm2026*')
  await loginUi(page, email, 'Itm2026*')
  await page.goto('/#/address/create')
  const inputs = page.locator('#address-form input')
  await inputs.nth(0).fill('Colombia'); await inputs.nth(1).fill('QA ITM')
  await inputs.nth(3).fill('050001'); await page.locator('#address').fill('Calle 73 # 76A-354'); await inputs.nth(4).fill('Medellín')
  for (const v of ['1111110', '1111111', '9999999999', '10000000000']) {
    await inputs.nth(2).fill(v); await inputs.nth(0).click()
    const dis = await page.locator('#submitButton').isDisabled()
    note('CP-08', `${v} => ${dis ? 'rechazado' : 'aceptado'}`)
    await shot(page, `CP-08-telefono-${v}`)
  }
})

test('CP-09 dirección código postal 8/9', async ({ page, request }) => {
  const email = uniqueEmail('cp09'); await registerUser(request, email, 'Itm2026*')
  await loginUi(page, email, 'Itm2026*')
  await page.goto('/#/address/create')
  const inputs = page.locator('#address-form input')
  await inputs.nth(0).fill('Colombia'); await inputs.nth(1).fill('QA ITM'); await inputs.nth(2).fill('3001234567')
  await page.locator('#address').fill('Calle 73 # 76A-354'); await inputs.nth(4).fill('Medellín')
  const pin = inputs.nth(3)
  for (const v of ['12345678', '123456789']) {
    await pin.fill(''); await pin.pressSequentially(v)
    await inputs.nth(0).click()
    note('CP-09', `Escrito ${v.length} => valor ${(await pin.inputValue()).length} car.; botón ${await page.locator('#submitButton').isDisabled() ? 'deshabilitado' : 'habilitado'}`)
    await shot(page, `CP-09-zip-${v.length}`)
  }
})

test('CP-10 búsqueda con carga XSS', async ({ page }) => {
  let dialog = ''
  page.on('dialog', async d => { dialog = d.message(); await d.dismiss() })
  await page.goto('/#/search?q=' + encodeURIComponent('<iframe src="javascript:alert(`XSS-ITM`)">'))
  await page.waitForTimeout(1500)
  await shot(page, 'CP-10-xss-busqueda')
  note('CP-10', dialog ? `Se ejecutó JavaScript inyectado: alert("${dialog}") => DOM XSS` : 'No se ejecutó el script')
})

test('CP-11 directorio /ftp expuesto', async ({ page }) => {
  await page.goto('/ftp'); await shot(page, 'CP-11-ftp')
  const items = await page.locator('a').allTextContents()
  note('CP-11', `Listado público con ${items.length} entradas: ${items.slice(0, 8).join(', ')}`)
})

test('CP-12 usabilidad móvil e idioma', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/#/search'); await page.waitForTimeout(1200)
  await shot(page, 'CP-12-movil')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  note('CP-12', `Vista 375px: desbordamiento horizontal=${overflow}; menú hamburguesa visible=${await page.getByRole('button', { name: 'Open Sidenav' }).isVisible()}; textos en español=${await page.getByText(/Todos los productos|Agregar a Carrito/).first().isVisible()}`)
})
