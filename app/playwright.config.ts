import { defineConfig } from '@playwright/test';

// E2E tests drive the real Expo web app in a browser. The dev server is
// started automatically; the first page load is slow because Metro bundles
// on demand, hence the generous timeouts.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:8081',
    navigationTimeout: 120_000,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
