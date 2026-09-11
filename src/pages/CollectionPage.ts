/**
 * Collection / product listing page (PLP), including the sort menu and the
 * filter drawer.
 *
 * The grid loads more products as you scroll, so any test that counts or
 * compares the whole grid must call `loadAllProducts()` first.
 */
import { expect, Locator } from '@playwright/test';
import { brand } from '../brand.config';
import { parsePrice } from './BasePage';
import { ProductCard } from './components/ProductCard';
import { ProductListPage } from './ProductListPage';

const sel = brand.selectors.listing;
const page$ = brand.selectors.collection;

export class CollectionPage extends ProductListPage {
  // Page shell
  readonly root = this.page.locator(page$.root);
  readonly heroBanner = this.page.locator(page$.heroBanner);
  readonly marquee = this.page.locator(page$.marquee);
  readonly title = this.page.locator(page$.title);
  readonly toolbar = this.page.locator(page$.toolbar);
  readonly grid = this.page.locator(page$.grid);

  // Sort. Desktop shows a toolbar dropdown; mobile a sticky-bar cell that
  // opens a drawer. Both exist in the DOM, so take whichever is visible.
  readonly sortButton = this.visibleOf(sel.sortButton, sel.mobileSortCell);
  readonly sortMenuItems = this.page
    .locator(`${sel.sortDropdownItem}, ${sel.sortOption}`)
    .filter({ visible: true });

  // Filter
  readonly filterButton = this.visibleOf(
    sel.filterButton,
    sel.mobileFilterCell,
  );
  readonly filterDrawer = this.page.locator(sel.filterDrawer);
  readonly filterDrawerTitle = this.filterDrawer
    .locator(sel.filterDrawerTitle)
    .first();
  readonly filterCategories = this.filterDrawer.locator(sel.filterCategory);
  readonly filterOptions = this.filterDrawer.locator(sel.filterOption);
  readonly applyFiltersButton = this.filterDrawer
    .locator(sel.applyFilters)
    .first();
  readonly clearAllButton = this.filterDrawer.locator(sel.clearFilters).first();
  readonly priceHint = this.filterDrawer.locator(sel.priceHint).first();
  readonly priceFromInput = this.filterDrawer.locator(sel.priceFrom).first();
  readonly priceToInput = this.filterDrawer.locator(sel.priceTo).first();

  async open(path: string = brand.paths.allProducts): Promise<this> {
    await this.goto(path);
    await expect(this.productCards.first()).toBeVisible();
    return this;
  }

  /* ------------------------------------------------------------------ grid */

  /**
   * Scrolls until the grid stops growing, so counts and price ordering are
   * checked against the whole collection rather than the first page.
   * Returns the final product count.
   */
  async loadAllProducts(): Promise<number> {
    await this.waitForGridSettled();

    // Back to the top first: the loader only fires when the sentinel comes
    // into view, so a page already scrolled to the bottom will never load
    // another batch — which is what made a short read impossible to retry.
    await this.page.evaluate(() => window.scrollTo(0, 0));

    const deadline = Date.now() + 30_000;
    let previous = -1;
    let stableReads = 0;
    let current = await this.productCount();

    while (Date.now() < deadline) {
      // The fallback is a scripted scroll, not `mouse.wheel`: mobile WebKit
      // has no wheel input at all and throws outright, which took the whole
      // collection suite down on iPhone.
      await this.page
        .locator(page$.sentinel)
        .scrollIntoViewIfNeeded()
        .catch(() =>
          this.page.evaluate(() => window.scrollBy(0, window.innerHeight * 8)),
        );
      await this.page.waitForTimeout(800);
      current = await this.productCount();

      // Three consecutive reads without growth, not one: under load a
      // batch can take longer to arrive than a single poll interval, and
      // stopping early returns a partial grid.
      stableReads = current === previous ? stableReads + 1 : 0;

      if (stableReads >= 3) {
        break;
      }

      previous = current;
    }

    return current;
  }

  /** A cheap fingerprint of what the grid is currently showing. */
  private async gridSignature(): Promise<string> {
    return (await this.productCards.allInnerTexts()).join('|');
  }

  /**
   * Sorting and filtering re-render the grid client-side, so the DOM keeps
   * serving the previous results for a moment. Waits until the rendered grid
   * stops changing before anything reads it.
   */
  private async waitForGridSettled(): Promise<void> {
    let previous = '';

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const current = await this.gridSignature();

      if (current !== '' && current === previous) {
        return;
      }

      previous = current;
      await this.page.waitForTimeout(400);
    }
  }

  /**
   * Waits for the grid to move off `previous` and then settle. If it never
   * changes we carry on — a sort or filter may legitimately return the same
   * products in the same order.
   */
  private async waitForGridUpdate(previous: string): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if ((await this.gridSignature()) !== previous) {
        break;
      }

      await this.page.waitForTimeout(300);
    }

    await this.waitForGridSettled();
  }

  /** Every selling price in grid order. Call `loadAllProducts()` first. */
  async allPrices(): Promise<number[]> {
    return this.prices();
  }

  /** The card for a named product, wherever it sits in the grid. */
  cardByName(name: string): ProductCard {
    return new ProductCard(this.productCards.filter({ hasText: name }).first());
  }

  /* ------------------------------------------------------------------ sort */

  /**
   * The sort control's current value, e.g. "Best Selling". Desktop renders
   * it as "Sort By: <value>" on the button; mobile splits it across a label
   * and a sub-line in the sticky bar.
   */
  async currentSort(): Promise<string> {
    const sub = this.sortButton.locator(sel.mobileCellSub);

    if ((await sub.count()) > 0) {
      return this.text(sub.first());
    }

    return (await this.text(this.sortButton)).replace(/^Sort By:?\s*/i, '');
  }

  async openSortMenu(): Promise<void> {
    await this.sortButton.click();
    await expect(this.sortMenuItems.first()).toBeVisible();
  }

  /** Labels of every sort option, in render order. */
  async sortOptionLabels(): Promise<string[]> {
    return (await this.sortMenuItems.allInnerTexts()).map((label) =>
      label.trim(),
    );
  }

  sortOption(label: string): Locator {
    return this.sortMenuItems.filter({ hasText: label }).first();
  }

  readonly selectedSortOptionItem = this.page
    .locator(sel.sortOptionSelected)
    .filter({ visible: true })
    .first();

  /**
   * The option marked selected in the sort menu. Desktop flags it with a
   * class on the item; mobile with a checked radio inside the option.
   */
  async selectedSortOption(): Promise<string> {
    if ((await this.selectedSortOptionItem.count()) > 0) {
      return this.text(this.selectedSortOptionItem);
    }

    const checked = this.sortMenuItems
      .filter({ has: this.page.locator(`${sel.sortOptionRadio}.checked`) })
      .first();

    return this.text(checked);
  }

  async sortBy(label: string): Promise<void> {
    const before = await this.gridSignature();

    await this.openSortMenu();
    await this.sortOption(label).click();
    // The control's own label is the reliable signal that the sort applied.
    await expect(this.sortButton).toContainText(label);
    await this.waitForGridUpdate(before);
  }

  /* ---------------------------------------------------------------- filter */

  async openFilterDrawer(): Promise<void> {
    await this.filterButton.click();
    await expect(this.filterDrawer).toHaveClass(new RegExp(sel.openClass));
  }

  async isFilterDrawerOpen(): Promise<boolean> {
    return (
      (await this.filterDrawer.getAttribute('class'))?.includes(
        sel.openClass,
      ) ?? false
    );
  }

  filterCategory(name: string): Locator {
    return this.filterCategories.filter({ hasText: name }).first();
  }

  async selectFilterCategory(name: string): Promise<void> {
    await this.filterCategory(name).click();
    await expect(this.filterCategory(name)).toHaveClass(
      new RegExp(sel.activeClass),
    );
  }

  async filterCategoryLabels(): Promise<string[]> {
    return (await this.filterCategories.allInnerTexts()).map((label) =>
      label.trim(),
    );
  }

  /** `.first()` because a brand's note list can repeat a label. */
  filterOption(name: string): Locator {
    return this.filterOptions.filter({ hasText: name }).first();
  }

  /** The count a filter advertises, e.g. `Cedar (2)` -> `2`. */
  async filterOptionCount(name: string): Promise<number> {
    const text = await this.text(
      this.filterOption(name).locator(sel.filterOptionCount),
    );
    const match = text.match(/(\d+)/);

    if (!match) {
      throw new Error(`No count on filter option "${name}": "${text}"`);
    }

    return Number(match[1]);
  }

  async tickFilterOption(name: string): Promise<void> {
    await this.filterOption(name).click();
    await expect(this.filterOption(name).locator('input')).toBeChecked();
  }

  async checkedFilterCount(): Promise<number> {
    return this.filterOptions.locator('input:checked').count();
  }

  async setPriceRange(from: number, to: number): Promise<void> {
    await this.priceFromInput.fill(String(from));
    await this.priceToInput.fill(String(to));
  }

  async priceRangeValues(): Promise<{ from: string; to: string }> {
    return {
      from: await this.priceFromInput.inputValue(),
      to: await this.priceToInput.inputValue(),
    };
  }

  /** Highest catalogue price as advertised by the price filter's hint text. */
  async highestPriceHint(): Promise<number> {
    return parsePrice(await this.text(this.priceHint));
  }

  async applyFilters(): Promise<void> {
    const before = await this.gridSignature();

    await this.applyFiltersButton.click();
    await expect(this.filterDrawer).not.toHaveClass(new RegExp(sel.openClass));
    await this.waitForGridUpdate(before);
  }

  /** Clear All applies immediately and closes the drawer — no Apply needed. */
  async clearFilters(): Promise<void> {
    const before = await this.gridSignature();

    await this.clearAllButton.click();
    await expect(this.filterDrawer).not.toHaveClass(new RegExp(sel.openClass));
    await expect.poll(async () => this.appliedFilterCount()).toBe(0);
    await this.waitForGridUpdate(before);
  }

  /**
   * How many filters the toolbar reports as applied.
   * Desktop renders `Filter (1)`; mobile renders `1 Applied`.
   */
  async appliedFilterCount(): Promise<number> {
    // Desktop: "Filter (1)". Mobile: a "Filter" label above "1 Applied".
    const match = (await this.text(this.filterButton)).match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }
}
