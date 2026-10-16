import { expect, test } from '@playwright/test';
const data = {
  'Anthropic: Claude Fable 5.1': {
    pricing: {
      input: 0.01,
      output: 0.05,
      inputCacheRead: 0.00025,
      inputCacheWrite: 0.0125,
    },
    co2eFactor: 0,
    contextWindowTokens: 1000000,
    maxOutputTokens: 128000,
    openRouterId: 'anthropic/claude-fable-5.1',
    supportsReasoning: true,
  },
  'OpenAI: GPT-6.1 Sol': {
    pricing: {
      input: 0.002,
      output: 0.01,
      inputCacheRead: 0.0001,
      inputCacheWrite: 0.0025,
    },
    co2eFactor: 0,
    contextWindowTokens: 1050000,
    maxOutputTokens: 128000,
    openRouterId: 'openai/gpt-6.1-sol',
    supportsReasoning: true,
  },
};
test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        source: 'openrouter-live',
        sourceUrl: 'https://openrouter.ai/api/v1/models',
        retrievedAt: '2026-10-16T00:00:00Z',
        freshness: 'live',
        isFallback: false,
        fallbackReason: null,
        data,
      },
    }),
  );
});
test('beginner chooses Fable and a challenging problem without entering token numbers', async ({
  page,
}) => {
  await page.goto('/?model=anthropic/claude-fable-5.1');
  await page
    .getByRole('button', { name: 'Challenging problem', exact: true })
    .click();
  await expect(page.getByTestId('agent-run-total')).toHaveText('$0.7040');
  await expect(page.getByTestId('agent-run-range')).toContainText('–');
  await expect(page.getByTestId('agent-monthly-total')).toHaveCount(0);
  await expect(page.getByText(/The modeled range exceeds/)).toHaveCount(0);
});
test('large project preset reaches genuine high-scale token usage without manual edits', async ({
  page,
}) => {
  await page.goto('/?model=anthropic/claude-fable-5.1');
  await page.getByRole('button', { name: 'Agent', exact: true }).click();
  await page
    .getByRole('button', { name: 'Large agent-team project', exact: true })
    .click();
  await expect(page.getByTestId('agent-run-total')).toHaveText('$27,166.36');
  await expect(
    page.getByRole('complementary', { name: 'Run cost estimate' }),
  ).toContainText('3,996 paid context summaries included');
  await expect(page.getByText(/This plan does not fit/)).toHaveCount(0);
  await expect(page.getByText(/central scenario fits, but part/)).toHaveCount(
    0,
  );
});
test('engineer imports real usage and compares current rates privately', async ({
  page,
}) => {
  const sent: string[] = [];
  page.on('request', (r) => sent.push(r.url() + (r.postData() ?? '')));
  await page.goto('/?model=openai/gpt-6.1-sol');
  await page
    .getByRole('button', { name: 'Use actual token usage', exact: true })
    .click();
  await page.getByText('Import API usage JSON', { exact: true }).click();
  await page
    .getByLabel('Usage object or array of requests')
    .fill(
      JSON.stringify([
        {
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            input_tokens_details: { cached_tokens: 800 },
            output_tokens_details: { reasoning_tokens: 300 },
          },
          ignored: 'PRIVATE_IMPORT_SENTINEL',
        },
      ]),
    );
  await page
    .getByRole('button', {
      name: 'Replace rows with imported usage',
      exact: true,
    })
    .click();
  await expect(page.getByTestId('measured-total')).toHaveText('$0.0055');
  await expect(
    page.getByLabel('Usage object or array of requests'),
  ).toHaveValue('');
  expect(sent.join(' ')).not.toContain('PRIVATE_IMPORT_SENTINEL');
  await page
    .getByLabel('Usage object or array of requests')
    .fill('{"input_tokens":1000}');
  await page
    .getByRole('button', {
      name: 'Replace rows with imported usage',
      exact: true,
    })
    .click();
  await expect(page.getByTestId('measured-total')).toHaveText('$0.0055');
  await expect(page.getByText(/Request 1: Token counts/)).toBeVisible();
});
test('all presets, tabs and themes render without errors or clipped controls', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?model=anthropic/claude-fable-5.1');
  for (const theme of ['dark', 'light']) {
    if (theme === 'light')
      await page
        .getByRole('button', { name: 'Toggle light and dark theme' })
        .click();
    for (const mode of ['Chat', 'Agent']) {
      await page.getByRole('tab', { name: 'Task', exact: true }).click();
      await page.getByRole('button', { name: mode, exact: true }).click();
      const choices =
        mode === 'Chat'
          ? ['Quick answer', 'Challenging problem', 'Work through a document']
          : [
              'Focused research or coding',
              'Extended autonomous project',
              'Large agent-team project',
            ];
      for (const choice of choices) {
        await page.getByRole('button', { name: choice, exact: true }).click();
        await expect(page.getByTestId('agent-run-total')).not.toHaveText(
          'Unavailable',
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
      }
      for (const panel of [
        'Task',
        'Thinking',
        'Run settings',
        'Compare models',
      ]) {
        await page.getByRole('tab', { name: panel, exact: true }).click();
        await expect(page.getByRole('tabpanel')).toHaveCount(1);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        await page.screenshot({animations:'disabled',
          path: `test-results/archetype-${info.project.name}-${theme}-${mode}-${panel.replaceAll(' ', '-')}.png`,
        });
      }
    }
  }
  expect(errors).toEqual([]);
});

test('an invalid optional monthly volume does not erase the per-task price',async({page})=>{
  await page.goto('/?model=openai/gpt-6.1-sol');
  await expect(page.getByTestId('agent-run-total')).toHaveText('$0.0068');
  await page.getByRole('tab',{name:'Run settings',exact:true}).click();
  await page.getByText('Optional budget planning',{exact:true}).click();
  await page.getByLabel('Estimate a monthly budget',{exact:true}).check();
  await page.getByLabel('Completed tasks per month',{exact:true}).fill('');
  await expect(page.getByTestId('agent-monthly-total')).toHaveText('Unavailable');
  await expect(page.getByTestId('agent-run-total')).toHaveText('$0.0068');
});

test('large planner token totals are not clipped when exploring output tradeoffs',async({page})=>{
  await page.goto('/?model=anthropic/claude-fable-5.1');
  await page.getByRole('button',{name:'Agent',exact:true}).click();
  await page.getByRole('button',{name:'Large agent-team project',exact:true}).click();
  await expect(page.getByTestId('agent-run-total')).toHaveText('$27,166.36');
  if(await page.getByRole('button',{name:'Open navigation menu'}).isVisible()){
    await page.getByRole('button',{name:'Open navigation menu'}).click();
    await page.getByRole('dialog').getByRole('link',{name:/Output tradeoffs/}).click();
  }else await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Output tradeoffs',exact:true}).click();
  await page.getByRole('button',{name:'Use planner token totals',exact:true}).click();
  await expect(page.getByLabel('Input tokens per task')).toHaveValue('1689866000');
  for(const field of await page.getByLabel('Your output tokens / task').all()) await expect(field).toHaveValue('301968000');
});
