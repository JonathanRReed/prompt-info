import { describe, expect, test } from 'bun:test';
import { simulateSessionRunCost } from './sessionMath';

const RATES = { inputRatePer1k: 0.005, outputRatePer1k: 0.025 }; // $5 / $25 per million

describe('baseline mode', () => {
  test('multiplies prompt and output by turns at full price', () => {
    const estimate = simulateSessionRunCost({
      mode: 'baseline',
      promptTokens: 1000,
      referenceOutputTokens: 500,
      turns: 4,
      outputTokenLimit: 8192,
      ...RATES,
    });

    expect(estimate.totalInputTokens).toBe(4000);
    expect(estimate.totalOutputTokens).toBe(2000);
    expect(estimate.inputCost).toBeCloseTo(0.02, 10);
    expect(estimate.outputCost).toBeCloseTo(0.05, 10);
    expect(estimate.totalCost).toBeCloseTo(0.07, 10);
  });

  test('zero turns produces empty estimate', () => {
    const estimate = simulateSessionRunCost({
      mode: 'baseline',
      promptTokens: 1000,
      referenceOutputTokens: 500,
      turns: 0,
      outputTokenLimit: 8192,
      ...RATES,
    });
    expect(estimate.totalTokens).toBe(0);
    expect(estimate.totalCost).toBeNull();
  });
});

describe('scenario mode', () => {
  const base = {
    mode: 'scenario' as const,
    promptTokens: 1000,
    referenceOutputTokens: 500,
    outputTokenLimit: 8192,
    contextWindowTokens: 200000,
    outputSizing: 'planned' as const,
    cachedInputBillablePct: 10,
    cacheWriteMultiplier: 1,
    turnOverheadTokens: 32,
    ...RATES,
  };

  test('single turn bills fresh input at the write multiplier and planned output', () => {
    const estimate = simulateSessionRunCost({ ...base, turns: 1 });

    expect(estimate.turnInputTokens).toBeCloseTo(1032, 6);
    expect(estimate.turnOutputTokens).toBe(500);
    expect(estimate.reusedContextTokens).toBe(0);
    expect(estimate.compactionCount).toBe(0);
  });

  test('history re-sent on turn 2 includes the previous PROMPT and output', () => {
    const estimate = simulateSessionRunCost({ ...base, turns: 2 });

    // turn 1: fresh 1032 written, output 500 pending
    // turn 2: reused prefix = 1032 (read-billed at 10%), new prefix = 500 + 1032
    expect(estimate.freshInputTokens).toBe(2064);
    expect(estimate.reusedContextTokens).toBe(1032);
    expect(estimate.cachedInputTokens).toBeCloseTo(103.2, 6);
    expect(estimate.turnInputTokens).toBeCloseTo(1032 + (1532 + 103.2), 6);
    expect(estimate.processedInputTokens).toBe(1032 + 2564);
    expect(estimate.turnOutputTokens).toBe(1000);
  });

  test('history grows quadratically across turns, never shrinks without compaction', () => {
    const fourTurns = simulateSessionRunCost({ ...base, turns: 4 });
    // reused per turn: 0, 1032, 2564, 4096 (prompts + outputs accumulate)
    expect(fourTurns.reusedContextTokens).toBe(0 + 1032 + 2564 + 4096);
    expect(fourTurns.compactionCount).toBe(0);
  });

  test('cache write premium multiplies newly written prefix tokens', () => {
    const noPremium = simulateSessionRunCost({ ...base, turns: 1 });
    const premium = simulateSessionRunCost({ ...base, turns: 1, cacheWriteMultiplier: 1.25 });

    expect(premium.turnInputTokens).toBeCloseTo(noPremium.turnInputTokens * 1.25, 6);
  });

  test('write premium is ignored when cache reads are billed at 100%', () => {
    const estimate = simulateSessionRunCost({
      ...base,
      turns: 2,
      cachedInputBillablePct: 100,
      cacheWriteMultiplier: 1.25,
    });

    expect(estimate.cacheWriteMultiplier).toBe(1);
    // No discount, no premium: turn 2 input = full history + fresh
    expect(estimate.turnInputTokens).toBeCloseTo(1032 + 2564, 6);
  });

  test('cheaper cache read rate lowers total cost', () => {
    const cheapCache = simulateSessionRunCost({ ...base, turns: 8, cachedInputBillablePct: 10 });
    const noCache = simulateSessionRunCost({ ...base, turns: 8, cachedInputBillablePct: 100 });

    expect(cheapCache.totalCost ?? 0).toBeLessThan(noCache.totalCost ?? 0);
    expect(cheapCache.totalOutputTokens).toBe(noCache.totalOutputTokens);
  });

  test('compaction triggers when context crosses the threshold and pays for a summary', () => {
    const estimate = simulateSessionRunCost({
      ...base,
      turns: 10,
      contextWindowTokens: 8000,
      compactionThresholdPct: 72,
      compactionRetentionPct: 25,
    });

    expect(estimate.compactionCount).toBeGreaterThan(0);
    expect(estimate.compactionInputTokens).toBeGreaterThan(0);
    expect(estimate.compactionOutputTokens).toBeGreaterThan(0);
    expect(estimate.compactionCost ?? 0).toBeGreaterThan(0);
    // Compaction keeps the projected context near the window
    expect(estimate.totalCost ?? 0).toBeGreaterThan(0);
  });

  test('costShare sizing targets the requested output cost share', () => {
    const estimate = simulateSessionRunCost({
      ...base,
      turns: 6,
      outputSizing: 'costShare',
      targetOutputCostSharePct: 80,
      outputTokenLimit: 128000,
    });

    expect(estimate.targetOutputCostSharePct).toBe(80);
    expect(estimate.achievedOutputCostSharePct ?? 0).toBeGreaterThan(60);
    expect(estimate.achievedOutputCostSharePct ?? 0).toBeLessThan(95);
  });

  test('planned sizing reports no target share', () => {
    const estimate = simulateSessionRunCost({ ...base, turns: 2 });
    expect(estimate.targetOutputCostSharePct).toBeNull();
  });

  test('scenario with history costs more than stateless baseline for multi-turn runs', () => {
    const baseline = simulateSessionRunCost({ ...base, mode: 'baseline', turns: 8 });
    const scenario = simulateSessionRunCost({ ...base, turns: 8 });

    expect(scenario.totalCost ?? 0).toBeGreaterThan(baseline.totalCost ?? 0);
  });

  test('output is clamped to the model output limit', () => {
    const estimate = simulateSessionRunCost({
      ...base,
      turns: 1,
      referenceOutputTokens: 99999,
      outputTokenLimit: 4096,
    });
    expect(estimate.turnOutputTokens).toBe(4096);
  });

  test('omitted percent params fall back to sane fractions, not raw percents', () => {
    const estimate = simulateSessionRunCost({
      mode: 'scenario',
      promptTokens: 1000,
      referenceOutputTokens: 500,
      turns: 3,
      outputTokenLimit: 8192,
      contextWindowTokens: 200000,
      ...RATES,
    });

    expect(estimate.cachedInputBillablePct).toBe(20);
    expect(estimate.compactionThresholdPct).toBe(72);
    // Cached history must be billed at a DISCOUNT relative to no caching, not 20x
    const noCache = simulateSessionRunCost({
      mode: 'scenario',
      promptTokens: 1000,
      referenceOutputTokens: 500,
      turns: 3,
      outputTokenLimit: 8192,
      contextWindowTokens: 200000,
      cachedInputBillablePct: 100,
      ...RATES,
    });
    expect(estimate.turnInputTokens).toBeLessThan(noCache.turnInputTokens);
  });

  test('an output limit of 0 means zero capacity, even in costShare mode', () => {
    const estimate = simulateSessionRunCost({
      ...base,
      turns: 2,
      outputSizing: 'costShare',
      targetOutputCostSharePct: 80,
      outputTokenLimit: 0,
    });
    expect(estimate.turnOutputTokens).toBe(0);
  });

  test('compaction never runs after the final turn', () => {
    const estimate = simulateSessionRunCost({
      ...base,
      turns: 1,
      referenceOutputTokens: 2000,
      contextWindowTokens: 4096,
    });
    expect(estimate.compactionCount).toBe(0);
    expect(estimate.compactionCost).toBe(0);
  });

  test('a prompt larger than the threshold does not trigger a futile compaction cascade', () => {
    const estimate = simulateSessionRunCost({
      ...base,
      turns: 5,
      promptTokens: 5000,
      contextWindowTokens: 4096,
    });
    // At most one (billed) compaction attempt per non-final turn, no inner cascade
    expect(estimate.compactionCount).toBeLessThanOrEqual(4);
  });

  test('explicit zero turn overhead is honored', () => {
    const estimate = simulateSessionRunCost({ ...base, turns: 1, turnOverheadTokens: 0 });
    expect(estimate.freshInputTokens).toBe(1000);
  });
});
