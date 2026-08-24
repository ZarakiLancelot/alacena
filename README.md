# Alacena

Tracking personal de compras de supermercado: registrá qué comprás, en qué
tienda y a qué precio, llevá el stock de lo que tenés en casa y recibí un
aviso antes de que algo venza. Instalable como PWA, con notificaciones push
para los vencimientos.

## Features

- **Inventario** (`/inventario`): stock actual (compras aún no consumidas),
  filtrable por categoría, con badge de "vence pronto / vencido" y acción para
  marcar un producto como consumido.
- **Nueva compra** (`/compras`): formulario con autocomplete de tienda y
  producto (crea uno nuevo al vuelo si no existe), presentación (tamaño +
  unidad), precio normal/oferta y fecha de vencimiento.
- **Historial** (`/historial`): todas las compras registradas, filtrable por
  producto y por tienda.
- **Analytics** (`/analytics`): tendencia de precio por producto (línea,
  normal vs. oferta, por tienda), comparador de tiendas (precio por unidad,
  más barata → más cara), resumen de gasto por semana/mes agrupado por
  categoría y por tienda, y alerta si el precio subió vs. la compra anterior.
- **Alertas de vencimiento**: banner in-app + notificación push (cron diario)
  cuando un producto entra en la ventana de aviso configurada en Ajustes.
- **PWA instalable**: funciona offline (fallback + cache de lo ya visitado) y
  se puede agregar a la pantalla de inicio (Android/iOS/desktop).

Todo el cálculo de precio por unidad y las agregaciones para Analytics leen
de vistas SQL (`vista_precio_unitario`, `vista_stock_actual`,
`vista_alertas_vencimiento`) — no hay lógica de precios duplicada en el
frontend. Ver [`supabase/README.md`](./supabase/README.md) para el schema
completo.

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router, Turbopack, Server
  Components/Actions) — ojo: esta versión trae cambios respecto a lo que
  pueda haber en el entrenamiento de un modelo de lenguaje; antes de tocar
  código de framework conviene mirar `node_modules/next/dist/docs/`.
- **[Supabase](https://supabase.com)** (Postgres + Auth + RLS) vía
  `@supabase/ssr` y `@supabase/supabase-js`. Todas las tablas tienen RLS
  habilitado; las vistas usan `security_invoker = true`.
- **[Serwist](https://serwist.pages.dev)** (`@serwist/turbopack`) — service
  worker para la PWA (precache, cache en runtime, fallback offline) y Web
  Push. Detalle completo en [`docs/pwa-push.md`](./docs/pwa-push.md).
- **Tailwind CSS 4**, **Zod** (validación de Server Actions), **Recharts**
  (gráficos de Analytics), **react-icons** (set `Fi`/Feather).

## Correr en local

### Requisitos

- Node.js 20+
- Una base de datos Supabase (proyecto en la nube o `supabase start` local
  con la [CLI de Supabase](https://supabase.com/docs/guides/cli))

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Crear un archivo `.env` en la raíz (está en `.gitignore`, nunca se commitea)
con estas claves:

```bash
# Supabase (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, bypassea RLS — usada por el cron de vencimientos

# Web Push (VAPID) — generar con `npx web-push generate-vapid-keys --json`
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=                   # mailto:tu-email@dominio.com

# Protege /api/cron/vencimientos — generar con `openssl rand -base64 32`
CRON_SECRET=
```

El detalle de cada una (por qué existe, cómo generarla, límites de iOS Safari
con push) está en [`docs/pwa-push.md`](./docs/pwa-push.md). Sin la sección de
VAPID la app funciona igual; solo no vas a poder suscribirte a push (el
banner in-app de alertas sigue andando).

### 3. Aplicar el schema a la base

```bash
supabase link --project-ref <tu-project-ref>   # una sola vez, si es un proyecto remoto
supabase db push
```

Esto corre las migraciones de `supabase/migrations/` (tablas, RLS, vistas de
precio/stock/alertas). Si usás una instancia local (`supabase start`), no
hace falta `link`: `supabase db push` corre directo contra ella.

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) — te redirige a
`/login` (sin sesión) o `/inventario` (con sesión).

### Otros scripts

```bash
npm run build   # build de producción (Turbopack)
npm run start   # sirve el build de producción
npm run lint    # ESLint
```

## Estructura de carpetas

```
app/
  (auth)/            # /login, /signup — layout sin nav
  (dashboard)/        # /inventario, /compras, /historial, /analytics, /ajustes
    layout.tsx         # header + banner de alertas + bottom nav
  api/
    cron/vencimientos/ # cron diario: manda los push de vencimiento
    push/               # suscribir/desuscribir un dispositivo
  offline/             # fallback que sirve el service worker sin red
  manifest.ts          # Web App Manifest de la PWA
  sw.ts                # service worker (Serwist)
  serwist/[path]/      # Route Handler que bundlea y sirve sw.ts

components/
  analytics/    # charts y tablas de /analytics (recharts)
  auth/         # formulario de login/signup
  compras/      # formulario de nueva compra (combobox, presentación)
  dashboard/    # nav bar, botón de logout
  inventario/   # badge de vencimiento
  push/         # toggle de notificaciones, banner de alertas

lib/
  analytics.ts       # agregaciones para /analytics (lee vista_precio_unitario)
  supabase/           # clientes de Supabase (browser/server/middleware/admin)
  push/               # helpers de Web Push
  utils.ts, types.ts, validations.ts

supabase/
  migrations/    # schema SQL (tablas, RLS, vistas)
  README.md      # diagrama y documentación del schema

types/database.types.ts   # tipos generados desde el schema de Supabase
docs/pwa-push.md          # PWA + Web Push en detalle
```

## Deploy

Pensado para [Vercel](https://vercel.com) (`vercel.json` define el cron de
vencimientos). Cualquier plataforma que corra Next.js 16 sirve, siempre que
puedas configurar las variables de entorno y disparar
`POST /api/cron/vencimientos` (con el header
`Authorization: Bearer $CRON_SECRET`) una vez por día.
