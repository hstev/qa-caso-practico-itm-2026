// Prueba básica de carga - RNF01: el sistema debe responder en < 3 s (p95) con error < 1 %
// Perfil: rampa a 20 usuarios virtuales, sostenido 1 min, rampa de bajada.
import http from 'k6/http'
import { check, group, sleep } from 'k6'

const BASE = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '15s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:search}': ['p(95)<3000'],
    'http_req_duration{endpoint:login}': ['p(95)<3000']
  }
}

export default function () {
  group('Catálogo', () => {
    const r = http.get(`${BASE}/api/Products`, { tags: { endpoint: 'products' } })
    check(r, { 'productos 200': (x) => x.status === 200 })
  })
  group('Búsqueda', () => {
    const r = http.get(`${BASE}/rest/products/search?q=juice`, { tags: { endpoint: 'search' } })
    check(r, { 'búsqueda 200': (x) => x.status === 200 })
  })
  group('Login', () => {
    const r = http.post(`${BASE}/rest/user/login`,
      JSON.stringify({ email: 'jim@juice-sh.op', password: 'ncc-1701' }),
      { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } })
    check(r, { 'login 200': (x) => x.status === 200 })
  })
  sleep(1)
}
