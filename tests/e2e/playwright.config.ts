import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: '/reports/html', open: 'never' }],
    ['junit', { outputFile: '/reports/junit.xml' }],
    ['json', { outputFile: '/reports/results.json' }]
  ],
  outputDir: '/reports/artifacts',
  use: {
    baseURL,
    locale: 'es-CO',
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1366, height: 768 }
  },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    { name: 'ui-chromium', testMatch: /ui\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } }
  ]
})
