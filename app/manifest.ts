import type { MetadataRoute } from "next";

// Web App Manifest (requisito 2). `display: "standalone"` + `start_url` + un ícono
// >= 192px y otro >= 512px son los requisitos mínimos de Chrome/Android para que el
// banner "Instalar app" aparezca. iOS Safari NO lee este archivo para el ícono/
// nombre de home screen (usa <link rel="apple-touch-icon"> y
// appleWebApp.title, ver app/layout.tsx) pero sí lo usa para `theme_color` /
// `display` una vez agregada a Inicio. Ver limitaciones de iOS documentadas en
// docs/pwa-push.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alacena — Tracking de compras",
    short_name: "Alacena",
    description:
      "Tracking de compras y stock de supermercado: precios por unidad, inventario y alertas de vencimiento.",
    start_url: "/inventario",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#059669",
    lang: "es-AR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
