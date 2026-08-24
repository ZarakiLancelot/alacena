import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { login } from "@/app/(auth)/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <h2 className="mb-6 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Ingresá a tu cuenta
      </h2>
      <AuthForm mode="login" action={login} next={next} />
      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿No tenés cuenta?{" "}
        <Link href="/signup" className="font-medium text-emerald-600">
          Creá una
        </Link>
      </p>
    </>
  );
}
