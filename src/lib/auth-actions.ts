"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string | null;
  message?: string | null;
};

/** Traduce los mensajes de error mas comunes de Supabase Auth al espanol. */
function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Email o contrasena incorrectos.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ese email ya esta registrado. Inicia sesion.";
  if (m.includes("password should be at least"))
    return "La contrasena debe tener al menos 6 caracteres.";
  if (m.includes("email not confirmed"))
    return "Debes confirmar tu email antes de iniciar sesion.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "El email no es valido.";
  return msg;
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Completa email y contrasena." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: traducirError(error.message) };
  }

  redirect("/dashboard");
}

export async function registerAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!nombre || !email || !password) {
    return { error: "Completa nombre, email y contrasena." };
  }
  if (password.length < 6) {
    return { error: "La contrasena debe tener al menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger en la BD lee este `nombre` desde raw_user_meta_data.
      data: { nombre },
    },
  });

  if (error) {
    return { error: traducirError(error.message) };
  }

  // Si Supabase tiene activada la confirmacion por email, no hay sesion todavia.
  if (!data.session) {
    return {
      message:
        "Cuenta creada. Revisa tu correo para confirmar el email y luego inicia sesion.",
    };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
