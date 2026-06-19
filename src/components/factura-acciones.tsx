"use client";

import { useState, useTransition } from "react";
import {
  procesarFacturaAction,
  regenerarSugerenciasAction,
  type EscanerState,
} from "@/lib/escaner-actions";

function Mensaje({ state }: { state: EscanerState }) {
  if (state.error)
    return (
      <p className="mt-2 rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p className="mt-2 rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
        {state.message}
      </p>
    );
  return null;
}

export function ProcesarFacturaBoton({
  facturaId,
  restantes,
  label = "Procesar con IA",
}: {
  facturaId: string;
  restantes: number;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<EscanerState>({});
  const sinCupo = restantes <= 0;

  return (
    <div>
      <button
        type="button"
        disabled={pending || sinCupo}
        onClick={() =>
          start(async () => setState(await procesarFacturaAction(facturaId)))
        }
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        title={sinCupo ? "Sin escaneos disponibles hoy" : undefined}
      >
        {pending ? "Procesando…" : `✦ ${label}`}
      </button>
      <span className="ml-2 text-xs text-neutral-500">
        {restantes} escaneo{restantes === 1 ? "" : "s"} hoy
      </span>
      <Mensaje state={state} />
    </div>
  );
}

export function RegenerarSugerenciasBoton({
  facturaId,
}: {
  facturaId: string;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<EscanerState>({});

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => setState(await regenerarSugerenciasAction(facturaId)))
        }
        className="rounded-md border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-50"
      >
        {pending ? "Generando…" : "↻ Regenerar sugerencias"}
      </button>
      <span className="ml-2 text-xs text-neutral-500">
        (no gasta escaneo)
      </span>
      <Mensaje state={state} />
    </div>
  );
}
