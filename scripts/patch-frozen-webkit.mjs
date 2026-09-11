/**
 * Playwright 1.63 expects WebKit revision 2359, but on macOS 14 it can only
 * install the frozen 2251 build. That build has no `PushAPIEnabled` setting,
 * so every `newPage()` dies with:
 *
 *   Protocol error (Page.overrideSetting): Unknown setting: PushAPIEnabled
 *
 * killing the whole mobile-safari project locally. The call is a best-effort
 * default, not something any test depends on, so this makes it non-fatal.
 * Newer WebKit builds (CI runs Linux) still receive it exactly as before.
 *
 * Runs on postinstall so a fresh `npm ci` is not left broken.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// `exports` in playwright-core's package.json hides lib/, so resolve the
// package root through its entry point and walk to the bundle by hand.
const bundle = path.join(
  path.dirname(require.resolve('playwright-core')),
  'lib',
  'coreBundle.js',
);

if (!existsSync(bundle)) {
  console.log(
    'frozen-webkit patch: playwright-core bundle not found (skipped)',
  );
  process.exit(0);
}

const NEEDLE =
  'promises2.push(session2.send("Page.overrideSetting", { setting: "PushAPIEnabled", value: !contextOptions.isMobile }));';
const PATCHED =
  'promises2.push(session2.send("Page.overrideSetting", { setting: "PushAPIEnabled", value: !contextOptions.isMobile }).catch(() => {}));';

const source = readFileSync(bundle, 'utf8');

if (source.includes(PATCHED)) {
  console.log('frozen-webkit patch: already applied');
} else if (source.includes(NEEDLE)) {
  writeFileSync(bundle, source.replace(NEEDLE, PATCHED));
  console.log('frozen-webkit patch: applied');
} else {
  // Playwright changed the call; the patch is stale but nothing is broken.
  console.log('frozen-webkit patch: nothing to patch (skipped)');
}
