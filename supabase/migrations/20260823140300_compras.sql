-- Tabla de compras: el historial de compras de CADA usuario. A diferencia de
-- tiendas/productos/presentaciones, esta tabla es estrictamente PRIVADA: cada
-- usuario solo ve y edita sus propias filas (user_id = auth.uid()).
--
-- Incluye `consumido` y `fecha_consumo` (requisito 4) para poder calcular el stock
-- actual restando las compras ya consumidas (ver vista_stock_actual en la migración
-- de vistas).

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  presentacion_id uuid not null references public.presentaciones (id) on delete restrict,
  tienda_id uuid not null references public.tiendas (id) on delete restrict,
  precio_normal numeric not null,
  precio_oferta numeric,
  fecha_compra date not null default current_date,
  fecha_vencimiento date,
  cantidad numeric not null default 1,
  consumido boolean not null default false,
  fecha_consumo date,
  created_at timestamptz not null default now(),
  constraint compras_precio_normal_nonneg check (precio_normal >= 0),
  constraint compras_precio_oferta_nonneg check (precio_oferta is null or precio_oferta >= 0),
  constraint compras_precio_oferta_menor_igual check (precio_oferta is null or precio_oferta <= precio_normal),
  constraint compras_cantidad_positive check (cantidad > 0),
  constraint compras_fecha_consumo_requiere_consumido check (fecha_consumo is null or consumido = true)
);

comment on table public.compras is
  'Historial de compras de cada usuario. Privado: solo el dueño (user_id) puede ver/editar/borrar sus propias filas.';
comment on column public.compras.consumido is
  'true si la compra ya fue consumida/gastada. vista_stock_actual excluye las compras con consumido = true.';
comment on column public.compras.fecha_consumo is
  'Fecha en que se marcó la compra como consumida. Debe ser null mientras consumido = false.';
comment on column public.compras.presentacion_id is
  'FK a presentaciones. ON DELETE RESTRICT: no se puede borrar una presentación con historial de compras.';
comment on column public.compras.tienda_id is
  'FK a tiendas. ON DELETE RESTRICT: no se puede borrar una tienda con historial de compras.';

-- Requisito 5: índices para queries de alertas (vencimiento) y comparación de precios.
create index compras_producto_via_presentacion_idx on public.compras (presentacion_id);
create index compras_tienda_id_idx on public.compras (tienda_id);
create index compras_fecha_vencimiento_idx
  on public.compras (fecha_vencimiento)
  where fecha_vencimiento is not null and consumido = false;
-- Toda policy de RLS filtra por user_id: indexarlo es imprescindible para que esas
-- queries no terminen en un seq scan a medida que crece la tabla.
create index compras_user_id_idx on public.compras (user_id);

alter table public.compras enable row level security;

create policy "compras_select_own"
  on public.compras for select
  to authenticated
  using (user_id = auth.uid());

create policy "compras_insert_own"
  on public.compras for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "compras_update_own"
  on public.compras for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "compras_delete_own"
  on public.compras for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.compras to authenticated;
