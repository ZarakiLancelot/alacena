import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

// Next.js 16 usa Turbopack por defecto (`next dev` / `next build` ya no llaman a
// `webpack()` en next.config). El paquete "clásico" `@serwist/next` depende de
// `@serwist/webpack-plugin` y por lo tanto NO funciona con Turbopack (ver el propio
// warning que imprime en runtime y node_modules/next/dist/docs/.../08-turbopack.md,
// sección "Known gaps with webpack" → "Webpack plugins").
//
// `@serwist/turbopack` es el reemplazo soportado: en vez de un plugin de webpack,
// sirve el service worker (bundleado con esbuild) desde un Route Handler
// (app/serwist/[path]/route.ts). `withSerwist` acá solo agrega "esbuild"/"esbuild-wasm"
// a `serverExternalPackages` para que Next no intente bundlearlos.
// Ver https://serwist.pages.dev/docs/next/turbo
const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
