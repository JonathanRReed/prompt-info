import { supabase } from './supabaseClient';

export type PricingEntry = {
  pricing: {
    input: number; // price per 1k tokens (matches UI logic)
    output: number; // price per 1k tokens
  };
  co2eFactor: number; // gCO2e per token
  avgOutputTokens?: number; // estimated max output tokens for cost split
};

export type PricingMap = Record<string, PricingEntry>;

// Fetch pricing from Supabase and convert to the shape the UI expects.
// aa_models.pricing stores prices per 1M tokens; we convert to per-token.
export async function fetchPricing(): Promise<PricingMap> {
  const { data, error } = await supabase
    .from('aa_models')
    .select('name, pricing')
    .not('pricing', 'is', null)
    .limit(1000);

  if (error) {
    console.error('Error fetching pricing from Supabase:', error);
    return {};
  }

  // First pass: gather price references to compute relative scale
  type RowShape = { name: string; perMillionIn: number; perMillionOut: number; blended: number; estMaxOut: number };
  const rows: RowShape[] = [];
  for (const row of data ?? []) {
    const name: string | null = (row as any).name ?? null;
    const pricing = (row as any).pricing ?? null;
    if (!name || !pricing) continue;
    const perMillionIn = Number(pricing.price_1m_input_tokens);
    const perMillionOut = Number(pricing.price_1m_output_tokens);
    const blended = Number(pricing.price_1m_blended_3_to_1);
    // Attempt to derive an estimated max output tokens from pricing JSON if present
    const rawMax = Number(
      pricing.max_output_tokens ??
      pricing.max_output_length ??
      pricing.context_window ??
      pricing.context_length ??
      pricing.output_tokens_max
    );
    const estMaxOut = isFinite(rawMax) && rawMax > 0 ? Math.floor(rawMax) : 4096; // sensible default
    rows.push({ name, perMillionIn, perMillionOut, blended, estMaxOut });
  }

  // Compute min/max using blended price if available, else fall back to input price
  const priceValues: number[] = rows
    .map(r => (isFinite(r.blended) && r.blended > 0 ? r.blended : r.perMillionIn))
    .filter(v => isFinite(v) && v > 0);

  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
  const spread = maxPrice - minPrice;
  // Log-space boundaries to reduce outlier sensitivity
  const logMin = minPrice > 0 ? Math.log(minPrice) : 0;
  const logMax = maxPrice > 0 ? Math.log(maxPrice) : 0;

  const result: PricingMap = {};
  for (const r of rows) {
    // Convert per 1M to per 1k tokens to match UI logic (tokens/1000 * input)
    const input = isFinite(r.perMillionIn) ? r.perMillionIn / 1_000 : NaN;
    const output = isFinite(r.perMillionOut) ? r.perMillionOut / 1_000 : NaN;

    // Base factor and scaling: make expensive models "a little bit higher"
    // Reference: HF Open LLM Leaderboard emissions analysis describes emissions depending on runtime and hardware
    // https://huggingface.co/blog/leaderboard-emissions-analysis
    const baseFactor = 0.0002; // gCO2e per token baseline (heuristic)
    const reference = isFinite(r.blended) && r.blended > 0 ? r.blended : r.perMillionIn;
    let multiplier = 1;
    if (logMax > logMin && isFinite(reference) && reference > 0) {
      // Log-based normalization (less sensitive to very expensive outliers)
      const ln = Math.log(reference);
      const normalized = Math.min(1, Math.max(0, (ln - logMin) / (logMax - logMin)));
      // Up to +50% for the most expensive models
      multiplier = 1 + 0.5 * normalized;
    }
    const co2eFactor = baseFactor * multiplier;

    result[r.name] = {
      pricing: { input, output },
      co2eFactor,
      avgOutputTokens: r.estMaxOut,
    };
  }

  return result;
}
