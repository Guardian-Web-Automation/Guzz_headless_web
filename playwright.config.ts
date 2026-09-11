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
    ['line'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    // In CI: failure annotations in the Actions UI, JUnit for the artifact,
    // and JSON for the Slack summary.
    ...(process.env.CI
      ? ([
          ['github'],
          ['junit', { outputFile: 'results/junit.xml' }],
          ['json', { outputFile: 'results/results.json' }],
        ] as const)
      : []),
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
  // The same specs run on all three: the page objects pick whichever
  // control the viewport is showing (header nav vs hamburger drawer, sort
  // dropdown vs sort drawer, inline CTAs vs sticky bar).
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
});
