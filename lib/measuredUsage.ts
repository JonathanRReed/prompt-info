import type { PricingEntry } from './pricingParser';
import { requestRates, usesImplicitGeminiCache } from './agentPlanner';

/** Inclusive provider-normalized totals for one request; cache buckets do not overlap. */
export type MeasuredRequest = { input: number; cached: number; written: number; output: number; reasoning: number };
const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 10_000_000;
const rate = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function priceMeasuredUsage(rows: MeasuredRequest[], model: PricingEntry) {
  let inputCost = 0, answerCost = 0, thinkingCost = 0;
  const warnings: string[] = [];
  const invalid = (message: string) => ({ total: null, inputCost: null, answerCost: null, thinkingCost: null, warnings: [message] });
  if (!rows.length || rows.length > 200) return invalid('Enter 1–200 individual requests.');
  if (!model?.pricing || !rate(model.pricing.input) || !rate(model.pricing.output)) return invalid('Published input and output rates are unavailable.');
  if (model.pricing.longContextTiers !== undefined && !Array.isArray(model.pricing.longContextTiers)) return invalid('Conditional pricing data is malformed.');
  for (const row of rows) {
    if (![row.input,row.cached,row.written,row.output,row.reasoning].every(valid) || row.cached + row.written > row.input || row.reasoning > row.output) return invalid('Use whole non-negative token counts. Cache tokens must fit within input; thinking must fit within total output.');
    if (row.written > 0 && usesImplicitGeminiCache(model)) return invalid('Explicit Gemini cache storage needs a duration and storage rate. Use zero cache writes for implicit caching; its new input pays the normal input rate.');
    const prices = requestRates(model, row.input);
    if ((row.cached > 0 && !rate(prices.inputCacheRead)) || (row.written > 0 && !rate(prices.inputCacheWrite))) return invalid('A required cache rate is unavailable for this model. No cache price has been guessed.');
    inputCost += ((row.input - row.cached - row.written) * prices.input + row.cached * (prices.inputCacheRead ?? 0) + row.written * (prices.inputCacheWrite ?? 0)) / 1000;
    answerCost += (row.output - row.reasoning) * prices.output / 1000;
    thinkingCost += row.reasoning * prices.output / 1000;
    if (!rate(model.contextWindowTokens) || !rate(model.maxOutputTokens)) warnings.push('Published context/output limits are incomplete; request fit is unverified.');
    else if (row.input + row.output > model.contextWindowTokens || row.output > model.maxOutputTokens) warnings.push('At least one request exceeds this model’s published context or output limit. Its cost is illustrative.');
    if (model.supportsReasoning === false && row.reasoning > 0) warnings.push('This model does not list reasoning support; equal-token repricing does not establish equivalent behavior.');
  }
  const total = inputCost + answerCost + thinkingCost;
  if (!Number.isFinite(total)) return invalid('The total exceeds the calculation range.');
  return { total, inputCost, answerCost, thinkingCost, warnings: [...new Set(warnings)] };
}
