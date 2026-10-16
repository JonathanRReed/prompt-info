import { expect, test } from 'bun:test';
import { TASK_PRESETS } from './taskPresets';
import { estimateAgentRun } from './agentPlanner';
const fable = {
  pricing: {
    input: 0.01,
    output: 0.05,
    inputCacheRead: 0.00025,
    inputCacheWrite: 0.0125,
  },
  co2eFactor: 0,
  contextWindowTokens: 1000000,
  maxOutputTokens: 128000,
  supportsReasoning: true,
};
test('ordinary choices cover a single answer through a large project without manual numeric edits', () => {
  const costs = TASK_PRESETS.map((p) => estimateAgentRun(p.plan, fable));
  expect(costs.every((c) => c.feasible && c.totalCost !== null)).toBe(true);
  expect(costs[0].totalCost!).toBeLessThan(1);
  expect(costs.at(-1)!.totalCost!).toBeGreaterThan(10000);
  expect(costs.at(-1)!.compactions).toBeGreaterThan(0);
});
test('preset uncertainty includes longer work, not only a larger answer', () => {
  for (const p of TASK_PRESETS) {
    expect(p.lowResponses).toBeLessThanOrEqual(p.plan.steps);
    expect(p.highResponses).toBeGreaterThanOrEqual(p.plan.steps);
  }
  expect(TASK_PRESETS.find((p) => p.id === 'extended')!.highResponses).toBe(
    5000,
  );
});
