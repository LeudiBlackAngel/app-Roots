import Link from "next/link";
import {
  getItemsRutinaAgrupados,
  getIaUsosRestantes,
  getRutinaActual,
  MAX_IA_DIARIO,
} from "@/lib/rutina";
import {
  GenerarRutinaBaseBoton,
  PersonalizarIABoton,
} from "@/components/rutina-botones";

export const metadata = { title: "Mi rutina — FitApp" };

const ORIGEN_LABEL: Record<string, string> = {
  plantilla: "Plantilla",
  ia: "Personalizada con IA",
};

export default async function RutinaPage() {
  const rutina = await getRutinaActual();

  if (!rutina) {
    return (
      <section className="py-8">
        <h1 className="text-2xl font-bold">Mi rutina</h1>
        <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/30 p-6">
          <p className="font-medium">Aún no tienes una rutina.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Genera tu rutina base según tu objetivo. (Si no ves resultados,
            completa antes tu{" "}
            <Link href="/perfil" className="text-emerald-400 hover:underline">
              perfil
            </Link>
            .)
          </p>
          <div className="mt-4">
            <GenerarRutinaBaseBoton />
          </div>
        </div>
      </section>
    );
  }

  const dias = await getItemsRutinaAgrupados(rutina.id);
  const restantes = await getIaUsosRestantes(MAX_IA_DIARIO);

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{rutina.nombre}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Objetivo: <span className="capitalize">{rutina.objetivo.replace("_", " ")}</span>{" "}
            · Origen: {ORIGEN_LABEL[rutina.origen] ?? rutina.origen}
          </p>
        </div>
        <PersonalizarIABoton restantes={restantes} />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {dias.map(({ dia, items }) => (
          <div
            key={dia}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5"
          >
            <h2 className="mb-3 text-lg font-semibold">Día {dia}</h2>
            <ul className="flex flex-col divide-y divide-neutral-800">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div>
                    {it.ejercicio ? (
                      <Link
                        href={`/ejercicios/${it.ejercicio.id}`}
                        className="font-medium hover:text-emerald-400"
                      >
                        {it.ejercicio.nombre}
                      </Link>
                    ) : (
                      <span className="text-neutral-500">Ejercicio eliminado</span>
                    )}
                    {it.ejercicio && (
                      <span className="ml-2 text-xs uppercase tracking-wide text-neutral-500">
                        {it.ejercicio.grupo_muscular}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm text-neutral-300">
                    {it.series} × {it.reps}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {dias.length === 0 && (
          <p className="text-sm text-neutral-500">
            Esta rutina no tiene ejercicios cargados.
          </p>
        )}
      </div>
    </section>
  );
}
