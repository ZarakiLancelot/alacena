-- Backfill: crea un profile para cada usuario existente que todavía no
-- tenga uno (todo usuario registrado antes de la migración 20260823170000,
-- ya que el trigger on_auth_user_created_crear_profile solo dispara para
-- altas nuevas). Idempotente: el LEFT JOIN ... WHERE p.id IS NULL hace que
-- correrla de nuevo sobre una base ya migrada no inserte nada.
insert into public.profiles (id, nombre_completo)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
