// ============================================================================
// FitApp · Llamada a la API de Claude (SOLO server-side)
// ----------------------------------------------------------------------------
// Nunca se importa desde componentes de cliente. Requiere ANTHROPIC_API_KEY.
// ============================================================================

import "server-only";

// Modelo económico para mantener el costo bajo (la personalización es opcional).
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
// Modelo con visión para leer facturas (mejor calidad en OCR/visión que Haiku).
const CLAUDE_VISION_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export type CatalogoEjercicio = {
  id: string;
  nombre: string;
  grupo_muscular: string;
};

export type PerfilIA = {
  objetivo: string;
  nivel_actividad: string | null;
  restricciones: string[];
  peso: number | null;
  altura: number | null;
  edad: number | null;
  sexo: string | null;
};

export type RutinaBaseItem = {
  dia: number;
  ejercicio_nombre: string;
  series: number;
  reps: string;
};

export type RutinaIA = {
  nombre: string;
  dias: {
    dia: number;
    ejercicios: {
      ejercicio_id: string;
      series: number;
      reps: string;
      orden: number;
    }[];
  }[];
};

export type ResultadoIA =
  | { ok: true; rutina: RutinaIA }
  | { ok: false; error: string };

/** Extrae el primer bloque JSON del texto devuelto por el modelo. */
function extraerJSON(texto: string): unknown {
  const limpio = texto.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  try {
    return JSON.parse(limpio);
  } catch {
    const ini = limpio.indexOf("{");
    const fin = limpio.lastIndexOf("}");
    if (ini >= 0 && fin > ini) {
      return JSON.parse(limpio.slice(ini, fin + 1));
    }
    throw new Error("Respuesta de IA no es JSON válido.");
  }
}

/**
 * Pide a Claude una rutina personalizada. Valida que todos los ejercicio_id
 * existan en el catálogo recibido (descarta los inventados).
 */
export async function personalizarRutinaConClaude(args: {
  perfil: PerfilIA;
  rutinaBase: RutinaBaseItem[];
  catalogo: CatalogoEjercicio[];
}): Promise<ResultadoIA> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "La personalización con IA no está configurada (falta ANTHROPIC_API_KEY).",
    };
  }

  const { perfil, rutinaBase, catalogo } = args;
  const idsValidos = new Set(catalogo.map((c) => c.id));

  const catalogoTexto = catalogo
    .map((c) => `${c.id} | ${c.nombre} | ${c.grupo_muscular}`)
    .join("\n");

  const system = [
    {
      type: "text",
      text:
        "Eres un entrenador personal. Diseñas rutinas de gimnasio seguras y " +
        "efectivas. Respondes SIEMPRE con un único objeto JSON válido, sin texto " +
        "adicional, sin markdown. Esquema exacto:\n" +
        '{ "nombre": string, "dias": [ { "dia": number, "ejercicios": [ ' +
        '{ "ejercicio_id": string, "series": number, "reps": string, "orden": number } ] } ] }\n' +
        "Usa EXCLUSIVAMENTE ejercicio_id que existan en el catálogo. No inventes ids.",
    },
    {
      // Catálogo marcado para cache (cambia poco entre llamadas).
      type: "text",
      text: `CATÁLOGO DE EJERCICIOS (id | nombre | grupo):\n${catalogoTexto}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  const userPrompt =
    `Perfil del usuario:\n` +
    `- Objetivo: ${perfil.objetivo}\n` +
    `- Nivel de actividad: ${perfil.nivel_actividad ?? "n/d"}\n` +
    `- Restricciones alimenticias: ${
      perfil.restricciones.length ? perfil.restricciones.join(", ") : "ninguna"
    }\n` +
    `- Datos: ${perfil.peso ?? "?"} kg, ${perfil.altura ?? "?"} cm, ${
      perfil.edad ?? "?"
    } años, ${perfil.sexo ?? "?"}\n\n` +
    `Rutina base a ajustar (respeta el nº de días):\n` +
    rutinaBase
      .map(
        (r) => `Día ${r.dia}: ${r.ejercicio_nombre} — ${r.series}x${r.reps}`
      )
      .join("\n") +
    `\n\nAjusta volumen/selección de ejercicios al objetivo y nivel del usuario. ` +
    `Devuelve SOLO el JSON.`;

  let respuesta: Response;
  try {
    respuesta = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch {
    return { ok: false, error: "No se pudo contactar a la IA. Intenta luego." };
  }

  if (!respuesta.ok) {
    return {
      ok: false,
      error: `La IA respondió con error (${respuesta.status}).`,
    };
  }

  let texto = "";
  try {
    const data = await respuesta.json();
    texto = (data?.content?.[0]?.text as string) ?? "";
  } catch {
    return { ok: false, error: "Respuesta de IA ilegible." };
  }

  let parsed: RutinaIA;
  try {
    parsed = extraerJSON(texto) as RutinaIA;
  } catch {
    return { ok: false, error: "La IA no devolvió un JSON válido." };
  }

  // Filtra ids inventados y normaliza.
  const dias = (parsed.dias ?? [])
    .map((d) => ({
      dia: Number(d.dia),
      ejercicios: (d.ejercicios ?? [])
        .filter((e) => idsValidos.has(e.ejercicio_id))
        .map((e, i) => ({
          ejercicio_id: e.ejercicio_id,
          series: Math.max(1, Math.round(Number(e.series) || 3)),
          reps: String(e.reps ?? "8-12"),
          orden: Number(e.orden) || i + 1,
        })),
    }))
    .filter((d) => d.ejercicios.length > 0);

  if (dias.length === 0) {
    return { ok: false, error: "La IA no produjo ejercicios válidos." };
  }

  return {
    ok: true,
    rutina: { nombre: parsed.nombre || "Rutina personalizada con IA", dias },
  };
}

// ============================================================================
// Dietas
// ============================================================================

export type CatalogoAlimento = {
  id: string;
  nombre: string;
  categoria: string | null;
  calorias_100g: number;
};

export type PerfilDietaIA = {
  objetivo: string;
  calorias_objetivo: number | null;
  macros: { proteina_g: number; carbos_g: number; grasa_g: number } | null;
  restricciones: string[];
};

export type DietaBaseItem = {
  momento: string;
  alimento_nombre: string;
  cantidad_g: number;
};

export type DietaIA = {
  nombre: string;
  comidas: {
    momento: string;
    alimento_id: string;
    cantidad_g: number;
    orden: number;
  }[];
};

export type ResultadoDietaIA =
  | { ok: true; dieta: DietaIA }
  | { ok: false; error: string };

const MOMENTOS_VALIDOS = new Set(["desayuno", "almuerzo", "cena", "snack"]);

/**
 * Pide a Claude una dieta personalizada que respete restricciones y se acerque
 * a las calorías/macros objetivo. Valida que los alimento_id existan.
 */
export async function personalizarDietaConClaude(args: {
  perfil: PerfilDietaIA;
  dietaBase: DietaBaseItem[];
  catalogo: CatalogoAlimento[];
}): Promise<ResultadoDietaIA> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "La personalización con IA no está configurada (falta ANTHROPIC_API_KEY).",
    };
  }

  const { perfil, dietaBase, catalogo } = args;
  const idsValidos = new Set(catalogo.map((c) => c.id));

  const catalogoTexto = catalogo
    .map(
      (c) =>
        `${c.id} | ${c.nombre} | ${c.categoria ?? "n/d"} | ${c.calorias_100g} kcal/100g`
    )
    .join("\n");

  const system = [
    {
      type: "text",
      text:
        "Eres un nutricionista. Diseñas planes de alimentación equilibrados y " +
        "realistas. Respondes SIEMPRE con un único objeto JSON válido, sin texto " +
        "adicional, sin markdown. Esquema exacto:\n" +
        '{ "nombre": string, "comidas": [ ' +
        '{ "momento": "desayuno"|"almuerzo"|"cena"|"snack", "alimento_id": string, ' +
        '"cantidad_g": number, "orden": number } ] }\n' +
        "Usa EXCLUSIVAMENTE alimento_id que existan en el catálogo. No inventes ids. " +
        "Respeta SIEMPRE las restricciones alimenticias del usuario.",
    },
    {
      // Catálogo marcado para cache (cambia poco entre llamadas).
      type: "text",
      text: `CATÁLOGO DE ALIMENTOS (id | nombre | categoria | kcal/100g):\n${catalogoTexto}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  const macrosTxt = perfil.macros
    ? `${perfil.macros.proteina_g}g proteína / ${perfil.macros.carbos_g}g carbos / ${perfil.macros.grasa_g}g grasa`
    : "n/d";

  const userPrompt =
    `Perfil del usuario:\n` +
    `- Objetivo: ${perfil.objetivo}\n` +
    `- Calorías objetivo: ${perfil.calorias_objetivo ?? "n/d"} kcal/día\n` +
    `- Macros objetivo: ${macrosTxt}\n` +
    `- Restricciones (OBLIGATORIO respetarlas): ${
      perfil.restricciones.length ? perfil.restricciones.join(", ") : "ninguna"
    }\n\n` +
    `Dieta base a ajustar (momentos: desayuno/almuerzo/cena/snack):\n` +
    dietaBase
      .map((d) => `${d.momento}: ${d.alimento_nombre} — ${d.cantidad_g} g`)
      .join("\n") +
    `\n\nAjusta alimentos y cantidades para acercarte a las calorías/macros ` +
    `objetivo y respetar las restricciones. Devuelve SOLO el JSON.`;

  let respuesta: Response;
  try {
    respuesta = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch {
    return { ok: false, error: "No se pudo contactar a la IA. Intenta luego." };
  }

  if (!respuesta.ok) {
    return {
      ok: false,
      error: `La IA respondió con error (${respuesta.status}).`,
    };
  }

  let texto = "";
  try {
    const data = await respuesta.json();
    texto = (data?.content?.[0]?.text as string) ?? "";
  } catch {
    return { ok: false, error: "Respuesta de IA ilegible." };
  }

  let parsed: DietaIA;
  try {
    parsed = extraerJSON(texto) as DietaIA;
  } catch {
    return { ok: false, error: "La IA no devolvió un JSON válido." };
  }

  // Filtra ids inventados y momentos inválidos; normaliza.
  const comidas = (parsed.comidas ?? [])
    .filter(
      (c) =>
        idsValidos.has(c.alimento_id) &&
        MOMENTOS_VALIDOS.has(String(c.momento))
    )
    .map((c, i) => ({
      momento: String(c.momento),
      alimento_id: c.alimento_id,
      cantidad_g: Math.max(1, Math.round(Number(c.cantidad_g) || 100)),
      orden: Number(c.orden) || i + 1,
    }));

  if (comidas.length === 0) {
    return { ok: false, error: "La IA no produjo comidas válidas." };
  }

  return {
    ok: true,
    dieta: { nombre: parsed.nombre || "Dieta personalizada con IA", comidas },
  };
}

// ============================================================================
// Escáner de facturas (visión) + sugerencias de platos
// ============================================================================

export type AlimentoFactura = {
  nombre: string;
  cantidad_estimada: string | null;
  categoria: string | null;
};

export type ResultadoFactura =
  | { ok: true; alimentos: AlimentoFactura[] }
  | { ok: false; error: string };

export type MediaTypeImagen =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

/**
 * Envía la imagen de una factura (base64) a Claude visión y extrae la lista de
 * alimentos comestibles, ignorando productos no alimenticios.
 */
export async function extraerAlimentosDeFactura(args: {
  base64: string;
  mediaType: MediaTypeImagen;
}): Promise<ResultadoFactura> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "El escáner no está configurado (falta ANTHROPIC_API_KEY en el servidor).",
    };
  }

  const system =
    "Eres un asistente que lee facturas/recibos de supermercado. Extraes SOLO " +
    "los productos COMESTIBLES (alimentos y bebidas), ignorando artículos no " +
    "alimenticios (limpieza, higiene, etc.). Respondes SIEMPRE con un único " +
    "objeto JSON válido, sin texto adicional, sin markdown. Esquema exacto:\n" +
    '{ "alimentos": [ { "nombre": string, "cantidad_estimada": string, "categoria": string } ] }\n' +
    "Si no puedes leer la factura o no hay alimentos, devuelve { \"alimentos\": [] }.";

  let respuesta: Response;
  try {
    respuesta = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_VISION_MODEL,
        max_tokens: 1500,
        system,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: args.mediaType,
                  data: args.base64,
                },
              },
              {
                type: "text",
                text:
                  "Extrae los alimentos comestibles de esta factura. " +
                  "Devuelve SOLO el JSON con el esquema indicado.",
              },
            ],
          },
        ],
      }),
    });
  } catch {
    return { ok: false, error: "No se pudo contactar a la IA. Intenta luego." };
  }

  if (!respuesta.ok) {
    return {
      ok: false,
      error: `La IA respondió con error (${respuesta.status}).`,
    };
  }

  let texto = "";
  try {
    const data = await respuesta.json();
    texto = (data?.content?.[0]?.text as string) ?? "";
  } catch {
    return { ok: false, error: "Respuesta de IA ilegible." };
  }

  let parsed: { alimentos?: AlimentoFactura[] };
  try {
    parsed = extraerJSON(texto) as { alimentos?: AlimentoFactura[] };
  } catch {
    return { ok: false, error: "La IA no devolvió un JSON válido." };
  }

  const alimentos = (parsed.alimentos ?? [])
    .map((a) => ({
      nombre: String(a?.nombre ?? "").trim(),
      cantidad_estimada: a?.cantidad_estimada
        ? String(a.cantidad_estimada).trim()
        : null,
      categoria: a?.categoria ? String(a.categoria).trim() : null,
    }))
    .filter((a) => a.nombre.length > 0);

  return { ok: true, alimentos };
}

// --- Sugerencias de platos --------------------------------------------------

export type PerfilPlatos = {
  objetivo: string;
  calorias_objetivo: number | null;
  macros: { proteina_g: number; carbos_g: number; grasa_g: number } | null;
  restricciones: string[];
};

export type PlatoSugerido = {
  nombre_plato: string;
  descripcion: string;
  calorias_estimadas: number | null;
  ingredientes_usados: string[];
};

export type ResultadoPlatos =
  | { ok: true; platos: PlatoSugerido[] }
  | { ok: false; error: string };

/**
 * Sugiere 3-5 platos cocinables con los alimentos de la factura, respetando
 * restricciones y objetivo del usuario. `referencias` ancla calorías reales
 * de la tabla `alimentos` cuando hubo match (best-effort).
 */
export async function sugerirPlatosConClaude(args: {
  perfil: PerfilPlatos;
  alimentos: AlimentoFactura[];
  referencias: { nombre: string; calorias_100g: number }[];
}): Promise<ResultadoPlatos> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "El escáner no está configurado (falta ANTHROPIC_API_KEY).",
    };
  }

  const { perfil, alimentos, referencias } = args;

  if (alimentos.length === 0) {
    return {
      ok: false,
      error: "No hay alimentos detectados en la factura para sugerir platos.",
    };
  }

  const macrosTxt = perfil.macros
    ? `${perfil.macros.proteina_g}g proteína / ${perfil.macros.carbos_g}g carbos / ${perfil.macros.grasa_g}g grasa`
    : "n/d";

  const referenciasTxt = referencias.length
    ? referencias.map((r) => `${r.nombre}: ${r.calorias_100g} kcal/100g`).join("\n")
    : "(sin coincidencias en la base; estima las calorías tú mismo)";

  const system =
    "Eres un chef nutricionista. Sugieres platos caseros realistas a partir de " +
    "los ingredientes disponibles. Respondes SIEMPRE con un único objeto JSON " +
    "válido, sin texto adicional, sin markdown. Esquema exacto:\n" +
    '{ "platos": [ { "nombre_plato": string, "descripcion": string, ' +
    '"calorias_estimadas": number, "ingredientes_usados": [string] } ] }\n' +
    "Sugiere entre 3 y 5 platos. RESPETA SIEMPRE las restricciones alimenticias. " +
    "Usa solo ingredientes de la lista (puedes asumir básicos como sal, aceite, agua).";

  const userPrompt =
    `Perfil del usuario:\n` +
    `- Objetivo: ${perfil.objetivo}\n` +
    `- Calorías objetivo: ${perfil.calorias_objetivo ?? "n/d"} kcal/día\n` +
    `- Macros objetivo: ${macrosTxt}\n` +
    `- Restricciones (OBLIGATORIO respetarlas): ${
      perfil.restricciones.length ? perfil.restricciones.join(", ") : "ninguna"
    }\n\n` +
    `Ingredientes detectados en la factura:\n` +
    alimentos
      .map(
        (a) =>
          `- ${a.nombre}${a.cantidad_estimada ? ` (${a.cantidad_estimada})` : ""}`
      )
      .join("\n") +
    `\n\nCalorías de referencia (datos reales de la base, úsalas cuando apliquen):\n` +
    referenciasTxt +
    `\n\nSugiere 3-5 platos que encajen con el objetivo del usuario y respeten ` +
    `sus restricciones. Indica calorías estimadas por plato e ingredientes usados. ` +
    `Devuelve SOLO el JSON.`;

  let respuesta: Response;
  try {
    respuesta = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch {
    return { ok: false, error: "No se pudo contactar a la IA. Intenta luego." };
  }

  if (!respuesta.ok) {
    return {
      ok: false,
      error: `La IA respondió con error (${respuesta.status}).`,
    };
  }

  let texto = "";
  try {
    const data = await respuesta.json();
    texto = (data?.content?.[0]?.text as string) ?? "";
  } catch {
    return { ok: false, error: "Respuesta de IA ilegible." };
  }

  let parsed: { platos?: PlatoSugerido[] };
  try {
    parsed = extraerJSON(texto) as { platos?: PlatoSugerido[] };
  } catch {
    return { ok: false, error: "La IA no devolvió un JSON válido." };
  }

  const platos = (parsed.platos ?? [])
    .map((p) => ({
      nombre_plato: String(p?.nombre_plato ?? "").trim(),
      descripcion: String(p?.descripcion ?? "").trim(),
      calorias_estimadas:
        p?.calorias_estimadas != null && Number.isFinite(Number(p.calorias_estimadas))
          ? Math.round(Number(p.calorias_estimadas))
          : null,
      ingredientes_usados: Array.isArray(p?.ingredientes_usados)
        ? p.ingredientes_usados.map((i) => String(i)).filter(Boolean)
        : [],
    }))
    .filter((p) => p.nombre_plato.length > 0);

  if (platos.length === 0) {
    return { ok: false, error: "La IA no produjo platos válidos." };
  }

  return { ok: true, platos };
}
