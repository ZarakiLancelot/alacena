"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

/**
 * Regenera el código de invitación del hogar. `regenerar_codigo_hogar` (ver
 * supabase/migrations/20260824090000_hogares_nombre_update_column_grant.sql)
 * es `SECURITY DEFINER` y valida "es owner" ella misma (`es_owner_de_hogar`):
 * desde esa migración, `authenticated` ya no tiene GRANT UPDATE sobre
 * `hogares.codigo_invitacion` (solo sobre `nombre`), así que ya no puede
 * apoyarse en la policy de RLS de `hogares` para autorizar ese campo. Si
 * quien llama no es owner, el RPC directamente falla (errcode 42501) — no
 * hace falta revalidar el rol acá antes de llamar.
 */
export async function regenerarCodigoHogar(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const hogarId = formData.get("hogar_id");
  if (typeof hogarId !== "string" || !hogarId) {
    return { error: "Falta el hogar." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerar_codigo_hogar", {
    p_hogar_id: hogarId,
  });

  if (error) {
    return {
      error:
        error.code === "42501"
          ? "Solo el dueño del hogar puede regenerar el código."
          : `No se pudo regenerar el código: ${error.message}`,
    };
  }

  revalidatePath("/ajustes/hogar");
  return { success: true };
}
