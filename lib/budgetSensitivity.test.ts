import { describe, expect, test } from 'bun:test';
import { buildBudgetSensitivity } from './budgetSensitivity';

describe('budget sensitivity', () => {
  test('shows low, base, and retry-adjusted high cases without hiding the assumptions', () => {
    expect(buildBudgetSensitivity({
      monthlyCost: 100,
      monthlyBudget: 150,
      volumeVariancePct: 20,
      retryRatePct: 10,
    })).toEqual({
      low: 80,
      base: 100,
      high: 132,
      budget: 150,
      remainingAtBase: 50,
      baseWithinBudget: true,
      highWithinBudget: true,
    });
  });

  test('clamps invalid negative planning inputs', () => {
    const result = buildBudgetSensitivity({
      monthlyCost: -10,
      monthlyBudget: -20,
      volumeVariancePct: -5,
      retryRatePct: -5,
    });
    expect(result.base).toBe(0);
    expect(result.budget).toBe(0);
    expect(result.high).toBe(0);
  });
});
