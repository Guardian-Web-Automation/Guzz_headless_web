/**
 * Posts a Playwright run summary to Slack.
 *
 * Reads the JSON reporter output, builds a Block Kit message and sends it to
 * the incoming webhook in SLACK_WEBHOOK_URL. Never fails the job: a broken
 * notification should not mask a green (or red) test run.
 */
import { readFile } from 'node:fs/promises';

const RESULTS = process.env.RESULTS_FILE ?? 'playwright-report/results.json';
const webhook = process.env.SLACK_WEBHOOK_URL;
const brand = process.env.BRAND_NAME ?? 'Automation';
const trigger = process.env.TRIGGERED_BY ?? 'manual';
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
      durationMs: s.duration ?? 0,
      ok: (s.unexpected ?? 0) === 0,
    };
  } catch (error) {
    console.error(`Could not read ${RESULTS}: ${error.message}`);
    return null;
  }
}

function duration(ms) {
  const total = Math.round(ms / 1000);
  return total >= 60 ? `${Math.floor(total / 60)}m ${total % 60}s` : `${total}s`;
}

function buildMessage(stats) {
  if (!stats) {
    return {
      text: `:warning: ${brand} Automation Report — no results produced`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:warning: *${brand} Automation Report*\nThe run produced no results file — the suite likely failed to start.`,
          },
        },
      ],
    };
  }

  const total = stats.passed + stats.failed + stats.flaky + stats.skipped;
  const icon = stats.ok ? ':white_check_mark:' : ':x:';
  const status = stats.ok ? 'PASSED' : 'FAILED';

  const fields = [
    { type: 'mrkdwn', text: `*Status:*\n${icon} ${status}` },
    { type: 'mrkdwn', text: `*Triggered By:*\n${trigger}` },
  ];

  const counts = [
    { type: 'mrkdwn', text: `*:bar_chart: Total:*\n${total}` },
    { type: 'mrkdwn', text: `*:white_check_mark: Passed:*\n${stats.passed}` },
  ];

  if (stats.failed) {
    counts.push({ type: 'mrkdwn', text: `*:x: Failed:*\n${stats.failed}` });
  }
  if (stats.flaky) {
    counts.push({ type: 'mrkdwn', text: `*:warning: Flaky:*\n${stats.flaky}` });
  }
  if (stats.skipped) {
    counts.push({
      type: 'mrkdwn',
      text: `*:heavy_minus_sign: Skipped:*\n${stats.skipped}`,
    });
  }

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `${icon} *${brand} Automation Report*` },
    },
    { type: 'section', fields },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: ':robot_face: *Test Results Summary*' } },
    { type: 'section', fields: counts },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Duration: ${duration(stats.durationMs)}` }],
    },
  ];

  if (runUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View run' },
          url: runUrl,
        },
      ],
    });
  }

  return { text: `${icon} ${brand} Automation Report — ${status} (${stats.passed}/${total})`, blocks };
}

const stats = await readStats();
const message = buildMessage(stats);

if (!webhook) {
  console.error('SLACK_WEBHOOK_URL is not set — printing the payload instead.');
  console.log(JSON.stringify(message, null, 2));
  process.exit(0);
}

const response = await fetch(webhook, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(message),
});

if (!response.ok) {
  console.error(`Slack responded ${response.status}: ${await response.text()}`);
} else {
  console.log('Slack notification sent.');
}
