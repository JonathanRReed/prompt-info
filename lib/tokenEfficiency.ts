// Token efficiency: what a task costs is price-per-token TIMES tokens used,
// and models differ far more on the second factor than the first. The presets
// below pair each model's published API price with how many output tokens it
// actually spent completing the same evaluation suite (Artificial Analysis
// Intelligence Index, retrieved August 2026), so a cheaper per-token model
// that talks twice as much can land above a pricier, terser one per task.

export type EfficiencyModelPreset = {
  key: string;
  name: string;
  provider: string;
  /** USD per 1M input tokens. */
  inputPerMillion: number;
  /** USD per 1M output tokens. */
  outputPerMillion: number;
  /**
   * Planning estimate of output tokens spent per completed task. Anchored to
   * Artificial Analysis' published ~15K output tokens per Intelligence Index
   * task for GPT-5.6 Sol (max), then scaled by each model's total output
   * tokens across the same suite (70M / 130M / 64M).
   */
  outputTokensPerTask: number;
  /** Artificial Analysis Intelligence Index score, August 2026. */
  intelligenceIndex: number;
  /** Total output tokens the model generated across the Intelligence Index, in millions. */
  indexOutputTokensMillions: number;
  /** What it cost to run the model across the full Intelligence Index, USD. */
  indexEvalCost: number;
  pricingNote: string;
};

export const EFFICIENCY_REFERENCE_DATE = 'August 29, 2026';

export const EFFICIENCY_PRESETS: EfficiencyModelPreset[] = [
  {
    key: 'gpt-5-6-sol',
    name: 'GPT-5.6 Sol (max)',
    provider: 'OpenAI',
    inputPerMillion: 4,
    outputPerMillion: 20,
    outputTokensPerTask: 15000,
    intelligenceIndex: 61,
    indexOutputTokensMillions: 70,
    indexEvalCost: 2017.29,
    pricingNote: 'Promo pricing through Nov 21, 2026; list is $5 / $30.',
  },
  {
    key: 'kimi-k3',
    name: 'Kimi K3 (max)',
    provider: 'Moonshot',
    inputPerMillion: 3,
    outputPerMillion: 15,
    outputTokensPerTask: 28000,
    intelligenceIndex: 60,
    indexOutputTokensMillions: 130,
    indexEvalCost: 2425.11,
    pricingNote: 'Moonshot first-party API pricing; cache reads at $0.30.',
  },
  {
    key: 'gemini-3-7-flash',
    name: 'Gemini 3.7 Flash (high)',
    provider: 'Google',
    inputPerMillion: 0.75,
    outputPerMillion: 3.75,
    outputTokensPerTask: 14000,
    intelligenceIndex: 56,
    indexOutputTokensMillions: 64,
    indexEvalCost: 484.73,
    pricingNote: 'Intro pricing through Dec 31, 2026; doubles to $1.50 / $7.50 after.',
  },
];

export type TaskCostInput = {
  inputTokensPerTask: number;
  outputTokensPerTask: number;
  inputPerMillion: number | null;
  outputPerMillion: number | null;
};

export function scaleOutputTokensByEfficiency({
  measuredOutputTokens,
  referenceOutputTokens,
  comparisonOutputTokens,
}: {
  measuredOutputTokens: number;
  referenceOutputTokens: number;
  comparisonOutputTokens: number;
}) {
  const measured = Math.max(0, Math.round(Number.isFinite(measuredOutputTokens) ? measuredOutputTokens : 0));
  if (!Number.isFinite(referenceOutputTokens) || referenceOutputTokens <= 0) return measured;
  if (!Number.isFinite(comparisonOutputTokens) || comparisonOutputTokens < 0) return measured;
  return Math.max(0, Math.round(measured * comparisonOutputTokens / referenceOutputTokens));
}

function isUsableNumber(value: number | null, { allowZero = true } = {}): value is number {
  return value !== null && Number.isFinite(value) && (allowZero ? value >= 0 : value > 0);
}

/** USD cost of one completed task, or null when any input is unusable. */
export function costPerTask({
  inputTokensPerTask,
  outputTokensPerTask,
  inputPerMillion,
  outputPerMillion,
}: TaskCostInput): number | null {
  if (
    !isUsableNumber(inputTokensPerTask) ||
    !isUsableNumber(outputTokensPerTask) ||
    !isUsableNumber(inputPerMillion) ||
    !isUsableNumber(outputPerMillion)
  ) {
    return null;
  }

  return (inputTokensPerTask / 1_000_000) * inputPerMillion + (outputTokensPerTask / 1_000_000) * outputPerMillion;
}

/**
 * The output price per 1M tokens at which `verbose` would match `terse` on
 * cost per task: how far a chatty model's rate card must fall before its extra
 * tokens stop costing you money. Returns null when the comparison is
 * degenerate (no valid costs, or the verbose model emits no output tokens).
 */
export function breakEvenOutputRate(
  terse: TaskCostInput,
  verbose: Omit<TaskCostInput, 'outputPerMillion'>
): number | null {
  const terseCost = costPerTask(terse);
  if (terseCost === null) return null;
  if (!isUsableNumber(verbose.outputTokensPerTask, { allowZero: false })) return null;
  if (!isUsableNumber(verbose.inputTokensPerTask) || !isUsableNumber(verbose.inputPerMillion)) return null;

  const verboseInputCost = (verbose.inputTokensPerTask / 1_000_000) * verbose.inputPerMillion;
  const rate = ((terseCost - verboseInputCost) * 1_000_000) / verbose.outputTokensPerTask;
  return rate >= 0 ? rate : null;
}
