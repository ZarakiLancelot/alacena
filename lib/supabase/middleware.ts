import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas públicas: no requieren sesión. Todo lo demás se trata como protegido.
const PUBLIC_PATHS = ["/login", "/signup"];

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

  const supabase = createServerClient(
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
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isPublicPath || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/inventario";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // IMPORTANTE: hay que devolver `supabaseResponse` tal cual (o clonar sus
  // cookies) para no perder las cookies refrescadas por Supabase Auth.
  return supabaseResponse;
}
