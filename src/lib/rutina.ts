import { createClient } from "@/lib/supabase/server";

export type Objetivo = "bajar_grasa" | "ganar_musculo" | "mantener";

// Máximo de personalizaciones con IA por usuario al día (control de costo).
export const MAX_IA_DIARIO = 3;

export type RutinaUsuario = {
  id: string;
  user_id: string;
  nombre: string;
  objetivo: Objetivo;
  origen: "plantilla" | "ia";
  created_at: string;
};

export type RutinaItem = {
  id: string;
  dia: number;
  series: number;
  reps: string;
  orden: number;
  ejercicio: {
    id: string;
    nombre: string;
    grupo_muscular: string;
  } | null;
};

export type DiaRutina = { dia: number; items: RutinaItem[] };

/** La rutina más reciente del usuario, o null si no tiene. */
export async function getRutinaActual(): Promise<RutinaUsuario | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("rutinas_usuario")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as RutinaUsuario) ?? null;
}

/** Ejercicios de una rutina de usuario, agrupados por día. */
export async function getItemsRutinaAgrupados(
  rutinaUsuarioId: string
): Promise<DiaRutina[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rutina_usuario_ejercicios")
    .select(
      "id, dia, series, reps, orden, ejercicio:ejercicios(id, nombre, grupo_muscular)"
    )
    .eq("rutina_usuario_id", rutinaUsuarioId)
    .order("dia", { ascending: true })
    .order("orden", { ascending: true });

  const items = (data as unknown as RutinaItem[]) ?? [];

  const porDia = new Map<number, RutinaItem[]>();
  for (const it of items) {
    const arr = porDia.get(it.dia) ?? [];
    arr.push(it);
    porDia.set(it.dia, arr);
  }

  return [...porDia.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dia, items]) => ({ dia, items }));
}

/** Usos de IA restantes hoy para el usuario, dado el máximo diario. */
export async function getIaUsosRestantes(max: number): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("ia_uso_diario")
    .select("usos")
    .eq("user_id", user.id)
    .eq("fecha", hoy)
    .maybeSingle();

  const usados = (data?.usos as number) ?? 0;
  return Math.max(0, max - usados);
}
