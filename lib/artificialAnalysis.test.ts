import { describe, expect, test } from 'bun:test';
import {
  buildArtificialAnalysisCatalogResponse,
  loadArtificialAnalysisCatalog,
  matchArtificialAnalysisModel,
  parseArtificialAnalysisPayload,
} from './artificialAnalysis';

describe('parseArtificialAnalysisPayload', () => {
  test('normalizes the documented free API response including cost per task', () => {
    const models = parseArtificialAnalysisPayload({
      tier: 'free',
      intelligence_index_version: 4.1,
      data: [
        {
          id: 'model-1',
          name: 'Example Reasoner (high)',
          slug: 'example-reasoner-high',
          model_creator: { id: 'creator-1', name: 'Example AI', slug: 'example-ai' },
          evaluations: {
            artificial_analysis_intelligence_index: 52.5,
            artificial_analysis_coding_index: 61.2,
            artificial_analysis_agentic_index: 47.8,
          },
          artificial_analysis_intelligence_index_cost: {
            total_cost: 123.45,
            cost_per_task: { total_cost: 0.42 },
          },
          pricing: {
            price_1m_input_tokens: 2,
            price_1m_output_tokens: 10,
            price_1m_cache_hit_tokens: 0.5,
            price_1m_cache_write_tokens: 2.5,
          },
          performance: {
            median_output_tokens_per_second: 72.4,
            median_time_to_first_token_seconds: 0.8,
            median_time_to_first_answer_token_seconds: 3.1,
          },
        },
      ],
    });

    expect(models).toEqual([
      {
        id: 'model-1',
        name: 'Example Reasoner (high)',
        displayName: 'Example AI: Example Reasoner (high)',
        slug: 'example-reasoner-high',
        creator: 'Example AI',
        intelligenceIndex: 52.5,
        codingIndex: 61.2,
        agenticIndex: 47.8,
        inputPerMillion: 2,
        outputPerMillion: 10,
        cacheReadPerMillion: 0.5,
        cacheWritePerMillion: 2.5,
        benchmarkCostPerTask: 0.42,
        benchmarkTotalCost: 123.45,
        outputTokensPerSecond: 72.4,
        timeToFirstTokenSeconds: 0.8,
        timeToFirstAnswerTokenSeconds: 3.1,
        lastSeen: null,
      },
    ]);
  });

  test('normalizes the existing Supabase cache without inventing per-task cost', () => {
    const models = parseArtificialAnalysisPayload([
      {
        id: 'cached-1',
        name: 'Cached Model',
        slug: 'cached-model',
        creator_name: 'Cache Labs',
        evaluations: { artificial_analysis_agentic_index: 33.4 },
        aa_intelligence_index: 41.2,
        aa_coding_index: 48.6,
        pricing: {
          price_1m_input_tokens: 0.4,
          price_1m_output_tokens: 1.6,
          price_1m_cache_hit_tokens: 0.1,
          price_1m_cache_write_tokens: null,
        },
        median_output_tokens_per_second: 120.5,
        median_time_to_first_token_seconds: 0.35,
        median_time_to_first_answer_token: 1.4,
        last_seen: '2026-08-30T00:00:00Z',
      },
    ]);

    expect(models[0]).toMatchObject({
      displayName: 'Cache Labs: Cached Model',
      intelligenceIndex: 41.2,
      codingIndex: 48.6,
      agenticIndex: 33.4,
      inputPerMillion: 0.4,
      outputPerMillion: 1.6,
      benchmarkCostPerTask: null,
      outputTokensPerSecond: 120.5,
      timeToFirstAnswerTokenSeconds: 1.4,
      lastSeen: '2026-08-30T00:00:00Z',
    });
  });
});

describe('matchArtificialAnalysisModel', () => {
  test('matches a provider-qualified planner model to the strongest AA reasoning variant', () => {
    const models = parseArtificialAnalysisPayload([
      {
        id: 'low',
        name: 'GPT-5.6 Sol (low)',
        slug: 'gpt-5-6-sol-low',
        creator_name: 'OpenAI',
        aa_intelligence_index: 50,
        pricing: { price_1m_input_tokens: 4, price_1m_output_tokens: 20 },
      },
      {
        id: 'max',
        name: 'GPT-5.6 Sol (max)',
        slug: 'gpt-5-6-sol-max',
        creator_name: 'OpenAI',
        aa_intelligence_index: 61,
        pricing: { price_1m_input_tokens: 4, price_1m_output_tokens: 20 },
      },
    ]);

    expect(matchArtificialAnalysisModel('OpenAI: GPT-5.6 Sol', models)?.id).toBe('max');
  });
});

describe('loadArtificialAnalysisCatalog', () => {
  test('uses the attributed free API response when a server-side key is configured', async () => {
    const catalog = await loadArtificialAnalysisCatalog({
      apiKey: 'server-only-key',
      fetcher: async () => new Response(JSON.stringify({
        tier: 'free',
        intelligence_index_version: 4.1,
        pagination: { page: 1, page_size: 200, total_pages: 1, has_more: false },
        data: [{
          id: 'direct-1',
          name: 'Direct Model',
          slug: 'direct-model',
          model_creator: { id: 'creator-1', name: 'Direct Labs', slug: 'direct-labs' },
          evaluations: { artificial_analysis_intelligence_index: 55 },
          artificial_analysis_intelligence_index_cost: {
            total_cost: 50,
            cost_per_task: { total_cost: 0.5 },
          },
          pricing: { price_1m_input_tokens: 1, price_1m_output_tokens: 4 },
          performance: {
            median_output_tokens_per_second: 80,
            median_time_to_first_token_seconds: 0.5,
            median_time_to_first_answer_token_seconds: 2,
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });

    expect(catalog.source).toBe('artificial-analysis-free-api');
    expect(catalog.freshness).toBe('live');
    expect(catalog.isFallback).toBe(false);
    expect(catalog.sourceUrl).toBe('https://artificialanalysis.ai/data-api/docs');
    expect(catalog.intelligenceIndexVersion).toBe(4.1);
    expect(catalog.data[0]).toMatchObject({
      id: 'direct-1',
      benchmarkCostPerTask: 0.5,
    });
  });

  test('uses the existing Supabase cache when the direct API key is unavailable', async () => {
    const catalog = await loadArtificialAnalysisCatalog({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      fetcher: async () => new Response(JSON.stringify([{
        id: 'cached-1',
        name: 'Cached Model',
        slug: 'cached-model',
        creator_name: 'Cache Labs',
        aa_intelligence_index: 42,
        pricing: { price_1m_input_tokens: 0.5, price_1m_output_tokens: 2 },
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });

    expect(catalog.source).toBe('artificial-analysis-supabase-cache');
    expect(catalog.freshness).toBe('cached');
    expect(catalog.isFallback).toBe(true);
    expect(catalog.data[0]).toMatchObject({ id: 'cached-1', benchmarkCostPerTask: null });
  });

  test('falls through to the database when the direct API is temporarily unavailable', async () => {
    const catalog = await loadArtificialAnalysisCatalog({
      apiKey: 'server-only-key',
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      fetcher: async input => String(input).includes('artificialanalysis.ai')
        ? new Response('upstream unavailable', { status: 503 })
        : new Response(JSON.stringify([{
            id: 'cached-2',
            name: 'Fallback Model',
            slug: 'fallback-model',
            creator_name: 'Cache Labs',
            aa_intelligence_index: 44,
            pricing: { price_1m_input_tokens: 0.75, price_1m_output_tokens: 3 },
          }]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });

    expect(catalog.source).toBe('artificial-analysis-supabase-cache');
    expect(catalog.data[0]?.id).toBe('cached-2');
  });

  test('returns an attributed dated catalog instead of an empty interface', async () => {
    const catalog = await buildArtificialAnalysisCatalogResponse({
      fetcher: async () => new Response('unavailable', { status: 503 }),
    });

    expect(catalog.source).toBe('dated-fallback');
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.freshness).toBe('static');
    expect(catalog.isFallback).toBe(true);
    expect(catalog.fallbackReason).toContain('unavailable');
    expect(catalog.attribution.url).toBe('https://artificialanalysis.ai/');
    expect(catalog.data.length).toBeGreaterThanOrEqual(3);
    expect(catalog.data.every(model => model.benchmarkCostPerTask === null)).toBe(true);
  });
});
