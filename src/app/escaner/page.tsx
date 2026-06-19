import Link from "next/link";
import {
  getEscaneosRestantes,
  getFacturas,
  MAX_ESCANER_DIARIO,
  type EstadoFactura,
} from "@/lib/facturas";
import { borrarFacturaAction } from "@/lib/escaner-actions";
import SubirFacturaForm from "@/components/subir-factura-form";
import { ProcesarFacturaBoton } from "@/components/factura-acciones";

export const metadata = { title: "Escáner de factura — FitApp" };

const ESTADO_BADGE: Record<EstadoFactura, string> = {
  pendiente: "border-neutral-700 text-neutral-400",
  procesada: "border-emerald-800 text-emerald-300",
  error: "border-red-800 text-red-300",
};

const ESTADO_LABEL: Record<EstadoFactura, string> = {
  pendiente: "Pendiente",
  procesada: "Procesada",
  error: "Error",
};

export default async function EscanerPage() {
  const iaConfigurada = Boolean(process.env.ANTHROPIC_API_KEY);
  const [facturas, restantes] = await Promise.all([
    getFacturas(),
    getEscaneosRestantes(MAX_ESCANER_DIARIO),
  ]);

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Escáner de factura</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Sube la foto de tu factura del súper. La IA lee tus alimentos y te
        sugiere platos según tu objetivo. Tus facturas son privadas.
      </p>

      {!iaConfigurada && (
        <div className="mt-4 rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">
          ⚠️ El escáner necesita la clave de IA (<code>ANTHROPIC_API_KEY</code>)
          configurada en el servidor. Puedes subir facturas, pero el procesado
          con IA no funcionará hasta configurarla.
        </div>
      )}

      {/* Subir */}
      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="mb-3 text-lg font-semibold">Nueva factura</h2>
        <SubirFacturaForm />
      </div>

      {/* Historial */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          Mis facturas ({facturas.length})
        </h2>

        {facturas.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aún no has escaneado facturas.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {facturas.map((f) => (
              <li
                key={f.id}
                className="flex gap-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
              >
                <Link href={`/escaner/${f.id}`} className="shrink-0">
                  {f.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.signedUrl}
                      alt="Factura"
                      className="h-24 w-20 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-20 items-center justify-center rounded-md bg-neutral-800 text-xs text-neutral-500">
                      —
                    </div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        "rounded-full border px-2 py-0.5 text-xs " +
                        ESTADO_BADGE[f.estado]
                      }
                    >
                      {ESTADO_LABEL[f.estado]}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {f.estado === "procesada" && f.items_extraidos ? (
                    <p className="text-xs text-neutral-400">
                      {f.items_extraidos.length} alimentos detectados ·{" "}
                      <Link
                        href={`/escaner/${f.id}`}
                        className="text-emerald-400 hover:underline"
                      >
                        Ver platos
                      </Link>
                    </p>
                  ) : (
                    iaConfigurada && (
                      <ProcesarFacturaBoton
                        facturaId={f.id}
                        restantes={restantes}
                        label={f.estado === "error" ? "Reintentar" : "Procesar con IA"}
                      />
                    )
                  )}

                  <form action={borrarFacturaAction} className="mt-auto">
                    <input type="hidden" name="id" value={f.id} />
                    <input
                      type="hidden"
                      name="path"
                      value={f.imagen_path ?? ""}
                    />
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:underline"
                    >
                      Borrar factura
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
