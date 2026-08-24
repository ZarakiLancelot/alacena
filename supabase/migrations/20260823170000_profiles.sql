-- Tabla profiles: nombre/avatar de cada usuario, para poder mostrar quién es
-- quién dentro de un hogar (hoy /ajustes/hogar muestra "Miembro {uuid corto}"
-- porque no hay de dónde sacar un nombre — ver el comentario explícito en
-- app/(dashboard)/ajustes/hogar/page.tsx).
--
-- 1:1 con auth.users (id es PK y FK a la vez, on delete cascade: el profile
-- no tiene sentido sin el usuario). Se crea automáticamente vía trigger en
-- auth.users (abajo), no la inserta el cliente.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Nombre/avatar por usuario. 1:1 con auth.users; se crea automáticamente al registrarse (trigger on_auth_user_created_crear_profile) y vía backfill para usuarios previos a esta migración.';
comment on column public.profiles.nombre_completo is
  'Toma raw_user_meta_data->>''full_name'' (o ''name'' como fallback) al momento del signup; null si no vino ninguno. El usuario puede editarlo después.';

-- updated_at no se mantiene solo: sin este trigger quedaría congelado en el
-- valor de created_at para siempre, pese a existir la columna.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger genérico BEFORE UPDATE: pone updated_at = now() en la fila que se está actualizando.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Alta automática de profile al registrarse. SECURITY DEFINER: corre en el
-- contexto de auth.users (fuera del alcance de las policies de public), es
-- el mismo patrón que documenta Supabase para "handle_new_user". El
-- on conflict es una red de seguridad barata, no algo que se espere disparar.
create or replace function public.crear_profile_para_usuario_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre_completo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.crear_profile_para_usuario_nuevo() is
  'Trigger de auth.users (AFTER INSERT): crea un profile vacío (o con nombre_completo si vino en raw_user_meta_data) para cada usuario nuevo.';

create trigger on_auth_user_created_crear_profile
  after insert on auth.users
  for each row
  execute function public.crear_profile_para_usuario_nuevo();

-- Helper de RLS: ¿auth.uid() comparte al menos un hogar con p_user_id?
-- SECURITY DEFINER por el mismo motivo que es_miembro_de_hogar/
-- es_owner_de_hogar (20260823160000): evita que la policy de profiles
-- dispare RLS recursiva sobre hogar_miembros al hacer el self-join.
create or replace function public.comparte_hogar_con(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.hogar_miembros mio
    join public.hogar_miembros otro on otro.hogar_id = mio.hogar_id
    where mio.user_id = auth.uid() and otro.user_id = p_user_id
  );
$$;

comment on function public.comparte_hogar_con(uuid) is
  'true si auth.uid() y p_user_id son miembros de al menos un mismo hogar. Usada por la policy de SELECT de profiles.';

revoke all on function public.comparte_hogar_con(uuid) from public;
grant execute on function public.comparte_hogar_con(uuid) to authenticated;

alter table public.profiles enable row level security;

-- Lectura: el propio profile siempre (incluso sin hogar todavía, ej. en
-- onboarding) + el de cualquiera que comparta un hogar con vos. Deliberadamente
-- NO hay policy que exponga la tabla completa a cualquier authenticated.
create policy "profiles_select_propio_o_hogar"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.comparte_hogar_con(id));

-- Edición: solo el propio. Sin policy de INSERT/DELETE (el alta la hace el
-- trigger de auth.users con SECURITY DEFINER; el borrado lo hace el
-- ON DELETE CASCADE de auth.users — nada de esto necesita que el cliente
-- inserte/borre profiles directamente).
create policy "profiles_update_propio"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, update on public.profiles to authenticated;
