import { expect, test } from '@playwright/test';
import { buildDatedArtificialAnalysisFallback } from '../../lib/artificialAnalysis';

test('missing model rates stay uncalculated and free rates remain usable', async ({ page }) => {
  const base = buildDatedArtificialAnalysisFallback()[0];
  await page.route('**/api/benchmarks', route => route.fulfill({
    json: {
      schemaVersion: 1,
      source: 'artificial-analysis-supabase-cache',
      retrievedAt: '2026-09-02T12:00:00.000Z',
      freshness: 'cached',
      isFallback: true,
      data: [
        { ...base, id: 'partial', slug: 'partial', name: 'Partial price model', displayName: 'Partial price model', inputPerMillion: null, outputPerMillion: 3 },
        { ...base, id: 'free', slug: 'free', name: 'Free price model', displayName: 'Free price model', inputPerMillion: 0, outputPerMillion: 0 },
      ],
    },
  }));
  await page.goto('/token-efficiency/');
  const card = page.locator('#efficiency-lab article').first();
  const select = page.getByLabel('Comparison model 1');
  await expect(select).toBeEnabled();
  await select.selectOption('partial');
  await expect(card.getByRole('heading', { name: 'Partial price model' })).toBeVisible();
  await expect(card.getByLabel('Input $ / M tokens')).toHaveValue('');
  await expect(card.getByLabel('Output $ / M tokens')).toHaveValue('3');
  await expect(card.getByRole('status').filter({ hasText: 'A price is not reported' })).toBeVisible();
  await expect(card.locator('output').first()).toHaveText('N/A');
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/efficiency-missing-price-${test.info().project.name}.png` });
  await select.selectOption('free');
  await expect(card.getByLabel('Input $ / M tokens')).toHaveValue('0');
  await expect(card.locator('output').first()).toHaveText('$0.00');
  await card.getByLabel('Input $ / M tokens').fill('');
  await expect(card.locator('output').first()).toHaveText('N/A');
  await card.getByLabel('Input $ / M tokens').fill('2');
  await expect(card.locator('output').first()).toHaveText('$0.0100');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
