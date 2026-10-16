import { expect, test } from '@playwright/test';

// Regressions found in the October 2026 user-facing audit (#104). Each test
// reproduces a defect that was visible in a real browser before the fix.

const MANY_MODELS = {
  schemaVersion: 1,
  data: Object.fromEntries(Array.from({ length: 120 }, (_, index) => [
    `Lab ${index % 9}: Alpha ${index}`,
    { pricing: { input: 0.001 + index / 1e6, output: 0.002 + index / 1e6 }, co2eFactor: 0.0002, maxOutputTokens: 64000, contextWindowTokens: 200000 },
  ])),
  source: 'openrouter-live',
  sourceUrl: 'https://openrouter.ai/api/v1/models',
  retrievedAt: '2026-10-15T00:00:00.000Z',
  freshness: 'live',
  isFallback: false,
  fallbackReason: null,
};

test('model search reports every match, not the 80-row render cap', async ({ page }) => {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MANY_MODELS) }));
  await page.goto('/');
  const search = page.locator('input[role="combobox"]').first();
  await search.fill('alpha');
  await expect(page.locator('[role="listbox"] [role="option"]')).toHaveCount(80);
  // 120 catalog rows; the other comparison row's model is excluded from this picker.
  await expect(page.getByTestId('model-search-status').first()).toHaveText('Showing 80 of 119 matches. Refine to narrow.');
  await search.fill('alpha 11');
  await expect(page.getByTestId('model-search-status').first()).toHaveText(/^\d+ match(es)?$/);
  await search.fill('free');
  await expect(page.locator('[role="listbox"]')).toContainText('Free and unpriced variants are left out');
});

test('a shared link cannot apply output tokens outside the calculator range', async ({ page }) => {
  await page.goto('/?out=1000000');
  const output = page.getByLabel('Output tokens per turn');
  await expect(page.getByTestId('primary-session-cost')).not.toHaveText('Unavailable');
  await expect(output).toHaveValue('2048');
  await page.goto('/?out=1');
  await expect(page.getByTestId('primary-session-cost')).not.toHaveText('Unavailable');
  await expect(output).toHaveValue('2048');
  await page.goto('/?out=4096');
  await expect(output).toHaveValue('4096');
});

test('a stalled pricing API falls back to the dated bundled catalog', async ({ page }) => {
  test.setTimeout(60_000);
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, () => { /* never answer */ });
  await page.goto('/');
  await expect(page.locator('.source-status')).toContainText('Bundled dated catalog', { timeout: 45_000 });
  await expect(page.getByTestId('primary-session-cost')).not.toHaveText('Unavailable');
});

test('a malformed benchmark response keeps the cost-per-task lab usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/api\/benchmarks\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"hello":1}' }));
  await page.goto('/token-efficiency/');
  await expect(page.getByText(/unavailable, editable presets retained/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Use your own task measurements.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the tasks field can be cleared and retyped without snapping to 1', async ({ page }) => {
  await page.goto('/token-efficiency/');
  const tasks = page.locator('#efficiency-tasks');
  await tasks.fill('');
  await expect(tasks).toHaveValue('');
  await tasks.pressSequentially('500');
  await expect(tasks).toHaveValue('500');
  await tasks.blur();
  await expect(page.locator('article').first()).toContainText('500 tasks');
  await tasks.fill('');
  await tasks.blur();
  await expect(tasks).toHaveValue('500');
});

test('a negative typed rate is not reported rather than priced as free', async ({ page }) => {
  await page.goto('/token-efficiency/');
  const card = page.locator('article').first();
  const inputRate = card.locator('input[id$="-input-rate"]');
  await inputRate.fill('-3');
  await expect(card.locator('p[role="status"]')).toContainText('A price is not reported');
  await expect(card.locator('output').first()).toHaveText('N/A');
  await inputRate.fill('0');
  await expect(card.locator('p[role="status"]')).toHaveCount(0);
  await expect(card.locator('output').first()).not.toHaveText('N/A');
});

const TIERED_CATALOG = {
  ...MANY_MODELS,
  data: {
    'OpenAI: GPT-6.1 Sol': {
      pricing: { input: 0.002, output: 0.01, longContextTiers: [{ minPromptTokens: 272_000, input: 0.004, output: 0.015 }] },
      co2eFactor: 0.0002, maxOutputTokens: 128000, contextWindowTokens: 1050000, openRouterId: 'openai/gpt-6.1-sol',
    },
    'Anthropic: Claude Sonnet 5.5': {
      pricing: { input: 0.002, output: 0.01 },
      co2eFactor: 0.0002, maxOutputTokens: 128000, contextWindowTokens: 1000000, openRouterId: 'anthropic/claude-sonnet-5.5',
    },
  },
};

test('a prompt above a published long-context threshold is priced and labelled at that tier', async ({ page }) => {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TIERED_CATALOG) }));
  await page.goto('/?models=openai/gpt-6.1-sol,anthropic/claude-sonnet-5.5&tokens=300000&out=2048&turns=1&mode=baseline&runs=1&cadence=once');
  // 300,000 x $4/M + 2,048 x $15/M = $1.23 (base rates would give $0.62).
  await expect(page.getByTestId('primary-session-cost')).toHaveText('$1.23');
  await expect(page.getByTestId('long-context-note')).toContainText('1 request is priced at this model\'s published long-context rate above 272,000 prompt tokens');
});

test('copied receipt uses formatted currency and rates show their per-million unit', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-specific here');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.getByTestId('primary-session-cost')).not.toHaveText('Unavailable');
  await page.getByRole('button', { name: 'Copy receipt' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^One request: \$\d/m);
  expect(text).toMatch(/^Annual: \$[\d,]+(\.\d+)?$/m);
  expect(text).not.toMatch(/\d\.\d{9,}/);
  await page.getByRole('button', { name: 'Open model results' }).first().click();
  await expect(page.locator('[role="listbox"] [role="option"]').first()).toContainText(/\$[\d.,]+\/M in/);
});
