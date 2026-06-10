import { redirect } from "next/navigation";
import PerfilForm from "@/components/perfil-form";
import { getUserMetrics } from "@/lib/metrics";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Mi perfil físico — FitApp" };

export default async function PerfilPage() {
  // El middleware ya protege /perfil; defensa extra por si acaso.
  const user = await getUser();
  if (!user) redirect("/login");

  const metrics = await getUserMetrics();

  return (
    <section className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">Mi perfil físico</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Con estos datos calculamos tu IMC, tus calorías objetivo y tus macros.
        Puedes editarlos cuando quieras.
      </p>

      <div className="mt-6">
        <PerfilForm initial={metrics} />
      </div>
    </section>
  );
}
