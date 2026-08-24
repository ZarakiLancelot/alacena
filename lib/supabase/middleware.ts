import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { getHogarIdActual } from "@/lib/supabase/hogar";

// Onboarding obligatorio (ver supabase/README.md, sección "Decisiones a
// revisar"): compras/alertas_config tienen `hogar_id` NOT NULL desde
// 20260823160300, así que un usuario sin hogar no puede cargar nada. Esta
// ruta es la única salida de ese estado (crear un hogar o unirse por código).
const ONBOARDING_PATH = "/onboarding";

// Páginas de autenticación: no requieren sesión, y si el usuario YA está logueado
// se lo saca de ahí (ver el segundo `if` de abajo) — no tiene sentido ver /login
// con sesión activa.
const AUTH_PATHS = ["/login", "/signup"];

// Rutas públicas que NO son de auth: no requieren sesión, pero tampoco hay que
// redirigir a un usuario logueado que las pida (a diferencia de /login).
const PUBLIC_PATHS = ["/offline", "/manifest.webmanifest"];

// Prefijos públicos (rutas dinámicas/anidadas, no un pathname exacto):
// - /serwist/ — el service worker (sw.js/sw.js.map) tiene que poder registrarse
//   ANTES de que haya sesión (ej. mientras se muestra /login); si el proxy lo
//   redirige a /login, el navegador "instala" esa respuesta HTML como service
//   worker y rompe el registro.
// - /api/cron/ — lo llama un cron externo (Vercel Cron u otro) sin cookie de
//   sesión de Supabase; se autentica solo con el header
//   `Authorization: Bearer $CRON_SECRET` dentro de la propia Route Handler (ver
//   app/api/cron/vencimientos/route.ts). Si esto no fuera público, el proxy lo
//   redirigiría (307) a /login antes de que el handler llegue a validar nada.
const PUBLIC_PREFIXES = ["/serwist/", "/api/cron/"];

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas
 * privadas. Se invoca desde `proxy.ts` (el archivo `middleware.ts` fue
 * renombrado a `proxy.ts` en Next.js 16, ver node_modules/next/dist/docs).
 *
 * Solo hace el check "optimista" (lee la cookie/JWT vía `getUser()`, que la
 * valida contra Supabase Auth). Las políticas de RLS son la verdadera capa
 * de seguridad para los datos; esto es únicamente para redirigir la UI.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPath = AUTH_PATHS.includes(pathname);
  const isPublicPath =
    isAuthPath ||
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isAuthPath || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/inventario";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath) {
    // `.catch` deliberado: si la consulta falla (ej. blip de red), se deja
    // pasar el request en vez de atrapar a todo el mundo en un loop de
    // redirects — el error real se manifiesta igual en la página destino.
    const hogarId = await getHogarIdActual(supabase, user.id).catch(() => undefined);

    if (hogarId === null && pathname !== ONBOARDING_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (hogarId && pathname === ONBOARDING_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = "/inventario";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANTE: hay que devolver `supabaseResponse` tal cual (o clonar sus
  // cookies) para no perder las cookies refrescadas por Supabase Auth.
  return supabaseResponse;
}
