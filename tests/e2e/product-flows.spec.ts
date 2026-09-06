import { expect, test } from '@playwright/test';

test('cost workbench loads sourced models and tokenizes a prompt', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/AI Workload Cost Calculator/);
  await expect(page.getByRole('heading', { level: 1, name: 'See what a prompt or AI session could cost.' })).toBeVisible();
  await expect(page.getByText(/\d[\d,]* priced models/)).toBeVisible();
  await expect(page.getByText(/Pricing source:/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compare selected models' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Prompt' }).fill('hello');
  await expect(page.getByTestId('prompt-token-count')).toContainText(/^1 token/);
  await expect(page.getByText('Paste a prompt to inspect token fragments.')).toBeHidden();
  await expect(page.getByText(/Stateless mode prices each turn independently/)).toBeVisible();
  await expect(page.getByTestId('primary-session-cost')).not.toHaveText('Unavailable');
});

test('the primary workbench and result fit inside the first desktop viewport', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const plannerBox = await page.locator('#planner').boundingBox();
    const resultBox = await page.getByTestId('primary-session-cost').boundingBox();
    expect(plannerBox?.y).toBeLessThan(480);
    expect(resultBox?.y).toBeLessThan(viewport.height);
  }
});

test('model comparison supports two or three credible priced models', async ({ page }) => {
  await page.goto('/');

  const rows = page.getByTestId('comparison-model-row');
  await expect(rows).toHaveCount(2);
  await page.getByRole('button', { name: 'Add comparison model' }).click();
  await expect(rows).toHaveCount(3);
  await expect(page.locator('.comparison-observation').getByText(/Lowest estimated cost in this selection/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost by model' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Billable work' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost by turn' })).toBeVisible();
  await page.getByRole('button', { name: 'Annual', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Annual', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^Remove / }).first().click();
  await expect(rows).toHaveCount(2);
});

test('cost receipt exports as a PNG without uploading the prompt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function captureReceiptExport() {
      if (this.download === 'prompt-info-cost-receipt.png') {
        (window as unknown as { __receiptExport?: { download: string; href: string } }).__receiptExport = {
          download: this.download,
          href: this.href,
        };
        return;
      }
      originalClick.call(this);
    };
  });
  await page.getByRole('textbox', { name: 'Prompt' }).fill('PRIVATE_EXPORT_PROMPT');
  await expect(page.getByTestId('primary-session-cost')).not.toHaveText('Unavailable');
  await expect(page.getByRole('button', { name: 'Save receipt image' })).toBeEnabled();

  await page.getByRole('button', { name: 'Save receipt image' }).click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __receiptExport?: { download: string; href: string } }
  ).__receiptExport)).toMatchObject({
    download: 'prompt-info-cost-receipt.png',
    href: expect.stringMatching(/^data:image\/png;base64,/),
  });
  const exportedHref = await page.evaluate(() => (
    window as unknown as { __receiptExport: { href: string } }
  ).__receiptExport.href);
  expect(exportedHref.includes('PRIVATE_EXPORT_PROMPT')).toBe(false);
});

test('scenario export downloads prompt-free reproducible assumptions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Prompt' }).fill('PRIVATE_SCENARIO_PROMPT');
  await expect(page.getByTestId('prompt-token-count')).toContainText(/^[1-9]\d* tokens?/);
  await expect(page.getByRole('button', { name: 'Export scenario JSON' })).toBeEnabled();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export scenario JSON' }).click();
  const download = await downloadPromise;
  await expect(page.getByText('Scenario exported without prompt text.')).toBeVisible();
  expect(download.suggestedFilename()).toMatch(/^prompt-info-scenario-\d{4}-\d{2}-\d{2}\.json$/);
  const stream = await download.createReadStream();
  let exportedText = '';
  for await (const chunk of stream) exportedText += chunk.toString();
  expect(exportedText).not.toContain('PRIVATE_SCENARIO_PROMPT');
  const recipe = JSON.parse(exportedText);
  expect(recipe.privacy).toEqual({ promptIncluded: false });
  expect(recipe.promptTokens).toBeGreaterThan(0);
  expect(recipe.selectedModels.length).toBeGreaterThan(0);
});

test('model browser shows rates and context before selection', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Open model results' }).first().click();
  const options = page.getByRole('listbox').getByRole('option');
  await expect(options).toHaveCount(12);
  const firstOption = options.first();
  await expect(firstOption).toContainText(/\$.*in.*\$.*out/i);
  await expect(firstOption).toContainText(/context/i);
});

test('session chart follows the latest turn until the user inspects a point', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel(/Turns per run/).fill('12');
  await page.getByLabel(/Turns per run/).blur();
  const selectedDetail = page.locator('.session-selected-detail');
  await expect(selectedDetail).toContainText('Selected turn');
  await expect(selectedDetail.locator('strong').first()).toHaveText('12');

  const activePoint = page.locator('.session-point-group[tabindex="0"]');
  await expect(activePoint).toHaveAttribute('aria-label', /^Turn 12,/);
  await activePoint.press('ArrowLeft');
  await expect(selectedDetail.locator('strong').first()).toHaveText('11');
});

test('cost workbench scales one AI session into a recurring workload', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: 'Prompt' }).fill('Summarize this support ticket and draft a reply.');
  await page.getByLabel(/Turns per run/).fill('3');
  await page.getByLabel(/Turns per run/).blur();
  await page.getByLabel(/Session behavior/).selectOption('scenario');
  await page.getByLabel(/Runs per period/).fill('40');
  await page.getByLabel(/Runs per period/).blur();
  await page.getByLabel(/Workload cadence/).selectOption('week');

  await expect(page.locator('.receipt-total-grid').getByText('Monthly', { exact: true })).toBeVisible();
  await expect(page.locator('.receipt-total-grid').getByText('Annual', { exact: true })).toBeVisible();
  await expect(page.locator('.receipt-total-grid dd').nth(1)).not.toHaveText('Unavailable');
  await expect(page.getByTestId('primary-session-cost')).not.toHaveText('Unavailable');
});

test('format lab reuses the in-memory prompt scenario from the planner', async ({ page }) => {
  await page.goto('/');

  const prompt = 'Compare the two migration plans and return a risk table.';
  await page.getByRole('textbox', { name: 'Prompt' }).fill(prompt);
  await page.getByRole('link', { name: 'Compare formats' }).click();

  await expect(page).toHaveURL(/\/format-comparison\/$/);
  await expect(page.getByLabel('Source prompt')).toHaveValue(prompt);
  await expect(page.getByText('Planner scenario loaded')).toBeVisible();
});

test('format comparison updates the shared payload', async ({ page }) => {
  await page.goto('/format-comparison/');

  await page.getByLabel('Source prompt').fill('Hello world');
  await expect(page.getByText('11 / 200,000 chars')).toBeVisible();
  await expect(page.getByText('tokens unavailable')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy TOON snippet' })).toBeVisible();
});

test('format comparison can switch tokenizers and exposes signed token differences', async ({ page }) => {
  await page.goto('/format-comparison/');

  await page.getByLabel('Tokenizer').selectOption('cl100k_base');
  await expect(page.getByText('Tokenized with cl100k_base')).toBeVisible();
  await expect(page.getByText('Raw prompt baseline')).toBeVisible();
  await expect(page.getByText(/net token difference/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Token overhead at a glance' })).toBeVisible();
});

test('token efficiency lab recomputes cost per task from edited inputs', async ({ page }) => {
  await page.goto('/token-efficiency/');

  await expect(page).toHaveTitle(/LLM Token Efficiency Comparison/);
  await expect(page.getByRole('heading', { level: 1, name: 'Token price is only half the cost.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost per task', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Output tokens per task', exact: true })).toBeVisible();

  const solCard = page.locator('#efficiency-lab article').first();
  await expect(solCard.locator('output').first()).toHaveText('$0.3200');

  await page.locator('#gpt-5-6-sol-output-tokens').fill('30000');
  await expect(solCard.locator('output').first()).toHaveText('$0.6200');
});

test('token efficiency lab loads an attributed model catalog', async ({ page }) => {
  await page.goto('/token-efficiency/');

  await expect(page.getByText(/Artificial Analysis catalog/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Artificial Analysis', exact: true })).toHaveAttribute(
    'href',
    'https://artificialanalysis.ai/',
  );
  await expect(page.getByLabel('Comparison model 1')).toBeVisible();
});

test('token efficiency lab can reuse the active planner workload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Prompt' }).fill('Audit this pull request for regressions.');
  await page.getByLabel('Runs per period').fill('25');
  await page.getByLabel('Runs per period').blur();
  await page.getByLabel('Workload cadence').selectOption('month');
  await page.getByRole('link', { name: 'Compare cost per task' }).click();

  await page.getByRole('button', { name: 'Use planner workload' }).click();
  await expect(page.getByLabel('Tasks in workload')).toHaveValue('25');
  await expect(page.getByText('Planner scenario applied')).toBeVisible();
});

test('theme selection persists across reloads', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Toggle light and dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
});

test('pricing function returns a populated, cacheable model map', async ({ request }) => {
  const response = await request.get('/api/pricing');

  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('max-age=900');
  const body = await response.json();
  expect(body.schemaVersion).toBe(1);
  expect(body.source).toBeTruthy();
  expect(body.freshness).toBeTruthy();
  expect(Object.keys(body.data).length).toBeGreaterThan(20);
});

test('benchmark function returns an attributed Artificial Analysis catalog', async ({ request }) => {
  const response = await request.get('/api/benchmarks');

  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('max-age=900');
  const body = await response.json();
  expect(body.attribution.url).toBe('https://artificialanalysis.ai/');
  expect(body.data.length).toBeGreaterThanOrEqual(3);
});

test('unknown routes return a noindex 404 with recovery navigation', async ({ page }) => {
  const response = await page.goto('/definitely-not-a-real-route');

  expect(response?.status()).toBe(404);
  const robotsMeta = page.locator('meta[name="robots"]');
  await expect(robotsMeta).toHaveCount(1);
  await expect(robotsMeta).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('heading', { level: 1, name: 'That page is not here.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Cost calculator/ }).last()).toBeVisible();
});
