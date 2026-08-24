import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured, sendPush } from "@/lib/push/send";

/**
 * Cron diario de alertas de vencimiento (requisito 5). Pensado para Vercel Cron
 * (ver vercel.json) pero es una Route Handler común: cualquier cron externo sirve
 * mientras mande el header Authorization correcto.
 *
 * Qué hace, paso a paso:
 * 1. Lee vista_alertas_vencimiento (con la service role key, para ver la de TODOS
 *    los usuarios) filtrando `alerta_enviada_at is null` — compras que ya entraron
 *    en la ventana de aviso (dias_antes) y todavía no generaron un push.
 * 2. Agrupa esas filas por usuario y arma UNA notificación por usuario (no una por
 *    producto) para no floodear a alguien con 5 vencimientos el mismo día.
 * 3. Le manda esa notificación a cada suscripción push del usuario. Si el push
 *    service devuelve 404/410 (endpoint vencido/revocado), borra esa suscripción.
 * 4. Marca `alerta_enviada_at` en las compras incluidas, para no repetir mañana.
 *
 * Si el usuario no tiene ninguna suscripción push activa (ej. iOS Safari sin
 * instalar como PWA, ver docs/pwa-push.md), este cron simplemente no tiene a
 * quién mandarle nada — el fallback para esos casos es el banner in-app
 * (components/push/AlertasBanner.tsx), que lee la misma vista directamente por
 * RLS cuando el usuario abre la app.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en el servidor" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "VAPID no configurado (ver docs/pwa-push.md)" },
      { status: 500 }
    );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY no configurada (ver docs/pwa-push.md)" },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  const { data: alertas, error: alertasError } = await supabase
    .from("vista_alertas_vencimiento")
    .select("compra_id, user_id, producto_nombre, dias_para_vencer")
    .is("alerta_enviada_at", null);

  if (alertasError) {
    return NextResponse.json({ error: alertasError.message }, { status: 500 });
  }

  type Alerta = {
    compra_id: string | null;
    user_id: string | null;
    producto_nombre: string | null;
    dias_para_vencer: number | null;
  };

  const porUsuario = new Map<string, Alerta[]>();
  for (const alerta of (alertas ?? []) as Alerta[]) {
    if (!alerta.user_id || !alerta.compra_id) continue;
    const lista = porUsuario.get(alerta.user_id) ?? [];
    lista.push(alerta);
    porUsuario.set(alerta.user_id, lista);
  }

  let usuariosNotificados = 0;
  let pushesEnviados = 0;
  let suscripcionesVencidasBorradas = 0;
  const compraIdsNotificadas: string[] = [];

  for (const [userId, items] of porUsuario) {
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, keys")
      .eq("user_id", userId);

    if (subsError || !subs || subs.length === 0) {
      // Sin suscripciones push: no hay a quién avisarle (fallback = banner
      // in-app). No marcamos alerta_enviada_at para que, si el usuario se
      // suscribe más tarde, el próximo cron sí le llegue.
      continue;
    }

    const primerVencimiento = items.reduce((min, i) =>
      (i.dias_para_vencer ?? Infinity) < (min.dias_para_vencer ?? Infinity) ? i : min
    );
    const nombres = items
      .map((i) => i.producto_nombre)
      .filter((n): n is string => Boolean(n));
    const body =
      items.length === 1
        ? `${nombres[0]} vence ${describirDias(primerVencimiento.dias_para_vencer)}.`
        : `${nombres.slice(0, 3).join(", ")}${items.length > 3 ? ` y ${items.length - 3} más` : ""} están por vencer.`;

    const payload = {
      title: items.length === 1 ? "Un producto está por vencer" : `${items.length} productos por vencer`,
      body,
      url: "/inventario",
      tag: "alertas-vencimiento",
    };

    let algunEnvioOk = false;
    for (const sub of subs) {
      const keys = sub.keys as { p256dh: string; auth: string };
      const result = await sendPush({ endpoint: sub.endpoint, keys }, payload);
      if (result.ok) {
        algunEnvioOk = true;
        pushesEnviados++;
      } else if (result.expired) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        suscripcionesVencidasBorradas++;
      }
    }

    if (algunEnvioOk) {
      usuariosNotificados++;
      compraIdsNotificadas.push(...items.map((i) => i.compra_id!));
    }
  }

  if (compraIdsNotificadas.length > 0) {
    const { error: updateError } = await supabase
      .from("compras")
      .update({ alerta_enviada_at: new Date().toISOString() })
      .in("id", compraIdsNotificadas);
    if (updateError) {
      return NextResponse.json(
        {
          error: `Pushes enviados pero falló marcar alerta_enviada_at: ${updateError.message}`,
          usuariosNotificados,
          pushesEnviados,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    usuariosConAlertas: porUsuario.size,
    usuariosNotificados,
    pushesEnviados,
    suscripcionesVencidasBorradas,
    comprasMarcadas: compraIdsNotificadas.length,
  });
}

function describirDias(dias: number | null): string {
  if (dias === null) return "pronto";
  if (dias < 0) return "hace días";
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  return `en ${dias} días`;
}
