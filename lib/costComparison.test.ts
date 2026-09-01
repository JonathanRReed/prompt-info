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
