"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const nombreHogarSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá un nombre para el hogar").max(80),
});

/**
 * Renombra el hogar. Se apoya pura y exclusivamente en la policy de RLS
 * (`hogares_update_owner`, solo `owner`) + el GRANT a nivel de columna de
 * supabase/migrations/20260824090000_hogares_nombre_update_column_grant.sql
 * (`authenticated` solo puede tocar `nombre`, nada más) — a diferencia de
 * `regenerarCodigoHogar`, acá no hace falta un RPC: un UPDATE directo ya
 * está correctamente acotado en fila (RLS) y en columna (GRANT).
 */
export async function actualizarNombreHogar(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const hogarId = formData.get("hogar_id");
  if (typeof hogarId !== "string" || !hogarId) {
    return { error: "Falta el hogar." };
  }

  const parsed = nombreHogarSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hogares")
    .update({ nombre: parsed.data.nombre })
    .eq("id", hogarId)
    .select("id");

  if (error) {
    return { error: `No se pudo renombrar el hogar: ${error.message}` };
  }
  if (!data || data.length === 0) {
    // RLS dejó pasar 0 filas: quien llama no es owner de este hogar.
    return { error: "Solo el dueño del hogar puede renombrarlo." };
  }

  // "layout": el nombre del hogar también se muestra en el header de
  // app/(dashboard)/layout.tsx, compartido por todas las rutas del
  // dashboard — no solo por /ajustes/hogar.
  revalidatePath("/ajustes/hogar", "layout");
  return { success: true };
}

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
