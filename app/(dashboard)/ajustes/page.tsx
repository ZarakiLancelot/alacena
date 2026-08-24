import Link from "next/link";
import { FiChevronRight, FiHome, FiShoppingBag } from "react-icons/fi";
import { createClient } from "@/lib/supabase/server";
import { PushToggle } from "@/components/push/PushToggle";
import { SubmitButton } from "@/components/SubmitButton";
import { guardarAlertasConfig } from "./actions";

export default async function AjustesPage() {
  const supabase = await createClient();
  const { data: alertaConfig } = await supabase
    .from("alertas_config")
    .select("dias_antes, activa")
    .maybeSingle();

  const diasAntes = alertaConfig?.dias_antes ?? 3;
  const activa = alertaConfig?.activa ?? true;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Ajustes</h1>

      <Link
        href="/ajustes/hogar"
        className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4
          dark:border-zinc-800 dark:bg-zinc-950"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <FiHome className="h-4 w-4" aria-hidden />
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Mi hogar
        </span>
        <FiChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
      </Link>

      <Link
        href="/ajustes/tiendas"
        className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4
          dark:border-zinc-800 dark:bg-zinc-950"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          <FiShoppingBag className="h-4 w-4" aria-hidden />
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Tiendas
        </span>
        <FiChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Alertas de vencimiento
        </h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <form action={guardarAlertasConfig} className="flex flex-col gap-4">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Avisarme con anticipación
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  name="dias_antes"
                  min={0}
                  max={30}
                  defaultValue={diasAntes}
                  className="w-16 rounded-lg border border-zinc-300 px-2 py-1.5 text-right text-sm
                    dark:border-zinc-700 dark:bg-zinc-900"
                />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">días antes</span>
              </span>
            </label>

            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Alertas activas</span>
              <input
                type="checkbox"
                name="activa"
                defaultChecked={activa}
                className="h-5 w-5 accent-emerald-600"
              />
            </label>

            <SubmitButton className="text-sm">Guardar</SubmitButton>
          </form>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Notificaciones</h2>
        <PushToggle />
        <p className="px-1 text-xs text-zinc-400 dark:text-zinc-500">
          Además de las notificaciones push, siempre vas a ver un aviso arriba de la
          app si tenés productos por vencer.
        </p>
      </section>
    </div>
  );
}
