"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";

export type AdminAlimentoState = {
  error?: string | null;
  message?: string | null;
};

function texto(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function numero(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function exigirAdmin(): Promise<string | null> {
  const role = await getUserRole();
  return role === "admin" ? null : "No autorizado.";
}

type CamposAlimento = {
  nombre: string;
  categoria: string | null;
  calorias_100g: number;
  proteina_100g: number | null;
  carbos_100g: number | null;
  grasa_100g: number | null;
};

function leerCampos(
  formData: FormData
): { ok: true; campos: CamposAlimento } | { ok: false; error: string } {
  const nombre = texto(formData.get("nombre"));
  const calorias_100g = numero(formData.get("calorias_100g"));
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (calorias_100g == null || calorias_100g < 0) {
    return { ok: false, error: "Las calorías por 100 g son obligatorias." };
  }
  return {
    ok: true,
    campos: {
      nombre,
      categoria: texto(formData.get("categoria")),
      calorias_100g,
      proteina_100g: numero(formData.get("proteina_100g")),
      carbos_100g: numero(formData.get("carbos_100g")),
      grasa_100g: numero(formData.get("grasa_100g")),
    },
  };
}

export async function crearAlimentoAction(
  _prev: AdminAlimentoState,
  formData: FormData
): Promise<AdminAlimentoState> {
  const noAdmin = await exigirAdmin();
  if (noAdmin) return { error: noAdmin };

  const parsed = leerCampos(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("alimentos").insert(parsed.campos);

  if (error) {
    if (error.code === "23505") {
      return { error: `Ya existe un alimento llamado "${parsed.campos.nombre}".` };
    }
    return { error: "No se pudo crear: " + error.message };
  }

  revalidatePath("/admin/alimentos");
  revalidatePath("/alimentos");
  return { message: `Alimento "${parsed.campos.nombre}" creado.` };
}

export async function actualizarAlimentoAction(
  _prev: AdminAlimentoState,
  formData: FormData
): Promise<AdminAlimentoState> {
  const noAdmin = await exigirAdmin();
  if (noAdmin) return { error: noAdmin };

  const id = texto(formData.get("id"));
  if (!id) return { error: "Falta el id del alimento." };

  const parsed = leerCampos(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("alimentos")
    .update(parsed.campos)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: `Ya existe un alimento llamado "${parsed.campos.nombre}".` };
    }
    return { error: "No se pudo actualizar: " + error.message };
  }

  revalidatePath("/admin/alimentos");
  revalidatePath("/alimentos");
  return { message: `Alimento "${parsed.campos.nombre}" actualizado.` };
}

export async function borrarAlimentoAction(formData: FormData): Promise<void> {
  const noAdmin = await exigirAdmin();
  if (noAdmin) return;

  const id = texto(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("alimentos").delete().eq("id", id);

  revalidatePath("/admin/alimentos");
  revalidatePath("/alimentos");
}
