import Link from "next/link";
import {
  getComidasDietaAgrupadas,
  getDietaActual,
  totalesDieta,
} from "@/lib/dieta";
import { getIaUsosRestantes, MAX_IA_DIARIO } from "@/lib/rutina";
import { getUserMetrics } from "@/lib/metrics";
import { calcularPorcion, MOMENTO_LABEL } from "@/lib/alimentos-tipos";
import {
  GenerarDietaBaseBoton,
  PersonalizarDietaIABoton,
} from "@/components/dieta-botones";

export const metadata = { title: "Mi dieta — FitApp" };

const ORIGEN_LABEL: Record<string, string> = {
  plantilla: "Plantilla",
  ia: "Personalizada con IA",
};

export default async function DietaPage() {
  const dieta = await getDietaActual();

  if (!dieta) {
    return (
      <section className="py-8">
        <h1 className="text-2xl font-bold">Mi dieta</h1>
        <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/30 p-6">
          <p className="font-medium">Aún no tienes un plan de dieta.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Genera tu dieta base según tu objetivo y calorías. (Si no ves
            resultados, completa antes tu{" "}
            <Link href="/perfil" className="text-emerald-400 hover:underline">
              perfil
            </Link>
            .)
          </p>
          <div className="mt-4">
            <GenerarDietaBaseBoton />
          </div>
        </div>
      </section>
    );
  }

  const [momentos, restantes, metrics] = await Promise.all([
    getComidasDietaAgrupadas(dieta.id),
    getIaUsosRestantes(MAX_IA_DIARIO),
    getUserMetrics(),
  ]);

  const totales = totalesDieta(momentos);
  const objetivoCal = metrics?.calorias_objetivo ?? null;

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{dieta.nombre}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Objetivo:{" "}
            <span className="capitalize">
              {dieta.objetivo.replace("_", " ")}
            </span>{" "}
            · Origen: {ORIGEN_LABEL[dieta.origen] ?? dieta.origen}
          </p>
        </div>
        <PersonalizarDietaIABoton restantes={restantes} />
      </div>

      {/* Totales del plan vs objetivo */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tarjeta
          etiqueta="Calorías del plan"
          valor={`${totales.calorias}`}
          sufijo={objetivoCal ? `/ ${objetivoCal} obj` : "kcal"}
        />
        <Tarjeta etiqueta="Proteína" valor={`${totales.proteina} g`} />
        <Tarjeta etiqueta="Carbos" valor={`${totales.carbos} g`} />
        <Tarjeta etiqueta="Grasa" valor={`${totales.grasa} g`} />
      </div>

      {/* Comidas por momento */}
      <div className="mt-6 flex flex-col gap-6">
        {momentos.map(({ momento, items }) => (
          <div
            key={momento}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5"
          >
            <h2 className="mb-3 text-lg font-semibold">
              {MOMENTO_LABEL[momento]}
            </h2>
            <ul className="flex flex-col divide-y divide-neutral-800">
              {items.map((it) => {
                const p = it.alimento
                  ? calcularPorcion(it.alimento, it.cantidad_g)
                  : null;
                return (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div>
                      <span className="font-medium">
                        {it.alimento?.nombre ?? "Alimento eliminado"}
                      </span>
                      <span className="ml-2 text-sm text-neutral-500">
                        {it.cantidad_g} g
                      </span>
                    </div>
                    {p && (
                      <span className="shrink-0 text-sm text-neutral-300">
                        {p.calorias} kcal
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {momentos.length === 0 && (
          <p className="text-sm text-neutral-500">
            Esta dieta no tiene comidas cargadas.
          </p>
        )}
      </div>

      <div className="mt-6 text-sm text-neutral-500">
        ¿Quieres registrar lo que comes hoy?{" "}
        <Link href="/comidas" className="text-emerald-400 hover:underline">
          Ir al registro de comidas
        </Link>
      </div>
    </section>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  sufijo,
}: {
  etiqueta: string;
  valor: string;
  sufijo?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        {etiqueta}
      </p>
      <p className="mt-1 text-2xl font-bold">
        {valor}
        {sufijo && (
          <span className="ml-1 text-sm font-normal text-neutral-400">
            {sufijo}
          </span>
        )}
      </p>
    </div>
  );
}
