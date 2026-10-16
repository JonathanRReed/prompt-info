import { expect, test } from '@playwright/test';

async function navigate(page: import('@playwright/test').Page, name: string) {
  if (await page.getByRole('button', { name: 'Open navigation menu' }).isVisible()) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('dialog').getByRole('link', { name: new RegExp(name, 'i') }).click();
  } else await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: new RegExp(name, 'i') }).click();
}

test('home is the primary calculator and tokenizes locally', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/AI Workload Cost Calculator/);
  await expect(page.getByRole('heading', { level: 1, name: 'What will your AI task cost?' })).toBeVisible();
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
  await expect(page.locator('.planner-rate-source')).toContainText(/catalog/);
  await page.getByRole('button', { name: 'Paste your prompt', exact: true }).click();
  await page.getByLabel('Task prompt', { exact: true }).fill('hello');
  await expect(page.getByText('1 tokens using o200k_base. Other tokenizers may differ.')).toBeVisible();
  await expect(page.getByTestId('agent-monthly-total')).toHaveCount(0);
});

test('the primary calculator and result fit in the first desktop viewport', async ({ page }) => {
  for (const viewport of [{width:1440,height:900},{width:1024,height:768}]) {
    await page.setViewportSize(viewport); await page.goto('/');
    const result = await page.getByTestId('agent-run-total').boundingBox();
    expect(result!.y).toBeLessThan(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('comparison permits adding, removing and selecting priced models', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
  await page.getByRole('tab', {name:'Compare models',exact:true}).click();
  const count = await page.locator('.agent-model-selectors .planner-model-label').count();
  await page.getByRole('button',{name:'Add model',exact:true}).click();
  await expect(page.locator('.agent-model-selectors .planner-model-label')).toHaveCount(count+1);
  await page.getByRole('button',{name:/^Remove /}).first().click();
  await expect(page.locator('.agent-model-selectors .planner-model-label')).toHaveCount(count);
  await expect(page.getByRole('table').first()).toContainText('All scenarios fit');
});

test('model browser shows prices and context before selection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Open model results'}).first().click();
  const option = page.getByRole('listbox').getByRole('option').first();
  await expect(option).toContainText(/\$.*in.*\$.*out/i);
  await expect(option).toContainText(/context/i);
});

test('copied assumptions exclude the private prompt', async ({page,context}) => {
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/');
  await page.getByRole('button',{name:'Paste your prompt',exact:true}).click();
  await page.getByLabel('Task prompt',{exact:true}).fill('PRIVATE_SCENARIO_PROMPT');
  await expect(page.getByText(/tokens using o200k_base/)).toBeVisible();
  await page.getByText('Prices, sources and calculation details',{exact:true}).click();
  await page.getByRole('button',{name:'Copy plan assumptions',exact:true}).click();
  const text=await page.evaluate(()=>navigator.clipboard.readText());
  expect(text).not.toContain('PRIVATE_SCENARIO_PROMPT');
  expect(JSON.parse(text).assumptions.taskTokens).toBeGreaterThan(0);
});

test('format exploration preserves the planner without overwriting its prompt', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Paste your prompt',exact:true}).click();
  const prompt='Compare the two migration plans and return a risk table.';
  await page.getByLabel('Task prompt',{exact:true}).fill(prompt);
  await expect(page.getByText(/tokens using o200k_base/)).toBeVisible();
  await navigate(page,'Formats|Format comparison');
  await expect(page.getByLabel('Source prompt')).toHaveValue(prompt);
  await expect(page.getByText('Planner scenario loaded')).toBeVisible();
  await page.getByLabel('Source prompt').fill('An independent format experiment');
  await navigate(page,'Calculator');
  await expect(page.getByLabel('Task prompt',{exact:true})).toHaveValue(prompt);
});

test('format examples contain the supplied text without invented metadata', async ({page}) => {
  await page.goto('/format-comparison/');
  await page.getByLabel('Source prompt').fill('Hello world');
  await expect(page.getByText('11 / 200,000 chars')).toBeVisible();
  const json=page.locator('article').filter({has:page.getByRole('heading',{name:'JSON',exact:true})});
  await expect(json.locator('pre')).toHaveText('{\n  "prompt": "Hello world"\n}');
  await expect(page.getByText(/HTTP JSON envelope/)).toBeVisible();
  await page.getByLabel('Tokenizer').selectOption('cl100k_base');
  await expect(page.getByText('Tokenized with cl100k_base')).toBeVisible();
  await expect(page.locator('.format-bar-row')).toHaveCount(7);
  await page.getByLabel('Source prompt').fill('');
  await expect(page.locator('article').first().locator('pre')).toBeEmpty();
});

test('output tradeoffs teaches rates times usage with editable values', async ({page}) => {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/,route=>route.fulfill({status:503,body:'offline'}));
  await page.route('**/data/llm-data.json',route=>route.fulfill({status:503,body:'offline'}));
  await page.goto('/token-efficiency/');
  await expect(page.getByRole('heading',{level:1,name:'Output length changes the bill.'})).toBeVisible();
  await expect(page.getByLabel('Tasks in workload')).toHaveValue('1');
  const card=page.locator('#efficiency-lab article').first();
  await expect(page.getByRole('alert').filter({hasText:'Enter rates manually'})).toBeVisible();
  await card.getByLabel('Input $ / M tokens').fill('2');
  await card.getByLabel('Output $ / M tokens').fill('10');
  await expect(card.locator('output').first()).toHaveText('$0.0150');
  await card.getByLabel('Your output tokens / task').fill('1000');
  await expect(card.locator('output').first()).toHaveText('$0.0200');
  await card.getByLabel('Output $ / M tokens').fill('20');
  await expect(card.locator('output').first()).toHaveText('$0.0300');
});

test('output comparison imports equal planner token totals without fabricated efficiency ratios', async ({page}) => {
  await page.goto('/');
  await expect(page.getByTestId('agent-run-total')).not.toHaveText('Unavailable');
  await navigate(page,'Output');
  await page.getByRole('button',{name:'Use planner token totals',exact:true}).click();
  await expect(page.getByLabel('Tasks in workload')).toHaveValue('1');
  for(const field of await page.getByLabel('Your output tokens / task').all()) await expect(field).toHaveValue('500');
  await expect(page.getByText(/Planner token totals applied equally/)).toBeVisible();
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

test('navigation stays opaque and visible while scrolling every interactive page',async({page})=>{
  for(const route of ['/','/format-comparison/','/token-efficiency/']){
    await page.goto(route);
    await page.getByRole('navigation',{name:'Site',exact:true}).scrollIntoViewIfNeeded();
    const header=page.locator('.eco-header');
    const bounds=await header.boundingBox();
    expect(bounds!.y).toBe(0);
    const color=await header.evaluate(node=>getComputedStyle(node).backgroundColor);
    expect(color).not.toMatch(/rgba\([^)]*,\s*0\./);
  }
});

test('large format examples stay bounded and count off the main thread',async({page})=>{
  await page.goto('/format-comparison/');
  await page.getByLabel('Source prompt').fill('word '.repeat(40000));
  await expect(page.locator('.format-bar-row')).toHaveCount(7,{timeout:20000});
  for(const pre of await page.locator('article pre').all()){
    const bounds=await pre.boundingBox();expect(bounds!.height).toBeLessThanOrEqual(320);
  }
  await page.getByLabel('Source prompt').fill('');
  await expect(page.locator('article').first().locator('pre')).toBeEmpty();
  await expect(page.locator('.format-bar-row')).toHaveCount(7);
});

test('secondary pages remain readable in both themes and viewport sizes',async({page},info)=>{
  test.setTimeout(90000);
  for(const route of ['/format-comparison/','/token-efficiency/','/about/','/contact/','/privacy/']){
    await page.goto(route);
    if(route==='/format-comparison/')await expect(page.locator('.format-bar-row')).toHaveCount(7);
    if(route==='/token-efficiency/')await expect(page.getByRole('combobox',{name:'Comparison model 1',exact:true})).toBeVisible();
    for(const theme of ['dark','light']){
      const current=await page.locator('html').getAttribute('data-theme');
      if(current!==theme)await page.getByRole('button',{name:'Toggle light and dark theme'}).click();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await page.screenshot({animations:'disabled',path:`test-results/page-${info.project.name}-${route.replaceAll('/','')}-${theme}.png`,fullPage:true});
    }
  }
});
