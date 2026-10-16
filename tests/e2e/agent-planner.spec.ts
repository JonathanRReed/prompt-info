import { expect, test } from '@playwright/test';
import { formatUsd } from '../../components/charts/chartFormat';
const catalog = { schemaVersion: 1, source: 'openrouter-live', sourceUrl: 'https://openrouter.ai/api/v1/models', retrievedAt: '2026-10-16T00:00:00Z', freshness: 'live', isFallback: false, fallbackReason: null, data: {
  'OpenAI: GPT-6.1 Sol': { pricing: { input: 0.002, output: 0.01, inputCacheRead: 0.0002, inputCacheWrite: 0.0025 }, co2eFactor: 0, contextWindowTokens: 128000, maxOutputTokens: 32000 },
  'Anthropic: Claude Sonnet 5.5': { pricing: { input: 0.003, output: 0.015 }, co2eFactor: 0, contextWindowTokens: 200000, maxOutputTokens: 32000 },
  'Small: Tiny': { pricing: { input: 0.0001, output: 0.0002 }, co2eFactor: 0, contextWindowTokens: 8192, maxOutputTokens: 4096 },
} };
test.beforeEach(async ({ page }) => { await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) })); });
test('agent assumptions change billed output and cache costs visibly', async ({ page }) => {
  await page.goto('/agent-planner/');
  await expect(page.getByTestId('agent-run-total')).toHaveText(formatUsd(0.332));
  await page.getByLabel('Thinking tokens per step', { exact: true }).fill('4000');
  await expect(page.getByTestId('agent-run-total')).toHaveText(formatUsd(0.492));
  await page.getByLabel('Assume prompt caching is enabled', { exact: true }).check();
  await expect(page.getByLabel('Cache hits on repeated input (%)', { exact: true })).toBeVisible();
  await expect(page.getByTestId('agent-run-total')).not.toHaveText(formatUsd(0.492));
  await page.getByLabel('Runs per month', { exact: true }).fill('');
  await expect(page.getByTestId('agent-monthly-total')).toHaveText('Unavailable');
  await page.getByLabel('Runs per month', { exact: true }).fill('200');
  await expect(page.getByTestId('agent-monthly-total')).not.toHaveText('Unavailable');
});
test('a model cannot hide input plus output context overflow', async ({ page }) => {
  await page.goto('/agent-planner/');
  await page.getByRole('button', { name: 'One response', exact: true }).click();
  await page.getByLabel('Shared instruction tokens', { exact: true }).fill('0');
  await page.getByLabel('Task and document tokens', { exact: true }).fill('7000');
  await page.getByLabel('Visible output tokens per step', { exact: true }).fill('2048');
  await page.getByRole('combobox', { name: 'Inspect model', exact: true }).fill('Tiny');
  await page.getByRole('option', { name: /Small: Tiny/ }).click();
  await expect(page.getByText(/Planned input plus answer and thinking exceeds the context window/)).toBeVisible();
  await expect(page.getByText('This plan does not fit this model.', { exact: false })).toBeVisible();
});
test('a plan link restores assumptions without including the draft prompt', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const transmitted: string[] = [];
  page.on('request', request => transmitted.push(request.url() + (request.postData() ?? '')));
  await page.goto('/agent-planner/');
  await page.getByRole('button', { name: 'Count a draft prompt', exact: true }).click();
  await page.getByLabel('Task prompt', { exact: true }).fill('PRIVATE_DRAFT_DO_NOT_SEND');
  await expect(page.getByText(/tokens using o200k_base/)).toBeVisible();
  await page.getByRole('button', { name: 'Copy a link to this plan', exact: true }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).not.toContain('PRIVATE_DRAFT');
  expect(new URL(link).search).toBe('');
  expect(transmitted.join(' ')).not.toContain('PRIVATE_DRAFT');
  await page.goto(link);
  await expect(page.getByLabel('Model calls per run', { exact: true })).toHaveValue('8');
  await expect(page.getByLabel('Task and document tokens', { exact: true })).not.toHaveValue('2000');
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
});
test('the planner has no page-wide overflow at the configured viewport', async ({ page }) => {
  await page.goto('/agent-planner/');
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Compare current model families', exact: true }).click();
  await expect(page.getByRole('table').first()).toContainText('GPT-6.1 Sol');
});
