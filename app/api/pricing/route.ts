import { catalogJsonResponse } from '../../../lib/catalogContract';
import { buildPricingCatalogResponse } from '../../../lib/pricingCatalog';

export const revalidate = 900;
export const dynamic = 'force-static';

export async function GET() {
  const body = await buildPricingCatalogResponse({
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    openrouterBaseUrl: process.env.OPENROUTER_API_BASE_URL,
  });

  return catalogJsonResponse(body);
}
