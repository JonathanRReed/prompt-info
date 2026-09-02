import type { SessionRunMode } from './sessionMath';
import type { WorkloadCadence } from './workloadMath';

export const SCENARIO_RECIPE_SCHEMA = 'prompt-info-scenario.v1' as const;

export type ScenarioRecipe = {
  schemaVersion: typeof SCENARIO_RECIPE_SCHEMA;
  createdAt: string;
  privacy: { promptIncluded: false };
  promptTokens: number;
  tokenizer: string;
  selectedModels: string[];
  outputTokens: number;
  turns: number;
  sessionMode: SessionRunMode;
  workloadRuns: number;
  workloadCadence: WorkloadCadence;
  planning: {
    monthlyBudget: number;
    volumeVariancePct: number;
    retryRatePct: number;
  };
  source: { name: string | null; retrievedAt: string | null };
};

function finiteInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function parseScenarioRecipe(value: unknown): ScenarioRecipe | null {
  if (!value || typeof value !== 'object') return null;
  const recipe = value as Partial<ScenarioRecipe>;
  if (recipe.schemaVersion !== SCENARIO_RECIPE_SCHEMA) return null;
  const promptTokens = finiteInteger(recipe.promptTokens, 0, 10_000_000);
  const outputTokens = finiteInteger(recipe.outputTokens, 64, 300_000);
  const turns = finiteInteger(recipe.turns, 1, 200);
  const workloadRuns = finiteInteger(recipe.workloadRuns, 1, 1_000_000);
  if (promptTokens === null || outputTokens === null || turns === null || workloadRuns === null) return null;
  if (recipe.sessionMode !== 'baseline' && recipe.sessionMode !== 'scenario') return null;
  if (!['once', 'day', 'week', 'month'].includes(recipe.workloadCadence ?? '')) return null;
  if (typeof recipe.tokenizer !== 'string' || recipe.tokenizer.length > 80) return null;
  if (!Array.isArray(recipe.selectedModels) || recipe.selectedModels.length < 1 || recipe.selectedModels.length > 3) return null;
  if (!recipe.selectedModels.every(model => typeof model === 'string' && model.length > 0 && model.length <= 240)) return null;
  const planning = recipe.planning;
  if (!planning || typeof planning !== 'object') return null;
  const monthlyBudget = finiteInteger(planning.monthlyBudget, 0, 100_000_000);
  const volumeVariancePct = finiteInteger(planning.volumeVariancePct, 0, 100);
  const retryRatePct = finiteInteger(planning.retryRatePct, 0, 500);
  if (monthlyBudget === null || volumeVariancePct === null || retryRatePct === null) return null;
  return {
    schemaVersion: SCENARIO_RECIPE_SCHEMA,
    createdAt: typeof recipe.createdAt === 'string' ? recipe.createdAt : new Date().toISOString(),
    privacy: { promptIncluded: false },
    promptTokens,
    tokenizer: recipe.tokenizer,
    selectedModels: recipe.selectedModels,
    outputTokens,
    turns,
    sessionMode: recipe.sessionMode,
    workloadRuns,
    workloadCadence: recipe.workloadCadence as WorkloadCadence,
    planning: { monthlyBudget, volumeVariancePct, retryRatePct },
    source: {
      name: typeof recipe.source?.name === 'string' ? recipe.source.name : null,
      retrievedAt: typeof recipe.source?.retrievedAt === 'string' ? recipe.source.retrievedAt : null,
    },
  };
}
