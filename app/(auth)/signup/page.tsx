import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { signup } from "@/app/(auth)/actions";

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-6 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Creá tu cuenta
      </h2>
      <AuthForm mode="signup" action={signup} />
      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-emerald-600">
          Ingresá
        </Link>
      </p>
    </>
  );
}
