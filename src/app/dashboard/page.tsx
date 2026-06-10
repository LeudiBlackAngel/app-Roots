import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { getUserMetrics, perfilCompleto } from "@/lib/metrics";
import { clasificarIMC, etiquetaIMC } from "@/lib/calculadoras";

export const metadata = { title: "Dashboard — FitApp" };

export default async function DashboardPage() {
  const profile = await getProfile();

  // Defensa extra: el middleware ya protege /dashboard, pero por si acaso.
  if (!profile) {
    redirect("/login");
  }

  const saludo = profile.nombre?.trim() || "atleta";
  const metrics = await getUserMetrics();
  const completo = perfilCompleto(metrics);

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Hola, {saludo} 👋</h1>
      <p className="mt-2 text-neutral-400">
        Bienvenido a tu panel de FitApp.
      </p>

      {completo && metrics ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* IMC */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                IMC
              </p>
              <p className="mt-1 text-3xl font-bold">{metrics.imc}</p>
              {metrics.imc != null && (
                <p className="mt-1 text-sm text-emerald-400">
                  {etiquetaIMC(clasificarIMC(metrics.imc))}
                </p>
              )}
            </div>

            {/* Calorías objetivo */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Calorías objetivo
              </p>
              <p className="mt-1 text-3xl font-bold">
                {metrics.calorias_objetivo}
                <span className="ml-1 text-base font-normal text-neutral-400">
                  kcal/día
                </span>
              </p>
            </div>

            {/* Macros */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Macros (g/día)
              </p>
              {metrics.macros && (
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-neutral-400">Proteína</span>
                    <span className="font-medium">
                      {metrics.macros.proteina_g} g
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-neutral-400">Carbos</span>
                    <span className="font-medium">
                      {metrics.macros.carbos_g} g
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-neutral-400">Grasa</span>
                    <span className="font-medium">
                      {metrics.macros.grasa_g} g
                    </span>
                  </li>
                </ul>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-3 text-sm">
            <Link
              href="/perfil"
              className="rounded-md border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
            >
              Editar perfil
            </Link>
            <Link
              href="/calculadoras"
              className="rounded-md border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
            >
              Calculadora 1RM
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/30 p-5">
          <p className="font-medium">Aún no has completado tu perfil físico.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Captura tu peso, altura, edad y objetivo para ver tu IMC, calorías y
            macros.
          </p>
          <Link
            href="/perfil"
            className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
          >
            Completa tu perfil
          </Link>
        </div>
      )}

      <div className="mt-6 text-sm text-neutral-500">
        Rol actual:{" "}
        <span className="font-medium text-neutral-300">{profile.role}</span>
        {profile.role === "admin" && (
          <>
            {" · "}
            <Link href="/admin" className="text-emerald-400 hover:underline">
              Panel admin
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
