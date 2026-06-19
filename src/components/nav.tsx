import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";

export default async function Nav() {
  const profile = await getProfile();
  const esAdmin = profile?.role === "admin";

  return (
    <header className="border-b border-neutral-800">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Fit<span className="text-emerald-400">App</span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {profile ? (
            <>
              <Link href="/dashboard" className="hover:text-emerald-400">
                Dashboard
              </Link>
              <Link href="/ejercicios" className="hover:text-emerald-400">
                Ejercicios
              </Link>
              <Link href="/rutina" className="hover:text-emerald-400">
                Rutina
              </Link>
              <Link href="/alimentos" className="hover:text-emerald-400">
                Alimentos
              </Link>
              <Link href="/dieta" className="hover:text-emerald-400">
                Dieta
              </Link>
              <Link href="/comidas" className="hover:text-emerald-400">
                Comidas
              </Link>
              <Link href="/escaner" className="hover:text-emerald-400">
                Escáner
              </Link>
              <Link href="/progreso" className="hover:text-emerald-400">
                Progreso
              </Link>
              <Link href="/perfil" className="hover:text-emerald-400">
                Perfil
              </Link>
              <Link href="/calculadoras" className="hover:text-emerald-400">
                Calculadoras
              </Link>
              {esAdmin && (
                <>
                  <Link
                    href="/admin/ejercicios"
                    className="text-amber-400 hover:text-amber-300"
                  >
                    Admin·Ej
                  </Link>
                  <Link
                    href="/admin/alimentos"
                    className="text-amber-400 hover:text-amber-300"
                  >
                    Admin·Al
                  </Link>
                </>
              )}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
                >
                  Cerrar sesion
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
