import { test, expect } from '@playwright/test'
import { registerUser, str, uniqueEmail } from '../support/helpers'

test.describe('RNF02 Seguridad (API)', () => {
  test('TA-12 Login resiste inyección SQL (A03:2021 Injection)', async ({ request }) => {
    const res = await request.post('/rest/user/login', { data: { email: "' OR 1=1--", password: 'cualquiera' } })
    test.info().annotations.push({ type: 'respuesta', description: `${res.status()} ${(await res.text()).slice(0, 120)}` })
    expect(res.status(), 'Una inyección SQL no debe autenticar al usuario').toBe(401)
  })

  test('TA-13 Backend rechaza contraseña de 4 caracteres (validación del lado servidor)', async ({ request }) => {
    const res = await registerUser(request, uniqueEmail('pwd4'), str(4, 'x'))
    test.info().annotations.push({ type: 'respuesta', description: `${res.status()}` })
    expect(res.status(), 'El servidor debe aplicar la misma regla 5..40 que la UI').toBeGreaterThanOrEqual(400)
  })

  test('TA-14 Endpoint administrativo requiere autenticación', async ({ request }) => {
    const res = await request.get('/api/Users')
    expect(res.status()).toBe(401)
  })
})

test.describe('RNF01 Rendimiento (API)', () => {
  test('TA-15 Búsqueda de productos responde en menos de 3 s', async ({ request }) => {
    const t0 = Date.now()
    const res = await request.get('/rest/products/search?q=juice')
    const ms = Date.now() - t0
    test.info().annotations.push({ type: 'tiempo_ms', description: String(ms) })
    expect(res.status()).toBe(200)
    expect(ms).toBeLessThan(3000)
  })
})
