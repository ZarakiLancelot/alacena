import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushSubscriptionSchema } from "@/lib/validations";

/**
 * Guarda (o actualiza) la suscripción push del usuario logueado.
 * Llamado desde components/push/PushToggle.tsx tras `pushManager.subscribe()`.
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
  const parsed = pushSubscriptionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Suscripción inválida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get("user-agent");

  // `endpoint` es unique globalmente (ver migración push_subscriptions): el
  // onConflict evita duplicar la fila si el mismo navegador ya estaba suscripto
  // (ej. el usuario borró y volvió a aceptar el permiso de notificaciones). Si el
  // endpoint quedó asociado a OTRO usuario (mismo dispositivo, sesión distinta),
  // el UPDATE de la fila conflictiva no pasa la policy RLS "own" y Postgres
  // devuelve error; en ese caso el cliente debe primero
  // `pushManager.getSubscription().then(s => s.unsubscribe())` antes de
  // re-suscribirse con el usuario nuevo (ver components/push/PushToggle.tsx).
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint, keys, user_agent: userAgent },
      { onConflict: "endpoint" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
