import Link from "next/link";

export default function Home() {
  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Entrena. Come bien.{" "}
        <span className="text-emerald-400">Progresa.</span>
      </h1>
      <p className="max-w-xl text-neutral-400">
        FitApp es tu espacio para entrenamiento, dietas y tienda fit. Esta es la
        version inicial: crea tu cuenta y entra a tu panel.
      </p>
      <div className="flex gap-3">
        <Link
          href="/registro"
          className="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-500"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-700 px-5 py-2.5 font-medium hover:bg-neutral-800"
        >
          Iniciar sesion
        </Link>
      </div>
    </section>
  );
}
