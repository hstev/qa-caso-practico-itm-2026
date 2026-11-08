import { APIRequestContext, BrowserContext, expect } from '@playwright/test'

/** Genera un correo único para no depender del estado previo de la base de datos. */
export const uniqueEmail = (prefix = 'qa') =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@itm-qa.test`

/** Cadena de longitud exacta (útil para valores límite). */
export const str = (len: number, ch = 'a') => ch.repeat(len)

/** Registra un usuario por la API pública /api/Users. */
export async function registerUser (request: APIRequestContext, email: string, password: string) {
  return await request.post('/api/Users', {
    data: {
      email,
      password,
      passwordRepeat: password,
      securityQuestion: { id: 1, question: 'Your eldest siblings middle name?' },
      securityAnswer: 'itm'
    }
  })
}

/** Inicia sesión por API y devuelve token + id de canasta. */
export async function loginApi (request: APIRequestContext, email: string, password: string) {
  const res = await request.post('/rest/user/login', { data: { email, password } })
  expect(res.status(), await res.text()).toBe(200)
  const body = await res.json()
  return { token: body.authentication.token as string, bid: body.authentication.bid as number }
}

/** Oculta banner de bienvenida y aviso de cookies para que no interfieran con la UI. */
export async function dismissOverlays (context: BrowserContext, baseURL: string) {
  const url = new URL(baseURL)
  await context.addCookies([
    { name: 'welcomebanner_status', value: 'dismiss', domain: url.hostname, path: '/' },
    { name: 'cookieconsent_status', value: 'dismiss', domain: url.hostname, path: '/' },
    { name: 'language', value: 'es_ES', domain: url.hostname, path: '/' }
  ])
}
