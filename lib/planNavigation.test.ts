import { expect, test } from 'bun:test';
import { buildAgentPlanLink, type SharedAgentPlan } from './agentPlanLink';
import { resolvePlanNavigation } from './planNavigation';

function hash(taskTokens: number): string {
  const shared: SharedAgentPlan = {
    version: 1,
    plan: {
      instructionTokens: 300, taskTokens, toolTokensPerStep: 0,
      visibleOutputTokens: 100, reasoningTokens: 0, steps: 1,
      keepHistory: false, cacheEnabled: false, cacheHitPct: 0,
    },
    models: ['Test Lab: Flat'], runs: 1, variance: 30,
  };
  return new URL(buildAgentPlanLink('https://example.test', shared)!).hash;
}
const PLAN_A = hash(200);
const PLAN_B = hash(1200);
const SOURCE_A = `hash:${PLAN_A}`;
const SOURCE_B = `hash:${PLAN_B}`;

test('a valid plan B URL wins over stale plan A history metadata', () => {
  const next = resolvePlanNavigation({
    hash: PLAN_B, search: '?runs=0&cadence=year',
    recordedSource: SOURCE_A, activeSource: SOURCE_A,
  });
  expect(next.source).toBe(SOURCE_B);
  expect(next.shared?.plan.taskTokens).toBe(1200);
  expect(next.shared?.models).toEqual(['Test Lab: Flat']);
  expect(next.stamp).toBe(true);
});

test('an already active explicit plan repairs stale metadata without resetting edits', () => {
  expect(resolvePlanNavigation({
    hash: PLAN_B, search: '', recordedSource: SOURCE_A, activeSource: SOURCE_B,
  })).toEqual({ source: SOURCE_B, shared: null, stamp: true });
});

test('an explicit plan A URL also wins when traversing from plan B', () => {
  const next = resolvePlanNavigation({
    hash: PLAN_A, search: '', recordedSource: SOURCE_B, activeSource: SOURCE_B,
  });
  expect(next.source).toBe(SOURCE_A);
  expect(next.shared?.plan.taskTokens).toBe(200);
  expect(next.stamp).toBe(true);
});

for (const anchor of ['#agent-price', '#main-content']) {
  test(`${anchor} restores plan A from its stamped entry after plan B`, () => {
    const next = resolvePlanNavigation({
      hash: anchor, search: '?runs=0', recordedSource: SOURCE_A, activeSource: SOURCE_B,
    });
    expect(next.source).toBe(SOURCE_A);
    expect(next.shared?.plan.taskTokens).toBe(200);
    expect(next.stamp).toBe(false);
  });

  test(`${anchor} keeps current edits when its stamped plan is already active`, () => {
    expect(resolvePlanNavigation({
      hash: anchor, search: '?tokens=9000', recordedSource: SOURCE_A, activeSource: SOURCE_A,
    })).toEqual({ source: SOURCE_A, shared: null, stamp: false });
  });

  test(`a new ${anchor} inherits the active plan rather than importing the old query`, () => {
    expect(resolvePlanNavigation({
      hash: anchor, search: '?tokens=9000', activeSource: SOURCE_A,
    })).toEqual({ source: SOURCE_A, shared: null, stamp: true });
  });
}

test('a malformed encoded hash preserves the existing stamped-history behavior', () => {
  const next = resolvePlanNavigation({
    hash: '#plan=broken', search: '?tokens=9000', recordedSource: SOURCE_A, activeSource: SOURCE_B,
  });
  expect(next.source).toBe(SOURCE_A);
  expect(next.shared?.plan.taskTokens).toBe(200);
  expect(next.stamp).toBe(false);
});

test('a new malformed hash does not replace the current plan with an old query', () => {
  expect(resolvePlanNavigation({
    hash: '#plan=broken', search: '?tokens=9000', activeSource: SOURCE_A,
  })).toEqual({ source: SOURCE_A, shared: null, stamp: true });
});

test('a new bare old-query entry still imports the old query', () => {
  const next = resolvePlanNavigation({
    hash: '', search: '?tokens=9000&out=100&turns=1', activeSource: SOURCE_A,
  });
  expect(next.source).toBe('query:?tokens=9000&out=100&turns=1');
  expect(next.shared?.plan.taskTokens).toBe(9000);
  expect(next.stamp).toBe(true);
});
