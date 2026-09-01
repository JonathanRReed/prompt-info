import {
  simulateSessionRunCost,
  type SessionRunEstimate,
  type SessionRunEstimateInput,
} from './sessionMath';
import { projectWorkload, type WorkloadCadence } from './workloadMath';
import type { PricingEntry } from './pricingParser';

export type CostComparisonScenario = Omit<SessionRunEstimateInput, 'inputRatePer1k' | 'outputRatePer1k'>;

export type SelectedPricingModel = {
  model: string;
  entry: PricingEntry | null | undefined;
  promptTokenMultiplier?: number;
};

export type CostComparisonRow = {
  model: string;
  entry: PricingEntry | null;
  estimate: SessionRunEstimate | null;
  requestCost: number | null;
  sessionCost: number | null;
  monthlyCost: number | null;
  annualCost: number | null;
  isUsable: boolean;
  unavailableReason: string | null;
};

export type CostRecommendation = {
  model: string;
  criterion: 'Lowest monthly cost among selected models' | 'Lowest session cost among selected models';
  value: number;
};

export type TokenCompositionSegment = {
  key: 'cache-write-input' | 'cache-read-input' | 'model-output' | 'compaction-input' | 'compaction-output';
  label: string;
  value: number;
};

function hasUsableRates(entry: PricingEntry | null | undefined): entry is PricingEntry {
  return Boolean(
    entry
    && Number.isFinite(entry.pricing.input)
    && entry.pricing.input > 0
    && Number.isFinite(entry.pricing.output)
    && entry.pricing.output > 0,
  );
}

function cacheReadPercent(entry: PricingEntry): number | undefined {
  const rate = entry.pricing.inputCacheRead;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0) return undefined;
  return (rate / entry.pricing.input) * 100;
}

function cacheWriteMultiplier(entry: PricingEntry): number | undefined {
  const rate = entry.pricing.inputCacheWrite;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return undefined;
  return rate / entry.pricing.input;
}

function estimateFor(
  entry: PricingEntry,
  scenario: CostComparisonScenario,
  turns = scenario.turns,
  promptTokenMultiplier = 1,
) {
  return simulateSessionRunCost({
    ...scenario,
    promptTokens: Math.max(0, Math.round(scenario.promptTokens * promptTokenMultiplier)),
    turns,
    inputRatePer1k: entry.pricing.input,
    outputRatePer1k: entry.pricing.output,
    outputTokenLimit: entry.maxOutputTokens ?? scenario.outputTokenLimit,
    contextWindowTokens: entry.contextWindowTokens ?? scenario.contextWindowTokens,
    cachedInputBillablePct: cacheReadPercent(entry) ?? scenario.cachedInputBillablePct,
    cacheWriteMultiplier: cacheWriteMultiplier(entry) ?? scenario.cacheWriteMultiplier,
  });
}

function unavailableRow(model: string, entry: PricingEntry | null | undefined): CostComparisonRow {
  return {
    model,
    entry: entry ?? null,
    estimate: null,
    requestCost: null,
    sessionCost: null,
    monthlyCost: null,
    annualCost: null,
    isUsable: false,
    unavailableReason: entry ? 'This model does not have positive input and output rates.' : 'Pricing is unavailable for this model.',
  };
}

function chooseRecommendation(rows: CostComparisonRow[]): CostRecommendation | null {
  const usableRows = rows.filter(row => row.isUsable);
  const usesMonthlyCost = usableRows.length > 0 && usableRows.every(row => row.monthlyCost !== null);
  const metric = usesMonthlyCost ? 'monthlyCost' : 'sessionCost';
  const ranked = usableRows
    .filter(row => row[metric] !== null)
    .map(row => ({ row, value: row[metric] as number }))
    .sort((a, b) => a.value - b.value || a.row.model.localeCompare(b.row.model));

  if (ranked.length === 0) return null;
  if (ranked.length > 1 && Math.abs(ranked[0].value - ranked[1].value) < 1e-12) return null;

  return {
    model: ranked[0].row.model,
    criterion: usesMonthlyCost
      ? 'Lowest monthly cost among selected models'
      : 'Lowest session cost among selected models',
    value: ranked[0].value,
  };
}

export function buildCostComparison({
  models,
  scenario,
  workload,
}: {
  models: SelectedPricingModel[];
  scenario: CostComparisonScenario;
  workload: { runs: number; cadence: WorkloadCadence };
}) {
  const rows = models.map(({ model, entry, promptTokenMultiplier }): CostComparisonRow => {
    if (!hasUsableRates(entry)) return unavailableRow(model, entry);

    const requestEstimate = estimateFor(entry, { ...scenario, mode: 'baseline' }, 1, promptTokenMultiplier);
    const estimate = estimateFor(entry, scenario, scenario.turns, promptTokenMultiplier);
    if (requestEstimate.totalCost === null || estimate.totalCost === null) {
      return unavailableRow(model, entry);
    }

    const projection = projectWorkload({
      costPerRun: estimate.totalCost,
      runs: workload.runs,
      cadence: workload.cadence,
    });

    return {
      model,
      entry,
      estimate,
      requestCost: requestEstimate.totalCost,
      sessionCost: estimate.totalCost,
      monthlyCost: projection?.monthlyCost ?? null,
      annualCost: projection?.annualCost ?? null,
      isUsable: true,
      unavailableReason: null,
    };
  });

  return { rows, recommendation: chooseRecommendation(rows) };
}

export function buildSessionAccumulation({
  entry,
  scenario,
}: {
  entry: PricingEntry;
  scenario: CostComparisonScenario;
}) {
  const turns = Math.max(0, Math.floor(scenario.turns));
  return Array.from({ length: turns }, (_, index) => {
    const turn = index + 1;
    const estimate = estimateFor(entry, scenario, turn);
    return { turn, cost: estimate.totalCost ?? 0 };
  });
}

export function buildTokenComposition(estimate: SessionRunEstimate): TokenCompositionSegment[] {
  return [
    {
      key: 'cache-write-input',
      label: estimate.mode === 'scenario' ? 'New and cache-write input' : 'Input',
      value: Math.max(0, estimate.turnInputTokens - estimate.cachedInputTokens),
    },
    { key: 'cache-read-input', label: 'Cache-read input', value: Math.max(0, estimate.cachedInputTokens) },
    { key: 'model-output', label: 'Model output', value: Math.max(0, estimate.turnOutputTokens) },
    { key: 'compaction-input', label: 'Compaction input', value: Math.max(0, estimate.compactionInputTokens) },
    { key: 'compaction-output', label: 'Compaction output', value: Math.max(0, estimate.compactionOutputTokens) },
  ];
}
