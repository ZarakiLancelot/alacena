import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alacena",
  description: "Tracking de compras y stock de supermercado",
  manifest: "/manifest.webmanifest",
  // iOS Safari no lee manifest.json para el ícono/nombre de "Añadir a inicio": usa
  // estas etiquetas específicas de Apple (ver docs/pwa-push.md, sección iOS).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Alacena",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Registra app/serwist/[path]/route.ts como service worker apenas monta.
          `cacheOnNavigation` (default true) va guardando cada ruta visitada en
          runtime cache; `reloadOnOnline` (default true) refresca la pestaña si
          volvió la conexión, para no dejar al usuario viendo /offline a propósito.
        */}
        <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  );
}
