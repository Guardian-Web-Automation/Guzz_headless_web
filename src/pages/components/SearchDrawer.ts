/**
 * The search overlay opened from the header: input, trending chips, product
 * suggestions and the "search for" link.
 */
import { expect, Locator } from '@playwright/test';
import { brand } from '../../brand.config';
import { BasePage, escapeRegExp } from '../BasePage';

const sel = brand.selectors.searchDrawer;

export class SearchDrawer extends BasePage {
  readonly root = this.page.locator(sel.root);
  readonly overlay = this.root.locator(sel.overlay).first();
  readonly panel = this.root.locator(sel.panel).first();
  readonly field = this.root.locator(sel.field).first();
  readonly label = this.root.locator(sel.label).first();
  readonly input = this.root.locator(sel.input).first();
  readonly clearButton = this.root.locator(sel.clearButton).first();
  readonly submitButton = this.root.locator(sel.submitButton).first();
  readonly closeButton = this.root.locator(sel.closeButton).first();

  // Suggestions
  readonly body = this.root.locator(sel.body).first();
  readonly sections = this.root.locator(sel.section);
  readonly headings = this.root.locator(sel.heading);
  readonly chips = this.root.locator(sel.chip);
  readonly cards = this.root.locator(sel.card);
  readonly searchForButton = this.root.locator(sel.searchForButton).first();

  async waitUntilOpen(): Promise<void> {
    await expect(this.page.locator(sel.openRoot)).toBeVisible();
  }

  async waitUntilClosed(): Promise<void> {
    await expect(this.page.locator(sel.openRoot)).toBeHidden();
  }

  async isOpen(): Promise<boolean> {
    return this.page.locator(sel.openRoot).isVisible();
  }

  /**
   * Types a term and waits for the suggestion overlay to finish rendering.
   * The trending chips and the search-for link appear before the product
   * suggestions come back, so waiting on those alone reads a half-built
   * overlay. Pass `expectProducts: false` for a term with no matches.
   */
  async type(
    term: string,
    options: { expectProducts?: boolean } = {},
  ): Promise<void> {
    await this.input.fill(term);
    await expect(this.searchForButton).toBeVisible();

    if (options.expectProducts !== false) {
      await expect(this.cards.first()).toBeVisible();
    }
  }

  /** Suggestion section headings, in render order. */
  async sectionHeadings(): Promise<string[]> {
    return (await this.headings.allInnerTexts()).map((heading) =>
      heading.trim(),
    );
  }

  chip(name: string): Locator {
    return this.chips.filter({ hasText: name }).first();
  }

  card(name: string): Locator {
    return this.cards.filter({ hasText: name }).first();
  }

  cardImage(name: string): Locator {
    return this.card(name).locator(sel.cardImage);
  }

  cardTitle(name: string): Locator {
    return this.card(name).locator(sel.cardTitle);
  }

  cardPrice(name: string): Locator {
    return this.card(name).locator(sel.cardPrice);
  }

  cardAddButton(name: string): Locator {
    return this.card(name).locator(sel.cardAddButton);
  }

  async cardPriceValue(name: string): Promise<number> {
    return this.priceOf(this.cardPrice(name));
  }

  /** Submits the term and waits for the results page. */
  async submit(term: string): Promise<void> {
    await this.input.fill(term);
    await this.input.press('Enter');
    await this.waitForResultsPage();
  }

  async waitForResultsPage(): Promise<void> {
    await this.page.waitForURL(new RegExp(escapeRegExp(brand.paths.search)));
    await this.page.waitForLoadState('domcontentloaded');

    // The URL and the document arrive before the results do: the heading is
    // rendered once the search request comes back, so returning here left
    // callers asserting against a page that had not filled in yet.
    await expect(
      this.page.locator(brand.selectors.searchPage.resultCount).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.waitUntilClosed();
  }
}
