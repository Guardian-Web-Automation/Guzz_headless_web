/**
 * GoKwik checkout. It renders in a cross-origin iframe layered over the
 * storefront, so everything inside it is reached through a frame locator.
 *
 * The suite reads the order summary only — it never submits a phone number
 * or places an order.
 */
import { expect, FrameLocator, Locator } from '@playwright/test';
import { brand } from '../brand.config';
import { BasePage, parsePrice } from './BasePage';

const sel = brand.selectors.checkout;

export class CheckoutPage extends BasePage {
  readonly frameElement = this.page.locator(sel.iframe);

  private get frame(): FrameLocator {
    return this.page.frameLocator(sel.iframe);
  }

  get orderSummary(): Locator {
    return this.frame.locator(sel.orderSummary).first();
  }

  get summaryPricing(): Locator {
    return this.frame.locator(sel.summaryPricing).first();
  }

  get originalPrice(): Locator {
    return this.frame.locator(sel.originalPrice).first();
  }

  get loginContainer(): Locator {
    return this.frame.locator(sel.loginContainer).first();
  }

  async waitUntilOpen(): Promise<void> {
    await expect(this.frameElement).toBeVisible();
    await expect(this.orderSummary).toBeVisible();
  }

  /** The summary line, e.g. `1 item ₹1,399 ₹999`. */
  async summaryText(): Promise<string> {
    return this.text(this.summaryPricing);
  }

  async itemCount(): Promise<number> {
    const match = (await this.summaryText()).match(/(\d+)\s*items?/i);

    if (!match) {
      throw new Error(`No item count in the order summary: "${await this.summaryText()}"`);
    }

    return Number(match[1]);
  }

  /**
   * The payable amount. The summary shows the struck-through original
   * followed by the amount actually charged, so this takes the last one.
   */
  async payableAmount(): Promise<number> {
    const amounts = (await this.summaryText()).match(/₹[\d,]+/g);

    if (!amounts?.length) {
      throw new Error(`No amount in the order summary: "${await this.summaryText()}"`);
    }

    return parsePrice(amounts[amounts.length - 1]);
  }
}
