/**
 * Cart suite — automates the GZ_CART rows of the QA sheet.
 * 11 test cases, renumbered GZ_CART_01..11.
 * Sheet serial numbers, in the same order: GZ_CART_POS_001, 004, 005, 009,
 * 010, 015, 018, 019, 029, 037, 047.
 *
 * The sheet describes the slide-out cart drawer, not the /cart page: the
 * back chevron, prepaid pill and "more from the lineage" rail only exist
 * there. Tests target the drawer opened from the header cart icon.
 *
 *   npx playwright test tests/cart.spec.ts --headed --workers=1
 */
import { expect, test } from '@playwright/test';
import { brand } from '../src/brand.config';
import { createPages, loadStatus, type App } from '../src/pages';

/** Compares ignoring case and spacing, e.g. "50ml" against "50 ML EDP". */
const loose = (value: string): string =>
  value.replace(/\s+/g, '').toLowerCase();

const cart = brand.data.cart;
const product = cart.product;

/** Adds a product from its PDP and returns the open cart drawer. */
async function addProduct(app: App, handle: string) {
  await app.product.open(handle);
  return app.product.addToCart();
}

test.describe(`${brand.name} cart @smoke`, () => {
  test('GZ_CART_01 - cart opens showing the line item, upsell row, summary and checkout bar', async ({
    page,
  }) => {
    const app = createPages(page);

    await test.step(`Add ${product.name} to the cart`, async () => {
      const drawer = await addProduct(app, product.handle);
      await drawer.close();
    });

    await test.step('Header badge shows 1', async () => {
      await expect(app.header.cartBadge).toHaveText('1');
    });

    const drawer = await test.step('Tap the header cart icon', async () =>
      app.header.openCart());

    await test.step('Header shows the back chevron, bag icon and prepaid pill', async () => {
      await expect(drawer.backButton).toBeVisible();
      await expect(drawer.bagIcon).toBeVisible();
      await expect(drawer.prepaidPill).toHaveText(/prepaid/i);
    });

    await test.step('Line item is listed', async () => {
      expect(await drawer.lineCount()).toBe(1);
      expect(await drawer.lineName(0)).toMatch(new RegExp(product.name, 'i'));
    });

    await test.step('Upsell rail and trust strip are shown', async () => {
      await expect(drawer.upsellTitle).toHaveText(/more from the lineage/i);
      expect(await drawer.upsellCards.count()).toBeGreaterThan(0);
      await expect(drawer.trustStrip).toBeVisible();
    });

    await test.step('Order summary and the sticky checkout bar are shown', async () => {
      await expect(drawer.summaryTitle).toHaveText(/order summary/i);
      await expect(drawer.checkoutBar).toBeVisible();
      expect(await drawer.itemCountValue()).toBe(1);
      expect(await drawer.totalAmount()).toBe(product.price);
      await expect(drawer.checkoutButton).toHaveText(/checkout/i);
    });
  });

  test('GZ_CART_02 - an empty cart shows the empty message and the shop all call to action', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();

    await test.step('Badge shows nothing for a fresh session', async () => {
      expect(await app.header.cartCount()).toBe(0);
    });

    const drawer = await test.step('Tap the header cart icon', async () =>
      app.header.openCart());

    await test.step('Empty message and call to action are shown', async () => {
      await expect(drawer.emptyTitle).toHaveText(/your cart is empty/i);
      await expect(drawer.emptySubtitle).toBeVisible();
      await expect(drawer.emptyCta).toHaveText(/shop all fragrances/i);
    });

    await test.step('No line item, summary or checkout bar is rendered', async () => {
      expect(await drawer.lineCount()).toBe(0);
      await expect(drawer.summary).toBeHidden();
      await expect(drawer.checkoutBar).toBeHidden();
    });
  });

  test('GZ_CART_03 - SHOP ALL FRAGRANCES on the empty cart opens the full catalogue', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();

    const drawer = await app.header.openCart();
    await expect(drawer.emptyCta).toBeVisible();

    const href = await drawer.emptyCta.getAttribute('href');

    await test.step('Tap SHOP ALL FRAGRANCES', async () => {
      await drawer.emptyCta.click();
      await page.waitForURL(new RegExp(brand.paths.allProducts));
    });

    await test.step('Catalogue listing loads with products', async () => {
      await expect(page).toHaveURL(new RegExp(brand.paths.allProducts));
      await expect(app.collection.productCards.first()).toBeVisible();
    });

    await test.step('That URL answers with HTTP 200', async () => {
      // The tap is a client-side route change, so there is no document
      // response to inspect - the status comes from loading the URL.
      const status = await loadStatus(
        page,
        new URL(href ?? brand.paths.allProducts, brand.baseUrl).toString(),
      );
      expect(status).toBe(200);
    });
  });

  test('GZ_CART_04 - a cart line shows thumbnail, name, variant, prices, delete and stepper', async ({
    page,
  }) => {
    const app = createPages(page);
    const drawer = await addProduct(app, product.handle);

    await test.step('Every line element is present', async () => {
      await expect(drawer.lineImage(0)).toBeVisible();
      await expect(drawer.lineNameLink(0)).toBeVisible();
      await expect(drawer.lineVariant(0)).toBeVisible();
      await expect(drawer.lineComparePrice(0)).toBeVisible();
      await expect(drawer.lineRemoveButton(0)).toBeVisible();
      await expect(drawer.quantityValue(0)).toBeVisible();
      await expect(drawer.increaseQuantityButton(0)).toBeVisible();
      await expect(drawer.decreaseQuantityButton(0)).toBeVisible();
    });

    await test.step('Values are correct', async () => {
      expect(await drawer.lineName(0)).toMatch(new RegExp(product.name, 'i'));
      await expect(drawer.lineVariant(0)).toHaveText(
        new RegExp(product.variant, 'i'),
      );
      expect(await drawer.linePrice(0)).toBe(product.price);
      expect(await drawer.priceOf(drawer.lineComparePrice(0))).toBe(
        product.comparePrice,
      );
      await expect(drawer.lineComparePrice(0)).toHaveCSS(
        'text-decoration-line',
        'line-through',
      );
      expect(await drawer.quantity(0)).toBe(1);
    });
  });

  test('GZ_CART_05 - tapping the line item name opens that product detail page', async ({
    page,
  }) => {
    const app = createPages(page);
    const drawer = await addProduct(app, product.handle);

    await test.step('Tap the product name on the line item', async () => {
      await drawer.lineNameLink(0).click();
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Product page loads with the same name, variant and price', async () => {
      await expect(page).toHaveURL(new RegExp(`/products/${product.handle}`));
      await expect(app.product.title).toHaveText(new RegExp(product.name, 'i'));
      // The PDP writes the variant as "50 ML EDP", the cart line as "50ml".
      expect(loose(await app.product.text(app.product.subtitle))).toContain(
        loose(product.variant),
      );
      expect(await app.product.currentPrice()).toBe(product.price);
    });
  });

  test('GZ_CART_06 - deleting a line removes it and updates the totals', async ({
    page,
  }) => {
    const app = createPages(page);
    const second = cart.secondProduct;

    await test.step('Add two distinct products', async () => {
      const first = await addProduct(app, product.handle);
      await first.close();
      await addProduct(app, second.handle);
    });

    const drawer = app.cartDrawer;
    await drawer.expandSummary();

    const totalBefore = await drawer.estimatedTotal();
    expect(await drawer.lineCount()).toBe(2);

    await test.step(`Delete the ${product.name} line`, async () => {
      const index = (await drawer.lineNames()).findIndex((name) =>
        new RegExp(product.name, 'i').test(name),
      );
      expect(index).toBeGreaterThanOrEqual(0);
      await drawer.removeLine(index);
    });

    await test.step('Only the other product remains and totals drop by its price', async () => {
      expect(await drawer.lineCount()).toBe(1);
      expect(await drawer.lineName(0)).toMatch(new RegExp(second.name, 'i'));
      await expect(drawer.summaryTotalAmount).toHaveText(
        new RegExp(String(second.price)),
      );
      expect(await drawer.estimatedTotal()).toBe(totalBefore - product.price);
    });

    await test.step('Header badge decreases accordingly', async () => {
      expect(await drawer.itemCountValue()).toBe(1);
    });
  });

  test('GZ_CART_07 - the plus control raises the quantity and the totals', async ({
    page,
  }) => {
    const app = createPages(page);
    const drawer = await addProduct(app, product.handle);
    await drawer.expandSummary();

    expect(await drawer.subtotal()).toBe(product.price);

    await test.step('Tap the plus control', async () => {
      await drawer.increaseQuantity(0);
    });

    await test.step('Stepper reads 2 and the totals double', async () => {
      expect(await drawer.quantity(0)).toBe(2);
      expect(await drawer.subtotal()).toBe(product.price * 2);
      expect(await drawer.estimatedTotal()).toBe(product.price * 2);
      expect(await drawer.itemCountValue()).toBe(2);
      await expect(drawer.itemCount).toHaveText(/2\s*items/i);
    });
  });

  test('GZ_CART_08 - the minus control lowers the quantity and the totals', async ({
    page,
  }) => {
    const app = createPages(page);
    const drawer = await addProduct(app, product.handle);
    await drawer.expandSummary();

    await test.step('Raise the quantity to 3', async () => {
      await drawer.increaseQuantity(0, 2);
      expect(await drawer.quantity(0)).toBe(3);
      expect(await drawer.subtotal()).toBe(product.price * 3);
    });

    await test.step('Tap the minus control once', async () => {
      await drawer.decreaseQuantity(0);
    });

    await test.step('Stepper reads 2 and the subtotal matches', async () => {
      expect(await drawer.quantity(0)).toBe(2);
      expect(await drawer.subtotal()).toBe(product.price * 2);
      expect(await drawer.estimatedTotal()).toBe(product.price * 2);
    });
  });

  test('GZ_CART_09 - adding an upsell card creates a new line and updates the totals', async ({
    page,
  }) => {
    const app = createPages(page);
    const drawer = await addProduct(app, product.handle);
    await drawer.expandSummary();

    const totalBefore = await drawer.estimatedTotal();

    // The rail is personalised, so the card under test is read from the DOM
    // rather than pinned to a product name that may not be offered.
    const upsellName = await drawer.upsellName(0);
    const upsellPrice = await drawer.upsellPrice(0);

    await test.step(`Tap ADD on the ${upsellName} upsell card`, async () => {
      await drawer.addUpsell(0);
    });

    await test.step('A new line is created at the upsell price', async () => {
      expect(await drawer.lineCount()).toBe(2);
      expect(await drawer.lineNames()).toContainEqual(
        expect.stringMatching(new RegExp(upsellName, 'i')),
      );
    });

    await test.step('Item count and estimated total rise accordingly', async () => {
      expect(await drawer.itemCountValue()).toBe(2);
      expect(await drawer.estimatedTotal()).toBe(totalBefore + upsellPrice);
    });
  });

  test('GZ_CART_10 - the ORDER SUMMARY chevron expands subtotal, taxes, delivery and total', async ({
    page,
  }) => {
    const app = createPages(page);
    const drawer = await addProduct(app, product.handle);

    await test.step('Summary starts collapsed', async () => {
      expect(await drawer.isSummaryOpen()).toBe(false);
      await expect(drawer.summaryTotalAmount).toBeHidden();
    });

    await test.step('Tap the ORDER SUMMARY chevron', async () => {
      await drawer.summaryHead.click();
      await expect(drawer.summaryHead).toHaveAttribute('aria-expanded', 'true');
    });

    await test.step('All rows are shown with the chevron rotated', async () => {
      // CSS uppercases these labels.
      expect((await drawer.summaryRowLabels()).map(loose)).toEqual(
        cart.summaryRows.map(loose),
      );
      expect(await drawer.subtotal()).toBe(product.price);
      await expect(
        drawer.summaryRows.filter({ hasText: 'Taxes' }),
      ).toContainText(/included/i);
      await expect(drawer.summaryFreeDelivery).toHaveText(/free/i);
      await expect(drawer.summaryChevron).toHaveClass(/open/);
    });

    await test.step('Estimated total matches the cart', async () => {
      await expect(drawer.summaryTotal).toContainText(/est\.?\s*total/i);
      expect(await drawer.estimatedTotal()).toBe(product.price);
    });
  });

  test('GZ_CART_11 - CHECKOUT hands over to GoKwik with a matching order value', async ({
    page,
  }) => {
    const app = createPages(page);
    const drawer = await addProduct(app, product.handle);

    const barAmount = await drawer.totalAmount();
    const barItems = await drawer.itemCountValue();

    const checkout = await test.step('Tap CHECKOUT', async () =>
      drawer.proceedToCheckout());

    await test.step('Checkout loads with an order summary', async () => {
      await expect(checkout.frameElement).toBeVisible();
      await expect(checkout.orderSummary).toContainText(/order summary/i);
    });

    await test.step('Order summary reconciles with the cart', async () => {
      expect(await checkout.itemCount()).toBe(barItems);
      expect(await checkout.payableAmount()).toBe(barAmount);
      expect(await checkout.payableAmount()).toBe(product.price);
    });
  });
});
