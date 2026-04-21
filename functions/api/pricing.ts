import { buildPricingMap } from '../../lib/pricingParser';

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

type PagesContext = {
  env: Env;
};

const QUERY_LIMIT = 1000;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=900, stale-while-revalidate=3600' : 'no-store',
    },
  });

export const onRequestGet = async ({ env }: PagesContext) => {
  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Pricing source is not configured' }, 503);
  }

  const endpoint = new URL('/rest/v1/aa_models', supabaseUrl);
  endpoint.searchParams.set('select', '*');
  endpoint.searchParams.set('pricing', 'not.is.null');
  endpoint.searchParams.set('limit', String(QUERY_LIMIT));

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    return jsonResponse({ error: 'Pricing source failed' }, 502);
  }

  const rows = await response.json();
  return jsonResponse(buildPricingMap(Array.isArray(rows) ? rows : []));
};
