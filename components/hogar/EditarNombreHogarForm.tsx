"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { actualizarNombreHogar } from "@/app/(dashboard)/ajustes/hogar/actions";
import { initialActionState } from "@/lib/types";

export function EditarNombreHogarForm({
  hogarId,
  nombreActual,
}: {
  hogarId: string;
  nombreActual: string;
}) {
  const [state, formAction] = useActionState(actualizarNombreHogar, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="hogar_id" value={hogarId} />
      <div className="flex gap-2">
        <input
          name="nombre"
          defaultValue={nombreActual}
          maxLength={80}
          required
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-lg font-semibold
            focus:border-emerald-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <SubmitButton
          pendingLabel="…"
          className="w-auto shrink-0 bg-zinc-800 px-4 py-2 text-sm dark:bg-zinc-100 dark:text-zinc-900"
        >
          Guardar
        </SubmitButton>
      </div>
      {state.fieldErrors?.nombre?.map((msg) => (
        <p key={msg} className="text-sm text-red-600">
          {msg}
        </p>
      ))}
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">Nombre actualizado</p> : null}
    </form>
  );
}
