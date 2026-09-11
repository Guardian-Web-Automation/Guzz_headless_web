/**
 * Search suite — automates the GZ_SRCH rows of the QA sheet.
 * 9 test cases, renumbered GZ_SRCH_01..09.
 * Sheet serial numbers, in the same order: GZ_SRCH_POS_001, 009, 031, 036,
 * 037, 042, 043, 051, 054.
 *
 * Runs on desktop Chrome; the search overlay is the same component on both
 * breakpoints, so nothing here needed adapting.
 *
 *   npx playwright test tests/search.spec.ts --headed --workers=1
 */
import { expect, test } from '@playwright/test';
import { brand } from '../src/brand.config';
import { createPages } from '../src/pages';

const search = brand.data.search;

/** CSS uppercases many labels, so names are compared case-insensitively. */
const caseless = (values: string[]): string[] =>
  values.map((value) => value.toLowerCase());

test.describe(`${brand.name} search @smoke`, () => {
  test('GZ_SRCH_01 - header magnifier opens the search overlay with its input and controls', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();

    await test.step('Tap the header magnifier icon', async () => {
      await app.home.header.openSearch();
    });

    await test.step('Overlay is open above the page', async () => {
      await expect(app.searchDrawer.panel).toBeVisible();
      expect(await app.searchDrawer.isOpen()).toBe(true);
    });

    await test.step('Input is labelled Search, with a magnifier and a close control', async () => {
      await expect(app.searchDrawer.input).toBeVisible();
      await expect(app.searchDrawer.label).toHaveText(/search/i);
      await expect(app.searchDrawer.submitButton).toBeVisible();
      await expect(app.searchDrawer.closeButton).toBeVisible();
    });

    await test.step('Page behind the overlay is dimmed', async () => {
      await expect(app.searchDrawer.overlay).toBeVisible();
      // A translucent black scrim, not a fully transparent one.
      const background = await app.searchDrawer.overlay.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      expect(background).toMatch(/rgba?\(0,\s*0,\s*0,\s*0?\.\d+\)/);
    });
  });

  test('GZ_SRCH_02 - typing a keyword shows TRENDING NOW, PRODUCTS and the search-for link in order', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.header.openSearch();

    await test.step(`Type "${search.term}"`, async () => {
      await app.searchDrawer.type(search.term);
    });

    await test.step('Sections render in the expected order', async () => {
      expect(caseless(await app.searchDrawer.sectionHeadings())).toEqual(
        caseless(search.sections),
      );
    });

    await test.step('Trending has at least one chip and products are listed', async () => {
      expect(await app.searchDrawer.chips.count()).toBeGreaterThan(0);
      expect(await app.searchDrawer.cards.count()).toBeGreaterThan(0);
    });

    await test.step('Search-for link sits at the bottom and names the keyword', async () => {
      await expect(app.searchDrawer.searchForButton).toBeVisible();
      await expect(app.searchDrawer.searchForButton).toHaveText(
        new RegExp(`search for.*${search.term}`, 'i'),
      );
    });
  });

  test('GZ_SRCH_03 - tapping a TRENDING NOW chip opens the results page for that term', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.header.openSearch();
    await app.searchDrawer.type(search.term);

    await test.step(`Tap the "${search.chip}" chip`, async () => {
      await app.searchDrawer.chip(search.chip).click();
      await app.searchDrawer.waitForResultsPage();
    });

    await test.step('Overlay closes and the results page loads for the chip term', async () => {
      await app.searchDrawer.waitUntilClosed();
      expect(await app.search.searchedTerm()).toBe(search.chip);
      await expect(app.search.resultCount).toContainText(search.chip);
    });

    await test.step('Matching product cards are rendered', async () => {
      expect(await app.search.resultCardCount()).toBeGreaterThan(0);
      expect(await app.search.headlineCount()).toBe(
        await app.search.resultCardCount(),
      );
    });
  });

  test('GZ_SRCH_04 - tapping a suggestion product opens its detail page', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.header.openSearch();
    await app.searchDrawer.type(search.term);

    const expected = search.product;
    const suggestedPrice = await app.searchDrawer.cardPriceValue(expected.name);

    await test.step(`Tap the ${expected.name} suggestion image`, async () => {
      await app.searchDrawer.cardImage(expected.name).click();
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Overlay closes and the product page loads at the same price', async () => {
      await app.searchDrawer.waitUntilClosed();
      await expect(page).toHaveURL(new RegExp(`/products/${expected.handle}`));
      await expect(app.product.title).toHaveText(
        new RegExp(expected.name, 'i'),
      );
      expect(await app.product.currentPrice()).toBe(expected.price);
      expect(await app.product.currentPrice()).toBe(suggestedPrice);
    });
  });

  test('GZ_SRCH_05 - tapping ADD on a suggestion card adds it and increments the cart badge', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();

    const before = await app.home.header.cartCount();
    const urlBefore = page.url();

    await app.home.header.openSearch();
    await app.searchDrawer.type(search.term);

    const expected = search.product;

    await test.step(`Tap ADD on the ${expected.name} suggestion`, async () => {
      await app.searchDrawer.cardAddButton(expected.name).click();
    });

    await test.step('Add-to-cart confirmation shows the product', async () => {
      const cart = app.cartDrawer;
      await cart.waitUntilOpen();
      expect((await cart.lineName(0)).toLowerCase()).toBe(
        expected.name.toLowerCase(),
      );
      expect(await cart.linePrice(0)).toBe(expected.price);
      await cart.close();
    });

    await test.step('Badge increases by exactly one, with no page reload', async () => {
      await expect(app.home.header.cartBadge).toHaveText(String(before + 1));
      expect(page.url()).toBe(urlBefore);
    });
  });

  test('GZ_SRCH_06 - tapping the search-for link loads the full results page', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.header.openSearch();
    await app.searchDrawer.type(search.term);

    await test.step('Tap the search-for link', async () => {
      await app.searchDrawer.searchForButton.click();
      await app.searchDrawer.waitForResultsPage();
    });

    await test.step('Overlay closes and the results page loads for the keyword', async () => {
      await app.searchDrawer.waitUntilClosed();
      await expect(page).toHaveURL(new RegExp(`q=${search.term}`));
      await expect(app.search.resultCount).toHaveText(
        new RegExp(`\\d+ results? for .${search.term}.`, 'i'),
      );
    });

    await test.step('Sort control and the product grid are shown', async () => {
      await expect(app.search.sortLabel).toHaveText(/sort by/i);
      await expect(app.search.sortSelect).toBeVisible();
      await expect(app.search.grid).toBeVisible();
      expect(await app.search.resultCardCount()).toBeGreaterThan(0);
    });
  });

  test('GZ_SRCH_07 - results heading shows the total count with the searched keyword', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.header.openSearch();

    await test.step(`Submit a search for "${search.term}"`, async () => {
      await app.searchDrawer.submit(search.term);
    });

    await test.step('Heading names the keyword and a count', async () => {
      await expect(app.search.resultCount).toHaveText(
        new RegExp(`\\d+ results? for .${search.term}.`, 'i'),
      );
    });

    await test.step('The number matches the cards rendered in the grid', async () => {
      // The sheet's snapshot of 3 drifts with the catalogue, so the heading
      // is reconciled against the grid instead.
      expect(await app.search.headlineCount()).toBe(
        await app.search.resultCardCount(),
      );
    });
  });

  test('GZ_SRCH_08 - tapping a results card opens the matching product page', async ({
    page,
  }) => {
    const app = createPages(page);
    const expected = search.product;

    await app.search.open(search.term);

    const listedPrice = await app.search.cardByName(expected.name).priceValue();

    await test.step(`Tap the ${expected.name} card image`, async () => {
      await app.search.cardByName(expected.name).openImage();
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Product page loads with the same name and price', async () => {
      await expect(page).toHaveURL(new RegExp(`/products/${expected.handle}`));
      await expect(app.product.title).toHaveText(
        new RegExp(expected.name, 'i'),
      );
      expect(await app.product.currentPrice()).toBe(expected.price);
      expect(await app.product.currentPrice()).toBe(listedPrice);
    });
  });

  test('GZ_SRCH_09 - tapping ADD on a results card adds it and increments the cart badge', async ({
    page,
  }) => {
    const app = createPages(page);
    const expected = search.product;

    await app.search.open(search.term);

    const before = await app.search.header.cartCount();
    const urlBefore = page.url();

    await test.step(`Tap ADD on the ${expected.name} card`, async () => {
      await app.search.cardByName(expected.name).addToCart();
    });

    await test.step('Product is added at the listed price', async () => {
      const cart = app.cartDrawer;
      await cart.waitUntilOpen();
      expect((await cart.lineName(0)).toLowerCase()).toBe(
        expected.name.toLowerCase(),
      );
      expect(await cart.linePrice(0)).toBe(expected.price);
      await cart.close();
    });

    await test.step('Badge increases by one and the shopper stays on the results page', async () => {
      await expect(app.search.header.cartBadge).toHaveText(String(before + 1));
      expect(page.url()).toBe(urlBefore);
      await expect(app.search.grid).toBeVisible();
    });
  });
});
