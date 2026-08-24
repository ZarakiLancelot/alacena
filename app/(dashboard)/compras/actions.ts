"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { compraSchema } from "@/lib/validations";
import {
  getOrCreateTienda,
  getOrCreateProducto,
  getOrCreatePresentacion,
} from "@/lib/supabase/catalog";
import { getHogarIdActual } from "@/lib/supabase/hogar";
import { decodeCombo } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

export async function crearCompra(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tenés que iniciar sesión." };

  const parsed = compraSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const tiendaSel = decodeCombo(data.tienda);
  const productoSel = decodeCombo(data.producto);
  if (!tiendaSel || !productoSel) {
    return { error: "Faltan datos de tienda o producto." };
  }

  // supabase/migrations/20260823160300 hizo hogar_id obligatorio en compras:
  // toda compra pertenece a un hogar, no solo a quien la carga. Se resuelve
  // acá (antes que nada) para no hacer trabajo de más si el usuario todavía
  // no tiene hogar.
  const hogarId = await getHogarIdActual(supabase, user.id);
  if (!hogarId) {
    return {
      error: "Tu cuenta todavía no pertenece a ningún hogar. Creá uno o unite con un código de invitación.",
    };
  }

  try {
    const tiendaId =
      "id" in tiendaSel
        ? tiendaSel.id
        : await getOrCreateTienda(supabase, tiendaSel.nombre);

    const productoId =
      "id" in productoSel
        ? productoSel.id
        : await getOrCreateProducto(
            supabase,
            productoSel.nombre,
            data.producto_categoria,
            data.producto_marca
          );

    let presentacionId: string;
    if (data.presentacion_id) {
      // El id vino de un <select> en el cliente: se re-valida acá que
      // realmente pertenezca al producto resuelto (los Server Functions son
      // alcanzables por POST directo, no solo desde la UI).
      const { data: presentacion, error } = await supabase
        .from("presentaciones")
        .select("id, producto_id")
        .eq("id", data.presentacion_id)
        .maybeSingle();

      if (error || !presentacion || presentacion.producto_id !== productoId) {
        return {
          error: "La presentación elegida ya no es válida, volvé a seleccionarla.",
        };
      }
      presentacionId = presentacion.id;
    } else if (data.presentacion_tamano && data.presentacion_unidad) {
      presentacionId = await getOrCreatePresentacion(
        supabase,
        productoId,
        data.presentacion_tamano,
        data.presentacion_unidad
      );
    } else {
      return { error: "Faltan el tamaño y la unidad de la presentación." };
    }

    const { error: insertError } = await supabase.from("compras").insert({
      created_by: user.id,
      hogar_id: hogarId,
      presentacion_id: presentacionId,
      tienda_id: tiendaId,
      precio_normal: data.precio_normal,
      precio_oferta: data.precio_oferta ?? null,
      fecha_compra: data.fecha_compra,
      fecha_vencimiento: data.fecha_vencimiento ?? null,
      cantidad: data.cantidad,
    });

    if (insertError) {
      return { error: `No se pudo registrar la compra: ${insertError.message}` };
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Ocurrió un error inesperado.",
    };
  }

  revalidatePath("/inventario");
  revalidatePath("/historial");
  revalidatePath("/compras");

  return { success: true };
}
