import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

/**
 * Resuelve el hogar "actual" de un usuario: el más antiguo del que sea
 * miembro (joined_at ascendente). Con el backfill de
 * supabase/migrations/20260823160200_backfill_hogares.sql todo usuario con
 * compras o alertas_config previas tiene exactamente un hogar, así que en la
 * práctica esto es "su" hogar. Un usuario que se unió a más de un hogar (el
 * propio + uno ajeno por código) igual obtiene una respuesta determinística;
 * no hay todavía UI para elegir hogar activo (ver supabase/README.md).
 *
 * Devuelve null si el usuario no pertenece a ningún hogar (ej. una cuenta
 * nueva, creada después de esta migración, que todavía no creó ni se unió a
 * un hogar).
 */
export async function getHogarIdActual(
  supabase: Client,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("hogar_miembros")
    .select("hogar_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo resolver el hogar del usuario: ${error.message}`);
  }
  return data?.hogar_id ?? null;
}
