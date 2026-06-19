-- ============================================================================
-- FitApp · Fase 2 · Entrenamiento + Progreso visual
-- ----------------------------------------------------------------------------
-- Pega TODO este archivo en:  Supabase Dashboard -> SQL Editor -> New query
-- y pulsa "Run". Es idempotente (if not exists / on conflict do nothing).
-- Requiere haber corrido antes schema.sql (Fase 0) por la función
-- public.is_admin(), y schema_fase1.sql (Fase 1) por user_metrics.
-- ============================================================================


-- ############################################################################
-- BLOQUE 1 — Biblioteca de ejercicios
-- ############################################################################

create table if not exists public.ejercicios (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  grupo_muscular  text not null,
  instrucciones   text,
  imagen_url      text,
  video_url       text,
  created_at      timestamptz not null default now()
);

-- Evita duplicados por nombre sin distinguir mayúsculas ("Sentadilla" = "sentadilla").
create unique index if not exists ejercicios_nombre_lower_uniq
  on public.ejercicios (lower(nombre));

alter table public.ejercicios enable row level security;

drop policy if exists "ejercicios_select_auth"  on public.ejercicios;
drop policy if exists "ejercicios_write_admin"  on public.ejercicios;

-- Lectura: cualquier usuario autenticado.
create policy "ejercicios_select_auth"
  on public.ejercicios for select
  to authenticated
  using ( true );

-- Escritura (insert/update/delete): SOLO admin.
create policy "ejercicios_write_admin"
  on public.ejercicios for all
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );


-- --- Semilla de ejercicios (~20) -------------------------------------------
insert into public.ejercicios (nombre, grupo_muscular, instrucciones) values
  ('Sentadilla', 'piernas', 'Baja flexionando rodillas y cadera manteniendo la espalda recta; sube empujando con los talones.'),
  ('Peso muerto', 'piernas', 'Levanta la barra desde el suelo extendiendo cadera y rodillas, espalda neutra en todo momento.'),
  ('Press de banca', 'pecho', 'Tumbado, baja la barra al pecho y empuja hacia arriba sin bloquear de golpe los codos.'),
  ('Press militar', 'hombros', 'De pie o sentado, empuja la barra/mancuernas por encima de la cabeza sin arquear la espalda.'),
  ('Dominadas', 'espalda', 'Cuelga de la barra y tira hasta que la barbilla supere la barra; baja controlado.'),
  ('Remo con barra', 'espalda', 'Inclinado hacia delante, lleva la barra al abdomen apretando las escápulas.'),
  ('Curl de biceps', 'brazos', 'Flexiona los codos llevando el peso hacia los hombros sin balancear el cuerpo.'),
  ('Extension de triceps', 'brazos', 'Extiende los codos llevando el peso hacia abajo/atrás, codos fijos.'),
  ('Zancadas', 'piernas', 'Da un paso al frente y baja la rodilla trasera cerca del suelo; alterna piernas.'),
  ('Hip thrust', 'piernas', 'Apoya la espalda en un banco y empuja la cadera hacia arriba apretando los glúteos.'),
  ('Plancha', 'core', 'Mantén el cuerpo recto apoyado en antebrazos y puntas de los pies, abdomen apretado.'),
  ('Elevaciones laterales', 'hombros', 'Eleva las mancuernas a los lados hasta la altura de los hombros, codos ligeramente flexionados.'),
  ('Prensa de piernas', 'piernas', 'Empuja la plataforma con los pies extendiendo las piernas sin bloquear las rodillas.'),
  ('Jalon al pecho', 'espalda', 'Sentado, tira de la barra hacia la parte alta del pecho apretando la espalda.'),
  ('Fondos', 'pecho', 'En paralelas, baja flexionando los codos y empuja hacia arriba; inclínate para enfocar pecho.'),
  ('Press inclinado con mancuernas', 'pecho', 'En banco inclinado, empuja las mancuernas hacia arriba juntándolas levemente arriba.'),
  ('Crunch abdominal', 'core', 'Tumbado, eleva el tronco contrayendo el abdomen sin tirar del cuello.'),
  ('Burpees', 'cardio', 'Sentadilla, plancha, flexión, salto explosivo; repite a ritmo constante.'),
  ('Face pull', 'hombros', 'Tira de la cuerda hacia la cara separando las manos, enfocando el deltoides posterior.'),
  ('Curl femoral', 'piernas', 'Flexiona las rodillas llevando el talón hacia los glúteos en la máquina.')
on conflict (lower(nombre)) do nothing;


-- ############################################################################
-- BLOQUE 2 — Rutinas (plantillas + rutinas de usuario + límite IA)
-- ############################################################################

-- --- Plantillas (admin) -----------------------------------------------------
create table if not exists public.rutinas_plantilla (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  objetivo    text not null check (objetivo in ('bajar_grasa', 'ganar_musculo', 'mantener')),
  nivel       text not null check (nivel in ('principiante', 'intermedio', 'avanzado')),
  descripcion text,
  created_at  timestamptz not null default now()
);

create table if not exists public.rutina_plantilla_ejercicios (
  id           uuid primary key default gen_random_uuid(),
  rutina_id    uuid not null references public.rutinas_plantilla (id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios (id) on delete cascade,
  dia          int not null,
  series       int not null,
  reps         text not null,
  orden        int not null default 1,
  unique (rutina_id, ejercicio_id, dia)
);

alter table public.rutinas_plantilla enable row level security;
alter table public.rutina_plantilla_ejercicios enable row level security;

drop policy if exists "plantilla_select_auth"   on public.rutinas_plantilla;
drop policy if exists "plantilla_write_admin"   on public.rutinas_plantilla;
drop policy if exists "plantilla_ej_select_auth" on public.rutina_plantilla_ejercicios;
drop policy if exists "plantilla_ej_write_admin" on public.rutina_plantilla_ejercicios;

create policy "plantilla_select_auth"
  on public.rutinas_plantilla for select to authenticated using ( true );
create policy "plantilla_write_admin"
  on public.rutinas_plantilla for all to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );

create policy "plantilla_ej_select_auth"
  on public.rutina_plantilla_ejercicios for select to authenticated using ( true );
create policy "plantilla_ej_write_admin"
  on public.rutina_plantilla_ejercicios for all to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );


-- --- Rutinas del usuario ----------------------------------------------------
create table if not exists public.rutinas_usuario (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nombre     text not null,
  objetivo   text not null check (objetivo in ('bajar_grasa', 'ganar_musculo', 'mantener')),
  origen     text not null default 'plantilla' check (origen in ('plantilla', 'ia')),
  created_at timestamptz not null default now()
);

create index if not exists rutinas_usuario_user_idx
  on public.rutinas_usuario (user_id, created_at desc);

create table if not exists public.rutina_usuario_ejercicios (
  id                  uuid primary key default gen_random_uuid(),
  rutina_usuario_id   uuid not null references public.rutinas_usuario (id) on delete cascade,
  ejercicio_id        uuid not null references public.ejercicios (id) on delete cascade,
  dia                 int not null,
  series              int not null,
  reps                text not null,
  orden               int not null default 1
);

create index if not exists rutina_usuario_ej_rutina_idx
  on public.rutina_usuario_ejercicios (rutina_usuario_id, dia, orden);

alter table public.rutinas_usuario enable row level security;
alter table public.rutina_usuario_ejercicios enable row level security;

drop policy if exists "rutina_usuario_all_own"     on public.rutinas_usuario;
drop policy if exists "rutina_usuario_ej_all_own"  on public.rutina_usuario_ejercicios;

-- Cada usuario gestiona SOLO sus rutinas.
create policy "rutina_usuario_all_own"
  on public.rutinas_usuario for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- El join se asegura vía la rutina padre (que pertenece al usuario).
create policy "rutina_usuario_ej_all_own"
  on public.rutina_usuario_ejercicios for all to authenticated
  using (
    exists (
      select 1 from public.rutinas_usuario r
      where r.id = rutina_usuario_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rutinas_usuario r
      where r.id = rutina_usuario_id and r.user_id = auth.uid()
    )
  );


-- --- Límite de uso de IA (control de costo) ---------------------------------
create table if not exists public.ia_uso_diario (
  user_id uuid not null references auth.users (id) on delete cascade,
  fecha   date not null default current_date,
  usos    int  not null default 0,
  primary key (user_id, fecha)
);

alter table public.ia_uso_diario enable row level security;

drop policy if exists "ia_uso_select_own" on public.ia_uso_diario;
-- Solo lectura para el dueño (la UI muestra cuántos usos quedan).
-- La escritura la hace SOLO la función SECURITY DEFINER de abajo.
create policy "ia_uso_select_own"
  on public.ia_uso_diario for select to authenticated
  using ( auth.uid() = user_id );

-- Consume 1 crédito de IA de forma atómica. Devuelve true si quedaba cupo.
create or replace function public.consumir_credito_ia(p_max int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usos int;
begin
  insert into public.ia_uso_diario (user_id, fecha, usos)
  values (auth.uid(), current_date, 0)
  on conflict (user_id, fecha) do nothing;

  select usos into v_usos
  from public.ia_uso_diario
  where user_id = auth.uid() and fecha = current_date
  for update;

  if v_usos >= p_max then
    return false;
  end if;

  update public.ia_uso_diario
  set usos = usos + 1
  where user_id = auth.uid() and fecha = current_date;

  return true;
end;
$$;


-- --- Semilla de plantillas (2-3 de ejemplo) ---------------------------------
insert into public.rutinas_plantilla (nombre, objetivo, nivel, descripcion) values
  ('Full Body Principiante — Bajar Grasa', 'bajar_grasa', 'principiante',
   'Rutina de cuerpo completo 3 días/semana, enfocada en gasto calórico y fuerza base.'),
  ('Hipertrofia Principiante — Ganar Musculo', 'ganar_musculo', 'principiante',
   'Torso/Pierna para principiantes, volumen moderado para ganar masa.'),
  ('Mantenimiento General', 'mantener', 'principiante',
   'Rutina equilibrada para conservar fuerza y condición física.')
on conflict (nombre) do nothing;

-- Ejercicios de "Full Body Principiante — Bajar Grasa"
insert into public.rutina_plantilla_ejercicios (rutina_id, ejercicio_id, dia, series, reps, orden)
select r.id, e.id, v.dia, v.series, v.reps, v.orden
from (values
  ('sentadilla',            1, 3, '10-12', 1),
  ('press de banca',        1, 3, '10-12', 2),
  ('remo con barra',        1, 3, '10-12', 3),
  ('plancha',               1, 3, '40s',   4),
  ('peso muerto',           2, 3, '8-10',  1),
  ('press militar',         2, 3, '10-12', 2),
  ('jalon al pecho',        2, 3, '10-12', 3),
  ('burpees',               2, 3, '12',    4),
  ('zancadas',              3, 3, '12',    1),
  ('fondos',                3, 3, '10-12', 2),
  ('curl de biceps',        3, 3, '12-15', 3),
  ('crunch abdominal',      3, 3, '15-20', 4)
) as v(ej, dia, series, reps, orden)
join public.ejercicios e on lower(e.nombre) = v.ej
cross join public.rutinas_plantilla r
where r.nombre = 'Full Body Principiante — Bajar Grasa'
on conflict (rutina_id, ejercicio_id, dia) do nothing;

-- Ejercicios de "Hipertrofia Principiante — Ganar Musculo"
insert into public.rutina_plantilla_ejercicios (rutina_id, ejercicio_id, dia, series, reps, orden)
select r.id, e.id, v.dia, v.series, v.reps, v.orden
from (values
  ('press de banca',                1, 4, '8-12', 1),
  ('press inclinado con mancuernas',1, 3, '8-12', 2),
  ('press militar',                 1, 3, '8-12', 3),
  ('elevaciones laterales',         1, 3, '12-15',4),
  ('extension de triceps',          1, 3, '10-12',5),
  ('sentadilla',                    2, 4, '8-12', 1),
  ('prensa de piernas',             2, 3, '10-12',2),
  ('curl femoral',                  2, 3, '10-12',3),
  ('hip thrust',                    2, 3, '10-12',4),
  ('dominadas',                     3, 4, '6-10', 1),
  ('remo con barra',                3, 3, '8-12', 2),
  ('jalon al pecho',                3, 3, '10-12',3),
  ('curl de biceps',                3, 3, '10-12',4)
) as v(ej, dia, series, reps, orden)
join public.ejercicios e on lower(e.nombre) = v.ej
cross join public.rutinas_plantilla r
where r.nombre = 'Hipertrofia Principiante — Ganar Musculo'
on conflict (rutina_id, ejercicio_id, dia) do nothing;

-- Ejercicios de "Mantenimiento General"
insert into public.rutina_plantilla_ejercicios (rutina_id, ejercicio_id, dia, series, reps, orden)
select r.id, e.id, v.dia, v.series, v.reps, v.orden
from (values
  ('sentadilla',       1, 3, '10', 1),
  ('press de banca',   1, 3, '10', 2),
  ('jalon al pecho',   1, 3, '10', 3),
  ('press militar',    2, 3, '10', 1),
  ('peso muerto',      2, 3, '8',  2),
  ('plancha',          2, 3, '45s',3)
) as v(ej, dia, series, reps, orden)
join public.ejercicios e on lower(e.nombre) = v.ej
cross join public.rutinas_plantilla r
where r.nombre = 'Mantenimiento General'
on conflict (rutina_id, ejercicio_id, dia) do nothing;


-- ############################################################################
-- BLOQUE 3 — Seguimiento de entrenamientos
-- ############################################################################

create table if not exists public.registros_entrenamiento (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  ejercicio_id   uuid not null references public.ejercicios (id) on delete cascade,
  fecha          date not null default current_date,
  peso_levantado numeric,
  reps           int,
  series         int,
  notas          text,
  created_at     timestamptz not null default now()
);

create index if not exists registros_user_fecha_idx
  on public.registros_entrenamiento (user_id, fecha desc);
create index if not exists registros_user_ejercicio_idx
  on public.registros_entrenamiento (user_id, ejercicio_id, fecha);

alter table public.registros_entrenamiento enable row level security;

drop policy if exists "registros_all_own" on public.registros_entrenamiento;
create policy "registros_all_own"
  on public.registros_entrenamiento for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- ############################################################################
-- BLOQUE 4 — Progreso visual (peso corporal + fotos en Storage privado)
-- ############################################################################

-- --- Peso corporal ----------------------------------------------------------
create table if not exists public.peso_corporal (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  fecha      date not null default current_date,
  peso_kg    numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists peso_corporal_user_fecha_idx
  on public.peso_corporal (user_id, fecha);

alter table public.peso_corporal enable row level security;

drop policy if exists "peso_corporal_all_own" on public.peso_corporal;
create policy "peso_corporal_all_own"
  on public.peso_corporal for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- --- Fotos de progreso (metadatos) ------------------------------------------
create table if not exists public.fotos_progreso (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  foto_path  text not null,
  fecha      date not null default current_date,
  tipo       text not null default 'seguimiento'
               check (tipo in ('antes', 'despues', 'seguimiento')),
  created_at timestamptz not null default now()
);

create index if not exists fotos_progreso_user_idx
  on public.fotos_progreso (user_id, fecha desc);

alter table public.fotos_progreso enable row level security;

drop policy if exists "fotos_progreso_all_own" on public.fotos_progreso;
create policy "fotos_progreso_all_own"
  on public.fotos_progreso for all to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- --- Storage: bucket privado `progreso` -------------------------------------
insert into storage.buckets (id, name, public)
values ('progreso', 'progreso', false)
on conflict (id) do nothing;

-- Políticas sobre storage.objects: cada usuario solo opera dentro de su carpeta
-- {user_id}/...  (el primer segmento del path debe ser su propio uid).
drop policy if exists "progreso_select_own" on storage.objects;
drop policy if exists "progreso_insert_own" on storage.objects;
drop policy if exists "progreso_update_own" on storage.objects;
drop policy if exists "progreso_delete_own" on storage.objects;

create policy "progreso_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'progreso'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progreso_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'progreso'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progreso_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'progreso'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progreso_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'progreso'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- FIN Fase 2
-- ============================================================================
