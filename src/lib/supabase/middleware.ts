import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesion de Supabase en cada request y protege rutas privadas.
 *
 * IMPORTANTE: no metas logica entre createServerClient y getUser(), y siempre
 * devuelve el `supabaseResponse` (o copia sus cookies) para no romper el ciclo
 * de refresco de tokens. Ver docs de @supabase/ssr.
 */

// Rutas que requieren sesion iniciada.
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/perfil"];

// Rutas de auth: si ya hay sesion, mandamos al dashboard.
const AUTH_ROUTES = ["/login", "/registro"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca el token si hace falta y obtiene el usuario actual.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Sin sesion + ruta protegida -> /login
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesion + ruta de auth -> /dashboard
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
