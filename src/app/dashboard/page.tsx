import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/auth";

export const metadata = { title: "Dashboard — FitApp" };

export default async function DashboardPage() {
  const profile = await getProfile();

  // Defensa extra: el middleware ya protege /dashboard, pero por si acaso.
  if (!profile) {
    redirect("/login");
  }

  const saludo = profile.nombre?.trim() || "atleta";

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Hola, {saludo} 👋</h1>
      <p className="mt-2 text-neutral-400">
        Bienvenido a tu panel de FitApp. Aqui apareceran tus entrenamientos,
        dietas y pedidos en proximas fases.
      </p>

      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
        <p>
          Rol actual:{" "}
          <span className="font-medium text-neutral-200">{profile.role}</span>
        </p>
        {profile.role === "admin" && (
          <p className="mt-2">
            Tienes acceso al{" "}
            <Link href="/admin" className="text-emerald-400 hover:underline">
              Panel admin
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
