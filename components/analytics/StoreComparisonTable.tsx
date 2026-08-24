import { formatCurrency, formatDate } from "@/lib/utils";
import type { FilaComparador } from "@/lib/analytics";

export function StoreComparisonTable({
  filas,
  unidad,
}: {
  filas: FilaComparador[];
  unidad: string | null;
}) {
  if (filas.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Todavía no compraste este producto en ninguna tienda.
      </p>
    );
  }

  const max = Math.max(...filas.map((f) => f.precioPorUnidad));

  return (
    <ul className="flex flex-col gap-2">
      {filas.map((fila, i) => (
        <li
          key={fila.nombre}
          className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: fila.color }}
              />
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                {fila.nombre}
              </span>
              {i === 0 ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Más barata
                </span>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {formatCurrency(fila.precioPorUnidad)}
                {unidad ? (
                  <span className="text-xs font-normal text-zinc-400"> /{unidad}</span>
                ) : null}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(fila.fecha)}</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(fila.precioPorUnidad / max) * 100}%`,
                backgroundColor: fila.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
