"use client";

import { useState, useTransition } from "react";
import {
  asignarPlantillaAction,
  personalizarConIAAction,
  type RutinaActionState,
} from "@/lib/rutina-actions";

function Mensaje({ state }: { state: RutinaActionState }) {
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

export function GenerarRutinaBaseBoton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<RutinaActionState>({});

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => setState(await asignarPlantillaAction()))
        }
        className="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending ? "Generando…" : "Generar mi rutina base"}
      </button>
      <Mensaje state={state} />
    </div>
  );
}

export function PersonalizarIABoton({ restantes }: { restantes: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<RutinaActionState>({});
  const sinCupo = restantes <= 0;

  return (
    <div>
      <button
        type="button"
        disabled={pending || sinCupo}
        onClick={() =>
          start(async () => setState(await personalizarConIAAction()))
        }
        className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-950/40 disabled:opacity-50"
        title={sinCupo ? "Sin usos de IA disponibles hoy" : undefined}
      >
        {pending ? "Personalizando con IA…" : "✦ Personalizar con IA"}
      </button>
      <span className="ml-2 text-xs text-neutral-500">
        {restantes} uso{restantes === 1 ? "" : "s"} hoy
      </span>
      <Mensaje state={state} />
    </div>
  );
}
