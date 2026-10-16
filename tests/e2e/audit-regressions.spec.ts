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
  const search = page.getByRole('combobox', {name:'Model to price',exact:true});
  await search.fill('alpha');
  await expect(page.locator('[role="listbox"] [role="option"]')).toHaveCount(80);
  // The primary picker can search all 120 catalog rows.
  await expect(page.getByRole('region',{name:'Selected model'}).getByTestId('model-search-status')).toHaveText('Showing 80 of 120 matches. Refine to narrow.');
  await search.fill('alpha 11');
  await expect(page.getByRole('region',{name:'Selected model'}).getByTestId('model-search-status')).toHaveText(/^\d+ match(es)?$/);
  await search.fill('free');
  await expect(page.locator('[role="listbox"]')).toContainText('Free and unpriced variants are left out');
});

test('a shared link cannot apply output tokens outside the calculator range', async ({ page }) => {
  await page.goto('/?out=1000000');
  const output = page.getByLabel('Visible output tokens per step');
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
  await expect(output).toHaveValue('200');
  await page.goto('/?out=1');
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
  await expect(output).toHaveValue('200');
  await page.goto('/?out=4096');
  await expect(output).toHaveValue('4096');
});

test('a stalled pricing API falls back to the dated bundled catalog', async ({ page }) => {
  test.setTimeout(60_000);
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, () => { /* never answer */ });
  await page.goto('/');
  await page.getByText('Prices, sources and calculation details', { exact: true }).click();
  await expect(page.locator('.source-status')).toContainText('Bundled dated catalog', { timeout: 45_000 });
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
});

test('malformed prices keep output tradeoffs recoverable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"hello":1}' }));
  await page.route('**/data/llm-data.json', route => route.fulfill({status:503,body:'offline'}));
  await page.goto('/token-efficiency/');
  await expect(page.getByRole('alert').filter({hasText:'Enter rates manually'})).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compare a task' })).toBeVisible();
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
  const inputRate = card.getByLabel('Input $ / M tokens');
  await inputRate.fill('-3');
  await expect(card.locator('p[role="status"]')).toContainText('A price is not reported');
  await expect(card.locator('output').first()).toHaveText('Unavailable');
  await inputRate.fill('0');
  await expect(card.locator('p[role="status"]')).toHaveCount(0);
  await expect(card.locator('output').first()).not.toHaveText('Unavailable');
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
  await expect(page.getByTestId('agent-run-total')).toHaveText('$1.23');
  await page.getByText('Prices, sources and calculation details', { exact: true }).click();
  await page.getByText('See every request and its input', { exact: true }).click();
  await expect(page.getByRole('table')).toContainText('300,000');
});

test('copied receipt uses formatted currency and rates show their per-million unit', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-specific here');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
  await page.getByRole('button', { name: 'Copy receipt' }).click();
  await expect(page.getByText('Receipt copied.', { exact: true })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^Central estimate: \$\d/m);
  expect(text).not.toContain('Annual:');
  expect(text).not.toMatch(/\d\.\d{9,}/);
  await page.getByRole('button', { name: 'Open model results' }).first().click();
  await expect(page.locator('[role="listbox"] [role="option"]').first()).toContainText(/\$[\d.,]+\/M in/);
});

test('a prompt larger than a model context window is flagged and not recommended', async ({ page }) => {
  const catalog = {
    ...MANY_MODELS,
    data: {
      'Small Lab: Tiny 32K': { pricing: { input: 0.0001, output: 0.0002 }, co2eFactor: 0.0002, maxOutputTokens: 4096, contextWindowTokens: 32000, openRouterId: 'small/tiny' },
      'Big Lab: Wide 1M': { pricing: { input: 0.002, output: 0.01 }, co2eFactor: 0.0002, maxOutputTokens: 128000, contextWindowTokens: 1000000, openRouterId: 'big/wide' },
    },
  };
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }));
  await page.goto('/?models=small/tiny,big/wide&tokens=50000&out=1024&turns=1&mode=baseline&runs=1&cadence=once');
  await expect(page.getByText(/Planned input plus answer and thinking exceeds the context window/)).toBeVisible();
  await page.getByRole('tab', {name:'Compare models',exact:true}).click();
  await expect(page.locator('tr').filter({hasText:'Small Lab: Tiny 32K'})).toContainText('Base does not fit');
  await expect(page.locator('tr').filter({hasText:'Big Lab: Wide 1M'})).toContainText('Lowest base cost');
});

test('output tradeoffs labels dated prices without presenting them as live',async({page})=>{
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/,route=>route.fulfill({json:{...MANY_MODELS,source:'bundled-static',freshness:'static',isFallback:true,retrievedAt:'2026-08-29T00:00:00Z',fallbackReason:'Using a dated snapshot.'}}));
  await page.goto('/token-efficiency/');
  await expect(page.getByRole('link',{name:'Dated price catalog',exact:true})).toBeVisible();
  await expect(page.getByText(/fallback rates/)).toBeVisible();
  await expect(page.getByText('Using a dated snapshot.',{exact:true})).toBeVisible();
});
