import { supabase } from './supabaseClient';
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
const QUERY_LIMIT = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(fields: Record<string, unknown>, key: string) {
  const value = Number(fields[key]);
  return Number.isFinite(value) ? value : NaN;
}

export async function fetchPricing(): Promise<PricingMap> {
  const { data, error } = await supabase
    .from('aa_models')
    .select('*')
    .not('pricing', 'is', null)
    .limit(QUERY_LIMIT);

  if (error) {
    console.error('Error fetching pricing from Supabase:', error);
    return {};
  }

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
  
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name : null;
    const pricing = isRecord(record.pricing) ? record.pricing : {};
    if (!name) continue;
    
    const fields = { ...record, ...pricing };
    const perMillionIn = readNumber(fields, 'price_1m_input_tokens');
    const perMillionOut = readNumber(fields, 'price_1m_output_tokens');
    const blended = readNumber(fields, 'price_1m_blended_3_to_1');
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

  // Compute min/max using blended price if available, else fall back to input price
  const priceValues: number[] = rows
    .map(r => (isFinite(r.blended) && r.blended > 0 ? r.blended : r.perMillionIn))
    .filter(v => isFinite(v) && v > 0);

  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
  const logMin = minPrice > 0 ? Math.log(minPrice) : 0;
  const logMax = maxPrice > 0 ? Math.log(maxPrice) : 0;

  const result: PricingMap = {};
  
  for (const r of rows) {
    const input = isFinite(r.perMillionIn) 
      ? r.perMillionIn / MILLION_TO_THOUSAND_RATIO 
      : NaN;
    const output = isFinite(r.perMillionOut) 
      ? r.perMillionOut / MILLION_TO_THOUSAND_RATIO 
      : NaN;

    const reference = isFinite(r.blended) && r.blended > 0 ? r.blended : r.perMillionIn;
    let multiplier = 1;
    
    if (logMax > logMin && isFinite(reference) && reference > 0) {
      const ln = Math.log(reference);
      const normalized = Math.min(1, Math.max(0, (ln - logMin) / (logMax - logMin)));
      multiplier = 1 + (MAX_CO2E_MULTIPLIER - 1) * normalized;
    }
    
    const co2eFactor = BASE_CO2E_FACTOR * multiplier;

    result[r.name] = {
      pricing: { input, output },
      co2eFactor,
      avgOutputTokens: r.maxOutputTokens,
      maxOutputTokens: r.maxOutputTokens,
      contextWindowTokens: r.contextWindowTokens,
      outputTokenLimitSource: r.outputTokenLimitSource,
      outputTokenLimitConfidence: r.outputTokenLimitConfidence,
    };
  }

  return result;
}
