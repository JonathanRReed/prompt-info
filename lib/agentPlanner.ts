import type { PricingEntry, LongContextTier } from './pricingParser';

export type AgentPlan = {
  instructionTokens: number;
  taskTokens: number;
  toolTokensPerStep: number;
  visibleOutputTokens: number;
  reasoningTokens: number;
  reasoningLow?: number;
  reasoningHigh?: number;
  reasoningEffort?: string;
  steps: number;
  keepHistory: boolean;
  cacheEnabled: boolean;
  cacheHitPct: number;
  replayReasoning?: boolean;
  retries?: number;
  compactEvery?: number;
  summaryTokens?: number;
  workers?: number;
  stepsLow?: number;
  stepsHigh?: number;
};
export type AgentStep = {
  number: number;
  attempt: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputCost: number;
  visibleOutputCost: number;
  reasoningCost: number;
  totalCost: number;
};
export type AgentEstimate = {
  feasible: boolean;
  warnings: string[];
  steps: AgentStep[];
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  visibleOutputTokens: number;
  reasoningTokens: number;
  inputCost: number | null;
  visibleOutputCost: number | null;
  reasoningCost: number | null;
  totalCost: number | null;
  summaryOutputTokens: number;
  summaryOutputCost: number | null;
  compactions: number;
  ledgerSampled: boolean;
};
const rate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 10_000_000;

// Provider minimums verified against their caching docs on 2026-10-16.
export function cacheMinimum(model: PricingEntry): number | null {
  const id = model.openRouterId ?? '';
  if (id.startsWith('openai/')) return 1024;
  if (/^google\/gemini-(?:[3-9]|[1-9][0-9])/.test(id)) return 4096;
  if (/^google\/gemini-2\.5/.test(id)) return 2048;
  if (/^anthropic\/claude-(?:fable-5|opus-5|sonnet-5\.5|haiku-5\.5)/.test(id))
    return 512;
  if (/^anthropic\/claude-(?:opus-4\.[56]|haiku-4\.5)/.test(id)) return 4096;
  if (/^anthropic\/claude-(?:opus-4\.7|haiku-3\.5)/.test(id)) return 2048;
  if (/^anthropic\/claude-(?:opus-4|sonnet-[45])/.test(id)) return 1024;
  return null;
}

export function usesImplicitGeminiCache(model: PricingEntry) {
  const version = model.openRouterId?.match(
    /^google\/gemini-(\d+(?:\.\d+)?)/,
  )?.[1];
  return version !== undefined && Number(version) >= 2.5;
}

export function requestRates(model: PricingEntry, tokens: number) {
  const pricing = { ...model.pricing };
  const tiers: LongContextTier[] = Array.isArray(pricing.longContextTiers)
    ? pricing.longContextTiers
    : [];
  for (const tier of tiers) {
    if (!tier || !rate(tier.minPromptTokens) || tokens <= tier.minPromptTokens)
      continue;
    for (const key of [
      'input',
      'output',
      'inputCacheRead',
      'inputCacheWrite',
    ] as const) {
      if (rate(tier[key])) pricing[key] = tier[key];
    }
  }
  return pricing;
}

function estimateAgentChunk(
  plan: AgentPlan,
  model: PricingEntry,
): AgentEstimate {
  const result: AgentEstimate = {
    feasible: true,
    warnings: [],
    steps: [],
    summaryOutputTokens: 0,
    summaryOutputCost: 0,
    compactions: 0,
    ledgerSampled: false,
    inputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    visibleOutputTokens: 0,
    reasoningTokens: 0,
    inputCost: 0,
    visibleOutputCost: 0,
    reasoningCost: 0,
    totalCost: 0,
  };
  const invalid = (message: string) => ({
    ...result,
    feasible: false,
    warnings: [message],
    inputCost: null,
    visibleOutputCost: null,
    reasoningCost: null,
    summaryOutputCost: null,
    totalCost: null,
  });
  if (
    ![
      plan.instructionTokens,
      plan.taskTokens,
      plan.toolTokensPerStep,
      plan.visibleOutputTokens,
      plan.reasoningTokens,
    ].every(count) ||
    !Number.isInteger(plan.steps) ||
    plan.steps < 1 ||
    plan.steps > 200 ||
    !rate(plan.cacheHitPct) ||
    plan.cacheHitPct > 100
  )
    return invalid(
      'Enter valid token counts, 1–200 steps and a cache-hit percentage from 0 to 100.',
    );
  if (
    plan.retries !== undefined &&
    (!Number.isInteger(plan.retries) || plan.retries < 0 || plan.retries > 5)
  )
    return invalid('Use 0–5 full-run retries.');
  if (
    (plan.reasoningLow !== undefined &&
      (!count(plan.reasoningLow) ||
        plan.reasoningLow > plan.reasoningTokens)) ||
    (plan.reasoningHigh !== undefined &&
      (!count(plan.reasoningHigh) || plan.reasoningHigh < plan.reasoningTokens))
  )
    return invalid('Thinking scenarios must satisfy low ≤ base ≤ high.');
  if (
    !model?.pricing ||
    !rate(model.pricing.input) ||
    !rate(model.pricing.output)
  )
    return invalid(
      'This model does not have usable published input and output rates.',
    );
  if (
    model.pricing.longContextTiers !== undefined &&
    !Array.isArray(model.pricing.longContextTiers)
  )
    return invalid(
      'Conditional pricing data is malformed. Reload the catalog before estimating.',
    );
  const warn = (message: string, blocking = false) => {
    if (!result.warnings.includes(message)) result.warnings.push(message);
    if (blocking) result.feasible = false;
  };
  if (!rate(model.contextWindowTokens) || model.contextWindowTokens <= 0)
    warn('Context limit is unavailable; plan fit cannot be verified.', true);
  if (!count(model.maxOutputTokens))
    warn('Output limit is unavailable; plan fit cannot be verified.', true);
  if (model.supportsReasoning === false && plan.reasoningTokens > 0)
    warn(
      'The catalog does not list reasoning support for this model. Set the thinking allowance to zero or choose a reasoning model.',
      true,
    );
  if (model.reasoning?.mandatory && plan.reasoningTokens === 0)
    warn(
      'This model requires reasoning. Budget for thinking before treating this as a complete estimate.',
      true,
    );
  const outputTokens = plan.visibleOutputTokens + plan.reasoningTokens;
  if (count(model.maxOutputTokens) && outputTokens > model.maxOutputTokens)
    warn(
      'Planned answer plus thinking exceeds this model’s output limit.',
      true,
    );
  let previousInput = 0;
  let history = plan.instructionTokens + plan.taskTokens;
  for (let i = 0; i < plan.steps; i++) {
    const inputTokens =
      i === 0
        ? history
        : plan.keepHistory
          ? history + plan.toolTokensPerStep
          : plan.instructionTokens + plan.taskTokens + plan.toolTokensPerStep;
    if (
      rate(model.contextWindowTokens) &&
      model.contextWindowTokens > 0 &&
      inputTokens + outputTokens > model.contextWindowTokens
    ) {
      warn(
        'Planned input plus answer and thinking exceeds the context window. Reduce the workload or choose a larger-context model.',
        true,
      );
    }
    const prices = requestRates(model, inputTokens);
    const reusable =
      i === 0
        ? 0
        : plan.keepHistory
          ? previousInput
          : plan.instructionTokens + plan.taskTokens;
    const minimum = cacheMinimum(model);
    const eligible = minimum === null || inputTokens >= minimum;
    const cacheReadTokens =
      plan.cacheEnabled && eligible && (minimum === null || reusable >= minimum)
        ? (reusable * plan.cacheHitPct) / 100
        : 0;
    const implicit = usesImplicitGeminiCache(model);
    const cacheWriteTokens =
      plan.cacheEnabled && eligible && !implicit
        ? inputTokens - cacheReadTokens
        : 0;
    if (plan.cacheEnabled && !eligible)
      warn(
        'Some requests are below this provider’s minimum cache size and use the normal input rate.',
      );
    if (plan.cacheEnabled && minimum === null)
      warn(
        'The catalog does not specify a cache-size minimum for this model. Cache hits are your planning assumption.',
      );
    if (plan.cacheEnabled && implicit)
      warn(
        'Gemini implicit caching is assumed. Fresh input uses the normal rate; explicit cache storage fees are not included.',
      );
    if (
      plan.cacheEnabled &&
      (!rate(prices.inputCacheRead) ||
        (!implicit && !rate(prices.inputCacheWrite)))
    ) {
      warn(
        'Some cache rates are unavailable. Those tokens use the normal input rate; no unknown cache discount is assumed.',
      );
    }
    const inputCost =
      plan.cacheEnabled && eligible
        ? (cacheReadTokens *
            (rate(prices.inputCacheRead)
              ? prices.inputCacheRead
              : prices.input) +
            (inputTokens - cacheReadTokens) *
              (implicit
                ? prices.input
                : rate(prices.inputCacheWrite)
                  ? prices.inputCacheWrite
                  : prices.input)) /
          1000
        : (inputTokens * prices.input) / 1000;
    const visibleOutputCost = (plan.visibleOutputTokens * prices.output) / 1000;
    const reasoningCost = (plan.reasoningTokens * prices.output) / 1000;
    const totalCost = inputCost + visibleOutputCost + reasoningCost;
    if (!Number.isFinite(totalCost))
      return invalid(
        'These rates and assumptions exceed the calculation range.',
      );
    result.steps.push({
      number: i + 1,
      attempt: 1,
      inputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      inputCost,
      visibleOutputCost,
      reasoningCost,
      totalCost,
    });
    result.inputTokens += inputTokens;
    result.cacheReadTokens += cacheReadTokens;
    result.cacheWriteTokens += cacheWriteTokens;
    result.visibleOutputTokens += plan.visibleOutputTokens;
    result.reasoningTokens += plan.reasoningTokens;
    result.inputCost! += inputCost;
    result.visibleOutputCost! += visibleOutputCost;
    result.reasoningCost! += reasoningCost;
    result.totalCost! += totalCost;
    previousInput = inputTokens;
    history =
      inputTokens +
      plan.visibleOutputTokens +
      (plan.replayReasoning ? plan.reasoningTokens : 0);
  }
  const attempts = 1 + (plan.retries ?? 0);
  if (attempts > 1) {
    const firstSteps = result.steps;
    result.steps = Array.from({ length: attempts }, (_, index) =>
      firstSteps.map((step) => ({ ...step, attempt: index + 1 })),
    ).flat();
    for (const key of [
      'inputTokens',
      'cacheReadTokens',
      'cacheWriteTokens',
      'visibleOutputTokens',
      'reasoningTokens',
      'inputCost',
      'visibleOutputCost',
      'reasoningCost',
      'totalCost',
    ] as const)
      result[key]! *= attempts;
  }
  if (
    ![
      result.inputCost,
      result.visibleOutputCost,
      result.reasoningCost,
      result.totalCost,
    ].every((value) => typeof value === 'number' && Number.isFinite(value))
  )
    return invalid('The total exceeds the calculation range.');
  return result;
}

const sumKeys = [
  'inputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
  'visibleOutputTokens',
  'reasoningTokens',
  'inputCost',
  'visibleOutputCost',
  'reasoningCost',
  'totalCost',
  'summaryOutputTokens',
  'summaryOutputCost',
  'compactions',
] as const;

export function estimateAgentRun(
  plan: AgentPlan,
  model: PricingEntry,
): AgentEstimate {
  const workers = plan.workers ?? 1;
  const every = plan.compactEvery;
  const fail = (message: string): AgentEstimate => ({
    ...estimateAgentChunk({ ...plan, steps: 1, retries: 0 }, model),
    feasible: false,
    warnings: [message],
    inputCost: null,
    visibleOutputCost: null,
    reasoningCost: null,
    summaryOutputCost: null,
    totalCost: null,
  });
  if (!Number.isInteger(workers) || workers < 1 || workers > 100)
    return fail('Use 1–100 independent agent streams.');
  if (
    plan.retries !== undefined &&
    (!Number.isInteger(plan.retries) || plan.retries < 0 || plan.retries > 5)
  )
    return fail('Use 0–5 full-task reruns.');
  if (
    every !== undefined &&
    (!Number.isInteger(every) ||
      every < 1 ||
      every > 200 ||
      !count(plan.summaryTokens) ||
      !plan.summaryTokens)
  )
    return fail(
      'Summarize every 1–200 responses and enter a positive summary token allowance.',
    );
  if (!Number.isInteger(plan.steps) || plan.steps < 1 || plan.steps > 1000000)
    return fail('Use 1–1,000,000 model responses.');
  if (every !== undefined && !plan.keepHistory)
    return fail(
      'Context summaries require retained history. Turn off summaries for independent requests.',
    );
  if (every === undefined && plan.steps > 200 && plan.keepHistory)
    return fail(
      'For more than 200 responses, configure periodic context summaries so retained history remains bounded.',
    );
  let result: AgentEstimate;
  if (!plan.keepHistory && plan.steps > 200) {
    const first = estimateAgentChunk({ ...plan, steps: 1, retries: 0 }, model);
    const pair = estimateAgentChunk({ ...plan, steps: 2, retries: 0 }, model);
    result = { ...pair, steps: pair.steps, ledgerSampled: true };
    for (const key of sumKeys) {
      (result[key] as number | null) =
        first[key] === null || pair[key] === null
          ? null
          : first[key]! + (pair[key]! - first[key]!) * (plan.steps - 1);
    }
  } else if (every === undefined || plan.steps <= every) {
    result = estimateAgentChunk({ ...plan, retries: 0 }, model);
  } else {
    const chunk = (steps: number, taskTokens: number) =>
      estimateAgentChunk({ ...plan, steps, taskTokens, retries: 0 }, model);
    result = chunk(every, plan.taskTokens);
    if (result.totalCost === null) return result;
    result.ledgerSampled = true;
    const add = (part: AgentEstimate, repetitions = 1) => {
      if (!repetitions) return;
      result.feasible &&= part.feasible;
      result.warnings = [...new Set([...result.warnings, ...part.warnings])];
      for (const key of sumKeys) {
        if (part[key] === null || result[key] === null)
          (result[key] as number | null) = null;
        else (result[key] as number) += part[key]! * repetitions;
      }
    };
    const summary = (previous: AgentEstimate) => {
      const last = previous.steps.at(-1);
      const input =
        (last?.inputTokens ?? NaN) +
        plan.visibleOutputTokens +
        (plan.replayReasoning ? plan.reasoningTokens : 0);
      // The summary allowance includes all generated tokens, including any thinking.
      const entry = {
        ...model,
        reasoning: model.reasoning
          ? { ...model.reasoning, mandatory: false }
          : undefined,
      };
      const priced = estimateAgentChunk(
        {
          instructionTokens: 0,
          taskTokens: input,
          toolTokensPerStep: 0,
          visibleOutputTokens: plan.summaryTokens!,
          reasoningTokens: 0,
          steps: 1,
          keepHistory: false,
          cacheEnabled: false,
          cacheHitPct: 0,
        },
        entry,
      );
      return {
        ...priced,
        visibleOutputTokens: 0,
        visibleOutputCost: 0,
        summaryOutputTokens: priced.visibleOutputTokens,
        summaryOutputCost: priced.visibleOutputCost,
        compactions: 1,
        warnings: priced.warnings.map(
          (message) => `Context summary: ${message}`,
        ),
      };
    };
    add(summary(result));
    const remaining = plan.steps - every;
    const fullBlocks = Math.floor(remaining / every);
    const remainder = remaining % every;
    const nextTask = plan.summaryTokens! + plan.toolTokensPerStep;
    if (fullBlocks) {
      const steady = chunk(every, nextTask);
      add(steady, fullBlocks);
      add(summary(steady), fullBlocks - (remainder === 0 ? 1 : 0));
    }
    if (remainder) add(chunk(remainder, nextTask));
    result.warnings.push(
      'Periodic summaries are priced as separate uncached model requests. Each summary resets the assumed history cache.',
    );
  }
  const scale = workers * (1 + (plan.retries ?? 0));
  if (scale > 1) {
    for (const key of sumKeys)
      if (result[key] !== null) (result[key] as number) *= scale;
    if (
      !result.ledgerSampled &&
      workers === 1 &&
      result.steps.length * scale <= 200
    ) {
      const first = result.steps;
      result.steps = Array.from({ length: scale }, (_, attempt) =>
        first.map((step) => ({ ...step, attempt: attempt + 1 })),
      ).flat();
    } else result.ledgerSampled = true;
  }
  if (
    sumKeys.some(
      (key) =>
        result[key] !== null &&
        (!Number.isFinite(result[key]) ||
          Math.abs(result[key]!) > Number.MAX_SAFE_INTEGER),
    )
  )
    return fail('This workload exceeds the precise calculation range.');
  return result;
}
