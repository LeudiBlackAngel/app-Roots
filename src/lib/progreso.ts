import { createClient } from "@/lib/supabase/server";

export const BUCKET_PROGRESO = "progreso";

export type PesoCorporal = {
  id: string;
  fecha: string;
  peso_kg: number;
};

export type FotoProgreso = {
  id: string;
  foto_path: string;
  fecha: string;
  tipo: "antes" | "despues" | "seguimiento";
  signedUrl: string | null;
};

/** Registros de peso corporal del usuario, de más antiguo a más nuevo. */
export async function getPesoCorporal(): Promise<PesoCorporal[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("peso_corporal")
    .select("id, fecha, peso_kg")
    .eq("user_id", user.id)
    .order("fecha", { ascending: true });

  return (data as PesoCorporal[]) ?? [];
}

/** Fotos de progreso del usuario con URLs firmadas temporales (1h). */
export async function getFotosProgreso(): Promise<FotoProgreso[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("fotos_progreso")
    .select("id, foto_path, fecha, tipo")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false });

  const fotos = (data as Omit<FotoProgreso, "signedUrl">[]) ?? [];
  if (fotos.length === 0) return [];

  // URLs firmadas (privadas, expiran en 1h). NUNCA URLs públicas.
  const { data: signed } = await supabase.storage
    .from(BUCKET_PROGRESO)
    .createSignedUrls(
      fotos.map((f) => f.foto_path),
      60 * 60
    );

  const urlPorPath = new Map(
    (signed ?? []).map((s) => [s.path, s.signedUrl ?? null])
  );

  return fotos.map((f) => ({
    ...f,
    signedUrl: urlPorPath.get(f.foto_path) ?? null,
  }));
}
