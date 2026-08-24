"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { actualizarTienda } from "@/app/(dashboard)/ajustes/tiendas/actions";
import { initialActionState } from "@/lib/types";

export function EditarTiendaForm({
  tiendaId,
  cadenaId,
  ubicacion,
  cadenas,
}: {
  tiendaId: string;
  cadenaId: string | null;
  ubicacion: string | null;
  cadenas: { id: string; nombre: string }[];
}) {
  const [state, formAction] = useActionState(actualizarTienda, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="tienda_id" value={tiendaId} />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Cadena
          </label>
          <select
            name="cadena_id"
            defaultValue={cadenaId ?? ""}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Sin cadena / tienda de barrio</option>
            {cadenas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Ubicación
          </label>
          <input
            name="ubicacion"
            defaultValue={ubicacion ?? ""}
            placeholder="Ej. Fraijanes"
            maxLength={120}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>
      <SubmitButton
        pendingLabel="Guardando…"
        className="w-auto self-start bg-zinc-800 px-3 py-1.5 text-sm dark:bg-zinc-100 dark:text-zinc-900"
      >
        Guardar
      </SubmitButton>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">Guardado</p> : null}
    </form>
  );
}
