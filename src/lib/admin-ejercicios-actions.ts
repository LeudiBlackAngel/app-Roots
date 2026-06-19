"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";

export type AdminEjercicioState = {
  error?: string | null;
  message?: string | null;
};

function limpiar(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

async function exigirAdmin(): Promise<string | null> {
  const role = await getUserRole();
  return role === "admin" ? null : "No autorizado.";
}

export async function crearEjercicioAction(
  _prev: AdminEjercicioState,
  formData: FormData
): Promise<AdminEjercicioState> {
  const noAdmin = await exigirAdmin();
  if (noAdmin) return { error: noAdmin };

  const nombre = limpiar(formData.get("nombre"));
  const grupo_muscular = limpiar(formData.get("grupo_muscular"));
  if (!nombre || !grupo_muscular) {
    return { error: "Nombre y grupo muscular son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ejercicios").insert({
    nombre,
    grupo_muscular,
    instrucciones: limpiar(formData.get("instrucciones")),
    imagen_url: limpiar(formData.get("imagen_url")),
    video_url: limpiar(formData.get("video_url")),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `Ya existe un ejercicio llamado "${nombre}".` };
    }
    return { error: "No se pudo crear: " + error.message };
  }

  revalidatePath("/admin/ejercicios");
  revalidatePath("/ejercicios");
  return { message: `Ejercicio "${nombre}" creado.` };
}

export async function actualizarEjercicioAction(
  _prev: AdminEjercicioState,
  formData: FormData
): Promise<AdminEjercicioState> {
  const noAdmin = await exigirAdmin();
  if (noAdmin) return { error: noAdmin };

  const id = limpiar(formData.get("id"));
  const nombre = limpiar(formData.get("nombre"));
  const grupo_muscular = limpiar(formData.get("grupo_muscular"));
  if (!id) return { error: "Falta el id del ejercicio." };
  if (!nombre || !grupo_muscular) {
    return { error: "Nombre y grupo muscular son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ejercicios")
    .update({
      nombre,
      grupo_muscular,
      instrucciones: limpiar(formData.get("instrucciones")),
      imagen_url: limpiar(formData.get("imagen_url")),
      video_url: limpiar(formData.get("video_url")),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: `Ya existe un ejercicio llamado "${nombre}".` };
    }
    return { error: "No se pudo actualizar: " + error.message };
  }

  revalidatePath("/admin/ejercicios");
  revalidatePath("/ejercicios");
  return { message: `Ejercicio "${nombre}" actualizado.` };
}

export async function borrarEjercicioAction(formData: FormData): Promise<void> {
  const noAdmin = await exigirAdmin();
  if (noAdmin) return;

  const id = limpiar(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("ejercicios").delete().eq("id", id);

  revalidatePath("/admin/ejercicios");
  revalidatePath("/ejercicios");
}
