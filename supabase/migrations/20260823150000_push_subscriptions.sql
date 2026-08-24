-- Suscripciones Web Push (requisito 4 del agente de PWA). Guarda el endpoint que
-- devuelve `PushManager.subscribe()` en el navegador para poder mandarle
-- notificaciones push a ese dispositivo/navegador más adelante (ver
-- app/api/push/subscribe/route.ts y lib/push/send.ts).
--
-- Privado por usuario, mismo patrón que compras/alertas_config: cada usuario solo
-- ve y administra sus propias suscripciones (user_id = auth.uid()). El cron de
-- alertas de vencimiento (app/api/cron/vencimientos/route.ts) lee esta tabla con
-- la service role key, que bypassea RLS por diseño de Postgres/Supabase — no hace
-- falta una policy extra para eso.
--
-- Decisión de diseño: `endpoint` es único GLOBAL (no unique(user_id, endpoint)).
-- Un endpoint de push identifica un navegador/dispositivo concreto ante el push
-- service (FCM, Mozilla autopush, etc.), no puede pertenecer a dos usuarios a la
-- vez razonablemente; el upsert de app/api/push/subscribe/route.ts usa esta
-- unicidad para reemplazar la fila si el mismo navegador se re-suscribe (o si un
-- usuario distinto inicia sesión en el mismo dispositivo, la suscripción "se
-- muda" de dueño en vez de duplicarse).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null,
  -- { p256dh: string, auth: string } tal cual los devuelve PushSubscription.toJSON().keys.
  -- jsonb (no dos columnas sueltas) porque es un par que siempre viaja junto y así
  -- el insert desde el cliente es un mapeo directo de PushSubscriptionJSON.
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_not_blank check (btrim(endpoint) <> ''),
  constraint push_subscriptions_keys_shape check (keys ? 'p256dh' and keys ? 'auth')
);

comment on table public.push_subscriptions is
  'Suscripciones Web Push por usuario/dispositivo. Privado (user_id = auth.uid()). El cron de alertas de vencimiento la lee con la service role key.';
comment on column public.push_subscriptions.endpoint is
  'URL del push service (único globalmente: identifica un navegador/dispositivo concreto).';
comment on column public.push_subscriptions.keys is
  'Claves de cifrado de la suscripción: {p256dh, auth}, tal cual PushSubscription.toJSON().keys.';
comment on column public.push_subscriptions.user_agent is
  'navigator.userAgent al momento de suscribirse. Solo diagnóstico (ej. distinguir qué dispositivo dejó de recibir push).';

create unique index push_subscriptions_endpoint_unique_idx on public.push_subscriptions (endpoint);
-- Toda policy de RLS filtra por user_id (mismo motivo que compras_user_id_idx).
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
