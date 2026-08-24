# PWA y notificaciones push

Este documento cubre lo que se agregó para que Alacena sea instalable (PWA) y
mande notificaciones push de vencimiento: cómo generar las claves VAPID, cómo
probar todo en local, la migración SQL de `push_subscriptions` y las
limitaciones conocidas de iOS Safari.

## Por qué `@serwist/turbopack` y no `@serwist/next`

Next.js 16 usa **Turbopack por defecto** en `next dev` y `next build` (ver
`node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md`), y
Turbopack **no ejecuta la función `webpack()`** de `next.config.ts` ni soporta
plugins de webpack. `@serwist/next` (el paquete "clásico") depende de
`@serwist/webpack-plugin` y por lo tanto no hace nada bajo Turbopack — el propio
paquete imprime un warning al respecto en runtime.

Por eso el service worker se integra con **`@serwist/turbopack`**, que en vez de
un plugin de webpack sirve el SW (bundleado con `esbuild`) desde un Route
Handler: `app/serwist/[path]/route.ts` → `app/serwist/sw.js`. Ver
https://serwist.pages.dev/docs/next/turbo.

## Arquitectura (qué archivo hace qué)

| Archivo | Qué hace |
|---|---|
| `next.config.ts` | `withSerwist()` — solo marca `esbuild`/`esbuild-wasm` como `serverExternalPackages`. |
| `app/serwist/[path]/route.ts` | Route Handler que bundlea y sirve `app/sw.ts` en `/serwist/sw.js`, con el header `Service-Worker-Allowed: /` (deja que un SW servido desde una subcarpeta controle todo el sitio). |
| `app/sw.ts` | El service worker: precache del app shell + `defaultCache` (runtime caching) + fallback offline + listeners de `push`/`notificationclick`. |
| `app/manifest.ts` | Web App Manifest (`/manifest.webmanifest`). |
| `app/layout.tsx` | `<SerwistProvider swUrl="/serwist/sw.js">` registra el SW en el cliente; metadata de `appleWebApp`/`icons.apple` para iOS. |
| `app/offline/page.tsx` | Página de fallback offline. |
| `lib/push/*`, `app/api/push/*` | Suscripción/desuscripción push del usuario. |
| `app/api/cron/vencimientos/route.ts` | Cron diario que manda los push de vencimiento. |
| `components/push/AlertasBanner.tsx` | Fallback in-app (banner) para cuando el push no llega. |

## Estrategia de caching

`defaultCache` (exportado por `@serwist/turbopack/worker`) ya implementa
exactamente lo pedido para una app Next.js:

- **Precache** del app shell (JS/CSS del build, manifest, íconos).
- **Network-first** para HTML/RSC de páginas, `/api/*` y `_next/data/*.json`
  (con fallback a cache si la red tarda más de 10s) — cubre las páginas que
  leen de Supabase.
- **Cache-first / stale-while-revalidate** para assets estáticos versionados
  (`_next/static`, fuentes, imágenes).
- En `NODE_ENV !== "production"` (dev) se reemplaza todo por *network-only*
  para no pelear con Fast Refresh — normal en cualquier setup de Serwist.
- **Fallback offline**: si una navegación falla por falta de red y no hay nada
  cacheado para esa URL, se sirve `/offline`.

## VAPID: generar las claves

```bash
npx web-push generate-vapid-keys --json
```

Devuelve `{ "publicKey": "...", "privateKey": "..." }`. Van en `.env`
(gitignorado, no se commitea):

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>   # se manda al navegador, no es secreta
VAPID_PUBLIC_KEY=<publicKey>               # la usa web-push del lado del servidor
VAPID_PRIVATE_KEY=<privateKey>             # SECRETA — nunca con prefijo NEXT_PUBLIC_
VAPID_SUBJECT=mailto:tu-email@dominio.com  # contacto que ven los push services (FCM/Mozilla) si hay abuso
```

Ya hay un par generado en `.env` para que el flujo funcione out-of-the-box en
local. **Regeneralo antes de producción** (y no lo compartas fuera del equipo:
quien tenga `VAPID_PRIVATE_KEY` puede mandar push a nombre de esta app a
cualquier suscripción guardada).

También hace falta, en `.env`:

```bash
SUPABASE_SERVICE_ROLE_KEY=<Project Settings → API → service_role>
CRON_SECRET=<random, ej. `openssl rand -base64 32`>
```

`SUPABASE_SERVICE_ROLE_KEY` la usa `lib/supabase/admin.ts` (bypassea RLS) para
que el cron pueda leer las alertas y suscripciones de **todos** los usuarios,
no solo del que hace el request. `CRON_SECRET` protege
`/api/cron/vencimientos` — sin el header `Authorization: Bearer <CRON_SECRET>`
correcto, la ruta devuelve 401.

## Probar el push en local

1. `npm run dev` y logueate en la app.
2. Andá a **Ajustes** (`/ajustes`) → "Activar" en Notificaciones push. El
   navegador va a pedir permiso; al aceptar, `PushToggle` se suscribe y guarda
   el endpoint en `push_subscriptions` vía `/api/push/subscribe`.
   - `localhost` está exceptuado del requisito de HTTPS para Service
     Workers/Push, así que esto funciona en `npm run dev` sin certificados.
3. Cargá una compra (`/compras`) con `fecha_vencimiento` dentro de la ventana
   de aviso (por defecto 3 días — configurable en la misma página de Ajustes).
4. Disparar el cron a mano:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/vencimientos
   ```

   Debería aparecer la notificación del sistema operativo (con la pestaña en
   foco o en background) y la respuesta JSON del cron va a mostrar cuántos
   push se mandaron. Volver a llamarlo no debería reenviar nada
   (`comprasMarcadas` en 0) porque `compras.alerta_enviada_at` ya quedó
   seteado.
5. Para ver el fallback in-app: des-suscribite (botón "Desactivar" en
   Ajustes) y recargá `/inventario` — el banner ámbar de arriba debería
   aparecer igual, porque lee `vista_alertas_vencimiento` directo con RLS del
   usuario, no depende de si hay push activo.

### Inspeccionar/depurar el service worker

Chrome DevTools → **Application → Service Workers** muestra el SW registrado
en `/serwist/sw.js`, con un botón "Push" para simular un push sin pasar por el
cron (útil para iterar rápido en el listener `push` de `app/sw.ts`).
**Application → Manifest** valida `app/manifest.ts` (íconos, `display`,
instalabilidad).

## Migración SQL: `push_subscriptions`

`supabase/migrations/20260823150000_push_subscriptions.sql` (resumen — ver el
archivo completo para comentarios y RLS):

```sql
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,          -- { p256dh, auth }
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_not_blank check (btrim(endpoint) <> ''),
  constraint push_subscriptions_keys_shape check (keys ? 'p256dh' and keys ? 'auth')
);

create unique index push_subscriptions_endpoint_unique_idx on public.push_subscriptions (endpoint);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
-- policies: select/insert/update/delete solo user_id = auth.uid() (mismo
-- patrón que compras/alertas_config). El cron lee esta tabla con la service
-- role key, que bypassea RLS.

grant select, insert, update, delete on public.push_subscriptions to authenticated;
```

Además, `supabase/migrations/20260823150100_compras_alerta_enviada.sql` agrega
`compras.alerta_enviada_at` (dedup: evita reenviar la misma alerta todos los
días mientras la compra siga sin consumirse) y actualiza
`vista_alertas_vencimiento` para exponer esa columna.

Aplicar contra el proyecto ya enlazado:

```bash
supabase db push
# o, si preferís generar y revisar el diff primero:
supabase migration up
```

Y regenerar los tipos TypeScript (`types/database.types.ts` ya se actualizó a
mano para este cambio, pero conviene re-generarlos contra la base real):

```bash
supabase gen types typescript --linked > types/database.types.ts
```

## El cron: Vercel Cron (u otro)

`vercel.json` define un cron diario a las 12:00 UTC:

```json
{ "crons": [{ "path": "/api/cron/vencimientos", "schedule": "0 12 * * *" }] }
```

En Vercel, si el proyecto tiene la env var `CRON_SECRET` configurada, Vercel
agrega automáticamente `Authorization: Bearer $CRON_SECRET` a la request del
cron — no hace falta configurar nada más ahí. Si se prefiere un cron externo
(GitHub Actions, cron-job.org, etc.) en vez del de Vercel, cualquiera sirve
mientras mande ese mismo header contra
`https://tu-dominio/api/cron/vencimientos`.

`proxy.ts`/`lib/supabase/middleware.ts` excluyen explícitamente `/api/cron/` y
`/serwist/` de la protección por sesión (esas rutas no tienen cookie de
Supabase — se autentican solo, en el caso del cron, con `CRON_SECRET`). Si se
agregan más cron routes, hay que sumarlas ahí también.

## Limitaciones conocidas de iOS Safari

- **Web Push en iOS/iPadOS solo funciona si la PWA está instalada** ("Compartir"
  → "Añadir a Inicio") **y** el usuario abrió la app desde ese ícono al menos
  una vez. En una pestaña normal de Safari, `window.PushManager` no existe —
  intentar suscribirse ahí falla silenciosamente (por eso `PushToggle` chequea
  `isPushSupported()`/`isIOS()`/`isRunningStandalone()` y muestra
  instrucciones en vez de un botón roto).
- Soporte real desde **iOS 16.4** (marzo 2023). Versiones anteriores no tienen
  Web Push aunque la app esté instalada.
- El manifest (`app/manifest.ts`) **no** lo lee Safari para el ícono/nombre de
  "Añadir a Inicio": usa las meta tags específicas de Apple
  (`appleWebApp`, `icons.apple` en `app/layout.tsx`, que generan
  `<link rel="apple-touch-icon">` y `apple-mobile-web-app-*`).
- Con la PWA instalada, iOS **sí** entrega push aunque la app esté cerrada
  (no hace falta tenerla abierta), igual que Android.

### Fallback para cuando el push no llega

`components/push/AlertasBanner.tsx` — un Server Component en el layout del
dashboard que lee `vista_alertas_vencimiento` (filtrada por RLS al usuario
logueado) y muestra un banner si hay compras en la ventana de aviso. Corre en
**cada** carga de página del dashboard, sin importar si el usuario tiene push
activado o no, así que cubre:

- iOS Safari sin instalar como PWA (no puede recibir push, punto).
- Usuario que bloqueó el permiso de notificaciones.
- Usuario que todavía no tocó "Activar" en Ajustes.
- Cualquier falla puntual de entrega del push service (FCM/Mozilla/APNs caído,
  etc.).

No reemplaza al push (no llega si la app está cerrada), pero garantiza que
nadie se pierde una alerta la próxima vez que abre la app.
