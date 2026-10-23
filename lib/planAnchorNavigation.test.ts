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
    const entries: { hash: string; source?: string; router: string }[] = [
      { hash: A, source: `hash:${A}`, router: 'preserve-router-state' },
    ];
    let index = 0;
    const location = {
      get hash() { return entries[index].hash; },
      set hash(hash: string) {
        entries.push({ hash, router: 'preserve-router-state' });
        index += 1;
      },
    };
    followPlanAnchor(anchor, `hash:${A}`, location, (source) => {
      entries[index] = { ...entries[index], source };
    });
    location.hash = B;
    const importedB = resolvePlanNavigation({
      hash: location.hash, search: '', activeSource: `hash:${A}`,
      recordedSource: entries[index].source,
    });
    expect(importedB.shared?.plan.taskTokens).toBe(1200);
    index -= 1;
    const restoredA = resolvePlanNavigation({
      hash: location.hash, search: '', activeSource: importedB.source,
      recordedSource: entries[index].source,
    });
    expect(restoredA.shared?.plan.taskTokens).toBe(200);
    expect(restoredA.source).toBe(`hash:${A}`);
    expect(entries[1].source).toBe(`hash:${A}`);
    expect(entries[1].router).toBe('preserve-router-state');
  });
}
