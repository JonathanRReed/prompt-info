import { expect, test, type Page } from '@playwright/test';

// The planner imports state from a valid #plan= hash or, failing that, from an
// old calculator query. Section anchors such as #agent-price only scroll: they
// must keep the active plan, edits and notices. A different encoded plan, or
// returning through history to an entry that held one, imports that state.

const model = (input: number, output: number, id: string) => ({
  pricing: { input, output },
  co2eFactor: 0.0002, maxOutputTokens: 64000, contextWindowTokens: 200000, openRouterId: id,
});
const CATALOG = {
  schemaVersion: 1,
  data: {
    // $1 per 1K input and $5 per 1K output.
    'Test Lab: Flat': model(1, 5, 'test/flat'),
    'Test Lab: Other': model(2, 10, 'test/other'),
  },
  source: 'openrouter-live',
  sourceUrl: 'https://openrouter.ai/api/v1/models',
  retrievedAt: '2026-10-15T00:00:00.000Z',
  freshness: 'live',
  isFallback: false,
  fallbackReason: null,
};

function planHash(taskTokens: number, models = ['Test Lab: Flat']) {
  const shared = {
    version: 1,
    plan: { instructionTokens: 300, taskTokens, toolTokensPerStep: 0, visibleOutputTokens: 100, reasoningTokens: 0, steps: 1, keepHistory: false, cacheEnabled: false, cacheHitPct: 0 },
    models, runs: 1, variance: 30,
  };
  return `#${new URLSearchParams({ plan: JSON.stringify(shared) })}`;
}
const PLAN_A = planHash(200); // 500 in + 100 out on Flat = $1.00
const PLAN_B = planHash(1200); // 1500 in + 100 out on Flat = $2.00
const SUPPORTED = '?models=test/flat&tokens=500&out=900&turns=1&mode=baseline';
const UNSUPPORTED = '?runs=0&cadence=year';
const RUNS_NOTICE = 'This older link had an unsupported runs value (runs=0). It was ignored and the default was used.';
const CADENCE_NOTICE = 'This older link had an unsupported cadence value (cadence=year). It was ignored and the default was used.';

const total = (page: Page) => page.getByTestId('agent-run-total');

async function mockPricing(page: Page) {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CATALOG) }));
}

async function openReceiptAnchor(page: Page, isMobile: boolean) {
  // The receipt link lives in the mobile-only total bar; desktop fires the same hashchange.
  if (isMobile) await page.locator('.agent-mobile-total a[href="#agent-price"]').click();
  else await page.evaluate(() => { window.location.hash = 'agent-price'; });
  await expect(page).toHaveURL(/#agent-price$/);
}

async function navigateHash(page: Page, hash: string) {
  await page.evaluate((value) => { window.location.hash = value; }, hash);
}

test('a valid plan keeps precedence over a supported old query after the receipt anchor', async ({ page, isMobile }) => {
  await mockPricing(page);
  await page.goto(`/${SUPPORTED}${PLAN_A}`);
  await expect(total(page)).toHaveText('$1.00');
  await openReceiptAnchor(page, isMobile);
  await expect(total(page)).toHaveText('$1.00');
  await page.goBack();
  await expect(total(page)).toHaveText('$1.00');
  await page.goForward();
  await expect(page).toHaveURL(/#agent-price$/);
  await expect(total(page)).toHaveText('$1.00');
});

test('a valid plan does not gain unsupported old-query notices after the receipt anchor', async ({ page, isMobile }) => {
  await mockPricing(page);
  await page.goto(`/${UNSUPPORTED}${PLAN_A}`);
  await expect(total(page)).toHaveText('$1.00');
  await openReceiptAnchor(page, isMobile);
  await expect(total(page)).toHaveText('$1.00');
  await expect(page.getByText(RUNS_NOTICE, { exact: true })).toHaveCount(0);
  await expect(page.getByText(CADENCE_NOTICE, { exact: true })).toHaveCount(0);
});

test('an unreadable plan hash falls back to the old query and keeps its notices', async ({ page, isMobile }) => {
  await mockPricing(page);
  await page.goto(`/${UNSUPPORTED}#plan=broken`);
  await expect(page.getByText(RUNS_NOTICE, { exact: true })).toBeVisible();
  await openReceiptAnchor(page, isMobile);
  await expect(page.getByText(RUNS_NOTICE, { exact: true })).toBeVisible();
  await expect(page.getByText(CADENCE_NOTICE, { exact: true })).toBeVisible();
});

for (const [name, path] of [['an old query link', `/${SUPPORTED}`], ['an encoded plan link', `/${PLAN_A}`]] as const) {
  test(`manual edits on ${name} survive the receipt anchor and back/forward`, async ({ page, isMobile }) => {
    await mockPricing(page);
    await page.goto(path);
    await expect(total(page)).not.toHaveText('');
    const before = await total(page).textContent();
    await page.getByText('Customize context assumptions', { exact: true }).click();
    await page.getByLabel('Task and document tokens', { exact: true }).fill('5200');
    await expect(total(page)).not.toHaveText(before!);
    const edited = (await total(page).textContent())!;
    await openReceiptAnchor(page, isMobile);
    await expect(total(page)).toHaveText(edited);
    await page.goBack();
    await expect(total(page)).toHaveText(edited);
    await page.goForward();
    await expect(total(page)).toHaveText(edited);
  });
}

test('a new encoded link imports its plan and back/forward import each plan', async ({ page }) => {
  await mockPricing(page);
  await page.goto(`/${UNSUPPORTED}${PLAN_A}`);
  await expect(total(page)).toHaveText('$1.00');
  await navigateHash(page, PLAN_B);
  await expect(total(page)).toHaveText('$2.00');
  await page.goBack();
  await expect(total(page)).toHaveText('$1.00');
  await page.goForward();
  await expect(total(page)).toHaveText('$2.00');
  await expect(page.getByText(RUNS_NOTICE, { exact: true })).toHaveCount(0);
});

test('going back from an encoded link to the old-query entry re-imports the old query and its notices', async ({ page }) => {
  await mockPricing(page);
  await page.goto(`/${SUPPORTED}&runs=0`);
  await expect(page.getByText(RUNS_NOTICE, { exact: true })).toBeVisible();
  const imported = (await total(page).textContent())!;
  expect(imported).not.toBe('$2.00');
  await navigateHash(page, PLAN_B);
  await expect(total(page)).toHaveText('$2.00');
  await expect(page.getByText(RUNS_NOTICE, { exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(total(page)).toHaveText(imported);
  await expect(page.getByText(RUNS_NOTICE, { exact: true })).toBeVisible();
});

test('refreshing prices after the receipt anchor keeps the encoded plan models', async ({ page, isMobile }) => {
  await mockPricing(page);
  await page.goto(`/${SUPPORTED}${planHash(200, ['Test Lab: Other'])}`);
  // 500 in at $2/1K + 100 out at $10/1K on Other; the old query on Flat would be $5.00.
  await expect(total(page)).toHaveText('$2.00');
  await openReceiptAnchor(page, isMobile);
  await page.getByText('Prices, sources and calculation details', { exact: true }).click();
  await page.getByRole('button', { name: 'Refresh prices', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh prices', exact: true })).toBeEnabled();
  await expect(total(page)).toHaveText('$2.00');
});

async function followSkipLink(page: Page) {
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
}

for (const [name, enterAnchor, anchorUrl] of [
  ['skip link', (page: Page) => followSkipLink(page), /#main-content$/],
  ['receipt anchor', (page: Page, isMobile: boolean) => openReceiptAnchor(page, isMobile), /#agent-price$/],
] as const) {
  test(`back to the ${name} entry of plan A after opening plan B restores plan A`, async ({ page, isMobile }) => {
    await mockPricing(page);
    await page.goto(`/${UNSUPPORTED}${PLAN_A}`);
    await expect(total(page)).toHaveText('$1.00');
    // Traversal must stay in the same document, not reload and re-read the URL.
    await page.evaluate(() => { (window as unknown as { sameDocument: boolean }).sameDocument = true; });
    await enterAnchor(page, isMobile);
    await expect(total(page)).toHaveText('$1.00');
    await navigateHash(page, PLAN_B);
    await expect(total(page)).toHaveText('$2.00');
    await page.goBack();
    await expect(page).toHaveURL(anchorUrl);
    await expect(total(page)).toHaveText('$1.00');
    await expect(page.getByText(RUNS_NOTICE, { exact: true })).toHaveCount(0);
    await page.goForward();
    await expect(total(page)).toHaveText('$2.00');
    await page.goBack();
    await page.goBack();
    await expect(total(page)).toHaveText('$1.00');
    await expect(page.getByText(RUNS_NOTICE, { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);
  });
}

test('edits survive back to an anchor entry of the same plan, and a different plan entry restores its own plan', async ({ page }) => {
  await mockPricing(page);
  await page.goto(`/${PLAN_A}`);
  await expect(total(page)).toHaveText('$1.00');
  await page.getByText('Customize context assumptions', { exact: true }).click();
  await page.getByLabel('Task and document tokens', { exact: true }).fill('5200');
  const edited = (await total(page).textContent())!;
  expect(edited).not.toBe('$1.00');
  await followSkipLink(page);
  await page.evaluate(() => { window.location.hash = 'agent-price'; });
  await page.goBack();
  await expect(page).toHaveURL(/#main-content$/);
  await expect(total(page)).toHaveText(edited);
  await navigateHash(page, PLAN_B);
  await expect(total(page)).toHaveText('$2.00');
  await page.goBack();
  await expect(page).toHaveURL(/#main-content$/);
  await expect(total(page)).toHaveText('$1.00');
});

test('refreshing prices keeps a model chosen after importing a link', async ({ page }) => {
  await mockPricing(page);
  await page.goto(`/${PLAN_A}`);
  await expect(total(page)).toHaveText('$1.00');
  await page.getByRole('combobox', { name: 'Model to price', exact: true }).fill('Other');
  await page.getByRole('option', { name: /Test Lab: Other/ }).first().click();
  // 500 in at $2/1K + 100 out at $10/1K on Other.
  await expect(total(page)).toHaveText('$2.00');
  await page.getByText('Prices, sources and calculation details', { exact: true }).click();
  await page.getByRole('button', { name: 'Refresh prices', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh prices', exact: true })).toBeEnabled();
  await expect(total(page)).toHaveText('$2.00');
});

test('a valid new plan overrides stale source metadata inherited from an anchor entry', async ({ page, isMobile }) => {
  await mockPricing(page);
  await page.goto(`/${UNSUPPORTED}${PLAN_A}`);
  await expect(total(page)).toHaveText('$1.00');
  await openReceiptAnchor(page, isMobile);
  // Reproduce the inherited-state race deterministically through the real
  // hashchange handler, rather than relying on router/browser event timing.
  await page.evaluate(({ hash, source }) => {
    const oldURL = window.location.href;
    window.history.pushState({ ...window.history.state, promptInfoPlanSource: source }, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: window.location.href }));
  }, { hash: PLAN_B, source: `hash:${PLAN_A}` });
  await expect(total(page)).toHaveText('$2.00');
  expect(await page.evaluate(() => window.history.state.promptInfoPlanSource)).toBe(`hash:${PLAN_B}`);
  await page.goBack();
  await expect(page).toHaveURL(/#agent-price$/);
  await expect(total(page)).toHaveText('$1.00');
  await page.goForward();
  await expect(total(page)).toHaveText('$2.00');
});

for (const [name, selector, hash] of [
  ['skip link', 'a.eco-skip', '#main-content'],
  ['receipt link', '.agent-mobile-total a[href="#agent-price"]', '#agent-price'],
] as const) {
  test(`${name} stamps A before a delayed anchor event and restores it after B`, async ({ page }) => {
    // Delay only the first anchor event, before the app's listener sees it.
    // This makes the fast anchor -> B race deterministic, not timing-based.
    await page.addInitScript((anchorHash) => {
      let held = false;
      window.addEventListener('hashchange', (event) => {
        if (!held && new URL(event.newURL).hash === anchorHash) {
          held = true;
          event.stopImmediatePropagation();
          (window as unknown as { releaseAnchor: () => void }).releaseAnchor = () => {
            window.dispatchEvent(new HashChangeEvent('hashchange', {
              oldURL: event.oldURL, newURL: event.newURL,
            }));
          };
        }
      }, true);
    }, hash);
    await mockPricing(page);
    await page.goto(`/${UNSUPPORTED}${PLAN_A}`);
    await expect(total(page)).toHaveText('$1.00');
    // .click() also exercises the receipt control on desktop, where it is
    // hidden. It invokes the same real delegated click/navigation path.
    await page.locator(selector).evaluate((link: HTMLAnchorElement) => link.click());
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await navigateHash(page, PLAN_B);
    await expect(total(page)).toHaveText('$2.00');
    await page.evaluate(() => (window as unknown as { releaseAnchor: () => void }).releaseAnchor());
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(total(page)).toHaveText('$1.00');
    await expect(page.getByText(RUNS_NOTICE, { exact: true })).toHaveCount(0);
    await page.goForward();
    await expect(total(page)).toHaveText('$2.00');
  });
}

test('keyboard fragment controls retain main and receipt focus navigation', async ({ page, isMobile }) => {
  await mockPricing(page);
  await page.goto(`/${PLAN_A}`);
  await expect(total(page)).toHaveText('$1.00');
  await followSkipLink(page);
  // main is not itself tabbable. Native fragment navigation must move the
  // sequential focus starting point there, rather than back into the header.
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.getElementById('main-content')!.contains(document.activeElement))).toBe(true);
  if (isMobile) {
    const receiptLink = page.locator('.agent-mobile-total a[href="#agent-price"]');
    await receiptLink.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#agent-price$/);
    await expect.poll(async () => {
      const box = await page.locator('#agent-price .ticket-brand').boundingBox();
      return Boolean(box && box.y >= 56 && box.y < 160);
    }).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Copy receipt', exact: true })).toBeFocused();
  }
  await expect(total(page)).toHaveText('$1.00');
});

test('delegated anchor handling preserves modified, cancelled and non-self activations', async ({ page }) => {
  await mockPricing(page);
  await page.goto(`/${PLAN_A}`);
  await expect(total(page)).toHaveText('$1.00');
  const results = await page.evaluate(() => {
    const cases = [
      { name: 'ctrl', ctrlKey: true }, { name: 'meta', metaKey: true },
      { name: 'shift', shiftKey: true }, { name: 'alt', altKey: true },
      { name: 'middle button', button: 1 }, { name: 'new tab', target: '_blank' },
      { name: 'download', download: true }, { name: 'cancelled', cancelled: true },
      { name: 'unrelated fragment', href: '#not-a-plan-control' },
    ];
    return cases.map((item) => {
      const link = document.createElement('a');
      link.href = item.href ?? '#main-content';
      if (item.target) link.target = item.target;
      if ('download' in item) link.setAttribute('download', 'receipt');
      if ('cancelled' in item) link.addEventListener('click', event => event.preventDefault());
      document.body.append(link);
      const before = window.location.href;
      let preventedByApp = false;
      // Observe after the actual document handler, then cancel the native
      // action so this guard check opens no tabs or downloads.
      window.addEventListener('click', (event) => {
        preventedByApp = event.defaultPrevented;
        event.preventDefault();
      }, { once: true });
      link.dispatchEvent(new MouseEvent('click', {
        bubbles: true, cancelable: true, ...item,
      }));
      link.remove();
      return { name: item.name, prevented: preventedByApp,
        expectedPrevented: 'cancelled' in item, unchanged: window.location.href === before };
    });
  });
  for (const result of results) {
    expect(result.prevented, result.name).toBe(result.expectedPrevented);
    expect(result.unchanged, result.name).toBe(true);
  }
  await expect(total(page)).toHaveText('$1.00');
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`consecutive fragment controls honor the latest target with motion ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await mockPricing(page);
    await page.goto(`/${PLAN_A}`);
    await expect(total(page)).toHaveText('$1.00');
    // Activate both real controls in one task, before the first native smooth
    // scroll can settle. The hidden desktop receipt control uses the same path.
    await page.evaluate(() => {
      document.querySelector<HTMLAnchorElement>('a.eco-skip')!.click();
      document.querySelector<HTMLAnchorElement>('.agent-mobile-total a[href="#agent-price"]')!.click();
    });
    await expect(page).toHaveURL(/#agent-price$/);
    await expect.poll(async () => {
      const box = await page.locator('#agent-price .ticket-brand').boundingBox();
      return Boolean(box && box.y >= 56 && box.y < 160);
    }).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Copy receipt', exact: true })).toBeFocused();
    await expect(total(page)).toHaveText('$1.00');
  });
}
