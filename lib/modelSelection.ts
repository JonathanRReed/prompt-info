// These are browsing defaults, not a quality ranking. Within a product family,
// natural version order keeps old hard-coded generations from sticking forever.
const DEFAULT_MODEL_PREFERENCES = [
  /openai:\s*gpt-[\d.]+\s+sol(?:\s*\([^)]*\))?$/i,
  /anthropic:\s*claude\s+(?:[\d.]+\s+)?sonnet/i,
  /google:\s*gemini\s+[\d.]+\s+flash(?:\s*\([^)]*\))?$/i,
  /openai:\s*gpt/i,
  /moonshot(?:ai)?:\s*kimi/i,
  /(?:spacex)?xai:\s*grok/i,
  /deepseek:/i,
];

const naturalModelOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

// Plain standard-tier rows first, then moving aliases ("Sonnet Latest"), then
// qualified variants such as "(batch)" or dated snapshots. Natural descending
// order alone ranks "GPT-6.1 Sol (batch)" above "GPT-6.1 Sol" (longer string)
// and "Latest" above "5.5" (letters after digits), so a first-visit estimate
// silently used half-price batch rates or an unversioned alias.
function variantRank(model: string) {
  if (/\([^)]*\)\s*$/.test(model)) return 2;
  if (/\blatest\b/i.test(model)) return 1;
  return 0;
}

function newestFirst(models: string[]) {
  return [...models].sort((a, b) => variantRank(a) - variantRank(b) || naturalModelOrder.compare(b, a));
}

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
  const ordered = newestFirst(models);
  for (const preference of DEFAULT_MODEL_PREFERENCES) {
    const match = ordered.find(model => preference.test(model));
    if (match) return match;
  }

  return models[0] ?? '';
}

export function chooseDefaultModels(models: string[], pricing: PricingMap, requestedCount = 2) {
  // Keep the default browse cohort useful without turning the menu into a
  // random dump of the provider catalog. Callers can still search every row.
  const count = Math.min(12, Math.max(1, Math.floor(requestedCount)));
  const usable = newestFirst(models.filter(model => hasUsablePricing(model, pricing)));
  const selected: string[] = [];
  const selectedProviders = new Set<string>();

  for (const preference of DEFAULT_MODEL_PREFERENCES) {
    const match = usable.find(model => !selectedProviders.has(providerOf(model)) && preference.test(model));
    if (match) { selected.push(match); selectedProviders.add(providerOf(match)); }
    if (selected.length === count) return selected;
  }

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

/**
 * Resolves a model requested through the URL (`?model=openai/gpt-5`, the
 * OpenRouter slug shared with the sibling sites) to a catalog key. Falls back
 * to a normalized provider and model-name match for catalogs without slugs.
 */
export function findRequestedModel(requested: string | null, pricing: PricingMap): string | null {
  if (!requested) return null;
  const wanted = requested.trim().toLowerCase();
  if (!wanted) return null;
  const bySlug = Object.entries(pricing).find(([, entry]) => entry.openRouterId?.toLowerCase() === wanted);
  if (bySlug) return bySlug[0];
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const [provider, ...rest] = wanted.split('/');
  const modelPart = rest.join('/') || wanted;
  const wantedModel = normalize(modelPart);
  const wantedFull = normalize(wanted);
  const byName = Object.keys(pricing).find(model => {
    const normalized = normalize(model);
    return normalized === wantedFull || (normalized.startsWith(normalize(provider)) && normalized.endsWith(wantedModel));
  });
  return byName ?? null;
}

/** The comparison holds at most this many models, however they are added. */
export const MAX_SELECTED_MODELS = 6;

export type ModelSelection = {
  /** The models the user or a link chose, in order, as named; may include ones the catalog lacks. */
  chosen: string[];
  /** The models shown and priced: the available chosen ones, or stand-in defaults when none is available. */
  selected: string[];
  /** The model priced in the receipt; always one of `selected`, or '' when none. */
  active: string;
  /** Chosen models the current catalog lacks, as named. */
  missing: string[];
};

/**
 * Show a selection against a (possibly refreshed) catalog. Available chosen
 * models are shown in chosen order up to the cap; chosen models past the cap
 * are dropped rather than reported absent. Defaults stand in only while no
 * chosen model is available and are never added to `chosen`, so they leave as
 * soon as a chosen model returns.
 */
export function reconcileSelection(
  current: Pick<ModelSelection, 'chosen' | 'active'>,
  resolve: (name: string) => string | null,
  defaults: string[],
): ModelSelection {
  const shown: string[] = [];
  const chosen: string[] = [];
  const missing: string[] = [];
  for (const name of current.chosen) {
    const resolved = resolve(name);
    if (!resolved) {
      if (!missing.includes(name)) {
        missing.push(name);
        chosen.push(name);
      }
    } else if (!shown.includes(resolved) && shown.length < MAX_SELECTED_MODELS) {
      shown.push(resolved);
      chosen.push(resolved);
    }
  }
  const selected = shown.length
    ? shown
    : defaults.filter((name) => resolve(name) === name).slice(0, MAX_SELECTED_MODELS);
  const active = selected.includes(current.active) ? current.active : (selected[0] ?? '');
  return { chosen, selected, active, missing };
}

/**
 * Apply a user edit (adding, removing, replacing or pricing a model). The shown
 * list, stand-ins included, becomes the user's choice; chosen models that are
 * still missing stay chosen after it and return when the catalog has them and
 * the cap allows.
 */
export function chooseSelection(
  current: ModelSelection,
  selected: string[],
  active: string,
): ModelSelection {
  const shown = [...new Set(selected)].slice(0, MAX_SELECTED_MODELS);
  return {
    chosen: [...shown, ...current.missing.filter((name) => !shown.includes(name))],
    selected: shown,
    active: shown.includes(active) ? active : (shown[0] ?? ''),
    missing: current.missing,
  };
}
