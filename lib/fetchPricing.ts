import { fetchJsonWithTimeout, isCatalogEnvelope } from './catalogContract';
import { isPricingMap, BUNDLED_PRICING_SNAPSHOT_AT, type PricingCatalogResponse } from './pricingCatalog';

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

  const fallback = await fetchJsonWithTimeout((input, init) => fetch(input, init), '/data/llm-data.json', {headers:{Accept:'application/json'}}, timeoutMs);
  if (fallback.ok && isPricingMap(fallback.body)) return {
    schemaVersion:1,data:fallback.body,source:'bundled-static',sourceUrl:'https://prompt-info.helloworldfirm.com/data/llm-data.json',retrievedAt:BUNDLED_PRICING_SNAPSHOT_AT,freshness:'static',isFallback:true,fallbackReason:'The pricing API was unavailable. Using the bundled dated catalog.',
  };
  throw new Error('Pricing catalog is unavailable');
}
