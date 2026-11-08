// Prueba de estrés/estabilidad: rampa hasta 150 usuarios virtuales para observar degradación.
import http from 'k6/http'
import { check, sleep } from 'k6'
const BASE = __ENV.BASE_URL || 'http://localhost:3000'
export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 150 },
    { duration: '15s', target: 0 }
  ],
  thresholds: { http_req_duration: ['p(95)<3000'], http_req_failed: ['rate<0.01'] }
}
export default function () {
  const r1 = http.get(`${BASE}/rest/products/search?q=juice`, { tags: { endpoint: 'search' } })
  check(r1, { 'búsqueda 200': (x) => x.status === 200 })
  const r2 = http.post(`${BASE}/rest/user/login`, JSON.stringify({ email: 'jim@juice-sh.op', password: 'ncc-1701' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } })
  check(r2, { 'login 200': (x) => x.status === 200 })
  sleep(0.5)
}
