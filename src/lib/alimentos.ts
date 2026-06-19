import { createClient } from "@/lib/supabase/server";
import type { Alimento } from "@/lib/alimentos-tipos";

export type { Alimento } from "@/lib/alimentos-tipos";
export { CATEGORIAS_ALIMENTO } from "@/lib/alimentos-tipos";

/** Lista completa de alimentos, ordenada por categoría y nombre. */
export async function getAlimentos(): Promise<Alimento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("alimentos")
    .select("*")
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });
  return (data as Alimento[]) ?? [];
}
