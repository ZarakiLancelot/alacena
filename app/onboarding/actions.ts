"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const crearHogarSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá un nombre para tu hogar").max(80),
});

/**
 * Funda un hogar nuevo. `hogares.created_by` tiene `default auth.uid()` (no
 * hace falta mandarlo) y el trigger `hogares_crear_membresia_owner` deja
 * automáticamente a quien lo crea como `owner` en `hogar_miembros` — no hay
 * nada más que hacer del lado de la app para que crearCompra/
 * guardarAlertasConfig empiecen a funcionar.
 */
export async function crearHogar(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = crearHogarSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tenés que iniciar sesión." };

  const { error } = await supabase.from("hogares").insert({ nombre: parsed.data.nombre });

  if (error) {
    return { error: `No se pudo crear el hogar: ${error.message}` };
  }

  // A /ajustes/hogar (no /inventario): apenas fundado, lo más útil es ver el
  // código de invitación para compartirlo con el resto del hogar.
  redirect("/ajustes/hogar");
}

const unirseSchema = z.object({
  codigo: z
    .string()
    .trim()
    .length(6, "El código tiene 6 caracteres"),
});

/**
 * Códigos de error de unirse_a_hogar (ver
 * supabase/migrations/20260823160000_hogares.sql): P0002 = código inexistente,
 * 23505 = ya es miembro de ese hogar.
 */
export async function unirseAHogar(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = unirseSchema.safeParse({ codigo: formData.get("codigo") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("unirse_a_hogar", {
    p_codigo: parsed.data.codigo,
  });

  if (error) {
    if (error.code === "P0002") {
      return { error: "El código de invitación no es válido." };
    }
    if (error.code === "23505") {
      return { error: "Ya sos miembro de ese hogar." };
    }
    return { error: `No se pudo unir al hogar: ${error.message}` };
  }

  redirect("/inventario");
}
