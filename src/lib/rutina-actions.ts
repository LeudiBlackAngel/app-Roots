"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  personalizarRutinaConClaude,
  type CatalogoEjercicio,
  type RutinaBaseItem,
} from "@/lib/claude";
import { MAX_IA_DIARIO } from "@/lib/rutina";

export type RutinaActionState = {
  error?: string | null;
  message?: string | null;
};

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Clona la plantilla que coincide con el objetivo hacia rutinas_usuario. */
async function clonarPlantilla(
  supabase: SupabaseServer,
  userId: string,
  objetivo: string
): Promise<{ id: string } | null> {
  const { data: plantilla } = await supabase
    .from("rutinas_plantilla")
    .select("id, nombre, objetivo")
    .eq("objetivo", objetivo)
    .order("nivel", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!plantilla) return null;

  const { data: pEj } = await supabase
    .from("rutina_plantilla_ejercicios")
    .select("ejercicio_id, dia, series, reps, orden")
    .eq("rutina_id", plantilla.id);

  const { data: nueva, error } = await supabase
    .from("rutinas_usuario")
    .insert({
      user_id: userId,
      nombre: plantilla.nombre,
      objetivo: plantilla.objetivo,
      origen: "plantilla",
    })
    .select("id")
    .single();
  if (error || !nueva) return null;

  if (pEj && pEj.length > 0) {
    await supabase.from("rutina_usuario_ejercicios").insert(
      pEj.map((e) => ({
        rutina_usuario_id: nueva.id,
        ejercicio_id: e.ejercicio_id,
        dia: e.dia,
        series: e.series,
        reps: e.reps,
        orden: e.orden,
      }))
    );
  }

  return { id: nueva.id };
}

/** Genera la rutina base (plantilla) del usuario según su objetivo. */
export async function asignarPlantillaAction(): Promise<RutinaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  const { data: metrics } = await supabase
    .from("user_metrics")
    .select("objetivo")
    .eq("user_id", user.id)
    .maybeSingle();

  const objetivo = (metrics?.objetivo as string) ?? "mantener";

  const res = await clonarPlantilla(supabase, user.id, objetivo);
  if (!res) {
    return {
      error:
        "No encontramos una plantilla para tu objetivo. Avísale al admin para que cargue una.",
    };
  }

  revalidatePath("/rutina");
  return { message: "Rutina base generada." };
}

/** Personaliza la rutina con IA (server-side, con límite diario). */
export async function personalizarConIAAction(): Promise<RutinaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  // Configuración primero: si no hay API key, no gastamos crédito.
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error: "La personalización con IA aún no está configurada.",
    };
  }

  // Rutina base actual (más reciente).
  const { data: rutina } = await supabase
    .from("rutinas_usuario")
    .select("id, nombre, objetivo")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rutina) {
    return { error: "Primero genera tu rutina base." };
  }

  const { data: baseItems } = await supabase
    .from("rutina_usuario_ejercicios")
    .select("dia, series, reps, orden, ejercicio:ejercicios(nombre)")
    .eq("rutina_usuario_id", rutina.id)
    .order("dia", { ascending: true })
    .order("orden", { ascending: true });

  const rutinaBase: RutinaBaseItem[] = (baseItems ?? []).map(
    (it: {
      dia: number;
      series: number;
      reps: string;
      ejercicio: { nombre: string } | { nombre: string }[] | null;
    }) => {
      const ej = Array.isArray(it.ejercicio) ? it.ejercicio[0] : it.ejercicio;
      return {
        dia: it.dia,
        ejercicio_nombre: ej?.nombre ?? "Ejercicio",
        series: it.series,
        reps: it.reps,
      };
    }
  );

  // Perfil del usuario.
  const { data: metrics } = await supabase
    .from("user_metrics")
    .select("objetivo, nivel_actividad, restricciones, peso, altura, edad, sexo")
    .eq("user_id", user.id)
    .maybeSingle();

  // Catálogo de ejercicios.
  const { data: catalogoData } = await supabase
    .from("ejercicios")
    .select("id, nombre, grupo_muscular");
  const catalogo = (catalogoData as CatalogoEjercicio[]) ?? [];

  // Consume 1 crédito de IA de forma atómica (RLS + función SECURITY DEFINER).
  const { data: permitido, error: rpcError } = await supabase.rpc(
    "consumir_credito_ia",
    { p_max: MAX_IA_DIARIO }
  );
  if (rpcError) {
    return { error: "No se pudo verificar tu límite de IA. Intenta luego." };
  }
  if (permitido === false) {
    return {
      error: `Alcanzaste el límite de ${MAX_IA_DIARIO} personalizaciones con IA por hoy. Vuelve mañana.`,
    };
  }

  // Llamada a Claude (server-side).
  const resultado = await personalizarRutinaConClaude({
    perfil: {
      objetivo: (metrics?.objetivo as string) ?? rutina.objetivo,
      nivel_actividad: (metrics?.nivel_actividad as string) ?? null,
      restricciones: (metrics?.restricciones as string[]) ?? [],
      peso: (metrics?.peso as number) ?? null,
      altura: (metrics?.altura as number) ?? null,
      edad: (metrics?.edad as number) ?? null,
      sexo: (metrics?.sexo as string) ?? null,
    },
    rutinaBase,
    catalogo,
  });

  if (!resultado.ok) {
    return { error: resultado.error };
  }

  // Elimina rutinas IA anteriores del usuario para no acumular (conserva la
  // rutina base origen='plantilla'). El ON DELETE CASCADE borra sus ejercicios.
  await supabase
    .from("rutinas_usuario")
    .delete()
    .eq("user_id", user.id)
    .eq("origen", "ia");

  // Guarda la rutina IA como una nueva rutina_usuario (origen='ia').
  const { data: nueva, error: insErr } = await supabase
    .from("rutinas_usuario")
    .insert({
      user_id: user.id,
      nombre: resultado.rutina.nombre,
      objetivo: (metrics?.objetivo as string) ?? rutina.objetivo,
      origen: "ia",
    })
    .select("id")
    .single();
  if (insErr || !nueva) {
    return { error: "No se pudo guardar la rutina personalizada." };
  }

  const filas = resultado.rutina.dias.flatMap((d) =>
    d.ejercicios.map((e) => ({
      rutina_usuario_id: nueva.id,
      ejercicio_id: e.ejercicio_id,
      dia: d.dia,
      series: e.series,
      reps: e.reps,
      orden: e.orden,
    }))
  );
  if (filas.length > 0) {
    await supabase.from("rutina_usuario_ejercicios").insert(filas);
  }

  revalidatePath("/rutina");
  return { message: "¡Rutina personalizada con IA lista!" };
}
