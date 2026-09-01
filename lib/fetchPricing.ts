import { isCatalogEnvelope } from './catalogContract';
import { isPricingMap, type PricingCatalogResponse } from './pricingCatalog';

export type { PricingEntry, PricingMap } from './pricingParser';
export type { PricingCatalogResponse } from './pricingCatalog';

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function fetchPricing(): Promise<PricingCatalogResponse> {
  for (const endpoint of ['/api/pricing', '/api/pricing/']) {
    const body = await fetchJson(endpoint);
    if (isCatalogEnvelope(body, isPricingMap)) {
      return body as PricingCatalogResponse;
    }
  }

  throw new Error('Pricing catalog is unavailable');
}
