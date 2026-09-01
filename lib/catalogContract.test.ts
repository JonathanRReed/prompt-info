import { describe, expect, test } from 'bun:test';
import {
  CATALOG_SCHEMA_VERSION,
  fetchJsonWithTimeout,
  isCatalogEnvelope,
} from './catalogContract';

describe('catalog contract', () => {
  test('accepts a versioned catalog envelope with provenance', () => {
    expect(isCatalogEnvelope({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      data: { example: true },
      source: 'openrouter-live',
      sourceUrl: 'https://openrouter.ai/api/v1/models',
      retrievedAt: '2026-09-01T18:00:00.000Z',
      freshness: 'live',
      isFallback: false,
      fallbackReason: null,
    }, value => typeof value === 'object' && value !== null)).toBe(true);
  });

  test('rejects malformed envelopes and invalid data', () => {
    expect(isCatalogEnvelope({ schemaVersion: 1, data: {} }, (_data): _data is unknown => true)).toBe(false);
    expect(isCatalogEnvelope({
      schemaVersion: 1,
      data: [],
      source: 'test',
      sourceUrl: 'https://example.com',
      retrievedAt: 'not-a-date',
      freshness: 'live',
      isFallback: false,
      fallbackReason: null,
    }, Array.isArray)).toBe(false);
  });

  test('aborts an upstream request at the configured timeout', async () => {
    let observedAbort = false;
    const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        observedAbort = true;
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });

    const result = await fetchJsonWithTimeout(fetcher, 'https://example.com/catalog', {}, 5);

    expect(result).toEqual({ ok: false, reason: 'timeout' });
    expect(observedAbort).toBe(true);
  });
});
