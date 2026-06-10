import Link from "next/link";
import { getUser } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";

export default async function Nav() {
  const user = await getUser();

  return (
    <header className="border-b border-neutral-800">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Fit<span className="text-emerald-400">App</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-emerald-400">
                Dashboard
              </Link>
              <Link href="/perfil" className="hover:text-emerald-400">
                Perfil
              </Link>
              <Link href="/calculadoras" className="hover:text-emerald-400">
                Calculadoras
              </Link>
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
