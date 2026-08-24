"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Entry = { color?: string; name?: string; value?: number | string };

/**
 * Tooltip compartido por los gráficos de recharts de /analytics: valor en
 * negrita a la derecha (lo que el lector busca), nombre de serie atenuado a
 * la izquierda, identidad por una marca de línea (no un cuadrado) — ver
 * skill dataviz, references/interaction.md e references/marks-and-anatomy.md.
 */
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: Entry[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const etiqueta = label && ISO_DATE.test(label) ? formatDate(label) : label;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      {etiqueta ? (
        <p className="mb-1 font-medium text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-zinc-500 dark:text-zinc-400">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold text-zinc-900 dark:text-zinc-50">
              {typeof entry.value === "number" ? formatCurrency(entry.value) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
