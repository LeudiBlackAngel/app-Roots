-- ============================================================================
-- FitApp · Fase 4 · Escáner de factura → Sugerencias de platos
-- ----------------------------------------------------------------------------
-- Pega TODO este archivo en:  Supabase Dashboard -> SQL Editor -> New query
-- y pulsa "Run". Es idempotente (if not exists / on conflict do nothing).
-- Requiere Fase 0 (auth + RLS), Fase 1 (user_metrics) y Fase 3 (alimentos).
-- ============================================================================


-- ############################################################################
-- BLOQUE 1 — Facturas (tabla + Storage privado)
-- ############################################################################

create table if not exists public.facturas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  imagen_path     text,
  items_extraidos jsonb,
  estado          text not null default 'pendiente'
                    check (estado in ('pendiente', 'procesada', 'error')),
  created_at      timestamptz not null default now()
);

create index if not exists facturas_user_idx
  on public.facturas (user_id, created_at desc);

alter table public.facturas enable row level security;

drop policy if exists "facturas_all_own" on public.facturas;
create policy "facturas_all_own"
  on public.facturas for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- --- Storage: bucket privado `facturas` -------------------------------------
insert into storage.buckets (id, name, public)
values ('facturas', 'facturas', false)
on conflict (id) do nothing;

-- Cada usuario solo opera dentro de su carpeta {user_id}/...
drop policy if exists "facturas_select_own" on storage.objects;
drop policy if exists "facturas_insert_own" on storage.objects;
drop policy if exists "facturas_update_own" on storage.objects;
drop policy if exists "facturas_delete_own" on storage.objects;

create policy "facturas_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'facturas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "facturas_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'facturas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "facturas_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'facturas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "facturas_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'facturas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ############################################################################
-- BLOQUE 2 — Límite de uso del escáner (contador propio, control de costo)
-- ############################################################################

create table if not exists public.escaner_uso_diario (
  user_id uuid not null references auth.users (id) on delete cascade,
  fecha   date not null default current_date,
  usos    int  not null default 0,
  primary key (user_id, fecha)
);

alter table public.escaner_uso_diario enable row level security;

drop policy if exists "escaner_uso_select_own" on public.escaner_uso_diario;
-- Solo lectura para el dueño (la UI muestra cuántos escaneos quedan).
-- La escritura la hace SOLO la función SECURITY DEFINER de abajo.
create policy "escaner_uso_select_own"
  on public.escaner_uso_diario for select to authenticated
  using ( auth.uid() = user_id );

-- Consume 1 crédito de escáner de forma atómica. Devuelve true si quedaba cupo.
-- Contador SEPARADO del de rutinas/dietas (consumir_credito_ia).
create or replace function public.consumir_credito_escaner(p_max int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usos int;
begin
  insert into public.escaner_uso_diario (user_id, fecha, usos)
  values (auth.uid(), current_date, 0)
  on conflict (user_id, fecha) do nothing;

  select usos into v_usos
  from public.escaner_uso_diario
  where user_id = auth.uid() and fecha = current_date
  for update;

  if v_usos >= p_max then
    return false;
  end if;

  update public.escaner_uso_diario
  set usos = usos + 1
  where user_id = auth.uid() and fecha = current_date;

  return true;
end;
$$;


-- ############################################################################
-- BLOQUE 3 — Sugerencias de platos
-- ############################################################################

create table if not exists public.sugerencias_platos (
  id                  uuid primary key default gen_random_uuid(),
  factura_id          uuid not null references public.facturas (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  nombre_plato        text not null,
  descripcion         text,
  calorias_estimadas  numeric,
  ingredientes_usados jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists sugerencias_factura_idx
  on public.sugerencias_platos (factura_id);
create index if not exists sugerencias_user_idx
  on public.sugerencias_platos (user_id, created_at desc);

alter table public.sugerencias_platos enable row level security;

drop policy if exists "sugerencias_all_own" on public.sugerencias_platos;
create policy "sugerencias_all_own"
  on public.sugerencias_platos for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- ============================================================================
-- FIN Fase 4
-- ============================================================================
