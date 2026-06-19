import { getFotosProgreso, getPesoCorporal } from "@/lib/progreso";
import { borrarFotoAction } from "@/lib/progreso-actions";
import PesoCorporalPanel from "@/components/peso-corporal-panel";
import SubirFotoForm from "@/components/subir-foto-form";
import type { PuntoLinea } from "@/components/grafica-linea";

export const metadata = { title: "Mi progreso — FitApp" };

const TIPO_LABEL: Record<string, string> = {
  antes: "Antes",
  despues: "Después",
  seguimiento: "Seguimiento",
};

export default async function ProgresoPage() {
  const [pesos, fotos] = await Promise.all([
    getPesoCorporal(),
    getFotosProgreso(),
  ]);

  const puntos: PuntoLinea[] = pesos.map((p) => ({
    x: p.fecha.slice(5),
    y: Number(p.peso_kg),
  }));

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Mi progreso</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Sigue tu peso corporal y guarda fotos privadas de antes/después.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <PesoCorporalPanel puntos={puntos} />

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-lg font-semibold">Fotos de progreso</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Tus fotos son privadas: se muestran con enlaces temporales y solo tú
            puedes verlas.
          </p>

          <div className="mt-4">
            <SubirFotoForm />
          </div>

          {fotos.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {fotos.map((f) => (
                <div
                  key={f.id}
                  className="overflow-hidden rounded-lg border border-neutral-800"
                >
                  {f.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.signedUrl}
                      alt={`Foto ${TIPO_LABEL[f.tipo] ?? f.tipo}`}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-neutral-800 text-xs text-neutral-500">
                      No disponible
                    </div>
                  )}
                  <div className="flex items-center justify-between px-2 py-1.5 text-xs">
                    <span>
                      <span className="text-emerald-400">
                        {TIPO_LABEL[f.tipo] ?? f.tipo}
                      </span>
                      <span className="ml-1 text-neutral-500">{f.fecha}</span>
                    </span>
                    <form action={borrarFotoAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="path" value={f.foto_path} />
                      <button
                        type="submit"
                        className="text-red-400 hover:underline"
                      >
                        Borrar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-neutral-500">
              Aún no has subido fotos.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
