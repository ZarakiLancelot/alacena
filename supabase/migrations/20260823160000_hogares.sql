-- Soporte multi-usuario: "hogares" (households). Un hogar agrupa usuarios que
-- comparten inventario/compras (ej. una familia usando la app juntos). Este es
-- el primer paso: define hogares + membresías + las funciones de apoyo. La
-- migración 20260823160100 agrega hogar_id a compras/alertas_config, la
-- 20260823160200 migra los datos existentes y la 20260823160300 activa el RLS
-- basado en hogar (hasta esa migración, compras/alertas_config siguen
-- funcionando exactamente como antes).

-- Generador de código de invitación: 6 caracteres, sin 0/O/1/I para evitar
-- ambigüedad cuando alguien lo lee/dicta en voz alta. Es una decisión de
-- implementación, no lo que exige el constraint de la tabla (que acepta
-- cualquier alfanumérico de 6 caracteres, por si en el futuro se cargan
-- códigos manualmente con otro charset).
create or replace function public.generar_codigo_invitacion()
returns text
language plpgsql
volatile
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidato text;
begin
  loop
    select string_agg(substr(chars, (floor(random() * length(chars)) + 1)::int, 1), '')
      into candidato
      from generate_series(1, 6);
    exit when not exists (
      select 1 from public.hogares where codigo_invitacion = candidato
    );
  end loop;
  return candidato;
end;
$$;

comment on function public.generar_codigo_invitacion() is
  'Genera un código de invitación de 6 caracteres, reintentando hasta que no choque con uno existente. Usado como default de hogares.codigo_invitacion y por regenerar_codigo_hogar().';

create table public.hogares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo_invitacion text not null unique default public.generar_codigo_invitacion(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint hogares_nombre_not_blank check (btrim(nombre) <> ''),
  constraint hogares_codigo_shape check (codigo_invitacion ~ '^[A-Za-z0-9]{6}$')
);

comment on table public.hogares is
  'Hogares: grupos de usuarios que comparten compras/inventario. Visible solo para sus miembros (ver hogar_miembros).';
comment on column public.hogares.codigo_invitacion is
  'Código de 6 caracteres alfanuméricos para que otros usuarios se unan vía unirse_a_hogar(). Único global.';

create table public.hogar_miembros (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references public.hogares (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rol text not null default 'member',
  joined_at timestamptz not null default now(),
  constraint hogar_miembros_rol_valido check (rol in ('owner', 'member')),
  -- Además de evitar membresías duplicadas, esta unicidad ordena (user_id,
  -- hogar_id) con user_id primero: es exactamente el índice que necesitan las
  -- queries "¿de qué hogares soy miembro?" (ver hogar_id_actual más abajo y
  -- lib/supabase/hogar.ts en el frontend).
  constraint hogar_miembros_user_hogar_unique unique (user_id, hogar_id)
);

comment on table public.hogar_miembros is
  'Membresía de usuarios en hogares (n:n). rol=''owner'' solo para quien creó el hogar o fue promovido; sin flujo de promoción por ahora.';

alter table public.hogares enable row level security;
alter table public.hogar_miembros enable row level security;

-- Helpers de membresía para las policies. SECURITY DEFINER + owned by el rol
-- de las migraciones (con BYPASSRLS): evita que la policy de hogar_miembros
-- se autorreferencie a través de RLS (el patrón recomendado por Supabase para
-- "¿es X miembro de Y?" en tablas de membresía; sin esto, la subquery dentro
-- de la propia policy de SELECT de hogar_miembros dispararía la misma policy
-- recursivamente, con riesgo real de mal rendimiento). `stable` porque el
-- resultado no cambia dentro de la misma transacción/query.
create or replace function public.es_miembro_de_hogar(p_hogar_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.hogar_miembros
    where hogar_id = p_hogar_id and user_id = auth.uid()
  );
$$;

create or replace function public.es_owner_de_hogar(p_hogar_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.hogar_miembros
    where hogar_id = p_hogar_id and user_id = auth.uid() and rol = 'owner'
  );
$$;

comment on function public.es_miembro_de_hogar(uuid) is
  'true si auth.uid() pertenece al hogar indicado. SECURITY DEFINER a propósito: evita recursión de RLS sobre hogar_miembros. Usada por las policies de hogares, hogar_miembros, compras y alertas_config.';
comment on function public.es_owner_de_hogar(uuid) is
  'true si auth.uid() es owner del hogar indicado. Usada por la policy de UPDATE de hogares (regenerar_codigo_hogar depende de ella).';

revoke all on function public.es_miembro_de_hogar(uuid) from public;
revoke all on function public.es_owner_de_hogar(uuid) from public;
grant execute on function public.es_miembro_de_hogar(uuid) to authenticated;
grant execute on function public.es_owner_de_hogar(uuid) to authenticated;

-- hogares: visible solo para miembros; alta abierta (cualquier authenticated
-- puede fundar un hogar); edición (ej. renombrar, regenerar código) solo el
-- owner. Sin policy de DELETE por ahora (borrar un hogar es una operación con
-- cascada fuerte sobre compras/alertas_config; se deja para una iteración
-- futura si hace falta).
-- `or created_by = auth.uid()` no es redundante: sin él, un INSERT ...
-- RETURNING (o el .insert().select() que hace supabase-js por defecto) falla
-- la policy de SELECT que Postgres aplica sobre la fila devuelta, porque esa
-- comprobación corre antes de que el trigger hogares_crear_membresia_owner
-- (que crea la fila en hogar_miembros) sea visible para es_miembro_de_hogar()
-- dentro de la misma sentencia. Verificado localmente: sin este fallback,
-- "insert into hogares (nombre) values (...) returning *" fallaba con "new
-- row violates row-level security policy for table hogares" pese a que el
-- creador es, obviamente, miembro de su propio hogar recién creado.
create policy "hogares_select_miembros"
  on public.hogares for select
  to authenticated
  using (public.es_miembro_de_hogar(id) or created_by = auth.uid());

create policy "hogares_insert_authenticated"
  on public.hogares for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "hogares_update_owner"
  on public.hogares for update
  to authenticated
  using (public.es_owner_de_hogar(id))
  with check (public.es_owner_de_hogar(id));

grant select, insert, update on public.hogares to authenticated;

-- hogar_miembros: los miembros ven las membresías de SUS hogares (así pueden
-- listar quién más está en el hogar); nadie puede insertar/actualizar
-- directamente (el alta pasa por el trigger de creación de hogar o por
-- unirse_a_hogar(), ambas rutas corren como SECURITY DEFINER y bypassean
-- RLS). Cualquier miembro puede borrar su propia fila (irse del hogar); el
-- owner puede borrar la de cualquiera (echar a alguien).
create policy "hogar_miembros_select_mis_hogares"
  on public.hogar_miembros for select
  to authenticated
  using (public.es_miembro_de_hogar(hogar_id));

create policy "hogar_miembros_delete_propio_o_owner"
  on public.hogar_miembros for delete
  to authenticated
  using (user_id = auth.uid() or public.es_owner_de_hogar(hogar_id));

grant select, delete on public.hogar_miembros to authenticated;

-- Al crear un hogar, quien lo crea queda automáticamente como owner. Esto es
-- lo que le permite a un usuario nuevo (sin hogar heredado de la migración de
-- backfill) arrancar su propio hogar sin necesitar una policy de INSERT
-- directa sobre hogar_miembros.
create or replace function public.crear_membresia_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hogar_miembros (hogar_id, user_id, rol)
  values (new.id, coalesce(new.created_by, auth.uid()), 'owner');
  return new;
end;
$$;

create trigger hogares_crear_membresia_owner
  after insert on public.hogares
  for each row
  execute function public.crear_membresia_owner();

comment on function public.crear_membresia_owner() is
  'Trigger de hogares: inserta automáticamente al creador como owner en hogar_miembros. SECURITY DEFINER porque no hay policy de INSERT directa sobre hogar_miembros.';

-- RPC: unirse a un hogar por código de invitación.
create or replace function public.unirse_a_hogar(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hogar_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No hay sesión activa.' using errcode = '28000';
  end if;

  select id into v_hogar_id
  from public.hogares
  where codigo_invitacion = upper(btrim(p_codigo));

  if v_hogar_id is null then
    raise exception 'El código de invitación no es válido.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.hogar_miembros
    where hogar_id = v_hogar_id and user_id = v_user_id
  ) then
    raise exception 'Ya sos miembro de este hogar.' using errcode = '23505';
  end if;

  begin
    insert into public.hogar_miembros (hogar_id, user_id, rol)
    values (v_hogar_id, v_user_id, 'member');
  exception when unique_violation then
    -- Backstop ante una carrera (doble click, dos pestañas): mismo mensaje
    -- limpio que el chequeo de arriba en vez de un 500 genérico.
    raise exception 'Ya sos miembro de este hogar.' using errcode = '23505';
  end;

  return v_hogar_id;
end;
$$;

comment on function public.unirse_a_hogar(text) is
  'Valida el código de invitación (case-insensitive) y agrega a auth.uid() como member del hogar. Falla con errcode P0002 si el código no existe, o 23505 si el usuario ya es miembro. Devuelve el hogar_id.';

revoke all on function public.unirse_a_hogar(text) from public;
grant execute on function public.unirse_a_hogar(text) to authenticated;

-- RPC: regenerar el código de invitación de un hogar. Solo el owner puede
-- (se apoya en la policy de UPDATE de hogares, que ya exige es_owner_de_hogar
-- — no se duplica esa lógica acá). Si el hogar no existe o quien llama no es
-- owner, el UPDATE afecta 0 filas y la función lo reporta como error único
-- ("no encontrado o sin permiso"), sin distinguir los dos casos para no
-- filtrar si un hogar_id existe o no.
create or replace function public.regenerar_codigo_hogar(p_hogar_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_nuevo_codigo text := public.generar_codigo_invitacion();
begin
  update public.hogares
    set codigo_invitacion = v_nuevo_codigo
    where id = p_hogar_id;

  if not found then
    raise exception 'No se encontró el hogar o no tenés permiso para regenerar su código.'
      using errcode = '42501';
  end if;

  return v_nuevo_codigo;
end;
$$;

comment on function public.regenerar_codigo_hogar(uuid) is
  'Genera un nuevo código de invitación para el hogar indicado. SECURITY INVOKER: depende de la policy de UPDATE de hogares (solo owner) para autorizar. Falla (errcode 42501) si el hogar no existe o quien llama no es owner.';

revoke all on function public.regenerar_codigo_hogar(uuid) from public;
grant execute on function public.regenerar_codigo_hogar(uuid) to authenticated;
