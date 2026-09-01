const DEFAULT_MODEL_PREFERENCES = [
  /openai:\s*gpt-5\.6\s+sol/i,
  /anthropic:\s*claude\s+sonnet\s+5/i,
  /google:\s*gemini\s+3\.7\s+flash/i,
  /openai:\s*gpt-5\.5/i,
  /anthropic:\s*claude.*sonnet/i,
  /google:\s*gemini.*flash/i,
  /moonshot:\s*kimi/i,
  /xai:\s*grok/i,
  /deepseek:/i,
];

import type { PricingMap } from './pricingParser';

function hasUsablePricing(model: string, pricing: PricingMap) {
  const entry = pricing[model];
  return Boolean(
    entry
    && Number.isFinite(entry.pricing.input)
    && entry.pricing.input > 0
    && Number.isFinite(entry.pricing.output)
    && entry.pricing.output > 0,
  );
}

function providerOf(model: string) {
  return model.split(':', 1)[0]?.trim().toLowerCase() ?? '';
}

export function chooseDefaultModel(models: string[]) {
  for (const preference of DEFAULT_MODEL_PREFERENCES) {
    const match = models.find(model => preference.test(model));
    if (match) return match;
  }

  return models[0] ?? '';
}

export function chooseDefaultModels(models: string[], pricing: PricingMap, requestedCount = 2) {
  // Keep the default browse cohort useful without turning the menu into a
  // random dump of the provider catalog. Callers can still search every row.
  const count = Math.min(12, Math.max(1, Math.floor(requestedCount)));
  const usable = models.filter(model => hasUsablePricing(model, pricing));
  const selected: string[] = [];

  for (const preference of DEFAULT_MODEL_PREFERENCES) {
    const match = usable.find(model => !selected.includes(model) && preference.test(model));
    if (match) selected.push(match);
    if (selected.length === count) return selected;
  }

  const selectedProviders = new Set(selected.map(providerOf));
  for (const model of usable) {
    if (selected.includes(model) || selectedProviders.has(providerOf(model))) continue;
    selected.push(model);
    selectedProviders.add(providerOf(model));
    if (selected.length === count) return selected;
  }

  for (const model of usable) {
    if (!selected.includes(model)) selected.push(model);
    if (selected.length === count) break;
  }

  return selected;
}
