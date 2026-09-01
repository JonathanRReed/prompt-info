import { afterEach, describe, expect, test } from 'bun:test';
import { GET as getBenchmarkCatalog } from '../app/api/benchmarks/route';
import { GET as getPricingCatalog } from '../app/api/pricing/route';
import { onRequestGet as getBenchmarkCatalogFromCloudflare } from '../functions/api/benchmarks';
import { onRequestGet as getPricingCatalogFromCloudflare } from '../functions/api/pricing';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('catalog API adapters', () => {
  test('Next and Cloudflare pricing adapters share the same fallback schema and caching contract', async () => {
    globalThis.fetch = (async () => new Response('unavailable', { status: 503 })) as unknown as typeof fetch;

    const nextResponse = await getPricingCatalog();
    const cloudflareResponse = await getPricingCatalogFromCloudflare({ env: {} });
    const nextBody = await nextResponse.json();
    const cloudflareBody = await cloudflareResponse.json();

    expect(nextResponse.status).toBe(200);
    expect(cloudflareResponse.status).toBe(200);
    expect(nextBody).toMatchObject({
      schemaVersion: 1,
      source: 'bundled-static',
      freshness: 'static',
      isFallback: true,
    });
    expect(cloudflareBody).toMatchObject({
      schemaVersion: 1,
      source: 'bundled-static',
      freshness: 'static',
      isFallback: true,
    });
    expect(cloudflareResponse.headers.get('cache-control')).toBe(nextResponse.headers.get('cache-control'));
  });

  test('Next and Cloudflare benchmark adapters share the same fallback schema and caching contract', async () => {
    const nextResponse = await getBenchmarkCatalog();
    const cloudflareResponse = await getBenchmarkCatalogFromCloudflare({ env: {} });
    const nextBody = await nextResponse.json();
    const cloudflareBody = await cloudflareResponse.json();

    expect(nextBody).toMatchObject({ schemaVersion: 1, source: 'dated-fallback', freshness: 'static' });
    expect(cloudflareBody).toMatchObject({ schemaVersion: 1, source: 'dated-fallback', freshness: 'static' });
    expect(cloudflareResponse.headers.get('cache-control')).toBe(nextResponse.headers.get('cache-control'));
  });
});
