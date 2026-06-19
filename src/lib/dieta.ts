import { createClient } from "@/lib/supabase/server";
import {
  calcularPorcion,
  MOMENTOS,
  type Momento,
} from "@/lib/alimentos-tipos";

export type Objetivo = "bajar_grasa" | "ganar_musculo" | "mantener";

export type DietaUsuario = {
  id: string;
  user_id: string;
  nombre: string;
  objetivo: Objetivo;
  origen: "plantilla" | "ia";
  created_at: string;
};

export type DietaComidaItem = {
  id: string;
  momento: Momento;
  cantidad_g: number;
  orden: number;
  alimento: {
    id: string;
    nombre: string;
    calorias_100g: number;
    proteina_100g: number | null;
    carbos_100g: number | null;
    grasa_100g: number | null;
  } | null;
};

export type MomentoDieta = { momento: Momento; items: DietaComidaItem[] };

export type TotalesDieta = {
  calorias: number;
  proteina: number;
  carbos: number;
  grasa: number;
};

/** La dieta más reciente del usuario, o null. */
export async function getDietaActual(): Promise<DietaUsuario | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("dietas_usuario")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as DietaUsuario) ?? null;
}

/** Comidas de una dieta de usuario, agrupadas por momento del día. */
export async function getComidasDietaAgrupadas(
  dietaUsuarioId: string
): Promise<MomentoDieta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dieta_usuario_comidas")
    .select(
      "id, momento, cantidad_g, orden, alimento:alimentos(id, nombre, calorias_100g, proteina_100g, carbos_100g, grasa_100g)"
    )
    .eq("dieta_usuario_id", dietaUsuarioId)
    .order("orden", { ascending: true });

  const items = (data as unknown as DietaComidaItem[]) ?? [];

  return MOMENTOS.map((momento) => ({
    momento,
    items: items.filter((it) => it.momento === momento),
  })).filter((m) => m.items.length > 0);
}

/** Suma calorías y macros de todas las comidas de la dieta. */
export function totalesDieta(momentos: MomentoDieta[]): TotalesDieta {
  const tot: TotalesDieta = { calorias: 0, proteina: 0, carbos: 0, grasa: 0 };
  for (const m of momentos) {
    for (const it of m.items) {
      if (!it.alimento) continue;
      const p = calcularPorcion(it.alimento, it.cantidad_g);
      tot.calorias += p.calorias;
      tot.proteina += p.proteina;
      tot.carbos += p.carbos;
      tot.grasa += p.grasa;
    }
  }
  return {
    calorias: Math.round(tot.calorias),
    proteina: Math.round(tot.proteina),
    carbos: Math.round(tot.carbos),
    grasa: Math.round(tot.grasa),
  };
}
