-- ============================================================================
-- FitApp · Fase 1 · Perfil físico + métricas
-- ----------------------------------------------------------------------------
-- Pega TODO este archivo en:  Supabase Dashboard -> SQL Editor -> New query
-- y pulsa "Run". Es idempotente. Requiere haber corrido antes schema.sql
-- (Fase 0), porque reutiliza la función public.is_admin().
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Tabla `user_metrics` (1 fila por usuario, patrón upsert)
-- ----------------------------------------------------------------------------
create table if not exists public.user_metrics (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  peso               numeric,                 -- kg
  altura             numeric,                 -- cm
  edad               int,
  sexo               text check (sexo in ('masculino', 'femenino')),
  objetivo           text check (objetivo in ('bajar_grasa', 'ganar_musculo', 'mantener')),
  nivel_actividad    text check (nivel_actividad in
                       ('sedentario', 'ligero', 'moderado', 'activo', 'muy_activo')),
  restricciones      text[] not null default '{}',
  calorias_objetivo  numeric,                 -- calculado y guardado
  macros             jsonb,                   -- { proteina_g, carbos_g, grasa_g }
  imc                numeric,                 -- calculado y guardado
  unidad_peso        text default 'kg'        -- preferencia de visualización
                       check (unidad_peso in ('kg', 'lb')),
  unidad_altura      text default 'cm'        -- preferencia de visualización
                       check (unidad_altura in ('cm', 'ft_in')),
  updated_at         timestamptz not null default now()
);

comment on table public.user_metrics is
  'Datos físicos y métricas calculadas por usuario (1:1 con auth.users).';

-- Si la tabla ya existía sin estas columnas (instalación previa), las añade.
alter table public.user_metrics
  add column if not exists unidad_peso text default 'kg'
    check (unidad_peso in ('kg', 'lb'));
alter table public.user_metrics
  add column if not exists unidad_altura text default 'cm'
    check (unidad_altura in ('cm', 'ft_in'));


-- ----------------------------------------------------------------------------
-- 2) RLS — activado desde el día 1
-- ----------------------------------------------------------------------------
alter table public.user_metrics enable row level security;

-- Limpia políticas previas para poder re-ejecutar este script sin errores.
drop policy if exists "user_metrics_select_own"   on public.user_metrics;
drop policy if exists "user_metrics_select_admin" on public.user_metrics;
drop policy if exists "user_metrics_insert_own"   on public.user_metrics;
drop policy if exists "user_metrics_update_own"   on public.user_metrics;

-- (A) LECTURA: cada usuario lee SOLO su fila.
create policy "user_metrics_select_own"
  on public.user_metrics
  for select
  to authenticated
  using ( auth.uid() = user_id );

-- (B) LECTURA admin: un admin puede leer TODAS las filas.
--     Reutiliza public.is_admin() (SECURITY DEFINER) de la Fase 0.
create policy "user_metrics_select_admin"
  on public.user_metrics
  for select
  to authenticated
  using ( public.is_admin() );

-- (C) INSERT: cada usuario solo puede insertar SU propia fila.
create policy "user_metrics_insert_own"
  on public.user_metrics
  for insert
  to authenticated
  with check ( auth.uid() = user_id );

-- (D) UPDATE: cada usuario solo puede actualizar SU propia fila.
create policy "user_metrics_update_own"
  on public.user_metrics
  for update
  to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- NOTA: el upsert del cliente (INSERT ... ON CONFLICT) usa las políticas
-- INSERT y UPDATE de arriba. No hay política de DELETE: la fila se borra en
-- cascada al eliminar el usuario en auth.users.

-- ============================================================================
