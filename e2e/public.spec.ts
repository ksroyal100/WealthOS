import { test, expect } from '@playwright/test';

const PAGES = ['/', '/about', '/mission', '/leadership', '/corporate/structure', '/divisions', '/tech', '/media', '/marketplace', '/pricing', '/newsroom', '/careers', '/partnerships', '/investors', '/contact', '/security', '/support', '/privacy', '/terms', '/accessibility'];

for (const path of PAGES) {
  test(`${path} is usable at this screen size`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);   // no sideways scrolling on any device
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('keyboard users can skip to the content and operate the menu', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); await expect(page.getByText('Skip to main content')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page).toHaveURL(/#main$/);
  if (!isMobile) { await page.getByRole('button', { name: /Corporate/ }).click(); await expect(page.getByRole('menuitem', { name: 'Leadership' })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('menuitem', { name: 'Leadership' })).toBeHidden(); }
  else { await page.getByRole('button', { name: 'Menu' }).click(); await expect(page.getByRole('link', { name: 'Leadership' })).toBeVisible(); }
});

test('empty sections are honest rather than filled with placeholders', async ({ page }) => {
  await page.goto('/leadership');
  await expect(page.getByText(/Profiles will be published here|Only verified and appointed/).first()).toBeVisible();
});

test('contact form validates and shows errors accessibly', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Your name').fill('A'); await page.getByLabel('Email').fill('not-an-email'); await page.getByLabel('Message').fill('short');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('alert').or(page.locator(':invalid').first())).toBeVisible();
});
