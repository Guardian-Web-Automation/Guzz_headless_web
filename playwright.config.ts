import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { brand } from './src/brand.config';

/**
 * Artifacts (screenshots, videos, traces) are written to a temp directory
 * outside the repo and then copied into the HTML report by the reporter, so
 * the project stays clean and results are read from `npm run report` only.
 */
const artifactsDir = path.join(
  os.tmpdir(),
  'playwright-artifacts',
  brand.name.toLowerCase(),
);

export default defineConfig({
  testDir: './tests',
  outputDir: artifactsDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    // Machine-readable totals for the Slack report.
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['line'],
  ],
  // The product grid loads in batches as it scrolls and several pages wait
  // on third-party widgets, so Playwright's 30s default budget is too tight
  // here — tests were being killed mid-assertion and read as flaky.
  timeout: 120_000,
  use: {
    baseURL: brand.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  expect: { timeout: 15_000 },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
