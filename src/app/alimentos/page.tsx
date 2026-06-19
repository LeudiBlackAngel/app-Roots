import { getAlimentos } from "@/lib/alimentos";
import AlimentosBiblioteca from "@/components/alimentos-biblioteca";

export const metadata = { title: "Alimentos — FitApp" };

export default async function AlimentosPage() {
  const alimentos = await getAlimentos();

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Alimentos</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Tabla nutricional por 100 g. Filtra por categoría.
      </p>

      <AlimentosBiblioteca alimentos={alimentos} />
    </section>
  );
}
