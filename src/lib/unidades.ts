// ============================================================================
// FitApp · Conversión de unidades (capa de entrada/visualización)
// ----------------------------------------------------------------------------
// La base de datos SIEMPRE guarda kg y cm. Estas funciones puras solo convierten
// lo que el usuario ve/escribe; las fórmulas (IMC, calorías, macros) no cambian.
// ============================================================================

export type UnidadPeso = "kg" | "lb";
export type UnidadAltura = "cm" | "ft_in";

export const LB_POR_KG = 2.20462;
export const CM_POR_PIE = 30.48;
export const CM_POR_PULGADA = 2.54;

/** Redondea a 2 decimales. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Peso -------------------------------------------------------------------

/** kg -> lb. Ej: 70 -> 154.32 */
export function kgALb(kg: number): number {
  return r2(kg * LB_POR_KG);
}

/** lb -> kg. Ej: 154.32 -> 70 */
export function lbAKg(lb: number): number {
  return r2(lb / LB_POR_KG);
}

// --- Altura -----------------------------------------------------------------

export type PiesPulgadas = { pies: number; pulgadas: number };

/** cm -> pies y pulgadas (enteros). Ej: 175 -> { pies: 5, pulgadas: 9 } */
export function cmAPiesPulgadas(cm: number): PiesPulgadas {
  const totalPulgadas = cm / CM_POR_PULGADA;
  let pies = Math.floor(totalPulgadas / 12);
  let pulgadas = Math.round(totalPulgadas - pies * 12);
  // Si el redondeo deja 12 pulgadas, sube un pie.
  if (pulgadas === 12) {
    pies += 1;
    pulgadas = 0;
  }
  return { pies, pulgadas };
}

/** pies y pulgadas -> cm. Ej: 5'9" -> 175.26 */
export function piesPulgadasACm(pies: number, pulgadas: number): number {
  return r2(pies * CM_POR_PIE + pulgadas * CM_POR_PULGADA);
}
