/**
 * PDP suite — automates GUZZ_QA_TestCases_AllModules "07 PLP Collection" PDP rows.
 * 10 test cases, renumbered GZ_PDP_01..10.
 * Sheet serial numbers, in the same order: GZ_PDP_001..010.
 *
 * Runs on desktop Chrome. GZ_PDP_01 adapts one mobile-only expectation
 * (sticky action bar / gallery dots) — see the note there.
 *
 *   npx playwright test tests/pdp.spec.ts --headed --workers=1
 */
import { expect, test } from '@playwright/test';
import { brand } from '../src/brand.config';
import { createPages, escapeRegExp, settledScrollY } from '../src/pages';

/** CSS uppercases many labels, so names are compared case-insensitively. */
const caseless = (values: string[]): string[] =>
  values.map((value) => value.toLowerCase());

const pdp = brand.data.pdp;
const men = brand.data.collections.men;

test.describe(`${brand.name} product detail page @smoke`, () => {
  test('GZ_PDP_01 - PDP loads with gallery, title block, price block, sections and action bar', async ({
    page,
  }) => {
    const app = createPages(page);

    await test.step('Open the product from the MEN collection', async () => {
      await app.collection.open(men.path);
      await app.collection.cardByName(pdp.name).open();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(new RegExp(`/products/${pdp.handle}`));
    });

    await test.step('Gallery is shown', async () => {
      await expect(app.product.gallery).toBeVisible();
      // Dot indicators are the mobile gallery control; desktop shows
      // prev/next arrows instead. Either is a valid way to page it.
      await expect(app.product.galleryDots).toBeAttached();
      await expect(app.product.galleryNavigation).toBeVisible();
    });

    await test.step('Title block shows title, wishlist, share, subtitle and rating', async () => {
      await expect(app.product.title).toHaveText(new RegExp(pdp.name, 'i'));
      await expect(app.product.wishlistButton).toBeVisible();
      await expect(app.product.shareButton).toBeVisible();
      await expect(app.product.subtitle).toBeVisible();
      await expect(app.product.rating).toBeVisible();
    });

    await test.step('Price block and quantity stepper are shown', async () => {
      await expect(app.product.price).toBeVisible();
      await expect(app.product.quantityValue).toHaveText('1');
    });

    await test.step('USP row and content sections are shown', async () => {
      await expect(app.product.uspRow).toBeVisible();
      expect(await app.product.uspItems.count()).toBeGreaterThan(0);
      await expect(app.product.bundleTitle).toHaveText(
        new RegExp(pdp.sections.bundle, 'i'),
      );
      await expect(app.product.keyNotesTitle).toHaveText(
        new RegExp(pdp.sections.keyNotes, 'i'),
      );
      expect(caseless(await app.product.accordionTitles())).toEqual(
        caseless(pdp.accordions),
      );
      await expect(app.product.heritageTitle).toHaveText(
        new RegExp(pdp.sections.heritage, 'i'),
      );
    });

    await test.step('Reviews and recommendations render below the fold', async () => {
      await app.product.scrollThroughPage();
      await expect(app.product.reviewsTitle).toHaveText(
        new RegExp(pdp.sections.reviews, 'i'),
      );
      await expect(app.product.recommendationsTitle).toHaveText(
        new RegExp(pdp.sections.recommendations, 'i'),
      );
    });

    await test.step('Action bar offers ADD TO CART and BUY NOW', async () => {
      // ADAPTED: the sticky bar is mobile-only; on desktop the same two
      // CTAs sit in the product info block.
      await expect(app.product.stickyBar).toBeAttached();
      await expect(app.product.addToCartButton).toBeVisible();
      await expect(app.product.buyNowButton).toBeVisible();
    });
  });

  test('GZ_PDP_02 - price block shows price, MRP, discount and the inclusive tax note', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.product.open();

    await test.step('Selling price and struck-through MRP are correct', async () => {
      expect(await app.product.currentPrice()).toBe(pdp.price);
      expect(await app.product.compareAtPrice()).toBe(pdp.comparePrice);
      await expect(app.product.comparePrice).toHaveCSS(
        'text-decoration-line',
        'line-through',
      );
    });

    await test.step('Discount badge is correct and matches the two prices', async () => {
      await expect(app.product.discountBadge).toHaveText(pdp.discount);

      const advertised = await app.product.advertisedDiscount();
      const actual = ((pdp.comparePrice - pdp.price) / pdp.comparePrice) * 100;
      expect(advertised).toBeCloseTo(Math.round(actual), 0);
    });

    await test.step('Inclusive tax note is shown below the price', async () => {
      await expect(app.product.taxNote).toHaveText(
        new RegExp(pdp.taxNote, 'i'),
      );
    });
  });

  test('GZ_PDP_03 - ADD TO CART adds the product and increments the cart badge by one', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.product.open();

    const before = await app.product.header.cartCount();
    const urlBefore = page.url();

    const cart = await test.step('Tap ADD TO CART', async () =>
      app.product.addToCart());

    await test.step('Confirmation shows the product in the cart', async () => {
      expect(await cart.lineCount()).toBe(1);
      expect((await cart.lineName(0)).toLowerCase()).toBe(
        pdp.name.toLowerCase(),
      );
      expect(await cart.linePrice(0)).toBe(pdp.price);
    });

    await test.step('Badge increases by exactly one', async () => {
      await cart.close();
      await expect(app.product.header.cartBadge).toHaveText(String(before + 1));
    });

    await test.step('Shopper remains on the product page', async () => {
      expect(page.url()).toBe(urlBefore);
      await expect(app.product.title).toBeVisible();
    });
  });

  test('GZ_PDP_04 - BUY NOW goes straight to checkout with that product in the order', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.product.open();

    const checkout = await test.step('Tap BUY NOW', async () =>
      app.product.buyNow());

    // Which checkout opens is the browser's choice, not the test's: GoKwik
    // overlays the storefront in Chromium, while WebKit gets Shopify's own
    // hosted checkout because GoKwik never engages there.
    const flavour = await checkout.flavour();

    await test.step('Checkout opens with an order summary', async () => {
      if (flavour === 'gokwik') {
        await expect(checkout.frameElement).toBeVisible();
        await expect(checkout.orderSummary).toContainText(/order summary/i);
      }

      await expect(async () =>
        expect(await checkout.lineItemsText()).toMatch(
          new RegExp(escapeRegExp(pdp.name), 'i'),
        ),
      ).toPass();
    });

    await test.step('Order summary reconciles with one item at the product price', async () => {
      expect(await checkout.itemCount()).toBe(1);
      expect(await checkout.payableAmount()).toBe(pdp.price);

      // Only GoKwik shows the struck-through original; Shopify's checkout
      // carries no compare-at price to assert against.
      if (flavour === 'gokwik') {
        await expect(checkout.originalPrice).toContainText(
          String(pdp.comparePrice.toLocaleString('en-IN')),
        );
      }
    });

    await test.step('The cart page was skipped', async () => {
      expect(page.url()).not.toContain('/cart');
    });
  });

  test('GZ_PDP_05 - ADD BUNDLE adds the bundle at the bundle price, not the sum of its products', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.product.open();

    await test.step('Bundle card advertises the bundle price', async () => {
      await expect(app.product.bundleName).toHaveText(
        new RegExp(`^${escapeRegExp(pdp.bundle.name)}$`, 'i'),
      );
      expect(await app.product.bundlePriceValue()).toBe(pdp.bundle.price);
      expect(await app.product.bundleComparePriceValue()).toBe(
        pdp.bundle.comparePrice,
      );
    });

    const cart = await test.step('Tap ADD BUNDLE', async () =>
      app.product.addBundle());

    await test.step('Cart holds the bundle at the bundle price', async () => {
      expect(await cart.lineCount()).toBe(1);
      expect(await cart.lineName(0)).toMatch(
        new RegExp(`^${escapeRegExp(pdp.bundle.name)}$`, 'i'),
      );
      expect(await cart.linePrice(0)).toBe(pdp.bundle.price);
    });

    await test.step('Order summary total is the bundle price, not the sum', async () => {
      await app.cart.open();
      expect(await app.cart.estimatedTotal()).toBe(pdp.bundle.price);
      expect(await app.cart.estimatedTotal()).not.toBe(pdp.bundle.comparePrice);
      await expect(app.cart.summaryTitle).toHaveText(/order summary/i);
    });
  });

  test('GZ_PDP_06 - DESCRIPTION accordion expands to reveal the description text', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.product.open();

    const row = pdp.accordions[0];

    await test.step(`${row} starts collapsed`, async () => {
      expect(await app.product.isAccordionOpen(row)).toBe(false);
      await expect(app.product.accordionBody(row)).toBeHidden();
    });

    await test.step(`Tap ${row}`, async () => {
      await app.product.expandAccordion(row);
    });

    await test.step('Body text is revealed and the row is marked expanded', async () => {
      await expect(app.product.accordionBody(row)).toBeVisible();
      await expect(app.product.accordionHeader(row)).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      // Not a placeholder or an empty block.
      const body = await app.product.text(app.product.accordionContent(row));
      expect(body.length).toBeGreaterThan(30);
    });
  });

  // The Judge.me widget is third-party and fails to render when several
  // browsers request it at once, so these two run one at a time instead
  // of in parallel with each other.
  test.describe('reviews', () => {
    test.describe.configure({ mode: 'default' });

    test('GZ_PDP_07 - CUSTOMER REVIEWS shows the average, total count and star histogram', async ({
      page,
    }) => {
      // Judge.me is third-party and can take ~25s to mount when several
      // tests hit it at once, which overruns the default 30s budget.
      test.slow();

      const app = createPages(page);
      await app.product.open();
      await app.product.waitForReviewsWidget();

      await test.step('Summary shows stars, average and a verified count', async () => {
        await expect(app.product.reviewsSummaryStars).toBeVisible();
        await expect(app.product.reviewsAverage).toHaveText(
          /^[\d.]+ out of 5$/,
        );
        await expect(app.product.reviewsCountText).toHaveText(
          /Based on \d+ reviews/,
        );
        await expect(app.product.reviewsVerifiedBadge).toBeVisible();
      });

      await test.step('Average in the text matches the stars aria-label', async () => {
        const average = await app.product.reviewsAverageValue();
        await expect(app.product.reviewsSummaryStars).toHaveAttribute(
          'aria-label',
          new RegExp(`${average}`),
        );
        expect(average).toBeGreaterThan(0);
        expect(average).toBeLessThanOrEqual(5);
      });

      await test.step('Histogram has five rows that sum to the total review count', async () => {
        // The sheet's snapshot (4.77, 26 reviews, 20/6/0/0/0) drifts as
        // reviews arrive, so the invariant is asserted instead.
        await expect(app.product.reviewHistogramRows).toHaveCount(5);

        const histogram = await app.product.reviewHistogram();
        const total = histogram.reduce((sum, value) => sum + value, 0);
        expect(total).toBe(await app.product.reviewsTotalCount());
      });
    });

    test('GZ_PDP_08 - WRITE A REVIEW opens the review form with all its controls', async ({
      page,
    }) => {
      // See GZ_PDP_07 - the review widget is slow to mount under load.
      test.slow();

      const app = createPages(page);
      await app.product.open();

      await test.step('Tap WRITE A REVIEW', async () => {
        await app.product.openReviewForm();
      });

      await test.step('Form shows a five star rating selector', async () => {
        await expect(app.product.reviewFormRatingStars).toHaveCount(5);
        await expect(app.product.reviewFormRatingStars.first()).toHaveAttribute(
          'role',
          'radio',
        );
      });

      await test.step('Form shows content, upload, name, format and email fields', async () => {
        await expect(app.product.reviewFormBody).toBeVisible();
        await expect(app.product.reviewFormMediaUpload).toBeVisible();
        await expect(app.product.reviewFormDisplayName).toBeVisible();
        await expect(app.product.reviewFormNameFormat).toBeVisible();
        await expect(app.product.reviewFormEmail).toBeVisible();
      });

      await test.step('Form shows the data usage note and a submit button', async () => {
        await expect(app.product.reviewForm).toContainText(
          /how we use your data/i,
        );
        await expect(app.product.reviewFormSubmitButton).toBeVisible();
        await expect(app.product.reviewFormSubmitButton).toBeEnabled();
      });

      // The form is only inspected - submitting would post a real review to
      // the live store.
    });
  });

  test('GZ_PDP_09 - tapping a recommendation card navigates to that product', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.product.open();
    await app.product.recommendations.scrollIntoViewIfNeeded();

    // The rail is personalised and rotates, so the card under test is read
    // from the DOM rather than pinned to the sheet's MIDNIGHT WOODS, which
    // is not always offered.
    const card = app.product.recommendationCards.first();
    const name = (await card.locator('.product-card-name').innerText()).trim();
    const listedPrice = await app.product.recommendationCard(name).priceValue();

    await test.step('Recommendations rail lists products', async () => {
      await expect(app.product.recommendationsTitle).toBeVisible();
      expect(await app.product.recommendationCards.count()).toBeGreaterThan(0);
      expect(name.length).toBeGreaterThan(0);
    });

    // Grab the destination first: this is a client-side route change, so
    // waiting on a load state returns immediately and reads the old page.
    const href = await app.product
      .recommendationCard(name)
      .link.getAttribute('href');

    await test.step(`Open the ${name} card`, async () => {
      await app.product.recommendationCard(name).openImage();
      await page.waitForURL(new RegExp(escapeRegExp(href!)));
    });

    await test.step('That product page loads with its own title and price', async () => {
      await expect(page).toHaveURL(new RegExp(escapeRegExp(href!)));
      await expect(app.product.title).toHaveText(new RegExp(name, 'i'));
      await expect(app.product.gallery).toBeVisible();
      expect(await app.product.currentPrice()).toBe(listedPrice);
    });
  });

  test('GZ_PDP_10 - tapping ADD on a recommendation card adds it and increments the badge', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.product.open();
    await app.product.recommendations.scrollIntoViewIfNeeded();

    // As in GZ_PDP_09, the rail is personalised - read the card, do not
    // pin a product name.
    const card = app.product.recommendationCards.first();
    const name = (await card.locator('.product-card-name').innerText()).trim();
    const listedPrice = await app.product.recommendationCard(name).priceValue();

    const before = await app.product.header.cartCount();
    const urlBefore = page.url();
    const scrollBefore = await settledScrollY(page);

    await test.step(`Tap ADD on the ${name} card`, async () => {
      await app.cartDrawer.openAfterAdd(() =>
        app.product.recommendationCard(name).addToCart(),
      );
    });

    await test.step('That product is added and the badge increases by one', async () => {
      const cart = app.cartDrawer;
      await cart.waitUntilOpen();
      expect((await cart.lineName(0)).toLowerCase()).toBe(name.toLowerCase());
      expect(await cart.linePrice(0)).toBe(listedPrice);
      await cart.close();
      await expect(app.product.header.cartBadge).toHaveText(String(before + 1));
    });

    await test.step('Shopper stays on the same page at the same scroll position', async () => {
      expect(page.url()).toBe(urlBefore);
      // Read once the restore animation has finished, and judge it against
      // the viewport: the shopper should still be looking at the same part
      // of the page, which a fixed pixel budget does not express.
      const scrollAfter = await settledScrollY(page);
      const viewport = page.viewportSize()?.height ?? 800;
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(viewport / 2);
    });
  });
});
