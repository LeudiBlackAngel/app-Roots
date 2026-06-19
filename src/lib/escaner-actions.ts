"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_FACTURAS, MAX_ESCANER_DIARIO } from "@/lib/facturas";
import {
  extraerAlimentosDeFactura,
  sugerirPlatosConClaude,
  type AlimentoFactura,
  type MediaTypeImagen,
} from "@/lib/claude";

export type EscanerState = {
  error?: string | null;
  message?: string | null;
};

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const EXT_PERMITIDAS = ["jpg", "jpeg", "png", "webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function mediaTypeDeExt(ext: string): MediaTypeImagen {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

// --- Bloque 1: subir la factura --------------------------------------------

export async function subirFacturaAction(
  _prev: EscanerState,
  formData: FormData
): Promise<EscanerState> {
  const archivo = formData.get("factura");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Selecciona la foto de tu factura." };
  }
  if (archivo.size > MAX_BYTES) {
    return { error: "La imagen supera el máximo de 10 MB." };
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
    .from(BUCKET_FACTURAS)
    .upload(path, archivo, {
      contentType: archivo.type || mediaTypeDeExt(ext),
      upsert: false,
    });
  if (upErr) return { error: "No se pudo subir la imagen: " + upErr.message };

  const { error: insErr } = await supabase.from("facturas").insert({
    user_id: user.id,
    imagen_path: path,
    estado: "pendiente",
  });
  if (insErr) {
    await supabase.storage.from(BUCKET_FACTURAS).remove([path]);
    return { error: "No se pudo registrar la factura: " + insErr.message };
  }

  revalidatePath("/escaner");
  return { message: "Factura subida. Ahora pulsa “Procesar con IA”." };
}

// --- Bloque 3 (interno): generar y guardar sugerencias de platos ------------

async function generarSugerencias(
  supabase: SupabaseServer,
  userId: string,
  facturaId: string,
  alimentos: AlimentoFactura[]
): Promise<EscanerState> {
  // Perfil del usuario (objetivo, calorías, macros, restricciones).
  const { data: metrics } = await supabase
    .from("user_metrics")
    .select("objetivo, calorias_objetivo, macros, restricciones")
    .eq("user_id", userId)
    .maybeSingle();

  // Cruce best-effort con la tabla `alimentos` para anclar calorías reales.
  const { data: catalogo } = await supabase
    .from("alimentos")
    .select("nombre, calorias_100g");
  const lista = (catalogo as { nombre: string; calorias_100g: number }[]) ?? [];

  const referencias: { nombre: string; calorias_100g: number }[] = [];
  const vistos = new Set<string>();
  for (const item of alimentos) {
    const q = item.nombre.toLowerCase();
    const match = lista.find((a) => {
      const n = a.nombre.toLowerCase();
      return n === q || n.includes(q) || q.includes(n);
    });
    if (match && !vistos.has(match.nombre)) {
      vistos.add(match.nombre);
      referencias.push({ nombre: match.nombre, calorias_100g: match.calorias_100g });
    }
  }

  const resultado = await sugerirPlatosConClaude({
    perfil: {
      objetivo: (metrics?.objetivo as string) ?? "mantener",
      calorias_objetivo: (metrics?.calorias_objetivo as number) ?? null,
      macros:
        (metrics?.macros as {
          proteina_g: number;
          carbos_g: number;
          grasa_g: number;
        }) ?? null,
      restricciones: (metrics?.restricciones as string[]) ?? [],
    },
    alimentos,
    referencias,
  });

  if (!resultado.ok) return { error: resultado.error };

  // Reemplaza sugerencias previas de esta factura (no acumular).
  await supabase
    .from("sugerencias_platos")
    .delete()
    .eq("factura_id", facturaId)
    .eq("user_id", userId);

  const filas = resultado.platos.map((p) => ({
    factura_id: facturaId,
    user_id: userId,
    nombre_plato: p.nombre_plato,
    descripcion: p.descripcion,
    calorias_estimadas: p.calorias_estimadas,
    ingredientes_usados: p.ingredientes_usados,
  }));
  if (filas.length > 0) {
    await supabase.from("sugerencias_platos").insert(filas);
  }

  return { message: `Listo: ${filas.length} platos sugeridos.` };
}

// --- Bloque 2: procesar (visión) + generar sugerencias ----------------------

export async function procesarFacturaAction(
  facturaId: string
): Promise<EscanerState> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error:
        "El escáner no está configurado. Falta ANTHROPIC_API_KEY en el servidor.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  const { data: factura } = await supabase
    .from("facturas")
    .select("id, imagen_path, estado")
    .eq("id", facturaId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!factura) return { error: "No encontramos esa factura." };
  if (!factura.imagen_path) return { error: "La factura no tiene imagen." };

  // Límite diario de escaneos (contador propio, función SECURITY DEFINER).
  const { data: permitido, error: rpcError } = await supabase.rpc(
    "consumir_credito_escaner",
    { p_max: MAX_ESCANER_DIARIO }
  );
  if (rpcError) {
    return { error: "No se pudo verificar tu límite de escaneos. Intenta luego." };
  }
  if (permitido === false) {
    return {
      error: `Alcanzaste el límite de ${MAX_ESCANER_DIARIO} escaneos por hoy. Vuelve mañana.`,
    };
  }

  // Descarga la imagen del Storage y la pasa a base64 para la API.
  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET_FACTURAS)
    .download(factura.imagen_path);
  if (dlErr || !blob) {
    return { error: "No se pudo leer la imagen de la factura." };
  }
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  const ext = (factura.imagen_path.split(".").pop() ?? "jpg").toLowerCase();

  const extraccion = await extraerAlimentosDeFactura({
    base64,
    mediaType: mediaTypeDeExt(ext),
  });

  if (!extraccion.ok) {
    await supabase
      .from("facturas")
      .update({ estado: "error" })
      .eq("id", facturaId)
      .eq("user_id", user.id);
    revalidatePath("/escaner");
    return { error: extraccion.error };
  }

  await supabase
    .from("facturas")
    .update({ items_extraidos: extraccion.alimentos, estado: "procesada" })
    .eq("id", facturaId)
    .eq("user_id", user.id);

  // Genera las sugerencias a partir de lo extraído (misma operación).
  const sug = await generarSugerencias(
    supabase,
    user.id,
    facturaId,
    extraccion.alimentos
  );

  revalidatePath("/escaner");
  revalidatePath(`/escaner/${facturaId}`);

  if (sug.error) {
    return {
      message: `Factura procesada (${extraccion.alimentos.length} alimentos). Pero las sugerencias fallaron: ${sug.error}`,
    };
  }
  return {
    message: `Factura procesada: ${extraccion.alimentos.length} alimentos. ${sug.message}`,
  };
}

// --- Regenerar sugerencias (texto, sin gastar crédito de visión) ------------

export async function regenerarSugerenciasAction(
  facturaId: string
): Promise<EscanerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  const { data: factura } = await supabase
    .from("facturas")
    .select("id, items_extraidos, estado")
    .eq("id", facturaId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!factura) return { error: "No encontramos esa factura." };

  const items = (factura.items_extraidos as AlimentoFactura[] | null) ?? [];
  if (factura.estado !== "procesada" || items.length === 0) {
    return { error: "Primero procesa la factura para extraer los alimentos." };
  }

  const sug = await generarSugerencias(supabase, user.id, facturaId, items);
  revalidatePath(`/escaner/${facturaId}`);
  return sug;
}

// --- Borrar factura (imagen + fila; las sugerencias caen por cascade) -------

export async function borrarFacturaAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const path = String(formData.get("path") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (path) {
    await supabase.storage.from(BUCKET_FACTURAS).remove([path]);
  }
  await supabase.from("facturas").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/escaner");
}
