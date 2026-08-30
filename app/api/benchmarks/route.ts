import { buildArtificialAnalysisCatalogResponse } from '../../../lib/artificialAnalysis';

export const revalidate = 900;

export async function GET() {
  const body = await buildArtificialAnalysisCatalogResponse({
    apiKey: process.env.ARTIFICIAL_ANALYSIS_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return Response.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=900, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
}
