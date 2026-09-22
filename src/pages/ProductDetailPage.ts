/** Product detail page (PDP). */
import { expect, Locator } from '@playwright/test';
import { brand } from '../brand.config';
import { BasePage, parsePercent } from './BasePage';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { CheckoutPage } from './CheckoutPage';

const sel = brand.selectors.pdp;
const bundle$ = brand.selectors.bundle;
const reviews$ = brand.selectors.reviews;
const recs$ = brand.selectors.recommendations;

export class ProductDetailPage extends BasePage {
  readonly header = new Header(this.page);
  readonly footer = new Footer(this.page);

  // Shell
  readonly root = this.page.locator(sel.root);
  readonly gallery = this.page.locator(sel.gallery);
  readonly galleryDots = this.page.locator(sel.galleryDots);
  readonly galleryDot = this.page.locator(sel.galleryDot);
  readonly galleryPrevButton = this.page.locator(sel.galleryPrev);
  readonly galleryNextButton = this.page.locator(sel.galleryNext);
  /** Desktop navigates the gallery with arrows, mobile with dot indicators. */
  readonly galleryNavigation = this.visibleOf(sel.galleryNext, sel.galleryDots);
  readonly title = this.page.locator(sel.title).first();
  readonly wishlistButton = this.page.locator(sel.wishlistButton).first();
  readonly shareButton = this.page.locator(sel.shareButton).first();
  readonly subtitle = this.page.locator(sel.subtitle).first();
  readonly rating = this.page.locator(sel.rating).first();
  readonly ratingScore = this.page.locator(sel.ratingScore).first();
  readonly ratingCount = this.page.locator(sel.ratingCount).first();

  // Price block
  readonly price = this.page.locator(sel.price).first();
  readonly comparePrice = this.page.locator(sel.comparePrice).first();
  readonly discountBadge = this.page.locator(sel.discount).first();
  readonly taxNote = this.page.locator(sel.taxNote).first();

  // Quantity and CTAs
  readonly quantityValue = this.page.locator(sel.quantityValue).first();
  readonly increaseQuantityButton = this.page
    .locator(sel.increaseQuantity)
    .first();
  readonly decreaseQuantityButton = this.page
    .locator(sel.decreaseQuantity)
    .first();
  // Desktop puts the CTAs in the info block, mobile in the sticky bar.
  readonly addToCartButton = this.visibleOf(sel.addToCart, sel.stickyAddToCart);
  readonly buyNowButton = this.visibleOf(sel.buyNow, sel.stickyBuyNow);
  readonly stickyBar = this.page.locator(sel.stickyBar);

  // Sections
  readonly uspRow = this.page.locator(sel.uspRow).first();
  readonly uspItems = this.page.locator(sel.uspItem);
  readonly keyNotes = this.page.locator(sel.keyNotes).first();
  readonly keyNotesTitle = this.page.locator(sel.keyNotesTitle).first();
  readonly heritage = this.page.locator(sel.heritage).first();
  readonly heritageTitle = this.page.locator(sel.heritageTitle).first();
  readonly accordions = this.page.locator(sel.accordion);

  // Bundle
  readonly bundle = this.page.locator(bundle$.root).first();
  readonly bundleTitle = this.page.locator(bundle$.title).first();
  readonly bundleName = this.page.locator(bundle$.name).first();
  readonly bundlePrice = this.page.locator(bundle$.price).first();
  readonly bundleComparePrice = this.page.locator(bundle$.comparePrice).first();
  readonly bundleSaving = this.page.locator(bundle$.saving).first();
  readonly bundleAddButton = this.page.locator(bundle$.addButton).first();

  // Reviews
  readonly reviews = this.page.locator(reviews$.root).first();
  readonly reviewsTitle = this.page.locator(reviews$.widgetTitle).first();
  readonly reviewsSummaryStars = this.page
    .locator(reviews$.summaryStars)
    .first();
  readonly reviewsAverage = this.page.locator(reviews$.average).first();
  readonly reviewsCountText = this.page.locator(reviews$.countText).first();
  readonly reviewsVerifiedBadge = this.page
    .locator(reviews$.verifiedBadge)
    .first();
  readonly reviewHistogramRows = this.page.locator(reviews$.histogramRow);
  readonly writeReviewLink = this.page
    .locator(reviews$.writeReviewLink)
    .first();

  // Write-a-review form
  readonly reviewForm = this.page.locator(reviews$.form.root).first();
  readonly reviewFormRatingStars = this.reviewForm.locator(
    reviews$.form.ratingStar,
  );
  readonly reviewFormBody = this.reviewForm.locator(reviews$.form.body).first();
  readonly reviewFormMediaUpload = this.reviewForm
    .locator(reviews$.form.mediaUpload)
    .first();
  readonly reviewFormDisplayName = this.reviewForm
    .locator(reviews$.form.displayName)
    .first();
  readonly reviewFormNameFormat = this.reviewForm
    .locator(reviews$.form.nameFormatSelect)
    .first();
  readonly reviewFormEmail = this.reviewForm
    .locator(reviews$.form.email)
    .first();
  readonly reviewFormSubmitButton = this.reviewForm
    .locator(reviews$.form.submitButton)
    .first();
  readonly reviewFormCancelLink = this.reviewForm
    .locator(reviews$.form.cancelLink)
    .first();

  // Recommendations
  readonly recommendations = this.page.locator(recs$.root).first();
  readonly recommendationsTitle = this.page.locator(recs$.title).first();
  readonly recommendationCards = this.recommendations.locator(
    brand.selectors.productCard.root,
  );

  async open(handle: string = brand.data.pdp.handle): Promise<this> {
    await this.goto(`/products/${handle}`);
    await expect(this.title).toBeVisible();
    return this;
  }

  /**
   * Sections below the fold are lazy-rendered, so scroll the whole page
   * before asserting on reviews, heritage or recommendations.
   */
  async scrollThroughPage(): Promise<void> {
    await this.recommendations.scrollIntoViewIfNeeded();
    await expect(this.recommendationsTitle).toBeVisible();
    await this.page.keyboard.press('Home');
  }

  /* ----------------------------------------------------------- price block */

  async productName(): Promise<string> {
    return this.text(this.title);
  }

  async currentPrice(): Promise<number> {
    return this.priceOf(this.price);
  }

  async compareAtPrice(): Promise<number> {
    return this.priceOf(this.comparePrice);
  }

  async advertisedDiscount(): Promise<number> {
    return parsePercent(await this.text(this.discountBadge));
  }

  /* -------------------------------------------------------------- quantity */

  async quantity(): Promise<number> {
    return Number(await this.text(this.quantityValue));
  }

  async increaseQuantity(times = 1): Promise<void> {
    for (let index = 0; index < times; index += 1) {
      const before = await this.quantity();
      await this.increaseQuantityButton.click();
      await expect(this.quantityValue).toHaveText(String(before + 1));
    }
  }

  /* ------------------------------------------------------------------ CTAs */

  async addToCart(): Promise<CartDrawer> {
    const drawer = new CartDrawer(this.page);
    return drawer.openAfterAdd(() => this.addToCartButton.click());
  }

  /** Buy Now skips the cart and opens the checkout overlay directly. */
  async buyNow(): Promise<CheckoutPage> {
    await this.buyNowButton.click();
    const checkout = new CheckoutPage(this.page);
    await checkout.waitUntilOpen();
    return checkout;
  }

  async addBundle(): Promise<CartDrawer> {
    await this.bundleAddButton.scrollIntoViewIfNeeded();
    const drawer = new CartDrawer(this.page);
    return drawer.openAfterAdd(() => this.bundleAddButton.click());
  }

  async bundlePriceValue(): Promise<number> {
    return this.priceOf(this.bundlePrice);
  }

  async bundleComparePriceValue(): Promise<number> {
    return this.priceOf(this.bundleComparePrice);
  }

  /* ------------------------------------------------------------ accordions */

  accordion(title: string): Locator {
    return this.accordions.filter({ hasText: title }).first();
  }

  accordionHeader(title: string): Locator {
    return this.accordion(title).locator(sel.accordionHeader);
  }

  accordionContent(title: string): Locator {
    return this.accordion(title).locator(sel.accordionContent);
  }

  /**
   * The collapsing container. Assert visibility on this, not on
   * `accordionContent` — the inner content keeps a box even when collapsed.
   */
  accordionBody(title: string): Locator {
    return this.accordion(title).locator(sel.accordionBody);
  }

  async accordionTitles(): Promise<string[]> {
    return (
      await this.accordions.locator(sel.accordionTitle).allInnerTexts()
    ).map((label) => label.trim());
  }

  async isAccordionOpen(title: string): Promise<boolean> {
    const classes = (await this.accordion(title).getAttribute('class')) ?? '';
    return classes.split(/\s+/).includes(sel.accordionOpenClass);
  }

  async expandAccordion(title: string): Promise<void> {
    await this.accordionHeader(title).scrollIntoViewIfNeeded();
    await this.accordionHeader(title).click();
    await expect(this.accordion(title)).toHaveClass(
      new RegExp(sel.accordionOpenClass),
    );
  }

  /* --------------------------------------------------------------- reviews */

  /** Average rating as the widget reports it, e.g. `4.77`. */
  async reviewsAverageValue(): Promise<number> {
    const match = (await this.text(this.reviewsAverage)).match(/([\d.]+)/);

    if (!match) {
      throw new Error('No average rating in the reviews summary');
    }

    return Number(match[1]);
  }

  async reviewsTotalCount(): Promise<number> {
    const match = (await this.text(this.reviewsCountText)).match(/(\d+)/);

    if (!match) {
      throw new Error('No review count in the reviews summary');
    }

    return Number(match[1]);
  }

  /** Histogram frequencies from 5 stars down to 1. */
  async reviewHistogram(): Promise<number[]> {
    const rows = await this.reviewHistogramRows
      .locator(reviews$.histogramFrequency)
      .allInnerTexts();

    return rows.map((value) => Number(value.trim()));
  }

  /**
   * The review widget is third-party and takes several seconds to mount
   * after the section enters the viewport, re-rendering as it goes. It
   * flags itself finished with a class, which is the only stable signal
   * that its contents can be relied on.
   */
  /**
   * Reloads until `isReady` reports the widget has rendered. The widget's
   * script intermittently fails to load (roughly 1 page load in 3) and the
   * section then never renders, so waiting longer cannot help.
   */
  private async withReviewWidget(
    isReady: () => Promise<boolean>,
  ): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.reviews.scrollIntoViewIfNeeded();

      if (await isReady()) {
        return;
      }

      if (attempt < 3) {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }
    }

    throw new Error(
      'The review widget did not render after 3 page loads - its script is not loading.',
    );
  }

  private static async appears(locator: Locator): Promise<boolean> {
    return locator
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
  }

  /** Waits for the review summary to render. */
  async waitForReviewsWidget(): Promise<void> {
    await this.withReviewWidget(() =>
      ProductDetailPage.appears(this.reviewsSummaryStars),
    );
    await expect(this.reviewsTitle).toBeVisible();
  }

  /**
   * Opens the write-a-review form once the widget has mounted. `click()`
   * does its own scrolling and actionability waiting — scrolling to the
   * link by hand fails while the widget is still re-rendering.
   */
  async openReviewForm(): Promise<void> {
    await this.withReviewWidget(() =>
      ProductDetailPage.appears(this.writeReviewLink),
    );
    await this.writeReviewLink.click({ timeout: 30_000 });
    await expect(this.reviewForm).toBeVisible();
  }

  /* ------------------------------------------------------- recommendations */

  recommendationCard(name: string): ProductCard {
    return new ProductCard(
      this.recommendationCards.filter({ hasText: name }).first(),
    );
  }

  async recommendationNames(): Promise<string[]> {
    const names = await this.recommendationCards
      .locator(brand.selectors.productCard.name)
      .allInnerTexts();

    return names.map((name) => name.trim());
  }
}
