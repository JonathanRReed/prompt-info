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

const legacy = '?models=openai/test&tokens=500&out=100&turns=1&mode=baseline';
test('legacy one-time batch keeps its run count as a one-time batch and survives re-sharing', () => {
  for (const search of [`${legacy}&runs=10&cadence=once`, `${legacy}&runs=10`]) {
    const old = readLegacyAgentPlan(search)!;
    expect(old).toMatchObject({ recurring: false, runs: 1, batchRuns: 10 });
    expect(old.plan.workers).toBeUndefined();
    expect(old.notices).toBeUndefined();
    const relinked = readAgentPlanHash(new URL(buildAgentPlanLink('https://example.com', old)!).hash)!;
    expect(relinked).toMatchObject({ recurring: false, runs: 1, batchRuns: 10 });
  }
});
test('legacy single runs stay single and recurring cadences convert to tasks per month', () => {
  for (const search of [`${legacy}&runs=1&cadence=once`, legacy]) {
    const old = readLegacyAgentPlan(search)!;
    expect(old).toMatchObject({ recurring: false, runs: 1 });
    expect(old.batchRuns).toBeUndefined();
  }
  expect(readLegacyAgentPlan(`${legacy}&runs=10&cadence=month`)).toMatchObject({ recurring: true, runs: 10 });
  expect(readLegacyAgentPlan(`${legacy}&runs=10&cadence=month`)!.notices).toBeUndefined();
  expect(readLegacyAgentPlan(`${legacy}&runs=12&cadence=week`)).toMatchObject({ recurring: true, runs: 52 });
  const daily = readLegacyAgentPlan(`${legacy}&runs=10&cadence=day`)!;
  expect(daily).toMatchObject({ recurring: true, runs: 304 });
  expect(daily.batchRuns).toBeUndefined();
  expect(daily.notices).toEqual(['This older link priced 10 runs per day. The planner counts tasks per month, so it uses 304 tasks/month (rounded).']);
  const capped = readLegacyAgentPlan(`${legacy}&runs=1000000&cadence=day`)!;
  expect(capped.runs).toBe(1000000);
  expect(capped.notices?.[0]).toContain('(the maximum)');
});
test('legacy values the planner cannot represent produce a notice instead of a silent change', () => {
  const old = readLegacyAgentPlan(`${legacy}&runs=0&cadence=year`)!;
  expect(old).toMatchObject({ recurring: false, runs: 1 });
  expect(old.notices).toEqual([
    'This older link had an unsupported runs value (runs=0). It was ignored and the default was used.',
    'This older link had an unsupported cadence value (cadence=year). It was ignored and the default was used.',
  ]);
});
test('shared batch counts are validated and dropped for recurring plans', () => {
  expect(parseAgentPlan(JSON.stringify({ ...value, runs: 1, batchRuns: 10 }))?.batchRuns).toBe(10);
  expect(parseAgentPlan(JSON.stringify({ ...value, recurring: true, batchRuns: 10 }))?.batchRuns).toBeUndefined();
  for (const batchRuns of [0, 1.5, 1000001, '10']) expect(parseAgentPlan(JSON.stringify({ ...value, batchRuns }))).toBeNull();
});
