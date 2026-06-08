import AuthForm from "@/components/auth-form";
import { loginAction } from "@/lib/auth-actions";

export const metadata = { title: "Iniciar sesion — FitApp" };

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Iniciar sesion</h1>
      <AuthForm mode="login" action={loginAction} />
    </section>
  );
}
