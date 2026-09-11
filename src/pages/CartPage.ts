/** Standalone cart page (/cart), as opposed to the slide-out CartDrawer. */
import { brand } from '../brand.config';
import { BasePage } from './BasePage';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';

const sel = brand.selectors.cartPage;
const summary$ = brand.selectors.cartSummary;

export class CartPage extends BasePage {
  readonly header = new Header(this.page);
  readonly footer = new Footer(this.page);
  readonly drawer = new CartDrawer(this.page);
  readonly root = this.page.locator(sel.root);
  readonly title = this.root.locator(sel.title).first();
  readonly continueShoppingLink = this.root
    .locator(sel.continueShopping)
    .first();
  readonly emptyTitle = this.root.locator(sel.emptyTitle).first();
  readonly emptyCta = this.root.locator(sel.emptyCta).first();

  async open(): Promise<this> {
    await this.goto(brand.paths.cart);
    return this;
  }

  // Order summary. Scoped to the page: the cart drawer renders its own
  // collapsed copy of this block.
  readonly summary = this.root.locator(summary$.root).first();
  readonly summaryTitle = this.summary.locator(summary$.title).first();
  readonly summaryRows = this.summary.locator(summary$.row);
  readonly summaryTotal = this.summary.locator(summary$.total).first();
  readonly summaryTotalAmount = this.summary.locator(summary$.totalAmount).first();

  async isEmpty(): Promise<boolean> {
    return this.emptyTitle.isVisible();
  }

  /** The estimated total the order summary reports. */
  async estimatedTotal(): Promise<number> {
    await this.summary.scrollIntoViewIfNeeded();
    return this.priceOf(this.summaryTotalAmount);
  }

  /** Order summary rows as label -> value, e.g. `{ SUBTOTAL: '₹1,899' }`. */
  async summaryLines(): Promise<Record<string, string>> {
    await this.summary.scrollIntoViewIfNeeded();
    const rows = await this.summaryRows.all();
    const lines: Record<string, string> = {};

    for (const row of rows) {
      const label = (await row.locator(summary$.rowLabel).innerText()).trim();
      lines[label] = (await row.locator(summary$.rowValue).first().innerText()).trim();
    }

    return lines;
  }
}
