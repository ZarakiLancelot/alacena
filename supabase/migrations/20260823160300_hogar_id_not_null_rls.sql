-- Paso 4 (final) del soporte multi-usuario: hogar_id pasa a NOT NULL y el RLS
-- de compras/alertas_config deja de mirar "created_by/user_id" y empieza a
-- mirar "¿sos miembro del hogar de esta fila?" (es_miembro_de_hogar, definida
-- en 20260823160000). A partir de acá, cualquier miembro de un hogar ve y
-- edita las compras y la configuración de alertas de todo el hogar.

alter table public.compras
  alter column hogar_id set not null;

alter table public.alertas_config
  alter column hogar_id set not null;

-- --- compras: reemplaza las policies "solo el dueño" por "cualquier miembro
-- del hogar". created_by se sigue exigiendo en el INSERT (nadie puede cargar
-- una compra adjudicándosela a otro), pero ya no filtra el SELECT/UPDATE/DELETE.
drop policy "compras_select_own" on public.compras;
drop policy "compras_insert_own" on public.compras;
drop policy "compras_update_own" on public.compras;
drop policy "compras_delete_own" on public.compras;

create policy "compras_select_miembros_hogar"
  on public.compras for select
  to authenticated
  using (public.es_miembro_de_hogar(hogar_id));

create policy "compras_insert_miembros_hogar"
  on public.compras for insert
  to authenticated
  with check (public.es_miembro_de_hogar(hogar_id) and created_by = auth.uid());

create policy "compras_update_miembros_hogar"
  on public.compras for update
  to authenticated
  using (public.es_miembro_de_hogar(hogar_id))
  with check (public.es_miembro_de_hogar(hogar_id));

create policy "compras_delete_miembros_hogar"
  on public.compras for delete
  to authenticated
  using (public.es_miembro_de_hogar(hogar_id));

-- --- alertas_config: mismo criterio. user_id se sigue exigiendo en el
-- INSERT (cada fila sigue siendo la preferencia de un usuario puntual;
-- unique(user_id) no cambia), pero cualquier miembro del hogar puede
-- verla/editarla (por ejemplo, para revisar o ajustar el umbral de aviso de
-- toda la casa desde la pantalla de ajustes de cualquiera de sus integrantes).
drop policy "alertas_config_select_own" on public.alertas_config;
drop policy "alertas_config_insert_own" on public.alertas_config;
drop policy "alertas_config_update_own" on public.alertas_config;
drop policy "alertas_config_delete_own" on public.alertas_config;

create policy "alertas_config_select_miembros_hogar"
  on public.alertas_config for select
  to authenticated
  using (public.es_miembro_de_hogar(hogar_id));

create policy "alertas_config_insert_miembros_hogar"
  on public.alertas_config for insert
  to authenticated
  with check (public.es_miembro_de_hogar(hogar_id) and user_id = auth.uid());

create policy "alertas_config_update_miembros_hogar"
  on public.alertas_config for update
  to authenticated
  using (public.es_miembro_de_hogar(hogar_id))
  with check (public.es_miembro_de_hogar(hogar_id));

create policy "alertas_config_delete_miembros_hogar"
  on public.alertas_config for delete
  to authenticated
  using (public.es_miembro_de_hogar(hogar_id));

-- --- Vistas: recrear para que compilen contra compras.created_by (ya no
-- existe compras.user_id) y para que respeten el nuevo alcance por hogar.
--
-- vista_alertas_vencimiento es consumida tal cual por
-- app/api/cron/vencimientos/route.ts (columna `user_id`, un push por
-- comprador) y por el banner in-app — a propósito NO se cambia su semántica
-- acá: sigue cruzando cada compra únicamente con la alertas_config de quien
-- la registró (`ac.user_id = c.created_by`), no con la de todo el hogar. Ver
-- supabase/README.md ("decisiones a revisar") para por qué se dejó así y qué
-- haría falta para notificar a todo el hogar.
--
-- Se recrean con DROP + CREATE (no CREATE OR REPLACE): las tres cambian de
-- forma en columnas anteriores a la última (agregan hogar_id en el medio,
-- renombran user_id -> created_by), y CREATE OR REPLACE VIEW solo permite
-- *agregar* columnas al final, no reordenar/renombrar las existentes.
drop view public.vista_alertas_vencimiento;
create view public.vista_alertas_vencimiento
  with (security_invoker = true) as
select
  c.id as compra_id,
  c.created_by as user_id,
  c.hogar_id,
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
join public.alertas_config ac on ac.user_id = c.created_by and ac.activa = true
where c.consumido = false
  and c.fecha_vencimiento is not null
  and c.fecha_vencimiento <= (current_date + ac.dias_antes);

comment on view public.vista_alertas_vencimiento is
  'Compras no consumidas cuya fecha_vencimiento ya entró en la ventana de aviso de quien las registró (ac.user_id = c.created_by; no de todo el hogar, ver README). Incluye alerta_enviada_at para que el cron de push filtre las ya notificadas.';

grant select on public.vista_alertas_vencimiento to authenticated;

-- vista_precio_unitario: mismo grano (una fila por compra), ahora también
-- expone hogar_id y created_by (antes "user_id", pero nada del frontend leía
-- ese campo directamente — verificado antes de renombrarlo).
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
  'Precio por unidad de cada compra visible para el usuario (todo su hogar, por RLS de compras), con producto y tienda ya resueltos. Base para comparar el mismo producto entre tiendas.';

grant select on public.vista_precio_unitario to authenticated;

-- vista_stock_actual: ahora agrega por HOGAR (no por usuario individual) — es
-- el stock que importa mostrar: el de la casa, compartido entre sus
-- miembros. No la consume ningún código de app/ todavía (verificado), así
-- que este cambio de grano no rompe nada existente.
drop view public.vista_stock_actual;
create view public.vista_stock_actual
  with (security_invoker = true) as
select
  c.hogar_id,
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
group by c.hogar_id, pr.id, pr.nombre, pr.categoria, pr.marca, p.id, p.tamaño, p.unidad;

comment on view public.vista_stock_actual is
  'Stock actual por producto/presentación de todo el hogar (RLS de compras ya lo limita a los hogares de los que el usuario es miembro): suma de cantidad de compras con consumido = false.';

grant select on public.vista_stock_actual to authenticated;
