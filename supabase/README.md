# Schema de base de datos — Alacena

Tracking personal de compras de supermercado. Backend: Supabase (Postgres 17) +
`supabase-js` v2. Este documento describe el schema aplicado en
`supabase/migrations/`.

## Diagrama

```mermaid
erDiagram
    auth_users ||--o{ tiendas : "created_by (opcional)"
    auth_users ||--o{ productos : "created_by (opcional)"
    auth_users ||--o{ presentaciones : "created_by (opcional)"
    auth_users ||--o{ compras : "created_by (auditoría)"
    auth_users ||--o{ alertas_config : "user_id (dueño, único)"
    auth_users ||--o{ hogares : "created_by (opcional)"
    auth_users ||--o{ hogar_miembros : user_id
    auth_users ||--|| profiles : "id (1:1, on delete cascade)"

    hogares ||--o{ hogar_miembros : hogar_id
    hogares ||--o{ compras : "hogar_id (permisos)"
    hogares ||--o{ alertas_config : "hogar_id (permisos)"

    productos ||--o{ presentaciones : producto_id
    presentaciones ||--o{ compras : presentacion_id
    tiendas ||--o{ compras : tienda_id

    auth_users {
        uuid id PK
    }
    profiles {
        uuid id PK_FK
        text nombre_completo
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }
    hogares {
        uuid id PK
        text nombre
        text codigo_invitacion "único, 6 caracteres"
        uuid created_by FK
        timestamptz created_at
    }
    hogar_miembros {
        uuid id PK
        uuid hogar_id FK
        uuid user_id FK
        text rol "owner | member"
        timestamptz joined_at
    }
    tiendas {
        uuid id PK
        text nombre
        uuid created_by FK
        timestamptz created_at
    }
    productos {
        uuid id PK
        text nombre
        text categoria
        text marca
        uuid created_by FK
        timestamptz created_at
    }
    presentaciones {
        uuid id PK
        uuid producto_id FK
        numeric tamaño
        text unidad
        uuid created_by FK
        timestamptz created_at
    }
    compras {
        uuid id PK
        uuid hogar_id FK "permisos"
        uuid created_by FK "auditoría"
        uuid presentacion_id FK
        uuid tienda_id FK
        numeric precio_normal
        numeric precio_oferta
        date fecha_compra
        date fecha_vencimiento
        numeric cantidad
        boolean consumido
        date fecha_consumo
        timestamptz alerta_enviada_at
        timestamptz created_at
    }
    alertas_config {
        uuid id PK
        uuid hogar_id FK "permisos"
        uuid user_id FK "dueño, único"
        int dias_antes
        boolean activa
        timestamptz created_at
    }
```

Vista ASCII rápida de las relaciones y del alcance de cada tabla (🌐 = catálogo
compartido entre todos los usuarios, 🏠 = compartido dentro del hogar, 🔒 =
privado de un usuario puntual):

```
auth.users
   │
   ├── 🔒 profiles            (1:1, auto-creado al registrarse — visible además
   │                           a quien comparta un hogar con vos, ver más abajo)
   ├── 🌐 tiendas             (compartida; created_by = autor)
   ├── 🌐 productos           (compartida; created_by = autor)
   │        └── 🌐 presentaciones (tamaño+unidad de un producto)
   │
   └── 🏠 hogares ── codigo_invitacion ──▶ unirse_a_hogar()
            └── hogar_miembros (rol: owner | member)
                     ├── 🏠 compras ── tienda_id/presentacion_id ──▶ catálogo
                     │        (created_by = quién la registró, solo auditoría)
                     └── 🏠 alertas_config (una fila por usuario, visible a todo el hogar)
```

## Decisión de diseño: qué es compartido y qué es privado

- **`tiendas`, `productos`, `presentaciones` → catálogo compartido** entre todos
  los usuarios. Cualquier usuario autenticado puede leer y crear filas nuevas;
  solo quien creó una fila (`created_by`) puede editarla o borrarla.
  **Por qué:** el objetivo #3 del schema es comparar el precio de "el mismo
  producto" entre tiendas. Si cada usuario tuviera su propia copia de "Leche
  Entera 1L", la comparación entre compras de distintos días/tiendas —incluso
  del mismo usuario— se rompería por duplicados, y no tendría sentido de
  catálogo colaborativo. `created_by` es nullable y se limpia (`on delete set
  null`) si el usuario es borrado, así el catálogo compartido no se destruye.
- **`compras`, `alertas_config` → compartidas dentro del hogar** (desde
  `20260823160300`). Cualquier miembro del `hogar_id` de la fila puede
  ver/editar/borrar, no solo quien la creó — es el punto central del soporte
  multi-usuario: una compra que carga cualquier integrante del hogar debe
  aparecer en el inventario de todos. `compras.created_by` se conserva para
  saber quién la registró (auditoría), pero ya no filtra permisos.
  `alertas_config.user_id` se conserva porque la fila sigue siendo la
  preferencia de UNA persona (`unique(user_id)` no cambió); `hogar_id` solo
  extiende quién puede *verla/editarla*, no de quién "es".
- **`hogares`, `hogar_miembros` → visibles solo para sus propios miembros**
  (ni compartidas globalmente como tiendas/productos, ni privadas de un solo
  usuario). Un usuario nuevo funda su hogar (`insert into hogares`, el
  trigger `crear_membresia_owner` lo deja como `owner` automáticamente) o se
  une a uno existente con `unirse_a_hogar(codigo)`. Ver la sección "Hogares
  (soporte multi-usuario)" más abajo.
- **`profiles` → 1:1 con cada usuario, pero visible más allá de "el propio"**:
  cualquiera que comparta un hogar con vos puede leer tu `nombre_completo`/
  `avatar_url` (no solo vos). Es la excepción deliberada al patrón "privado =
  solo yo": el objetivo explícito de la tabla es que `/ajustes/hogar` pueda
  mostrar nombres reales de los demás integrantes en vez de
  `Miembro {uuid corto}`. Sigue sin ser pública: alguien que no comparte
  ningún hogar con vos no puede leer tu profile. Editar (`UPDATE`) sigue
  siendo estrictamente "solo el propio". Ver la sección "Profiles" más abajo.

## Migraciones

En `supabase/migrations/`, en orden de aplicación:

1. `20260823140000_tiendas.sql` — tabla `tiendas`, RLS, índice único por
   nombre normalizado, grants.
2. `20260823140100_productos.sql` — tabla `productos`, RLS, índices, grants.
3. `20260823140200_presentaciones.sql` — tabla `presentaciones` (FK a
   `productos`), índice por `producto_id` (requisito 5), RLS, grants.
4. `20260823140300_compras.sql` — tabla `compras` (incluye `consumido` y
   `fecha_consumo`, requisito 4), índices por `presentacion_id`, `tienda_id`,
   `fecha_vencimiento` y `user_id` (requisito 5), RLS, grants.
5. `20260823140400_alertas_config.sql` — tabla `alertas_config` (una fila por
   usuario), RLS, grants.
6. `20260823140500_vistas_precio_y_stock.sql` — función
   `calcular_precio_unitario` y las vistas `vista_precio_unitario`,
   `vista_stock_actual`, `vista_alertas_vencimiento`.
7. `20260823150000_push_subscriptions.sql` — tabla `push_subscriptions`
   (endpoint + keys de Web Push por usuario/dispositivo), RLS, grants. Ver
   `docs/pwa-push.md`.
8. `20260823150100_compras_alerta_enviada.sql` — agrega
   `compras.alerta_enviada_at` (dedup del cron de push) y actualiza
   `vista_alertas_vencimiento` para exponerla.
9. `20260823160000_hogares.sql` — tablas `hogares` y `hogar_miembros`;
   funciones `generar_codigo_invitacion()`, `es_miembro_de_hogar(uuid)`,
   `es_owner_de_hogar(uuid)`; trigger `crear_membresia_owner` (owner
   automático al crear un hogar); RPCs `unirse_a_hogar(codigo)` y
   `regenerar_codigo_hogar(hogar_id)`; RLS y grants de ambas tablas.
10. `20260823160100_compras_alertas_hogar_id.sql` — renombra
    `compras.user_id` → `compras.created_by` (ahora es auditoría, no
    permisos); agrega `hogar_id` (nullable) a `compras` y `alertas_config` +
    sus índices.
11. `20260823160200_backfill_hogares.sql` — migración de datos: para cada
    usuario existente con compras y/o alertas_config, crea un hogar
    automático (`owner` vía el trigger de la migración 9) y reasigna sus
    filas a ese `hogar_id`. Idempotente (solo toca `hogar_id is null`).
12. `20260823160300_hogar_id_not_null_rls.sql` — pone `hogar_id` `NOT NULL`
    en ambas tablas; reemplaza las policies "solo el dueño" de
    `compras`/`alertas_config` por "cualquier miembro del hogar"; recrea las
    tres vistas de la migración 6 para que compilen contra `created_by` y
    reflejen el nuevo alcance.
13. `20260823170000_profiles.sql` — tabla `profiles` (1:1 con `auth.users`,
    `on delete cascade`); trigger genérico `set_updated_at` (mantiene
    `updated_at`); trigger `on_auth_user_created_crear_profile` **en
    `auth.users`** (alta automática al registrarse); función
    `comparte_hogar_con(uuid)`; RLS y grants.
14. `20260823170100_backfill_profiles.sql` — migración de datos: crea un
    `profile` para cada usuario existente sin uno (el trigger de la
    migración 13 solo dispara para altas nuevas). Idempotente.

### Nota sobre GRANTs (importante en este proyecto)

El `supabase/config.toml` de este proyecto usa el default nuevo de Supabase:
las tablas/vistas creadas en `public` **no** quedan expuestas a los roles de
la Data API (`anon`, `authenticated`) solo por tener RLS — hace falta `GRANT`
explícito además de las policies (`auto_expose_new_tables` ya no aplica). Por
eso cada migración incluye, además de las policies, los `GRANT ... TO
authenticated` correspondientes. El rol `anon` no recibe ningún grant: la app
requiere sesión iniciada para leer o escribir cualquier tabla. Verificado
localmente en cada tanda de migraciones: `anon` obtiene `permission denied`
en todas las tablas de `public`, `profiles` incluida.

## RLS aplicado (resumen)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `tiendas` | cualquier `authenticated` | `authenticated`, `created_by = auth.uid()` | solo el creador | solo el creador |
| `productos` | cualquier `authenticated` | `authenticated`, `created_by = auth.uid()` | solo el creador | solo el creador |
| `presentaciones` | cualquier `authenticated` | `authenticated`, `created_by = auth.uid()` | solo el creador | solo el creador |
| `hogares` | miembro del hogar (o `created_by = auth.uid()`, ver nota¹) | `authenticated`, `created_by = auth.uid()` | solo `owner` | — (sin policy) |
| `hogar_miembros` | miembro del hogar | — (solo vía trigger/RPC, ver abajo) | — (sin policy) | uno mismo, o `owner` de cualquiera |
| `compras` | cualquier miembro del `hogar_id` | miembro del hogar, `created_by = auth.uid()` | cualquier miembro del hogar | cualquier miembro del hogar |
| `alertas_config` | cualquier miembro del `hogar_id` | miembro del hogar, `user_id = auth.uid()` | cualquier miembro del hogar | cualquier miembro del hogar |
| `profiles` | uno mismo, o quien comparta un hogar con vos (ver nota²) | — (solo vía trigger, ver abajo) | solo uno mismo | — (sin policy, se borra por `on delete cascade`) |
| `push_subscriptions` | solo dueño | dueño | dueño | dueño |

`user_id`/`created_by` (según la tabla) tienen `default auth.uid()`, así el
cliente (`supabase-js`) no necesita enviarlos explícitamente al hacer
`insert()`; el `WITH CHECK` de cada policy igual garantiza que no se pueda
falsificar el dueño/registrante aunque el cliente los envíe.

¹ **Nota sobre `hogares_select_miembros`:** la condición es
`es_miembro_de_hogar(id) OR created_by = auth.uid()`, no solo lo primero.
Encontrado probando localmente: un `insert into hogares (...) returning *`
(lo que hace `supabase-js` con `.insert().select()` por defecto) fallaba la
policy de SELECT que Postgres aplica sobre la fila devuelta, porque esa
comprobación corre *antes* de que el trigger `crear_membresia_owner` (que
inserta la fila en `hogar_miembros`) sea visible dentro de la misma
sentencia. El `OR created_by = auth.uid()` es el fix: el creador siempre ve
su propio hogar recién creado, independientemente del timing del trigger.

² **Nota sobre `profiles_select_propio_o_hogar`:** la condición es
`id = auth.uid() OR comparte_hogar_con(id)`. El primer término no es
redundante con el segundo: un usuario recién registrado que todavía no creó
ni se unió a ningún hogar (ej. en `/onboarding`) no comparte ningún hogar con
nadie —ni siquiera consigo mismo, `comparte_hogar_con` requiere una fila en
`hogar_miembros`—, así que sin `id = auth.uid()` no podría ver ni su propio
profile hasta tener hogar.

**`profiles` no tiene policy de INSERT ni de DELETE**, mismo patrón que
`hogar_miembros`: el alta la hace el trigger `on_auth_user_created_crear_profile`
(`SECURITY DEFINER`, corre en el contexto de `auth.users`) y el borrado lo
hace el `ON DELETE CASCADE` de `auth.users` — el cliente nunca necesita
insertar ni borrar un profile directamente.

**`hogar_miembros` no tiene policy de INSERT ni de UPDATE.** El alta de una
membresía solo pasa por dos caminos, ambos `SECURITY DEFINER` (corren con
privilegios del owner de la función, que en las migraciones tiene
`BYPASSRLS`, así que no necesitan una policy propia): el trigger
`crear_membresia_owner` (al crear un hogar) y la función `unirse_a_hogar`
(al canjear un código). Esto evita que un usuario pueda insertarse a sí
mismo en `hogar_miembros` sin pasar por la validación del código de
invitación.

## Hogares (soporte multi-usuario)

Un hogar agrupa usuarios que comparten compras/inventario (ej. una familia).
Cada usuario puede pertenecer a más de un hogar (no hay UI todavía para
elegir "hogar activo" — ver decisiones a revisar).

### `generar_codigo_invitacion() → text`

Genera un código de 6 caracteres desde el charset
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin `0/O/1/I`, para que no se confundan
al leerlo/dictarlo), reintentando hasta que no choque con uno existente. Es
el `default` de `hogares.codigo_invitacion`; también la reutiliza
`regenerar_codigo_hogar`. El constraint `hogares_codigo_shape` es más laxo
que el generador (`^[A-Za-z0-9]{6}$`) a propósito, por si alguna vez se carga
un código a mano con otro charset.

### `es_miembro_de_hogar(hogar_id uuid) → boolean` / `es_owner_de_hogar(hogar_id uuid) → boolean`

Helpers `SECURITY DEFINER stable` usados en casi todas las policies nuevas
(`hogares`, `hogar_miembros`, `compras`, `alertas_config`). Son
`SECURITY DEFINER` a propósito: sin eso, la policy de SELECT de
`hogar_miembros` haría una subquery sobre la propia `hogar_miembros`,
disparando la misma policy recursivamente sobre esa subquery — el patrón
recomendado por Supabase para RLS sobre tablas de membresía es exactamente
delegar el chequeo a una función que bypassea RLS para su propia consulta
interna.

### `unirse_a_hogar(codigo text) → uuid` (RPC)

Valida el código (case-insensitive, `upper(btrim(...))`), agrega a
`auth.uid()` como `member` del hogar correspondiente y devuelve su
`hogar_id`. Falla limpio en los dos casos pedidos:

- código inexistente → excepción con `errcode = 'P0002'` ("El código de
  invitación no es válido.").
- usuario ya miembro → excepción con `errcode = '23505'` ("Ya sos miembro de
  este hogar."), chequeada tanto por adelantado como con un
  `EXCEPTION WHEN unique_violation` alrededor del insert (backstop ante una
  carrera real: doble click, dos pestañas).

`SECURITY DEFINER`: es la única vía para que un usuario nuevo entre a
`hogar_miembros`, ya que esa tabla no tiene policy de INSERT directa.

### `regenerar_codigo_hogar(hogar_id uuid) → text` (RPC)

Genera un código nuevo (vía `generar_codigo_invitacion()`) y actualiza
`hogares.codigo_invitacion`. A propósito **no** es `SECURITY DEFINER`:
depende de la policy de UPDATE de `hogares` (`es_owner_de_hogar`) para
autorizar. Si el `UPDATE` afecta 0 filas —porque el hogar no existe o quien
llama no es `owner`— la función lanza una única excepción genérica
(`errcode = '42501'`) sin distinguir el motivo, para no filtrar si un
`hogar_id` existe.

### Ejemplo de uso desde `supabase-js`

```ts
const { data: hogarId, error } = await supabase.rpc("unirse_a_hogar", {
  p_codigo: codigoIngresado,
});

const { data: nuevoCodigo } = await supabase.rpc("regenerar_codigo_hogar", {
  p_hogar_id: hogarId,
});
```

## Profiles

Nombre/avatar por usuario, para que `/ajustes/hogar` (y cualquier otra
pantalla que liste miembros) pueda mostrar un nombre real en vez de
`Miembro {uuid corto}` — hoy esa pantalla lista explícitamente esa
limitación (`app/(dashboard)/ajustes/hogar/page.tsx`).

### `set_updated_at()` — trigger genérico

`BEFORE UPDATE`: pone `new.updated_at = now()`. Genérico a propósito (no
`profiles_set_updated_at`) para poder reusarlo en `on hogares` u otras
tablas si en el futuro necesitan la misma columna, sin duplicar la función.

### `crear_profile_para_usuario_nuevo()` — trigger en `auth.users`

`AFTER INSERT ON auth.users FOR EACH ROW`. Es el patrón "handle_new_user"
que documenta Supabase: crea la fila en `public.profiles` con
`nombre_completo = raw_user_meta_data->>'full_name'`, o
`raw_user_meta_data->>'name'` si no vino `full_name`, o `null` si no vino
ninguno de los dos (tal como pide el enunciado). `SECURITY DEFINER` porque
corre en el contexto de `auth.users`, fuera del alcance normal de las
policies de `public`. El `ON CONFLICT (id) DO NOTHING` es una red de
seguridad barata (no se espera que dispare en uso normal).

Importante: es un trigger sobre una tabla de `auth`, no de `public` — se
crea igual que cualquier otro trigger (`CREATE TRIGGER ... ON auth.users`),
pero solo dispara para **altas nuevas**; los usuarios que ya existían antes
de esta migración se cubren con el backfill (migración 14).

### `comparte_hogar_con(p_user_id uuid) → boolean`

`SECURITY DEFINER stable`, mismo motivo que `es_miembro_de_hogar`/
`es_owner_de_hogar`: hace un self-join sobre `hogar_miembros` (¿hay algún
`hogar_id` donde estén tanto `auth.uid()` como `p_user_id`?) y necesita
bypassear RLS en esa consulta interna para no disparar la policy de
`hogar_miembros` recursivamente. Es el único uso de esta función: la policy
de `SELECT` de `profiles`.

## Funciones y vistas

### `calcular_precio_unitario(precio numeric, tamano numeric) → numeric`

Función SQL pura (`immutable`) que calcula `precio / tamaño`, redondeado a 4
decimales, devolviendo `null` si `tamaño` es `null` o `0` (evita división por
cero). Es el bloque de cálculo que reutiliza `vista_precio_unitario`.

### `vista_precio_unitario` — requisito 3

Una fila por compra visible para el usuario (todo su hogar, por RLS de
`compras`) con producto, presentación y tienda ya resueltos, más
`precio_pagado` (`precio_oferta` si existe, si no `precio_normal`) y
`precio_por_unidad` (`precio_pagado / tamaño`). Expone `hogar_id` y
`created_by` (antes exponía `user_id`; se renombró junto con la columna de
`compras` — ver migración 10 — verificando primero que ningún código de
`app/` leyera ese campo). Permite comparar el mismo producto entre tiendas,
por ejemplo:

```sql
select tienda_nombre, precio_por_unidad
from vista_precio_unitario
where producto_id = '...'
order by precio_por_unidad asc;
```

### `vista_stock_actual` — requisito 4

Agrega, por **hogar** (antes por usuario individual — cambiado en la
migración 12, ya que el stock que importa mostrar es el de la casa, no el de
cada persona por separado; no la consumía ningún código de `app/` así que el
cambio de grano no rompió nada) y por producto/presentación, las compras con
`consumido = false` (`cantidad_total_pendiente`, `compras_pendientes`,
`proxima_fecha_vencimiento`). "Resta" las consumidas excluyéndolas del
`where`, en vez de hacer una resta aritmética — así cada compra individual
sigue siendo un registro histórico íntegro y auditable.

### `vista_alertas_vencimiento` (extra)

No pedida explícitamente por el enunciado, pero se desprende del requisito 5
("índices ... para queries de alertas"): cruza `compras` no consumidas con
`alertas_config` y devuelve las que ya entraron en la ventana de aviso
(`fecha_vencimiento <= current_date + dias_antes`). La consume
`app/api/cron/vencimientos/route.ts` (un push por comprador) y el banner
in-app.

**Deliberadamente no sigue la semántica "todo el hogar" de compras/
alertas_config**: sigue cruzando cada compra únicamente con la
`alertas_config` de quien la registró (`ac.user_id = c.created_by`), no con
la de cada integrante del hogar. Ver "Decisiones a revisar" — notificar a
todo el hogar sobre una compra ajena es un cambio de producto real, no solo
de RLS, y requeriría además rediseñar `alerta_enviada_at` (hoy es 1 columna
por compra; con múltiples destinatarios por compra haría falta 1 fila por
`(compra, usuario)`).

Las tres vistas se crean con `security_invoker = true`: sin esa opción, una
vista podría evaluar RLS con los privilegios del dueño de la vista en vez de
los del usuario que consulta. Con `security_invoker`, quedan tan protegidas
como las tablas que consultan (verificado localmente con 3 usuarios en 2
hogares distintos: el usuario del segundo hogar obtiene 0 filas en
`vista_precio_unitario` aunque el primer hogar tenga compras cargadas).

Las tres se recrean con `DROP VIEW` + `CREATE VIEW` en la migración 12 (no
`CREATE OR REPLACE VIEW`): agregan/renombran columnas antes de la última
posición, y Postgres solo permite que `CREATE OR REPLACE VIEW` *agregue*
columnas al final, no reordene ni renombre las existentes.

## Índices (requisito 5)

- `compras_fecha_vencimiento_idx` — parcial, `where fecha_vencimiento is not
  null and consumido = false` (la única franja que consultan las alertas).
- `presentaciones_producto_id_idx`, `compras_producto_via_presentacion_idx`
  (`presentacion_id`), `compras_tienda_id_idx` — joins de comparación de
  precios.
- `compras_user_id_idx` (nombre heredado; indexa `created_by` desde la
  migración 10 — Postgres no renombra el índice al renombrar la columna) y
  `compras_hogar_id_idx` / `alertas_config_hogar_id_idx` — toda policy nueva
  de RLS filtra por `hogar_id` vía `es_miembro_de_hogar`; sin estos índices
  cada query autenticada degrada a seq scan a medida que crecen las tablas.
- Únicos: `tiendas_nombre_unique_idx`, `productos_nombre_marca_unique_idx`,
  `presentaciones_producto_tamano_unidad_unique_idx` — evitan duplicados
  triviales en el catálogo compartido. `hogares_codigo_invitacion` (unique
  por definición de columna) y `hogar_miembros_user_hogar_unique` (compuesto
  `(user_id, hogar_id)`, en ese orden para servir también las queries "¿de
  qué hogares soy miembro?" con `user_id` como columna líder) — evitan
  códigos duplicados y membresías duplicadas.
- `profiles` no suma índices nuevos: su único acceso es por `id`, que ya es
  PK (indexado); `comparte_hogar_con` resuelve su self-join sobre
  `hogar_miembros` con el índice `hogar_miembros_user_hogar_unique` de
  arriba (columna líder `user_id`, sirve ambos lados del join).

## Constraints de integridad

- `presentaciones.tamaño > 0` (evita división por cero en precio/unidad).
- `compras.precio_normal >= 0`, `precio_oferta >= 0`, `precio_oferta <=
  precio_normal`, `cantidad > 0`.
- `compras.fecha_consumo` solo puede tener valor si `consumido = true`.
- `alertas_config.dias_antes >= 0`, y `unique(user_id)` — una configuración
  por usuario (ver más abajo).
- `compras.hogar_id` y `alertas_config.hogar_id` son `NOT NULL` desde la
  migración 12 (nullable solo durante la ventana de migración 10→11→12).
- `hogares.codigo_invitacion ~ '^[A-Za-z0-9]{6}$'` y `unique`.
- `hogar_miembros.rol in ('owner', 'member')` y `unique(user_id, hogar_id)`
  (no se puede duplicar membresía).
- `profiles.id` es PK y FK a `auth.users(id)` a la vez (`on delete cascade`):
  no puede existir un profile sin su usuario. `nombre_completo`/`avatar_url`
  son ambos nullable, sin más constraints — no hay forma de "corromper"
  estos dos campos de texto libre.

## Tipos TypeScript

Generados con la CLI de Supabase contra la base local (mismo schema que las
migraciones) y verificados con `tsc --noEmit`:

```bash
supabase gen types typescript --local > types/database.types.ts
# o, contra el proyecto remoto ya enlazado:
supabase gen types typescript --linked > types/database.types.ts
```

Archivo generado: `types/database.types.ts`.

## Cambios en `app/` requeridos por esta migración (hecho)

El soporte de hogares cambia dos contratos que el frontend ya usaba en
producción: `compras` pasó a requerir `hogar_id` (antes no existía) y
`compras.user_id` dejó de existir (ahora `created_by`). Sin tocar el
frontend, `crearCompra` y `guardarAlertasConfig` habrían empezado a fallar
con "column user_id does not exist" / violación de `NOT NULL` en el próximo
insert. Se hicieron 3 cambios mínimos para sostener el contrato:

- `lib/supabase/hogar.ts` (nuevo) — `getHogarIdActual(supabase, userId)`:
  resuelve el hogar más antiguo del que el usuario es miembro.
- `app/(dashboard)/compras/actions.ts` — resuelve `hogar_id` antes de
  insertar y lo manda junto con `created_by` (antes `user_id`).
- `app/(dashboard)/ajustes/actions.ts` — mismo resuelve-y-manda para el
  upsert de `alertas_config`.
- `app/(dashboard)/inventario/page.tsx` — agrega `.eq("user_id", user.id)`
  a la lectura de `alertas_config`: sin el filtro, un hogar con 2+
  integrantes con alertas configuradas hace que `.maybeSingle()` reciba más
  de una fila y lance error (RLS ahora deja ver las de todo el hogar).

Verificado con `tsc --noEmit -p tsconfig.json` (proyecto completo, 0
errores) y `eslint` sobre los 4 archivos tocados. No se construyó UI nueva
(pantalla de "crear/unirse a hogar", listado de miembros, etc.) — eso queda
fuera del alcance de esta migración de base de datos.

`profiles` (migraciones 13-14, sección siguiente) **no necesitó ningún
cambio en `app/`**: es puramente aditiva (tabla nueva, sin tocar columnas ni
policies de tablas existentes), verificado igual con `tsc --noEmit` sobre
todo el proyecto (0 errores). Mostrar esos nombres en
`/ajustes/hogar` en vez de `Miembro {uuid corto}` sigue siendo trabajo de
frontend pendiente (reemplazar ese `select(... user_id ...)` por un join o
una segunda query a `profiles`), fuera del alcance de esta migración.

## Pruebas realizadas (3 usuarios, 2 hogares)

Corridas a mano contra la base local (`supabase start` + `psql`,
simulando sesiones con `set role authenticated` + `set request.jwt.claims`):

1. Usuario 1 crea un hogar (`insert into hogares ... returning *` —
   confirma el fix de la nota¹ de más arriba) y una compra en él.
2. Usuario 2 se une con el código del hogar (`unirse_a_hogar`, probado en
   minúsculas para confirmar que es case-insensitive) → **ve y puede
   editar** (`UPDATE ... consumido = true`) la compra de usuario 1, sin
   haberla creado. `created_by` de la fila sigue apuntando a usuario 1
   después del update (auditoría intacta).
3. Usuario 3 crea su propio hogar, separado. **No ve** la compra (`count = 0`),
   un `UPDATE` directo contra su id afecta 0 filas, no ve el hogar/miembros
   del otro hogar (`count = 1`, el propio) y `vista_precio_unitario` le
   devuelve 0 filas.
4. `alertas_config`: usuario 1 crea la suya, usuario 2 (mismo hogar) la ve y
   la edita (`dias_antes` cambia de 5 a 7); usuario 3 (otro hogar) ve 0
   filas.
5. `unirse_a_hogar`: código inexistente → error limpio; usuario ya miembro →
   error limpio (probado también el backstop de concurrencia).
6. `regenerar_codigo_hogar`: usuario 2 (`member`) → error limpio; usuario 1
   (`owner`) → código regenerado.
7. Constraints: `rol` inválido, `codigo_invitacion` con forma inválida,
   `hogar_id null` en `compras`/`alertas_config` (tanto vía RLS como, por
   separado con rol `postgres`, vía el `NOT NULL` constraint puro) — los
   cuatro rechazados.
8. `anon` sin ningún grant sobre `hogares`/`hogar_miembros` (igual que el
   resto de las tablas).

### Profiles (3 usuarios, 2 hogares, mismo setup)

1. Se registran 3 usuarios con metadata distinta: uno con
   `raw_user_meta_data->>'full_name'`, uno sin metadata, uno con `'name'` en
   vez de `'full_name'` → el trigger crea los 3 profiles automáticamente,
   con `nombre_completo` resuelto correctamente en cada caso (incluido
   `null` para el que no tenía nada).
2. Usuario 1 crea un hogar; usuario 2 se une con el código; usuario 3 crea
   el suyo aparte (mismo split que el escenario de arriba).
3. Usuario 2 edita su propio `nombre_completo`. Usuario 1 (mismo hogar) lo
   **lee correctamente** vía `comparte_hogar_con`; también lee el propio.
4. Usuario 3 (otro hogar) intenta leer el profile de usuario 2 por `id`
   directo → **0 filas**. `select count(*) from profiles` sin filtro (todo
   lo que ese rol puede ver) también da 1 — el propio, nadie más.
5. Usuario 1 intenta `UPDATE` sobre el profile de usuario 2 (mismo hogar,
   pero no es "propio") → afecta 0 filas, el valor no cambia.
6. `INSERT`/`DELETE` directos contra `profiles` → `permission denied` (sin
   `GRANT`, ninguna policy los habilita).
7. `updated_at` se actualiza solo al hacer `UPDATE` (probado con
   `pg_sleep` de por medio para que el timestamp cambie visiblemente).
8. Se borra el `auth.users` de usuario 3 (como `postgres`) → su `profile`
   desaparece (`on delete cascade`), confirmando que no queda huérfano.
9. `anon` sin ningún grant sobre `profiles`.

## Decisiones a revisar más adelante (no bloqueantes)

- **Un usuario puede terminar en más de un hogar** (el propio, auto-creado
  por el backfill o al firmar, + cualquiera al que se una por código) y hoy
  no hay concepto de "hogar activo": `getHogarIdActual` devuelve
  determinísticamente el más antiguo, y una compra nueva siempre cae ahí.
  Si el producto necesita que alguien participe activamente de 2+ hogares,
  hace falta UI para elegir en qué hogar se está cargando cada compra.
- **`vista_alertas_vencimiento` no notifica a todo el hogar**, solo a quien
  registró la compra (ver la sección de la vista más arriba) — a propósito,
  para no tocar `app/api/cron/vencimientos/route.ts` en esta migración.
  Extenderlo requiere además una tabla de dedup por `(compra_id, user_id)`
  en vez de la columna única `compras.alerta_enviada_at`.
- Nuevos usuarios que se registran **después** de esta migración y todavía
  no crearon/se unieron a un hogar no pueden cargar compras (`hogar_id`
  `NOT NULL`); `crearCompra`/`guardarAlertasConfig` devuelven un error
  explícito en ese caso. *(Actualización: `app/onboarding/` ya cubre esto —
  el middleware fuerza pasar por ahí antes de llegar al resto de la app —
  así que en la práctica este error ya no debería verse en uso normal.)*
- No hay policy de `DELETE` sobre `hogares` (borrar un hogar arrastra, vía
  `ON DELETE CASCADE`/`RESTRICT`, a `hogar_miembros` y potencialmente
  bloquea por `compras`/`alertas_config` en `RESTRICT`); se dejó sin resolver
  a propósito hasta que haya un flujo de producto claro (¿qué pasa con las
  compras de un hogar que se borra?).
- `hogar_miembros` no tiene policy de `UPDATE`: no se puede promover a un
  `member` a `owner` todavía (ni transferir ownership). Agregar esa policy
  cuando el producto lo necesite.
- `alertas_config` tiene `unique(user_id)`: una sola configuración por
  usuario. Si en el futuro se necesitan varios umbrales de alerta por
  usuario, basta con quitar ese constraint.
- `compras.precio_oferta <= precio_normal` es un constraint de negocio
  razonable pero no universal; si aparece un caso real donde no se cumple,
  se puede relajar en una migración nueva.
- El catálogo compartido no tiene moderación (cualquier `authenticated` puede
  insertar). Para una app multi-tenant real convendría revisar si esto sigue
  siendo aceptable o si hace falta un flujo de aprobación.
- **`profiles.avatar_url` es solo texto** — esta migración no crea ningún
  bucket de Supabase Storage ni sus policies. Si se implementa upload de
  avatar, hace falta eso aparte (bucket + policies de storage), y
  `avatar_url` seguiría siendo simplemente la URL pública resultante.
- `profiles` no tiene UI todavía: `/ajustes/hogar` sigue mostrando
  `Miembro {uuid corto}` en vez de `nombre_completo` (ver "Cambios en app/"
  más arriba) — es la pieza de frontend que falta para que esta migración
  se note en pantalla.
- `comparte_hogar_con` recorre TODOS los hogares en común entre dos
  usuarios (no distingue "hogar activo"); si más adelante existe ese
  concepto (ver el primer punto de esta lista), probablemente convenga que
  la visibilidad de `profiles` siga el mismo criterio en vez de "cualquier
  hogar en común, sea cual sea".
