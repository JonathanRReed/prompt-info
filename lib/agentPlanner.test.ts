import { expect, test } from 'bun:test';
import { estimateAgentRun, type AgentPlan } from './agentPlanner';
import type { PricingEntry } from './pricingParser';
const plan: AgentPlan = { instructionTokens: 1000, taskTokens: 1000, toolTokensPerStep: 500, visibleOutputTokens: 200, reasoningTokens: 300, steps: 3, keepHistory: true, cacheEnabled: false, cacheHitPct: 80 };
const model: PricingEntry = { pricing: { input: 0.002, output: 0.01, inputCacheRead: 0.0002, inputCacheWrite: 0.0025 }, co2eFactor: 0, contextWindowTokens: 10000, maxOutputTokens: 2000 };
test('prices accumulated input and hidden thinking without replaying reasoning', () => {
  const result = estimateAgentRun(plan, model);
  expect(result.steps.map(step => step.inputTokens)).toEqual([2000, 2700, 3400]);
  expect(result.inputTokens).toBe(8100);
  expect(result.visibleOutputTokens).toBe(600);
  expect(result.reasoningTokens).toBe(900);
  expect(result.totalCost).toBeCloseTo(0.0162 + 0.015, 10);
});
test('cache misses and writes are explicit; caching is never assumed by default', () => {
  const result = estimateAgentRun({ ...plan, cacheEnabled: true, cacheHitPct: 100 }, model);
  expect(result.cacheReadTokens).toBe(4700);
  expect(result.cacheWriteTokens).toBe(3400);
  expect(result.totalCost).toBeCloseTo(4700 / 1000 * 0.0002 + 3400 / 1000 * 0.0025 + 0.015, 10);
  expect(estimateAgentRun(plan, model).cacheReadTokens).toBe(0);
});
test('rejects input plus planned output beyond context and does not recommend a clipped cost', () => {
  const result = estimateAgentRun({ ...plan, instructionTokens: 0, taskTokens: 7000, visibleOutputTokens: 2048, reasoningTokens: 0, steps: 1 }, { ...model, contextWindowTokens: 8192, maxOutputTokens: 4096 });
  expect(result.feasible).toBe(false);
  expect(result.warnings.join(' ')).toContain('context');
});
test('a reasoning allowance counts toward the output cap', () => {
  const result = estimateAgentRun({ ...plan, reasoningTokens: 1900 }, model);
  expect(result.feasible).toBe(false);
  expect(result.warnings.join(' ')).toContain('output');
});
test('partial tiers use strict thresholds, preserve source order and inherit cache prices', () => {
  const entry = { ...model, pricing: { ...model.pricing, longContextTiers: [{ minPromptTokens: 2000, input: 0.004 }, { minPromptTokens: 1000, output: 0.02 }] } };
  const result = estimateAgentRun({ ...plan, steps: 1 }, entry);
  expect(result.totalCost).toBeCloseTo(2000 / 1000 * 0.002 + 500 / 1000 * 0.02, 10);
});
test('uncertain cache rates are labeled and receive no invented discount', () => {
  const result = estimateAgentRun({ ...plan, cacheEnabled: true }, { ...model, pricing: { input: 0.002, output: 0.01 } });
  expect(result.totalCost).toBeCloseTo(estimateAgentRun(plan, model).totalCost!, 10);
  expect(result.warnings.join(' ')).toContain('cache');
});
test('fresh steps do not accumulate old messages', () => {
  const result = estimateAgentRun({ ...plan, keepHistory: false }, model);
  expect(result.steps.map(step => step.inputTokens)).toEqual([2000, 2500, 2500]);
});
test('invalid assumptions and malformed pricing fail safely', () => {
  expect(estimateAgentRun({ ...plan, steps: Number.NaN }, model).feasible).toBe(false);
  expect(estimateAgentRun(plan, { ...model, pricing: { input: -1, output: 0.01 } }).feasible).toBe(false);
});
test('full-run retries restart cold and retain separate call ledgers', () => {
  const base = estimateAgentRun({ ...plan, cacheEnabled: true }, model);
  const retried = estimateAgentRun({ ...plan, cacheEnabled: true, retries: 2 }, model);
  expect(retried.totalCost).toBeCloseTo(base.totalCost! * 3, 10);
  expect(retried.steps).toHaveLength(9);
  expect(retried.steps[3]).toMatchObject({ attempt: 2, number: 1, cacheReadTokens: 0 });
  expect(estimateAgentRun({ ...plan, retries: 6 }, model).feasible).toBe(false);
});
test('mandatory reasoning cannot be presented as a complete zero-thinking plan', () => {
  const entry = { ...model, reasoning: { mandatory: true, supportsMaxTokens: false } };
  expect(estimateAgentRun({ ...plan, reasoningTokens: 0 }, entry).feasible).toBe(false);
});
