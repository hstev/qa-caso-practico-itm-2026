import { test, expect, APIRequestContext } from '@playwright/test'
import { str } from '../support/helpers'

// RF05 - Comentarios de clientes. Reglas (definidas en la UI de contacto):
//   calificación entre 1 y 5 estrellas; comentario obligatorio de máx. 160 caracteres.
// Se valida que el BACKEND aplique las mismas reglas (partición de equivalencia + valores límite).
async function enviarFeedback (request: APIRequestContext, comment: string, rating: number) {
  const cap = await (await request.get('/rest/captcha')).json()
  return await request.post('/api/Feedbacks', {
    data: { captchaId: cap.captchaId, captcha: String(cap.answer), comment, rating }
  })
}

test.describe('RF05 Feedback - calificación (API)', () => {
  for (const { rating, valido } of [{ rating: 0, valido: false }, { rating: 1, valido: true }, { rating: 5, valido: true }, { rating: 6, valido: false }]) {
    test(`TA-10 Calificación ${rating} => ${valido ? 'aceptada' : 'rechazada'}`, async ({ request }) => {
      const res = await enviarFeedback(request, `Prueba QA ITM rating ${rating}`, rating)
      test.info().annotations.push({ type: 'respuesta', description: `${res.status()} ${(await res.text()).slice(0, 200)}` })
      if (valido) expect(res.status()).toBe(201)
      else expect(res.status(), 'El backend debería rechazar calificaciones fuera de [1,5]').toBeGreaterThanOrEqual(400)
    })
  }
})

test.describe('RF05 Feedback - longitud del comentario (API)', () => {
  for (const { len, valido } of [{ len: 160, valido: true }, { len: 161, valido: false }]) {
    test(`TA-11 Comentario de ${len} caracteres => ${valido ? 'aceptado' : 'rechazado'}`, async ({ request }) => {
      const res = await enviarFeedback(request, str(len, 'c'), 3)
      test.info().annotations.push({ type: 'respuesta', description: `${res.status()}` })
      if (valido) expect(res.status()).toBe(201)
      else expect(res.status(), 'El backend debería rechazar comentarios > 160 caracteres').toBeGreaterThanOrEqual(400)
    })
  }
})
