import { afterEach, describe, expect, test } from 'bun:test';
import { fetchBenchmarkCatalog } from './fetchBenchmarks';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const envelope = {
  schemaVersion: 1,
  source: 'dated-fallback',
  sourceUrl: 'https://artificialanalysis.ai/data-api/docs',
  intelligenceIndexVersion: null,
  retrievedAt: '2026-08-29T12:00:00.000Z',
  freshness: 'static',
  isFallback: true,
  fallbackReason: 'Artificial Analysis API is not configured.',
  attribution: { name: 'Artificial Analysis', url: 'https://artificialanalysis.ai/', apiDocs: 'https://artificialanalysis.ai/data-api/docs' },
  limitations: 'Dated fallback.',
  data: [{
    id: 'm1', name: 'Model One', displayName: 'Lab: Model One', slug: 'model-one', creator: 'Lab',
    intelligenceIndex: 50, inputPerMillion: 1, outputPerMillion: null, benchmarkCostPerTask: 'n/a', lastSeen: '2026-08-29',
  }],
};

describe('fetchBenchmarkCatalog', () => {
  test('keeps provenance and leaves missing or malformed numbers as not reported, never zero', async () => {
    globalThis.fetch = (async () => Response.json(envelope)) as unknown as typeof fetch;
    const catalog = await fetchBenchmarkCatalog();
    expect(catalog.source).toBe('dated-fallback');
    expect(catalog.freshness).toBe('static');
    expect(catalog.data).toHaveLength(1);
    expect(catalog.data[0]).toMatchObject({ inputPerMillion: 1, outputPerMillion: null, benchmarkCostPerTask: null, cacheReadPerMillion: null });
  });

  test('rejects a 200 response without the catalog envelope instead of handing it to the page', async () => {
    globalThis.fetch = (async () => Response.json({ hello: 1 })) as unknown as typeof fetch;
    await expect(fetchBenchmarkCatalog()).rejects.toThrow('Benchmark catalog is unavailable');
  });

  test('rejects an envelope whose rows are all unusable', async () => {
    globalThis.fetch = (async () => Response.json({ ...envelope, data: [{ id: 3 }, null] })) as unknown as typeof fetch;
    await expect(fetchBenchmarkCatalog()).rejects.toThrow('no usable models');
  });

  test('times out a request that never answers', async () => {
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })) as typeof fetch;
    await expect(fetchBenchmarkCatalog({ timeoutMs: 25 })).rejects.toThrow('Benchmark catalog is unavailable');
  });
});
