/** Convierte la VAPID public key (base64url) al Uint8Array que pide `applicationServerKey`. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * true si el navegador soporta Web Push (`ServiceWorkerRegistration.pushManager`).
 * En iOS Safari esto es false salvo que la PWA ya esté instalada ("Añadir a
 * Inicio") — Apple solo expuso Web Push ahí a partir de iOS 16.4, y nunca en
 * Safari normal (pestaña de navegador). Ver docs/pwa-push.md.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** true si la página corre como PWA instalada (standalone), en iOS o Android. */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** true en iOS/iPadOS (donde aplican las restricciones de Web Push de Safari). */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
