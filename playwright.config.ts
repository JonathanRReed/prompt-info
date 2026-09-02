import { defineConfig, devices } from '@playwright/test';

// Override with PREVIEW_PORT when 4173 is taken (reuseExistingServer would
// otherwise silently run the suite against whatever is squatting the port).
const previewPort = Number(process.env.PREVIEW_PORT ?? 4173);
const previewUrl = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',
  use: {
    baseURL: previewUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `bun run build && bunx wrangler pages dev out --port ${previewPort} --compatibility-date=2026-08-04`,
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
