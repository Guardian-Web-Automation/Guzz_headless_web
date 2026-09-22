/**
 * The slide-out cart, shown after add-to-cart and from the header cart icon.
 *
 * This — not the `/cart` page — is what the cart test cases describe: it is
 * the surface that carries the back chevron, the prepaid pill and the
 * "more from the lineage" upsell rail.
 */
import { expect, Locator } from '@playwright/test';
import { brand } from '../../brand.config';
import { BasePage, parsePrice } from '../BasePage';
import { CheckoutPage } from '../CheckoutPage';

const sel = brand.selectors.cartDrawer;

export class CartDrawer extends BasePage {
  readonly root = this.page.locator(sel.root);

  // Header
  readonly backButton = this.root.locator(sel.backButton).first();
  readonly bagIcon = this.root.locator(sel.bagIcon).first();
  readonly prepaidPill = this.root.locator(sel.prepaidPill).first();

  // Lines
  readonly lines = this.root.locator(sel.line);

  // Upsell rail
  readonly upsell = this.root.locator(sel.upsell).first();
  readonly upsellTitle = this.root.locator(sel.upsellTitle).first();
  readonly upsellCards = this.root.locator(sel.upsellCard);

  readonly trustStrip = this.root.locator(sel.trustStrip).first();

  // Order summary
  readonly summary = this.root.locator(sel.summary).first();
  readonly summaryHead = this.root.locator(sel.summaryHead).first();
  readonly summaryTitle = this.root.locator(sel.summaryTitle).first();
  readonly summaryChevron = this.root.locator(sel.summaryChevron).first();
  readonly summaryRows = this.root.locator(sel.summaryRow);
  readonly summaryFreeDelivery = this.root
    .locator(sel.summaryFreeDelivery)
    .first();
  readonly summaryTotal = this.root.locator(sel.summaryTotal).first();
  readonly summaryTotalAmount = this.root
    .locator(sel.summaryTotalAmount)
    .first();

  // Checkout bar
  readonly checkoutBar = this.root.locator(sel.checkoutBar).first();
  readonly itemCount = this.root.locator(sel.itemCount).first();
  readonly total = this.root.locator(sel.total).first();
  readonly checkoutButton = this.root.locator(sel.checkoutButton).first();

  // Empty state
  readonly emptyTitle = this.root.locator(sel.emptyTitle).first();
  readonly emptySubtitle = this.root.locator(sel.emptySubtitle).first();
  readonly emptyCta = this.root.locator(sel.emptyCta).first();

  readonly closeButton = this.root.locator(sel.closeButton).first();

  /**
   * The drawer element is always in the DOM; it is shown by a class the
   * storefront adds once the add-to-cart request comes back. On CI that
   * round trip is much slower than locally, so this gets its own budget
   * rather than the global 15s expect timeout.
   */
  async waitUntilOpen(timeout = 30_000): Promise<void> {
    await expect(this.root).toBeVisible({ timeout });
  }

  /** Header badge, read from outside the drawer. */
  private get cartBadge(): Locator {
    const header = brand.selectors.header;
    return this.page.locator(header.root).locator(header.cartBadge).first();
  }

  private async cartCount(): Promise<number> {
    if ((await this.cartBadge.count()) === 0) {
      return 0;
    }

    return Number((await this.text(this.cartBadge)) || 0);
  }

  /**
   * Performs an action that opens the drawer without changing the cart —
   * the header cart button — and repeats it if the drawer does not appear.
   *
   * Safe to repeat precisely because the action adds nothing.
   */
  async openWith(
    action: () => Promise<void>,
    attempts = 3,
  ): Promise<CartDrawer> {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      await action();

      try {
        await this.waitUntilOpen(attempt === attempts ? 30_000 : 10_000);
        return this;
      } catch (error) {
        if (attempt === attempts) {
          throw error;
        }
      }
    }

    return this;
  }

  /**
   * Performs an add-to-cart action and returns once the drawer is open.
   *
   * Repeating an add is NOT safe, so this never re-clicks blindly. A click
   * that lands before the storefront binds its handler does nothing at all
   * and must be repeated; a click that worked but whose drawer was slow to
   * appear must not be — retrying that one adds the product twice, which is
   * exactly what happened on CI and skewed every quantity and total after
   * it. The header badge distinguishes the two: if it went up the add
   * landed, so the drawer is opened from the header instead of adding again.
   */
  async openAfterAdd(action: () => Promise<void>): Promise<CartDrawer> {
    const before = await this.cartCount();

    await action();

    if (await this.opened(20_000)) {
      return this;
    }

    if (await this.cartCountRose(before)) {
      // The add landed, so opening the drawer from the header is safe — but
      // only once whatever overlay the add was made from is out of the way.
      // Adding from the search drawer leaves it open over the header, and
      // its close button swallows every click aimed at the cart icon.
      await this.closeBlockingDrawer();
      await this.page
        .locator(brand.selectors.header.cartButton)
        .first()
        .click();
      await this.waitUntilOpen();
      return this;
    }

    // Nothing was added, so the click never registered: repeat it.
    await action();
    await this.waitUntilOpen();
    return this;
  }

  /** Closes the search drawer when it is covering the header. */
  private async closeBlockingDrawer(): Promise<void> {
    const search = brand.selectors.searchDrawer;
    const openDrawer = this.page.locator(search.openRoot).first();

    if (!(await openDrawer.isVisible().catch(() => false))) {
      return;
    }

    await openDrawer.locator(search.closeButton).first().click();
    await expect(openDrawer).toBeHidden();
  }

  private async opened(timeout: number): Promise<boolean> {
    try {
      await this.waitUntilOpen(timeout);
      return true;
    } catch {
      return false;
    }
  }

  private async cartCountRose(before: number): Promise<boolean> {
    try {
      await expect
        .poll(async () => this.cartCount(), { timeout: 10_000 })
        .toBeGreaterThan(before);
      return true;
    } catch {
      return false;
    }
  }

  /* ----------------------------------------------------------------- lines */

  line(index: number): Locator {
    return this.lines.nth(index);
  }

  lineByName(name: string): Locator {
    return this.lines.filter({ hasText: name }).first();
  }

  async lineCount(): Promise<number> {
    return this.lines.count();
  }

  async lineNames(): Promise<string[]> {
    return (await this.lines.locator(sel.lineName).allInnerTexts()).map(
      (name) => name.trim(),
    );
  }

  lineImage(index: number): Locator {
    return this.line(index).locator(sel.lineImage);
  }

  lineNameLink(index: number): Locator {
    return this.line(index).locator(sel.lineName);
  }

  lineVariant(index: number): Locator {
    return this.line(index).locator(sel.lineVariant);
  }

  lineComparePrice(index: number): Locator {
    return this.line(index).locator(sel.lineComparePrice);
  }

  lineRemoveButton(index: number): Locator {
    return this.line(index).locator(sel.lineRemove);
  }

  async lineName(index: number): Promise<string> {
    return this.text(this.line(index).locator(sel.lineName));
  }

  async linePrice(index: number): Promise<number> {
    return this.priceOf(this.line(index).locator(sel.linePrice));
  }

  async removeLine(index: number): Promise<void> {
    const before = await this.lineCount();
    const totals = await this.totalsSignature();
    await this.lineRemoveButton(index).click();
    await expect(this.lines).toHaveCount(before - 1);
    await this.waitForTotals(totals);
  }

  /* -------------------------------------------------------------- quantity */

  quantityValue(index: number): Locator {
    return this.line(index).locator(sel.quantityValue);
  }

  increaseQuantityButton(index: number): Locator {
    return this.line(index).locator(sel.quantityIncrease);
  }

  decreaseQuantityButton(index: number): Locator {
    return this.line(index).locator(sel.quantityDecrease);
  }

  async quantity(index: number): Promise<number> {
    return Number(await this.text(this.quantityValue(index)));
  }

  async increaseQuantity(index: number, times = 1): Promise<void> {
    for (let step = 0; step < times; step += 1) {
      const before = await this.quantity(index);
      const totals = await this.totalsSignature();
      await this.increaseQuantityButton(index).click();
      await expect(this.quantityValue(index)).toHaveText(String(before + 1));
      await this.waitForTotals(totals);
    }
  }

  async decreaseQuantity(index: number, times = 1): Promise<void> {
    for (let step = 0; step < times; step += 1) {
      const before = await this.quantity(index);
      const totals = await this.totalsSignature();
      await this.decreaseQuantityButton(index).click();
      await expect(this.quantityValue(index)).toHaveText(String(before - 1));
      await this.waitForTotals(totals);
    }
  }

  /**
   * The payable amount, used to detect a recalculation. Deliberately not the
   * item count: that updates about a second before the money does, so
   * watching it returns while the amounts are still stale.
   */
  private async totalsSignature(): Promise<string> {
    if ((await this.total.count()) === 0) {
      return '';
    }

    return this.text(this.total);
  }

  /**
   * The stepper updates instantly but the totals are recalculated server
   * side, so they lag behind the quantity by a moment.
   */
  private async waitForTotals(previous: string): Promise<void> {
    await expect
      .poll(async () => this.totalsSignature(), { timeout: 20_000 })
      .not.toBe(previous);
  }

  /* ---------------------------------------------------------------- upsell */

  upsellCard(index: number): Locator {
    return this.upsellCards.nth(index);
  }

  async upsellName(index: number): Promise<string> {
    return this.text(this.upsellCard(index).locator(sel.upsellName));
  }

  async upsellPrice(index: number): Promise<number> {
    return this.priceOf(this.upsellCard(index).locator(sel.upsellPrice));
  }

  async addUpsell(index: number): Promise<void> {
    const before = await this.lineCount();
    const totals = await this.totalsSignature();
    await this.upsellCard(index).locator(sel.upsellAddButton).click();
    await expect(this.lines).toHaveCount(before + 1);
    await this.waitForTotals(totals);
  }

  /* --------------------------------------------------------- order summary */

  async isSummaryOpen(): Promise<boolean> {
    return (await this.summaryHead.getAttribute('aria-expanded')) === 'true';
  }

  async expandSummary(): Promise<void> {
    if (!(await this.isSummaryOpen())) {
      await this.summaryHead.click();
    }

    await expect(this.summaryHead).toHaveAttribute('aria-expanded', 'true');
    await expect(this.summaryTotalAmount).toBeVisible();
  }

  /** Summary row labels, in render order. */
  async summaryRowLabels(): Promise<string[]> {
    return (
      await this.summaryRows.locator(sel.summaryRowLabel).allInnerTexts()
    ).map((label) => label.trim());
  }

  /** The value on one summary row, read from the row's own text. */
  async summaryRowValue(label: string): Promise<string> {
    const row = this.summaryRows.filter({ hasText: label }).first();
    const text = await this.text(row);
    return text.replace(new RegExp(`^${label}`, 'i'), '').trim();
  }

  async subtotal(): Promise<number> {
    return parsePrice(await this.summaryRowValue('Subtotal'));
  }

  async estimatedTotal(): Promise<number> {
    return this.priceOf(this.summaryTotalAmount);
  }

  /* ---------------------------------------------------------- checkout bar */

  /** Items reported by the checkout bar, e.g. `2 Items` -> `2`. */
  async itemCountValue(): Promise<number> {
    const match = (await this.text(this.itemCount)).match(/(\d+)/);

    if (!match) {
      throw new Error(
        `No item count in the checkout bar: "${await this.text(this.itemCount)}"`,
      );
    }

    return Number(match[1]);
  }

  async totalAmount(): Promise<number> {
    return this.priceOf(this.total);
  }

  async isEmpty(): Promise<boolean> {
    return (await this.lines.count()) === 0;
  }

  /**
   * Hands over to checkout.
   *
   * Same guard as BUY NOW: a tap that lands before the storefront binds its
   * handler does nothing at all, and waiting never recovers it. Repeating is
   * only safe while nothing has happened — still in the drawer with the
   * button in reach — so a checkout that did open, or a navigation already
   * under way, raises the original error instead.
   */
  async proceedToCheckout(): Promise<CheckoutPage> {
    const checkout = new CheckoutPage(this.page);

    await this.checkoutButton.click();

    try {
      await checkout.waitUntilOpen();
      return checkout;
    } catch (error) {
      if (!(await this.checkoutButton.isVisible().catch(() => false))) {
        throw error;
      }
    }

    await this.checkoutButton.click();
    await checkout.waitUntilOpen();
    return checkout;
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }
}
