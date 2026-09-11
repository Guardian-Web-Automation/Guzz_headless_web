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
