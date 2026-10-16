import { expect, test, type Page } from '@playwright/test';

// Links from the retired session calculator carried runs and cadence. A
// one-time batch must keep its charged total through import, the receipt and
// the re-shared link, and must never be relabelled as monthly volume.

const CATALOG = {
  schemaVersion: 1,
  data: {
    'Test Lab: Flat': {
      // $1 per 1K input and $5 per 1K output: 500 in + 100 out = $1.00 a task.
      pricing: { input: 1, output: 5 },
      co2eFactor: 0.0002, maxOutputTokens: 64000, contextWindowTokens: 200000, openRouterId: 'test/flat',
    },
  },
  source: 'openrouter-live',
  sourceUrl: 'https://openrouter.ai/api/v1/models',
  retrievedAt: '2026-10-15T00:00:00.000Z',
  freshness: 'live',
  isFallback: false,
  fallbackReason: null,
};
const OLD = '/?models=test/flat&tokens=500&out=100&turns=1&mode=baseline';

async function open(page: Page, path: string) {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CATALOG) }));
  await page.goto(path);
  await expect(page.getByTestId('agent-run-total')).toHaveText('$1.00');
}

for (const query of ['&runs=10&cadence=once', '&runs=10']) {
  test(`old one-time batch link (${query}) shows the batch total, range and one-time label`, async ({ page }) => {
    await open(page, OLD + query);
    await expect(page.getByTestId('agent-run-range')).toHaveText('$1.00 – $1.00');
    await expect(page.getByTestId('agent-batch-total')).toHaveText('$10.00');
    await expect(page.getByTestId('agent-batch-range')).toHaveText('Range $10.00 – $10.00');
    await expect(page.getByText('One-time batch of 10 tasks', { exact: true })).toBeVisible();
    await expect(page.getByTestId('agent-monthly-total')).toHaveCount(0);
    await expect(page.getByText(/tasks \/ month/)).toHaveCount(0);
  });
}

test('one-time batch survives the copied receipt and a re-shared link', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-specific here');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, `${OLD}&runs=10&cadence=once`);
  await page.getByRole('button', { name: 'Copy receipt' }).click();
  await expect(page.getByText('Receipt copied.', { exact: true })).toBeVisible();
  const receipt = await page.evaluate(() => navigator.clipboard.readText());
  expect(receipt).toContain('One-time batch of 10 tasks: $10.00 (range $10.00 – $10.00)');
  expect(receipt).not.toContain('month');
  await page.getByRole('button', { name: 'Copy a link to this plan' }).click();
  await expect(page.getByText(/Copied a restorable link/)).toBeVisible();
  const link = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  const shared = JSON.parse(new URLSearchParams(link.hash.slice(1)).get('plan')!);
  expect(shared).toMatchObject({ runs: 1, recurring: false, batchRuns: 10 });
  expect(shared.plan.workers).toBeUndefined();
  await page.goto(link.pathname + link.hash);
  await expect(page.getByTestId('agent-batch-total')).toHaveText('$10.00');
  await expect(page.getByText('One-time batch of 10 tasks', { exact: true })).toBeVisible();
});

test('old single-run link shows no batch or monthly total', async ({ page }) => {
  await open(page, `${OLD}&runs=1&cadence=once`);
  await expect(page.getByTestId('agent-batch-total')).toHaveCount(0);
  await expect(page.getByTestId('agent-monthly-total')).toHaveCount(0);
});

for (const [query, label, total, notice] of [
  ['&runs=10&cadence=month', '10 tasks / month', '$10.00', null],
  ['&runs=12&cadence=week', '52 tasks / month', '$52.00', null],
  ['&runs=10&cadence=day', '304 tasks / month', '$304.00', 'This older link priced 10 runs per day. The planner counts tasks per month, so it uses 304 tasks/month (rounded).'],
] as const) {
  test(`old recurring link (${query}) shows ${label}`, async ({ page }) => {
    await open(page, OLD + query);
    await expect(page.getByText(label, { exact: true })).toBeVisible();
    await expect(page.getByTestId('agent-monthly-total')).toHaveText(total);
    await expect(page.getByTestId('agent-batch-total')).toHaveCount(0);
    if (notice) await expect(page.getByText(notice, { exact: true })).toBeVisible();
  });
}

test('old values the planner cannot represent show a visible warning', async ({ page }) => {
  await open(page, `${OLD}&runs=0&cadence=year`);
  await expect(page.getByText('This older link had an unsupported runs value (runs=0). It was ignored and the default was used.', { exact: true })).toBeVisible();
  await expect(page.getByText('This older link had an unsupported cadence value (cadence=year). It was ignored and the default was used.', { exact: true })).toBeVisible();
});

test('an invalid batch size blocks copying and sharing until it is corrected', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-specific here');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, `${OLD}&runs=10&cadence=once`);
  await page.getByRole('tab', { name: 'Run settings', exact: true }).click();
  await page.getByText('Optional budget planning', { exact: true }).click();
  const field = page.getByLabel('Tasks in this one-time batch', { exact: true });
  const share = page.getByRole('button', { name: 'Copy a link to this plan' });
  for (const bad of ['0', '-3', '']) {
    await field.fill(bad);
    await expect(page.getByText('Enter 1–1,000,000 tasks for the one-time batch. The per-task estimate is unchanged.', { exact: true })).toBeVisible();
    await expect(page.getByTestId('agent-batch-total')).toHaveText('Unavailable');
    await expect(share).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Copy receipt' }).first()).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save image' })).toBeDisabled();
  }
  await page.evaluate(() => navigator.clipboard.writeText('untouched'));
  await share.click({ force: true });
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('untouched');
  await page.getByRole('tab', { name: 'Run settings', exact: true }).click();
  await field.fill('12');
  await expect(page.getByTestId('agent-batch-total')).toHaveText('$12.00');
  await expect(share).toBeEnabled();
  await share.click();
  await expect(page.getByText(/Copied a restorable link/)).toBeVisible();
  const link = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(JSON.parse(new URLSearchParams(link.hash.slice(1)).get('plan')!)).toMatchObject({ runs: 1, recurring: false, batchRuns: 12 });
});

test('editing the batch back to one keeps the control and prices a single task', async ({ page }) => {
  await open(page, `${OLD}&runs=10&cadence=once`);
  await page.getByRole('tab', { name: 'Run settings', exact: true }).click();
  await page.getByText('Optional budget planning', { exact: true }).click();
  const field = page.getByLabel('Tasks in this one-time batch', { exact: true });
  await field.fill('1');
  await expect(field).toBeVisible();
  await expect(page.getByTestId('agent-batch-total')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy a link to this plan' })).toBeEnabled();
  await field.fill('3');
  await expect(page.getByTestId('agent-batch-total')).toHaveText('$3.00');
  await page.getByLabel('Estimate a monthly budget', { exact: true }).check();
  await expect(field).toHaveCount(0);
  await expect(page.getByTestId('agent-batch-total')).toHaveCount(0);
  await expect(page.getByTestId('agent-monthly-total')).toBeVisible();
  await page.getByLabel('Estimate a monthly budget', { exact: true }).uncheck();
  await expect(page.getByTestId('agent-batch-total')).toHaveText('$3.00');
});

test('an old link with only unsupported values shows a notice', async ({ page }) => {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CATALOG) }));
  await page.goto('/?runs=0&cadence=year');
  await expect(page.getByText('This older link had an unsupported runs value (runs=0). It was ignored and the default was used.', { exact: true })).toBeVisible();
  await expect(page.getByText('This older link had an unsupported cadence value (cadence=year). It was ignored and the default was used.', { exact: true })).toBeVisible();
});
