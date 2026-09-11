/**
 * Home suite — automates the GZ_HOME rows of the QA sheet.
 * 12 test cases, renumbered GZ_HOME_01..12.
 * Sheet serial numbers, in the same order: GZ_HOME_POS_001, 009, 013, 019,
 * 022, 023, 029, 038, 039, 043, 044, 051.
 *
 * Runs on desktop Chrome. The hero and "shop by note" carousels advance on
 * their own, so those cases act on whichever slide is showing rather than
 * pinning one - see the notes on GZ_HOME_02 and GZ_HOME_12.
 *
 *   npx playwright test tests/home.spec.ts --headed --workers=1
 */
import { expect, test } from '@playwright/test';
import { brand } from '../src/brand.config';
import { createPages, loadStatus } from '../src/pages';

const home = brand.data.home;

/** Compares ignoring case and spacing. */
const loose = (value: string): string =>
  value.replace(/\s+/g, '').toLowerCase();

test.describe(`${brand.name} home page @smoke`, () => {
  test('GZ_HOME_01 - every section renders in order from the announcement strip to the footer', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();

    await test.step('Scroll the whole page so lazy sections render', async () => {
      await app.home.section('footer').scrollIntoViewIfNeeded();
      await expect(app.home.section('footer')).toBeVisible();
      await page.keyboard.press('Home');
    });

    await test.step('Every section is present and not empty', async () => {
      for (const name of home.sectionOrder) {
        await expect(app.home.section(name)).toBeVisible();
        // Height, not text: the hero and the lifestyle tiles are artwork.
        expect(await app.home.sectionHeight(name)).toBeGreaterThan(0);
      }
    });

    await test.step('Sections appear top to bottom in the expected order', async () => {
      const positions = await app.home.sectionPositions(home.sectionOrder);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    await test.step('Named sections carry their expected headings', async () => {
      await expect(app.home.bestsellersTitle).toHaveText(
        new RegExp(home.sections.bestsellers, 'i'),
      );
      await expect(app.home.craftingTitle).toHaveText(
        new RegExp(home.sections.crafting, 'i'),
      );
      await expect(app.home.discoverTitle).toHaveText(
        new RegExp(home.sections.discover, 'i'),
      );
      await expect(app.home.notesTitle).toHaveText(
        new RegExp(home.sections.notes, 'i'),
      );
      await expect(app.home.perfumersTitle).toHaveText(
        new RegExp(home.sections.perfumers, 'i'),
      );
    });
  });

  test('GZ_HOME_02 - hero carousel renders a slide with its call to action and indicators', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();

    await test.step('Hero shows a slide image', async () => {
      await expect(app.home.hero).toBeVisible();
      await expect(app.home.heroImages.first()).toBeVisible();
      await expect(app.home.heroSlides).toHaveCount(home.heroSlideCount);
    });

    await test.step('Slide indicators are shown with exactly one active', async () => {
      await expect(app.home.heroDots).toHaveCount(home.heroSlideCount);
      expect(await app.home.activeHeroDots()).toBe(1);
    });

    await test.step('The visible slide is a link to a destination', async () => {
      // ADAPTED: the sheet expects a headline and a SHOP NOW button. This
      // hero has neither as elements - the artwork carries the wording and
      // the whole slide is the call to action.
      const slide = await app.home.activeHeroSlide();
      await expect(slide).toHaveAttribute('href', /.+/);
    });
  });

  test('GZ_HOME_03 - tapping the hero slide opens its configured destination', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();

    const slide = await app.home.activeHeroSlide();
    const href = await slide.getAttribute('href');
    expect(href).toBeTruthy();

    await test.step('Tap the visible hero slide', async () => {
      await slide.click();
      await page.waitForURL(new RegExp(href!));
    });

    await test.step('The destination listing loads with products', async () => {
      await expect(page).toHaveURL(new RegExp(href!));
      await expect(app.collection.productCards.first()).toBeVisible();
    });

    await test.step('That URL answers with HTTP 200', async () => {
      const status = await loadStatus(
        page,
        new URL(href!, brand.baseUrl).toString(),
      );
      expect(status).toBe(200);
    });
  });

  test('GZ_HOME_04 - BESTSELLERS renders its heading, View All link and a row of cards', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.bestsellers.scrollIntoViewIfNeeded();

    await test.step('Heading and underlined View All link are shown', async () => {
      await expect(app.home.bestsellersTitle).toHaveText(
        new RegExp(home.sections.bestsellers, 'i'),
      );
      await expect(app.home.bestsellersViewAll).toBeVisible();
      await expect(app.home.bestsellersViewAll).toHaveCSS(
        'text-decoration-line',
        'underline',
      );
    });

    await test.step('At least two product cards are shown in a row', async () => {
      expect(await app.home.bestsellerCards.count()).toBeGreaterThanOrEqual(2);
      await expect(app.home.bestsellerCards.first()).toBeVisible();
    });
  });

  test('GZ_HOME_05 - tapping a bestseller card opens that product detail page', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.bestsellers.scrollIntoViewIfNeeded();

    const expected = home.bestseller;
    const card = app.home.bestsellerCard(expected.name);
    const listedPrice = await card.priceValue();

    await test.step(`Tap the ${expected.name} card image`, async () => {
      await card.openImage();
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

  test('GZ_HOME_06 - tapping ADD on a bestseller card adds it and increments the badge', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.bestsellers.scrollIntoViewIfNeeded();

    const expected = home.bestseller;
    const before = await app.home.header.cartCount();
    const urlBefore = page.url();
    const scrollBefore = await page.evaluate(() => Math.round(window.scrollY));

    await test.step(`Tap ADD on the ${expected.name} card`, async () => {
      await app.home.bestsellerCard(expected.name).addToCart();
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

    await test.step('Badge increases by one with no reload or scroll jump', async () => {
      await expect(app.home.header.cartBadge).toHaveText(String(before + 1));
      expect(page.url()).toBe(urlBefore);
      const scrollAfter = await page.evaluate(() => Math.round(window.scrollY));
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(150);
    });
  });

  test('GZ_HOME_07 - View All beside BESTSELLERS opens the full product listing', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.bestsellers.scrollIntoViewIfNeeded();

    const railCount = await app.home.bestsellerCards.count();
    const href = await app.home.bestsellersViewAll.getAttribute('href');

    await test.step('Tap View All', async () => {
      await app.home.bestsellersViewAll.click();
      await page.waitForURL(new RegExp(href!));
    });

    await test.step('Listing shows at least as many products as the rail', async () => {
      await expect(app.collection.productCards.first()).toBeVisible();
      expect(await app.collection.loadAllProducts()).toBeGreaterThanOrEqual(
        railCount,
      );
    });

    await test.step('That URL answers with HTTP 200', async () => {
      const status = await loadStatus(
        page,
        new URL(href!, brand.baseUrl).toString(),
      );
      expect(status).toBe(200);
    });
  });

  test('GZ_HOME_08 - tapping a discovery set card opens that product detail page', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.discover.scrollIntoViewIfNeeded();

    const expected = home.discoverySets[1];
    const card = app.home.discoverCard(expected.name);
    const listedPrice = await card.priceValue();

    await test.step(`Tap the ${expected.name} card image`, async () => {
      await card.openImage();
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

  test('GZ_HOME_09 - tapping ADD on a discovery set card adds it and increments the badge', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.discover.scrollIntoViewIfNeeded();

    const expected = home.discoverySets[0];
    const before = await app.home.header.cartCount();
    const urlBefore = page.url();
    const scrollBefore = await page.evaluate(() => Math.round(window.scrollY));

    await test.step(`Tap ADD on the ${expected.name} card`, async () => {
      await app.home.discoverCard(expected.name).addToCart();
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

    await test.step('Badge increases by one and the page does not jump', async () => {
      await expect(app.home.header.cartBadge).toHaveText(String(before + 1));
      expect(page.url()).toBe(urlBefore);
      const scrollAfter = await page.evaluate(() => Math.round(window.scrollY));
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(150);
    });
  });

  for (const tile of home.genderTiles) {
    const id = tile.label === 'SHOP MEN' ? 'GZ_HOME_10' : 'GZ_HOME_11';

    test(`${id} - tapping ${tile.label} opens that collection`, async ({
      page,
    }) => {
      const app = createPages(page);
      await app.home.open();
      await app.home.genderTiles.scrollIntoViewIfNeeded();

      await test.step(`Tap ${tile.label}`, async () => {
        await app.home.genderTile(tile.label).click();
        await page.waitForURL(new RegExp(tile.path));
      });

      await test.step('The collection loads with products', async () => {
        await expect(page).toHaveURL(new RegExp(tile.path));
        await expect(app.collection.productCards.first()).toBeVisible();
      });

      await test.step('That URL answers with HTTP 200', async () => {
        const status = await loadStatus(
          page,
          new URL(tile.path, brand.baseUrl).toString(),
        );
        expect(status).toBe(200);
      });
    });
  }

  test('GZ_HOME_12 - tapping a SHOP BY NOTE product opens that product detail page', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.home.waitForNotes();

    // The note carousel rotates on its own, so the test acts on whichever
    // note is showing rather than pinning the sheet's IRIS SANTAL.
    const noteName = await app.home.activeNoteName();
    const link = app.home.activeNoteLink();
    const href = await link.getAttribute('href');

    await test.step(`Tap the ${noteName} note`, async () => {
      await link.click();
      await page.waitForURL(new RegExp(href!));
    });

    await test.step('Product page loads with the matching name and a price', async () => {
      await expect(page).toHaveURL(/\/products\//);
      expect(loose(await app.product.productName())).toContain(loose(noteName));
      await expect(app.product.price).toContainText(brand.currencySymbol);
      expect(await app.product.currentPrice()).toBeGreaterThan(0);
    });
  });
});
