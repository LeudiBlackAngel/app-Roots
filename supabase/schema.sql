-- ============================================================================
-- FitApp · Fase 0 · Esquema de base de datos
-- ----------------------------------------------------------------------------
-- Pega TODO este archivo en:  Supabase Dashboard -> SQL Editor -> New query
-- y pulsa "Run". Es idempotente (se puede correr varias veces sin romper nada).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Tabla `profiles`
-- ----------------------------------------------------------------------------
-- Una fila por usuario de auth.users. Guarda el rol y el nombre.
-- El `id` es a la vez PK y FK a auth.users (se borra en cascada con el usuario).
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'cliente'
             check (role in ('cliente', 'admin')),
  nombre     text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada usuario (rol + nombre). 1:1 con auth.users.';


-- ----------------------------------------------------------------------------
-- 2) Helper: ¿el usuario actual es admin?
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER => corre con los permisos del dueño de la función y por
-- tanto IGNORA la RLS de `profiles`. Esto evita la recursión infinita que
-- ocurriría si una política de `profiles` consultara `profiles` directamente.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;


-- ----------------------------------------------------------------------------
-- 3) Trigger: crear el perfil automáticamente al registrarse un usuario
-- ----------------------------------------------------------------------------
-- Cuando alguien se registra (INSERT en auth.users), creamos su fila en
-- profiles. El `nombre` viene del metadata que mandamos en signUp().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 4) Trigger: impedir que un usuario normal cambie su propio `role`
-- ----------------------------------------------------------------------------
-- La RLS por sí sola permitiría a un usuario hacer UPDATE de su fila... incluido
-- el campo `role` (auto-ascenderse a admin). Este trigger BEFORE UPDATE revierte
-- cualquier cambio de `role` salvo que quien ejecuta sea admin.
create or replace function public.enforce_role_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    -- Ignora silenciosamente el intento de cambiar el rol.
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_role_immutable on public.profiles;
create trigger enforce_role_immutable
  before update on public.profiles
  for each row
  execute function public.enforce_role_immutable();


-- ----------------------------------------------------------------------------
-- 5) RLS (Row Level Security) — activado desde el día 1
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Limpia políticas previas para poder re-ejecutar este script sin errores.
drop policy if exists "profiles_select_own"   on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;

-- (A) LECTURA: cada usuario puede leer SU propia fila.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ( auth.uid() = id );

-- (B) LECTURA admin: un admin puede leer TODAS las filas.
--     Usa is_admin() (SECURITY DEFINER) para no recursionar sobre profiles.
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using ( public.is_admin() );

-- (C) ACTUALIZACIÓN: cada usuario puede actualizar SU propia fila.
--     El cambio de `role` queda bloqueado por el trigger enforce_role_immutable
--     (ver punto 4), así que aunque la política permita el UPDATE, el rol no
--     se puede modificar a menos que seas admin.
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- NOTA: no creamos política de INSERT para usuarios. Las filas de `profiles`
-- las crea el trigger handle_new_user() (SECURITY DEFINER), no el cliente.
-- Tampoco creamos política de DELETE: el perfil se borra en cascada cuando se
-- elimina el usuario en auth.users.


-- ----------------------------------------------------------------------------
-- 6) (Opcional) Cómo convertir a alguien en admin
-- ----------------------------------------------------------------------------
-- Desde el SQL Editor (que corre como rol privilegiado y salta la RLS / el
-- trigger no aplica porque is_admin lo permite vía service role):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'tucorreo@ejemplo.com');
--
-- ============================================================================
