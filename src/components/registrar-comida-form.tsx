"use client";

import { useActionState, useMemo, useState } from "react";
import {
  registrarComidaAction,
  type ComidaState,
} from "@/lib/comidas-actions";
import {
  calcularPorcion,
  MOMENTOS,
  MOMENTO_LABEL,
  type Alimento,
} from "@/lib/alimentos-tipos";

const initialState: ComidaState = { error: null, message: null };

const inputClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-emerald-500";

type AlimentoBase = Pick<
  Alimento,
  "id" | "nombre" | "calorias_100g" | "proteina_100g" | "carbos_100g" | "grasa_100g"
>;

export default function RegistrarComidaForm({
  alimentos,
}: {
  alimentos: AlimentoBase[];
}) {
  const [state, action, pending] = useActionState(
    registrarComidaAction,
    initialState
  );

  const [modo, setModo] = useState<"base" | "libre">("base");
  const [alimentoId, setAlimentoId] = useState("");
  const [cantidad, setCantidad] = useState("");

  const alimento = useMemo(
    () => alimentos.find((a) => a.id === alimentoId),
    [alimentos, alimentoId]
  );

  const preview = useMemo(() => {
    const g = Number(cantidad.replace(",", "."));
    if (!alimento || !Number.isFinite(g) || g <= 0) return null;
    return calcularPorcion(alimento, g);
  }, [alimento, cantidad]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Selector de modo */}
      <div className="flex gap-2">
        <BotonModo activo={modo === "base"} onClick={() => setModo("base")}>
          Desde la base
        </BotonModo>
        <BotonModo activo={modo === "libre"} onClick={() => setModo("libre")}>
          Texto libre
        </BotonModo>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Momento</span>
          <select name="momento" required defaultValue="desayuno" className={inputClass}>
            {MOMENTOS.map((m) => (
              <option key={m} value={m}>
                {MOMENTO_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {modo === "base" ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-300">Alimento</span>
              <select
                name="alimento_id"
                required
                value={alimentoId}
                onChange={(e) => setAlimentoId(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Elige un alimento…
                </option>
                {alimentos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-300">Cantidad (g)</span>
              <input
                name="cantidad_g"
                type="number"
                step="1"
                min={1}
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="150"
                className={inputClass}
              />
            </label>
          </div>

          {preview && (
            <p className="rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-sm text-neutral-300">
              ≈ <span className="font-semibold">{preview.calorias} kcal</span> · P{" "}
              {preview.proteina} g · C {preview.carbos} g · G {preview.grasa} g
            </p>
          )}
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-300">¿Qué comiste?</span>
            <input
              name="descripcion"
              type="text"
              required
              placeholder="Ej: Sancocho casero"
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Calorías
              <input
                name="calorias"
                type="number"
                step="1"
                min={0}
                required
                placeholder="kcal"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Proteína (g)
              <input name="proteina" type="number" step="0.1" min={0} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Carbos (g)
              <input name="carbos" type="number" step="0.1" min={0} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Grasa (g)
              <input name="grasa" type="number" step="0.1" min={0} className={inputClass} />
            </label>
          </div>
        </>
      )}

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
        {pending ? "Guardando…" : "Registrar comida"}
      </button>
    </form>
  );
}

function BotonModo({
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
        "rounded-md px-3 py-1.5 text-sm font-medium transition " +
        (activo
          ? "bg-emerald-600 text-white"
          : "border border-neutral-700 text-neutral-400 hover:bg-neutral-800")
      }
    >
      {children}
    </button>
  );
}
