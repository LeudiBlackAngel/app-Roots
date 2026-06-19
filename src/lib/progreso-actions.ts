"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_PROGRESO } from "@/lib/progreso";

export type ProgresoState = {
  error?: string | null;
  message?: string | null;
};

const TIPOS = ["antes", "despues", "seguimiento"] as const;
const EXT_PERMITIDAS = ["jpg", "jpeg", "png", "webp"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// --- Peso corporal ----------------------------------------------------------

export async function registrarPesoAction(
  _prev: ProgresoState,
  formData: FormData
): Promise<ProgresoState> {
  const peso = Number(String(formData.get("peso_kg") ?? "").replace(",", "."));
  const fechaRaw = String(formData.get("fecha") ?? "").trim();

  if (!Number.isFinite(peso) || peso < 20 || peso > 400) {
    return { error: "El peso debe estar entre 20 y 400 kg." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  const fila: { user_id: string; peso_kg: number; fecha?: string } = {
    user_id: user.id,
    peso_kg: peso,
  };
  if (fechaRaw) fila.fecha = fechaRaw;

  const { error } = await supabase.from("peso_corporal").insert(fila);
  if (error) return { error: "No se pudo guardar: " + error.message };

  revalidatePath("/progreso");
  return { message: "Peso registrado." };
}

// --- Fotos de progreso ------------------------------------------------------

export async function subirFotoAction(
  _prev: ProgresoState,
  formData: FormData
): Promise<ProgresoState> {
  const archivo = formData.get("foto");
  const tipoRaw = String(formData.get("tipo") ?? "seguimiento");
  const fechaRaw = String(formData.get("fecha") ?? "").trim();
  const tipo = (TIPOS as readonly string[]).includes(tipoRaw)
    ? tipoRaw
    : "seguimiento";

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Selecciona una imagen." };
  }
  if (archivo.size > MAX_BYTES) {
    return { error: "La imagen supera el máximo de 8 MB." };
  }

  const ext = (archivo.name.split(".").pop() ?? "").toLowerCase();
  if (!EXT_PERMITIDAS.includes(ext)) {
    return { error: "Formato no permitido (usa jpg, png o webp)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  // Ruta SIEMPRE dentro de la carpeta del propio usuario: {user_id}/{archivo}
  const path = `${user.id}/${randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET_PROGRESO)
    .upload(path, archivo, {
      contentType: archivo.type || `image/${ext}`,
      upsert: false,
    });
  if (upErr) return { error: "No se pudo subir la imagen: " + upErr.message };

  const fila: {
    user_id: string;
    foto_path: string;
    tipo: string;
    fecha?: string;
  } = { user_id: user.id, foto_path: path, tipo };
  if (fechaRaw) fila.fecha = fechaRaw;

  const { error: insErr } = await supabase
    .from("fotos_progreso")
    .insert(fila);
  if (insErr) {
    // Limpia el archivo si falló el registro en BD.
    await supabase.storage.from(BUCKET_PROGRESO).remove([path]);
    return { error: "No se pudo guardar la foto: " + insErr.message };
  }

  revalidatePath("/progreso");
  return { message: "Foto subida." };
}

export async function borrarFotoAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const path = String(formData.get("path") ?? "").trim();
  if (!id || !path) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Borra primero el objeto del Storage y luego la fila (RLS garantiza dueño).
  await supabase.storage.from(BUCKET_PROGRESO).remove([path]);
  await supabase
    .from("fotos_progreso")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/progreso");
}
