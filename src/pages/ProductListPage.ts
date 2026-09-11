/**
 * Shared parent for every page that renders a grid or carousel of product
 * cards: home, collection listings and search results.
 *
 * Keeps the card locators and grid helpers in one place so HomePage,
 * CollectionPage and SearchPage do not repeat them.
 */
import { brand } from '../brand.config';
import { BasePage, parsePrice } from './BasePage';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailPage } from './ProductDetailPage';

const sel = brand.selectors.productCard;

export abstract class ProductListPage extends BasePage {
  readonly header = new Header(this.page);
  readonly footer = new Footer(this.page);
  readonly productCards = this.page.locator(sel.root);

  card(index: number): ProductCard {
    return new ProductCard(this.productCards.nth(index));
  }

  async productCount(): Promise<number> {
    return this.productCards.count();
  }

  async productNames(): Promise<string[]> {
    const names = await this.page
      .locator(`${sel.root} ${sel.name}`)
      .allInnerTexts();
    return names.map((name) => name.trim());
  }

  async prices(): Promise<number[]> {
    const texts = await this.page
      .locator(`${sel.root} ${sel.price}`)
      .allInnerTexts();
    return texts.map(parsePrice);
  }

  async openProduct(index: number): Promise<ProductDetailPage> {
    await this.card(index).open();
    await this.page.waitForLoadState('domcontentloaded');
    return new ProductDetailPage(this.page);
  }
}
