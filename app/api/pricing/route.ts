import { buildPricingMap } from '../../../lib/pricingParser';

export const revalidate = 900;
export const dynamic = 'force-static';

type Rows = unknown[];

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  OPENROUTER_API_BASE_URL?: string;
};

const QUERY_LIMIT = 1000;
const DEFAULT_OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=900, stale-while-revalidate=3600' : 'no-store',
    },
  });
}

function isTextModel(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  const architecture = (value as Record<string, unknown>).architecture;
  if (!architecture || typeof architecture !== 'object') return true;

  const outputModalities = (architecture as Record<string, unknown>).output_modalities;
  if (Array.isArray(outputModalities)) {
    return outputModalities.some(item => typeof item === 'string' && item.toLowerCase().includes('text'));
  }

  const modality = (architecture as Record<string, unknown>).modality;
  return typeof modality === 'string' ? modality.toLowerCase().includes('text') : true;
}

function extractModelRows(response: unknown): Rows {
  if (!response || typeof response !== 'object') return [];

  const asRecord = response as Record<string, unknown>;
  if (Array.isArray(asRecord.data)) return asRecord.data;

  return [];
}

async function fetchJsonRows(url: string): Promise<Rows> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return [];

    return extractModelRows(await response.json());
  } catch {
    return [];
  }
}

async function fetchSupabaseRows(supabaseUrl: string, supabaseAnonKey: string): Promise<Rows> {
  const endpoint = new URL('/rest/v1/aa_models', supabaseUrl);
  endpoint.searchParams.set('select', '*');
  endpoint.searchParams.set('pricing', 'not.is.null');
  endpoint.searchParams.set('limit', String(QUERY_LIMIT));

  try {
    const response = await fetch(endpoint.toString(), {
      headers: {
        Accept: 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) return [];

    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function GET(_: Request) {
  const env: Env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    OPENROUTER_API_BASE_URL: process.env.OPENROUTER_API_BASE_URL,
  };

  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openrouterBaseUrl = env.OPENROUTER_API_BASE_URL ?? DEFAULT_OPENROUTER_API_BASE_URL;
  const openrouterModelsUrl = openrouterBaseUrl.endsWith('/')
    ? `${openrouterBaseUrl}models`
    : `${openrouterBaseUrl}/models`;

  const [supabaseRows, openRouterRows] = await Promise.all([
    supabaseUrl && supabaseAnonKey ? fetchSupabaseRows(supabaseUrl, supabaseAnonKey) : Promise.resolve<Rows>([]),
    fetchJsonRows(openrouterModelsUrl),
  ]);

  const sourceRows = openRouterRows.length > 0 ? openRouterRows : supabaseRows;
  const rows = sourceRows.filter(isTextModel);

  if (!rows.length) {
    return jsonResponse({ error: 'Pricing source is not configured' }, 503);
  }

  return jsonResponse(buildPricingMap(Array.isArray(rows) ? rows : []));
}
