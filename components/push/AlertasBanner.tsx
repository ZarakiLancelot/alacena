import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Fallback in-app de las alertas de vencimiento (requisito 6). Se muestra siempre
 * que el usuario tenga compras en la ventana de aviso, sin importar si tiene push
 * activado — así los casos donde el push NO llega (iOS Safari sin instalar como
 * PWA, notificaciones bloqueadas por el usuario, primera visita antes de
 * suscribirse) igual se enteran al abrir la app.
 *
 * Lee vista_alertas_vencimiento con el cliente normal (RLS ya la limita a las
 * compras del usuario logueado), no con la service role key — a diferencia del
 * cron (app/api/cron/vencimientos/route.ts) esto corre en el request de UN
 * usuario, no necesita ver las de todos.
 */
export async function AlertasBanner() {
  const supabase = await createClient();
  const { data: alertas } = await supabase
    .from("vista_alertas_vencimiento")
    .select("producto_nombre, dias_para_vencer")
    .order("dias_para_vencer", { ascending: true });

  if (!alertas || alertas.length === 0) return null;

  const nombres = alertas.map((a) => a.producto_nombre).filter(Boolean);
  const primero = alertas[0];
  const mensaje =
    alertas.length === 1
      ? `${nombres[0]} ${describir(primero.dias_para_vencer)}.`
      : `${nombres.slice(0, 2).join(", ")}${alertas.length > 2 ? ` y ${alertas.length - 2} más` : ""} están por vencer.`;

  return (
    <Link
      href="/inventario"
      className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm
        text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <span aria-hidden>⏰</span>
      <span className="min-w-0 flex-1 truncate">{mensaje}</span>
      <span className="shrink-0 font-medium underline underline-offset-2">Ver</span>
    </Link>
  );
}

function describir(dias: number | null): string {
  if (dias === null) return "vence pronto";
  if (dias < 0) return "ya venció";
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  return `vence en ${dias} días`;
}
