"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const alertasConfigSchema = z.object({
  dias_antes: z.coerce.number().int().min(0).max(30),
  activa: z.boolean(),
});

/**
 * Guarda la configuración de alertas de vencimiento del usuario (dias_antes,
 * activa). alertas_config tiene `unique(user_id)`, así que upsert(onConflict:
 * user_id) crea la fila la primera vez y la actualiza después sin tener que
 * distinguir los dos casos a mano.
 */
export async function guardarAlertasConfig(formData: FormData): Promise<void> {
  const parsed = alertasConfigSchema.parse({
    dias_antes: formData.get("dias_antes"),
    activa: formData.get("activa") === "on",
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("alertas_config")
    .upsert({ user_id: user.id, ...parsed }, { onConflict: "user_id" });

  if (error) {
    throw new Error(`No se pudo guardar la configuración: ${error.message}`);
  }

  revalidatePath("/ajustes");
  revalidatePath("/inventario");
}
