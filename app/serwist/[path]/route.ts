import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Sirve el service worker bundleado (app/sw.ts) en /serwist/sw.js.
 *
 * Por qué vive bajo /serwist/ y no en /sw.js directamente: @serwist/turbopack lo
 * expone como un Route Handler dinámico de un solo segmento (`[path]`, no
 * `[...path]`, ver node_modules/@serwist/turbopack/src/lib/build.ts) para poder
 * servir tanto sw.js como su .map sin bundlear con webpack. El GET handler que
 * genera `createSerwistRoute` responde con el header `Service-Worker-Allowed: /`,
 * que le permite a un service worker registrado desde una subcarpeta controlar
 * igual todo el origin (scope "/") — así que esto no achica el alcance del SW.
 *
 * `additionalPrecacheEntries` agrega la página de fallback offline al precache
 * (no aparecería sola porque no es un asset del build, ver app/offline/page.tsx).
 * `revision` se recalcula por build (git SHA si existe) para que Serwist detecte
 * cambios; si no hay repo git disponible, cae a un UUID.
 */
import { spawnSync } from "node:child_process";

const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout?.trim();
const revision = gitRevision || crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [{ url: "/offline", revision }],
  });
