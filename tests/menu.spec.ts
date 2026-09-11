/**
 * Navigation menu suite — automates the GZ_MENU rows of the QA sheet.
 * 5 test cases, renumbered GZ_MENU_01..05.
 * Sheet serial numbers, in the same order: GZ_MENU_POS_017..021.
 *
 * Runs on every project. The sheet drives a mobile hamburger drawer: "tap
 * the hamburger icon, then tap the link, the drawer closes" — which is what
 * happens on the mobile projects. On desktop there is no drawer: the
 * hamburger is display:none and the links sit in the always-visible header
 * nav, so that expectation is checked against the desktop equivalent.
 *
 *   npx playwright test tests/menu.spec.ts --headed --workers=1
 */
import { expect, test } from '@playwright/test';
import { brand } from '../src/brand.config';
import { createPages, loadStatus } from '../src/pages';

const menu = brand.data.menu;

/** Ignores case, spacing and curly-vs-straight apostrophes. */
const normalise = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

test.describe(`${brand.name} navigation menu @smoke`, () => {
  for (const [index, entry] of menu.categories.entries()) {
    const id = `GZ_MENU_0${index + 1}`;

    test(`${id} - tapping ${entry.label} opens that collection`, async ({
      page,
    }) => {
      const app = createPages(page);

      // GZ_MENU_05 compares Shop All against the single collections, so
      // their counts are taken first.
      const otherCounts: Record<string, number> = {};

      if (entry.label === menu.shopAllLabel) {
        for (const other of menu.categories.filter(
          (candidate) =>
            candidate.label === 'Men' || candidate.label === 'Women',
        )) {
          await test.step(`Count the ${other.label} collection`, async () => {
            await app.collection.open(other.path);
            otherCounts[other.label] = await app.collection.loadAllProducts();
            expect(otherCounts[other.label]).toBeGreaterThan(0);
          });
        }
      }

      await app.home.open();

      const onMobile = await app.home.header.isMobileLayout();

      await test.step('The category link is reachable for this viewport', async () => {
        if (onMobile) {
          // The sheet's flow: tap the hamburger, then the link.
          await expect(app.home.header.menuButton).toBeVisible();
          await app.home.header.openMenu();
          await expect(app.home.header.drawerLink(entry.label)).toBeVisible();
        } else {
          // ADAPTED: no drawer at this width; the links sit in the header.
          await expect(app.home.header.nav).toBeVisible();
          await expect(app.home.header.menuButton).toBeHidden();
          await expect(app.home.header.navLink(entry.label)).toBeVisible();
        }
      });

      await test.step(`Tap ${entry.label}`, async () => {
        await app.home.header.navigateTo(entry.label);
        await page.waitForURL(new RegExp(entry.path));
      });

      if (onMobile) {
        await test.step('The drawer closes on navigation', async () => {
          expect(await app.home.header.isMenuOpen()).toBe(false);
        });
      }

      await test.step('The collection loads with its heading and products', async () => {
        await expect(page).toHaveURL(new RegExp(entry.path));
        expect(normalise(await app.collection.text(app.collection.title))).toBe(
          normalise(entry.title),
        );
        await expect(app.collection.productCards.first()).toBeVisible();
      });

      await test.step('That URL answers with HTTP 200', async () => {
        const status = await loadStatus(
          page,
          new URL(entry.path, brand.baseUrl).toString(),
        );
        expect(status).toBe(200);
      });

      if (entry.label === menu.comboLabel) {
        await test.step('Every product is a combo or set, not a single bottle', async () => {
          expect(await app.collection.loadAllProducts()).toBeGreaterThan(0);

          // A single bottle advertises a size variant such as
          // "50ml | notes"; a combo or gift set does not.
          const variants = await app.collection.productCards
            .locator(brand.selectors.productCard.variant)
            .allInnerTexts();

          for (const variant of variants) {
            expect(variant.trim()).not.toMatch(
              new RegExp(menu.singleBottleVariant, 'i'),
            );
          }
        });
      }

      if (entry.label === menu.shopAllLabel) {
        await test.step('It holds at least as many products as each single collection', async () => {
          const total = await app.collection.loadAllProducts();

          for (const [label, count] of Object.entries(otherCounts)) {
            expect(total, `${entry.label} vs ${label}`).toBeGreaterThanOrEqual(
              count,
            );
          }
        });
      }
    });
  }
});
