/** Home page / storefront landing page. */
import { expect, Locator } from '@playwright/test';
import { brand } from '../brand.config';
import { ProductCard } from './components/ProductCard';
import { ProductListPage } from './ProductListPage';

const sel = brand.selectors.home;
const card$ = brand.selectors.productCard;

/** The page's top-level sections, in the order they must render. */
const SECTION_SELECTORS: Record<string, string> = {
  announcementBar: sel.announcementBar,
  header: brand.selectors.header.root,
  hero: sel.hero,
  bestsellers: sel.bestsellers,
  crafting: sel.crafting,
  discover: sel.discover,
  genderTiles: sel.genderTiles,
  notes: sel.notes,
  perfumers: sel.perfumers,
  uspStrip: sel.uspStrip,
  footer: brand.selectors.footer.root,
};

export class HomePage extends ProductListPage {
  readonly announcementBar = this.page.locator(sel.announcementBar).first();

  // Hero carousel
  readonly hero = this.page.locator(sel.hero).first();
  readonly heroSlides = this.hero.locator(sel.heroSlide);
  readonly heroImages = this.hero.locator(sel.heroImage);
  readonly heroDots = this.hero.locator(sel.heroDot);

  // Bestsellers
  readonly bestsellers = this.page.locator(sel.bestsellers).first();
  readonly bestsellersTitle = this.bestsellers
    .locator(sel.bestsellersTitle)
    .first();
  readonly bestsellersViewAll = this.bestsellers
    .locator(sel.bestsellersViewAll)
    .first();
  readonly bestsellerCards = this.bestsellers.locator(card$.root);

  readonly crafting = this.page.locator(sel.crafting).first();
  readonly craftingTitle = this.crafting.locator(sel.craftingTitle).first();

  // Discovery sets
  readonly discover = this.page.locator(sel.discover).first();
  readonly discoverTitle = this.discover.locator(sel.discoverTitle).first();
  readonly discoverCards = this.discover.locator(card$.root);

  // Lifestyle tiles
  readonly genderTiles = this.page.locator(sel.genderTiles).first();
  readonly genderTileCards = this.genderTiles.locator(sel.genderTileCard);

  // Shop by note
  readonly notes = this.page.locator(sel.notes).first();
  readonly notesTitle = this.notes.locator(sel.notesTitle).first();
  readonly noteItems = this.notes.locator(sel.notesItem);

  readonly perfumers = this.page.locator(sel.perfumers).first();
  readonly perfumersTitle = this.perfumers.locator(sel.perfumersTitle).first();

  readonly uspStrip = this.page.locator(sel.uspStrip).first();
  readonly uspItems = this.uspStrip.locator(sel.uspItem);

  async open(): Promise<this> {
    await this.goto(brand.paths.home);
    return this;
  }

  section(name: string): Locator {
    const selector = SECTION_SELECTORS[name];

    if (!selector) {
      throw new Error(`Unknown home section "${name}"`);
    }

    return this.page.locator(selector).first();
  }

  /**
   * Rendered height of a section. Used instead of a text check because
   * some sections (the hero, the lifestyle tiles) are pure artwork.
   */
  async sectionHeight(name: string): Promise<number> {
    const box = await this.section(name).boundingBox();
    return Math.round(box?.height ?? 0);
  }

  /**
   * Document-absolute position of each named section, so a spec can assert
   * they render top to bottom. Absolute rather than viewport-relative
   * because the header is sticky and would always report zero.
   */
  async sectionPositions(names: string[]): Promise<number[]> {
    // Measure from the top of the document: the header is sticky, so while
    // the page is scrolled it reports wherever it is pinned, not where it
    // sits in the layout.
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await expect
      .poll(async () => this.page.evaluate(() => Math.round(window.scrollY)))
      .toBe(0);

    const positions: number[] = [];

    for (const name of names) {
      const locator = this.section(name);

      if ((await locator.count()) === 0) {
        throw new Error(`Home section "${name}" is not rendered`);
      }

      positions.push(
        await locator.evaluate((element) =>
          Math.round(element.getBoundingClientRect().top + window.scrollY),
        ),
      );
    }

    return positions;
  }

  /* ------------------------------------------------------------------ hero */

  /** The slide currently on screen. The carousel advances on its own. */
  async activeHeroIndex(): Promise<number> {
    const classes = await this.heroDots.evaluateAll(
      (dots, activeClass) =>
        dots.map((dot) => dot.className.includes(activeClass)),
      sel.heroActiveDotClass,
    );

    const index = classes.findIndex(Boolean);

    if (index < 0) {
      throw new Error('No hero slide is marked active');
    }

    return index;
  }

  async activeHeroSlide(): Promise<Locator> {
    return this.heroSlides.nth(await this.activeHeroIndex());
  }

  async activeHeroDots(): Promise<number> {
    const classes = await this.heroDots.evaluateAll(
      (dots, activeClass) =>
        dots.map((dot) => dot.className.includes(activeClass)),
      sel.heroActiveDotClass,
    );

    return classes.filter(Boolean).length;
  }

  /* ---------------------------------------------------------------- cards */

  bestsellerCard(name: string): ProductCard {
    return new ProductCard(
      this.bestsellerCards.filter({ hasText: name }).first(),
    );
  }

  discoverCard(name: string): ProductCard {
    return new ProductCard(
      this.discoverCards.filter({ hasText: name }).first(),
    );
  }

  async bestsellerNames(): Promise<string[]> {
    return (await this.bestsellerCards.locator(card$.name).allInnerTexts()).map(
      (name) => name.trim(),
    );
  }

  /* ----------------------------------------------------------- gender tiles */

  genderTile(label: string): Locator {
    return this.genderTileCards.filter({ hasText: label }).first();
  }

  /* -------------------------------------------------------------- notes */

  /** The note currently on screen. This section rotates on its own too. */
  activeNoteItem(): Locator {
    return this.notes.locator(`.${sel.notesActiveItemClass}`).first();
  }

  async activeNoteName(): Promise<string> {
    return this.text(this.activeNoteItem().locator(sel.notesItemName));
  }

  activeNoteLink(): Locator {
    return this.activeNoteItem().locator(sel.notesItemLink).first();
  }

  async waitForNotes(): Promise<void> {
    await this.notes.scrollIntoViewIfNeeded();
    await expect(this.activeNoteItem()).toBeVisible();
  }
}
