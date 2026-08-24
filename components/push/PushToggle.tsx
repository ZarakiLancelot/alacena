"use client";

import { useEffect, useState } from "react";
import { FiBell, FiBellOff, FiShare2, FiSmartphone } from "react-icons/fi";
import { isIOS, isPushSupported, isRunningStandalone, urlBase64ToUint8Array } from "@/lib/push/client";

type Status =
  | "loading"
  | "unsupported"
  | "ios-needs-install"
  | "denied"
  | "subscribed"
  | "not-subscribed";

/**
 * Activa/desactiva las notificaciones push del navegador actual (requisito 4).
 * Vive en app/(dashboard)/ajustes/page.tsx.
 *
 * Nota importante sobre iOS: Safari solo expone la Push API cuando la página
 * corre como PWA instalada ("Añadir a Inicio"), nunca en una pestaña normal —
 * ver docs/pwa-push.md. Este componente detecta ese caso (`ios-needs-install`) y
 * muestra instrucciones en vez de un botón que fallaría silenciosamente.
 */
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!isPushSupported()) {
        if (isIOS() && !isRunningStandalone()) {
          if (!cancelled) setStatus("ios-needs-install");
        } else if (!cancelled) {
          setStatus("unsupported");
        }
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!cancelled) setStatus(subscription ? "subscribed" : "not-subscribed");
    }

    check().catch(() => !cancelled && setStatus("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY (ver docs/pwa-push.md).");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo guardar la suscripción");
      }

      setStatus("subscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar las notificaciones");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus("not-subscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar las notificaciones");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  if (status === "ios-needs-install") {
    return (
      <Card>
        <p className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-50">
          <FiSmartphone className="h-5 w-5 shrink-0" aria-hidden />
          Instalá la app para recibir notificaciones
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          En iPhone/iPad, Safari solo permite notificaciones push si la app está
          agregada a la pantalla de inicio. Tocá el botón de compartir (
          <FiShare2 className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden />) y elegí{" "}
          <strong>&quot;Añadir a Inicio&quot;</strong>, después abrí Alacena desde ese
          ícono y volvé a esta pantalla.
        </p>
      </Card>
    );
  }

  if (status === "unsupported") {
    return (
      <Card>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Este navegador no soporta notificaciones push. Mientras tanto vas a ver
          los avisos de vencimiento como banner al abrir la app.
        </p>
      </Card>
    );
  }

  if (status === "denied") {
    return (
      <Card>
        <p className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-50">
          <FiBellOff className="h-5 w-5 shrink-0" aria-hidden />
          Notificaciones bloqueadas
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Bloqueaste los permisos de notificaciones para este sitio. Habilitalos
          desde la configuración del navegador para volver a activarlas.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-50">
            <FiBell className="h-5 w-5 shrink-0" aria-hidden />
            Notificaciones push
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {status === "subscribed"
              ? "Activadas en este dispositivo."
              : "Recibí un aviso cuando un producto esté por vencer."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={status === "subscribed" ? unsubscribe : subscribe}
          className="shrink-0 cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white
            disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "…" : status === "subscribed" ? "Desactivar" : "Activar"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {children}
    </div>
  );
}
