"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  personalizarDietaConClaude,
  type CatalogoAlimento,
  type DietaBaseItem,
} from "@/lib/claude";
import { MAX_IA_DIARIO } from "@/lib/rutina";

export type DietaActionState = {
  error?: string | null;
  message?: string | null;
};

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Clona la plantilla cuyo objetivo coincida y cuyas calorias_aprox estén más
 * cerca de las calorías objetivo del usuario, hacia dietas_usuario.
 */
async function clonarPlantillaDieta(
  supabase: SupabaseServer,
  userId: string,
  objetivo: string,
  caloriasObjetivo: number | null
): Promise<{ id: string } | null> {
  const { data: plantillas } = await supabase
    .from("dietas_plantilla")
    .select("id, nombre, objetivo, calorias_aprox")
    .eq("objetivo", objetivo);

  if (!plantillas || plantillas.length === 0) return null;

  // Elige la plantilla con calorías más cercanas (si hay objetivo de calorías).
  const elegida =
    caloriasObjetivo != null
      ? plantillas.reduce((mejor, p) => {
          const dMejor = Math.abs(
            (mejor.calorias_aprox ?? 0) - caloriasObjetivo
          );
          const dP = Math.abs((p.calorias_aprox ?? 0) - caloriasObjetivo);
          return dP < dMejor ? p : mejor;
        })
      : plantillas[0];

  const { data: comidas } = await supabase
    .from("dieta_plantilla_comidas")
    .select("momento, alimento_id, cantidad_g, orden")
    .eq("dieta_plantilla_id", elegida.id);

  const { data: nueva, error } = await supabase
    .from("dietas_usuario")
    .insert({
      user_id: userId,
      nombre: elegida.nombre,
      objetivo: elegida.objetivo,
      origen: "plantilla",
    })
    .select("id")
    .single();
  if (error || !nueva) return null;

  if (comidas && comidas.length > 0) {
    await supabase.from("dieta_usuario_comidas").insert(
      comidas.map((c) => ({
        dieta_usuario_id: nueva.id,
        momento: c.momento,
        alimento_id: c.alimento_id,
        cantidad_g: c.cantidad_g,
        orden: c.orden,
      }))
    );
  }

  return { id: nueva.id };
}

/** Genera la dieta base (plantilla) del usuario según su objetivo/calorías. */
export async function asignarDietaPlantillaAction(): Promise<DietaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  const { data: metrics } = await supabase
    .from("user_metrics")
    .select("objetivo, calorias_objetivo")
    .eq("user_id", user.id)
    .maybeSingle();

  const objetivo = (metrics?.objetivo as string) ?? "mantener";
  const caloriasObjetivo = (metrics?.calorias_objetivo as number) ?? null;

  const res = await clonarPlantillaDieta(
    supabase,
    user.id,
    objetivo,
    caloriasObjetivo
  );
  if (!res) {
    return {
      error:
        "No encontramos una plantilla de dieta para tu objetivo. Avísale al admin.",
    };
  }

  revalidatePath("/dieta");
  return { message: "Dieta base generada." };
}

/** Personaliza la dieta con IA (server-side, con límite diario reusado). */
export async function personalizarDietaConIAAction(): Promise<DietaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  // Configuración primero: si no hay API key, no gastamos crédito.
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "La personalización con IA aún no está configurada." };
  }

  // Dieta base actual (más reciente).
  const { data: dieta } = await supabase
    .from("dietas_usuario")
    .select("id, nombre, objetivo")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!dieta) {
    return { error: "Primero genera tu dieta base." };
  }

  const { data: baseItems } = await supabase
    .from("dieta_usuario_comidas")
    .select("momento, cantidad_g, orden, alimento:alimentos(nombre)")
    .eq("dieta_usuario_id", dieta.id)
    .order("orden", { ascending: true });

  const dietaBase: DietaBaseItem[] = (baseItems ?? []).map(
    (it: {
      momento: string;
      cantidad_g: number;
      alimento: { nombre: string } | { nombre: string }[] | null;
    }) => {
      const al = Array.isArray(it.alimento) ? it.alimento[0] : it.alimento;
      return {
        momento: it.momento,
        alimento_nombre: al?.nombre ?? "Alimento",
        cantidad_g: it.cantidad_g,
      };
    }
  );

  // Perfil del usuario (incluye restricciones y macros).
  const { data: metrics } = await supabase
    .from("user_metrics")
    .select("objetivo, calorias_objetivo, macros, restricciones")
    .eq("user_id", user.id)
    .maybeSingle();

  // Catálogo de alimentos.
  const { data: catalogoData } = await supabase
    .from("alimentos")
    .select("id, nombre, categoria, calorias_100g");
  const catalogo = (catalogoData as CatalogoAlimento[]) ?? [];

  // Consume 1 crédito de IA de forma atómica (mismo contador que rutinas).
  const { data: permitido, error: rpcError } = await supabase.rpc(
    "consumir_credito_ia",
    { p_max: MAX_IA_DIARIO }
  );
  if (rpcError) {
    return { error: "No se pudo verificar tu límite de IA. Intenta luego." };
  }
  if (permitido === false) {
    return {
      error: `Alcanzaste el límite de ${MAX_IA_DIARIO} usos de IA por hoy. Vuelve mañana.`,
    };
  }

  // Llamada a Claude (server-side).
  const resultado = await personalizarDietaConClaude({
    perfil: {
      objetivo: (metrics?.objetivo as string) ?? dieta.objetivo,
      calorias_objetivo: (metrics?.calorias_objetivo as number) ?? null,
      macros:
        (metrics?.macros as {
          proteina_g: number;
          carbos_g: number;
          grasa_g: number;
        }) ?? null,
      restricciones: (metrics?.restricciones as string[]) ?? [],
    },
    dietaBase,
    catalogo,
  });

  if (!resultado.ok) {
    return { error: resultado.error };
  }

  // Elimina dietas IA anteriores para no acumular (conserva la base 'plantilla').
  await supabase
    .from("dietas_usuario")
    .delete()
    .eq("user_id", user.id)
    .eq("origen", "ia");

  // Guarda la dieta IA como nueva dieta_usuario (origen='ia').
  const { data: nueva, error: insErr } = await supabase
    .from("dietas_usuario")
    .insert({
      user_id: user.id,
      nombre: resultado.dieta.nombre,
      objetivo: (metrics?.objetivo as string) ?? dieta.objetivo,
      origen: "ia",
    })
    .select("id")
    .single();
  if (insErr || !nueva) {
    return { error: "No se pudo guardar la dieta personalizada." };
  }

  const filas = resultado.dieta.comidas.map((c) => ({
    dieta_usuario_id: nueva.id,
    momento: c.momento,
    alimento_id: c.alimento_id,
    cantidad_g: c.cantidad_g,
    orden: c.orden,
  }));
  if (filas.length > 0) {
    await supabase.from("dieta_usuario_comidas").insert(filas);
  }

  revalidatePath("/dieta");
  return { message: "¡Dieta personalizada con IA lista!" };
}
