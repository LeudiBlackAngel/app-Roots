"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { Ejercicio } from "@/lib/ejercicios-tipos";
import { GRUPOS_MUSCULARES } from "@/lib/ejercicios-tipos";
import {
  actualizarEjercicioAction,
  borrarEjercicioAction,
  crearEjercicioAction,
  type AdminEjercicioState,
} from "@/lib/admin-ejercicios-actions";

const initialState: AdminEjercicioState = { error: null, message: null };

const inputClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-emerald-500";

function CamposEjercicio({ e }: { e?: Ejercicio }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="nombre"
          required
          placeholder="Nombre"
          defaultValue={e?.nombre ?? ""}
          className={inputClass}
        />
        <select
          name="grupo_muscular"
          required
          defaultValue={e?.grupo_muscular ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Grupo muscular…
          </option>
          {GRUPOS_MUSCULARES.map((g) => (
            <option key={g} value={g} className="capitalize">
              {g}
            </option>
          ))}
        </select>
      </div>
      <textarea
        name="instrucciones"
        placeholder="Instrucciones"
        defaultValue={e?.instrucciones ?? ""}
        rows={2}
        className={inputClass}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="imagen_url"
          placeholder="URL de imagen"
          defaultValue={e?.imagen_url ?? ""}
          className={inputClass}
        />
        <input
          name="video_url"
          placeholder="URL de video"
          defaultValue={e?.video_url ?? ""}
          className={inputClass}
        />
      </div>
    </>
  );
}

function CrearEjercicio() {
  const [state, action, pending] = useActionState(
    crearEjercicioAction,
    initialState
  );
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <h2 className="text-lg font-semibold">Agregar ejercicio</h2>
      <CamposEjercicio />
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
        {pending ? "Creando…" : "Crear"}
      </button>
    </form>
  );
}

function FilaEjercicio({ e }: { e: Ejercicio }) {
  const [editando, setEditando] = useState(false);
  const [state, action, pending] = useActionState(
    actualizarEjercicioAction,
    initialState
  );

  return (
    <li className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      {!editando ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-emerald-400">
              {e.grupo_muscular}
            </span>
            <p className="font-medium">{e.nombre}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              Editar
            </button>
            <form action={borrarEjercicioAction}>
              <input type="hidden" name="id" value={e.id} />
              <button
                type="submit"
                className="rounded-md border border-red-900 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/40"
              >
                Borrar
              </button>
            </form>
          </div>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={e.id} />
          <CamposEjercicio e={e} />
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Cerrar
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

export default function AdminEjerciciosManager({
  ejercicios,
}: {
  ejercicios: Ejercicio[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <CrearEjercicio />

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Ejercicios ({ejercicios.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {ejercicios.map((e) => (
            <FilaEjercicio key={e.id} e={e} />
          ))}
        </ul>
      </div>
    </div>
  );
}
