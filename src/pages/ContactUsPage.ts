/** Contact Us page: intro copy, contact details and the enquiry form. */
import { brand } from '../brand.config';
import { BasePage } from './BasePage';
import { Footer } from './components/Footer';
import { Header } from './components/Header';

const sel = brand.selectors.contact;

export type EnquiryDetails = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
};

export class ContactUsPage extends BasePage {
  readonly header = new Header(this.page);
  readonly footer = new Footer(this.page);

  readonly root = this.page.locator(sel.root);
  readonly title = this.root.locator(sel.title).first();
  readonly subtitle = this.root.locator(sel.subtitle).first();
  readonly infoItems = this.root.locator(sel.infoItem);

  readonly form = this.root.locator(sel.form).first();
  readonly firstNameInput = this.form.locator(sel.firstName).first();
  readonly lastNameInput = this.form.locator(sel.lastName).first();
  readonly emailInput = this.form.locator(sel.email).first();
  readonly messageInput = this.form.locator(sel.message).first();
  readonly submitButton = this.root.locator(sel.submitButton).first();
  readonly confirmation = this.root.locator(sel.confirmation).first();

  async open(): Promise<this> {
    await this.goto(brand.paths.contactUs);
    return this;
  }

  /** Fills every field without submitting. */
  async fillEnquiry(details: EnquiryDetails): Promise<void> {
    await this.firstNameInput.fill(details.firstName);
    await this.lastNameInput.fill(details.lastName);
    await this.emailInput.fill(details.email);
    await this.messageInput.fill(details.message);
  }

  async fieldValues(): Promise<EnquiryDetails> {
    return {
      firstName: await this.firstNameInput.inputValue(),
      lastName: await this.lastNameInput.inputValue(),
      email: await this.emailInput.inputValue(),
      message: await this.messageInput.inputValue(),
    };
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async infoText(): Promise<string> {
    return this.text(
      this.root.locator(brand.selectors.contact.infoItem).first(),
    );
  }
}
