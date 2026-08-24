-- Paso 3: migración de datos. Para cada usuario existente con compras y/o
-- alertas_config (sin hogar_id todavía), crea un hogar automático, lo deja
-- como owner (vía el trigger de hogares.crear_membresia_owner definido en
-- 20260823160000) y reasigna sus filas a ese hogar_id.
--
-- Idempotente: solo toca filas con hogar_id is null, así que correrla de
-- nuevo sobre una base ya migrada no hace nada.

create temporary table _usuarios_a_migrar as
select distinct created_by as user_id
from public.compras
where hogar_id is null and created_by is not null
union
select distinct user_id
from public.alertas_config
where hogar_id is null;

-- CREATE TABLE AS solo acepta un SELECT, no un INSERT directo: se envuelve el
-- INSERT ... RETURNING en un CTE modificador de datos y se selecciona de él.
create temporary table _hogares_creados as
with ins as (
  insert into public.hogares (nombre, created_by)
  select
    'Hogar de ' || coalesce(u.raw_user_meta_data ->> 'full_name', u.email, 'usuario'),
    m.user_id
  from _usuarios_a_migrar m
  join auth.users u on u.id = m.user_id
  returning id, created_by as user_id
)
select * from ins;

update public.compras c
set hogar_id = h.id
from _hogares_creados h
where c.created_by = h.user_id and c.hogar_id is null;

update public.alertas_config ac
set hogar_id = h.id
from _hogares_creados h
where ac.user_id = h.user_id and ac.hogar_id is null;

drop table _hogares_creados;
drop table _usuarios_a_migrar;
