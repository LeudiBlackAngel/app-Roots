import { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type Racha = {
  dias_consecutivos: number;
  mejor_racha: number;
  ultima_fecha_activa: string | null;
};

export type Logro = {
  id: string;
  tipo: string;
  desbloqueado_en: string;
};

// Catálogo de logros con su presentación (emoji + etiqueta).
export const LOGROS_INFO: Record<string, { emoji: string; label: string }> = {
  primer_entrenamiento: { emoji: "🏋️", label: "Primer entrenamiento" },
  primer_registro_comida: { emoji: "🍽️", label: "Primera comida registrada" },
  primer_perfil: { emoji: "📋", label: "Perfil completo" },
  racha_3: { emoji: "🔥", label: "Racha de 3 días" },
  racha_7: { emoji: "⚡", label: "Racha de 7 días" },
};

/**
 * Marca actividad del día (comida o entrenamiento) y actualiza la racha.
 * Llama a la función SECURITY DEFINER que aplica la lógica de forma atómica.
 */
export async function marcarActividad(supabase: SupabaseServer): Promise<void> {
  await supabase.rpc("registrar_actividad");
}

/**
 * Desbloquea un logro de una sola vez. Idempotente gracias al unique
 * (user_id, tipo); si ya existía, no hace nada.
 */
export async function desbloquearLogro(
  supabase: SupabaseServer,
  userId: string,
  tipo: string
): Promise<void> {
  await supabase
    .from("logros")
    .insert({ user_id: userId, tipo })
    .select("id"); // ignora el error de conflicto silenciosamente
}

/** Racha actual del usuario (o ceros si no hay). */
export async function getRacha(): Promise<Racha> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { dias_consecutivos: 0, mejor_racha: 0, ultima_fecha_activa: null };

  const { data } = await supabase
    .from("rachas")
    .select("dias_consecutivos, mejor_racha, ultima_fecha_activa")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data)
    return { dias_consecutivos: 0, mejor_racha: 0, ultima_fecha_activa: null };

  // Si la última actividad no fue hoy ni ayer, la racha visible es 0.
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const hoyISO = hoy.toISOString().slice(0, 10);
  const ayerISO = ayer.toISOString().slice(0, 10);
  const activa =
    data.ultima_fecha_activa === hoyISO || data.ultima_fecha_activa === ayerISO;

  return {
    dias_consecutivos: activa ? (data.dias_consecutivos as number) : 0,
    mejor_racha: (data.mejor_racha as number) ?? 0,
    ultima_fecha_activa: (data.ultima_fecha_activa as string) ?? null,
  };
}

/** Logros desbloqueados del usuario, más recientes primero. */
export async function getLogros(): Promise<Logro[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("logros")
    .select("id, tipo, desbloqueado_en")
    .eq("user_id", user.id)
    .order("desbloqueado_en", { ascending: false });

  return (data as Logro[]) ?? [];
}
