import Link from "next/link";
import { getAlimentos } from "@/lib/alimentos";
import { getRegistrosComida, resumenDia } from "@/lib/comidas";
import { getUserMetrics } from "@/lib/metrics";
import { MOMENTOS, MOMENTO_LABEL } from "@/lib/alimentos-tipos";
import { borrarComidaAction } from "@/lib/comidas-actions";
import RegistrarComidaForm from "@/components/registrar-comida-form";

export const metadata = { title: "Registro de comidas — FitApp" };

export default async function ComidasPage() {
  const [alimentos, registros, metrics] = await Promise.all([
    getAlimentos(),
    getRegistrosComida(),
    getUserMetrics(),
  ]);

  const resumen = resumenDia(registros);
  const objetivo = metrics?.calorias_objetivo ?? null;
  const pct =
    objetivo && objetivo > 0
      ? Math.min(100, Math.round((resumen.calorias / objetivo) * 100))
      : null;

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Registro de comidas</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Anota lo que comes hoy. Elige un alimento de la base (calcula solo) o
        usa texto libre.
      </p>

      {/* Total del día vs objetivo */}
      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Calorías de hoy
            </p>
            <p className="mt-1 text-3xl font-bold">
              {resumen.calorias}
              <span className="ml-1 text-base font-normal text-neutral-400">
                {objetivo ? `/ ${objetivo} kcal` : "kcal"}
              </span>
            </p>
          </div>
          <p className="text-sm text-neutral-400">
            P {resumen.proteina} g · C {resumen.carbos} g · G {resumen.grasa} g
          </p>
        </div>

        {pct != null && (
          <div className="mt-3">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className={
                  "h-full rounded-full " +
                  (pct >= 100 ? "bg-amber-500" : "bg-emerald-500")
                }
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {pct}% de tu objetivo diario
            </p>
          </div>
        )}
        {objetivo == null && (
          <p className="mt-2 text-xs text-neutral-500">
            Completa tu{" "}
            <Link href="/perfil" className="text-emerald-400 hover:underline">
              perfil
            </Link>{" "}
            para ver el progreso vs tu objetivo de calorías.
          </p>
        )}
      </div>

      {/* Formulario */}
      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="mb-4 text-lg font-semibold">Agregar comida</h2>
        <RegistrarComidaForm alimentos={alimentos} />
      </div>

      {/* Comidas de hoy por momento */}
      <div className="mt-6 flex flex-col gap-4">
        {MOMENTOS.map((m) => {
          const items = registros.filter((r) => r.momento === m);
          if (items.length === 0) return null;
          return (
            <div
              key={m}
              className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
            >
              <h3 className="mb-2 font-semibold">{MOMENTO_LABEL[m]}</h3>
              <ul className="flex flex-col divide-y divide-neutral-800">
                {items.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {r.descripcion ?? "Comida"}
                      </span>
                      {r.cantidad_g != null && (
                        <span className="ml-2 text-neutral-500">
                          {r.cantidad_g} g
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-300">
                        {r.calorias ?? 0} kcal
                      </span>
                      <form action={borrarComidaAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-red-400 hover:underline"
                        >
                          Borrar
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {registros.length === 0 && (
          <p className="text-sm text-neutral-500">
            Todavía no has registrado comidas hoy.
          </p>
        )}
      </div>
    </section>
  );
}
