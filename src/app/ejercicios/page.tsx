import { getEjercicios } from "@/lib/ejercicios";
import EjerciciosBiblioteca from "@/components/ejercicios-biblioteca";

export const metadata = { title: "Biblioteca de ejercicios — FitApp" };

export default async function EjerciciosPage() {
  const ejercicios = await getEjercicios();

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Biblioteca de ejercicios</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Explora los ejercicios por grupo muscular. Toca uno para ver
        instrucciones, video y registrar tus series.
      </p>

      <EjerciciosBiblioteca ejercicios={ejercicios} />
    </section>
  );
}
