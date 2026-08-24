import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente de Supabase con la service role key: bypassea RLS.
 *
 * SOLO para código que corre en el servidor y necesita ver filas de TODOS los
 * usuarios (hoy: app/api/cron/vencimientos/route.ts, que tiene que revisar las
 * alertas de vencimiento de cada usuario para mandarles su push). Nunca importar
 * esto desde un Client Component ni exponer `SUPABASE_SERVICE_ROLE_KEY` con el
 * prefijo `NEXT_PUBLIC_`.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para crear el cliente admin de Supabase."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
