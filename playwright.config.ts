import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e', timeout: 30_000, retries: 1, reporter: [['list']],
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npm run build && npm start', url: 'http://localhost:3000', timeout: 240_000, reuseExistingServer: true },
});
