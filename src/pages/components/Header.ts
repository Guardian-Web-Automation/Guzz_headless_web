/** Site header: logo, primary nav, search / cart / account icons. */
import { Locator } from '@playwright/test';
import { brand } from '../../brand.config';
import { BasePage } from '../BasePage';
import { CartDrawer } from './CartDrawer';
import { SearchDrawer } from './SearchDrawer';

const sel = brand.selectors.header;

export class Header extends BasePage {
  readonly root = this.page.locator(sel.root);
  readonly logo = this.root.locator(sel.logo).first();
  readonly menuButton = this.root.locator(sel.menuButton).first();
  readonly searchButton = this.root.locator(sel.searchButton).first();
  readonly cartButton = this.root.locator(sel.cartButton).first();
  readonly cartBadge = this.root.locator(sel.cartBadge).first();
  readonly accountLink = this.root.locator(sel.accountLink).first();
  readonly wishlistLink = this.root.locator(sel.wishlistLink).first();
  readonly nav = this.root.locator(sel.nav).first();

  navLink(label: string): Locator {
    return this.nav.getByRole('link', { name: label, exact: true }).first();
  }

  async openMenu(): Promise<void> {
    await this.menuButton.click();
  }

  async openSearch(): Promise<SearchDrawer> {
    await this.searchButton.click();
    const drawer = new SearchDrawer(this.page);
    await drawer.waitUntilOpen();
    return drawer;
  }

  async openCart(): Promise<CartDrawer> {
    await this.cartButton.click();
    const drawer = new CartDrawer(this.page);
    await drawer.waitUntilOpen();
    return drawer;
  }

  /** Items in the cart per the header badge; `0` when no badge is rendered. */
  async cartCount(): Promise<number> {
    if ((await this.cartBadge.count()) === 0) {
      return 0;
    }

    return Number((await this.text(this.cartBadge)) || 0);
  }

  async navigateTo(label: string): Promise<void> {
    await this.navLink(label).click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}
