/** Site header: logo, primary nav, search / cart / account icons. */
import { expect, Locator } from '@playwright/test';
import { brand } from '../../brand.config';
import { BasePage } from '../BasePage';
import { CartDrawer } from './CartDrawer';
import { SearchDrawer } from './SearchDrawer';

const sel = brand.selectors.header;

export class Header extends BasePage {
  readonly root = this.page.locator(sel.root);
  readonly logo = this.root.locator(sel.logo).first();
  readonly menuButton = this.root.locator(sel.menuButton).first();
  // Desktop and mobile each render their own search icon.
  readonly searchButton = this.visibleOf(
    sel.searchButton,
    sel.searchButtonMobile,
  );
  readonly cartButton = this.root.locator(sel.cartButton).first();
  readonly cartBadge = this.root.locator(sel.cartBadge).first();
  readonly accountLink = this.root.locator(sel.accountLink).first();
  readonly wishlistLink = this.root.locator(sel.wishlistLink).first();
  readonly nav = this.root.locator(sel.nav).first();

  // Mobile navigation drawer
  readonly menuDrawer = this.page.locator(sel.menuDrawer).first();
  readonly menuDrawerClose = this.page.locator(sel.menuDrawerClose).first();
  readonly menuDrawerLinks = this.page.locator(sel.menuDrawerLink);

  /** True when the viewport is showing the hamburger rather than the nav. */
  async isMobileLayout(): Promise<boolean> {
    return this.menuButton.isVisible();
  }

  navLink(label: string): Locator {
    return this.nav.getByRole('link', { name: label, exact: true }).first();
  }

  /** The drawer's link for a category, used on mobile. */
  drawerLink(label: string): Locator {
    return this.menuDrawerLinks.filter({ hasText: label }).first();
  }

  /**
   * The category link for the current viewport: the header nav on desktop,
   * the drawer link on mobile. Opens the drawer first when needed.
   */
  async categoryLink(label: string): Promise<Locator> {
    if (!(await this.isMobileLayout())) {
      return this.navLink(label);
    }

    if (!(await this.isMenuOpen())) {
      await this.openMenu();
    }

    return this.drawerLink(label);
  }

  async isMenuOpen(): Promise<boolean> {
    const classes = (await this.menuDrawer.getAttribute('class')) ?? '';
    return classes.split(/\s+/).includes(sel.menuDrawerOpenClass);
  }

  async openMenu(): Promise<void> {
    await this.menuButton.click();
    await expect(this.menuDrawer).toHaveClass(
      new RegExp(sel.menuDrawerOpenClass),
    );
  }

  async closeMenu(): Promise<void> {
    await this.menuDrawerClose.click();
    await expect(this.menuDrawer).not.toHaveClass(
      new RegExp(sel.menuDrawerOpenClass),
    );
  }

  async openSearch(): Promise<SearchDrawer> {
    await this.searchButton.click();
    const drawer = new SearchDrawer(this.page);
    await drawer.waitUntilOpen();
    return drawer;
  }

  async openCart(): Promise<CartDrawer> {
    const drawer = new CartDrawer(this.page);
    return drawer.openWith(() => this.cartButton.click());
  }

  /** Items in the cart per the header badge; `0` when no badge is rendered. */
  async cartCount(): Promise<number> {
    if ((await this.cartBadge.count()) === 0) {
      return 0;
    }

    return Number((await this.text(this.cartBadge)) || 0);
  }

  /** Navigates by category label on either viewport. */
  async navigateTo(label: string): Promise<void> {
    const link = await this.categoryLink(label);
    await link.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}
