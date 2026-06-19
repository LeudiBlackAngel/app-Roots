import Link from "next/link";
import { notFound } from "next/navigation";
import { getEjercicio } from "@/lib/ejercicios";
import { getHistorialEjercicio } from "@/lib/entrenamiento";
import RegistrarSerieForm from "@/components/registrar-serie-form";
import GraficaLinea, { type PuntoLinea } from "@/components/grafica-linea";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ejercicio = await getEjercicio(id);
  return { title: `${ejercicio?.nombre ?? "Ejercicio"} — FitApp` };
}

export default async function EjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ejercicio = await getEjercicio(id);
  if (!ejercicio) notFound();

  const historial = await getHistorialEjercicio(id);

  // Puntos para la gráfica: peso levantado en el tiempo (ignora registros sin peso).
  const puntos: PuntoLinea[] = historial
    .filter((r) => r.peso_levantado != null)
    .map((r) => ({ x: r.fecha.slice(5), y: Number(r.peso_levantado) }));

  return (
    <section className="py-8">
      <Link
        href="/ejercicios"
        className="text-sm text-neutral-400 hover:text-emerald-400"
      >
        ← Biblioteca
      </Link>

      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-emerald-400">
          {ejercicio.grupo_muscular}
        </p>
        <h1 className="text-2xl font-bold">{ejercicio.nombre}</h1>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Media + instrucciones */}
        <div>
          {ejercicio.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ejercicio.imagen_url}
              alt={ejercicio.nombre}
              className="h-56 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center rounded-lg bg-neutral-800 text-sm text-neutral-500">
              Sin imagen
            </div>
          )}

          {ejercicio.instrucciones && (
            <p className="mt-4 text-sm leading-relaxed text-neutral-300">
              {ejercicio.instrucciones}
            </p>
          )}

          {ejercicio.video_url && (
            <a
              href={ejercicio.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              ▶ Ver video
            </a>
          )}
        </div>

        {/* Registrar serie */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-lg font-semibold">Registrar serie</h2>
          <p className="mb-4 mt-1 text-sm text-neutral-400">
            Anota tu trabajo de hoy para seguir tu progresión.
          </p>
          <RegistrarSerieForm ejercicioId={ejercicio.id} />
        </div>
      </div>

      {/* Progresión */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Progresión de peso</h2>
        <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <GraficaLinea datos={puntos} unidad="kg" />
        </div>

        {historial.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1.5 font-medium">Fecha</th>
                  <th className="py-1.5 font-medium">Peso</th>
                  <th className="py-1.5 font-medium">Reps</th>
                  <th className="py-1.5 font-medium">Series</th>
                  <th className="py-1.5 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody>
                {[...historial].reverse().map((r) => (
                  <tr key={r.id} className="border-t border-neutral-800">
                    <td className="py-1.5">{r.fecha}</td>
                    <td className="py-1.5">
                      {r.peso_levantado != null ? `${r.peso_levantado} kg` : "—"}
                    </td>
                    <td className="py-1.5">{r.reps ?? "—"}</td>
                    <td className="py-1.5">{r.series ?? "—"}</td>
                    <td className="py-1.5 text-neutral-400">{r.notas ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
