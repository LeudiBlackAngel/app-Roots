-- ============================================================================
-- FitApp · Fase 3 · Dietas + Registro de comidas + Gamificación
-- ----------------------------------------------------------------------------
-- Pega TODO este archivo en:  Supabase Dashboard -> SQL Editor -> New query
-- y pulsa "Run". Es idempotente (if not exists / on conflict do nothing).
-- Requiere Fase 0 (public.is_admin), Fase 1 (user_metrics) y Fase 2
-- (ia_uso_diario + public.consumir_credito_ia, que se reutilizan tal cual).
-- ============================================================================


-- ############################################################################
-- BLOQUE 1 — Alimentos (biblioteca nutricional)
-- ############################################################################

create table if not exists public.alimentos (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  categoria      text,
  calorias_100g  numeric not null,
  proteina_100g  numeric,
  carbos_100g    numeric,
  grasa_100g     numeric,
  created_at     timestamptz not null default now()
);

-- Evita duplicados por nombre sin distinguir mayúsculas.
create unique index if not exists alimentos_nombre_lower_uniq
  on public.alimentos (lower(nombre));

alter table public.alimentos enable row level security;

drop policy if exists "alimentos_select_auth" on public.alimentos;
drop policy if exists "alimentos_write_admin" on public.alimentos;

create policy "alimentos_select_auth"
  on public.alimentos for select to authenticated using ( true );

create policy "alimentos_write_admin"
  on public.alimentos for all to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );


-- --- Semilla de alimentos (valores por 100 g) -------------------------------
insert into public.alimentos
  (nombre, categoria, calorias_100g, proteina_100g, carbos_100g, grasa_100g)
values
  ('Arroz blanco cocido',     'carbohidrato', 130, 2.7, 28,   0.3),
  ('Arroz integral cocido',   'carbohidrato', 123, 2.7, 26,   1.0),
  ('Habichuelas rojas',       'proteina',     127, 8.7, 22.8, 0.5),
  ('Lentejas cocidas',        'proteina',     116, 9.0, 20,   0.4),
  ('Pollo (pechuga)',         'proteina',     165, 31,  0,    3.6),
  ('Huevo',                   'proteina',     155, 13,  1.1,  11),
  ('Atun en agua',            'proteina',     116, 26,  0,    1.0),
  ('Carne de res molida',     'proteina',     250, 26,  0,    15),
  ('Cerdo (chuleta)',         'proteina',     242, 27,  0,    14),
  ('Salmon',                  'proteina',     208, 20,  0,    13),
  ('Platano verde',           'carbohidrato', 122, 1.3, 32,   0.4),
  ('Yuca',                    'carbohidrato', 160, 1.4, 38,   0.3),
  ('Batata',                  'carbohidrato', 86,  1.6, 20,   0.1),
  ('Papa',                    'carbohidrato', 77,  2.0, 17,   0.1),
  ('Avena',                   'carbohidrato', 389, 16.9,66,   6.9),
  ('Pan de trigo',            'carbohidrato', 265, 9.0, 49,   3.2),
  ('Maiz',                    'carbohidrato', 86,  3.2, 19,   1.2),
  ('Aguacate',                'grasa',        160, 2.0, 9,    15),
  ('Mantequilla de mani',     'grasa',        588, 25,  20,   50),
  ('Almendras',               'grasa',        579, 21,  22,   49),
  ('Leche entera',            'lacteo',       61,  3.2, 4.8,  3.3),
  ('Queso fresco',            'lacteo',       264, 18,  4,    21),
  ('Yogur griego',            'lacteo',       59,  10,  3.6,  0.4),
  ('Brocoli',                 'vegetal',      34,  2.8, 7,    0.4),
  ('Espinaca',                'vegetal',      23,  2.9, 3.6,  0.4),
  ('Tomate',                  'vegetal',      18,  0.9, 3.9,  0.2),
  ('Zanahoria',               'vegetal',      41,  0.9, 10,   0.2),
  ('Auyama',                  'vegetal',      26,  1.0, 7,    0.1),
  ('Banana (guineo)',         'fruta',        89,  1.1, 23,   0.3),
  ('Manzana',                 'fruta',        52,  0.3, 14,   0.2),
  ('Naranja',                 'fruta',        47,  0.9, 12,   0.1),
  ('Jugo de naranja',         'bebida',       45,  0.7, 10,   0.2)
on conflict (lower(nombre)) do nothing;


-- ############################################################################
-- BLOQUE 2 — Dietas (plantillas + dietas de usuario)
-- ############################################################################

-- --- Plantillas (admin) -----------------------------------------------------
create table if not exists public.dietas_plantilla (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null unique,
  objetivo       text not null check (objetivo in ('bajar_grasa', 'ganar_musculo', 'mantener')),
  calorias_aprox numeric,
  descripcion    text,
  created_at     timestamptz not null default now()
);

create table if not exists public.dieta_plantilla_comidas (
  id                  uuid primary key default gen_random_uuid(),
  dieta_plantilla_id  uuid not null references public.dietas_plantilla (id) on delete cascade,
  momento             text not null check (momento in ('desayuno', 'almuerzo', 'cena', 'snack')),
  alimento_id         uuid not null references public.alimentos (id) on delete cascade,
  cantidad_g          numeric not null,
  orden               int not null default 1,
  unique (dieta_plantilla_id, momento, alimento_id)
);

alter table public.dietas_plantilla enable row level security;
alter table public.dieta_plantilla_comidas enable row level security;

drop policy if exists "dieta_plantilla_select_auth"    on public.dietas_plantilla;
drop policy if exists "dieta_plantilla_write_admin"    on public.dietas_plantilla;
drop policy if exists "dieta_plant_comidas_select_auth" on public.dieta_plantilla_comidas;
drop policy if exists "dieta_plant_comidas_write_admin" on public.dieta_plantilla_comidas;

create policy "dieta_plantilla_select_auth"
  on public.dietas_plantilla for select to authenticated using ( true );
create policy "dieta_plantilla_write_admin"
  on public.dietas_plantilla for all to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );

create policy "dieta_plant_comidas_select_auth"
  on public.dieta_plantilla_comidas for select to authenticated using ( true );
create policy "dieta_plant_comidas_write_admin"
  on public.dieta_plantilla_comidas for all to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );


-- --- Dietas del usuario -----------------------------------------------------
create table if not exists public.dietas_usuario (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nombre     text not null,
  objetivo   text not null check (objetivo in ('bajar_grasa', 'ganar_musculo', 'mantener')),
  origen     text not null default 'plantilla' check (origen in ('plantilla', 'ia')),
  created_at timestamptz not null default now()
);

create index if not exists dietas_usuario_user_idx
  on public.dietas_usuario (user_id, created_at desc);

create table if not exists public.dieta_usuario_comidas (
  id                uuid primary key default gen_random_uuid(),
  dieta_usuario_id  uuid not null references public.dietas_usuario (id) on delete cascade,
  momento           text not null check (momento in ('desayuno', 'almuerzo', 'cena', 'snack')),
  alimento_id       uuid not null references public.alimentos (id) on delete cascade,
  cantidad_g        numeric not null,
  orden             int not null default 1
);

create index if not exists dieta_usuario_comidas_idx
  on public.dieta_usuario_comidas (dieta_usuario_id, momento, orden);

alter table public.dietas_usuario enable row level security;
alter table public.dieta_usuario_comidas enable row level security;

drop policy if exists "dieta_usuario_all_own"      on public.dietas_usuario;
drop policy if exists "dieta_usuario_comidas_own"  on public.dieta_usuario_comidas;

create policy "dieta_usuario_all_own"
  on public.dietas_usuario for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "dieta_usuario_comidas_own"
  on public.dieta_usuario_comidas for all to authenticated
  using (
    exists (
      select 1 from public.dietas_usuario d
      where d.id = dieta_usuario_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.dietas_usuario d
      where d.id = dieta_usuario_id and d.user_id = auth.uid()
    )
  );


-- --- Semilla de plantillas de dieta -----------------------------------------
insert into public.dietas_plantilla (nombre, objetivo, calorias_aprox, descripcion) values
  ('Plan Bajar Grasa ~1800 kcal', 'bajar_grasa', 1800,
   'Plan hipocalórico balanceado, alto en proteína para preservar masa muscular.'),
  ('Plan Ganar Musculo ~2800 kcal', 'ganar_musculo', 2800,
   'Plan hipercalórico con énfasis en proteína y carbohidratos para volumen.'),
  ('Plan Mantenimiento ~2200 kcal', 'mantener', 2200,
   'Plan equilibrado para mantener peso y composición corporal.')
on conflict (nombre) do nothing;

-- Comidas de "Plan Bajar Grasa ~1800 kcal"
insert into public.dieta_plantilla_comidas (dieta_plantilla_id, momento, alimento_id, cantidad_g, orden)
select d.id, v.momento, a.id, v.cantidad_g, v.orden
from (values
  ('desayuno', 'avena',                60,  1),
  ('desayuno', 'huevo',                100, 2),
  ('desayuno', 'banana (guineo)',      100, 3),
  ('almuerzo', 'pollo (pechuga)',      150, 1),
  ('almuerzo', 'arroz integral cocido',150, 2),
  ('almuerzo', 'brocoli',              100, 3),
  ('cena',     'atun en agua',         120, 1),
  ('cena',     'espinaca',             100, 2),
  ('cena',     'aguacate',             50,  3),
  ('snack',    'yogur griego',         150, 1),
  ('snack',    'manzana',              150, 2)
) as v(momento, alimento, cantidad_g, orden)
join public.alimentos a on lower(a.nombre) = v.alimento
cross join public.dietas_plantilla d
where d.nombre = 'Plan Bajar Grasa ~1800 kcal'
on conflict (dieta_plantilla_id, momento, alimento_id) do nothing;

-- Comidas de "Plan Ganar Musculo ~2800 kcal"
insert into public.dieta_plantilla_comidas (dieta_plantilla_id, momento, alimento_id, cantidad_g, orden)
select d.id, v.momento, a.id, v.cantidad_g, v.orden
from (values
  ('desayuno', 'avena',                80,  1),
  ('desayuno', 'huevo',                150, 2),
  ('desayuno', 'mantequilla de mani',  30,  3),
  ('desayuno', 'banana (guineo)',      120, 4),
  ('almuerzo', 'pollo (pechuga)',      200, 1),
  ('almuerzo', 'arroz blanco cocido',  250, 2),
  ('almuerzo', 'habichuelas rojas',    150, 3),
  ('cena',     'carne de res molida',  180, 1),
  ('cena',     'batata',               200, 2),
  ('cena',     'brocoli',              100, 3),
  ('snack',    'leche entera',         250, 1),
  ('snack',    'almendras',            40,  2)
) as v(momento, alimento, cantidad_g, orden)
join public.alimentos a on lower(a.nombre) = v.alimento
cross join public.dietas_plantilla d
where d.nombre = 'Plan Ganar Musculo ~2800 kcal'
on conflict (dieta_plantilla_id, momento, alimento_id) do nothing;

-- Comidas de "Plan Mantenimiento ~2200 kcal"
insert into public.dieta_plantilla_comidas (dieta_plantilla_id, momento, alimento_id, cantidad_g, orden)
select d.id, v.momento, a.id, v.cantidad_g, v.orden
from (values
  ('desayuno', 'pan de trigo',         80,  1),
  ('desayuno', 'huevo',                100, 2),
  ('desayuno', 'aguacate',             50,  3),
  ('almuerzo', 'pollo (pechuga)',      150, 1),
  ('almuerzo', 'arroz blanco cocido',  200, 2),
  ('almuerzo', 'habichuelas rojas',    120, 3),
  ('cena',     'salmon',               150, 1),
  ('cena',     'papa',                 200, 2),
  ('cena',     'espinaca',             100, 3),
  ('snack',    'yogur griego',         150, 1),
  ('snack',    'manzana',              150, 2)
) as v(momento, alimento, cantidad_g, orden)
join public.alimentos a on lower(a.nombre) = v.alimento
cross join public.dietas_plantilla d
where d.nombre = 'Plan Mantenimiento ~2200 kcal'
on conflict (dieta_plantilla_id, momento, alimento_id) do nothing;


-- ############################################################################
-- BLOQUE 3 — Registro diario de comidas
-- ############################################################################

create table if not exists public.registro_comidas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  fecha       date not null default current_date,
  momento     text not null check (momento in ('desayuno', 'almuerzo', 'cena', 'snack')),
  alimento_id uuid references public.alimentos (id) on delete set null,
  descripcion text,
  cantidad_g  numeric,
  calorias    numeric,
  proteina    numeric,
  carbos      numeric,
  grasa       numeric,
  created_at  timestamptz not null default now()
);

create index if not exists registro_comidas_user_fecha_idx
  on public.registro_comidas (user_id, fecha desc);

alter table public.registro_comidas enable row level security;

drop policy if exists "registro_comidas_all_own" on public.registro_comidas;
create policy "registro_comidas_all_own"
  on public.registro_comidas for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- ############################################################################
-- BLOQUE 4 — Gamificación (rachas + logros)
-- ############################################################################

create table if not exists public.rachas (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  dias_consecutivos   int not null default 0,
  mejor_racha         int not null default 0,
  ultima_fecha_activa date
);

alter table public.rachas enable row level security;

drop policy if exists "rachas_all_own" on public.rachas;
create policy "rachas_all_own"
  on public.rachas for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


create table if not exists public.logros (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  tipo            text not null,
  desbloqueado_en timestamptz not null default now(),
  unique (user_id, tipo)
);

alter table public.logros enable row level security;

drop policy if exists "logros_all_own" on public.logros;
create policy "logros_all_own"
  on public.logros for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- --- Función: registrar actividad del día y actualizar la racha -------------
-- Un día cuenta como activo si hubo una comida O un entrenamiento. Esta función
-- es atómica e idempotente dentro del mismo día. Desbloquea logros de racha.
create or replace function public.registrar_actividad()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ultima date;
  v_dias   int;
  v_mejor  int;
begin
  -- Crea la fila de racha si no existe (primer día activo).
  insert into public.rachas (user_id, dias_consecutivos, mejor_racha, ultima_fecha_activa)
  values (auth.uid(), 1, 1, current_date)
  on conflict (user_id) do nothing;

  select ultima_fecha_activa, dias_consecutivos, mejor_racha
    into v_ultima, v_dias, v_mejor
  from public.rachas
  where user_id = auth.uid()
  for update;

  if v_ultima = current_date then
    -- Ya estaba activo hoy: la racha no cambia.
    return;
  elsif v_ultima = current_date - 1 then
    v_dias := v_dias + 1;            -- continúa la racha
  else
    v_dias := 1;                     -- hubo hueco: reinicia
  end if;

  if v_dias > v_mejor then
    v_mejor := v_dias;
  end if;

  update public.rachas
  set dias_consecutivos = v_dias,
      mejor_racha = v_mejor,
      ultima_fecha_activa = current_date
  where user_id = auth.uid();

  -- Logros de racha (una sola vez gracias al unique (user_id, tipo)).
  if v_dias >= 3 then
    insert into public.logros (user_id, tipo) values (auth.uid(), 'racha_3')
    on conflict (user_id, tipo) do nothing;
  end if;
  if v_dias >= 7 then
    insert into public.logros (user_id, tipo) values (auth.uid(), 'racha_7')
    on conflict (user_id, tipo) do nothing;
  end if;
end;
$$;

-- ============================================================================
-- FIN Fase 3
-- ============================================================================
