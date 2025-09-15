export interface PricingCosts {
  input: number | null;
  output: number | null;
}

export interface PricingEntry {
  pricing?: PricingCosts;
  co2eFactor?: number | null;
  avgOutputTokens?: number | null;
  provider?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export type PricingMap = Record<string, PricingEntry>;
