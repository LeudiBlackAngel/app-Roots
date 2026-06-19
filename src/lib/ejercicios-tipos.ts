// Tipos y constantes puras de ejercicios. SIN imports de servidor, para poder
// usarse tanto en componentes de cliente como de servidor.

export type Ejercicio = {
  id: string;
  nombre: string;
  grupo_muscular: string;
  instrucciones: string | null;
  imagen_url: string | null;
  video_url: string | null;
  created_at: string;
};

export const GRUPOS_MUSCULARES = [
  "pecho",
  "espalda",
  "piernas",
  "hombros",
  "brazos",
  "core",
  "cardio",
] as const;
