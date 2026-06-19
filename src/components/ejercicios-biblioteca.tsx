"use client";

import { useState } from "react";
import Link from "next/link";
import type { Ejercicio } from "@/lib/ejercicios-tipos";
import { GRUPOS_MUSCULARES } from "@/lib/ejercicios-tipos";

export default function EjerciciosBiblioteca({
  ejercicios,
}: {
  ejercicios: Ejercicio[];
}) {
  const [grupo, setGrupo] = useState<string>("todos");

  const filtrados =
    grupo === "todos"
      ? ejercicios
      : ejercicios.filter((e) => e.grupo_muscular === grupo);

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <FiltroChip activo={grupo === "todos"} onClick={() => setGrupo("todos")}>
          Todos
        </FiltroChip>
        {GRUPOS_MUSCULARES.map((g) => (
          <FiltroChip key={g} activo={grupo === g} onClick={() => setGrupo(g)}>
            {g}
          </FiltroChip>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((e) => (
          <Link
            key={e.id}
            href={`/ejercicios/${e.id}`}
            className="group rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 transition hover:border-emerald-700"
          >
            {e.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.imagen_url}
                alt={e.nombre}
                className="mb-3 h-36 w-full rounded-md object-cover"
              />
            ) : (
              <div className="mb-3 flex h-36 w-full items-center justify-center rounded-md bg-neutral-800 text-sm text-neutral-500">
                Sin imagen
              </div>
            )}
            <p className="text-xs uppercase tracking-wide text-emerald-400">
              {e.grupo_muscular}
            </p>
            <h3 className="mt-1 font-semibold group-hover:text-emerald-400">
              {e.nombre}
            </h3>
          </Link>
        ))}
      </div>

      {filtrados.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-500">
          No hay ejercicios en este grupo todavía.
        </p>
      )}
    </>
  );
}

function FiltroChip({
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
