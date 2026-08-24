import "server-only";
import { headers } from "next/headers";

/**
 * URL base del sitio, para links que Supabase Auth genera en emails
 * (confirmación de signup, reset de password, etc.) y que tienen que apuntar
 * al dominio real — no a `http://localhost:3000`, que es el "Site URL" que
 * suele quedar configurado en el dashboard de Supabase cuando el proyecto se
 * crea apuntando a un entorno local.
 *
 * Prioridad:
 * 1. `NEXT_PUBLIC_SITE_URL` — hay que configurarla en Vercel con el dominio
 *    real de producción (ver README, sección "Variables de entorno").
 * 2. Origin de la request actual (host + protocolo), vía `headers()`. Es el
 *    equivalente server-side de `window.location.origin`: esto corre en un
 *    Server Action (`app/(auth)/actions.ts`), no en el navegador, así que no
 *    hay `window` disponible. Cubre dev local y previews de Vercel sin
 *    necesitar la variable seteada.
 */
export async function getSiteUrl(): Promise<string | undefined> {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("host");
  if (!host) return undefined;

  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
