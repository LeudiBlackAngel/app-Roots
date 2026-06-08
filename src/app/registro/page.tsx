import AuthForm from "@/components/auth-form";
import { registerAction } from "@/lib/auth-actions";

export const metadata = { title: "Crear cuenta — FitApp" };

export default function RegistroPage() {
  return (
    <section className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Crear cuenta</h1>
      <AuthForm mode="registro" action={registerAction} />
    </section>
  );
}
