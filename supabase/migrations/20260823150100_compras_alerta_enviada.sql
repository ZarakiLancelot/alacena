-- Soporte de deduplicación para el cron de alertas de vencimiento (requisito 5).
-- Sin esto, el cron diario reenviaría la misma notificación push todos los días
-- mientras la compra siga dentro de la ventana de aviso (dias_antes) sin
-- consumirse ni vencer del todo.
--
-- Decisión de diseño: una sola columna en `compras` (no una tabla de log aparte)
-- porque la relación es 1:1 con la compra — "esta compra ya generó una alerta
-- push, sí o no" — y así el cron puede hacer el update atómico en la misma fila
-- que acaba de leer, sin joins ni upserts contra otra tabla.
alter table public.compras
  add column alerta_enviada_at timestamptz;

comment on column public.compras.alerta_enviada_at is
  'Momento en que se envió la notificación push de vencimiento para esta compra. Null = todavía no se avisó. La pone app/api/cron/vencimientos/route.ts tras enviar el push; evita reenviar la misma alerta en corridas posteriores del cron mientras la compra siga sin consumirse.';

-- vista_alertas_vencimiento (migración 20260823140500) no filtraba por esto porque
-- también la usa el fallback in-app (requisito 6: banner en el dashboard), que sí
-- debe seguir mostrando alertas ya "empujadas" por push mientras el usuario no las
-- vea. Se agrega la columna a la vista para que el cron pueda filtrar
-- `alerta_enviada_at is null` sin tener que leer `compras` aparte.
create or replace view public.vista_alertas_vencimiento
  with (security_invoker = true) as
select
  c.id as compra_id,
  c.user_id,
  pr.nombre as producto_nombre,
  t.nombre as tienda_nombre,
  c.fecha_vencimiento,
  (c.fecha_vencimiento - current_date) as dias_para_vencer,
  ac.dias_antes,
  c.alerta_enviada_at
from public.compras c
join public.presentaciones p on p.id = c.presentacion_id
join public.productos pr on pr.id = p.producto_id
join public.tiendas t on t.id = c.tienda_id
join public.alertas_config ac on ac.user_id = c.user_id and ac.activa = true
where c.consumido = false
  and c.fecha_vencimiento is not null
  and c.fecha_vencimiento <= (current_date + ac.dias_antes);

comment on view public.vista_alertas_vencimiento is
  'Compras no consumidas del usuario cuya fecha_vencimiento ya entró en la ventana de aviso (dias_antes) definida en alertas_config. Incluye alerta_enviada_at para que el cron de push pueda filtrar las que ya se notificaron.';

grant select on public.vista_alertas_vencimiento to authenticated;
