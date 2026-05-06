export const SESSION_TOKEN_STEP = 64;

// Real-world cache pricing reference (2026):
// Anthropic: cache read = 10% of base input (90% off), write = 125-200% of base input
// OpenAI: cache read = 50% of base input, no write premium, automatic for prompts >1024 tokens
// Google Gemini: cache read = 10-25% of base input (75-90% off), storage = $4.50/Mtok/hour
export const DEFAULT_SESSION_OUTPUT_SHARE_PCT = 80;
export const DEFAULT_SESSION_CACHED_INPUT_BILLED_PCT = 20; // between OpenAI (50) and Anthropic (10)
export const DEFAULT_SESSION_COMPACTION_THRESHOLD_PCT = 72; // trigger compaction at ~70-80% of context window
export const DEFAULT_SESSION_COMPACTION_RETENTION_PCT = 25; // summary = 25% of history (research-backed)
export const DEFAULT_SESSION_TURN_OVERHEAD_TOKENS = 32; // system prompt + tool schemas per turn
export const DEFAULT_SESSION_COMPACTION_SUMMARY_FLOOR_TOKENS = 128; // minimum summary size

export type SessionRunMode = 'baseline' | 'scenario';

export type SessionRunEstimateInput = {
  mode?: SessionRunMode;
  promptTokens: number;
  referenceOutputTokens: number;
  turns: number;
  inputRatePer1k: number | null;
  outputRatePer1k: number | null;
  outputTokenLimit: number;
  contextWindowTokens?: number;
  targetOutputCostSharePct?: number;
  cachedInputBillablePct?: number;
  compactionThresholdPct?: number;
  compactionRetentionPct?: number;
  turnOverheadTokens?: number;
  compactionSummaryFloorTokens?: number;
};

export type SessionRunEstimate = {
  mode: SessionRunMode;
  turns: number;
  freshInputTokens: number;
  reusedContextTokens: number;
  cachedInputTokens: number;
  turnInputTokens: number;
  turnOutputTokens: number;
  compactionInputTokens: number;
  compactionOutputTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  compactionCount: number;
  turnInputCost: number | null;
  turnOutputCost: number | null;
  compactionInputCost: number | null;
  compactionOutputCost: number | null;
  inputCost: number | null;
  outputCost: number | null;
  turnCost: number | null;
  compactionCost: number | null;
  totalCost: number | null;
  targetOutputCostSharePct: number | null;
  achievedOutputCostSharePct: number | null;
  inputSharePct: number | null;
  cachedInputBillablePct: number | null;
  compactionThresholdPct: number | null;
  compactionRetentionPct: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function positiveInteger(value: number | null | undefined, fallback = 0) {
  if (!isFiniteNumber(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function normalizePercent(value: number | null | undefined, fallback: number) {
  if (!isFiniteNumber(value)) return fallback;
  return clamp(value / 100, 0, 1);
}

function roundToTokenStep(value: number, step = SESSION_TOKEN_STEP) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(step, Math.ceil(value / step) * step);
}

function clampOutputTokens(value: number, limit: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(limit) || limit <= 0) return Math.floor(value);
  return Math.min(Math.floor(value), Math.floor(limit));
}

function costForTokens(tokens: number, ratePer1k: number | null) {
  if (!Number.isFinite(tokens) || tokens <= 0 || !isFiniteNumber(ratePer1k)) return null;
  return (tokens / 1000) * ratePer1k;
}

function sumCosts(values: Array<number | null>) {
  const finiteValues = values.filter((value): value is number => isFiniteNumber(value));
  if (finiteValues.length === 0) return null;
  return finiteValues.reduce((total, value) => total + value, 0);
}

function buildEmptyEstimate(
  mode: SessionRunMode,
  turns: number,
  cachedInputBillablePct: number | null,
  compactionThresholdPct: number | null,
  compactionRetentionPct: number | null,
  targetOutputCostSharePct: number | null
): SessionRunEstimate {
  return {
    mode,
    turns,
    freshInputTokens: 0,
    reusedContextTokens: 0,
    cachedInputTokens: 0,
    turnInputTokens: 0,
    turnOutputTokens: 0,
    compactionInputTokens: 0,
    compactionOutputTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    compactionCount: 0,
    turnInputCost: null,
    turnOutputCost: null,
    compactionInputCost: null,
    compactionOutputCost: null,
    inputCost: null,
    outputCost: null,
    turnCost: null,
    compactionCost: null,
    totalCost: null,
    targetOutputCostSharePct,
    achievedOutputCostSharePct: null,
    inputSharePct: null,
    cachedInputBillablePct,
    compactionThresholdPct,
    compactionRetentionPct,
  };
}

export function simulateSessionRunCost({
  mode = 'baseline',
  promptTokens,
  referenceOutputTokens,
  turns,
  inputRatePer1k,
  outputRatePer1k,
  outputTokenLimit,
  contextWindowTokens,
  targetOutputCostSharePct,
  cachedInputBillablePct,
  compactionThresholdPct,
  compactionRetentionPct,
  turnOverheadTokens,
  compactionSummaryFloorTokens,
}: SessionRunEstimateInput): SessionRunEstimate {
  const safeTurns = Math.max(0, Math.floor(isFiniteNumber(turns) ? turns : 0));
  const safePromptTokens = Math.max(0, Math.floor(isFiniteNumber(promptTokens) ? promptTokens : 0));
  const safeReferenceOutputTokens = Math.max(0, Math.floor(isFiniteNumber(referenceOutputTokens) ? referenceOutputTokens : 0));
  const safeOutputLimit = Math.max(0, Math.floor(isFiniteNumber(outputTokenLimit) ? outputTokenLimit : 0));
  const safeContextWindow = Math.max(0, Math.floor(isFiniteNumber(contextWindowTokens) ? contextWindowTokens : 0));

  if (safeTurns === 0) {
    return buildEmptyEstimate(mode, 0, null, null, null, null);
  }

  // Baseline: simple multiplication
  if (mode === 'baseline') {
    const totalInputTokens = safePromptTokens * safeTurns;
    const totalOutputTokens = safeReferenceOutputTokens * safeTurns;
    const turnInputCost = costForTokens(totalInputTokens, inputRatePer1k);
    const turnOutputCost = costForTokens(totalOutputTokens, outputRatePer1k);
    const turnCost = sumCosts([turnInputCost, turnOutputCost]);

    return {
      mode,
      turns: safeTurns,
      freshInputTokens: totalInputTokens,
      reusedContextTokens: 0,
      cachedInputTokens: 0,
      turnInputTokens: totalInputTokens,
      turnOutputTokens: totalOutputTokens,
      compactionInputTokens: 0,
      compactionOutputTokens: 0,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      compactionCount: 0,
      turnInputCost,
      turnOutputCost,
      compactionInputCost: 0,
      compactionOutputCost: 0,
      inputCost: turnInputCost,
      outputCost: turnOutputCost,
      turnCost,
      compactionCost: 0,
      totalCost: turnCost,
      targetOutputCostSharePct: null,
      achievedOutputCostSharePct: turnCost && turnOutputCost !== null && turnCost > 0 ? (turnOutputCost / turnCost) * 100 : null,
      inputSharePct: turnCost && turnInputCost !== null && turnCost > 0 ? (turnInputCost / turnCost) * 100 : null,
      cachedInputBillablePct: null,
      compactionThresholdPct: null,
      compactionRetentionPct: null,
    };
  }

  // Scenario mode: compaction + cache
  const safeTargetOutputSharePct = normalizePercent(targetOutputCostSharePct, DEFAULT_SESSION_OUTPUT_SHARE_PCT);
  const safeCachedInputBillablePct = normalizePercent(cachedInputBillablePct, DEFAULT_SESSION_CACHED_INPUT_BILLED_PCT);
  const safeCompactionThresholdPct = normalizePercent(compactionThresholdPct, DEFAULT_SESSION_COMPACTION_THRESHOLD_PCT);
  const safeCompactionRetentionPct = normalizePercent(compactionRetentionPct, DEFAULT_SESSION_COMPACTION_RETENTION_PCT);
  const safeTurnOverheadTokens = positiveInteger(turnOverheadTokens, DEFAULT_SESSION_TURN_OVERHEAD_TOKENS);
  const safeCompactionSummaryFloorTokens = positiveInteger(compactionSummaryFloorTokens, DEFAULT_SESSION_COMPACTION_SUMMARY_FLOOR_TOKENS);

  let historyTokens = 0;
  let freshInputTokens = 0;
  let reusedContextTokens = 0;
  let cachedInputTokens = 0;
  let turnInputTokens = 0;
  let turnOutputTokens = 0;
  let compactionInputTokens = 0;
  let compactionOutputTokens = 0;
  let compactionCount = 0;

  for (let turn = 0; turn < safeTurns; turn += 1) {
    const freshInputThisTurn = safePromptTokens + safeTurnOverheadTokens;
    const reusedContextThisTurn = historyTokens;
    const cachedInputThisTurn = reusedContextThisTurn * safeCachedInputBillablePct;
    const billableInputThisTurn = freshInputThisTurn + cachedInputThisTurn;
    const billableInputCostThisTurn = costForTokens(billableInputThisTurn, inputRatePer1k);

    let outputTokensThisTurn = safeReferenceOutputTokens;
    const outputShareDenominator = 1 - safeTargetOutputSharePct;
    if (
      billableInputCostThisTurn !== null &&
      isFiniteNumber(outputRatePer1k) &&
      outputRatePer1k > 0 &&
      outputShareDenominator > 0
    ) {
      const targetOutputCostThisTurn =
        billableInputCostThisTurn * (safeTargetOutputSharePct / outputShareDenominator);
      outputTokensThisTurn = targetOutputCostThisTurn / (outputRatePer1k / 1000);
    } else if (outputShareDenominator <= 0) {
      outputTokensThisTurn = safeOutputLimit;
    }

    outputTokensThisTurn = clampOutputTokens(roundToTokenStep(outputTokensThisTurn), safeOutputLimit);

    freshInputTokens += freshInputThisTurn;
    reusedContextTokens += reusedContextThisTurn;
    cachedInputTokens += cachedInputThisTurn;
    turnInputTokens += billableInputThisTurn;
    turnOutputTokens += outputTokensThisTurn;

    historyTokens += outputTokensThisTurn;

    // Compaction: a real LLM summarization call
    //   Input tokens = history being summarized (+ overhead)
    //   Output tokens = generated summary
    if (safeContextWindow > 0) {
      const thresholdTokens = Math.max(1, Math.floor(safeContextWindow * safeCompactionThresholdPct));
      let safety = 0;

      while (historyTokens > 0 && safety < 8) {
        const projectedContext = safePromptTokens + safeTurnOverheadTokens + historyTokens;
        if (projectedContext <= thresholdTokens) break;

        // Summarization call: input = history to summarize, output = summary
        const compactionInputTokensThisTurn = historyTokens + safeTurnOverheadTokens;
        // Summary length: retentionPct of history, floored by summaryFloor, capped by history and output limit
        let summaryTokens = Math.max(
          safeCompactionSummaryFloorTokens,
          Math.ceil(historyTokens * safeCompactionRetentionPct)
        );
        summaryTokens = Math.min(summaryTokens, historyTokens);
        summaryTokens = clampOutputTokens(roundToTokenStep(summaryTokens), safeOutputLimit);
        summaryTokens = Math.min(summaryTokens, historyTokens);

        if (summaryTokens >= historyTokens) break;

        compactionInputTokens += compactionInputTokensThisTurn;
        compactionOutputTokens += summaryTokens;
        compactionCount += 1;
        historyTokens = summaryTokens;
        safety += 1;
      }
    }
  }

  const turnInputCost = costForTokens(turnInputTokens, inputRatePer1k);
  const turnOutputCost = costForTokens(turnOutputTokens, outputRatePer1k);
  const compactionInputCost = costForTokens(compactionInputTokens, inputRatePer1k);
  const compactionOutputCost = costForTokens(compactionOutputTokens, outputRatePer1k);
  const inputCost = sumCosts([turnInputCost, compactionInputCost]);
  const outputCost = sumCosts([turnOutputCost, compactionOutputCost]);
  const turnCost = sumCosts([turnInputCost, turnOutputCost]);
  const compactionCost = sumCosts([compactionInputCost, compactionOutputCost]);
  const totalCost = sumCosts([inputCost, outputCost]);
  const totalInputTokens = turnInputTokens + compactionInputTokens;
  const totalOutputTokens = turnOutputTokens + compactionOutputTokens;
  const totalTokens = totalInputTokens + totalOutputTokens;
  const achievedOutputCostSharePct = totalCost && outputCost !== null && totalCost > 0 ? (outputCost / totalCost) * 100 : null;
  const inputSharePct = totalCost && inputCost !== null && totalCost > 0 ? (inputCost / totalCost) * 100 : null;

  return {
    mode,
    turns: safeTurns,
    freshInputTokens,
    reusedContextTokens,
    cachedInputTokens,
    turnInputTokens,
    turnOutputTokens,
    compactionInputTokens,
    compactionOutputTokens,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    compactionCount,
    turnInputCost,
    turnOutputCost,
    compactionInputCost,
    compactionOutputCost,
    inputCost,
    outputCost,
    turnCost,
    compactionCost,
    totalCost,
    targetOutputCostSharePct: safeTargetOutputSharePct * 100,
    achievedOutputCostSharePct,
    inputSharePct,
    cachedInputBillablePct: safeCachedInputBillablePct * 100,
    compactionThresholdPct: safeCompactionThresholdPct * 100,
    compactionRetentionPct: safeCompactionRetentionPct * 100,
  };
}
