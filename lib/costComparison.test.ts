import { describe, expect, test } from 'bun:test';
import {
  buildCostComparison,
  buildSessionAccumulation,
  buildTokenComposition,
} from './costComparison';
import type { PricingEntry } from './pricingParser';

const ECONOMY: PricingEntry = {
  pricing: { input: 0.001, output: 0.004, inputCacheRead: 0.0001, inputCacheWrite: 0.00125 },
  co2eFactor: 0.0002,
  maxOutputTokens: 128_000,
  contextWindowTokens: 1_000_000,
};

const PREMIUM: PricingEntry = {
  pricing: { input: 0.004, output: 0.02 },
  co2eFactor: 0.0002,
  maxOutputTokens: 128_000,
  contextWindowTokens: 1_000_000,
};

const scenario = {
  promptTokens: 1_000,
  referenceOutputTokens: 2_000,
  turns: 2,
  mode: 'baseline' as const,
  outputTokenLimit: 128_000,
  contextWindowTokens: 1_000_000,
};

describe('buildCostComparison', () => {
  test('compares request, session, monthly, and annual cost for selected models', () => {
    const comparison = buildCostComparison({
      models: [
        { model: 'Example: Economy', entry: ECONOMY },
        { model: 'Example: Premium', entry: PREMIUM },
      ],
      scenario,
      workload: { runs: 10, cadence: 'day' },
    });

    expect(comparison.rows).toHaveLength(2);
    expect(comparison.rows[0]).toMatchObject({ model: 'Example: Economy', isUsable: true });
    expect(comparison.rows[0].requestCost).toBeCloseTo(0.009, 12);
    expect(comparison.rows[0].sessionCost).toBeCloseTo(0.018, 12);
    expect(comparison.rows[0].monthlyCost).toBeCloseTo(5.475, 12);
    expect(comparison.rows[0].annualCost).toBeCloseTo(65.7, 12);
    expect(comparison.recommendation).toMatchObject({
      model: 'Example: Economy',
      criterion: 'Lowest monthly cost among selected models',
    });
    expect(comparison.recommendation?.value).toBeCloseTo(5.475, 12);
  });

  test('does not claim a winner when usable rows tie', () => {
    const comparison = buildCostComparison({
      models: [
        { model: 'Example: A', entry: ECONOMY },
        { model: 'Example: B', entry: ECONOMY },
      ],
      scenario,
      workload: { runs: 1, cadence: 'once' },
    });

    expect(comparison.recommendation).toBeNull();
  });

  test('keeps missing or zero-cost rate rows visible but unavailable', () => {
    const comparison = buildCostComparison({
      models: [
        { model: 'Example: Missing', entry: null },
        { model: 'Example: Zero', entry: { ...ECONOMY, pricing: { input: 0, output: 0 } } },
      ],
      scenario,
      workload: { runs: 1, cadence: 'month' },
    });

    expect(comparison.rows.every(row => !row.isUsable)).toBe(true);
    expect(comparison.rows.every(row => row.unavailableReason !== null)).toBe(true);
    expect(comparison.recommendation).toBeNull();
  });
});

describe('comparison chart data', () => {
  test('builds cumulative session cost by turn', () => {
    const series = buildSessionAccumulation({ entry: PREMIUM, scenario: { ...scenario, turns: 3 } });

    expect(series.map(point => point.turn)).toEqual([1, 2, 3]);
    expect(series.map(point => point.cost)).toEqual([0.044, 0.088, 0.132]);
  });

  test('describes billable token composition including cache and compaction categories', () => {
    const comparison = buildCostComparison({
      models: [{ model: 'Example: Economy', entry: ECONOMY }],
      scenario: { ...scenario, mode: 'scenario', turns: 3 },
      workload: { runs: 1, cadence: 'once' },
    });
    const estimate = comparison.rows[0].estimate;

    expect(estimate).not.toBeNull();
    const composition = buildTokenComposition(estimate!);
    expect(composition.map(segment => segment.key)).toEqual([
      'cache-write-input',
      'cache-read-input',
      'model-output',
      'compaction-input',
      'compaction-output',
    ]);
    expect(composition.every(segment => segment.value >= 0)).toBe(true);
  });
});

describe('long-context pricing in comparisons', () => {
  test('a 300K-token prompt on a tiered model costs the published long-context rate', () => {
    const entry = {
      pricing: { input: 0.002, output: 0.01, longContextTiers: [{ minPromptTokens: 272_000, input: 0.004, output: 0.015 }] },
      co2eFactor: 0.0002,
      maxOutputTokens: 128_000,
      contextWindowTokens: 1_050_000,
    };
    const { rows } = buildCostComparison({
      models: [{ model: 'OpenAI: GPT-6.1 Sol', entry }],
      scenario: { mode: 'baseline', promptTokens: 300_000, referenceOutputTokens: 2_048, turns: 1, outputTokenLimit: 300_000, contextWindowTokens: 1_000_000 },
      workload: { runs: 1, cadence: 'once' },
    });
    // 300,000 x $4/M + 2,048 x $15/M = $1.23072, not $0.62048 at base rates.
    expect(rows[0].requestCost).toBeCloseTo(1.23072, 8);
    expect(rows[0].estimate?.longContextRequests).toBe(1);
  });
});

describe('context window limits', () => {
  const small = { pricing: { input: 0.0001, output: 0.0002 }, co2eFactor: 0.0002, maxOutputTokens: 4096, contextWindowTokens: 32_000 };
  const large = { pricing: { input: 0.002, output: 0.01 }, co2eFactor: 0.0002, maxOutputTokens: 128_000, contextWindowTokens: 1_000_000 };
  const scenario = { mode: 'baseline' as const, promptTokens: 50_000, referenceOutputTokens: 1_000, turns: 1, outputTokenLimit: 300_000, contextWindowTokens: 1_000_000 };

  test('flags a prompt larger than the context window and never recommends that model', () => {
    const { rows, recommendation } = buildCostComparison({
      models: [{ model: 'Small: 32K', entry: small }, { model: 'Large: 1M', entry: large }],
      scenario,
      workload: { runs: 1, cadence: 'once' },
    });
    expect(rows[0].contextWarning).toContain('larger than its 32,000-token context window');
    expect(rows[1].contextWarning).toBeNull();
    // Small is far cheaper per token, but it cannot take this prompt.
    expect(rows[0].sessionCost!).toBeLessThan(rows[1].sessionCost!);
    expect(recommendation?.model).toBe('Large: 1M');
  });

  test('applies the provider tokenizer multiplier before comparing with the window', () => {
    const { rows } = buildCostComparison({
      models: [{ model: 'Small: 32K', entry: small, promptTokenMultiplier: 1.2 }],
      scenario: { ...scenario, promptTokens: 30_000 },
      workload: { runs: 1, cadence: 'once' },
    });
    expect(rows[0].contextWarning).toContain('about 36,000 tokens');
  });
});

test('comparison carries partial tier and exact cache rates into session billing', () => {
  const entry: PricingEntry = { ...ECONOMY, pricing: { input: 2, output: 10, inputCacheRead: 0.2, inputCacheWrite: 2.5,
    longContextTiers: [{ minPromptTokens: 150, input: 4, inputCacheRead: 0.3, inputCacheWrite: 5 }],
  } };
  const result = buildCostComparison({ models: [{ model: 'Test: Tiered', entry }], scenario: { ...scenario, mode: 'scenario', promptTokens: 100, referenceOutputTokens: 0, turnOverheadTokens: 0 }, workload: { runs: 1, cadence: 'once' } });
  expect(result.rows[0].sessionCost).toBeCloseTo(0.78, 10);
});

test('legacy comparison excludes input-plus-output overflow and oversized output plans', () => {
  const small = { ...ECONOMY, contextWindowTokens: 8192, maxOutputTokens: 4096 };
  const combined = buildCostComparison({ models: [{ model: 'Small', entry: small }, { model: 'Large', entry: PREMIUM }], scenario: { ...scenario, promptTokens: 7000, referenceOutputTokens: 2048 }, workload: { runs: 1, cadence: 'once' } });
  expect(combined.rows[0].contextWarning).toContain('input plus planned output');
  expect(combined.recommendation?.model).toBe('Large');
  const output = buildCostComparison({ models: [{ model: 'Small', entry: small }], scenario: { ...scenario, promptTokens: 100, referenceOutputTokens: 5000 }, workload: { runs: 1, cadence: 'once' } });
  expect(output.rows[0].contextWarning).toContain('output limit');
  expect(output.recommendation).toBeNull();
});
