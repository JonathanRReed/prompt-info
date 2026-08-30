import { describe, expect, test } from 'bun:test';
import { projectWorkload } from './workloadMath';

describe('projectWorkload', () => {
  test('projects a weekly run count into weekly, monthly, and annual AI spend', () => {
    const projection = projectWorkload({
      costPerRun: 0.25,
      runs: 40,
      cadence: 'week',
    });

    expect(projection).toEqual({
      cadence: 'week',
      runs: 40,
      runsPerMonth: 173.33333333333334,
      runsPerYear: 2080,
      costPerPeriod: 10,
      monthlyCost: 43.333333333333336,
      annualCost: 520,
    });
  });

  test('keeps one-time work from implying recurring monthly or annual spend', () => {
    expect(projectWorkload({ costPerRun: 1.5, runs: 3, cadence: 'once' })).toEqual({
      cadence: 'once',
      runs: 3,
      runsPerMonth: null,
      runsPerYear: null,
      costPerPeriod: 4.5,
      monthlyCost: null,
      annualCost: null,
    });
  });

  test('rejects negative, non-finite, or fractional run counts', () => {
    expect(projectWorkload({ costPerRun: -1, runs: 2, cadence: 'month' })).toBeNull();
    expect(projectWorkload({ costPerRun: Number.NaN, runs: 2, cadence: 'month' })).toBeNull();
    expect(projectWorkload({ costPerRun: 1, runs: 2.5, cadence: 'month' })).toBeNull();
  });
});
