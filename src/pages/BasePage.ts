/**
 * Shared base for every page object and component.
 *
 * Brand-agnostic: holds no selector, path or label of its own.
 */
import { expect, Locator, Page } from '@playwright/test';
import { brand } from '../brand.config';

/** Escapes a plain string so it can be used inside a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `"₹1,399"` -> `1399`. Handles ₹, Rs., commas and stray whitespace. */
export function parsePrice(text: string): number {
  const value = Number(text.replace(/Rs\.?/gi, '').replace(/[^0-9.]/g, ''));

  if (!Number.isFinite(value) || text.trim() === '') {
    throw new Error(`Unable to parse price: "${text}"`);
  }

  return value;
}

/** `"-25% OFF"` -> `25`. */
export function parsePercent(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);

  if (!match) {
    throw new Error(`Unable to parse percentage: "${text}"`);
  }

  return Number(match[1]);
}

export function discountPercent(comparePrice: number, price: number): number {
  if (comparePrice <= 0) {
    throw new Error('Compare-at price must be greater than zero');
  }

  return ((comparePrice - price) / comparePrice) * 100;
}

/**
 * Current scroll offset, read only once it has stopped moving.
 *
 * Opening the cart drawer locks body scroll and closing it restores the
 * position; on mobile WebKit that restore is animated, so an immediate read
 * catches the page mid-flight and reports a position the shopper never
 * actually saw. Two equal reads in a row mean the page has settled.
 */
export async function settledScrollY(page: Page): Promise<number> {
  // Wait for the scroll lock to be released first. While a drawer is open
  // the storefront pins <body> with `position: fixed`, and `window.scrollY`
  // then reads 0 no matter where the shopper actually is — a value stable
  // enough to fool the loop below, which is how a page sitting at 1756
  // reported a scroll delta of 1756 rather than 0.
  await expect
    .poll(
      async () => page.evaluate(() => getComputedStyle(document.body).position),
      { timeout: 20_000 },
    )
    .not.toBe('fixed');

  let previous = -1;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await page.evaluate(() => Math.round(window.scrollY));

    if (current === previous) {
      return current;
    }

    previous = current;
    await page.waitForTimeout(150);
  }

  return previous;
}

/**
 * Loads a URL and returns its HTTP status.
 *
 * Uses a real navigation rather than a bare API request: that is what the
 * test cases describe, and the storefront intermittently resets plain
 * requests under load. Transient connection errors are retried.
 */
export async function loadStatus(page: Page, url: string): Promise<number> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

      if (response) {
        return response.status();
      }

      throw new Error(`No response received for ${url}`);
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1_000);
    }
  }

  throw lastError;
}

/**
 * Whether a failed navigation is the storefront misbehaving rather than a
 * real problem with the page.
 *
 * Two transient shapes show up against this site: it cancels its own first
 * navigation, which Playwright reports as ERR_ABORTED in well under a
 * second, and it stalls one, where the document arrives but a third-party
 * script never settles so `load` never fires. Both clear on another
 * attempt — a retry after a 45s stall has been seen to finish in 4.5s.
 *
 * Repeating a navigation is safe precisely because it changes nothing.
 */
function isTransientNavigation(error: unknown): boolean {
  const text = String(error);

  return (
    text.includes('net::ERR_ABORTED') || text.includes('page.goto: Timeout')
  );
}

export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * The storefront renders a different control for the same job at each
   * breakpoint — a header nav or a hamburger, a sort dropdown or a sort
   * drawer, an inline CTA or a sticky bar. Both are in the DOM; only one is
   * visible. This picks whichever the current viewport is showing, so one
   * page object drives desktop and mobile alike.
   */
  protected visibleOf(...selectors: string[]): Locator {
    return this.page
      .locator(selectors.join(', '))
      .filter({ visible: true })
      .first();
  }

  async goto(path: string): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await this.page.goto(path, {
          waitUntil: 'domcontentloaded',
          ...(attempt === 1 ? {} : { timeout: 20_000 }),
        });

        // Then wait for `load`, but do not let it fail the case.
        //
        // The wait itself matters: until the storefront's scripts are
        // bound its controls fall back to plain navigation — tapping ADD
        // follows a bare href to /cart instead of opening the drawer — so
        // returning at `domcontentloaded` alone made tests interact with a
        // half-initialised page and fail in ways that looked unrelated.
        //
        // Hard-failing on it is what does not matter. `load` waits on
        // every last subresource, so one hung pixel or payment script
        // holds it open indefinitely while the page itself is perfectly
        // usable: measured here, `load` normally follows the DOM by 0.3s
        // to 1.3s, yet stalls past 45s often enough to have timed out
        // GZ_CART_11, GZ_HOME_02, GZ_PDP_01 and GZ_PDP_04. Fifteen seconds
        // is an order of magnitude beyond the real figure, so reaching it
        // means a resource is hung rather than slow, and carrying on with
        // a bound page beats failing a case over someone else's script.
        await this.page
          .waitForLoadState('load', { timeout: 15_000 })
          .catch(() => undefined);

        // `load` is only a proxy for the thing that actually matters, and
        // the two can come apart: the scripts bind in their own time, and a
        // control driven before then falls back to plain navigation. So
        // wait for the storefront to say so itself. Normally this is
        // already true by `load` and costs nothing.
        await this.page
          .waitForFunction(
            (flag) => flag in window,
            brand.readySignal,
            { timeout: 15_000 },
          )
          .catch(() => undefined);

        return;
      } catch (error) {
        if (!isTransientNavigation(error)) {
          throw error;
        }

        lastError = error;

        // Let the abandoned navigation settle before starting another.
        // Issuing one immediately cancels the request still in flight, so
        // the retry fails with an ERR_ABORTED of its own making.
        await this.page.waitForTimeout(1_000);
      }
    }

    throw lastError;
  }

  async text(locator: Locator): Promise<string> {
    return (await locator.innerText()).trim();
  }

  async priceOf(locator: Locator): Promise<number> {
    return parsePrice(await this.text(locator));
  }

  async expectUrlContains(fragment: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(
      typeof fragment === 'string'
        ? new RegExp(escapeRegExp(fragment))
        : fragment,
    );
  }
}
