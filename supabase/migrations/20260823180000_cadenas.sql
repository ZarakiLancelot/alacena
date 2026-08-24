-- Cadenas de supermercado (PriceSmart, Walmart, Paiz, ...), separadas de
-- `tiendas`: una tienda es una SUCURSAL puntual (con su propia ubicación);
-- una cadena agrupa todas las sucursales que son "el mismo supermercado" a
-- efectos de comparar precios a nivel de marca, no solo local por local.
--
-- Mismo patrón de catálogo compartido que tiendas/productos (requisito 4):
-- lectura y alta abiertas a cualquier authenticated, edición/borrado solo
-- por el creador. Ver supabase/README.md.

create table public.cadenas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cadenas_nombre_not_blank check (btrim(nombre) <> '')
);

comment on table public.cadenas is
  'Catálogo compartido de cadenas de supermercado (PriceSmart, Walmart, ...). Distinta de tiendas: una cadena agrupa sucursales (tiendas.cadena_id). Lectura y alta abiertas a cualquier authenticated; edición/borrado solo por el creador.';

-- Mismo criterio de unicidad que tiendas/productos (normalizado por
-- mayúsculas/espacios, no la columna cruda) para evitar "Walmart" vs
-- "walmart " como dos cadenas distintas. El requisito pide `nombre unique`;
-- esto lo cumple y además evita esos duplicados triviales.
create unique index cadenas_nombre_unique_idx on public.cadenas (lower(btrim(nombre)));

alter table public.cadenas enable row level security;

create policy "cadenas_select_authenticated"
  on public.cadenas for select
  to authenticated
  using (true);

create policy "cadenas_insert_authenticated"
  on public.cadenas for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "cadenas_update_own"
  on public.cadenas for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "cadenas_delete_own"
  on public.cadenas for delete
  to authenticated
  using (created_by = auth.uid());

grant select, insert, update, delete on public.cadenas to authenticated;

-- --- tiendas: cadena_id (opcional) + ubicacion (sucursal dentro de la cadena) ---

alter table public.tiendas
  add column cadena_id uuid references public.cadenas (id) on delete set null,
  add column ubicacion text;

comment on column public.tiendas.cadena_id is
  'Cadena a la que pertenece esta sucursal, si se conoce. Nullable a propósito: muchas tiendas (de barrio, independientes) no pertenecen a ninguna cadena catalogada. ON DELETE SET NULL: borrar una cadena no borra sus sucursales, solo les quita la asociación.';
comment on column public.tiendas.ubicacion is
  'Texto libre para distinguir sucursales de una misma cadena, ej. ''Fraijanes'', ''Miraflores''. Nullable: no aplica a tiendas sin cadena, y es opcional aun con cadena_id (ej. cadena de sucursal única).';

create index tiendas_cadena_id_idx on public.tiendas (cadena_id);

-- La única sucursal por (cadena, ubicación): evita cargar "Walmart Miraflores"
-- dos veces. Parcial (where ambos not null) porque NULL en un UNIQUE
-- multi-columna de Postgres no colisiona consigo mismo de todos modos —
-- se deja explícito para que el índice documente la regla de negocio real
-- ("cuando ambos no sean null") en vez de depender de ese detalle de NULLs.
create unique index tiendas_cadena_ubicacion_unique_idx
  on public.tiendas (cadena_id, ubicacion)
  where cadena_id is not null and ubicacion is not null;

-- El unique index original de tiendas.nombre (migración 1) asumía que cada
-- tienda tiene un nombre irrepetible en todo el catálogo. Con cadenas, eso
-- deja de ser cierto a propósito: "Walmart" en Fraijanes y "Walmart" en
-- Miraflores son dos filas de tiendas válidas con el MISMO nombre (lo que
-- las distingue es cadena_id + ubicacion, ya cubierto arriba). Se reemplaza
-- por una versión parcial que solo protege a las tiendas SIN cadena
-- (independientes/de barrio), que siguen dependiendo únicamente del nombre
-- para no duplicarse.
drop index public.tiendas_nombre_unique_idx;

create unique index tiendas_nombre_unique_idx
  on public.tiendas (lower(btrim(nombre)))
  where cadena_id is null;

comment on index public.tiendas_nombre_unique_idx is
  'Unicidad de nombre solo para tiendas SIN cadena (independientes/de barrio). Las tiendas con cadena se distinguen por tiendas_cadena_ubicacion_unique_idx, no por nombre (varias sucursales de una misma cadena comparten nombre).';
