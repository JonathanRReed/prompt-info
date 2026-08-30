import { buildArtificialAnalysisCatalogResponse } from '../../lib/artificialAnalysis';

type Env = {
  ARTIFICIAL_ANALYSIS_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

type PagesContext = {
  env: Env;
};

export const onRequestGet = async ({ env }: PagesContext) => {
  const body = await buildArtificialAnalysisCatalogResponse({
    apiKey: env.ARTIFICIAL_ANALYSIS_API_KEY,
    supabaseUrl: env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return Response.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=900, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
};
