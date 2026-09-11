/**
 * Collection / PLP suite — automates GUZZ_QA_TestCases_07_PLP_Collection.csv.
 * 12 test cases, renumbered GZ_PLP_01..12.
 * Sheet serial numbers, in the same order: GZ_PLP_POS_001, 008, 015, 019,
 * 028, 031, 032, 042, 048, 055, 065, 071.
 *
 * Runs on every project. Two cases describe mobile-only UI, which the
 * mobile projects exercise as written; on desktop they are checked against
 * the desktop equivalents — see the notes on GZ_PLP_01 and GZ_PLP_05.
 *
 *   npx playwright test tests/collection.plp.spec.ts --headed --workers=1
 */
import { expect, test } from '@playwright/test';
import { brand } from '../src/brand.config';
import { createPages } from '../src/pages';

const data = brand.data;
const shopAll = data.collections.shopAll;
const men = data.collections.men;

test.describe(`${brand.name} collection page @smoke`, () => {
  test('GZ_PLP_01 - collection page loads with banner, marquee, heading, grid and sort/filter controls', async ({
    page,
  }) => {
    const app = createPages(page);

    // ADAPTED: the sheet navigates via the hamburger and expects a sticky
    // bottom bar. Both are mobile-only; on desktop the nav is always visible
    // and the sort/filter controls sit in the top toolbar.
    await test.step('Open the home page and go to the MEN collection', async () => {
      await app.home.open();
      await app.home.header.navigateTo('Men');
    });

    await test.step('Land on the MEN collection', async () => {
      await expect(page).toHaveURL(new RegExp(men.path));
      await expect(app.collection.root).toBeVisible();
    });

    await test.step('Banner and heading are shown', async () => {
      await expect(app.collection.heroBanner).toBeVisible();
      await expect(app.collection.title).toHaveText(men.title);
    });

    await test.step('Marquee strip is present', async () => {
      // ADAPTED: the claims strip is display:none above the mobile
      // breakpoint, so on desktop we can only assert it is rendered.
      await expect(app.collection.marquee).toBeAttached();
    });

    await test.step('Product grid is rendered', async () => {
      await expect(app.collection.grid).toBeVisible();
      await expect(app.collection.productCards.first()).toBeVisible();
    });

    await test.step('Toolbar exposes SORT BY and FILTER', async () => {
      await expect(app.collection.toolbar).toBeVisible();
      await expect(app.collection.filterButton).toBeVisible();
      await expect(app.collection.sortButton).toContainText(men.defaultSort);
    });
  });

  test('GZ_PLP_02 - product card shows all ten elements with correct values', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open(men.path);

    const expected = data.sampleCard;
    const card = app.collection.cardByName(expected.name);

    await test.step('All ten card elements are present', async () => {
      await expect(card.image).toBeVisible();
      await expect(card.wishlistButton).toBeVisible();
      await expect(card.genderTag).toBeVisible();
      await expect(card.ratingStar).toBeVisible();
      await expect(card.ratingCount).toBeVisible();
      await expect(card.name).toBeVisible();
      await expect(card.variant).toBeVisible();
      await expect(card.price).toBeVisible();
      await expect(card.comparePrice).toBeVisible();
      await expect(card.discount).toBeVisible();
      await expect(card.addButton).toBeVisible();
    });

    await test.step('Values are correct and nothing is a placeholder', async () => {
      await expect(card.genderTag).toHaveText(expected.tag);
      await expect(card.name).toHaveText(expected.name);
      await expect(card.variant).toHaveText(expected.variant);
      expect(await card.priceValue()).toBe(expected.price);
      expect(await card.comparePriceValue()).toBe(expected.comparePrice);
      await expect(card.discount).toHaveText(expected.discount);
      await expect(card.addButton).toHaveText(/add/i);

      // Rating drifts as reviews come in, so the format is asserted rather
      // than the sheet's snapshot value of "4.78 | 80 reviews".
      await expect(card.ratingCount).toHaveText(
        /^\d(\.\d+)?\s*\|\s*\d+\s*reviews$/,
      );
    });
  });

  test('GZ_PLP_03 - tapping a product card navigates to its detail page', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open(men.path);

    const expected = data.sampleProduct;
    const card = app.collection.cardByName(expected.name);
    const listedPrice = await card.priceValue();

    await test.step(`Open the ${expected.name} card image`, async () => {
      await card.openImage();
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('PDP shows the same name and the same selling price', async () => {
      await expect(page).toHaveURL(/\/products\//);
      await expect(app.product.title).toHaveText(
        new RegExp(expected.name, 'i'),
      );
      expect(await app.product.currentPrice()).toBe(expected.price);
      expect(await app.product.currentPrice()).toBe(listedPrice);
    });
  });

  test('GZ_PLP_04 - tapping ADD adds the product and increments the cart badge by one', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open(men.path);

    const card = app.collection.cardByName(data.sampleProduct.name);
    const before = await app.collection.header.cartCount();
    const urlBefore = page.url();

    await test.step('Tap ADD on the card', async () => {
      await card.addToCart();
    });

    await test.step('Badge increases by exactly one', async () => {
      await expect(app.collection.header.cartBadge).toHaveText(
        String(before + 1),
      );
      expect(await app.collection.header.cartCount()).toBe(before + 1);
    });

    await test.step('Shopper stays on the collection page', async () => {
      expect(page.url()).toBe(urlBefore);
      await expect(app.collection.grid).toBeVisible();
    });
  });

  test('GZ_PLP_05 - sort control lists all six sort options with the default pre-selected', async ({
    page,
  }) => {
    const app = createPages(page);
    // The sheet expects "Best Selling" pre-selected. That is the Shop All
    // default; the MEN collection defaults to "Featured" (see notes).
    await app.collection.open(shopAll.path);

    // ADAPTED: the sheet expects a slide-in panel of radio controls. That is
    // the mobile drawer; desktop renders the same six options as a dropdown.
    await test.step('Open the sort control', async () => {
      await app.collection.openSortMenu();
    });

    await test.step('All six options are listed in order', async () => {
      // The mobile sort drawer uppercases its labels via CSS.
      const labels = await app.collection.sortOptionLabels();
      expect(labels.map((label) => label.toLowerCase())).toEqual(
        data.sortOptions.map((label) => label.toLowerCase()),
      );
    });

    await test.step(`${shopAll.defaultSort} is pre-selected`, async () => {
      expect((await app.collection.selectedSortOption()).toLowerCase()).toBe(
        shopAll.defaultSort.toLowerCase(),
      );
      // The control's label and the menu's selected item must agree.
      await expect(app.collection.sortButton).toContainText(
        shopAll.defaultSort,
      );
    });
  });

  test('GZ_PLP_06 - Price (Low to High) orders the grid cheapest first', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open();

    await test.step('Sort by Price (Low to High)', async () => {
      await app.collection.sortBy('Price (Low to High)');
    });

    await test.step('Every price is >= the one before it', async () => {
      // The grid fills in as it scrolls, so the ordering is re-checked
      // until it holds rather than read once and judged.
      await expect(async () => {
        await app.collection.loadAllProducts();
        const prices = await app.collection.allPrices();

        expect(prices.length).toBeGreaterThan(3);
        expect(prices).toEqual([...prices].sort((a, b) => a - b));
        expect(prices[0]).toBe(Math.min(...prices));
      }).toPass({ timeout: 60_000 });
    });

    await test.step('Sort control reads the new value', async () => {
      expect(await app.collection.currentSort()).toBe('Price (Low to High)');
    });
  });

  test('GZ_PLP_07 - Price (High to Low) orders the grid most expensive first', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open();

    await test.step('Sort by Price (High to Low)', async () => {
      await app.collection.sortBy('Price (High to Low)');
    });

    await test.step('Prices descend and the dearest product leads', async () => {
      // One retried block: reading the grid twice let a late-arriving batch
      // land between the two reads.
      await expect(async () => {
        await app.collection.loadAllProducts();
        const prices = await app.collection.allPrices();

        expect(prices.length).toBeGreaterThan(3);
        expect(prices).toEqual([...prices].sort((a, b) => b - a));
        expect(prices[0]).toBe(data.highestPrice);
      }).toPass({ timeout: 60_000 });
    });
  });

  test('GZ_PLP_08 - filter panel opens with Notes, Price and Availability sections and Clear All', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open(men.path);

    await test.step('Open the filter panel', async () => {
      await app.collection.openFilterDrawer();
    });

    await test.step('Panel structure is correct', async () => {
      await expect(app.collection.filterDrawerTitle).toHaveText(/filters/i);
      await expect(app.collection.clearAllButton).toBeVisible();
      // CSS uppercases these labels, so compare case-insensitively.
      const labels = await app.collection.filterCategoryLabels();
      expect(labels.map((label) => label.toLowerCase())).toEqual(
        data.filterCategories.map((label) => label.toLowerCase()),
      );
      await expect(app.collection.applyFiltersButton).toBeVisible();
    });
  });

  test("GZ_PLP_09 - applying a single note filters the grid to that note's count", async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open(men.path);

    await app.collection.openFilterDrawer();
    await app.collection.selectFilterCategory('Notes');

    // The expected number is read from the filter's own count, so the test
    // does not go stale when the catalogue changes.
    const advertised = await app.collection.filterOptionCount(data.filterNote);

    await test.step(`Tick ${data.filterNote} and apply`, async () => {
      await app.collection.tickFilterOption(data.filterNote);
      await app.collection.applyFilters();
    });

    await test.step('Panel closes and the grid matches the advertised count', async () => {
      expect(await app.collection.isFilterDrawerOpen()).toBe(false);
      // The grid fills in as it scrolls, so the count is re-checked until
      // it settles rather than read once.
      await expect(async () => {
        expect(await app.collection.loadAllProducts()).toBe(advertised);
      }).toPass({ timeout: 60_000 });
    });

    await test.step('Toolbar reports one applied filter', async () => {
      await expect
        .poll(async () => app.collection.appliedFilterCount())
        .toBe(1);
    });
  });

  test('GZ_PLP_10 - applying a price range returns only products inside it', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open();

    const { from, to } = data.priceRange;

    await app.collection.openFilterDrawer();
    await app.collection.selectFilterCategory('Price');

    await test.step('Price hint advertises the highest catalogue price', async () => {
      expect(await app.collection.highestPriceHint()).toBe(data.highestPrice);
    });

    await test.step(`Enter ${from}-${to} and apply`, async () => {
      await app.collection.setPriceRange(from, to);
      await app.collection.applyFilters();
    });

    await test.step('Every returned price is inside the range', async () => {
      await expect(async () => {
        await app.collection.loadAllProducts();
        const prices = await app.collection.allPrices();

        expect(prices.length).toBeGreaterThan(0);
        for (const price of prices) {
          expect(price).toBeGreaterThanOrEqual(from);
          expect(price).toBeLessThanOrEqual(to);
        }
        expect(prices).not.toContain(data.highestPrice);
      }).toPass({ timeout: 60_000 });
    });
  });

  test('GZ_PLP_11 - applying the In stock filter returns exactly its stated count', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open();

    await app.collection.openFilterDrawer();
    await app.collection.selectFilterCategory('Availability');

    const advertised = await app.collection.filterOptionCount('In stock');

    await test.step('Tick In stock and apply', async () => {
      await app.collection.tickFilterOption('In stock');
      await app.collection.applyFilters();
    });

    await test.step('Grid matches the advertised count', async () => {
      await expect(async () => {
        expect(await app.collection.loadAllProducts()).toBe(advertised);
      }).toPass({ timeout: 60_000 });
    });

    await test.step('Every card offers an active ADD button', async () => {
      const cards = await app.collection.productCount();
      for (let index = 0; index < cards; index += 1) {
        await expect(app.collection.card(index).addButton).toBeEnabled();
      }
    });

    await test.step('Toolbar reports one applied filter', async () => {
      await expect
        .poll(async () => app.collection.appliedFilterCount())
        .toBe(1);
    });
  });

  test('GZ_PLP_12 - Clear All removes every applied filter and restores the collection', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.collection.open();

    const unfiltered =
      await test.step('Note the unfiltered product count', async () =>
        app.collection.loadAllProducts());

    await test.step('Apply a note filter and a price range', async () => {
      await app.collection.openFilterDrawer();
      await app.collection.selectFilterCategory('Notes');
      await app.collection.tickFilterOption(data.filterNote);
      await app.collection.applyFilters();

      await app.collection.openFilterDrawer();
      await app.collection.selectFilterCategory('Price');
      await app.collection.setPriceRange(
        data.priceRange.from,
        data.priceRange.to,
      );
      await app.collection.applyFilters();

      await expect
        .poll(async () => app.collection.appliedFilterCount())
        .toBeGreaterThan(0);
    });

    await test.step('Reopen the panel and tap Clear All', async () => {
      await app.collection.openFilterDrawer();
      await app.collection.clearFilters();
    });

    await test.step('Grid returns to the unfiltered count and nothing is applied', async () => {
      await expect(async () => {
        expect(await app.collection.loadAllProducts()).toBe(unfiltered);
      }).toPass({ timeout: 60_000 });
      await expect
        .poll(async () => app.collection.appliedFilterCount())
        .toBe(0);
    });

    await test.step('Checkboxes are cleared and price inputs are empty', async () => {
      await app.collection.openFilterDrawer();
      await app.collection.selectFilterCategory('Notes');
      expect(await app.collection.checkedFilterCount()).toBe(0);

      await app.collection.selectFilterCategory('Price');
      expect(await app.collection.priceRangeValues()).toEqual({
        from: '',
        to: '',
      });
    });
  });
});
