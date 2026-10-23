import { expect, test } from 'bun:test';
import { buildAgentPlanLink, type SharedAgentPlan } from './agentPlanLink';
import { followPlanAnchor } from './planAnchorNavigation';
import { resolvePlanNavigation } from './planNavigation';

const plan = (taskTokens: number) => new URL(buildAgentPlanLink('https://example.test', {
  version: 1,
  plan: {
    instructionTokens: 300, taskTokens, toolTokensPerStep: 0,
    visibleOutputTokens: 100, reasoningTokens: 0, steps: 1,
    keepHistory: false, cacheEnabled: false, cacheHitPct: 0,
  },
  models: ['Test Lab: Flat'], runs: 1, variance: 30,
} satisfies SharedAgentPlan)!).hash;
const A = plan(200);
const B = plan(1200);

for (const anchor of ['#main-content', '#agent-price'] as const) {
  test(`${anchor} records A before a delayed hashchange can observe B`, () => {
    // Native fragment navigation creates an entry synchronously, but its
    // hashchange task can run after another navigation. Deliberately never
    // flush that task before leaving A's anchor entry.
    const routerTree = { tree: 'preserve-router-tree' };
    const entries: { hash: string; state: Record<string, unknown> | null }[] = [
      { hash: A, state: { promptInfoPlanSource: `hash:${A}`,
        __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: routerTree, user: 'preserve-user-state' } },
    ];
    let index = 0;
    const calls: Parameters<History['replaceState']>[] = [];
    const history = {
      get state() { return entries[index].state; },
      replaceState(...args: Parameters<History['replaceState']>) {
        calls.push(args);
        entries[index].state = args[0];
      },
    };
    const location = {
      get hash() { return entries[index].hash; },
      set hash(hash: string) {
        entries.push({ hash, state: null });
        index += 1;
      },
    };
    followPlanAnchor(anchor, `hash:${A}`, location, history);
    location.hash = B;
    const importedB = resolvePlanNavigation({
      hash: location.hash, search: '', activeSource: `hash:${A}`,
      recordedSource: entries[index].state?.promptInfoPlanSource as string | undefined,
    });
    expect(importedB.shared?.plan.taskTokens).toBe(1200);
    index -= 1;
    const restoredA = resolvePlanNavigation({
      hash: location.hash, search: '', activeSource: importedB.source,
      recordedSource: entries[index].state?.promptInfoPlanSource as string | undefined,
    });
    expect(restoredA.shared?.plan.taskTokens).toBe(200);
    expect(restoredA.source).toBe(`hash:${A}`);
    // Omit the unchanged URL rather than initiating a router restore.
    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(2);
    expect(entries[1].state?.promptInfoPlanSource).toBe(`hash:${A}`);
    expect(entries[1].state?.__NA).toBe(true);
    expect(entries[1].state?.__PRIVATE_NEXTJS_INTERNALS_TREE).toBe(routerTree);
    expect(entries[1].state?.user).toBe('preserve-user-state');
  });
}

for (const previousState of [null, 7]) {
  test(`a historical ${previousState === null ? 'null' : 'nonobject'} state can receive anchor metadata`, () => {
    let state: unknown = previousState;
    let hash = A;
    const history = {
      get state() { return state; },
      replaceState(data: unknown) { state = data; },
    };
    const location = {
      get hash() { return hash; },
      set hash(value: string) { hash = value; state = null; },
    };
    followPlanAnchor('#main-content', `hash:${A}`, location, history);
    expect(state).toEqual({ promptInfoPlanSource: `hash:${A}` });
    expect(hash).toBe('#main-content');
  });
}

test('the latest anchor scroll target wins after native navigation and metadata stamping', () => {
  const operations: string[] = [];
  const history = {
    state: { __NA: true },
    replaceState() { operations.push('stamp'); },
  };
  const location = {
    get hash() { return A; },
    set hash(value: string) { operations.push(`navigate:${value}`); },
  };
  const target = {
    scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
      operations.push('scroll-latest-target');
      // auto preserves computed smooth/reduced-motion behavior and margins.
      expect(options).toEqual({ block: 'start', behavior: 'auto' });
    },
  };
  followPlanAnchor('#agent-price', `hash:${A}`, location, history, target);
  expect(operations).toEqual(['navigate:#agent-price', 'stamp', 'scroll-latest-target']);
});
