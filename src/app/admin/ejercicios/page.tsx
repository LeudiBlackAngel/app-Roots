import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import { getEjercicios } from "@/lib/ejercicios";
import AdminEjerciciosManager from "@/components/admin-ejercicios-manager";

export const metadata = { title: "Admin · Ejercicios — FitApp" };

export default async function AdminEjerciciosPage() {
  // Doble protección: middleware (/admin) + chequeo de rol aquí.
  const role = await getUserRole();
  if (!role) redirect("/login");
  if (role !== "admin") redirect("/dashboard");

  const ejercicios = await getEjercicios();

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Administrar ejercicios</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Agrega, edita o borra ejercicios de la biblioteca. Solo visible para
        administradores.
      </p>

      <div className="mt-6">
        <AdminEjerciciosManager ejercicios={ejercicios} />
      </div>
    </section>
  );
}
