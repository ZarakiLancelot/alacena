"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/utils";

/**
 * Marca una compra como consumida (requisito 4). Se usa con
 * `consumirCompra.bind(null, compra.id)` como `action` de un <form>, así
 * cada fila del inventario tiene su propio botón sin necesitar estado en
 * el cliente. RLS ya restringe el update a compras del propio usuario.
 */
export async function consumirCompra(compraId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("compras")
    .update({ consumido: true, fecha_consumo: today() })
    .eq("id", compraId);

  if (error) {
    throw new Error(`No se pudo marcar como consumido: ${error.message}`);
  }

  revalidatePath("/inventario");
  revalidatePath("/historial");
}
