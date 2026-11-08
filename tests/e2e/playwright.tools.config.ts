import { defineConfig, devices } from '@playwright/test'
export default defineConfig({ testDir: './evidence-tools', workers: 1, reporter: [['list']], outputDir: '/tmp/pw-tools', use: { ...devices['Desktop Chrome'], locale: 'es-CO' } })
