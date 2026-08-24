/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Service worker de Alacena. Bundleado por @serwist/turbopack (esbuild) y servido
// desde app/serwist/[path]/route.ts — NO se bundlea con webpack/Turbopack normal,
// así que este archivo corre en el scope de un Worker, no de Next.js.
//
// Estrategia de caching (requisito 3):
// - Precache del "app shell" (JS/CSS/manifest/íconos del build) vía
//   `precacheEntries: self.__SW_MANIFEST`, inyectado en build time.
// - `defaultCache` de @serwist/turbopack ya implementa exactamente lo pedido para
//   una app Next.js: network-first para páginas/RSC/HTML y para todo lo que cuelga
//   de /api/ (con fallback a cache si la red tarda >10s), y cache-first/
//   stale-while-revalidate para assets estáticos versionados (_next/static, fuentes,
//   imágenes). Ver node_modules/@serwist/turbopack/src/lib/constants.ts. En dev
//   (`NODE_ENV !== "production"`) se reemplaza por network-only para no pelear con
//   Fast Refresh.
// - `fallbacks.entries`: si una navegación (documento HTML) falla por estar offline
//   y no hay nada en cache para esa URL, sirve /offline (precacheada explícitamente
//   en additionalPrecacheEntries, ver app/serwist/[path]/route.ts).
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// --- Web Push (requisito 4/5) -------------------------------------------------
//
// Serwist no maneja push notifications (es una lib de caching); estos listeners
// son estándar Web Push API sobre el mismo service worker.
//
// El payload lo arma el backend en lib/push/send.ts como JSON:
//   { title, body, url, tag? }
// `tag` deduplica notificaciones repetidas del mismo producto/compra si el
// usuario no llegó a ver la anterior.
type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = {
    title: "Alacena",
    body: "Tenés una alerta de vencimiento.",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      // Payload no era JSON (no debería pasar, ver lib/push/send.ts): se
      // usa el texto plano como cuerpo en vez de descartar la notificación.
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      data: { url: payload.url ?? "/inventario" },
    })
  );
});

// Al tocar la notificación: enfoca una pestaña ya abierta de la app si existe,
// si no abre una nueva en la URL de la alerta (default: /inventario).
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string | undefined) ?? "/inventario";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = allClients.find((c) => new URL(c.url).pathname === targetUrl);
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
