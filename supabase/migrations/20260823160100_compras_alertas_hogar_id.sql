-- Paso 2 del soporte multi-usuario: agrega hogar_id a compras y alertas_config
-- (nullable por ahora — el backfill en 20260823160200 lo completa y
-- 20260823160300 lo pone NOT NULL y activa el RLS por hogar).
--
-- Además, `compras.user_id` se renombra a `compras.created_by`: a partir de
-- 20260823160300 la visibilidad/edición de una compra depende del hogar
-- (hogar_id), no de quién la creó. La columna se conserva —solo cambia de
-- nombre y de rol— exclusivamente para auditoría ("quién la registró").
-- alertas_config NO se renombra: mantiene `user_id` porque sigue siendo,
-- también después de esta migración, la preferencia de UN usuario particular
-- (cuánto antes avisarle a ESA persona) — hogar_id ahí es solo para que RLS
-- pueda extender la visibilidad al resto del hogar, no cambia de "dueño".

alter table public.compras
  rename column user_id to created_by;

comment on column public.compras.created_by is
  'Quién registró la compra (auditoría). Ya NO determina permisos desde 20260823160300: la visibilidad/edición depende de hogar_id vía hogar_miembros.';

alter table public.compras
  add column hogar_id uuid references public.hogares (id) on delete restrict;

alter table public.alertas_config
  add column hogar_id uuid references public.hogares (id) on delete restrict;

comment on column public.compras.hogar_id is
  'Hogar al que pertenece la compra. Nullable hasta el backfill (20260823160200); NOT NULL desde 20260823160300. Determina quién puede ver/editar la fila.';
comment on column public.alertas_config.hogar_id is
  'Hogar al que pertenece el usuario dueño de esta configuración. Nullable hasta el backfill (20260823160200); NOT NULL desde 20260823160300. Permite que cualquier miembro del hogar vea/edite la config de alertas de los demás.';

-- Requisito 5 original ("índices para... comparación") extendido a hogar_id:
-- toda policy nueva de compras/alertas_config (20260823160300) va a filtrar
-- por "hogar_id in (mis hogares)", así que hace falta indexarlo igual que ya
-- se indexó user_id en la migración original.
create index compras_hogar_id_idx on public.compras (hogar_id);
create index alertas_config_hogar_id_idx on public.alertas_config (hogar_id);
