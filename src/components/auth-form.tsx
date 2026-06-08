"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "@/lib/auth-actions";

type Props = {
  mode: "login" | "registro";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
};

const initialState: AuthState = { error: null, message: null };

export default function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isRegistro = mode === "registro";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isRegistro && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Nombre</span>
          <input
            name="nombre"
            type="text"
            required
            autoComplete="name"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-emerald-500"
            placeholder="Tu nombre"
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-300">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-emerald-500"
          placeholder="tucorreo@ejemplo.com"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-300">Contrasena</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={isRegistro ? "new-password" : "current-password"}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-emerald-500"
          placeholder="Minimo 6 caracteres"
        />
      </label>

      {state.error && (
        <p className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-3 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending
          ? "Procesando..."
          : isRegistro
            ? "Crear cuenta"
            : "Iniciar sesion"}
      </button>

      {/* --- (Opcional, fase futura) Login con Google ---
      <button
        type="button"
        className="rounded-md border border-neutral-700 px-3 py-2 font-medium hover:bg-neutral-800"
        onClick={async () => {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
        }}
      >
        Continuar con Google
      </button>
      Requiere: 1) habilitar el provider Google en Supabase Auth, y
      2) crear una route /auth/callback que intercambie el code por sesion.
      --- */}

      <p className="text-center text-sm text-neutral-400">
        {isRegistro ? (
          <>
            Ya tienes cuenta?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Inicia sesion
            </Link>
          </>
        ) : (
          <>
            No tienes cuenta?{" "}
            <Link href="/registro" className="text-emerald-400 hover:underline">
              Registrate
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
