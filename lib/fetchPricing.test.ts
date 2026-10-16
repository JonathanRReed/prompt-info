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
    expect(requests).toEqual(['/api/pricing', '/api/pricing/', '/data/llm-data.json']);
    expect(requests.every(url => url.startsWith('/'))).toBe(true);
  });

  test('rejects a malformed same-origin payload instead of treating it as current data', async () => {
    globalThis.fetch = (async () => Response.json({ data: catalog.data })) as unknown as typeof fetch;

    await expect(fetchPricing()).rejects.toThrow('Pricing catalog is unavailable');
  });
});

describe('fetchPricing timeouts', () => {
  test('gives up on a same-origin request that never answers so the bundled fallback can load', async () => {
    const aborted: string[] = [];
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => {
        aborted.push(String(input));
        reject(new DOMException('aborted', 'AbortError'));
      });
    })) as typeof fetch;

    const started = Date.now();
    await expect(fetchPricing({ timeoutMs: 25 })).rejects.toThrow('Pricing catalog is unavailable');
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(aborted).toEqual(['/api/pricing', '/api/pricing/', '/data/llm-data.json']);
  });

  test('treats an unparseable body as unavailable and still tries the slash variant', async () => {
    const requests: string[] = [];
    globalThis.fetch = (async input => {
      requests.push(String(input));
      return new Response('{not json', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await expect(fetchPricing()).rejects.toThrow('Pricing catalog is unavailable');
    expect(requests).toEqual(['/api/pricing', '/api/pricing/', '/data/llm-data.json']);
  });
});


test('all calculator paths get a dated fallback after API failure',async()=>{
  globalThis.fetch=(async input=>String(input)==='/data/llm-data.json' ? Response.json(catalog.data) : new Response('offline',{status:503})) as typeof fetch;
  const result=await fetchPricing();
  expect(result.source).toBe('bundled-static');expect(result.freshness).toBe('static');expect(result.isFallback).toBe(true);expect(result.data).toEqual(catalog.data);
});
