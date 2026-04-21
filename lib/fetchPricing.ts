export type { PricingEntry, PricingMap } from './pricingParser';
import type { PricingMap } from './pricingParser';

export async function fetchPricing(): Promise<PricingMap> {
  const response = await fetch('/api/pricing', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return {};
  }

  return response.json() as Promise<PricingMap>;
}
