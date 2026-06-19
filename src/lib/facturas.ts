import { createClient } from "@/lib/supabase/server";

export const BUCKET_FACTURAS = "facturas";

// Máximo de escaneos de factura por usuario al día (control de costo de visión).
export const MAX_ESCANER_DIARIO = 3;

export type ItemFactura = {
  nombre: string;
  cantidad_estimada: string | null;
  categoria: string | null;
};

export type EstadoFactura = "pendiente" | "procesada" | "error";

export type Factura = {
  id: string;
  imagen_path: string | null;
  items_extraidos: ItemFactura[] | null;
  estado: EstadoFactura;
  created_at: string;
};

export type FacturaConUrl = Factura & { signedUrl: string | null };

export type SugerenciaPlato = {
  id: string;
  nombre_plato: string;
  descripcion: string | null;
  calorias_estimadas: number | null;
  ingredientes_usados: string[] | null;
  created_at: string;
};

/** Crea una signed URL temporal (1h) para una ruta del bucket de facturas. */
async function firmar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(BUCKET_FACTURAS)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Historial de facturas del usuario (con signed URL de la imagen). */
export async function getFacturas(): Promise<FacturaConUrl[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("facturas")
    .select("id, imagen_path, items_extraidos, estado, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const facturas = (data as Factura[]) ?? [];
  if (facturas.length === 0) return [];

  const paths = facturas.map((f) => f.imagen_path).filter(Boolean) as string[];
  const { data: signed } = await supabase.storage
    .from(BUCKET_FACTURAS)
    .createSignedUrls(paths, 60 * 60);
  const urlPorPath = new Map(
    (signed ?? []).map((s) => [s.path, s.signedUrl ?? null])
  );

  return facturas.map((f) => ({
    ...f,
    signedUrl: f.imagen_path ? urlPorPath.get(f.imagen_path) ?? null : null,
  }));
}

/** Una factura del usuario con su imagen firmada, o null. */
export async function getFactura(id: string): Promise<FacturaConUrl | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("facturas")
    .select("id, imagen_path, items_extraidos, estado, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  const factura = data as Factura;
  const signedUrl = await firmar(supabase, factura.imagen_path);
  return { ...factura, signedUrl };
}

/** Sugerencias de platos asociadas a una factura del usuario. */
export async function getSugerencias(
  facturaId: string
): Promise<SugerenciaPlato[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("sugerencias_platos")
    .select(
      "id, nombre_plato, descripcion, calorias_estimadas, ingredientes_usados, created_at"
    )
    .eq("factura_id", facturaId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data as SugerenciaPlato[]) ?? [];
}

/** Escaneos restantes hoy para el usuario, dado el máximo diario. */
export async function getEscaneosRestantes(max: number): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("escaner_uso_diario")
    .select("usos")
    .eq("user_id", user.id)
    .eq("fecha", hoy)
    .maybeSingle();

  const usados = (data?.usos as number) ?? 0;
  return Math.max(0, max - usados);
}
