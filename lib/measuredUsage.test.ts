import { expect, test } from 'bun:test';
import { priceMeasuredUsage } from './measuredUsage';
import type { PricingEntry } from './pricingParser';
const model: PricingEntry = { pricing: { input: .002, output: .01, inputCacheRead: .0002, inputCacheWrite: .0025 }, co2eFactor: 0, contextWindowTokens: 10000, maxOutputTokens: 2000 };
const row = { input: 1000, cached: 200, written: 100, output: 500, reasoning: 300 };
test('partitions inclusive input/output totals without double-counting reasoning', () => {
  const result = priceMeasuredUsage([row], model);
  expect(result.total).toBeCloseTo(.0014 + .00004 + .00025 + .005, 10);
  expect(result.thinkingCost).toBeCloseTo(.003, 10);
  expect(result.answerCost).toBeCloseTo(.002, 10);
});
test('prices each variable request before summing conditional rates', () => {
  const result = priceMeasuredUsage([{...row, cached:0,written:0}, {...row,input:3000,output:100,reasoning:0,cached:0,written:0}], {...model, pricing:{...model.pricing,longContextTiers:[{minPromptTokens:2000,input:.004}]}});
  expect(result.total).toBeCloseTo(.002 + .005 + .012 + .001, 10);
});
test('equal tokens at flat rates cost the same across request partitions', () => {
  expect(priceMeasuredUsage([{...row,cached:0,written:0}],model).total).toBeCloseTo(priceMeasuredUsage(Array.from({length:10},()=>({input:100,cached:0,written:0,output:50,reasoning:30})),model).total!,10);
});
test('invalid subsets, missing cache rates, empty rows and unsafe counts fail closed', () => {
  for(const rows of [[],[{...row,reasoning:501}],[{...row,cached:901}],[{...row,input:NaN}],[{...row,output:-1}]]) expect(priceMeasuredUsage(rows,model).total).toBeNull();
  expect(priceMeasuredUsage([row],{...model,pricing:{input:.002,output:.01}}).total).toBeNull();
});
test('does not interpret aggregate workload as fitting one request', () => {
  const result = priceMeasuredUsage([{...row,input:10000}],model);
  expect(result.warnings.join(' ')).toContain('context');
  expect(result.total).not.toBeNull();
});

test('does not pretend explicit Gemini cache storage can be priced from write tokens alone', () => {
  expect(priceMeasuredUsage([row],{...model,openRouterId:'google/gemini-3.8-flash'}).total).toBeNull();
});
