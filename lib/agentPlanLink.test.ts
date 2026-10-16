import { readLegacyAgentPlan } from "./agentPlanLink";
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

test('preserves mode and explicit reasoning scenarios and rejects misleading ranges', () => {
  const options = { ...value, mode: 'chat' as const, plan: { ...value.plan, reasoningLow: 100, reasoningHigh: 1000, reasoningEffort: 'low' } };
  expect(parseAgentPlan(JSON.stringify(options))).toMatchObject(options);
  expect(parseAgentPlan(JSON.stringify({ ...options, mode: 'unknown' }))).toBeNull();
  expect(parseAgentPlan(JSON.stringify({ ...options, plan: { ...options.plan, reasoningLow: 600 } }))).toBeNull();
  expect(parseAgentPlan(JSON.stringify({ ...options, plan: { ...options.plan, reasoningHigh: 400 } }))).toBeNull();
});

test('recurring volume and budget warnings require explicit opt-in', () => {
  expect(parseAgentPlan(JSON.stringify(value))?.recurring).toBe(false);
  expect(parseAgentPlan(JSON.stringify(value))?.budgetEnabled).toBe(false);
  const enabled = {...value, recurring: true, budgetEnabled: true, budget: 10};
  expect(parseAgentPlan(JSON.stringify(enabled))).toMatchObject(enabled);
  expect(parseAgentPlan(JSON.stringify({...value,recurring:'yes'}))).toBeNull();
});

test('legacy links preserve numeric assumptions without importing prompt text', () => {
  const old = readLegacyAgentPlan('?models=openai/test&tokens=300000&out=2048&turns=1&mode=baseline&runs=1&cadence=once');
  expect(old?.plan.taskTokens).toBe(300000);
  expect(old?.plan.reasoningTokens).toBe(0);
  expect(old?.recurring).toBe(false);
  expect(readLegacyAgentPlan('?out=1000000')).toBeNull();
});
