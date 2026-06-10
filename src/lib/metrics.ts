import { createClient } from "@/lib/supabase/server";
import type {
  Macros,
  NivelActividad,
  Objetivo,
  Sexo,
} from "@/lib/calculadoras";
import type { UnidadAltura, UnidadPeso } from "@/lib/unidades";

export type UserMetrics = {
  user_id: string;
  peso: number | null;
  altura: number | null;
  edad: number | null;
  sexo: Sexo | null;
  objetivo: Objetivo | null;
  nivel_actividad: NivelActividad | null;
  restricciones: string[];
  calorias_objetivo: number | null;
  macros: Macros | null;
  imc: number | null;
  unidad_peso: UnidadPeso | null;
  unidad_altura: UnidadAltura | null;
  updated_at: string;
};

/** Devuelve la fila de user_metrics del usuario actual, o null si no existe. */
export async function getUserMetrics(): Promise<UserMetrics | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_metrics")
    .select(
      "user_id, peso, altura, edad, sexo, objetivo, nivel_actividad, restricciones, calorias_objetivo, macros, imc, unidad_peso, unidad_altura, updated_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as UserMetrics) ?? null;
}

/** ¿El perfil físico está completo (tiene los campos necesarios para métricas)? */
export function perfilCompleto(m: UserMetrics | null): boolean {
  return Boolean(
    m &&
      m.peso != null &&
      m.altura != null &&
      m.edad != null &&
      m.sexo &&
      m.objetivo &&
      m.nivel_actividad
  );
}
