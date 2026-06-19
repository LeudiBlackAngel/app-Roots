import { createClient } from "@/lib/supabase/server";
import type { Momento } from "@/lib/alimentos-tipos";

export type RegistroComida = {
  id: string;
  fecha: string;
  momento: Momento;
  alimento_id: string | null;
  descripcion: string | null;
  cantidad_g: number | null;
  calorias: number | null;
  proteina: number | null;
  carbos: number | null;
  grasa: number | null;
  created_at: string;
};

export type ResumenDia = {
  calorias: number;
  proteina: number;
  carbos: number;
  grasa: number;
};

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Registros de comida del usuario para una fecha (por defecto hoy). */
export async function getRegistrosComida(
  fecha?: string
): Promise<RegistroComida[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("registro_comidas")
    .select(
      "id, fecha, momento, alimento_id, descripcion, cantidad_g, calorias, proteina, carbos, grasa, created_at"
    )
    .eq("user_id", user.id)
    .eq("fecha", fecha ?? hoyISO())
    .order("created_at", { ascending: true });

  return (data as RegistroComida[]) ?? [];
}

/** Suma de calorías/macros de una lista de registros. */
export function resumenDia(registros: RegistroComida[]): ResumenDia {
  const tot: ResumenDia = { calorias: 0, proteina: 0, carbos: 0, grasa: 0 };
  for (const r of registros) {
    tot.calorias += r.calorias ?? 0;
    tot.proteina += r.proteina ?? 0;
    tot.carbos += r.carbos ?? 0;
    tot.grasa += r.grasa ?? 0;
  }
  return {
    calorias: Math.round(tot.calorias),
    proteina: Math.round(tot.proteina),
    carbos: Math.round(tot.carbos),
    grasa: Math.round(tot.grasa),
  };
}

/** Calorías totales registradas hoy (para el dashboard). */
export async function getCaloriasHoy(): Promise<number> {
  const registros = await getRegistrosComida();
  return resumenDia(registros).calorias;
}
