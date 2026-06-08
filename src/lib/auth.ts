import { createClient } from "@/lib/supabase/server";

export type Role = "cliente" | "admin";

export type Profile = {
  id: string;
  role: Role;
  nombre: string | null;
  created_at: string;
};

/**
 * Devuelve el usuario autenticado (o null) usando el cliente server-side.
 * Usa getUser() (valida el token contra Supabase), no getSession().
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Devuelve la fila de `profiles` del usuario actual, o null si no hay sesion.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, nombre, created_at")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/**
 * Helper server-side para obtener el rol del usuario actual.
 * Devuelve null si no hay sesion. Por defecto un usuario nuevo es 'cliente'.
 */
export async function getUserRole(): Promise<Role | null> {
  const profile = await getProfile();
  return profile?.role ?? null;
}
