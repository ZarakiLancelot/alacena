import { formatCurrency, formatDate } from "@/lib/utils";
import type { CambioPrecio } from "@/lib/analytics";

/**
 * Compara precio_por_unidad de las dos compras más recientes del producto
 * (cualquier tienda) — ver lib/analytics.ts:cambioDePrecio. Usa precio por
 * unidad (no precio pagado) para que comparar presentaciones de distinto
 * tamaño sea justo.
 */
export function PriceAlert({ cambio }: { cambio: CambioPrecio }) {
  if (cambio.estado === "sin-datos") {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Todavía no hay suficientes compras de este producto para comparar precios.
      </p>
    );
  }

  const deltaAbs = Math.abs(cambio.deltaPct).toFixed(1);

  if (cambio.estado === "sube") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
        <span className="text-lg leading-none">📈</span>
        <p className="text-sm text-red-800 dark:text-red-300">
          <span className="font-semibold">Subió {deltaAbs}%</span> por unidad desde tu compra
          anterior: {formatCurrency(cambio.anterior)} en {cambio.tiendaAnterior} (
          {formatDate(cambio.fechaAnterior)}) → {formatCurrency(cambio.actual)} en {cambio.tienda} (
          {formatDate(cambio.fecha)}).
        </p>
      </div>
    );
  }

  if (cambio.estado === "baja") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
        <span className="text-lg leading-none">📉</span>
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          <span className="font-semibold">Bajó {deltaAbs}%</span> por unidad desde tu compra
          anterior ({formatCurrency(cambio.anterior)} → {formatCurrency(cambio.actual)}).
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-lg leading-none">➖</span>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Mismo precio por unidad que tu compra anterior ({formatCurrency(cambio.actual)}).
      </p>
    </div>
  );
}
