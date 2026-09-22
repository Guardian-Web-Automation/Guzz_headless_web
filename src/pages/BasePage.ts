/**
 * Shared base for every page object and component.
 *
 * Brand-agnostic: holds no selector, path or label of its own.
 */
import { expect, Locator, Page } from '@playwright/test';

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
    // Deliberately the default `load`, not `domcontentloaded`. Until the
    // storefront's scripts are bound its controls fall back to plain
    // navigation — tapping ADD follows a bare href to /cart instead of
    // opening the drawer — so returning early made tests interact with a
    // half-initialised page and fail in ways that looked unrelated.
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
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
