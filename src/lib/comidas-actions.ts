"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularPorcion, MOMENTOS } from "@/lib/alimentos-tipos";
import { desbloquearLogro, marcarActividad } from "@/lib/gamificacion";

export type ComidaState = {
  error?: string | null;
  message?: string | null;
};

function numero(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function registrarComidaAction(
  _prev: ComidaState,
  formData: FormData
): Promise<ComidaState> {
  const momento = String(formData.get("momento") ?? "");
  if (!(MOMENTOS as readonly string[]).includes(momento)) {
    return { error: "Elige un momento del día válido." };
  }

  const alimentoId = String(formData.get("alimento_id") ?? "").trim() || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const cantidadG = numero(formData.get("cantidad_g"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  let fila: {
    user_id: string;
    momento: string;
    alimento_id: string | null;
    descripcion: string | null;
    cantidad_g: number | null;
    calorias: number | null;
    proteina: number | null;
    carbos: number | null;
    grasa: number | null;
  };

  if (alimentoId) {
    // Modo "desde la base": calcula calorías/macros desde el alimento + gramos.
    if (cantidadG == null || cantidadG <= 0) {
      return { error: "Indica la cantidad en gramos." };
    }
    const { data: alimento } = await supabase
      .from("alimentos")
      .select("nombre, calorias_100g, proteina_100g, carbos_100g, grasa_100g")
      .eq("id", alimentoId)
      .maybeSingle();
    if (!alimento) return { error: "Ese alimento ya no existe." };

    const p = calcularPorcion(alimento, cantidadG);
    fila = {
      user_id: user.id,
      momento,
      alimento_id: alimentoId,
      descripcion: alimento.nombre as string,
      cantidad_g: cantidadG,
      calorias: p.calorias,
      proteina: p.proteina,
      carbos: p.carbos,
      grasa: p.grasa,
    };
  } else {
    // Modo "texto libre": calorías manuales.
    const calorias = numero(formData.get("calorias"));
    if (!descripcion) {
      return { error: "Escribe qué comiste o elige un alimento de la base." };
    }
    if (calorias == null || calorias < 0) {
      return { error: "Indica las calorías (texto libre)." };
    }
    fila = {
      user_id: user.id,
      momento,
      alimento_id: null,
      descripcion,
      cantidad_g: cantidadG,
      calorias,
      proteina: numero(formData.get("proteina")),
      carbos: numero(formData.get("carbos")),
      grasa: numero(formData.get("grasa")),
    };
  }

  const { error } = await supabase.from("registro_comidas").insert(fila);
  if (error) return { error: "No se pudo guardar: " + error.message };

  // Gamificación: marca actividad del día y desbloquea logro de primera comida.
  await marcarActividad(supabase);
  await desbloquearLogro(supabase, user.id, "primer_registro_comida");

  revalidatePath("/comidas");
  revalidatePath("/dashboard");
  return { message: "Comida registrada." };
}

export async function borrarComidaAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("registro_comidas")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/comidas");
  revalidatePath("/dashboard");
}
