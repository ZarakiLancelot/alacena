import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

/**
 * Borra la suscripción push del usuario logueado. Se llama tanto al desactivar
 * notificaciones desde la UI (components/push/PushToggle.tsx) como, del lado del
 * navegador, en el listener `pushsubscriptionchange` si el browser invalida el
 * endpoint por su cuenta.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = unsubscribeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // RLS (`push_subscriptions_delete_own`) ya garantiza que esto solo borra filas
  // del propio usuario; el `.eq("user_id", ...)` es defensa en profundidad, no
  // hace falta para la seguridad pero deja explícito el alcance de la query.
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
