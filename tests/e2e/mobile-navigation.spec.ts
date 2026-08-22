import { expect, test } from '@playwright/test';

test('mobile menu exposes every primary route without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile navigation is only rendered below the small breakpoint.');

  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Primary navigation' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Token Planner' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Format Comparison' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'About' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Contact' })).toBeVisible();

  await dialog.getByRole('link', { name: 'Format Comparison' }).click();
  await expect(page).toHaveURL(/\/format-comparison\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'One prompt. Six payload shells.' })).toBeVisible();
});
