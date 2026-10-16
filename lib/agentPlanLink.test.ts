import { expect, test } from 'bun:test';
import { buildAgentPlanLink, parseAgentPlan, readAgentPlanHash } from './agentPlanLink';
const value = { version: 1 as const, plan: { instructionTokens: 100, taskTokens: 200, toolTokensPerStep: 300, visibleOutputTokens: 400, reasoningTokens: 500, steps: 6, keepHistory: true, cacheEnabled: false, cacheHitPct: 80 }, models: ['Lab: Model 6'], runs: 100, variance: 30 };
test('round trips assumptions in the fragment and discards prompt text', () => {
  const url = new URL(buildAgentPlanLink('https://example.com', { ...value, prompt: 'never share me' } as typeof value)!);
  expect(url.search).toBe('');
  expect(url.href).not.toContain('never');
  expect(readAgentPlanHash(url.hash)?.plan).toEqual({ ...value.plan, replayReasoning: false });
});
test('rejects malformed, oversized and impossible assumptions', () => {
  for (const bad of [null, {}, { ...value, runs: -1 }, { ...value, plan: { ...value.plan, steps: 201 } }, { ...value, models: ['x'.repeat(257)] }, { ...value, variance: 101 }]) expect(parseAgentPlan(JSON.stringify(bad))).toBeNull();
  expect(readAgentPlanHash('#plan=broken')).toBeNull();
});
