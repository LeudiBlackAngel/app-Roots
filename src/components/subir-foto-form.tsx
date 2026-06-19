"use client";

import { useActionState } from "react";
import { subirFotoAction, type ProgresoState } from "@/lib/progreso-actions";

const initialState: ProgresoState = { error: null, message: null };

const inputClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-emerald-500";

export default function SubirFotoForm() {
  const [state, action, pending] = useActionState(
    subirFotoAction,
    initialState
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-300">Imagen</span>
        <input
          name="foto"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-300">Tipo</span>
        <select name="tipo" defaultValue="seguimiento" className={inputClass}>
          <option value="antes">Antes</option>
          <option value="despues">Después</option>
          <option value="seguimiento">Seguimiento</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-300">Fecha (opcional)</span>
        <input name="fecha" type="date" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending ? "Subiendo…" : "Subir foto"}
      </button>

      {state.error && (
        <p className="w-full rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="w-full rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
          {state.message}
        </p>
      )}
    </form>
  );
}
