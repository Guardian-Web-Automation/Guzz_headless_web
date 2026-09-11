/**
 * A single product tile. Reused on the home page, collection listings and
 * search results, so it lives as a component rather than on one page.
 */
import { Locator } from '@playwright/test';
import { brand } from '../../brand.config';
import { parsePercent, parsePrice } from '../BasePage';

const sel = brand.selectors.productCard;

export class ProductCard {
  readonly image: Locator;
  readonly wishlistButton: Locator;
  readonly genderTag: Locator;
  readonly ratingStar: Locator;
  readonly ratingCount: Locator;
  readonly name: Locator;
  readonly variant: Locator;
  readonly price: Locator;
  readonly comparePrice: Locator;
  readonly discount: Locator;
  readonly addButton: Locator;
  readonly link: Locator;

  constructor(readonly root: Locator) {
    this.image = root.locator(sel.image).first();
    this.wishlistButton = root.locator(sel.wishlistButton);
    this.genderTag = root.locator(sel.genderTag);
    this.ratingStar = root.locator(sel.ratingStar);
    this.ratingCount = root.locator(sel.ratingCount);
    this.name = root.locator(sel.name);
    this.variant = root.locator(sel.variant);
    this.price = root.locator(sel.price);
    this.comparePrice = root.locator(sel.comparePrice);
    this.discount = root.locator(sel.discount);
    this.addButton = root.locator(sel.addButton);
    this.link = root.locator(sel.link).first();
  }

  async open(): Promise<void> {
    await this.link.click();
  }

  async openImage(): Promise<void> {
    await this.image.click();
  }

  async addToCart(): Promise<void> {
    await this.addButton.click();
  }

  async priceValue(): Promise<number> {
    return parsePrice((await this.price.innerText()).trim());
  }

  async comparePriceValue(): Promise<number> {
    return parsePrice((await this.comparePrice.innerText()).trim());
  }

  async discountPercentValue(): Promise<number> {
    return parsePercent((await this.discount.innerText()).trim());
  }
}
