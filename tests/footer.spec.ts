/**
 * Footer suite — automates the GZ_FTR rows of the QA sheet.
 *
 * 4 of the 6 cases are automated, renumbered GZ_FTR_01, 03, 04, 05 to keep
 * the sheet's ordering. Sheet serial numbers: GZ_FTR_POS_001, 027, 028, 039.
 *
 * NOT automated, by decision:
 *   GZ_FTR_02 (POS_011) newsletter subscription
 *   GZ_FTR_06 (POS_043) contact form submission
 * Both write to production on every run — a real subscriber and a real
 * support enquiry — so they stay manual. Test them by hand from the sheet.
 *
 *   npx playwright test tests/footer.spec.ts --headed --workers=1
 */
import { expect, test } from '@playwright/test';
import { brand } from '../src/brand.config';
import { createPages, loadStatus } from '../src/pages';

const footer = brand.data.footer;
const contact = footer.contact;

test.describe(`${brand.name} footer @smoke`, () => {
  test('GZ_FTR_01 - footer renders the newsletter block, link groups, logo, social icons and copyright', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();

    await test.step('Scroll to the bottom of the page', async () => {
      await app.footer.scrollIntoView();
      await expect(app.footer.root).toBeVisible();
    });

    await test.step('Newsletter block invites a subscription', async () => {
      await expect(app.footer.newsletterTitle).toBeVisible();
      await expect(app.footer.newsletterInput).toBeVisible();
      await expect(app.footer.newsletterInput).toHaveAttribute('type', 'email');
      await expect(app.footer.newsletterSubmit).toBeVisible();
    });

    await test.step('Shop and policy link groups list the expected links', async () => {
      expect(await app.footer.shopLinkLabels()).toEqual(
        footer.shopLinks.map((link) => link.label),
      );
      expect(await app.footer.policyLinkLabels()).toEqual(
        footer.policyLinks.map((link) => link.label),
      );
    });

    await test.step('Every footer link points where it should', async () => {
      for (const link of [...footer.shopLinks, ...footer.policyLinks]) {
        await expect(app.footer.link(link.label)).toHaveAttribute(
          'href',
          new RegExp(link.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        );
      }
    });

    await test.step('Brand logo, social icons and copyright are shown', async () => {
      await expect(app.footer.brandLogo).toHaveText(footer.logo);
      await expect(app.footer.brandSubtitle).toBeVisible();
      await expect(app.footer.socialLinks).toHaveCount(
        footer.socialNetworks.length,
      );

      for (const network of footer.socialNetworks) {
        await expect(app.footer.socialLink(network)).toHaveAttribute(
          'href',
          /^https?:/,
        );
      }

      await expect(app.footer.copyright).toContainText(/\d{4}/);
    });
  });

  for (const link of footer.shopLinks.slice(0, 2)) {
    const id = link.label === 'Men' ? 'GZ_FTR_03' : 'GZ_FTR_04';

    test(`${id} - tapping ${link.label} in the footer opens that collection`, async ({
      page,
    }) => {
      const app = createPages(page);
      await app.home.open();
      await app.footer.scrollIntoView();

      await test.step(`Tap the ${link.label} link`, async () => {
        await app.footer.link(link.label).click();
        await page.waitForURL(new RegExp(link.path));
      });

      await test.step('The collection loads with a heading and products', async () => {
        await expect(page).toHaveURL(new RegExp(link.path));
        await expect(app.collection.title).toBeVisible();
        await expect(app.collection.title).toContainText(
          new RegExp(link.label, 'i'),
        );
        await expect(app.collection.productCards.first()).toBeVisible();
      });

      await test.step('That URL answers with HTTP 200', async () => {
        const status = await loadStatus(
          page,
          new URL(link.path, brand.baseUrl).toString(),
        );
        expect(status).toBe(200);
      });
    });
  }

  test('GZ_FTR_05 - Contact Us opens the page with intro copy, contact details and the form', async ({
    page,
  }) => {
    const app = createPages(page);
    await app.home.open();
    await app.footer.scrollIntoView();

    await test.step('Tap Contact Us', async () => {
      await app.footer.link('Contact Us').click();
      await page.waitForURL(new RegExp(brand.paths.contactUs));
    });

    await test.step('Heading and intro copy are shown', async () => {
      await expect(app.contactUs.title).toHaveText(
        new RegExp(contact.title, 'i'),
      );
      await expect(app.contactUs.subtitle).toBeVisible();
      await expect(app.contactUs.subtitle).toContainText(contact.phone);
    });

    await test.step('Address, phone and email rows are shown', async () => {
      expect(await app.contactUs.infoItems.count()).toBeGreaterThanOrEqual(3);
      await expect(app.contactUs.root).toContainText(contact.phone);
      await expect(app.contactUs.root).toContainText(contact.email);
    });

    await test.step('Enquiry form exposes all four fields and a SUBMIT button', async () => {
      await expect(app.contactUs.firstNameInput).toBeVisible();
      await expect(app.contactUs.lastNameInput).toBeVisible();
      await expect(app.contactUs.emailInput).toBeVisible();
      await expect(app.contactUs.messageInput).toBeVisible();
      await expect(app.contactUs.submitButton).toHaveText(/submit/i);
      await expect(app.contactUs.submitButton).toBeEnabled();
    });
  });
});
