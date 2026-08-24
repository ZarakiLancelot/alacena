-- Tabla de productos.
--
-- Misma decisión de diseño que tiendas: catálogo COMPARTIDO. "Leche entera La Serenísima"
-- debe ser una sola fila reutilizada por todos los usuarios; de lo contrario no se
-- podrían comparar precios de "el mismo producto" entre compras/tiendas distintas.
-- Ver supabase/README.md.

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text,
  marca text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint productos_nombre_not_blank check (btrim(nombre) <> '')
);

comment on table public.productos is
  'Catálogo compartido de productos. Lectura y alta abiertas a cualquier usuario autenticado; edición/borrado solo por el creador (created_by).';

create index productos_categoria_idx on public.productos (categoria);

-- Evita duplicados triviales del mismo producto+marca.
create unique index productos_nombre_marca_unique_idx
  on public.productos (lower(btrim(nombre)), lower(btrim(coalesce(marca, ''))));

alter table public.productos enable row level security;

create policy "productos_select_authenticated"
  on public.productos for select
  to authenticated
  using (true);

create policy "productos_insert_authenticated"
  on public.productos for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "productos_update_own"
  on public.productos for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "productos_delete_own"
  on public.productos for delete
  to authenticated
  using (created_by = auth.uid());

grant select, insert, update, delete on public.productos to authenticated;
