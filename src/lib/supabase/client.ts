import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para Client Components (corre en el browser).
 * Usa la anon key publica; la seguridad real la da RLS en Postgres.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
