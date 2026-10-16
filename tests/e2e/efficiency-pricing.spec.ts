import {expect,test} from '@playwright/test';
const catalog={schemaVersion:1,source:'openrouter-live',sourceUrl:'https://openrouter.ai/api/v1/models',retrievedAt:'2026-10-16T00:00:00Z',freshness:'live',isFallback:false,fallbackReason:null,data:{'Lab: Current model':{pricing:{input:.002,output:.01},co2eFactor:0,contextWindowTokens:1000000,maxOutputTokens:128000}}};
test('output comparison uses current pricing and distinguishes missing and deliberately free rates',async({page})=>{
  await page.route(/\/api\/pricing\/?(?:\?.*)?$/,r=>r.fulfill({json:catalog}));
  await page.goto('/token-efficiency/');
  const card=page.locator('#efficiency-lab article').first();
  await expect(card.getByRole('heading')).toHaveText('Lab: Current model');
  await expect(card.locator('output').first()).toHaveText('$0.0150');
  await card.getByLabel('Input $ / M tokens').fill('');
  await expect(card.getByRole('status').filter({hasText:'A price is not reported'})).toBeVisible();
  await expect(card.locator('output').first()).toHaveText('Unavailable');
  await card.getByLabel('Input $ / M tokens').fill('0');
  await card.getByLabel('Output $ / M tokens').fill('0');
  await expect(card.locator('output').first()).toHaveText('$0.00');
  await card.getByLabel('Input $ / M tokens').fill('2');
  await expect(card.locator('output').first()).toHaveText('$0.0100');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
