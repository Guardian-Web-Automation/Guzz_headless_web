/**
 * Posts a Playwright run summary to Slack, in the same format the other
 * Guardian automation repos use.
 *
 * Counts come from the JSON reporter rather than parsing the JUnit XML:
 * the JSON report also distinguishes flaky runs, and it needs no regex over
 * markup. Falls back to the job status when no results file exists (an
 * earlier step failed before the suite ran).
 *
 * Never fails the job — a broken notification must not mask the result.
 */
import { readFile, writeFile } from 'node:fs/promises';

const RESULTS = process.env.RESULTS_FILE ?? 'results/results.json';
const webhook = process.env.SLACK_WEBHOOK_URL;
const brand = process.env.BRAND_NAME ?? 'GUZZ';
const suiteName = process.env.SUITE_NAME ?? `${brand} Automation Report`;
const footer = process.env.SUITE_FOOTER ?? `${brand} Headless | Playwright + TypeScript`;
const event = process.env.EVENT ?? 'manual';
const jobStatus = process.env.JOB_STATUS ?? 'unknown';
const runUrl = process.env.RUN_URL;

async function readStats() {
  try {
    const report = JSON.parse(await readFile(RESULTS, 'utf8'));
    const s = report.stats ?? {};

    return {
      passed: s.expected ?? 0,
      failed: s.unexpected ?? 0,
      flaky: s.flaky ?? 0,
      skipped: s.skipped ?? 0,
      hasResults: true,
    };
  } catch {
    // No results file: the suite never produced one.
    return { passed: 0, failed: 0, flaky: 0, skipped: 0, hasResults: false };
  }
}

const stats = await readStats();
const total = stats.passed + stats.failed + stats.flaky + stats.skipped;
const ok = stats.hasResults && jobStatus === 'success' && stats.failed === 0;
const emoji = ok ? '✅' : '❌';
const statusText = stats.hasResults ? (ok ? 'PASSED' : 'FAILED') : 'NO RESULTS';

const summaryFields = [
  { type: 'mrkdwn', text: `*📊 Total:*\n${total}` },
  { type: 'mrkdwn', text: `*✅ Passed:*\n${stats.passed}` },
];

const detailFields = [
  { type: 'mrkdwn', text: `*❌ Failed:*\n${stats.failed}` },
  { type: 'mrkdwn', text: `*⚠️ Skipped:*\n${stats.skipped}` },
];

if (stats.flaky) {
  detailFields.push({ type: 'mrkdwn', text: `*🔁 Flaky:*\n${stats.flaky}` });
}

const payload = {
  attachments: [
    {
      color: ok ? '#36a64f' : '#ff0000',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${emoji} ${suiteName}` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Status:*\n${emoji} ${statusText}` },
            { type: 'mrkdwn', text: `*Triggered By:*\n${event}` },
          ],
        },
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: '*🤖 Test Results Summary*' } },
        { type: 'section', fields: summaryFields },
        { type: 'section', fields: detailFields },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📄 Full report & artifacts:*\n<${runUrl}|Open the GitHub Actions run>`,
          },
        },
        { type: 'context', elements: [{ type: 'mrkdwn', text: footer }] },
      ],
    },
  ],
};

if (!webhook) {
  console.error('SLACK_WEBHOOK_URL is not set — writing the payload instead.');
  await writeFile('slack-payload.json', JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const response = await fetch(webhook, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});

console.log(
  response.ok
    ? 'Slack notification sent.'
    : `Slack responded ${response.status}: ${await response.text()}`,
);
