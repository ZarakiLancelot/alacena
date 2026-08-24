-- Configuración de alertas de vencimiento por usuario. Privado: cada usuario solo
-- ve/edita su propia configuración.
--
-- Decisión de diseño: una fila por usuario (unique(user_id)). Modela "alertas_config"
-- como una configuración singular por usuario, no una lista de reglas. Si en el
-- futuro se necesitan múltiples umbrales por usuario, basta con quitar el
-- constraint unique.

create table public.alertas_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dias_antes integer not null default 3,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  constraint alertas_config_dias_antes_nonneg check (dias_antes >= 0),
  constraint alertas_config_user_unique unique (user_id)
);

comment on table public.alertas_config is
  'Configuración de alertas de vencimiento, una fila por usuario. Privado (user_id = auth.uid()).';
comment on column public.alertas_config.dias_antes is
  'Días de anticipación con los que se debe avisar antes de fecha_vencimiento.';

alter table public.alertas_config enable row level security;

create policy "alertas_config_select_own"
  on public.alertas_config for select
  to authenticated
  using (user_id = auth.uid());

create policy "alertas_config_insert_own"
  on public.alertas_config for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "alertas_config_update_own"
  on public.alertas_config for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "alertas_config_delete_own"
  on public.alertas_config for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.alertas_config to authenticated;
