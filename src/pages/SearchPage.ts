/** Full search results page. */
import { Locator } from '@playwright/test';
import { brand } from '../brand.config';
import { ProductCard } from './components/ProductCard';
import { ProductListPage } from './ProductListPage';

const sel = brand.selectors.searchPage;

export class SearchPage extends ProductListPage {
  readonly root = this.page.locator(sel.root);
  readonly grid = this.page.locator(sel.grid);
  /** Scoped to the grid: the search overlay renders its own cards. */
  readonly results = this.grid.locator(brand.selectors.productCard.root);
  readonly input = this.page.locator(sel.input).first();
  readonly submitButton = this.page.locator(sel.submitButton).first();
  readonly toolbar = this.page.locator(sel.toolbar).first();
  readonly resultCount = this.page.locator(sel.resultCount).first();
  readonly sortLabel = this.page.locator(sel.sortLabel).first();
  readonly sortSelect = this.page.locator(sel.sortSelect).first();

  async open(term: string): Promise<this> {
    await this.goto(`${brand.paths.search}?q=${encodeURIComponent(term)}`);
    return this;
  }

  /** Overrides the page-wide grid so only results are counted. */
  card(index: number): ProductCard {
    return new ProductCard(this.results.nth(index));
  }

  cardByName(name: string): ProductCard {
    return new ProductCard(this.results.filter({ hasText: name }).first());
  }

  async resultCardCount(): Promise<number> {
    return this.results.count();
  }

  /** The number the heading reports, e.g. `3 results for "iris"` -> `3`. */
  async headlineCount(): Promise<number> {
    const text = await this.text(this.resultCount);
    const match = text.match(/(\d+)/);

    if (!match) {
      throw new Error(`No result count in the heading: "${text}"`);
    }

    return Number(match[1]);
  }

  async headlineText(): Promise<string> {
    return this.text(this.resultCount);
  }

  async searchedTerm(): Promise<string> {
    return this.input.inputValue();
  }

  async sortOptionLabels(): Promise<string[]> {
    return (await this.sortSelect.locator('option').allInnerTexts()).map((label) =>
      label.trim(),
    );
  }

  get productLinks(): Locator {
    return this.results.locator(brand.selectors.productCard.link);
  }
}
