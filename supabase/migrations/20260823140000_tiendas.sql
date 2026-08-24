-- Tabla de tiendas (supermercados).
--
-- Decisión de diseño: catálogo COMPARTIDO entre todos los usuarios (no aislado por
-- usuario). Razón: para comparar precios de un mismo producto "entre tiendas" tiene
-- que existir una única fila "Supermercado X" que todos los usuarios reutilicen; si
-- cada usuario tuviera su propia copia de "Supermercado X" la comparación entre
-- usuarios/compras sería imposible y se duplicaría el catálogo sin necesidad.
--
-- Cualquier usuario autenticado puede leer y crear tiendas. Solo quien creó una fila
-- (created_by) puede editarla o borrarla, para evitar que un usuario corrompa datos
-- que otros usuarios ya están usando. Ver supabase/README.md para más detalle.

-- Salvaguarda: en proyectos Supabase recientes el schema "public" no otorga acceso
-- a los roles de la Data API por defecto (auto_expose_new_tables ya no aplica).
-- No falla si ya estaba otorgado.
grant usage on schema public to anon, authenticated;

create table public.tiendas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint tiendas_nombre_not_blank check (btrim(nombre) <> '')
);

comment on table public.tiendas is
  'Catálogo compartido de tiendas/supermercados. Lectura y alta abiertas a cualquier usuario autenticado; edición/borrado solo por el creador (created_by).';
comment on column public.tiendas.created_by is
  'Usuario que dio de alta la tienda. Null si el usuario fue borrado. Usado por las policies de UPDATE/DELETE.';

-- Evita duplicados triviales por mayúsculas/espacios ("Walmart" vs "walmart ").
create unique index tiendas_nombre_unique_idx on public.tiendas (lower(btrim(nombre)));

alter table public.tiendas enable row level security;

create policy "tiendas_select_authenticated"
  on public.tiendas for select
  to authenticated
  using (true);

create policy "tiendas_insert_authenticated"
  on public.tiendas for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "tiendas_update_own"
  on public.tiendas for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "tiendas_delete_own"
  on public.tiendas for delete
  to authenticated
  using (created_by = auth.uid());

-- El GRANT es la "puerta externa"; RLS (arriba) es el filtro por fila. Ambos hacen falta.
grant select, insert, update, delete on public.tiendas to authenticated;
