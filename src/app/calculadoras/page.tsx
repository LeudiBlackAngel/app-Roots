import Link from "next/link";
import Calculadora1RM from "@/components/calculadora-1rm";

export const metadata = { title: "Calculadoras — FitApp" };

// Página pública (standalone). No requiere sesión.
export default function CalculadorasPage() {
  return (
    <section className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">Calculadoras</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Herramientas rápidas. ¿Quieres tu IMC, calorías y macros personalizados?{" "}
        <Link href="/perfil" className="text-emerald-400 hover:underline">
          Completa tu perfil
        </Link>
        .
      </p>

      <div className="mt-6">
        <Calculadora1RM />
      </div>
    </section>
  );
}
