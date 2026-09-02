import { expect, test } from 'bun:test';
import { buildDatedArtificialAnalysisFallback } from './artificialAnalysis';
import { catalogModelFields, plannerModelFields, rateOrNull } from './efficiencyModelRates';
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
