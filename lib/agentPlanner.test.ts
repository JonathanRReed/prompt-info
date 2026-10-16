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

test('known non-reasoning models cannot fit a hidden-thinking workload', () => {
  expect(estimateAgentRun(plan, { ...model, supportsReasoning: false }).feasible).toBe(false);
  expect(estimateAgentRun({ ...plan, reasoningTokens: 0 }, { ...model, supportsReasoning: false }).feasible).toBe(true);
});

test('long tasks compact history and bill summary generation instead of overflowing forever', () => {
  const p = {...plan, instructionTokens:100,taskTokens:200,toolTokensPerStep:50,visibleOutputTokens:20,reasoningTokens:30,steps:5,compactEvery:2,summaryTokens:100};
  const result = estimateAgentRun(p,model);
  // Normal inputs:300,370; after summary:250,320; after summary:250.
  // Summary inputs include the last visible output:390 and340.
  expect(result.inputTokens).toBe(2220);
  expect(result.visibleOutputTokens).toBe(100);
  expect(result.reasoningTokens).toBe(150);
  expect(result.summaryOutputTokens).toBe(200);
  expect(result.compactions).toBe(2);
  expect(result.totalCost).toBeCloseTo(2220*.002/1000 + 450*.01/1000,10);
});
test('does not charge an unused final summary and scales independent agents explicitly', () => {
  const p = {...plan,steps:4,compactEvery:2,summaryTokens:100};
  const one = estimateAgentRun(p,model);
  expect(one.compactions).toBe(1);
  expect(estimateAgentRun({...p,workers:4},model).totalCost).toBeCloseTo(one.totalCost!*4,10);
});
test('very large compacted workloads keep a bounded ledger and finite cost', () => {
  const result = estimateAgentRun({...plan,steps:100000,compactEvery:10,summaryTokens:100,workers:4},model);
  expect(result.totalCost).not.toBeNull();
  expect(result.compactions).toBe(9999*4);
  expect(result.steps.length).toBeLessThanOrEqual(200);
});

test('compacted block aggregation matches an independent request-by-request calculation', () => {
  for (const steps of [1,2,3,4,5,19,20,21,51]) for (const every of [1,2,7,20]) for (const cached of [false,true]) for (const replay of [false,true]) {
    const p = {...plan,steps,compactEvery:every,summaryTokens:100,cacheEnabled:cached,cacheHitPct:80,replayReasoning:replay};
    let history=p.instructionTokens+p.taskTokens, previous=0, cost=0, inputs=0, summaries=0;
    for(let i=0;i<steps;i++) {
      if(i>0 && i%every===0) {
        inputs+=history;
        cost+=(history*model.pricing.input + p.summaryTokens*model.pricing.output)/1000;
        history=p.instructionTokens+p.summaryTokens; previous=0; summaries++;
      }
      const input=history+(i>0?p.toolTokensPerStep:0);
      const hit=cached?previous*.8:0;
      inputs+=input;
      cost+=(cached ? hit*model.pricing.inputCacheRead!+(input-hit)*model.pricing.inputCacheWrite! : input*model.pricing.input)/1000;
      cost+=(p.visibleOutputTokens+p.reasoningTokens)*model.pricing.output/1000;
      previous=input;history=input+p.visibleOutputTokens+(replay?p.reasoningTokens:0);
    }
    const result=estimateAgentRun(p,model);
    expect(result.totalCost).toBeCloseTo(cost,10);
    expect(result.inputTokens).toBe(inputs);
    expect(result.compactions).toBe(summaries);
  }
});
test('rejects invalid compaction and stream assumptions rather than silently clipping work', () => {
  for(const patch of [{compactEvery:0},{compactEvery:201},{compactEvery:2,summaryTokens:0},{compactEvery:2,summaryTokens:100,keepHistory:false},{workers:0},{workers:101},{steps:1000001}]) {
    expect(estimateAgentRun({...plan,...patch},model).totalCost).toBeNull();
  }
});

test('Gemini implicit cache misses pay normal input rather than a storage-only write rate', () => {
  const gemini = {...model,openRouterId:'google/gemini-3.8-flash',pricing:{...model.pricing,inputCacheWrite:0.00004}};
  const result=estimateAgentRun({...plan,steps:1,cacheEnabled:true},gemini);
  expect(result.inputCost).toBeCloseTo(2000*.002/1000,10);
  expect(result.cacheWriteTokens).toBe(0);
});

test('provider cache minimums prevent imaginary discounts on short prompts', () => {
  const tiny = {...plan,instructionTokens:100,taskTokens:100,toolTokensPerStep:20,visibleOutputTokens:10,reasoningTokens:10,cacheEnabled:true};
  const google = {...model,openRouterId:'google/gemini-3.8-flash'};
  const actual = estimateAgentRun(tiny,google);
  expect(actual.cacheReadTokens).toBe(0);
  expect(actual.cacheWriteTokens).toBe(0);
  expect(actual.totalCost).toBe(estimateAgentRun({...tiny,cacheEnabled:false},google).totalCost);
  expect(estimateAgentRun(tiny,{...model,openRouterId:'openai/gpt-6.1-sol'}).cacheWriteTokens).toBe(0);
});
test('large independent-request workloads do not require context summaries', () => {
  const independent = {...plan,keepHistory:false,cacheEnabled:true,steps:100000};
  const a=estimateAgentRun({...independent,steps:1},model);
  const b=estimateAgentRun({...independent,steps:2},model);
  const total=estimateAgentRun(independent,model);
  expect(total.totalCost).toBeCloseTo(a.totalCost!+(b.totalCost!-a.totalCost!)*99999,8);
  expect(total.feasible).toBe(true);
  expect(total.steps.length).toBe(2);
});
