"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calcularMetricas,
  type NivelActividad,
  type Objetivo,
  type Sexo,
} from "@/lib/calculadoras";
import { RESTRICCIONES_DISPONIBLES } from "@/lib/restricciones";
import type { UnidadAltura, UnidadPeso } from "@/lib/unidades";
import { desbloquearLogro } from "@/lib/gamificacion";

export type PerfilState = {
  error?: string | null;
  message?: string | null;
};

const SEXOS: Sexo[] = ["masculino", "femenino"];
const OBJETIVOS: Objetivo[] = ["bajar_grasa", "ganar_musculo", "mantener"];
const NIVELES: NivelActividad[] = [
  "sedentario",
  "ligero",
  "moderado",
  "activo",
  "muy_activo",
];
const UNIDADES_PESO: UnidadPeso[] = ["kg", "lb"];
const UNIDADES_ALTURA: UnidadAltura[] = ["cm", "ft_in"];

function numero(formData: FormData, campo: string): number {
  return Number(String(formData.get(campo) ?? "").replace(",", "."));
}

export async function saveMetricsAction(
  _prevState: PerfilState,
  formData: FormData
): Promise<PerfilState> {
  const peso = numero(formData, "peso");
  const altura = numero(formData, "altura");
  const edad = numero(formData, "edad");
  const sexo = String(formData.get("sexo") ?? "") as Sexo;
  const objetivo = String(formData.get("objetivo") ?? "") as Objetivo;
  const nivel_actividad = String(
    formData.get("nivel_actividad") ?? ""
  ) as NivelActividad;
  const restricciones = formData
    .getAll("restricciones")
    .map((r) => String(r))
    .filter((r) => (RESTRICCIONES_DISPONIBLES as readonly string[]).includes(r));

  // Unidad de visualización preferida (se guarda en la cuenta, no afecta kg/cm).
  const unidadPesoRaw = String(formData.get("unidad_peso") ?? "") as UnidadPeso;
  const unidadAlturaRaw = String(
    formData.get("unidad_altura") ?? ""
  ) as UnidadAltura;
  const unidad_peso: UnidadPeso = UNIDADES_PESO.includes(unidadPesoRaw)
    ? unidadPesoRaw
    : "kg";
  const unidad_altura: UnidadAltura = UNIDADES_ALTURA.includes(unidadAlturaRaw)
    ? unidadAlturaRaw
    : "cm";

  // --- Validaciones básicas (rangos razonables) ---
  if (!Number.isFinite(peso) || peso < 20 || peso > 400) {
    return { error: "El peso debe estar entre 20 y 400 kg." };
  }
  if (!Number.isFinite(altura) || altura < 80 || altura > 260) {
    return { error: "La altura debe estar entre 80 y 260 cm." };
  }
  if (!Number.isInteger(edad) || edad < 10 || edad > 120) {
    return { error: "La edad debe estar entre 10 y 120 años." };
  }
  if (!SEXOS.includes(sexo)) {
    return { error: "Selecciona un sexo válido." };
  }
  if (!OBJETIVOS.includes(objetivo)) {
    return { error: "Selecciona un objetivo válido." };
  }
  if (!NIVELES.includes(nivel_actividad)) {
    return { error: "Selecciona un nivel de actividad válido." };
  }

  // --- Recalcula métricas ---
  const { imc, calorias_objetivo, macros } = calcularMetricas({
    peso,
    altura,
    edad,
    sexo,
    objetivo,
    nivel_actividad,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  const { error } = await supabase.from("user_metrics").upsert(
    {
      user_id: user.id,
      peso,
      altura,
      edad,
      sexo,
      objetivo,
      nivel_actividad,
      restricciones,
      imc,
      calorias_objetivo,
      macros,
      unidad_peso,
      unidad_altura,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { error: "No se pudo guardar tu perfil: " + error.message };
  }

  // Logro: perfil completo (se guardó con todos los campos válidos).
  await desbloquearLogro(supabase, user.id, "primer_perfil");

  revalidatePath("/dashboard");
  revalidatePath("/perfil");

  return {
    message: `Perfil guardado. IMC ${imc} · ${calorias_objetivo} kcal · P ${macros.proteina_g}g / C ${macros.carbos_g}g / G ${macros.grasa_g}g.`,
  };
}
