// ============================================================================
// FitApp · Fase 1 · Calculadoras fit (funciones puras, sin efectos)
// ============================================================================

export type Sexo = "masculino" | "femenino";
export type Objetivo = "bajar_grasa" | "ganar_musculo" | "mantener";
export type NivelActividad =
  | "sedentario"
  | "ligero"
  | "moderado"
  | "activo"
  | "muy_activo";

export type Macros = {
  proteina_g: number;
  carbos_g: number;
  grasa_g: number;
};

export type ClasificacionIMC =
  | "bajo_peso"
  | "normal"
  | "sobrepeso"
  | "obesidad";

// --- Factores de actividad (TDEE = BMR * factor) ---------------------------
export const FACTOR_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
};

// --- Ajuste de calorías según objetivo (sobre el TDEE) ---------------------
export const AJUSTE_OBJETIVO: Record<Objetivo, number> = {
  bajar_grasa: 0.8, // déficit ~20%
  mantener: 1.0,
  ganar_musculo: 1.12, // superávit ~12%
};

/** Redondea a `decimales` posiciones decimales. */
function redondear(valor: number, decimales = 0): number {
  const f = 10 ** decimales;
  return Math.round(valor * f) / f;
}

// --- IMC --------------------------------------------------------------------

/** IMC = peso_kg / (altura_m^2). Redondeado a 1 decimal. */
export function calcularIMC(pesoKg: number, alturaCm: number): number {
  const alturaM = alturaCm / 100;
  if (alturaM <= 0) return 0;
  return redondear(pesoKg / (alturaM * alturaM), 1);
}

export function clasificarIMC(imc: number): ClasificacionIMC {
  if (imc < 18.5) return "bajo_peso";
  if (imc < 25) return "normal";
  if (imc < 30) return "sobrepeso";
  return "obesidad";
}

/** Etiqueta legible para la clasificación de IMC. */
export function etiquetaIMC(clasificacion: ClasificacionIMC): string {
  switch (clasificacion) {
    case "bajo_peso":
      return "Bajo peso";
    case "normal":
      return "Normal";
    case "sobrepeso":
      return "Sobrepeso";
    case "obesidad":
      return "Obesidad";
  }
}

// --- Calorías (Mifflin-St Jeor) --------------------------------------------

/** BMR según Mifflin-St Jeor. */
export function calcularBMR(
  sexo: Sexo,
  pesoKg: number,
  alturaCm: number,
  edad: number
): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  return sexo === "masculino" ? base + 5 : base - 161;
}

/** TDEE = BMR * factor de actividad. */
export function calcularTDEE(bmr: number, nivel: NivelActividad): number {
  return bmr * FACTOR_ACTIVIDAD[nivel];
}

/** Calorías objetivo = TDEE * ajuste según objetivo. Redondeado a entero. */
export function calcularCaloriasObjetivo(
  tdee: number,
  objetivo: Objetivo
): number {
  return redondear(tdee * AJUSTE_OBJETIVO[objetivo], 0);
}

// --- Macros -----------------------------------------------------------------

/**
 * Macros a partir de las calorías objetivo:
 *   proteina_g = 2.0 * peso_kg   (4 kcal/g)
 *   grasa_g    = 0.9 * peso_kg   (9 kcal/g)
 *   carbos_g   = resto de calorías / 4  (mínimo 0)
 * Gramos redondeados a entero.
 */
export function calcularMacros(
  caloriasObjetivo: number,
  pesoKg: number
): Macros {
  const proteinaG = redondear(2.0 * pesoKg, 0);
  const grasaG = redondear(0.9 * pesoKg, 0);
  const caloriasRestantes = caloriasObjetivo - proteinaG * 4 - grasaG * 9;
  const carbosG = Math.max(0, redondear(caloriasRestantes / 4, 0));
  return { proteina_g: proteinaG, carbos_g: carbosG, grasa_g: grasaG };
}

// --- Cálculo combinado para el perfil --------------------------------------

export type DatosMetricas = {
  peso: number;
  altura: number;
  edad: number;
  sexo: Sexo;
  objetivo: Objetivo;
  nivel_actividad: NivelActividad;
};

export type MetricasCalculadas = {
  imc: number;
  calorias_objetivo: number;
  macros: Macros;
};

/** Calcula imc, calorías objetivo y macros a partir de los datos del perfil. */
export function calcularMetricas(d: DatosMetricas): MetricasCalculadas {
  const imc = calcularIMC(d.peso, d.altura);
  const bmr = calcularBMR(d.sexo, d.peso, d.altura, d.edad);
  const tdee = calcularTDEE(bmr, d.nivel_actividad);
  const calorias_objetivo = calcularCaloriasObjetivo(tdee, d.objetivo);
  const macros = calcularMacros(calorias_objetivo, d.peso);
  return { imc, calorias_objetivo, macros };
}

// --- 1RM (Epley) — independiente, no se guarda en el perfil ----------------

/** 1RM estimado (Epley): peso * (1 + reps/30). Redondeado a 1 decimal. */
export function calcular1RM(pesoLevantado: number, reps: number): number {
  if (pesoLevantado <= 0 || reps <= 0) return 0;
  return redondear(pesoLevantado * (1 + reps / 30), 1);
}
