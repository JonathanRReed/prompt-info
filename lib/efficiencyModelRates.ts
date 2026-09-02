import type { ArtificialAnalysisModel } from './artificialAnalysis';

export function rateOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Replace model identity and prices together. Missing evidence never inherits another model's rate. */
export function catalogModelFields(model: ArtificialAnalysisModel, rateSource: string) {
  return {
    name: model.name,
    provider: model.creator,
    inputPerMillion: rateOrNull(model.inputPerMillion),
    outputPerMillion: rateOrNull(model.outputPerMillion),
    intelligenceIndex: model.intelligenceIndex,
    benchmarkCostPerTask: model.benchmarkCostPerTask,
    outputTokensPerSecond: model.outputTokensPerSecond,
    aaModelId: model.id,
    rateSource,
  };
}

export function plannerModelFields(
  scenario: { model: string; inputPerMillion: number | null; outputPerMillion: number | null },
  benchmark: ArtificialAnalysisModel | null,
) {
  return {
    name: scenario.model || 'Planner model',
    provider: scenario.model.includes(':') ? scenario.model.slice(0, scenario.model.indexOf(':')) : benchmark?.creator ?? 'Planner',
    inputPerMillion: rateOrNull(scenario.inputPerMillion),
    outputPerMillion: rateOrNull(scenario.outputPerMillion),
    intelligenceIndex: benchmark?.intelligenceIndex ?? null,
    benchmarkCostPerTask: benchmark?.benchmarkCostPerTask ?? null,
    outputTokensPerSecond: benchmark?.outputTokensPerSecond ?? null,
    aaModelId: benchmark?.id ?? null,
    rateSource: 'Planner pricing',
  };
}
