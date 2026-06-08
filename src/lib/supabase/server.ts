import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Lee/escribe la sesion desde las cookies de la request.
 *
 * Nota: en Server Components el set/remove de cookies puede fallar porque no se
 * puede mutar la respuesta; lo envolvemos en try/catch. El refresco real de la
 * sesion ocurre en el middleware (ver lib/supabase/middleware.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component: ignorar. El middleware se
            // encarga de refrescar la sesion en cada request.
          }
        },
      },
    }
  );
}
