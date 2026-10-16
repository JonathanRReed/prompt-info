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
};
const rate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_000_000;

function requestRates(model: PricingEntry, tokens: number) {
  const pricing = { ...model.pricing };
  const tiers: LongContextTier[] = Array.isArray(pricing.longContextTiers) ? pricing.longContextTiers : [];
  for (const tier of tiers) {
    if (!tier || !rate(tier.minPromptTokens) || tokens <= tier.minPromptTokens) continue;
    for (const key of ['input', 'output', 'inputCacheRead', 'inputCacheWrite'] as const) {
      if (rate(tier[key])) pricing[key] = tier[key];
    }
  }
  return pricing;
}

export function estimateAgentRun(plan: AgentPlan, model: PricingEntry): AgentEstimate {
  const result: AgentEstimate = {
    feasible: true, warnings: [], steps: [], inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
    visibleOutputTokens: 0, reasoningTokens: 0, inputCost: 0, visibleOutputCost: 0, reasoningCost: 0, totalCost: 0,
  };
  const invalid = (message: string) => ({ ...result, feasible: false, warnings: [message], inputCost: null, visibleOutputCost: null, reasoningCost: null, totalCost: null });
  if (![plan.instructionTokens, plan.taskTokens, plan.toolTokensPerStep, plan.visibleOutputTokens, plan.reasoningTokens].every(count)
    || !Number.isInteger(plan.steps) || plan.steps < 1 || plan.steps > 200
    || !rate(plan.cacheHitPct) || plan.cacheHitPct > 100) return invalid('Enter valid token counts, 1–200 steps and a cache-hit percentage from 0 to 100.');
  if (plan.retries !== undefined && (!Number.isInteger(plan.retries) || plan.retries < 0 || plan.retries > 5)) return invalid('Use 0–5 full-run retries.');
  if ((plan.reasoningLow !== undefined && (!count(plan.reasoningLow) || plan.reasoningLow > plan.reasoningTokens)) || (plan.reasoningHigh !== undefined && (!count(plan.reasoningHigh) || plan.reasoningHigh < plan.reasoningTokens))) return invalid('Thinking scenarios must satisfy low ≤ base ≤ high.');
  if (!model?.pricing || !rate(model.pricing.input) || !rate(model.pricing.output)) return invalid('This model does not have usable published input and output rates.');
  if (model.pricing.longContextTiers !== undefined && !Array.isArray(model.pricing.longContextTiers)) return invalid('Conditional pricing data is malformed. Reload the catalog before estimating.');
  const warn = (message: string, blocking = false) => {
    if (!result.warnings.includes(message)) result.warnings.push(message);
    if (blocking) result.feasible = false;
  };
  if (!rate(model.contextWindowTokens) || model.contextWindowTokens <= 0) warn('Context limit is unavailable; plan fit cannot be verified.', true);
  if (!count(model.maxOutputTokens)) warn('Output limit is unavailable; plan fit cannot be verified.', true);
  if (model.supportsReasoning === false && plan.reasoningTokens > 0) warn('The catalog does not list reasoning support for this model. Set the thinking allowance to zero or choose a reasoning model.', true);
  if (model.reasoning?.mandatory && plan.reasoningTokens === 0) warn('This model requires reasoning. Budget for thinking before treating this as a complete estimate.', true);
  const outputTokens = plan.visibleOutputTokens + plan.reasoningTokens;
  if (count(model.maxOutputTokens) && outputTokens > model.maxOutputTokens) warn('Planned answer plus thinking exceeds this model’s output limit.', true);
  let previousInput = 0;
  let history = plan.instructionTokens + plan.taskTokens;
  for (let i = 0; i < plan.steps; i++) {
    const inputTokens = i === 0 ? history : plan.keepHistory
      ? history + plan.toolTokensPerStep
      : plan.instructionTokens + plan.taskTokens + plan.toolTokensPerStep;
    if (rate(model.contextWindowTokens) && model.contextWindowTokens > 0 && inputTokens + outputTokens > model.contextWindowTokens) {
      warn('Planned input plus answer and thinking exceeds the context window. Reduce the workload or choose a larger-context model.', true);
    }
    const prices = requestRates(model, inputTokens);
    const reusable = i === 0 ? 0 : plan.keepHistory ? previousInput : plan.instructionTokens + plan.taskTokens;
    const cacheReadTokens = plan.cacheEnabled ? reusable * plan.cacheHitPct / 100 : 0;
    const cacheWriteTokens = plan.cacheEnabled ? inputTokens - cacheReadTokens : 0;
    if (plan.cacheEnabled && (!rate(prices.inputCacheRead) || !rate(prices.inputCacheWrite))) {
      warn('Some cache rates are unavailable. Those tokens use the normal input rate; no unknown cache discount is assumed.');
    }
    const inputCost = plan.cacheEnabled
      ? (cacheReadTokens * (rate(prices.inputCacheRead) ? prices.inputCacheRead : prices.input) + cacheWriteTokens * (rate(prices.inputCacheWrite) ? prices.inputCacheWrite : prices.input)) / 1000
      : inputTokens * prices.input / 1000;
    const visibleOutputCost = plan.visibleOutputTokens * prices.output / 1000;
    const reasoningCost = plan.reasoningTokens * prices.output / 1000;
    const totalCost = inputCost + visibleOutputCost + reasoningCost;
    if (!Number.isFinite(totalCost)) return invalid('These rates and assumptions exceed the calculation range.');
    result.steps.push({ number: i + 1, attempt: 1, inputTokens, cacheReadTokens, cacheWriteTokens, inputCost, visibleOutputCost, reasoningCost, totalCost });
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
    history = inputTokens + plan.visibleOutputTokens + (plan.replayReasoning ? plan.reasoningTokens : 0);
  }
  const attempts = 1 + (plan.retries ?? 0);
  if (attempts > 1) {
    const firstSteps = result.steps;
    result.steps = Array.from({ length: attempts }, (_, index) => firstSteps.map(step => ({ ...step, attempt: index + 1 }))).flat();
    for (const key of ['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'visibleOutputTokens', 'reasoningTokens', 'inputCost', 'visibleOutputCost', 'reasoningCost', 'totalCost'] as const) result[key]! *= attempts;
  }
  if (![result.inputCost, result.visibleOutputCost, result.reasoningCost, result.totalCost].every(value => typeof value === 'number' && Number.isFinite(value))) return invalid('The total exceeds the calculation range.');
  return result;
}
