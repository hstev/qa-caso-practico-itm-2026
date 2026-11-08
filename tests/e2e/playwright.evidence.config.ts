// Configuración SOLO para capturar evidencias (capturas) de los casos de prueba MANUALES CP-xx.
// No forma parte de la suite automatizada TA-xx.
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './evidence',
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  outputDir: '/reports/evidence-artifacts',
  use: { ...devices['Desktop Chrome'], baseURL: process.env.BASE_URL ?? 'http://localhost:3000', viewport: { width: 1366, height: 768 }, locale: 'es-CO' }
})
