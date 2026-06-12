import { resolveModelTokenProfile, TokenLimitConfidence } from './modelTokenLimits';

export type PricingEntry = {
  pricing: {
    input: number;
    output: number;
    inputCacheRead?: number;
    inputCacheWrite?: number;
  };
  co2eFactor: number;
  avgOutputTokens?: number;
  maxOutputTokens?: number;
  contextWindowTokens?: number;
  outputTokenLimitSource?: string;
  outputTokenLimitConfidence?: TokenLimitConfidence;
};

export type PricingMap = Record<string, PricingEntry>;

const MILLION_TO_THOUSAND_RATIO = 1000;
const BASE_CO2E_FACTOR = 0.0002;
const MAX_CO2E_MULTIPLIER = 1.5;
const MIN_BILLABLE_RATE = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function splitProviderAndModel(name: string) {
  const separatorIndex = name.indexOf(':');
  if (separatorIndex < 0) {
    return { provider: 'unknown', model: name };
  }

  return {
    provider: name.slice(0, separatorIndex).trim().toLowerCase(),
    model: name.slice(separatorIndex + 1).trim(),
  };
}

function normalizeModelNameForDedupe(name: string) {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeKeyForModel(name: string) {
  const { provider, model } = splitProviderAndModel(name);
  return `${provider}|${normalizeModelNameForDedupe(model)}`;
}

function readPath(fields: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, fields);
}

function parseNumberLike(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;

  const normalized = value.trim().toLowerCase().replace(/[$,]/g, '');
  const match = normalized.match(/^(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([kmb])?$/);
  if (!match) return NaN;

  const [, rawNumber, suffix] = match;
  const multiplier = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : suffix === 'b' ? 1_000_000_000 : 1;
  return Number(rawNumber) * multiplier;
}

function readFirstNumber(fields: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = parseNumberLike(readPath(fields, path));
    if (Number.isFinite(value)) return value;
  }

  return NaN;
}

function readPerMillionPrice(fields: Record<string, unknown>, perMillionPaths: string[], perTokenPaths: string[]) {
  const perMillion = readFirstNumber(fields, perMillionPaths);
  if (Number.isFinite(perMillion)) return perMillion;

  const perToken = readFirstNumber(fields, perTokenPaths);
  return Number.isFinite(perToken) ? perToken * 1_000_000 : NaN;
}

function toPer1k(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return NaN;
  return raw / MILLION_TO_THOUSAND_RATIO;
}

// Cache rates may legitimately be zero (a provider offering free cache reads),
// so unlike base prices they are only rejected when negative or non-finite.
function toCacheRatePer1k(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return NaN;
  return raw / MILLION_TO_THOUSAND_RATIO;
}

function readCacheRatePer1k(fields: Record<string, unknown>, perMillionPaths: string[], perTokenPaths: string[]) {
  return toCacheRatePer1k(readPerMillionPrice(fields, perMillionPaths, perTokenPaths));
}

type RowShape = {
  name: string;
  dedupeKey: string;
  hasQualifier: boolean;
  perMillionIn: number;
  perMillionOut: number;
  blended: number;
  maxOutputTokens: number;
  contextWindowTokens?: number;
  outputTokenLimitSource: string;
  outputTokenLimitConfidence: TokenLimitConfidence;
  inputCacheRead?: number;
  inputCacheWrite?: number;
};

function isPreferredModelRow(a: RowShape, b: RowShape) {
  if (a.hasQualifier !== b.hasQualifier) {
    return !a.hasQualifier;
  }

  const aContextWindow = a.contextWindowTokens ?? 0;
  const bContextWindow = b.contextWindowTokens ?? 0;
  if (aContextWindow !== bContextWindow) {
    return aContextWindow > bContextWindow;
  }

  if (a.maxOutputTokens !== b.maxOutputTokens) {
    return a.maxOutputTokens > b.maxOutputTokens;
  }

  if (a.perMillionIn !== b.perMillionIn) {
    return a.perMillionIn < b.perMillionIn;
  }

  return a.name.length < b.name.length;
}

function hasSameOffering(a: RowShape, b: RowShape) {
  return (
    a.perMillionIn === b.perMillionIn &&
    a.perMillionOut === b.perMillionOut &&
    (a.contextWindowTokens ?? 0) === (b.contextWindowTokens ?? 0)
  );
}

export function buildPricingMap(data: unknown[]): PricingMap {
  const rows: RowShape[] = [];

  for (const row of data) {
    if (!isRecord(row)) continue;

    const name = typeof row.name === 'string' ? row.name : null;
    const pricing = isRecord(row.pricing) ? row.pricing : {};
    if (!name) continue;

    const fields = { ...row, ...pricing };
    const perMillionIn = readPerMillionPrice(
      fields,
      ['price_1m_input_tokens', 'pricing.price_1m_input_tokens', 'openrouter.price_1m_input_tokens', 'openrouter.pricing.price_1m_input_tokens', 'openrouter_data.pricing.price_1m_input_tokens', 'open_router.pricing.price_1m_input_tokens', 'metadata.pricing.price_1m_input_tokens'],
      ['pricing.prompt', 'prompt', 'openrouter.pricing.prompt', 'openrouter.prompt', 'openrouter_data.pricing.prompt', 'open_router.pricing.prompt', 'metadata.pricing.prompt']
    );
    const perMillionOut = readPerMillionPrice(
      fields,
      ['price_1m_output_tokens', 'pricing.price_1m_output_tokens', 'openrouter.price_1m_output_tokens', 'openrouter.pricing.price_1m_output_tokens', 'openrouter_data.pricing.price_1m_output_tokens', 'open_router.pricing.price_1m_output_tokens', 'metadata.pricing.price_1m_output_tokens'],
      ['pricing.completion', 'completion', 'openrouter.pricing.completion', 'openrouter.completion', 'openrouter_data.pricing.completion', 'open_router.pricing.completion', 'metadata.pricing.completion']
    );
    // Per-million keys must be explicit `price_1m_*` fields. OpenRouter's raw
    // `pricing.input_cache_read` / `input_cache_write` are per-token dollar
    // values and must only ever be read through the per-token path list;
    // classifying them as per-million silently shrinks cache rates by 10^6.
    const inputCacheRead = readCacheRatePer1k(
      fields,
      ['price_1m_input_cache_read', 'pricing.price_1m_input_cache_read', 'openrouter.pricing.price_1m_input_cache_read', 'open_router.pricing.price_1m_input_cache_read', 'metadata.pricing.price_1m_input_cache_read'],
      ['pricing.input_cache_read', 'input_cache_read', 'openrouter.pricing.input_cache_read', 'openrouter.input_cache_read', 'open_router.pricing.input_cache_read', 'open_router.input_cache_read', 'metadata.input_cache_read']
    );
    const inputCacheWrite = readCacheRatePer1k(
      fields,
      ['price_1m_input_cache_write', 'pricing.price_1m_input_cache_write', 'openrouter.pricing.price_1m_input_cache_write', 'open_router.pricing.price_1m_input_cache_write', 'metadata.pricing.price_1m_input_cache_write'],
      ['pricing.input_cache_write', 'input_cache_write', 'openrouter.pricing.input_cache_write', 'openrouter.input_cache_write', 'open_router.pricing.input_cache_write', 'open_router.input_cache_write', 'metadata.input_cache_write']
    );
    const blended = readFirstNumber(fields, [
      'price_1m_blended_3_to_1',
      'pricing.price_1m_blended_3_to_1',
      'openrouter.price_1m_blended_3_to_1',
      'openrouter.pricing.price_1m_blended_3_to_1',
      'openrouter_data.pricing.price_1m_blended_3_to_1',
      'open_router.pricing.price_1m_blended_3_to_1',
      'metadata.pricing.price_1m_blended_3_to_1',
    ]);
    const tokenProfile = resolveModelTokenProfile(name, fields);
    const hasIn = isFinite(perMillionIn);
    const hasOut = isFinite(perMillionOut);
    const hasBlended = isFinite(blended);

    if (!hasIn && !hasOut && !hasBlended) {
      continue;
    }

    if (!hasIn || perMillionIn <= MIN_BILLABLE_RATE || !hasOut || perMillionOut <= MIN_BILLABLE_RATE) {
      continue;
    }

    rows.push({
      name,
      dedupeKey: dedupeKeyForModel(name),
      hasQualifier: /\([^)]*\)/.test(name),
      perMillionIn,
      perMillionOut,
      blended,
      maxOutputTokens: tokenProfile.maxOutputTokens,
      contextWindowTokens: tokenProfile.contextWindowTokens,
      outputTokenLimitSource: tokenProfile.source,
      outputTokenLimitConfidence: tokenProfile.confidence,
      inputCacheRead: inputCacheRead,
      inputCacheWrite: inputCacheWrite,
    });
  }

  const priceValues: number[] = rows
    .map(r => (isFinite(r.blended) && r.blended > 0 ? r.blended : r.perMillionIn))
    .filter(v => isFinite(v) && v > 0);

  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
  const logMin = minPrice > 0 ? Math.log(minPrice) : 0;
  const logMax = maxPrice > 0 ? Math.log(maxPrice) : 0;

  // Collapse only true duplicates (same price and context window). Qualified
  // variants that are genuinely different offerings (dated snapshots, (Fast)
  // tiers, (extended) listings) keep their own entry so the prices shown
  // match the variant a user would actually call.
  const dedupedRows = new Map<string, RowShape>();

  for (const row of rows) {
    const existing = dedupedRows.get(row.dedupeKey);
    if (!existing) {
      dedupedRows.set(row.dedupeKey, row);
    } else if (hasSameOffering(row, existing)) {
      if (isPreferredModelRow(row, existing)) {
        dedupedRows.set(row.dedupeKey, row);
      }
    } else {
      dedupedRows.set(row.name, row);
    }
  }

  const result: PricingMap = {};

  for (const row of dedupedRows.values()) {
    const input = isFinite(row.perMillionIn)
      ? row.perMillionIn / MILLION_TO_THOUSAND_RATIO
      : NaN;
    const output = isFinite(row.perMillionOut)
      ? row.perMillionOut / MILLION_TO_THOUSAND_RATIO
      : NaN;

    const reference = isFinite(row.blended) && row.blended > 0 ? row.blended : row.perMillionIn;
    let multiplier = 1;

    if (logMax > logMin && isFinite(reference) && reference > 0) {
      const ln = Math.log(reference);
      const normalized = Math.min(1, Math.max(0, (ln - logMin) / (logMax - logMin)));
      multiplier = 1 + (MAX_CO2E_MULTIPLIER - 1) * normalized;
    }

    result[row.name] = {
      pricing: {
        input,
        output,
        ...(Number.isFinite(row.inputCacheRead) ? { inputCacheRead: row.inputCacheRead } : {}),
        ...(Number.isFinite(row.inputCacheWrite) ? { inputCacheWrite: row.inputCacheWrite } : {}),
      },
      co2eFactor: BASE_CO2E_FACTOR * multiplier,
      avgOutputTokens: row.maxOutputTokens,
      maxOutputTokens: row.maxOutputTokens,
      contextWindowTokens: row.contextWindowTokens,
      outputTokenLimitSource: row.outputTokenLimitSource,
      outputTokenLimitConfidence: row.outputTokenLimitConfidence,
    };
  }

  return result;
}
