"use client";

import { useActionState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { SubmitButton } from "@/components/SubmitButton";
import { regenerarCodigoHogar } from "@/app/(dashboard)/ajustes/hogar/actions";
import { initialActionState } from "@/lib/types";

export function RegenerarCodigoForm({ hogarId }: { hogarId: string }) {
  const [state, formAction] = useActionState(regenerarCodigoHogar, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="hogar_id" value={hogarId} />
      <SubmitButton
        pendingLabel="Regenerando…"
        className="flex items-center justify-center gap-2 bg-zinc-800 text-sm dark:bg-zinc-100 dark:text-zinc-900"
      >
        <FiRefreshCw className="h-4 w-4" aria-hidden />
        Regenerar código
      </SubmitButton>
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        El código actual dejará de funcionar apenas generes uno nuevo.
      </p>
      {state.error ? (
        <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
