import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * true si {@link configureVapid} ya seteó las claves. Los API routes lo chequean
 * para devolver un error claro en vez de que `web-push` tire un throw críptico si
 * alguien se olvidó de configurar las env vars (ver docs/pwa-push.md).
 */
export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

let configured = false;

/**
 * Setea las claves VAPID en la instancia (singleton, a nivel de módulo) de
 * `web-push`. Idempotente: `setVapidDetails` es barato pero no hace falta
 * llamarlo en cada notificación.
 */
function configureVapid() {
  if (configured) return;
  if (!isPushConfigured()) {
    throw new Error(
      "Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT. Generalas con `npx web-push generate-vapid-keys` (ver docs/pwa-push.md)."
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export type PushSendResult =
  | { ok: true }
  // Subscription vencida/revocada del lado del navegador (404/410): quien llama
  // debe borrarla de push_subscriptions para no seguir intentando en vano.
  | { ok: false; expired: true }
  | { ok: false; expired: false; error: string };

/**
 * Manda una notificación push a UNA suscripción. No tira: cada fallo se modela
 * en el resultado para que el caller (hoy: el cron de vencimientos) pueda seguir
 * con las demás suscripciones del batch sin que una vencida tumbe todo el job.
 */
export async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
): Promise<PushSendResult> {
  configureVapid();

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? (error as { statusCode: number }).statusCode
        : undefined;

    // 404 = endpoint no existe más, 410 = Gone (el navegador canceló la
    // suscripción). Ambos significan "borrá esta fila", no "reintentá".
    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, expired: true };
    }

    return {
      ok: false,
      expired: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
