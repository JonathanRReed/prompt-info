import { createClient } from '@supabase/supabase-js';

// Public client for browser-side usage. URL and anon key come from `.env`.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Do not throw to avoid breaking build; components can handle missing data.
  // Log a warning so it can be seen in dev tools.
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
