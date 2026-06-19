"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { desbloquearLogro, marcarActividad } from "@/lib/gamificacion";

export type RegistroState = {
  error?: string | null;
  message?: string | null;
};

function num(formData: FormData, campo: string): number | null {
  const raw = String(formData.get(campo) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function registrarSerieAction(
  _prev: RegistroState,
  formData: FormData
): Promise<RegistroState> {
  const ejercicio_id = String(formData.get("ejercicio_id") ?? "").trim();
  if (!ejercicio_id) return { error: "Falta el ejercicio." };

  const peso_levantado = num(formData, "peso_levantado");
  const reps = num(formData, "reps");
  const series = num(formData, "series");
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (peso_levantado == null && reps == null && series == null) {
    return { error: "Indica al menos peso, reps o series." };
  }
  if (peso_levantado != null && (peso_levantado < 0 || peso_levantado > 1000)) {
    return { error: "Peso fuera de rango." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const { error } = await supabase.from("registros_entrenamiento").insert({
    user_id: user.id,
    ejercicio_id,
    peso_levantado,
    reps: reps != null ? Math.round(reps) : null,
    series: series != null ? Math.round(series) : null,
    notas,
  });

  if (error) return { error: "No se pudo guardar: " + error.message };

  // Gamificación: marca actividad del día y desbloquea logro de 1er entrenamiento.
  await marcarActividad(supabase);
  await desbloquearLogro(supabase, user.id, "primer_entrenamiento");

  revalidatePath(`/ejercicios/${ejercicio_id}`);
  revalidatePath("/dashboard");
  return { message: "Serie registrada." };
}
