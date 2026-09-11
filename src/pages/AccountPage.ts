/** Account page. Login itself is an OTP flow — see README notes. */
import { brand } from '../brand.config';
import { BasePage } from './BasePage';
import { Header } from './components/Header';

export class AccountPage extends BasePage {
  readonly header = new Header(this.page);

  async open(): Promise<this> {
    await this.goto(brand.paths.account);
    return this;
  }
}
