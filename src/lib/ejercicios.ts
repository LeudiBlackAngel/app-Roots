import { createClient } from "@/lib/supabase/server";
import type { Ejercicio } from "@/lib/ejercicios-tipos";

export type { Ejercicio } from "@/lib/ejercicios-tipos";
export { GRUPOS_MUSCULARES } from "@/lib/ejercicios-tipos";

/** Lista completa de la biblioteca, ordenada por grupo y nombre. */
export async function getEjercicios(): Promise<Ejercicio[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ejercicios")
    .select("*")
    .order("grupo_muscular", { ascending: true })
    .order("nombre", { ascending: true });
  return (data as Ejercicio[]) ?? [];
}

/** Un ejercicio por id, o null. */
export async function getEjercicio(id: string): Promise<Ejercicio | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ejercicios")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Ejercicio) ?? null;
}
