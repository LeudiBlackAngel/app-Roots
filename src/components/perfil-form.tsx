"use client";

import { useState } from "react";
import { useActionState } from "react";
import { saveMetricsAction, type PerfilState } from "@/lib/perfil-actions";
import { RESTRICCIONES_DISPONIBLES } from "@/lib/restricciones";
import type { UserMetrics } from "@/lib/metrics";
import {
  cmAPiesPulgadas,
  kgALb,
  lbAKg,
  piesPulgadasACm,
  type UnidadAltura,
  type UnidadPeso,
} from "@/lib/unidades";

const initialState: PerfilState = { error: null, message: null };

const OBJETIVOS: { value: string; label: string }[] = [
  { value: "bajar_grasa", label: "Bajar grasa" },
  { value: "ganar_musculo", label: "Ganar músculo" },
  { value: "mantener", label: "Mantener" },
];

const NIVELES: { value: string; label: string }[] = [
  { value: "sedentario", label: "Sedentario (poco o nada de ejercicio)" },
  { value: "ligero", label: "Ligero (1-3 días/semana)" },
  { value: "moderado", label: "Moderado (3-5 días/semana)" },
  { value: "activo", label: "Activo (6-7 días/semana)" },
  { value: "muy_activo", label: "Muy activo (físico + 2 sesiones/día)" },
];

const RESTRICCIONES_LABEL: Record<string, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  sin_gluten: "Sin gluten",
  sin_lactosa: "Sin lactosa",
  sin_frutos_secos: "Sin frutos secos",
  sin_mariscos: "Sin mariscos",
};

const inputClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-emerald-500";

function num(s: string): number {
  return Number(s.replace(",", "."));
}

// Botón de toggle de unidad reutilizable.
function ToggleUnidad<T extends string>({
  value,
  current,
  onClick,
  children,
}: {
  value: T;
  current: T;
  onClick: (v: T) => void;
  children: React.ReactNode;
}) {
  const activo = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={
        "rounded-md px-2.5 py-1 text-xs font-medium transition " +
        (activo
          ? "bg-emerald-600 text-white"
          : "border border-neutral-700 text-neutral-400 hover:bg-neutral-800")
      }
    >
      {children}
    </button>
  );
}

export default function PerfilForm({ initial }: { initial: UserMetrics | null }) {
  const [state, formAction, pending] = useActionState(
    saveMetricsAction,
    initialState
  );

  const restriccionesActuales = new Set(initial?.restricciones ?? []);

  const initialKg = initial?.peso ?? null;
  const initialCm = initial?.altura ?? null;

  // Unidad de visualización preferida: viene de la cuenta (user_metrics).
  const unidadPesoInicial: UnidadPeso = initial?.unidad_peso ?? "kg";
  const unidadAlturaInicial: UnidadAltura = initial?.unidad_altura ?? "cm";

  const [unidadPeso, setUnidadPeso] = useState<UnidadPeso>(unidadPesoInicial);
  const [unidadAltura, setUnidadAltura] =
    useState<UnidadAltura>(unidadAlturaInicial);

  // Valores de los inputs en la unidad mostrada, convertidos desde kg/cm según
  // la preferencia guardada. Es seguro hacerlo en el inicializador porque
  // `initial` es idéntico en servidor y cliente (no hay mismatch de hidratación).
  const [peso, setPeso] = useState<string>(() => {
    if (initialKg == null) return "";
    return String(unidadPesoInicial === "lb" ? kgALb(initialKg) : initialKg);
  });
  const [alturaCm, setAlturaCm] = useState<string>(
    initialCm != null && unidadAlturaInicial === "cm" ? String(initialCm) : ""
  );
  const [pies, setPies] = useState<string>(() => {
    if (initialCm == null || unidadAlturaInicial !== "ft_in") return "";
    return String(cmAPiesPulgadas(initialCm).pies);
  });
  const [pulgadas, setPulgadas] = useState<string>(() => {
    if (initialCm == null || unidadAlturaInicial !== "ft_in") return "";
    return String(cmAPiesPulgadas(initialCm).pulgadas);
  });

  // --- Valores canónicos (kg/cm) que se envían a la base de datos ---
  function pesoCanonKg(): number | null {
    const v = num(peso);
    if (!Number.isFinite(v) || peso.trim() === "") return null;
    return unidadPeso === "kg" ? v : lbAKg(v);
  }

  function alturaCanonCm(): number | null {
    if (unidadAltura === "cm") {
      const v = num(alturaCm);
      if (!Number.isFinite(v) || alturaCm.trim() === "") return null;
      return v;
    }
    if (pies.trim() === "" && pulgadas.trim() === "") return null;
    const ft = num(pies) || 0;
    const inch = num(pulgadas) || 0;
    return piesPulgadasACm(ft, inch);
  }

  // --- Cambios de unidad: convierten el valor mostrado y persisten preferencia ---
  function cambiarUnidadPeso(nueva: UnidadPeso) {
    if (nueva === unidadPeso) return;
    const kg = pesoCanonKg();
    if (kg != null) setPeso(String(nueva === "kg" ? kg : kgALb(kg)));
    setUnidadPeso(nueva);
  }

  function cambiarUnidadAltura(nueva: UnidadAltura) {
    if (nueva === unidadAltura) return;
    const cm = alturaCanonCm();
    if (nueva === "cm") {
      if (cm != null) setAlturaCm(String(cm));
    } else if (cm != null) {
      const { pies: ft, pulgadas: inch } = cmAPiesPulgadas(cm);
      setPies(String(ft));
      setPulgadas(String(inch));
    }
    setUnidadAltura(nueva);
  }

  const pesoKg = pesoCanonKg();
  const alturaCmCanon = alturaCanonCm();

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Inputs ocultos: SIEMPRE en kg y cm (lo que se guarda en la BD). */}
      <input type="hidden" name="peso" value={pesoKg ?? ""} />
      <input type="hidden" name="altura" value={alturaCmCanon ?? ""} />
      {/* Unidad preferida: se guarda en la cuenta (user_metrics). */}
      <input type="hidden" name="unidad_peso" value={unidadPeso} />
      <input type="hidden" name="unidad_altura" value={unidadAltura} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* PESO con toggle kg / lb */}
        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-center justify-between text-neutral-300">
            <span>Peso ({unidadPeso})</span>
            <span className="flex gap-1">
              <ToggleUnidad
                value="kg"
                current={unidadPeso}
                onClick={cambiarUnidadPeso}
              >
                kg
              </ToggleUnidad>
              <ToggleUnidad
                value="lb"
                current={unidadPeso}
                onClick={cambiarUnidadPeso}
              >
                lb
              </ToggleUnidad>
            </span>
          </span>
          <input
            type="number"
            step="0.1"
            min={0}
            required
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            className={inputClass}
            placeholder={unidadPeso === "kg" ? "Ej: 70" : "Ej: 154"}
          />
        </label>

        {/* ALTURA con toggle cm / pies-pulgadas */}
        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-center justify-between text-neutral-300">
            <span>Altura ({unidadAltura === "cm" ? "cm" : "ft/in"})</span>
            <span className="flex gap-1">
              <ToggleUnidad
                value="cm"
                current={unidadAltura}
                onClick={cambiarUnidadAltura}
              >
                cm
              </ToggleUnidad>
              <ToggleUnidad
                value="ft_in"
                current={unidadAltura}
                onClick={cambiarUnidadAltura}
              >
                ft/in
              </ToggleUnidad>
            </span>
          </span>

          {unidadAltura === "cm" ? (
            <input
              type="number"
              step="0.1"
              min={0}
              required
              value={alturaCm}
              onChange={(e) => setAlturaCm(e.target.value)}
              className={inputClass}
              placeholder="Ej: 175"
            />
          ) : (
            <span className="flex gap-2">
              <span className="flex flex-1 items-center gap-1">
                <input
                  type="number"
                  step="1"
                  min={0}
                  required
                  value={pies}
                  onChange={(e) => setPies(e.target.value)}
                  className={inputClass + " w-full"}
                  placeholder="pies"
                />
                <span className="text-neutral-500">ft</span>
              </span>
              <span className="flex flex-1 items-center gap-1">
                <input
                  type="number"
                  step="1"
                  min={0}
                  max={11}
                  value={pulgadas}
                  onChange={(e) => setPulgadas(e.target.value)}
                  className={inputClass + " w-full"}
                  placeholder="pulg"
                />
                <span className="text-neutral-500">in</span>
              </span>
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Edad</span>
          <input
            name="edad"
            type="number"
            step="1"
            min={10}
            max={120}
            required
            defaultValue={initial?.edad ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Sexo</span>
          <select
            name="sexo"
            required
            defaultValue={initial?.sexo ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Objetivo</span>
          <select
            name="objetivo"
            required
            defaultValue={initial?.objetivo ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {OBJETIVOS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-300">Nivel de actividad</span>
          <select
            name="nivel_actividad"
            required
            defaultValue={initial?.nivel_actividad ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {NIVELES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 text-neutral-300">
          Restricciones alimenticias
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RESTRICCIONES_DISPONIBLES.map((r) => (
            <label
              key={r}
              className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2"
            >
              <input
                type="checkbox"
                name="restricciones"
                value={r}
                defaultChecked={restriccionesActuales.has(r)}
                className="accent-emerald-500"
              />
              <span>{RESTRICCIONES_LABEL[r]}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
        className="self-start rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}
