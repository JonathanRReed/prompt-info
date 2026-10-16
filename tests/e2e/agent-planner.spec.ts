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

test('chat and agent modes keep separate workloads and show a scenario range first', async ({ page }) => {
  await page.goto('/agent-planner/');
  await page.getByLabel('Model calls per run', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByLabel('Replies per conversation', { exact: true })).toHaveValue('1');
  await page.getByLabel('Replies per conversation', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Agent', exact: true }).click();
  await expect(page.getByLabel('Model calls per run', { exact: true })).toHaveValue('12');
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByLabel('Replies per conversation', { exact: true })).toHaveValue('3');
  await expect(page.getByTestId('agent-run-range')).toContainText('–');
  await expect(page.getByText('Central estimate:', { exact: false }).first()).toBeVisible();
});
test('custom thinking bounds remain effective at zero size variance', async ({ page }) => {
  await page.goto('/agent-planner/');
  await page.getByLabel('Token-size uncertainty (%)', { exact: true }).fill('0');
  await page.getByLabel('Low thinking scenario per call', { exact: true }).fill('1000');
  await page.getByLabel('High thinking scenario per call', { exact: true }).fill('3000');
  await expect(page.getByTestId('agent-run-range')).toHaveText(`${formatUsd(.252)} – ${formatUsd(.412)}`);
  await page.getByLabel('Low thinking scenario per call', { exact: true }).fill('5000');
  await expect(page.getByRole('alert')).toContainText('low ≤ base ≤ high');
  await expect(page.getByTestId('agent-run-total')).toHaveText('Unavailable');
});
test('retry budgets repeat the workload and display an unenforced-budget warning', async ({ page }) => {
  await page.goto('/agent-planner/');
  await page.getByLabel('Full-run retries to budget for', { exact: true }).fill('2');
  await expect(page.getByTestId('agent-run-total')).toHaveText(formatUsd(.996));
  await page.getByLabel('Planning budget per task (USD)', { exact: true }).fill('0.5');
  await expect(page.getByText(/The modeled range exceeds your/)).toBeVisible();
});
test('effort selection uses published choices and explicitly editable example ranges', async ({ page }) => {
  const withReasoning = structuredClone(catalog);
  Object.assign(withReasoning.data['OpenAI: GPT-6.1 Sol'], { reasoning: { mandatory: true, supportsMaxTokens: false, supportedEfforts: ['high','low'], defaultEffort: 'low' } });
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(withReasoning) }));
  await page.goto('/agent-planner/');
  await page.getByLabel('Reasoning effort for OpenAI: GPT-6.1 Sol', { exact: true }).selectOption('high');
  await expect(page.getByLabel('Thinking tokens per step', { exact: true })).toHaveValue('8000');
  await expect(page.getByLabel('Low thinking scenario per call', { exact: true })).toHaveValue('3000');
  await expect(page.getByLabel('High thinking scenario per call', { exact: true })).toHaveValue('20000');
  await expect(page.getByText(/illustrative, editable token scenarios/)).toBeVisible();
  await expect(page.locator('#agent-effort option')).toHaveCount(3);
});
