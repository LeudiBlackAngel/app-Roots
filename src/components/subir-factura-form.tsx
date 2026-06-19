"use client";

import { useActionState } from "react";
import { subirFacturaAction, type EscanerState } from "@/lib/escaner-actions";

const initialState: EscanerState = { error: null, message: null };

export default function SubirFacturaForm() {
  const [state, action, pending] = useActionState(
    subirFacturaAction,
    initialState
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="factura"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        required
        className="text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-white"
      />
      <p className="text-xs text-neutral-500">
        Toma o sube una foto clara de tu factura (jpg, png o webp, máx 10 MB).
      </p>

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
        className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending ? "Subiendo…" : "Subir factura"}
      </button>
    </form>
  );
}
