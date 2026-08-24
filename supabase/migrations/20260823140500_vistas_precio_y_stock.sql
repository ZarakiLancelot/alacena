-- Requisito 3: función + vista para calcular precio por unidad y comparar entre tiendas.
-- Requisito 4: vista de stock actual (compras no consumidas).
--
-- Nota de seguridad: todas las vistas se crean con security_invoker = true para que
-- respeten el RLS de las tablas subyacentes usando el rol de quien consulta (no el
-- dueño de la vista). Sin esto, en Postgres < 15 (o si el dueño tuviera BYPASSRLS)
-- una vista podría filtrar filas de compras de otros usuarios.

create or replace function public.calcular_precio_unitario(precio numeric, tamano numeric)
returns numeric
language sql
immutable
parallel safe
as $$
  select case
    when tamano is null or tamano = 0 then null
    else round(precio / tamano, 4)
  end;
$$;

comment on function public.calcular_precio_unitario(numeric, numeric) is
  'precio / tamaño, redondeado a 4 decimales. Null si tamaño es null o 0 (evita división por cero). Usada por vista_precio_unitario.';

grant execute on function public.calcular_precio_unitario(numeric, numeric) to authenticated;

-- Precio por unidad de cada compra (propia del usuario, filtrada por RLS de compras),
-- con el resto de los datos ya "aplanados" para poder comparar el mismo producto
-- entre tiendas sin hacer los joins a mano en el cliente.
create view public.vista_precio_unitario
  with (security_invoker = true) as
select
  c.id as compra_id,
  c.user_id,
  pr.id as producto_id,
  pr.nombre as producto_nombre,
  pr.categoria,
  pr.marca,
  p.id as presentacion_id,
  p.tamaño,
  p.unidad,
  t.id as tienda_id,
  t.nombre as tienda_nombre,
  c.precio_normal,
  c.precio_oferta,
  coalesce(c.precio_oferta, c.precio_normal) as precio_pagado,
  public.calcular_precio_unitario(coalesce(c.precio_oferta, c.precio_normal), p.tamaño) as precio_por_unidad,
  c.fecha_compra
from public.compras c
join public.presentaciones p on p.id = c.presentacion_id
join public.productos pr on pr.id = p.producto_id
join public.tiendas t on t.id = c.tienda_id;

comment on view public.vista_precio_unitario is
  'Precio por unidad (precio_normal u oferta / tamaño) de cada compra del usuario, con producto y tienda ya resueltos. Base para comparar el mismo producto entre tiendas.';

grant select on public.vista_precio_unitario to authenticated;

-- Stock actual: compras aún no consumidas, agregadas por producto+presentación.
-- "Resta" las consumidas simplemente excluyéndolas (where consumido = false).
create view public.vista_stock_actual
  with (security_invoker = true) as
select
  c.user_id,
  pr.id as producto_id,
  pr.nombre as producto_nombre,
  pr.categoria,
  pr.marca,
  p.id as presentacion_id,
  p.tamaño,
  p.unidad,
  count(*) as compras_pendientes,
  sum(c.cantidad) as cantidad_total_pendiente,
  min(c.fecha_vencimiento) as proxima_fecha_vencimiento
from public.compras c
join public.presentaciones p on p.id = c.presentacion_id
join public.productos pr on pr.id = p.producto_id
where c.consumido = false
group by c.user_id, pr.id, pr.nombre, pr.categoria, pr.marca, p.id, p.tamaño, p.unidad;

comment on view public.vista_stock_actual is
  'Stock actual por producto/presentación del usuario: suma de cantidad de compras con consumido = false (resta las consumidas excluyéndolas).';

grant select on public.vista_stock_actual to authenticated;

-- Extra útil para las alertas de vencimiento (requisito 5 menciona explícitamente
-- índices "para queries de alertas"): compras no consumidas que ya entraron en la
-- ventana de aviso configurada por el usuario en alertas_config.
create view public.vista_alertas_vencimiento
  with (security_invoker = true) as
select
  c.id as compra_id,
  c.user_id,
  pr.nombre as producto_nombre,
  t.nombre as tienda_nombre,
  c.fecha_vencimiento,
  (c.fecha_vencimiento - current_date) as dias_para_vencer,
  ac.dias_antes
from public.compras c
join public.presentaciones p on p.id = c.presentacion_id
join public.productos pr on pr.id = p.producto_id
join public.tiendas t on t.id = c.tienda_id
join public.alertas_config ac on ac.user_id = c.user_id and ac.activa = true
where c.consumido = false
  and c.fecha_vencimiento is not null
  and c.fecha_vencimiento <= (current_date + ac.dias_antes);

comment on view public.vista_alertas_vencimiento is
  'Compras no consumidas del usuario cuya fecha_vencimiento ya entró en la ventana de aviso (dias_antes) definida en alertas_config.';

grant select on public.vista_alertas_vencimiento to authenticated;
