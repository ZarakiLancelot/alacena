-- La policy "hogares_update_owner" (migración 20260823160000) ya restringe
-- el UPDATE de `hogares` por FILA (solo el owner, solo su propio hogar),
-- pero RLS no restringe por COLUMNA: con el GRANT UPDATE genérico que tenía
-- la tabla, el owner podía hacer
-- `update hogares set codigo_invitacion = '...' where id = ...` directo
-- desde el cliente, saltándose por completo `regenerar_codigo_hogar()` (y
-- su generación aleatoria vía `generar_codigo_invitacion()`).
--
-- Fix: GRANT a nivel de columna. `authenticated` puede actualizar `nombre`,
-- nada más — ni `codigo_invitacion`, ni `created_by`/`created_at`/`id`. Un
-- UPDATE que intente tocar `codigo_invitacion` falla con "permission
-- denied for table hogares" en la capa de privilegios de Postgres, antes
-- de que la policy de RLS llegue siquiera a evaluarse.
revoke update on public.hogares from authenticated;
grant update (nombre) on public.hogares to authenticated;

-- `regenerar_codigo_hogar` seguía dependiendo de ese GRANT genérico (era
-- SECURITY INVOKER) para poder tocar codigo_invitacion — con el GRANT
-- restringido de arriba, dejaría de poder hacerlo. Pasa a SECURITY DEFINER
-- (corre con los privilegios del dueño de la función, sin la restricción de
-- columna) y ahora valida "es owner" EXPLÍCITAMENTE en el cuerpo: al ser
-- SECURITY DEFINER ya no puede apoyarse en que la policy de RLS filtre el
-- UPDATE por auth.uid() (un SECURITY DEFINER corre con los privilegios —y,
-- típicamente, el BYPASSRLS— del dueño de la función, no los de quien la
-- llama).
create or replace function public.regenerar_codigo_hogar(p_hogar_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuevo_codigo text;
begin
  if not public.es_owner_de_hogar(p_hogar_id) then
    raise exception 'No se encontró el hogar o no tenés permiso para regenerar su código.'
      using errcode = '42501';
  end if;

  v_nuevo_codigo := public.generar_codigo_invitacion();

  update public.hogares
    set codigo_invitacion = v_nuevo_codigo
    where id = p_hogar_id;

  return v_nuevo_codigo;
end;
$$;

comment on function public.regenerar_codigo_hogar(uuid) is
  'Genera un nuevo código de invitación para el hogar indicado. SECURITY DEFINER: desde 20260823190000, authenticated ya no tiene GRANT UPDATE sobre hogares.codigo_invitacion (solo sobre nombre), así que esta función valida "es owner" ella misma (es_owner_de_hogar) en vez de depender de la policy de RLS para autorizar. Falla (errcode 42501) si el hogar no existe o quien llama no es owner.';
