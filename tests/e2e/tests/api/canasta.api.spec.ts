import { test, expect } from '@playwright/test'
import { loginApi, registerUser, uniqueEmail } from '../support/helpers'

// RF04 - Límite de compra: Apple Juice (id 1) permite máx. 5 unidades por usuario (limitPerUser: 5)
// Valores límite: 1, 5 (válidos) / 6 (inválido)
test.describe('RF04 Canasta - valores límite de cantidad (API)', () => {
  for (const { qty, esperado } of [{ qty: 1, esperado: 200 }, { qty: 5, esperado: 200 }, { qty: 6, esperado: 400 }]) {
    test(`TA-09 Cantidad ${qty} de Apple Juice => HTTP ${esperado}`, async ({ request }) => {
      const email = uniqueEmail('qty'); const password = 'Itm2026*'
      await registerUser(request, email, password)
      const { token, bid } = await loginApi(request, email, password)
      const headers = { Authorization: `Bearer ${token}` }

      const add = await request.post('/api/BasketItems', { headers, data: { ProductId: 1, BasketId: String(bid), quantity: 1 } })
      expect(add.status()).toBe(200)
      const itemId = (await add.json()).data.id

      const upd = await request.put(`/api/BasketItems/${itemId}`, { headers, data: { quantity: qty } })
      test.info().annotations.push({ type: 'respuesta', description: `${upd.status()} ${await upd.text()}` })
      expect(upd.status()).toBe(esperado)
    })
  }
})
