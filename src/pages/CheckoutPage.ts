/**
 * Checkout.
 *
 * The storefront has two checkout front-ends and the browser decides which
 * one appears, so the suite has to read either:
 *
 *  - GoKwik, a cross-origin iframe layered over the storefront. Everything
 *    inside it is reached through a frame locator. Chromium gets this one.
 *  - Shopify's own hosted checkout, a full navigation away from the
 *    storefront. WebKit gets this one — GoKwik does not engage there at
 *    all, almost certainly because Safari blocks the third-party storage it
 *    depends on.
 *
 * Both satisfy what the sheets ask of checkout (the order is carried over,
 * with the right line and the right payable amount), so `flavour()` reports
 * which one opened and the readers below answer from whichever it is. Only
 * GoKwik shows a struck-through original price; there is no equivalent on
 * Shopify's checkout to assert against.
 *
 * The suite reads the order summary only — it never submits a phone number
 * or places an order.
 */
import { expect, FrameLocator, Locator } from '@playwright/test';
import { brand } from '../brand.config';
import { BasePage, parsePrice } from './BasePage';

const sel = brand.selectors.checkout;

export type CheckoutFlavour = 'gokwik' | 'shopify';

export class CheckoutPage extends BasePage {
  readonly frameElement = this.page.locator(sel.iframe);

  private get frame(): FrameLocator {
    return this.page.frameLocator(sel.iframe);
  }

  /* ------------------------------------------------ Shopify hosted checkout */

  /**
   * Shopify collapses the order summary behind a toggle on narrow
   * viewports, leaving both tables in the DOM but hidden — which is exactly
   * the viewport the mobile projects run at. Every native read goes through
   * here first.
   */
  private async openNativeSummary(): Promise<void> {
    await expect(async () => {
      if (await this.nativeLineItems.isVisible()) {
        return;
      }

      const toggle = this.page.locator(sel.native.summaryToggle).first();

      if (await toggle.isVisible()) {
        await toggle.click();
      }

      // Retried rather than checked once: `waitUntilOpen()` is called the
      // moment BUY NOW is tapped, so on the first pass the checkout has
      // usually not rendered its toggle yet.
      expect(await this.nativeLineItems.isVisible()).toBe(true);
    }).toPass({ timeout: 45_000 });
  }

  /** First table: one row per line item, after a header row. */
  private get nativeLineItems(): Locator {
    return this.page.locator(sel.native.table).first();
  }

  /** Second table: Subtotal, Shipping, Total. */
  private get nativeTotals(): Locator {
    return this.page.locator(sel.native.table).nth(1);
  }

  /* ---------------------------------------------------------------- shared */

  get orderSummary(): Locator {
    return this.frame.locator(sel.orderSummary).first();
  }

  get summaryPricing(): Locator {
    return this.frame.locator(sel.summaryPricing).first();
  }

  /** GoKwik only — Shopify's checkout does not show a compare-at price. */
  get originalPrice(): Locator {
    return this.frame.locator(sel.originalPrice).first();
  }

  get loginContainer(): Locator {
    return this.frame.locator(sel.loginContainer).first();
  }

  /**
   * Which checkout opened. Resolves as soon as either front-end is on
   * screen, so a caller never has to wait out one timeout to learn it got
   * the other.
   */
  async flavour(): Promise<CheckoutFlavour> {
    let resolved: CheckoutFlavour | undefined;

    await expect
      .poll(
        async () => {
          if (await this.frameElement.isVisible().catch(() => false)) {
            resolved = 'gokwik';
          } else if (sel.native.url.test(this.page.url())) {
            resolved = 'shopify';
          }

          return resolved;
        },
        {
          // Well past the global expect budget: GoKwik is a third-party
          // script and its iframe is sometimes slower than 15s to appear,
          // which read as a checkout that never opened. The Shopify branch
          // is a URL check and still resolves immediately.
          timeout: 60_000,
          message: 'Neither GoKwik nor the Shopify checkout opened',
        },
      )
      .toBeTruthy();

    return resolved as CheckoutFlavour;
  }

  async waitUntilOpen(): Promise<void> {
    if ((await this.flavour()) === 'gokwik') {
      await expect(this.frameElement).toBeVisible();
      await expect(this.orderSummary).toBeVisible();
      return;
    }

    await this.openNativeSummary();
    await expect(this.nativeLineItems).toBeVisible();
    await expect(this.nativeTotals).toBeVisible();
  }

  /** The summary line, e.g. `1 item ₹1,399 ₹999`. GoKwik only. */
  async summaryText(): Promise<string> {
    return this.text(this.summaryPricing);
  }

  async itemCount(): Promise<number> {
    if ((await this.flavour()) === 'shopify') {
      await this.openNativeSummary();

      // Every row but the header is a line item.
      return (await this.nativeLineItems.locator(sel.native.row).count()) - 1;
    }

    const match = (await this.summaryText()).match(/(\d+)\s*items?/i);

    if (!match) {
      throw new Error(
        `No item count in the order summary: "${await this.summaryText()}"`,
      );
    }

    return Number(match[1]);
  }

  /**
   * The payable amount. On GoKwik the summary shows the struck-through
   * original followed by the amount actually charged, so this takes the
   * last one; on Shopify it is the Total row.
   */
  async payableAmount(): Promise<number> {
    if ((await this.flavour()) === 'shopify') {
      await this.openNativeSummary();

      const total = this.nativeTotals
        .locator(sel.native.row)
        .filter({
          has: this.page.locator(sel.native.rowHeader, {
            hasText: new RegExp(`^${sel.native.totalRowHeader}$`, 'i'),
          }),
        })
        .first();

      const amounts = (await this.text(total)).match(/₹\s?[\d,]+(?:\.\d+)?/g);

      if (!amounts?.length) {
        throw new Error(
          `No amount in the Total row: "${await this.text(total)}"`,
        );
      }

      // The Total row repeats the amount (currency code, then the figure);
      // they are the same number, so either one answers.
      return parsePrice(amounts[amounts.length - 1]);
    }

    const amounts = (await this.summaryText()).match(/₹[\d,]+/g);

    if (!amounts?.length) {
      throw new Error(
        `No amount in the order summary: "${await this.summaryText()}"`,
      );
    }

    return parsePrice(amounts[amounts.length - 1]);
  }

  /**
   * Text of the ordered lines, so a spec can confirm the right product.
   *
   * Both checkouts collapse the lines behind the summary header on narrow
   * viewports, showing only a total until it is expanded.
   */
  async lineItemsText(): Promise<string> {
    if ((await this.flavour()) === 'shopify') {
      await this.openNativeSummary();

      return this.text(this.nativeLineItems);
    }

    const line = this.frame.locator(sel.lineName).first();

    if (!(await line.isVisible().catch(() => false))) {
      await this.frame.locator(sel.summaryToggle).first().click();
    }

    await expect(line).toBeVisible();

    return this.text(line);
  }
}
