#!/usr/bin/env node
/**
 * Reads a TestNG (testng-results.xml) or JUnit (Playwright junit.xml) results file
 * and posts one summary row to the Daily Automation Report Google Sheet.
 *
 * Copy to .github/scripts/report-to-sheet.mjs in each repo. No npm dependencies (Node 18+).
 *
 * Env:
 *   SHEET_WEBHOOK_URL  Apps Script web-app /exec URL (secret)
 *   SHEET_TOKEN        shared token, must match the SHEET_TOKEN script property (secret)
 *   PROJECT_NAME       e.g. "BellaVita" — must match the names in Code.gs PROJECTS
 *   RESULTS_FILE       path to testng-results.xml or junit.xml
 *   DRY_RUN=1          print the payload instead of sending it
 * GitHub's built-in GITHUB_* variables supply run number, URL, branch, commit and trigger.
 */
import fs from 'node:fs';

const env = process.env;

const decode = s => (s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, '&');

const attrs = tag => {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = decode(m[2]);
  return out;
};

const firstLine = s => decode(s).replace(/\u001b\[[0-9;]*m/g, '').trim().split('\n')[0].slice(0, 300);

function parseTestNG(xml) {
  const root = attrs((xml.match(/<testng-results\b[^>]*>/) || [''])[0]);
  const durationMs = [...xml.matchAll(/<suite\b[^>]*>/g)]
    .reduce((sum, m) => sum + Number(attrs(m[0])['duration-ms'] || 0), 0);
  const failedTests = [];
  for (const cls of xml.matchAll(/<class\b([^>]*)>([\s\S]*?)<\/class>/g)) {
    const className = attrs(cls[1]).name || '';
    for (const m of cls[2].matchAll(/<test-method\b([^>]*?)(?:\/>|>([\s\S]*?)<\/test-method>)/g)) {
      const a = attrs(m[1]);
      if (a.status !== 'FAIL' || a['is-config'] === 'true') continue;
      const msg = (m[2] || '').match(/<message>([\s\S]*?)<\/message>/);
      const exClass = ((m[2] || '').match(/<exception\b[^>]*class="([^"]*)"/) || [])[1] || '';
      failedTests.push({
        name: `${className.split('.').pop()}.${a.name}`,
        error: msg ? firstLine(msg[1]) : exClass,
      });
    }
  }
  const total = Number(root.total || 0);
  const failed = Number(root.failed || 0);
  const skipped = Number(root.skipped || 0) + Number(root.ignored || 0);
  return { total, passed: Number(root.passed ?? Math.max(total - failed - skipped, 0)), failed, skipped, durationMs, failedTests };
}

function parseJUnit(xml) {
  const root = attrs((xml.match(/<testsuites\b[^>]*>/) || xml.match(/<testsuite\b[^>]*>/) || [''])[0]);
  const failedTests = [];
  let total = 0, failed = 0, skipped = 0;
  // Playwright puts the browser project (e.g. desktop-chrome) in each <testsuite hostname="…">.
  const suites = [...xml.matchAll(/<testsuite\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testsuite>)/g)];
  for (const s of suites.length ? suites : [[xml, '', xml]]) {
    const browser = attrs(s[1]).hostname;
    for (const m of (s[2] || '').matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
      total++;
      const a = attrs(m[1]);
      const inner = m[2] || '';
      const fail = inner.match(/<(failure|error)\b([^>]*)(?:\/>|>([\s\S]*?)<\/\1>)/);
      if (fail) {
        failed++;
        failedTests.push({
          name: `${browser ? `[${browser}] ` : ''}${a.classname ? a.classname + ' › ' : ''}${a.name}`,
          // Playwright's message attr is just the test location; the real "Error: …" line is in the body.
          error: firstLine((decode(fail[3]).match(/^\s*(?:\w*Error|Timeout)\b.*$/m) || [])[0] || attrs(fail[2]).message || fail[3]),
        });
      } else if (/<skipped\b/.test(inner)) {
        skipped++;
      }
    }
  }
  if (!total) { // fall back to root counters if testcases weren't found
    total = Number(root.tests || 0);
    failed = Number(root.failures || 0) + Number(root.errors || 0);
    skipped = Number(root.skipped || 0);
  }
  return { total, passed: Math.max(total - failed - skipped, 0), failed, skipped, durationMs: Number(root.time || 0) * 1000, failedTests };
}

function parseResults(file) {
  if (!file || !fs.existsSync(file)) return null;
  const xml = fs.readFileSync(file, 'utf8');
  return /<testng-results\b/.test(xml) ? parseTestNG(xml) : parseJUnit(xml);
}

async function main() {
  const r = parseResults(env.RESULTS_FILE);
  const stats = r || { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, failedTests: [] };
  const status = !r || stats.total === 0 ? 'NO RESULTS' : stats.failed > 0 ? 'FAILED' : 'PASSED';
  const server = env.GITHUB_SERVER_URL || 'https://github.com';

  const payload = {
    token: env.SHEET_TOKEN,
    timestamp: new Date().toISOString(),
    project: env.PROJECT_NAME || env.GITHUB_REPOSITORY,
    status,
    total: stats.total,
    passed: stats.passed,
    failed: stats.failed,
    skipped: stats.skipped,
    durationMin: Math.round(stats.durationMs / 6000) / 10,
    failedTests: stats.failedTests,
    trigger: env.GITHUB_EVENT_NAME || 'local',
    branch: env.GITHUB_REF_NAME || '',
    commit: env.GITHUB_SHA || '',
    repository: env.GITHUB_REPOSITORY || 'local',
    runId: `${env.GITHUB_RUN_ID || Date.now()}-${env.GITHUB_RUN_ATTEMPT || 1}`,
    runNumber: Number(env.GITHUB_RUN_NUMBER || 0),
    runUrl: env.GITHUB_RUN_ID ? `${server}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : '',
  };

  if (env.DRY_RUN) {
    console.log(JSON.stringify({ ...payload, token: payload.token ? '***' : undefined }, null, 2));
    return;
  }
  if (!env.SHEET_WEBHOOK_URL || !env.SHEET_TOKEN) {
    console.log('::warning::SHEET_WEBHOOK_URL / SHEET_TOKEN not set — skipping Google Sheet update.');
    return;
  }

  const res = await fetch(env.SHEET_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { ok: false, error: text.slice(0, 200) }; }
  if (!body.ok) {
    console.log(`::warning::Google Sheet update failed: ${body.error}`);
  } else {
    console.log(`Google Sheet updated: ${payload.project} ${status} ${stats.passed}/${stats.total} passed.`);
  }
}

main().catch(err => console.log(`::warning::Google Sheet update failed: ${err.message}`));
