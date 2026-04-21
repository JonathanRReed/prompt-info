import { resolveModelTokenProfile, TokenLimitConfidence } from './modelTokenLimits';

export type PricingEntry = {
  pricing: {
    input: number;
    output: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([kmb])?$/);
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

export function buildPricingMap(data: unknown[]): PricingMap {
  type RowShape = {
    name: string;
    perMillionIn: number;
    perMillionOut: number;
    blended: number;
    maxOutputTokens: number;
    contextWindowTokens?: number;
    outputTokenLimitSource: string;
    outputTokenLimitConfidence: TokenLimitConfidence;
  };

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

    rows.push({
      name,
      perMillionIn,
      perMillionOut,
      blended,
      maxOutputTokens: tokenProfile.maxOutputTokens,
      contextWindowTokens: tokenProfile.contextWindowTokens,
      outputTokenLimitSource: tokenProfile.source,
      outputTokenLimitConfidence: tokenProfile.confidence,
    });
  }

  const priceValues: number[] = rows
    .map(r => (isFinite(r.blended) && r.blended > 0 ? r.blended : r.perMillionIn))
    .filter(v => isFinite(v) && v > 0);

  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
  const logMin = minPrice > 0 ? Math.log(minPrice) : 0;
  const logMax = maxPrice > 0 ? Math.log(maxPrice) : 0;

  const result: PricingMap = {};

  for (const row of rows) {
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
      pricing: { input, output },
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
