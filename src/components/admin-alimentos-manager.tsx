"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { Alimento } from "@/lib/alimentos-tipos";
import { CATEGORIAS_ALIMENTO } from "@/lib/alimentos-tipos";
import {
  actualizarAlimentoAction,
  borrarAlimentoAction,
  crearAlimentoAction,
  type AdminAlimentoState,
} from "@/lib/admin-alimentos-actions";

const initialState: AdminAlimentoState = { error: null, message: null };

const inputClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-emerald-500";

function CamposAlimento({ a }: { a?: Alimento }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="nombre"
          required
          placeholder="Nombre"
          defaultValue={a?.nombre ?? ""}
          className={inputClass}
        />
        <select
          name="categoria"
          defaultValue={a?.categoria ?? ""}
          className={inputClass}
        >
          <option value="">Categoría…</option>
          {CATEGORIAS_ALIMENTO.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Cal/100g
          <input
            name="calorias_100g"
            type="number"
            step="0.1"
            min={0}
            required
            defaultValue={a?.calorias_100g ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Prot/100g
          <input
            name="proteina_100g"
            type="number"
            step="0.1"
            min={0}
            defaultValue={a?.proteina_100g ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Carb/100g
          <input
            name="carbos_100g"
            type="number"
            step="0.1"
            min={0}
            defaultValue={a?.carbos_100g ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Grasa/100g
          <input
            name="grasa_100g"
            type="number"
            step="0.1"
            min={0}
            defaultValue={a?.grasa_100g ?? ""}
            className={inputClass}
          />
        </label>
      </div>
    </>
  );
}

function Mensaje({ state }: { state: AdminAlimentoState }) {
  if (state.error)
    return (
      <p className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p className="rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
        {state.message}
      </p>
    );
  return null;
}

function CrearAlimento() {
  const [state, action, pending] = useActionState(
    crearAlimentoAction,
    initialState
  );
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <h2 className="text-lg font-semibold">Agregar alimento</h2>
      <CamposAlimento />
      <Mensaje state={state} />
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

function FilaAlimento({ a }: { a: Alimento }) {
  const [editando, setEditando] = useState(false);
  const [state, action, pending] = useActionState(
    actualizarAlimentoAction,
    initialState
  );

  return (
    <li className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      {!editando ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-emerald-400">
              {a.categoria ?? "sin categoría"}
            </span>
            <p className="font-medium">{a.nombre}</p>
            <p className="text-xs text-neutral-500">
              {a.calorias_100g} cal · P {a.proteina_100g ?? "—"} · C{" "}
              {a.carbos_100g ?? "—"} · G {a.grasa_100g ?? "—"} (por 100 g)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              Editar
            </button>
            <form action={borrarAlimentoAction}>
              <input type="hidden" name="id" value={a.id} />
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
          <input type="hidden" name="id" value={a.id} />
          <CamposAlimento a={a} />
          <Mensaje state={state} />
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

export default function AdminAlimentosManager({
  alimentos,
}: {
  alimentos: Alimento[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <CrearAlimento />
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Alimentos ({alimentos.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {alimentos.map((a) => (
            <FilaAlimento key={a.id} a={a} />
          ))}
        </ul>
      </div>
    </div>
  );
}
