import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import { getAlimentos } from "@/lib/alimentos";
import AdminAlimentosManager from "@/components/admin-alimentos-manager";

export const metadata = { title: "Admin · Alimentos — FitApp" };

export default async function AdminAlimentosPage() {
  // Doble protección: middleware (/admin) + chequeo de rol aquí.
  const role = await getUserRole();
  if (!role) redirect("/login");
  if (role !== "admin") redirect("/dashboard");

  const alimentos = await getAlimentos();

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Administrar alimentos</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Agrega, edita o borra alimentos de la base nutricional. Solo
        administradores.
      </p>

      <div className="mt-6">
        <AdminAlimentosManager alimentos={alimentos} />
      </div>
    </section>
  );
}
