import { fetchJsonWithTimeout, isCatalogEnvelope } from './catalogContract';
import { isPricingMap, type PricingCatalogResponse } from './pricingCatalog';

export type { PricingEntry, PricingMap } from './pricingParser';
export type { PricingCatalogResponse } from './pricingCatalog';

// The Pages function bounds each upstream call at 6s and may try two sources,
// so the browser waits a little longer than that before using bundled data.
// Without a client bound, a stalled edge request left the calculator on
// "checking model rates" forever with no models to pick.
export const CLIENT_PRICING_TIMEOUT_MS = 15_000;

type FetchPricingOptions = { timeoutMs?: number };

export async function fetchPricing({ timeoutMs = CLIENT_PRICING_TIMEOUT_MS }: FetchPricingOptions = {}): Promise<PricingCatalogResponse> {
  for (const endpoint of ['/api/pricing', '/api/pricing/']) {
    const result = await fetchJsonWithTimeout(
      (input, init) => fetch(input, init),
      endpoint,
      { headers: { Accept: 'application/json' }, cache: 'no-store' },
      timeoutMs,
    );
    if (result.ok && isCatalogEnvelope(result.body, isPricingMap)) {
      return result.body as PricingCatalogResponse;
    }
  }

  throw new Error('Pricing catalog is unavailable');
}
