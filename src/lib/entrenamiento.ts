import { createClient } from "@/lib/supabase/server";

export type RegistroEntrenamiento = {
  id: string;
  user_id: string;
  ejercicio_id: string;
  fecha: string;
  peso_levantado: number | null;
  reps: number | null;
  series: number | null;
  notas: string | null;
  created_at: string;
};

/** Historial de registros de un ejercicio (del usuario), de más antiguo a más nuevo. */
export async function getHistorialEjercicio(
  ejercicioId: string
): Promise<RegistroEntrenamiento[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("registros_entrenamiento")
    .select("*")
    .eq("user_id", user.id)
    .eq("ejercicio_id", ejercicioId)
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true });

  return (data as RegistroEntrenamiento[]) ?? [];
}

/** Lunes (inicio de semana) en formato YYYY-MM-DD, hora local del servidor. */
function inicioSemanaISO(): string {
  const hoy = new Date();
  const dia = (hoy.getDay() + 6) % 7; // 0 = lunes
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - dia);
  return lunes.toISOString().slice(0, 10);
}

/** Nº de días distintos entrenados esta semana (lunes a hoy). */
export async function getDiasEntrenadosSemana(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data } = await supabase
    .from("registros_entrenamiento")
    .select("fecha")
    .eq("user_id", user.id)
    .gte("fecha", inicioSemanaISO());

  const fechas = new Set((data ?? []).map((r) => r.fecha as string));
  return fechas.size;
}
