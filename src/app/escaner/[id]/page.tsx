import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEscaneosRestantes,
  getFactura,
  getSugerencias,
  MAX_ESCANER_DIARIO,
} from "@/lib/facturas";
import { borrarFacturaAction } from "@/lib/escaner-actions";
import {
  ProcesarFacturaBoton,
  RegenerarSugerenciasBoton,
} from "@/components/factura-acciones";

export const metadata = { title: "Factura — FitApp" };

export default async function FacturaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const factura = await getFactura(id);
  if (!factura) notFound();

  const iaConfigurada = Boolean(process.env.ANTHROPIC_API_KEY);
  const [sugerencias, restantes] = await Promise.all([
    getSugerencias(id),
    getEscaneosRestantes(MAX_ESCANER_DIARIO),
  ]);

  const items = factura.items_extraidos ?? [];

  return (
    <section className="py-8">
      <Link
        href="/escaner"
        className="text-sm text-neutral-400 hover:text-emerald-400"
      >
        ← Mis facturas
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Imagen + acciones */}
        <div>
          {factura.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={factura.signedUrl}
              alt="Factura"
              className="w-full rounded-lg border border-neutral-800 object-contain"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded-lg bg-neutral-800 text-sm text-neutral-500">
              Imagen no disponible
            </div>
          )}

          <p className="mt-3 text-xs text-neutral-500">
            Subida el {new Date(factura.created_at).toLocaleString()} · Estado:{" "}
            <span className="text-neutral-300">{factura.estado}</span>
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {factura.estado !== "procesada" && iaConfigurada && (
              <ProcesarFacturaBoton
                facturaId={factura.id}
                restantes={restantes}
                label={factura.estado === "error" ? "Reintentar" : "Procesar con IA"}
              />
            )}
            {factura.estado === "procesada" && iaConfigurada && (
              <RegenerarSugerenciasBoton facturaId={factura.id} />
            )}

            <form action={borrarFacturaAction}>
              <input type="hidden" name="id" value={factura.id} />
              <input type="hidden" name="path" value={factura.imagen_path ?? ""} />
              <button
                type="submit"
                className="text-sm text-red-400 hover:underline"
              >
                Borrar factura
              </button>
            </form>
          </div>
        </div>

        {/* Alimentos detectados + sugerencias */}
        <div>
          {!iaConfigurada && (
            <div className="mb-4 rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">
              ⚠️ Falta <code>ANTHROPIC_API_KEY</code> en el servidor: no se puede
              procesar esta factura todavía.
            </div>
          )}

          {factura.estado === "pendiente" && (
            <p className="text-sm text-neutral-400">
              Esta factura aún no se ha procesado. Pulsa “Procesar con IA” para
              extraer los alimentos y obtener sugerencias de platos.
            </p>
          )}
          {factura.estado === "error" && (
            <p className="text-sm text-red-300">
              Hubo un error al procesar esta factura. Puedes reintentar.
            </p>
          )}

          {items.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-semibold">
                Alimentos detectados ({items.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {items.map((it, i) => (
                  <span
                    key={`${it.nombre}-${i}`}
                    className="rounded-full border border-neutral-700 bg-neutral-900/60 px-3 py-1 text-sm"
                  >
                    {it.nombre}
                    {it.cantidad_estimada && (
                      <span className="ml-1 text-neutral-500">
                        ({it.cantidad_estimada})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sugerencias.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">
                Platos sugeridos para ti
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sugerencias.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{s.nombre_plato}</h3>
                      {s.calorias_estimadas != null && (
                        <span className="shrink-0 rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-300">
                          {s.calorias_estimadas} kcal
                        </span>
                      )}
                    </div>
                    {s.descripcion && (
                      <p className="mt-2 text-sm text-neutral-300">
                        {s.descripcion}
                      </p>
                    )}
                    {s.ingredientes_usados &&
                      s.ingredientes_usados.length > 0 && (
                        <p className="mt-3 text-xs text-neutral-500">
                          <span className="text-neutral-400">Usa:</span>{" "}
                          {s.ingredientes_usados.join(", ")}
                        </p>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {factura.estado === "procesada" && sugerencias.length === 0 && (
            <p className="text-sm text-neutral-400">
              No hay sugerencias guardadas. Pulsa “Regenerar sugerencias”.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
