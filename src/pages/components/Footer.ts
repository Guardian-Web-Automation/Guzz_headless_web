/** Site footer: newsletter signup, link groups, brand mark and social icons. */
import { Locator } from '@playwright/test';
import { brand } from '../../brand.config';
import { BasePage } from '../BasePage';

const sel = brand.selectors.footer;

export class Footer extends BasePage {
  readonly root = this.page.locator(sel.root);

  // Newsletter
  readonly newsletterBlock = this.root.locator(sel.newsletterBlock).first();
  readonly newsletterTitle = this.root.locator(sel.newsletterTitle).first();
  readonly newsletterForm = this.root.locator(sel.newsletterForm).first();
  readonly newsletterInput = this.root.locator(sel.newsletterInput).first();
  readonly newsletterSubmit = this.root.locator(sel.newsletterSubmit).first();

  // Brand and links
  readonly brandLogo = this.root.locator(sel.brandLogo).first();
  readonly brandSubtitle = this.root.locator(sel.brandSubtitle).first();
  readonly columns = this.root.locator(sel.columns).first();
  readonly shopColumn = this.root.locator(sel.shopColumn).first();
  readonly policyColumn = this.root.locator(sel.policyColumn).first();
  readonly copyright = this.root.locator(sel.copyright).first();
  readonly socialLinks = this.root.locator(sel.socialLinks);

  link(label: string): Locator {
    return this.root.getByRole('link', { name: label, exact: true }).first();
  }

  socialLink(name: string): Locator {
    return this.socialLinks
      .filter({ has: this.page.locator(`[aria-label="${name}"]`) })
      .or(this.root.locator(`${sel.socialLinks}[aria-label="${name}"]`))
      .first();
  }

  async shopLinkLabels(): Promise<string[]> {
    return (await this.shopColumn.getByRole('link').allInnerTexts()).map(
      (label) => label.trim(),
    );
  }

  async policyLinkLabels(): Promise<string[]> {
    return (await this.policyColumn.getByRole('link').allInnerTexts()).map(
      (label) => label.trim(),
    );
  }

  async scrollIntoView(): Promise<void> {
    await this.root.scrollIntoViewIfNeeded();
  }

  /** Types an address and submits the newsletter form. */
  async subscribe(email: string): Promise<void> {
    await this.newsletterInput.fill(email);
    await this.newsletterSubmit.click();
  }
}
