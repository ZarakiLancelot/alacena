"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

/**
 * Actualiza cadena_id/ubicacion de una tienda del catálogo compartido. Se
 * apoya en la policy `tiendas_update_own` (solo `created_by = auth.uid()`
 * puede editar) — no hace falta revalidar "es mía" acá, un UPDATE que no
 * matchee esa policy simplemente afecta 0 filas (no tira error).
 */
export async function actualizarTienda(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const tiendaId = formData.get("tienda_id");
  if (typeof tiendaId !== "string" || !tiendaId) {
    return { error: "Falta la tienda." };
  }

  const cadenaIdRaw = formData.get("cadena_id");
  const cadenaId = typeof cadenaIdRaw === "string" && cadenaIdRaw ? cadenaIdRaw : null;

  const ubicacionRaw = formData.get("ubicacion");
  const ubicacion =
    typeof ubicacionRaw === "string" && ubicacionRaw.trim() ? ubicacionRaw.trim() : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tiendas")
    .update({ cadena_id: cadenaId, ubicacion })
    .eq("id", tiendaId)
    .select("id");

  if (error) {
    // 23505: choca con tiendas_cadena_ubicacion_unique_idx (ya existe otra
    // sucursal con esta misma cadena+ubicación).
    return {
      error:
        error.code === "23505"
          ? "Ya existe una tienda con esa cadena y ubicación."
          : `No se pudo actualizar la tienda: ${error.message}`,
    };
  }
  if (!data || data.length === 0) {
    return { error: "Solo quien creó esta tienda puede editarla." };
  }

  // "layout": tienda+ubicación se muestran en historial/inventario/analytics,
  // no solo en esta pantalla.
  revalidatePath("/ajustes/tiendas", "layout");
  return { success: true };
}
