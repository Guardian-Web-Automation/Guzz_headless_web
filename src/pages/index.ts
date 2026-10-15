/**
 * Single entry point for every page object.
 *
 * Specs import from here, so adding or renaming a module file never touches
 * a spec:
 *
 *   import { createPages } from '../../src/pages';
 *
 *   const app = createPages(page);
 *   await app.collection.open();
 */
import { Page } from '@playwright/test';
import { brand } from '../brand.config';
import { AccountPage } from './AccountPage';
import { CartPage } from './CartPage';
import { CheckoutPage } from './CheckoutPage';
import { CollectionPage } from './CollectionPage';
import { ContactUsPage } from './ContactUsPage';
import { HomePage } from './HomePage';
import { ProductDetailPage } from './ProductDetailPage';
import { SearchPage } from './SearchPage';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { SearchDrawer } from './components/SearchDrawer';

export {
  BasePage,
  discountPercent,
  escapeRegExp,
  loadStatus,
  settledScrollY,
  parsePercent,
  parsePrice,
} from './BasePage';
export { ProductListPage } from './ProductListPage';
export { AccountPage } from './AccountPage';
export { CartPage } from './CartPage';
export { CheckoutPage } from './CheckoutPage';
export { CollectionPage } from './CollectionPage';
export { ContactUsPage } from './ContactUsPage';
export { HomePage } from './HomePage';
export { ProductDetailPage } from './ProductDetailPage';
export { SearchPage } from './SearchPage';
export { CartDrawer } from './components/CartDrawer';
export { Footer } from './components/Footer';
export { Header } from './components/Header';
export { ProductCard } from './components/ProductCard';
export { SearchDrawer } from './components/SearchDrawer';

export type App = ReturnType<typeof createPages>;

/** What a case needs to know about whichever product it landed on. */
export interface AddableProduct {
  handle: string;
  name: string;
  price: number;
  comparePrice: number;
}

/**
 * Opens a product the storefront will actually sell, and reports which one
 * it turned out to be.
 *
 * `brand.data.productPreference` is tried first, best product first, so a
 * normal day runs against the same product it always has. Only when every
 * preferred product is sold out does it fall back to whatever the
 * collection is selling, because a stock change is a fact about the shop,
 * not a defect in the page under test.
 *
 * Either way the name and price come from the product that was actually
 * opened, so the cart is still held to exactly what was advertised.
 *
 * `withBundle` additionally skips products that offer no bundle, because
 * the storefront only builds one for some products and a case about bundle
 * pricing has nothing to measure without it.
 */
export async function openAddableProduct(
  page: Page,
  options: { path?: string; withBundle?: boolean } = {},
): Promise<AddableProduct> {
  const { path = brand.data.collections.men.path, withBundle = false } =
    options;
  const collection = new CollectionPage(page);
  const product = new ProductDetailPage(page);
  const rejected: string[] = [];

  /** Whether the product now on screen can carry the case. */
  const isUsable = async (): Promise<boolean> => {
    // Wait for the action bar rather than counting it straight away: after
    // a client-side navigation it has not painted yet, and a bare count
    // reports a perfectly buyable product as unavailable. A sold-out
    // product still renders the button, just disabled, so this waits for
    // the real answer instead of racing it.
    const button = product.addToCartButton;
    const painted = await button
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!painted || (await button.isDisabled())) {
      return false;
    }

    if (!withBundle) {
      return true;
    }

    // The bundle block renders lazily, so its absence only means anything
    // once the page below the fold has actually been built. Scrolling the
    // length of the page is what forces that; counting without it reports
    // every product as bundle-less when the PDP was reached by a click
    // rather than a fresh load.
    if ((await product.bundle.count()) === 0) {
      await product.scrollThroughPage().catch(() => undefined);
    }

    if ((await product.bundle.count()) === 0) {
      return false;
    }

    await product.bundle
      .scrollIntoViewIfNeeded({ timeout: 2_000 })
      .catch(() => undefined);

    return true;
  };

  for (const handle of brand.data.productPreference) {
    await product.open(handle);

    if (await isUsable()) {
      return {
        handle,
        name: (await product.title.innerText()).trim(),
        price: await product.currentPrice(),
        comparePrice: await product.compareAtPrice(),
      };
    }

    rejected.push(handle);
  }

  await collection.open(path);

  for (let index = 0; index < (await collection.productCount()); index += 1) {
    const card = collection.card(index);

    if (await card.isSoldOut()) {
      continue;
    }

    const name = await card.nameText();
    const price = await card.priceValue();
    const comparePrice = await card.comparePriceValue();

    // Wait for the URL itself, not just a load state: the click navigates
    // client-side, so the load state settles against the collection
    // document and callers would read the old URL back.
    await card.open();
    await page.waitForURL(/\/products\//);
    await page.waitForLoadState('domcontentloaded');

    if (!(await isUsable())) {
      rejected.push(name);
      await collection.open(path);
      continue;
    }

    const handle = new URL(page.url()).pathname.split('/').pop() ?? '';

    return { handle, name, price, comparePrice };
  }

  throw new Error(
    `No buyable product${withBundle ? ' with a bundle' : ''} found in ` +
      `${path} — skipped ${rejected.join(', ') || 'nothing'}`,
  );
}

/** One call per spec gives access to every page object for the active brand. */
export function createPages(page: Page) {
  return {
    brand,
    home: new HomePage(page),
    collection: new CollectionPage(page),
    product: new ProductDetailPage(page),
    cart: new CartPage(page),
    checkout: new CheckoutPage(page),
    cartDrawer: new CartDrawer(page),
    search: new SearchPage(page),
    searchDrawer: new SearchDrawer(page),
    account: new AccountPage(page),
    contactUs: new ContactUsPage(page),
    header: new Header(page),
    footer: new Footer(page),
  };
}
