// Restricciones alimenticias permitidas (debe coincidir con las opciones del
// formulario de perfil). Vive en su propio módulo —no en el archivo "use server"—
// para poder importarse tanto desde el cliente como desde el servidor.
export const RESTRICCIONES_DISPONIBLES = [
  "vegetariano",
  "vegano",
  "sin_gluten",
  "sin_lactosa",
  "sin_frutos_secos",
  "sin_mariscos",
] as const;
