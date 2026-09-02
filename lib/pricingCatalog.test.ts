import { describe, expect, test } from 'bun:test';
import { BUNDLED_PRICING_SNAPSHOT_AT, buildPricingCatalogResponse } from './pricingCatalog';

const LIVE_ROW = {
  name: 'OpenAI: GPT-5.6 Sol',
  architecture: { output_modalities: ['text'] },
  context_length: 1_050_000,
  pricing: { prompt: '0.000004', completion: '0.00002' },
};

const CACHED_ROW = {
  id: 'cached-1',
  name: 'Anthropic: Claude Sonnet 5',
  pricing: { price_1m_input_tokens: 3, price_1m_output_tokens: 15 },
};

describe('buildPricingCatalogResponse', () => {
  test('returns validated OpenRouter data with live provenance', async () => {
    const response = await buildPricingCatalogResponse({
      fetcher: async () => Response.json({ data: [LIVE_ROW] }),
      now: () => new Date('2026-09-01T18:00:00.000Z'),
    });

    expect(response).toMatchObject({
      schemaVersion: 1,
      source: 'openrouter-live',
      sourceUrl: 'https://openrouter.ai/api/v1/models',
      retrievedAt: '2026-09-01T18:00:00.000Z',
      freshness: 'live',
      isFallback: false,
      fallbackReason: null,
    });
    expect(response.data['OpenAI: GPT-5.6 Sol']?.pricing).toEqual({
      input: 0.004,
      output: 0.02,
    });
  });

  test('falls back to the Supabase cache and labels the reason', async () => {
    const response = await buildPricingCatalogResponse({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      fetcher: async input => String(input).includes('openrouter.ai')
        ? new Response('unavailable', { status: 503 })
        : Response.json([CACHED_ROW]),
      now: () => new Date('2026-09-01T18:00:00.000Z'),
    });

    expect(response.source).toBe('supabase-cache');
    expect(response.freshness).toBe('cached');
    expect(response.isFallback).toBe(true);
    expect(response.fallbackReason).toContain('OpenRouter');
    expect(response.data['Anthropic: Claude Sonnet 5']).toBeDefined();
  });

  test('uses the bundled static catalog when upstream payloads are invalid', async () => {
    const response = await buildPricingCatalogResponse({
      fetcher: async () => Response.json({ data: [{ name: 'Broken', pricing: {} }] }),
      now: () => new Date('2026-09-01T18:00:00.000Z'),
    });

    expect(response.source).toBe('bundled-static');
    expect(response.retrievedAt).toBe(BUNDLED_PRICING_SNAPSHOT_AT);
    expect(response.freshness).toBe('static');
    expect(response.isFallback).toBe(true);
    expect(response.fallbackReason).toContain('usable');
    expect(Object.keys(response.data).length).toBeGreaterThanOrEqual(3);
  });

  test('never returns invalid or non-text upstream records', async () => {
    const response = await buildPricingCatalogResponse({
      fetcher: async () => Response.json({
        data: [
          null,
          { name: 'Image Model', architecture: { output_modalities: ['image'] }, pricing: { prompt: '0.1', completion: '0.1' } },
          LIVE_ROW,
        ],
      }),
    });

    expect(Object.keys(response.data)).toEqual(['OpenAI: GPT-5.6 Sol']);
  });
});
