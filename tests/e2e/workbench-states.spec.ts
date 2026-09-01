import { expect, test } from '@playwright/test';

const FALLBACK_CATALOG = {
  schemaVersion: 1,
  data: {
    'OpenAI: GPT-5.6 Sol': {
      pricing: { input: 0.004, output: 0.02 },
      co2eFactor: 0.0002,
      maxOutputTokens: 128000,
      contextWindowTokens: 1050000,
    },
    'Anthropic: Claude Sonnet 5': {
      pricing: { input: 0.003, output: 0.015 },
      co2eFactor: 0.0002,
      maxOutputTokens: 128000,
      contextWindowTokens: 1000000,
    },
  },
  source: 'bundled-static',
  sourceUrl: 'https://prompt-info.helloworldfirm.com/data/llm-data.json',
  retrievedAt: '2026-09-01T18:00:00.000Z',
  freshness: 'static',
  isFallback: true,
  fallbackReason: 'OpenRouter pricing was unavailable. Using the bundled dated catalog.',
};

test('labels a usable static fallback before showing recommendations', async ({ page }) => {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(FALLBACK_CATALOG),
  }));

  await page.goto('/');

  const sourceStatus = page.locator('.source-status');
  await expect(sourceStatus.getByText('Bundled dated catalog', { exact: true })).toBeVisible();
  await expect(sourceStatus).toContainText('OpenRouter pricing was unavailable');
  await expect(page.getByTestId('primary-session-cost')).not.toHaveText('Unavailable');
});

test('shows a recoverable error when neither API nor bundled data is usable', async ({ page }) => {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.route(/\/data\/llm-data\.json(?:\?.*)?$/, route => route.fulfill({ status: 503, body: 'unavailable' }));

  await page.goto('/');

  await expect(page.locator('.source-status[role="alert"]')).toContainText('Pricing source: unavailable');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByTestId('primary-session-cost')).toHaveText('Unavailable');
});

test('keeps pasted prompt text out of every network request', async ({ page }) => {
  const sentinel = 'PRIVATE_PROMPT_SENTINEL_9c2f5b';
  const requests: Array<{ url: string; postData: string | null }> = [];
  page.on('request', request => requests.push({ url: request.url(), postData: request.postData() }));

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Prompt' }).fill(sentinel);
  await expect(page.getByTestId('prompt-token-count')).not.toContainText('counting');

  expect(requests.some(request => /openrouter|artificialanalysis|supabase/i.test(request.url))).toBe(false);
  expect(requests.some(request => request.url.includes(sentinel))).toBe(false);
  expect(requests.some(request => request.postData?.includes(sentinel))).toBe(false);
});

test('supports keyboard access to the model browser and evidence disclosures', async ({ page }) => {
  await page.goto('/');

  const modelInput = page.getByLabel('Comparison model 1');
  await modelInput.focus();
  await modelInput.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await modelInput.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();

  const disclosure = page.getByText('Exact cost data', { exact: true });
  await disclosure.focus();
  await disclosure.press('Enter');
  await expect(page.getByRole('table').first()).toBeVisible();
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('mobile keeps the prompt before the planning receipt', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const promptTop = await page.getByRole('textbox', { name: 'Prompt' }).evaluate(element => (
    element.getBoundingClientRect().top
  ));
  const receiptTop = await page.locator('.cost-workbench-receipt').evaluate(element => (
    element.getBoundingClientRect().top
  ));
  expect(promptTop).toBeLessThan(receiptTop);
});
