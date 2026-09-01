import { catalogJsonResponse } from '../../lib/catalogContract';
import { buildPricingCatalogResponse } from '../../lib/pricingCatalog';

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  OPENROUTER_API_BASE_URL?: string;
};

type PagesContext = {
  env: Env;
};

export const onRequestGet = async ({ env }: PagesContext) => {
  const body = await buildPricingCatalogResponse({
    supabaseUrl: env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    openrouterBaseUrl: env.OPENROUTER_API_BASE_URL,
  });

  return catalogJsonResponse(body);
};
