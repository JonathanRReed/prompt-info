import {
  CATALOG_SCHEMA_VERSION,
  fetchJsonWithTimeout,
  type CatalogFreshness,
} from './catalogContract';

export type ArtificialAnalysisModel = {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  creator: string;
  intelligenceIndex: number | null;
  codingIndex: number | null;
  agenticIndex: number | null;
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  cacheReadPerMillion: number | null;
  cacheWritePerMillion: number | null;
  benchmarkCostPerTask: number | null;
  benchmarkTotalCost: number | null;
  outputTokensPerSecond: number | null;
  timeToFirstTokenSeconds: number | null;
  timeToFirstAnswerTokenSeconds: number | null;
  lastSeen: string | null;
};

export type ArtificialAnalysisCatalog = {
  schemaVersion: typeof CATALOG_SCHEMA_VERSION;
  source: 'artificial-analysis-free-api' | 'artificial-analysis-supabase-cache' | 'dated-fallback';
  sourceUrl: string;
  intelligenceIndexVersion: number | null;
  retrievedAt: string;
  freshness: CatalogFreshness;
  isFallback: boolean;
  fallbackReason: string | null;
  data: ArtificialAnalysisModel[];
};

export const ARTIFICIAL_ANALYSIS_ATTRIBUTION = {
  name: 'Artificial Analysis',
  url: 'https://artificialanalysis.ai/',
  apiDocs: 'https://artificialanalysis.ai/data-api/docs',
} as const;

export type ArtificialAnalysisCatalogResponse = ArtificialAnalysisCatalog & {
  attribution: typeof ARTIFICIAL_ANALYSIS_ATTRIBUTION;
  limitations: string;
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function loadArtificialAnalysisCatalog(_: {
  apiKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  fetcher?: Fetcher;
  now?: () => Date;
  timeoutMs?: number;
}): Promise<ArtificialAnalysisCatalog> {
  const { apiKey, supabaseUrl, supabaseAnonKey, fetcher = fetch, now = () => new Date(), timeoutMs = 6_000 } = _;
  const retrievedAt = now().toISOString();
  let directFailure = apiKey
    ? 'Artificial Analysis returned no usable models.'
    : 'Artificial Analysis API is not configured.';

  if (apiKey) {
    const rows: unknown[] = [];
    let intelligenceIndexVersion: number | null = null;

    for (let page = 1; page <= 10; page += 1) {
      const endpoint = new URL('https://artificialanalysis.ai/api/v2/language/models/free');
      endpoint.searchParams.set('page', String(page));
      const result = await fetchJsonWithTimeout(fetcher, endpoint, {
        headers: {
          Accept: 'application/json',
          'x-api-key': apiKey,
        },
      }, timeoutMs);

      if (!result.ok) {
        directFailure = result.reason === 'timeout'
          ? 'Artificial Analysis request timed out.'
          : 'Artificial Analysis request was unavailable.';
        break;
      }
      const payload = result.body;
      if (!isRecord(payload)) break;
      if (intelligenceIndexVersion === null) {
        intelligenceIndexVersion = numberOrNull(payload.intelligence_index_version);
      }
      if (Array.isArray(payload.data)) rows.push(...payload.data);

      const pagination = isRecord(payload.pagination) ? payload.pagination : {};
      if (pagination.has_more !== true) break;
    }

    const data = parseArtificialAnalysisPayload(rows);
    if (data.length > 0) {
      return {
        schemaVersion: CATALOG_SCHEMA_VERSION,
        source: 'artificial-analysis-free-api',
        sourceUrl: ARTIFICIAL_ANALYSIS_ATTRIBUTION.apiDocs,
        intelligenceIndexVersion,
        retrievedAt,
        freshness: 'live',
        isFallback: false,
        fallbackReason: null,
        data,
      };
    }
  }

  if (supabaseUrl && supabaseAnonKey) {
    const endpoint = new URL('/rest/v1/aa_models', supabaseUrl);
    endpoint.searchParams.set('select', '*');
    endpoint.searchParams.set('order', 'aa_intelligence_index.desc.nullslast');
    endpoint.searchParams.set('limit', '1000');
    const result = await fetchJsonWithTimeout(fetcher, endpoint, {
      headers: {
        Accept: 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    }, timeoutMs);

    if (result.ok) {
      const data = parseArtificialAnalysisPayload(result.body);
      if (data.length > 0) {
        return {
          schemaVersion: CATALOG_SCHEMA_VERSION,
          source: 'artificial-analysis-supabase-cache',
          sourceUrl: endpoint.toString(),
          intelligenceIndexVersion: null,
          retrievedAt,
          freshness: 'cached',
          isFallback: true,
          fallbackReason: `${directFailure} Using the project benchmark cache.`,
          data,
        };
      }
    }
  }

  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    source: 'dated-fallback',
    sourceUrl: ARTIFICIAL_ANALYSIS_ATTRIBUTION.apiDocs,
    intelligenceIndexVersion: null,
    retrievedAt,
    freshness: 'static',
    isFallback: true,
    fallbackReason: `${directFailure} Project benchmark cache was unavailable.`,
    data: [],
  };
}

export function buildDatedArtificialAnalysisFallback(): ArtificialAnalysisModel[] {
  return [
    {
      id: 'fallback-gpt-5-6-sol',
      name: 'GPT-5.6 Sol (max)',
      displayName: 'OpenAI: GPT-5.6 Sol (max)',
      slug: 'gpt-5-6-sol',
      creator: 'OpenAI',
      intelligenceIndex: 61,
      codingIndex: null,
      agenticIndex: null,
      inputPerMillion: 4,
      outputPerMillion: 20,
      cacheReadPerMillion: null,
      cacheWritePerMillion: null,
      benchmarkCostPerTask: null,
      benchmarkTotalCost: 2017.29,
      outputTokensPerSecond: null,
      timeToFirstTokenSeconds: null,
      timeToFirstAnswerTokenSeconds: null,
      lastSeen: '2026-08-29',
    },
    {
      id: 'fallback-kimi-k3',
      name: 'Kimi K3 (max)',
      displayName: 'Moonshot: Kimi K3 (max)',
      slug: 'kimi-k3',
      creator: 'Moonshot',
      intelligenceIndex: 60,
      codingIndex: null,
      agenticIndex: null,
      inputPerMillion: 3,
      outputPerMillion: 15,
      cacheReadPerMillion: 0.3,
      cacheWritePerMillion: null,
      benchmarkCostPerTask: null,
      benchmarkTotalCost: 2425.11,
      outputTokensPerSecond: null,
      timeToFirstTokenSeconds: null,
      timeToFirstAnswerTokenSeconds: null,
      lastSeen: '2026-08-29',
    },
    {
      id: 'fallback-gemini-3-7-flash',
      name: 'Gemini 3.7 Flash (high)',
      displayName: 'Google: Gemini 3.7 Flash (high)',
      slug: 'gemini-3-7-flash',
      creator: 'Google',
      intelligenceIndex: 56,
      codingIndex: null,
      agenticIndex: null,
      inputPerMillion: 0.75,
      outputPerMillion: 3.75,
      cacheReadPerMillion: null,
      cacheWritePerMillion: null,
      benchmarkCostPerTask: null,
      benchmarkTotalCost: 484.73,
      outputTokensPerSecond: null,
      timeToFirstTokenSeconds: null,
      timeToFirstAnswerTokenSeconds: null,
      lastSeen: '2026-08-29',
    },
  ];
}

export async function buildArtificialAnalysisCatalogResponse(options: Parameters<typeof loadArtificialAnalysisCatalog>[0]) {
  const catalog = await loadArtificialAnalysisCatalog(options);
  const hasLiveCatalog = catalog.data.length > 0;

  return {
    ...catalog,
    source: hasLiveCatalog ? catalog.source : 'dated-fallback' as const,
    data: hasLiveCatalog ? catalog.data : buildDatedArtificialAnalysisFallback(),
    attribution: ARTIFICIAL_ANALYSIS_ATTRIBUTION,
    limitations: hasLiveCatalog
      ? catalog.source === 'artificial-analysis-free-api'
        ? 'Artificial Analysis free API data. Per-evaluation token details require the appropriate Artificial Analysis data tier.'
        : 'Artificial Analysis data cached in the existing project database. Benchmark cost per task is shown only when the upstream source provides it.'
      : 'Dated August 29, 2026 fallback. Configure the Artificial Analysis API or project database for current benchmark data.',
  } satisfies ArtificialAnalysisCatalogResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nestedNumber(record: Record<string, unknown>, key: string): number | null {
  return numberOrNull(record[key]);
}

export function parseArtificialAnalysisPayload(payload: unknown): ArtificialAnalysisModel[] {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.data)
      ? payload.data
      : [];

  return rows.flatMap(row => {
    if (!isRecord(row)) return [];

    const id = stringOrNull(row.id);
    const name = stringOrNull(row.name);
    const slug = stringOrNull(row.slug);
    if (!id || !name || !slug) return [];

    const creatorRecord = isRecord(row.model_creator) ? row.model_creator : {};
    const creator = stringOrNull(creatorRecord.name) ?? stringOrNull(row.creator_name) ?? 'Unknown';
    const evaluations = isRecord(row.evaluations) ? row.evaluations : {};
    const pricing = isRecord(row.pricing) ? row.pricing : {};
    const performance = isRecord(row.performance) ? row.performance : row;
    const cost = isRecord(row.artificial_analysis_intelligence_index_cost)
      ? row.artificial_analysis_intelligence_index_cost
      : {};
    const costPerTask = isRecord(cost.cost_per_task) ? cost.cost_per_task : {};

    return [{
      id,
      name,
      displayName: creator === 'Unknown' ? name : `${creator}: ${name}`,
      slug,
      creator,
      intelligenceIndex: nestedNumber(evaluations, 'artificial_analysis_intelligence_index')
        ?? numberOrNull(row.aa_intelligence_index),
      codingIndex: nestedNumber(evaluations, 'artificial_analysis_coding_index')
        ?? numberOrNull(row.aa_coding_index),
      agenticIndex: nestedNumber(evaluations, 'artificial_analysis_agentic_index')
        ?? numberOrNull(row.aa_agentic_index),
      inputPerMillion: nestedNumber(pricing, 'price_1m_input_tokens')
        ?? numberOrNull(row.price_1m_input_tokens),
      outputPerMillion: nestedNumber(pricing, 'price_1m_output_tokens')
        ?? numberOrNull(row.price_1m_output_tokens),
      cacheReadPerMillion: nestedNumber(pricing, 'price_1m_cache_hit_tokens'),
      cacheWritePerMillion: nestedNumber(pricing, 'price_1m_cache_write_tokens'),
      benchmarkCostPerTask: nestedNumber(costPerTask, 'total_cost'),
      benchmarkTotalCost: nestedNumber(cost, 'total_cost'),
      outputTokensPerSecond: nestedNumber(performance, 'median_output_tokens_per_second'),
      timeToFirstTokenSeconds: nestedNumber(performance, 'median_time_to_first_token_seconds'),
      timeToFirstAnswerTokenSeconds:
        nestedNumber(performance, 'median_time_to_first_answer_token_seconds')
        ?? nestedNumber(performance, 'median_time_to_first_answer_token'),
      lastSeen: stringOrNull(row.last_seen),
    }];
  });
}

function normalizeFamilyName(value: string) {
  const withoutProvider = value.includes(':') ? value.slice(value.indexOf(':') + 1) : value;
  return withoutProvider
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchArtificialAnalysisModel(
  plannerModel: string,
  models: ArtificialAnalysisModel[],
): ArtificialAnalysisModel | null {
  const targetFamily = normalizeFamilyName(plannerModel);
  const provider = plannerModel.includes(':')
    ? plannerModel.slice(0, plannerModel.indexOf(':')).trim().toLowerCase()
    : null;

  const matches = models.filter(model => {
    if (normalizeFamilyName(model.name) !== targetFamily) return false;
    return provider ? model.creator.toLowerCase() === provider : true;
  });

  return matches.reduce<ArtificialAnalysisModel | null>((best, model) => {
    if (!best) return model;
    return (model.intelligenceIndex ?? Number.NEGATIVE_INFINITY)
      > (best.intelligenceIndex ?? Number.NEGATIVE_INFINITY)
      ? model
      : best;
  }, null);
}
