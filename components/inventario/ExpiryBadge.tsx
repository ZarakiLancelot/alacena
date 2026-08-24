import { FiAlertTriangle, FiClock } from "react-icons/fi";
import { diasParaVencer, formatDate } from "@/lib/utils";

export function ExpiryBadge({
  fechaVencimiento,
  diasAntes,
}: {
  fechaVencimiento: string | null;
  diasAntes: number;
}) {
  if (!fechaVencimiento) {
    return <span className="text-xs text-zinc-400">Sin vencimiento</span>;
  }

  const dias = diasParaVencer(fechaVencimiento);

  if (dias === null || dias > diasAntes) {
    return (
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        Vence {formatDate(fechaVencimiento)}
      </span>
    );
  }

  if (dias < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
        <FiAlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Vencido hace {Math.abs(dias)} día{Math.abs(dias) === 1 ? "" : "s"}
      </span>
    );
  }

  if (dias === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <FiClock className="h-3.5 w-3.5" aria-hidden />
        Vence hoy
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      <FiClock className="h-3.5 w-3.5" aria-hidden />
      Vence en {dias} día{dias === 1 ? "" : "s"}
    </span>
  );
}
