import { expect, test } from '@playwright/test';

test('token planner loads live pricing and tokenizes a prompt', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/LLM Token Counter and Cost Calculator/);
  await expect(page.getByRole('heading', { level: 1, name: 'Know the bill before the model runs.' })).toBeVisible();
  await expect(page.locator('#planner').getByText(/\d[\d,]* models/)).toBeVisible();

  await page.getByRole('textbox', { name: 'Prompt' }).fill('hello');
  await expect(page.locator('#planner article output').first()).toContainText(/^1 token/);
  await expect(page.getByText('Paste a prompt to see token fragments and IDs.')).toBeHidden();
});

test('format comparison updates the shared payload', async ({ page }) => {
  await page.goto('/format-comparison/');

  await page.getByLabel('Source prompt').fill('Hello world');
  await expect(page.getByText('11 chars')).toBeVisible();
  await expect(page.getByText('tokens unavailable')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy TOON snippet' })).toBeVisible();
});

test('theme selection persists across reloads', async ({ page }) => {
  await page.goto('/');

  await page.getByTitle('Select interface theme').click();
  await page.getByRole('option', { name: /Ledger Paper/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-name', 'ledger');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme-name', 'ledger');
});

test('pricing function returns a populated, cacheable model map', async ({ request }) => {
  const response = await request.get('/api/pricing');

  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('max-age=900');
  const body = await response.json();
  expect(Object.keys(body).length).toBeGreaterThan(100);
});

test('unknown routes return a noindex 404 with recovery navigation', async ({ page }) => {
  const response = await page.goto('/definitely-not-a-real-route');

  expect(response?.status()).toBe(404);
  const robotsMeta = page.locator('meta[name="robots"]');
  await expect(robotsMeta).toHaveCount(1);
  await expect(robotsMeta).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('heading', { level: 1, name: 'That page is not here.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Token planner/ })).toBeVisible();
});
