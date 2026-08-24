import Link from "next/link";
import { FiArchive } from "react-icons/fi";
import { NavBar } from "@/components/dashboard/NavBar";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { AlertasBanner } from "@/components/push/AlertasBanner";
import { createClient } from "@/lib/supabase/server";
import { getHogarIdActual } from "@/lib/supabase/hogar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si `user` existe acá, el proxy ya garantizó que tiene hogar (gating de
  // onboarding en lib/supabase/middleware.ts) — igual se tolera `null` por si
  // esta consulta puntual falla, en vez de romper el layout entero.
  const hogarId = user ? await getHogarIdActual(supabase, user.id).catch(() => null) : null;
  const { data: hogar } = hogarId
    ? await supabase.from("hogares").select("nombre").eq("id", hogarId).maybeSingle()
    : { data: null };

  const { data: profile } = user
    ? await supabase.from("profiles").select("nombre_completo").eq("id", user.id).maybeSingle()
    : { data: null };
  const nombreMostrado = profile?.nombre_completo || user?.email;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-lg font-semibold leading-none text-zinc-900 dark:text-zinc-50">
            <FiArchive className="h-5 w-5" aria-hidden />
            Alacena
          </span>
          {hogar?.nombre ? (
            <Link
              href="/ajustes/hogar"
              className="truncate text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              {hogar.nombre}
            </Link>
          ) : null}
        </span>
        <div className="flex items-center gap-3">
          {nombreMostrado ? (
            <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
              {nombreMostrado}
            </span>
          ) : null}
          <LogoutButton />
        </div>
      </header>

      <AlertasBanner />

      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>

      <NavBar />
    </div>
  );
}
