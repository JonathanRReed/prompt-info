import { describe, expect, test } from 'bun:test';
import { buildDatedArtificialAnalysisFallback } from './artificialAnalysis';
import { catalogModelFields, editedRate, plannerModelFields, rateOrNull } from './efficiencyModelRates';
import { costPerTask } from './tokenEfficiency';

test('changing a model preserves missing rates instead of inheriting the previous model prices', () => {
  const candidate = { ...buildDatedArtificialAnalysisFallback()[0], inputPerMillion: null, outputPerMillion: 3 };
  const previous = { inputPerMillion: 99, outputPerMillion: 99 };
  const selected = { ...previous, ...catalogModelFields(candidate, 'Test source') };
  expect(selected.inputPerMillion).toBeNull();
  expect(selected.outputPerMillion).toBe(3);
  expect(costPerTask({ ...selected, inputTokensPerTask: 1000, outputTokensPerTask: 1000 })).toBeNull();
});

test('free rates remain zero while malformed rates remain unavailable', () => {
  expect(rateOrNull(0)).toBe(0);
  for (const value of [null, undefined, '', '0', NaN, Infinity, -1]) expect(rateOrNull(value)).toBeNull();
  const candidate = { ...buildDatedArtificialAnalysisFallback()[0], inputPerMillion: 0, outputPerMillion: 0 };
  expect(costPerTask({ ...catalogModelFields(candidate, 'Test source'), inputTokensPerTask: 1000, outputTokensPerTask: 1000 })).toBe(0);
});

test('a planner model with missing prices does not acquire benchmark or previous-slot rates', () => {
  const benchmark = buildDatedArtificialAnalysisFallback()[0];
  const selected = plannerModelFields({ model: 'New provider: New model', inputPerMillion: 1, outputPerMillion: null }, benchmark);
  expect(selected.inputPerMillion).toBe(1);
  expect(selected.outputPerMillion).toBeNull();
  expect(selected.name).toBe('New provider: New model');
  expect(plannerModelFields({ model: 'Unknown', inputPerMillion: null, outputPerMillion: null }, null).aaModelId).toBeNull();
});

describe('editedRate', () => {
  test('keeps absent and free distinct', () => {
    expect(editedRate('', 10_000)).toBeNull();
    expect(editedRate('   ', 10_000)).toBeNull();
    expect(editedRate('0', 10_000)).toBe(0);
  });

  test('never turns a negative or malformed rate into a free one', () => {
    expect(editedRate('-3', 10_000)).toBeNull();
    expect(editedRate('-0.01', 10_000)).toBeNull();
    expect(editedRate('abc', 10_000)).toBeNull();
    const negativeTyped = costPerTask({ inputTokensPerTask: 5_000, outputTokensPerTask: 1_000, inputPerMillion: editedRate('-3', 10_000), outputPerMillion: 10 });
    expect(negativeTyped).toBeNull();
  });

  test('caps huge rates at the field maximum and keeps decimals', () => {
    expect(editedRate('1e9', 10_000)).toBe(10_000);
    expect(editedRate('0.075', 10_000)).toBe(0.075);
  });
});
