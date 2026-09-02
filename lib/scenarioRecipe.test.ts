import { describe, expect, test } from 'bun:test';
import { parseScenarioRecipe, SCENARIO_RECIPE_SCHEMA } from './scenarioRecipe';

describe('scenario recipe', () => {
  test('accepts a bounded prompt-free planning recipe', () => {
    const recipe = parseScenarioRecipe({
      schemaVersion: SCENARIO_RECIPE_SCHEMA,
      createdAt: '2026-09-01T00:00:00.000Z',
      privacy: { promptIncluded: false },
      promptTokens: 1200,
      tokenizer: 'o200k_base',
      selectedModels: ['openai/gpt-5'],
      outputTokens: 800,
      turns: 4,
      sessionMode: 'scenario',
      workloadRuns: 500,
      workloadCadence: 'month',
      planning: { monthlyBudget: 250, volumeVariancePct: 20, retryRatePct: 5 },
      source: { name: 'openrouter-live', retrievedAt: '2026-09-01T00:00:00.000Z' },
    });
    expect(recipe?.promptTokens).toBe(1200);
    expect(JSON.stringify(recipe)).not.toContain('promptText');
  });

  test('rejects unbounded or malformed recipes', () => {
    expect(parseScenarioRecipe({ schemaVersion: SCENARIO_RECIPE_SCHEMA, promptTokens: -1 })).toBeNull();
  });
});
