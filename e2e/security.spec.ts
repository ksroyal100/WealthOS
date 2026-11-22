import { test, expect } from '@playwright/test';

test('anonymous visitors cannot reach the Command Center', async ({ page }) => {
  for (const p of ['/command-center', '/command-center/finance', '/command-center/hr', '/command-center/legal']) { await page.goto(p); await expect(page).toHaveURL(/\/command-center\/login/); }
});
test('anonymous visitors cannot reach the customer portal', async ({ page }) => {
  for (const p of ['/account', '/account/billing', '/account/support']) { await page.goto(p); await expect(page).toHaveURL(/\/account\/login/); }
});
test('staff sign-in does not reveal whether an account exists', async ({ page }) => {
  await page.goto('/command-center/login');
  await page.getByLabel('Work email').fill('nobody@example.com'); await page.getByLabel('Password').fill('wrong-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText(/incorrect|too many/i);
});
