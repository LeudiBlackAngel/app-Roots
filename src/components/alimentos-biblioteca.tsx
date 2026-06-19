"use client";

import { useState } from "react";
import type { Alimento } from "@/lib/alimentos-tipos";
import { CATEGORIAS_ALIMENTO } from "@/lib/alimentos-tipos";

export default function AlimentosBiblioteca({
  alimentos,
}: {
  alimentos: Alimento[];
}) {
  const [cat, setCat] = useState<string>("todos");

  const filtrados =
    cat === "todos"
      ? alimentos
      : alimentos.filter((a) => a.categoria === cat);

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip activo={cat === "todos"} onClick={() => setCat("todos")}>
          Todos
        </Chip>
        {CATEGORIAS_ALIMENTO.map((c) => (
          <Chip key={c} activo={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/60 text-left text-neutral-400">
            <tr>
              <th className="px-3 py-2 font-medium">Alimento</th>
              <th className="px-3 py-2 font-medium">Categoría</th>
              <th className="px-3 py-2 font-medium text-right">Cal</th>
              <th className="px-3 py-2 font-medium text-right">Prot</th>
              <th className="px-3 py-2 font-medium text-right">Carb</th>
              <th className="px-3 py-2 font-medium text-right">Grasa</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a) => (
              <tr key={a.id} className="border-t border-neutral-800">
                <td className="px-3 py-2 font-medium">{a.nombre}</td>
                <td className="px-3 py-2 capitalize text-emerald-400">
                  {a.categoria ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">{a.calorias_100g}</td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {a.proteina_100g ?? "—"}
                </td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {a.carbos_100g ?? "—"}
                </td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {a.grasa_100g ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Valores por 100 g. Cal = calorías; Prot/Carb/Grasa en gramos.
      </p>

      {filtrados.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-500">
          No hay alimentos en esta categoría.
        </p>
      )}
    </>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 text-sm capitalize transition " +
        (activo
          ? "bg-emerald-600 text-white"
          : "border border-neutral-700 text-neutral-400 hover:bg-neutral-800")
      }
    >
      {children}
    </button>
  );
}
