export const SESSION_TOKEN_STEP = 64;

// Real-world cache pricing reference (2026):
// Anthropic: cache read = 10% of base input (90% off), write = 125% (5m TTL) or 200% (1h TTL)
// OpenAI: cache read = 10-50% of base input depending on family, no write premium
// Google Gemini: cache read = 10-25% of base input, storage billed separately per hour
export const DEFAULT_SESSION_OUTPUT_SHARE_PCT = 80;
export const DEFAULT_SESSION_CACHED_INPUT_BILLED_PCT = 20; // blended fallback when the model has no published cache rate
export const DEFAULT_SESSION_CACHE_WRITE_MULTIPLIER = 1; // no write premium unless the provider charges one
export const DEFAULT_SESSION_COMPACTION_THRESHOLD_PCT = 72; // trigger compaction at ~70-80% of context window
export const DEFAULT_SESSION_COMPACTION_RETENTION_PCT = 25; // summary = 25% of history (research-backed)
export const DEFAULT_SESSION_TURN_OVERHEAD_TOKENS = 32; // per-turn message framing on top of the prompt
export const DEFAULT_SESSION_COMPACTION_SUMMARY_FLOOR_TOKENS = 128; // minimum summary size

export type SessionRunMode = 'baseline' | 'scenario';
export type SessionOutputSizing = 'planned' | 'costShare';

export type SessionRunEstimateInput = {
  mode?: SessionRunMode;
  promptTokens: number;
  referenceOutputTokens: number;
  turns: number;
  inputRatePer1k: number | null;
  outputRatePer1k: number | null;
  outputTokenLimit: number;
  contextWindowTokens?: number;
  outputSizing?: SessionOutputSizing;
  targetOutputCostSharePct?: number;
  cachedInputBillablePct?: number;
  cacheWriteMultiplier?: number;
  compactionThresholdPct?: number;
  compactionRetentionPct?: number;
  turnOverheadTokens?: number;
  compactionSummaryFloorTokens?: number;
};

export type SessionRunEstimate = {
  mode: SessionRunMode;
  outputSizing: SessionOutputSizing | null;
  turns: number;
  /** New prompt + overhead tokens introduced each turn (raw). */
  freshInputTokens: number;
  /** Conversation history re-sent across turns (raw, before cache discount). */
  reusedContextTokens: number;
  /** Billable token-equivalents charged for re-sent history after the cache discount. */
  cachedInputTokens: number;
  /** Billable input token-equivalents across all turns (cache write premium + discounted reads). */
  turnInputTokens: number;
  turnOutputTokens: number;
  /** Raw input tokens the provider actually processes across all turns. */
  processedInputTokens: number;
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
  cacheWriteMultiplier: number | null;
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
  if (!isFiniteNumber(value) || value < 0) return fallback;
  return Math.floor(value);
}

function normalizePercent(value: number | null | undefined, fallback: number) {
  // Both branches take a 0-100 percent and return a 0-1 fraction.
  if (!isFiniteNumber(value)) return clamp(fallback / 100, 0, 1);
  return clamp(value / 100, 0, 1);
}

function normalizeMultiplier(value: number | null | undefined, fallback: number) {
  if (!isFiniteNumber(value) || value <= 0) return fallback;
  // A write multiplier below 1 would mean writing costs less than base input,
  // which no provider offers. Clamp so UI input and math cannot diverge.
  return clamp(value, 1, 4);
}

function roundToTokenStep(value: number, step = SESSION_TOKEN_STEP) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(step, Math.ceil(value / step) * step);
}

function clampOutputTokens(value: number, limit: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  // A non-finite limit means "no cap"; an explicit limit of 0 means the model
  // has no output capacity left (e.g. the prompt fills the context window).
  if (!Number.isFinite(limit)) return Math.floor(value);
  if (limit <= 0) return 0;
  return Math.min(Math.floor(value), Math.floor(limit));
}

function costForTokens(tokens: number, ratePer1k: number | null) {
  if (!Number.isFinite(tokens) || tokens < 0 || !isFiniteNumber(ratePer1k)) return null;
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
    outputSizing: null,
    turns,
    freshInputTokens: 0,
    reusedContextTokens: 0,
    cachedInputTokens: 0,
    turnInputTokens: 0,
    turnOutputTokens: 0,
    processedInputTokens: 0,
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
    cacheWriteMultiplier: null,
    compactionThresholdPct,
    compactionRetentionPct,
  };
}

/**
 * Simulates a multi-turn session.
 *
 * Baseline mode treats every turn as an independent one-shot request: the same
 * prompt is billed at full price each turn and history is never re-sent. It is
 * a lower bound, useful for stateless batch jobs.
 *
 * Scenario mode simulates a real conversational/agent session:
 *   - The full conversation history (prior prompts AND outputs) is re-sent on
 *     every turn, like real chat/agent APIs require.
 *   - Tokens already in the provider's prompt cache are billed at the cache
 *     read rate (`cachedInputBillablePct` of the input price). Tokens that are
 *     new to the prefix (last turn's output + this turn's prompt) are billed
 *     once at the cache write rate (`cacheWriteMultiplier` x input price).
 *   - When the projected context crosses the compaction threshold, a
 *     summarization call is simulated (history in, summary out) and the prompt
 *     cache is invalidated, since compaction rewrites the prefix.
 */
export function simulateSessionRunCost({
  mode = 'baseline',
  promptTokens,
  referenceOutputTokens,
  turns,
  inputRatePer1k,
  outputRatePer1k,
  outputTokenLimit,
  contextWindowTokens,
  outputSizing = 'planned',
  targetOutputCostSharePct,
  cachedInputBillablePct,
  cacheWriteMultiplier,
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
      outputSizing: null,
      turns: safeTurns,
      freshInputTokens: totalInputTokens,
      reusedContextTokens: 0,
      cachedInputTokens: 0,
      turnInputTokens: totalInputTokens,
      turnOutputTokens: totalOutputTokens,
      processedInputTokens: totalInputTokens,
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
      cacheWriteMultiplier: null,
      compactionThresholdPct: null,
      compactionRetentionPct: null,
    };
  }

  // Scenario mode: full-history session with prompt caching + compaction
  const safeTargetOutputSharePct = normalizePercent(targetOutputCostSharePct, DEFAULT_SESSION_OUTPUT_SHARE_PCT);
  const safeCachedInputBillablePct = normalizePercent(cachedInputBillablePct, DEFAULT_SESSION_CACHED_INPUT_BILLED_PCT);
  const safeCompactionThresholdPct = normalizePercent(compactionThresholdPct, DEFAULT_SESSION_COMPACTION_THRESHOLD_PCT);
  const safeCompactionRetentionPct = normalizePercent(compactionRetentionPct, DEFAULT_SESSION_COMPACTION_RETENTION_PCT);
  const safeTurnOverheadTokens = positiveInteger(turnOverheadTokens, DEFAULT_SESSION_TURN_OVERHEAD_TOKENS);
  const safeCompactionSummaryFloorTokens = positiveInteger(compactionSummaryFloorTokens, DEFAULT_SESSION_COMPACTION_SUMMARY_FLOOR_TOKENS);
  // Paying full price for reads means caching is off, so no write premium applies either.
  const safeCacheWriteMultiplier = safeCachedInputBillablePct >= 1
    ? 1
    : normalizeMultiplier(cacheWriteMultiplier, DEFAULT_SESSION_CACHE_WRITE_MULTIPLIER);

  // cachedPrefixTokens: history already written to the provider's prompt cache.
  // pendingTokens: tokens appended since the last request (the previous output),
  // which get cache-written as part of the next request's prefix.
  let cachedPrefixTokens = 0;
  let pendingTokens = 0;

  let freshInputTokens = 0;
  let reusedContextTokens = 0;
  let cachedInputTokens = 0;
  let turnInputTokens = 0;
  let turnOutputTokens = 0;
  let processedInputTokens = 0;
  let compactionInputTokens = 0;
  let compactionOutputTokens = 0;
  let compactionCount = 0;

  for (let turn = 0; turn < safeTurns; turn += 1) {
    const freshInputThisTurn = safePromptTokens + safeTurnOverheadTokens;
    const newPrefixTokens = pendingTokens + freshInputThisTurn;
    const reusedThisTurn = cachedPrefixTokens;
    const cachedBilledThisTurn = reusedThisTurn * safeCachedInputBillablePct;
    const billableInputThisTurn = newPrefixTokens * safeCacheWriteMultiplier + cachedBilledThisTurn;
    const billableInputCostThisTurn = costForTokens(billableInputThisTurn, inputRatePer1k);

    let outputTokensThisTurn = safeReferenceOutputTokens;
    if (outputSizing === 'costShare') {
      const outputShareDenominator = 1 - safeTargetOutputSharePct;
      if (
        billableInputCostThisTurn !== null &&
        isFiniteNumber(outputRatePer1k) &&
        outputRatePer1k > 0 &&
        outputShareDenominator > 0
      ) {
        const targetOutputCostThisTurn =
          billableInputCostThisTurn * (safeTargetOutputSharePct / outputShareDenominator);
        outputTokensThisTurn = roundToTokenStep(targetOutputCostThisTurn / (outputRatePer1k / 1000));
      } else if (outputShareDenominator <= 0) {
        outputTokensThisTurn = safeOutputLimit;
      }
    }

    outputTokensThisTurn = clampOutputTokens(outputTokensThisTurn, safeOutputLimit);

    freshInputTokens += freshInputThisTurn;
    reusedContextTokens += reusedThisTurn;
    cachedInputTokens += cachedBilledThisTurn;
    turnInputTokens += billableInputThisTurn;
    turnOutputTokens += outputTokensThisTurn;
    processedInputTokens += reusedThisTurn + newPrefixTokens;

    cachedPrefixTokens += newPrefixTokens;
    pendingTokens = outputTokensThisTurn;

    // Compaction: a real LLM summarization call
    //   Input tokens = history being summarized (+ overhead)
    //   Output tokens = generated summary
    // Compacting rewrites the prefix, so the prompt cache is invalidated. It
    // prepares context for the NEXT turn, so it never runs after the final one.
    if (safeContextWindow > 0 && turn < safeTurns - 1) {
      const thresholdTokens = Math.max(1, Math.floor(safeContextWindow * safeCompactionThresholdPct));
      let safety = 0;

      while (cachedPrefixTokens + pendingTokens > 0 && safety < 8) {
        const historyTokens = cachedPrefixTokens + pendingTokens;
        const projectedContext = historyTokens + safePromptTokens + safeTurnOverheadTokens;
        if (projectedContext <= thresholdTokens) break;

        // Summarization call: cached history reads at the discounted rate,
        // pending tokens at full price; the summary is regular output.
        const compactionBilledInput =
          cachedPrefixTokens * safeCachedInputBillablePct + pendingTokens + safeTurnOverheadTokens;
        let summaryTokens = Math.max(
          safeCompactionSummaryFloorTokens,
          Math.ceil(historyTokens * safeCompactionRetentionPct)
        );
        summaryTokens = Math.min(summaryTokens, historyTokens);
        summaryTokens = clampOutputTokens(roundToTokenStep(summaryTokens), safeOutputLimit);
        summaryTokens = Math.min(summaryTokens, historyTokens);

        if (summaryTokens >= historyTokens) break;

        compactionInputTokens += compactionBilledInput;
        compactionOutputTokens += summaryTokens;
        processedInputTokens += historyTokens + safeTurnOverheadTokens;
        compactionCount += 1;
        cachedPrefixTokens = 0;
        pendingTokens = summaryTokens;
        safety += 1;

        // If even a maximally compacted history cannot fit under the
        // threshold (the prompt alone exceeds it), a real harness would run
        // over-threshold rather than bill futile re-summarizations.
        if (pendingTokens + safePromptTokens + safeTurnOverheadTokens > thresholdTokens) break;
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
    outputSizing,
    turns: safeTurns,
    freshInputTokens,
    reusedContextTokens,
    cachedInputTokens,
    turnInputTokens,
    turnOutputTokens,
    processedInputTokens,
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
    targetOutputCostSharePct: outputSizing === 'costShare' ? safeTargetOutputSharePct * 100 : null,
    achievedOutputCostSharePct,
    inputSharePct,
    cachedInputBillablePct: safeCachedInputBillablePct * 100,
    cacheWriteMultiplier: safeCacheWriteMultiplier,
    compactionThresholdPct: safeCompactionThresholdPct * 100,
    compactionRetentionPct: safeCompactionRetentionPct * 100,
  };
}
