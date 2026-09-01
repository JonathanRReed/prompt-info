import { afterEach, describe, expect, test } from 'bun:test';
import { fetchPricing } from './fetchPricing';
import type { PricingCatalogResponse } from './pricingCatalog';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const catalog = {
  schemaVersion: 1,
  data: {
    'OpenAI: GPT-5.6 Sol': {
      pricing: { input: 0.004, output: 0.02 },
      co2eFactor: 0.0002,
    },
  },
  source: 'openrouter-live',
  sourceUrl: 'https://openrouter.ai/api/v1/models',
  retrievedAt: '2026-09-01T18:00:00.000Z',
  freshness: 'live',
  isFallback: false,
  fallbackReason: null,
} satisfies PricingCatalogResponse;

describe('fetchPricing', () => {
  test('returns the validated same-origin catalog with provenance', async () => {
    const requests: string[] = [];
    globalThis.fetch = (async input => {
      requests.push(String(input));
      return Response.json(catalog);
    }) as typeof fetch;

    const result = await fetchPricing();

    expect(result).toEqual(catalog);
    expect(requests).toEqual(['/api/pricing']);
  });

  test('tries the slash variant but never contacts an upstream provider', async () => {
    const requests: string[] = [];
    globalThis.fetch = (async input => {
      requests.push(String(input));
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    await expect(fetchPricing()).rejects.toThrow('Pricing catalog is unavailable');
    expect(requests).toEqual(['/api/pricing', '/api/pricing/']);
    expect(requests.every(url => url.startsWith('/'))).toBe(true);
  });

  test('rejects a malformed same-origin payload instead of treating it as current data', async () => {
    globalThis.fetch = (async () => Response.json({ data: catalog.data })) as unknown as typeof fetch;

    await expect(fetchPricing()).rejects.toThrow('Pricing catalog is unavailable');
  });
});
