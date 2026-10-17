import { expect, test, type Page } from '@playwright/test';

// A price refresh re-applies the current selection to the new catalog: chosen
// models stay while available, ones that disappear are reported and come back
// when they reappear, and the priced model is always one of the selected ones.

const model = (input: number, output: number, id: string) => ({
  pricing: { input, output },
  co2eFactor: 0.0002, maxOutputTokens: 64000, contextWindowTokens: 200000, openRouterId: id,
});
// 500 input and 100 output tokens cost $1.00 on Flat, $2.00 on Other, $3.00 on Third.
const FLAT = { 'Test Lab: Flat': model(1, 5, 'test/flat') };
const OTHER = { 'Test Lab: Other': model(2, 10, 'test/other') };
const THIRD = { 'Test Lab: Third': model(3, 15, 'test/third') };
const ALL = { ...FLAT, ...OTHER, ...THIRD };

function planHash(models: string[]) {
  const shared = {
    version: 1,
    plan: { instructionTokens: 300, taskTokens: 200, toolTokensPerStep: 0, visibleOutputTokens: 100, reasoningTokens: 0, steps: 1, keepHistory: false, cacheEnabled: false, cacheHitPct: 0 },
    models, runs: 1, variance: 30,
  };
  return `#${new URLSearchParams({ plan: JSON.stringify(shared) })}`;
}
const PLAN = planHash(['Test Lab: Flat', 'Test Lab: Other']);

const total = (page: Page) => page.getByTestId('agent-run-total');
const missing = (page: Page) => page.getByText(/^Saved models absent from the catalog:/);

// Serves whichever catalog the test last set; `null` serves an invalid one.
async function mockCatalog(page: Page, initial: Record<string, unknown>) {
  let data: Record<string, unknown> | null = initial;
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      schemaVersion: 1, data: data ?? {}, source: 'openrouter-live', sourceUrl: 'https://openrouter.ai/api/v1/models',
      retrievedAt: '2026-10-15T00:00:00.000Z', freshness: 'live', isFallback: false, fallbackReason: null,
    }),
  }));
  await page.route(/\/data\/llm-data\.json$/, route => route.fulfill({ status: 404, body: '' }));
  return (next: Record<string, unknown> | null) => { data = next; };
}

async function refresh(page: Page) {
  const details = page.getByText('Prices, sources and calculation details', { exact: true });
  const button = page.getByRole('button', { name: 'Refresh prices', exact: true });
  if (!(await button.isVisible())) await details.click();
  await button.click();
  await expect(button).toBeEnabled();
}

async function addModel(page: Page, after: string[]) {
  const tab = page.getByRole('tab', { name: 'Compare models', exact: true });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await page.getByRole('button', { name: 'Add model', exact: true }).click();
  await expectSelected(page, after);
}

const shown = (page: Page) => page.locator('button[aria-label^="Remove "]').evaluateAll(
  nodes => nodes.map(node => node.getAttribute('aria-label')!.slice('Remove '.length)),
);

// Stand-ins come from the default-model ranking, so only their set is checked.
async function expectStandIns(page: Page, names: string[]) {
  await expect.poll(async () => (await shown(page)).sort()).toEqual([...names].sort());
}

async function expectSelected(page: Page, names: string[]) {
  await expect.poll(() => page.locator('button[aria-label^="Remove "]').evaluateAll(
    nodes => nodes.map(node => node.getAttribute('aria-label')!.slice('Remove '.length)),
  )).toEqual(names);
}

test('removing the active model keeps a selected survivor priced and reports the loss', async ({ page }) => {
  const setCatalog = await mockCatalog(page, ALL);
  await page.goto(`/${PLAN}`);
  await expect(total(page)).toHaveText('$1.00');
  setCatalog({ ...OTHER, ...THIRD });
  await refresh(page);
  await expectSelected(page, ['Test Lab: Other']);
  await expect(total(page)).toHaveText('$2.00');
  await expect(missing(page)).toContainText('Test Lab: Flat');
  // Adding another model must not make it the priced model.
  await addModel(page, ['Test Lab: Other', 'Test Lab: Third']);
  await expect(total(page)).toHaveText('$2.00');
});

test('removing every selected model falls back to defaults and names both as missing', async ({ page }) => {
  const setCatalog = await mockCatalog(page, ALL);
  await page.goto(`/${PLAN}`);
  await expect(total(page)).toHaveText('$1.00');
  setCatalog(THIRD);
  await refresh(page);
  await expectSelected(page, ['Test Lab: Third']);
  await expect(total(page)).toHaveText('$3.00');
  await expect(missing(page)).toContainText('Test Lab: Flat, Test Lab: Other');
});

test('a missing model that reappears returns to the selection and clears its notice', async ({ page }) => {
  const setCatalog = await mockCatalog(page, ALL);
  await page.goto(`/${PLAN}`);
  await expect(total(page)).toHaveText('$1.00');
  setCatalog({ ...OTHER, ...THIRD });
  await refresh(page);
  await expect(missing(page)).toContainText('Test Lab: Flat');
  setCatalog(ALL);
  await refresh(page);
  await expectSelected(page, ['Test Lab: Flat', 'Test Lab: Other']);
  await expect(total(page)).toHaveText('$2.00');
  await expect(missing(page)).toHaveCount(0);
});

test('a link model missing on first load is restored when the catalog gains it', async ({ page }) => {
  const setCatalog = await mockCatalog(page, OTHER);
  await page.goto(`/${PLAN}`);
  await expect(total(page)).toHaveText('$2.00');
  await expect(missing(page)).toContainText('Test Lab: Flat');
  setCatalog(ALL);
  await refresh(page);
  await expectSelected(page, ['Test Lab: Flat', 'Test Lab: Other']);
  await expect(missing(page)).toHaveCount(0);
});

test('repeated refreshes with the same catalog keep the selection and the notice', async ({ page }) => {
  const setCatalog = await mockCatalog(page, ALL);
  await page.goto(`/${PLAN}`);
  await expect(total(page)).toHaveText('$1.00');
  setCatalog({ ...OTHER, ...THIRD });
  for (let i = 0; i < 3; i += 1) {
    await refresh(page);
    await expectSelected(page, ['Test Lab: Other']);
    await expect(total(page)).toHaveText('$2.00');
    await expect(missing(page)).toContainText('Test Lab: Flat');
  }
});

test('a model removed by the user is not re-imported from the link on refresh', async ({ page }) => {
  await mockCatalog(page, ALL);
  await page.goto(`/${PLAN}`);
  await expect(total(page)).toHaveText('$1.00');
  await page.getByRole('tab', { name: 'Compare models', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Test Lab: Flat', exact: true }).click();
  await expectSelected(page, ['Test Lab: Other']);
  await expect(total(page)).toHaveText('$2.00');
  await refresh(page);
  await expectSelected(page, ['Test Lab: Other']);
  await expect(total(page)).toHaveText('$2.00');
  await expect(missing(page)).toHaveCount(0);
  // Re-adding the removed model must not make it the priced model again.
  await addModel(page, ['Test Lab: Other', 'Test Lab: Flat']);
  await expect(total(page)).toHaveText('$2.00');
});

test('a model the user switches to stays priced across refreshes that drop another model', async ({ page }) => {
  const setCatalog = await mockCatalog(page, ALL);
  await page.goto(`/${PLAN}`);
  await expect(total(page)).toHaveText('$1.00');
  await page.getByRole('combobox', { name: 'Model to price', exact: true }).fill('Other');
  await page.getByRole('option', { name: /Test Lab: Other/ }).first().click();
  await expect(total(page)).toHaveText('$2.00');
  setCatalog({ ...OTHER, ...THIRD });
  await refresh(page);
  await expect(total(page)).toHaveText('$2.00');
  setCatalog(ALL);
  await refresh(page);
  await expect(total(page)).toHaveText('$2.00');
  await expectSelected(page, ['Test Lab: Flat', 'Test Lab: Other']);
});

test('an empty catalog keeps the current selection and a later catalog still applies', async ({ page }) => {
  const setCatalog = await mockCatalog(page, ALL);
  await page.goto(`/${PLAN}`);
  await expect(total(page)).toHaveText('$1.00');
  setCatalog(null);
  await refresh(page);
  await expect(page.locator('p.agent-warning[role="alert"]').first()).toContainText('Pricing catalog is unavailable');
  await expectSelected(page, ['Test Lab: Flat', 'Test Lab: Other']);
  await expect(total(page)).toHaveText('$1.00');
  setCatalog({ ...OTHER });
  await refresh(page);
  await expectSelected(page, ['Test Lab: Other']);
  await expect(total(page)).toHaveText('$2.00');
  await expect(missing(page)).toContainText('Test Lab: Flat');
});

// Six chosen models, four stand-ins the defaults can come from, and one extra.
const PICKS = [1, 2, 3, 4, 5, 6].map(n => `Test Lab: Pick ${n}`);
const SPARES = [1, 2, 3, 4].map(n => `Test Lab: Spare ${n}`);
const EXTRA = 'Test Lab: Extra';
const entries = (names: string[]) => Object.fromEntries(names.map((name, i) => [name, model(1 + i, 5, `test/m${i}`)]));
const SIX_PLAN = planHash(PICKS);

test('all chosen models gone then back restores exactly the six chosen models', async ({ page }) => {
  const setCatalog = await mockCatalog(page, entries([...PICKS, ...SPARES]));
  await page.goto(`/${SIX_PLAN}`);
  await expectSelected(page, PICKS);
  setCatalog(entries(SPARES));
  await refresh(page);
  await expectStandIns(page, SPARES);
  await expect(missing(page)).toContainText(PICKS.join(', '));
  setCatalog(entries([...PICKS, ...SPARES]));
  await refresh(page);
  await expectSelected(page, PICKS);
  await expect(missing(page)).toHaveCount(0);
});

test('a partial return shows only the returning chosen model, not the stand-ins', async ({ page }) => {
  const setCatalog = await mockCatalog(page, entries([...PICKS, ...SPARES]));
  await page.goto(`/${SIX_PLAN}`);
  await expectSelected(page, PICKS);
  setCatalog(entries(SPARES));
  await refresh(page);
  setCatalog(entries([PICKS[2], ...SPARES]));
  await refresh(page);
  await expectSelected(page, [PICKS[2]]);
  await expect(missing(page)).toContainText([...PICKS.slice(0, 2), ...PICKS.slice(3)].join(', '));
});

test('repeated catalog churn never accumulates stand-ins', async ({ page }) => {
  const setCatalog = await mockCatalog(page, entries([...PICKS, ...SPARES]));
  await page.goto(`/${SIX_PLAN}`);
  for (let i = 0; i < 3; i += 1) {
    setCatalog(entries(SPARES));
    await refresh(page);
    await expectStandIns(page, SPARES);
    setCatalog(entries([...PICKS.slice(0, 2), ...SPARES]));
    await refresh(page);
    await expectSelected(page, PICKS.slice(0, 2));
  }
  setCatalog(entries([...PICKS, ...SPARES]));
  await refresh(page);
  await expectSelected(page, PICKS);
});

test('an edit during the fallback keeps the edited list and returning models fill only to six', async ({ page }) => {
  const setCatalog = await mockCatalog(page, entries([...PICKS, ...SPARES]));
  await page.goto(`/${SIX_PLAN}`);
  setCatalog(entries(SPARES));
  await refresh(page);
  await expectStandIns(page, SPARES);
  await page.getByRole('tab', { name: 'Compare models', exact: true }).click();
  const standIns = await shown(page);
  await page.getByRole('button', { name: `Remove ${standIns[3]}`, exact: true }).click();
  await expectSelected(page, standIns.slice(0, 3));
  setCatalog(entries([...PICKS, ...SPARES]));
  await refresh(page);
  // The kept stand-ins are now choices; the first three chosen models fill the remaining slots.
  await expectSelected(page, [...standIns.slice(0, 3), ...PICKS.slice(0, 3)]);
  await expect(missing(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add model', exact: true })).toBeDisabled();
});

test('a model returning when six are already selected is not added or labeled absent', async ({ page }) => {
  const setCatalog = await mockCatalog(page, entries([...PICKS.slice(0, 5), EXTRA]));
  await page.goto(`/${SIX_PLAN}`);
  await expectSelected(page, PICKS.slice(0, 5));
  await expect(missing(page)).toContainText(PICKS[5]);
  await addModel(page, [...PICKS.slice(0, 5), EXTRA]);
  setCatalog(entries([...PICKS, EXTRA]));
  await refresh(page);
  await expectSelected(page, [...PICKS.slice(0, 5), EXTRA]);
  await expect(missing(page)).toHaveCount(0);
});
