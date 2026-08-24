-- Requisito 5: vista_precio_unitario ahora también expone cadena_id y
-- cadena_nombre (LEFT JOIN: tiendas.cadena_id es nullable, una tienda sin
-- cadena catalogada sigue apareciendo en la vista con cadena_id/cadena_nombre
-- en null), para poder agrupar/comparar tanto por tienda individual como por
-- cadena completa, ej.:
--
--   -- comparar precio unitario promedio de un producto por cadena
--   select cadena_nombre, avg(precio_por_unidad)
--   from vista_precio_unitario
--   where producto_id = '...'
--   group by cadena_nombre
--   order by avg(precio_por_unidad) asc nulls last;
--
--   -- comparar por sucursal individual (ya existente, sin cambios)
--   select tienda_nombre, precio_por_unidad
--   from vista_precio_unitario
--   where producto_id = '...'
--   order by precio_por_unidad asc;
--
-- Se recrea con DROP + CREATE (no CREATE OR REPLACE VIEW) para poder ubicar
-- cadena_id/cadena_nombre junto a tienda_id/tienda_nombre en vez de al
-- final de la lista de columnas — mismo motivo que en 20260823160300
-- (CREATE OR REPLACE VIEW solo permite *agregar* columnas al final).
drop view public.vista_precio_unitario;
create view public.vista_precio_unitario
  with (security_invoker = true) as
select
  c.id as compra_id,
  c.hogar_id,
  c.created_by,
  pr.id as producto_id,
  pr.nombre as producto_nombre,
  pr.categoria,
  pr.marca,
  p.id as presentacion_id,
  p.tamaño,
  p.unidad,
  t.id as tienda_id,
  t.nombre as tienda_nombre,
  t.ubicacion as tienda_ubicacion,
  ca.id as cadena_id,
  ca.nombre as cadena_nombre,
  c.precio_normal,
  c.precio_oferta,
  coalesce(c.precio_oferta, c.precio_normal) as precio_pagado,
  public.calcular_precio_unitario(coalesce(c.precio_oferta, c.precio_normal), p.tamaño) as precio_por_unidad,
  c.fecha_compra
from public.compras c
join public.presentaciones p on p.id = c.presentacion_id
join public.productos pr on pr.id = p.producto_id
join public.tiendas t on t.id = c.tienda_id
left join public.cadenas ca on ca.id = t.cadena_id;

comment on view public.vista_precio_unitario is
  'Precio por unidad de cada compra visible para el usuario (todo su hogar, por RLS de compras), con producto, tienda y cadena ya resueltos. cadena_id/cadena_nombre en null si la tienda no pertenece a ninguna cadena catalogada. Base para comparar el mismo producto entre tiendas individuales o entre cadenas completas.';

grant select on public.vista_precio_unitario to authenticated;
