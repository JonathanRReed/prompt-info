import bundledPricing from '../public/data/llm-data.json';
import {
  CATALOG_SCHEMA_VERSION,
  fetchJsonWithTimeout,
  type CatalogEnvelope,
} from './catalogContract';
import { buildPricingMap, type PricingEntry, type PricingMap } from './pricingParser';

export type PricingCatalogSource = 'openrouter-live' | 'supabase-cache' | 'bundled-static';
export type PricingCatalogResponse = CatalogEnvelope<PricingMap, PricingCatalogSource>;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type PricingCatalogOptions = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  openrouterBaseUrl?: string;
  fetcher?: Fetcher;
  now?: () => Date;
  timeoutMs?: number;
};

const QUERY_LIMIT = 1_000;
const DEFAULT_OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';
const BUNDLED_SOURCE_URL = 'https://prompt-info.helloworldfirm.com/data/llm-data.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPricingMap(value: unknown): value is PricingMap {
  if (!isRecord(value) || Object.keys(value).length === 0) return false;

  return Object.values(value).every(entry => {
    if (!isRecord(entry) || !isRecord(entry.pricing)) return false;
    const input = entry.pricing.input;
    const output = entry.pricing.output;
    return (
      typeof input === 'number'
      && Number.isFinite(input)
      && input > 0
      && typeof output === 'number'
      && Number.isFinite(output)
      && output > 0
    );
  });
}

export function isTextModel(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const architecture = value.architecture;
  if (!isRecord(architecture)) return true;

  const outputModalities = architecture.output_modalities;
  if (Array.isArray(outputModalities)) {
    return outputModalities.some(item => typeof item === 'string' && item.toLowerCase().includes('text'));
  }

  const modality = architecture.modality;
  return typeof modality === 'string' ? modality.toLowerCase().includes('text') : true;
}

function extractOpenRouterRows(value: unknown): unknown[] {
  return isRecord(value) && Array.isArray(value.data) ? value.data : [];
}

function buildOpenRouterModelsUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;
}

function buildSupabaseModelsUrl(baseUrl: string): string {
  const endpoint = new URL('/rest/v1/aa_models', baseUrl);
  endpoint.searchParams.set('select', '*');
  endpoint.searchParams.set('pricing', 'not.is.null');
  endpoint.searchParams.set('limit', String(QUERY_LIMIT));
  return endpoint.toString();
}

function fallbackReasonFor(reason: string | undefined): string {
  switch (reason) {
    case 'timeout':
      return 'OpenRouter pricing timed out.';
    case 'network':
      return 'OpenRouter pricing could not be reached.';
    case 'upstream':
      return 'OpenRouter pricing returned an error.';
    case 'invalid-json':
      return 'OpenRouter pricing returned an invalid payload.';
    default:
      return 'OpenRouter pricing returned no usable text-model prices.';
  }
}

export async function buildPricingCatalogResponse({
  supabaseUrl,
  supabaseAnonKey,
  openrouterBaseUrl = DEFAULT_OPENROUTER_API_BASE_URL,
  fetcher = fetch,
  now = () => new Date(),
  timeoutMs = 6_000,
}: PricingCatalogOptions = {}): Promise<PricingCatalogResponse> {
  const retrievedAt = now().toISOString();
  const openrouterUrl = buildOpenRouterModelsUrl(openrouterBaseUrl);
  const openrouterResult = await fetchJsonWithTimeout(fetcher, openrouterUrl, {
    headers: { Accept: 'application/json' },
  }, timeoutMs);

  const openrouterMap = openrouterResult.ok
    ? buildPricingMap(extractOpenRouterRows(openrouterResult.body).filter(isTextModel))
    : {};

  if (isPricingMap(openrouterMap)) {
    return {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      data: openrouterMap,
      source: 'openrouter-live',
      sourceUrl: openrouterUrl,
      retrievedAt,
      freshness: 'live',
      isFallback: false,
      fallbackReason: null,
    };
  }

  const openrouterFailure = fallbackReasonFor(openrouterResult.ok ? undefined : openrouterResult.reason);

  if (supabaseUrl && supabaseAnonKey) {
    const supabaseModelsUrl = buildSupabaseModelsUrl(supabaseUrl);
    const supabaseResult = await fetchJsonWithTimeout(fetcher, supabaseModelsUrl, {
      headers: {
        Accept: 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    }, timeoutMs);
    const supabaseRows = supabaseResult.ok && Array.isArray(supabaseResult.body)
      ? supabaseResult.body.filter(isTextModel)
      : [];
    const supabaseMap = buildPricingMap(supabaseRows);

    if (isPricingMap(supabaseMap)) {
      return {
        schemaVersion: CATALOG_SCHEMA_VERSION,
        data: supabaseMap,
        source: 'supabase-cache',
        sourceUrl: supabaseModelsUrl,
        retrievedAt,
        freshness: 'cached',
        isFallback: true,
        fallbackReason: `${openrouterFailure} Using the project pricing cache.`,
      };
    }
  }

  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    data: bundledPricing as Record<string, PricingEntry>,
    source: 'bundled-static',
    sourceUrl: BUNDLED_SOURCE_URL,
    retrievedAt,
    freshness: 'static',
    isFallback: true,
    fallbackReason: `${openrouterFailure} Using the bundled dated catalog.`,
  };
}
