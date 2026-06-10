"use client";

import { useState } from "react";
import { calcular1RM } from "@/lib/calculadoras";

const inputClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-emerald-500";

// Porcentajes típicos del 1RM para una tabla de referencia rápida.
const PORCENTAJES = [
  { pct: 95, reps: 2 },
  { pct: 90, reps: 4 },
  { pct: 85, reps: 6 },
  { pct: 80, reps: 8 },
  { pct: 70, reps: 12 },
];

export default function Calculadora1RM() {
  const [peso, setPeso] = useState("");
  const [reps, setReps] = useState("");

  const pesoNum = Number(peso.replace(",", "."));
  const repsNum = Number(reps);
  const valido = pesoNum > 0 && repsNum > 0;
  const oneRm = valido ? calcular1RM(pesoNum, repsNum) : 0;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="text-lg font-semibold">Calculadora de 1RM (Epley)</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Estima tu repetición máxima a partir de una serie. Fórmula: peso × (1 +
        reps / 30).
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Peso levantado (kg)</span>
          <input
            type="number"
            step="0.5"
            min={0}
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="Ej: 80"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Repeticiones</span>
          <input
            type="number"
            step="1"
            min={1}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="Ej: 5"
            className={inputClass}
          />
        </label>
      </div>

      {valido && (
        <div className="mt-5">
          <div className="rounded-md border border-emerald-800 bg-emerald-950/30 px-4 py-3">
            <span className="text-sm text-neutral-400">Tu 1RM estimado</span>
            <p className="text-3xl font-bold text-emerald-400">{oneRm} kg</p>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-1 font-medium">% 1RM</th>
                <th className="py-1 font-medium">Peso</th>
                <th className="py-1 font-medium">≈ Reps</th>
              </tr>
            </thead>
            <tbody>
              {PORCENTAJES.map((row) => (
                <tr key={row.pct} className="border-t border-neutral-800">
                  <td className="py-1.5">{row.pct}%</td>
                  <td className="py-1.5 font-medium">
                    {Math.round((oneRm * row.pct) / 100)} kg
                  </td>
                  <td className="py-1.5 text-neutral-400">{row.reps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
