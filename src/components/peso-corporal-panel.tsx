"use client";

import { useActionState } from "react";
import {
  registrarPesoAction,
  type ProgresoState,
} from "@/lib/progreso-actions";
import GraficaLinea, { type PuntoLinea } from "@/components/grafica-linea";

const initialState: ProgresoState = { error: null, message: null };

const inputClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-emerald-500";

export default function PesoCorporalPanel({ puntos }: { puntos: PuntoLinea[] }) {
  const [state, action, pending] = useActionState(
    registrarPesoAction,
    initialState
  );

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="text-lg font-semibold">Peso corporal</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Registra tu peso para ver su evolución.
      </p>

      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Peso (kg)</span>
          <input
            name="peso_kg"
            type="number"
            step="0.1"
            min={20}
            max={400}
            required
            placeholder="75.5"
            className={inputClass}
          />
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
          {pending ? "Guardando…" : "Registrar"}
        </button>
      </form>

      {state.error && (
        <p className="mt-2 rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="mt-2 rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
          {state.message}
        </p>
      )}

      <div className="mt-5">
        <GraficaLinea datos={puntos} unidad="kg" />
      </div>
    </div>
  );
}
