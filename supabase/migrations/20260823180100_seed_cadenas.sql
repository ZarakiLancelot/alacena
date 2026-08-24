-- Semilla inicial de cadenas conocidas (mercado guatemalteco, coherente con
-- GTQ/es-GT ya usado en el resto de la app). Idempotente: el índice único
-- normalizado (lower(btrim(nombre)), migración 20260823180000) es el target
-- del ON CONFLICT, así que correr esta migración de nuevo sobre una base ya
-- sembrada no inserta duplicados ni falla.
insert into public.cadenas (nombre) values
  ('PriceSmart'),
  ('Walmart'),
  ('Paiz'),
  ('La Torre'),
  ('Maxi Despensa'),
  ('Suma')
on conflict (lower(btrim(nombre))) do nothing;
