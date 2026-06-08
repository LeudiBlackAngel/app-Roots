import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";

export const metadata = { title: "Panel admin — FitApp" };

export default async function AdminPage() {
  const role = await getUserRole();

  // El middleware exige sesion; aqui exigimos ademas rol admin.
  if (!role) redirect("/login");
  if (role !== "admin") redirect("/dashboard");

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Panel admin</h1>
      <p className="mt-2 text-neutral-400">Próximamente.</p>
    </section>
  );
}
