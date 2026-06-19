// Tipos y constantes puras de alimentos. SIN imports de servidor, para poder
// usarse tanto en componentes de cliente como de servidor.

export type Alimento = {
  id: string;
  nombre: string;
  categoria: string | null;
  calorias_100g: number;
  proteina_100g: number | null;
  carbos_100g: number | null;
  grasa_100g: number | null;
  created_at: string;
};

export const CATEGORIAS_ALIMENTO = [
  "proteina",
  "carbohidrato",
  "grasa",
  "vegetal",
  "fruta",
  "lacteo",
  "bebida",
] as const;

export const MOMENTOS = ["desayuno", "almuerzo", "cena", "snack"] as const;
export type Momento = (typeof MOMENTOS)[number];

export const MOMENTO_LABEL: Record<Momento, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  snack: "Snack",
};

/** Macros/calorías de un alimento para una cantidad en gramos. */
export function calcularPorcion(
  a: Pick<
    Alimento,
    "calorias_100g" | "proteina_100g" | "carbos_100g" | "grasa_100g"
  >,
  cantidadG: number
): { calorias: number; proteina: number; carbos: number; grasa: number } {
  const factor = cantidadG / 100;
  const r1 = (n: number | null) => Math.round((n ?? 0) * factor * 10) / 10;
  return {
    calorias: Math.round((a.calorias_100g ?? 0) * factor),
    proteina: r1(a.proteina_100g),
    carbos: r1(a.carbos_100g),
    grasa: r1(a.grasa_100g),
  };
}
