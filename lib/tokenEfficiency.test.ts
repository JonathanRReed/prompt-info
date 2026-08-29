import { describe, expect, test } from 'bun:test';
import { breakEvenOutputRate, costPerTask, EFFICIENCY_PRESETS } from './tokenEfficiency';

describe('costPerTask', () => {
  test('prices input and output tokens at per-million rates', () => {
    const cost = costPerTask({
      inputTokensPerTask: 5000,
      outputTokensPerTask: 15000,
      inputPerMillion: 4,
      outputPerMillion: 20,
    });
    expect(cost).toBeCloseTo(0.02 + 0.3, 10);
  });

  test('zero tokens cost zero, invalid inputs return null', () => {
    expect(costPerTask({ inputTokensPerTask: 0, outputTokensPerTask: 0, inputPerMillion: 4, outputPerMillion: 20 })).toBe(0);
    expect(costPerTask({ inputTokensPerTask: NaN, outputTokensPerTask: 1, inputPerMillion: 4, outputPerMillion: 20 })).toBeNull();
    expect(costPerTask({ inputTokensPerTask: 1, outputTokensPerTask: -5, inputPerMillion: 4, outputPerMillion: 20 })).toBeNull();
  });

  test('a cheaper per-token model can still cost more per task', () => {
    const inputTokensPerTask = 5000;
    const sol = EFFICIENCY_PRESETS.find(p => p.key === 'gpt-5-6-sol')!;
    const k3 = EFFICIENCY_PRESETS.find(p => p.key === 'kimi-k3')!;

    expect(k3.outputPerMillion).toBeLessThan(sol.outputPerMillion);

    const solCost = costPerTask({ ...sol, inputTokensPerTask })!;
    const k3Cost = costPerTask({ ...k3, inputTokensPerTask })!;
    expect(solCost).toBeLessThan(k3Cost);
  });

  test('cheap AND concise is genuinely the cheapest per task', () => {
    const inputTokensPerTask = 5000;
    const costs = EFFICIENCY_PRESETS.map(p => costPerTask({ ...p, inputTokensPerTask })!);
    const flashIndex = EFFICIENCY_PRESETS.findIndex(p => p.key === 'gemini-3-7-flash');
    expect(Math.min(...costs)).toBe(costs[flashIndex]);
  });
});

describe('breakEvenOutputRate', () => {
  test('a model emitting 2x the tokens must charge under half the rate to break even', () => {
    const rate = breakEvenOutputRate(
      { inputTokensPerTask: 0, outputTokensPerTask: 10000, inputPerMillion: 0, outputPerMillion: 20 },
      { inputTokensPerTask: 0, outputTokensPerTask: 20000, inputPerMillion: 0 }
    );
    expect(rate).toBeCloseTo(10, 10);
  });

  test('returns null when the verbose model has no output tokens', () => {
    const rate = breakEvenOutputRate(
      { inputTokensPerTask: 100, outputTokensPerTask: 100, inputPerMillion: 1, outputPerMillion: 1 },
      { inputTokensPerTask: 100, outputTokensPerTask: 0, inputPerMillion: 1 }
    );
    expect(rate).toBeNull();
  });
});

describe('EFFICIENCY_PRESETS', () => {
  test('every preset carries positive prices, token counts, and sourced index data', () => {
    expect(EFFICIENCY_PRESETS.length).toBeGreaterThanOrEqual(3);
    for (const preset of EFFICIENCY_PRESETS) {
      expect(preset.inputPerMillion).toBeGreaterThan(0);
      expect(preset.outputPerMillion).toBeGreaterThan(preset.inputPerMillion);
      expect(preset.outputTokensPerTask).toBeGreaterThan(0);
      expect(preset.indexOutputTokensMillions).toBeGreaterThan(0);
      expect(preset.indexEvalCost).toBeGreaterThan(0);
      expect(preset.pricingNote.length).toBeGreaterThan(0);
    }
  });

  test('per-task token estimates stay proportional to the published index totals', () => {
    const sol = EFFICIENCY_PRESETS.find(p => p.key === 'gpt-5-6-sol')!;
    for (const preset of EFFICIENCY_PRESETS) {
      const expected = sol.outputTokensPerTask * (preset.indexOutputTokensMillions / sol.indexOutputTokensMillions);
      const drift = Math.abs(preset.outputTokensPerTask - expected) / expected;
      expect(drift).toBeLessThan(0.05);
    }
  });
});
