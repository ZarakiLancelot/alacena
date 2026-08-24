-- Tabla de presentaciones: los distintos tamaños/formatos en los que se vende un
-- producto (ej. "Leche entera" en presentación 1L y otra en 200ml).
--
-- Hereda la naturaleza de catálogo compartido de productos (mismo razonamiento:
-- todos los usuarios deben referenciar la misma fila "Leche entera 1L" para que la
-- comparación de precio por unidad tenga sentido entre distintas compras/tiendas).

create table public.presentaciones (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  tamaño numeric not null,
  unidad text not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint presentaciones_tamano_positive check (tamaño > 0),
  constraint presentaciones_unidad_not_blank check (btrim(unidad) <> '')
);

comment on table public.presentaciones is
  'Tamaños/formatos de venta de un producto (ej. 1L, 500g, "unidad"). Catálogo compartido; edición/borrado solo por el creador.';
comment on column public.presentaciones.tamaño is
  'Cantidad de la unidad de medida (ej. 1, 0.5, 12). Debe ser > 0 para poder calcular precio por unidad.';
comment on column public.presentaciones.unidad is
  'Unidad de medida en texto libre, ej. ''L'', ''ml'', ''kg'', ''g'', ''unidad'', ''paquete''.';

-- Requisito 5: índice por producto_id para las queries de comparación de precios.
create index presentaciones_producto_id_idx on public.presentaciones (producto_id);

-- Evita presentaciones duplicadas del mismo producto (mismo tamaño+unidad).
create unique index presentaciones_producto_tamano_unidad_unique_idx
  on public.presentaciones (producto_id, tamaño, lower(btrim(unidad)));

alter table public.presentaciones enable row level security;

create policy "presentaciones_select_authenticated"
  on public.presentaciones for select
  to authenticated
  using (true);

create policy "presentaciones_insert_authenticated"
  on public.presentaciones for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "presentaciones_update_own"
  on public.presentaciones for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "presentaciones_delete_own"
  on public.presentaciones for delete
  to authenticated
  using (created_by = auth.uid());

grant select, insert, update, delete on public.presentaciones to authenticated;
