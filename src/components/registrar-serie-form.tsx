"use client";

import { useActionState } from "react";
import {
  registrarSerieAction,
  type RegistroState,
} from "@/lib/entrenamiento-actions";

const initialState: RegistroState = { error: null, message: null };

const inputClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-emerald-500";

export default function RegistrarSerieForm({
  ejercicioId,
}: {
  ejercicioId: string;
}) {
  const [state, formAction, pending] = useActionState(
    registrarSerieAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="ejercicio_id" value={ejercicioId} />

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Peso (kg)</span>
          <input
            name="peso_levantado"
            type="number"
            step="0.5"
            min={0}
            placeholder="80"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Reps</span>
          <input
            name="reps"
            type="number"
            step="1"
            min={0}
            placeholder="8"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Series</span>
          <input
            name="series"
            type="number"
            step="1"
            min={0}
            placeholder="3"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-300">Notas (opcional)</span>
        <input
          name="notas"
          type="text"
          placeholder="Sensaciones, técnica, etc."
          className={inputClass}
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
        className="self-start rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Registrar serie"}
      </button>
    </form>
  );
}
