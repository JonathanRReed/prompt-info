import { expect, test, type Page } from '@playwright/test';
import fixtures from '../fixtures/usage-iterations.json';

// Synthetic rates keep these receipt assertions independent of live catalogs.
const catalog = {
  schemaVersion: 1,
  source: 'openrouter-live',
  sourceUrl: 'https://openrouter.ai/api/v1/models',
  retrievedAt: '2026-10-27T00:00:00Z',
  freshness: 'live',
  isFallback: false,
  fallbackReason: null,
  data: {
    'OpenAI: GPT-6.1 Sol': {
      pricing: { input: 0.002, output: 0.01 },
      co2eFactor: 0,
      contextWindowTokens: 1000000,
      maxOutputTokens: 128000,
      openRouterId: 'openai/gpt-6.1-sol',
    },
    'Anthropic: Claude Sonnet 5.5': {
      pricing: { input: 0.003, output: 0.015 },
      co2eFactor: 0,
      contextWindowTokens: 1000000,
      maxOutputTokens: 128000,
      openRouterId: 'anthropic/claude-sonnet-5.5',
    },
  },
};

async function importValue(page: Page, value: unknown) {
  await page.getByLabel('Usage object or array of requests').fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Replace rows with imported usage', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, (route) => route.fulfill({ json: catalog }));
  await page.goto('/?model=openai/gpt-6.1-sol');
  await page.getByRole('button', { name: 'Use actual token usage', exact: true }).click();
  await page.getByText('Import API usage JSON', { exact: true }).click();
  await importValue(page, { input: 1000, output: 500 });
  await expect(page.getByTestId('measured-total')).toHaveText('$0.0070');
});

for (const name of ['threshold', 'advisor'] as const) {
  test(`${name} rejection hides the old receipt and recovers only after a valid import`, async ({ page, context }) => {
    const sent: string[] = [];
    page.on('request', (request) => sent.push(request.url() + (request.postData() ?? '')));
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const copy = page.getByRole('button', { name: 'Copy usage receipt', exact: true });
    await copy.click();
    await expect(page.getByText('Receipt copied.', { exact: true })).toBeVisible();
    await expect(page.getByText('Anthropic: Claude Sonnet 5.5: $0.0105', { exact: true })).toBeVisible();

    const rejected = { ...fixtures[name], ignored: 'PRIVATE_ITERATION_IMPORT_SENTINEL' };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await importValue(page, rejected);
      await expect(page.getByRole('status').filter({ hasText: /Request 1:.*Iteration/i }))
        .toContainText(/not supported.*no cost/i);
      await expect(page.getByTestId('measured-total')).toHaveText('Unavailable');
      await expect(copy).toBeDisabled();
      await expect(page.getByText('Receipt copied.', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Anthropic: Claude Sonnet 5.5: $0.0105', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Total input', { exact: true })).toHaveValue('1000');
      await expect(page.getByLabel('Total output, including thinking', { exact: true })).toHaveValue('500');
      await expect(page.getByLabel('Usage object or array of requests')).toHaveValue(JSON.stringify(rejected));
    }

    // Editing the rejected JSON is not acceptance of the preserved rows.
    await page.getByLabel('Usage object or array of requests').fill('');
    await expect(page.getByTestId('measured-total')).toHaveText('Unavailable');
    await expect(copy).toBeDisabled();
    await importValue(page, { input: 2000, output: 1000 });
    await expect(page.getByTestId('measured-total')).toHaveText('$0.0140');
    await expect(copy).toBeEnabled();
    await expect(page.getByRole('status').filter({ hasText: /Iteration/i })).toHaveCount(0);
    await expect(page.getByText('Anthropic: Claude Sonnet 5.5: $0.0210', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Usage object or array of requests')).toHaveValue('');
    expect(sent.join(' ')).not.toContain('PRIVATE_ITERATION_IMPORT_SENTINEL');
  });
}

test('a second-request rejection preserves rows without a partial receipt, then manual editing recovers', async ({ page }) => {
  await importValue(page, [{ input: 999, output: 99 }, fixtures.advisor]);
  await expect(page.getByRole('status').filter({ hasText: /Request 2:.*Iteration/i })).toBeVisible();
  await expect(page.getByTestId('measured-total')).toHaveText('Unavailable');
  await expect(page.getByRole('button', { name: 'Copy usage receipt', exact: true })).toBeDisabled();
  await expect(page.getByRole('group', { name: 'Request 1', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Request 2', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Total input', { exact: true })).toHaveValue('1000');
  await expect(page.getByLabel('Total output, including thinking', { exact: true })).toHaveValue('500');

  await page.getByLabel('Total input', { exact: true }).fill('1100');
  await expect(page.getByTestId('measured-total')).toHaveText('$0.0072');
  await expect(page.getByRole('button', { name: 'Copy usage receipt', exact: true })).toBeEnabled();
  await expect(page.getByRole('status').filter({ hasText: /Request 2:.*Iteration/i })).toHaveCount(0);
  await expect(page.getByText('Anthropic: Claude Sonnet 5.5: $0.0108', { exact: true })).toBeVisible();
});

test('clipboard completion from the previous receipt stays hidden after import rejection', async ({ page }) => {
  await page.evaluate(() => {
    const state = window as Window & { finishUsageCopy?: () => void };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => new Promise<void>((resolve) => {
          state.finishUsageCopy = resolve;
        }),
      },
    });
  });
  const copy = page.getByRole('button', { name: 'Copy usage receipt', exact: true });
  await copy.click();
  await expect.poll(() => page.evaluate(() =>
    typeof (window as Window & { finishUsageCopy?: () => void }).finishUsageCopy,
  )).toBe('function');

  await importValue(page, fixtures.threshold);
  await expect(page.getByRole('status').filter({ hasText: /Request 1:.*Iteration/i })).toBeVisible();
  await page.evaluate(async () => {
    (window as Window & { finishUsageCopy?: () => void }).finishUsageCopy!();
    // Let the fulfilled clipboard handler and its React render reach a paint.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  await expect(page.getByText('Receipt copied.', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('measured-total')).toHaveText('Unavailable');
  await expect(copy).toBeDisabled();
});

test('old clipboard completion stays hidden after manual recovery', async ({ page }) => {
  await page.evaluate(() => {
    const state = window as Window & { finishUsageCopy?: () => void };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => new Promise<void>((resolve) => {
          state.finishUsageCopy = resolve;
        }),
      },
    });
  });
  const copy = page.getByRole('button', { name: 'Copy usage receipt', exact: true });
  await copy.click();
  await expect.poll(() => page.evaluate(() =>
    typeof (window as Window & { finishUsageCopy?: () => void }).finishUsageCopy,
  )).toBe('function');

  await importValue(page, fixtures.threshold);
  await expect(page.getByRole('status').filter({ hasText: /Request 1:.*Iteration/i })).toBeVisible();
  await page.getByLabel('Total input', { exact: true }).fill('1100');
  await expect(page.getByTestId('measured-total')).toHaveText('$0.0072');
  await page.evaluate(async () => {
    (window as Window & { finishUsageCopy?: () => void }).finishUsageCopy!();
    // Let the fulfilled clipboard handler and its React render reach a paint.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  await expect(page.getByText('Receipt copied.', { exact: true })).toHaveCount(0);
  await expect(copy).toBeEnabled();
});

test('old clipboard completion stays hidden after successful reimport', async ({ page }) => {
  await page.evaluate(() => {
    const state = window as Window & { finishUsageCopy?: () => void };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => new Promise<void>((resolve) => {
          state.finishUsageCopy = resolve;
        }),
      },
    });
  });
  const copy = page.getByRole('button', { name: 'Copy usage receipt', exact: true });
  await copy.click();
  await expect.poll(() => page.evaluate(() =>
    typeof (window as Window & { finishUsageCopy?: () => void }).finishUsageCopy,
  )).toBe('function');

  await importValue(page, fixtures.threshold);
  await expect(page.getByRole('status').filter({ hasText: /Request 1:.*Iteration/i })).toBeVisible();
  await importValue(page, { input: 2000, output: 1000 });
  await expect(page.getByTestId('measured-total')).toHaveText('$0.0140');
  await page.evaluate(async () => {
    (window as Window & { finishUsageCopy?: () => void }).finishUsageCopy!();
    // Let the fulfilled clipboard handler and its React render reach a paint.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  await expect(page.getByText('Receipt copied.', { exact: true })).toHaveCount(0);
  await expect(copy).toBeEnabled();
});

test('an older clipboard failure cannot overwrite a newer successful copy', async ({ page }) => {
  await page.evaluate(() => {
    const state = window as Window & { usageCopies?: { resolve: () => void; reject: () => void }[] };
    state.usageCopies = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => new Promise<void>((resolve, reject) => {
        state.usageCopies!.push({ resolve, reject: () => reject(new Error('old copy failed')) });
      }) },
    });
  });
  const copy = page.getByRole('button', { name: 'Copy usage receipt', exact: true });
  await copy.click();
  await copy.click();
  await page.evaluate(() => {
    (window as Window & { usageCopies?: { resolve: () => void }[] }).usageCopies![1].resolve();
  });
  await expect(page.getByText('Receipt copied.', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    (window as Window & { usageCopies?: { reject: () => void }[] }).usageCopies![0].reject();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  await expect(page.getByText('Receipt copied.', { exact: true })).toBeVisible();
  await expect(page.getByText('Could not copy. Select the receipt text instead.', { exact: true })).toHaveCount(0);
});
