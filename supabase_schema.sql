-- =========================================================
-- PLATAFORMA RENDIMIENTO · SUPABASE SCHEMA V1
-- Next.js + Supabase + Vercel
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- FUNCIÓN UPDATED_AT
-- =========================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- 1. EQUIPOS
-- =========================================================

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club text,
  category text,
  season text,
  context text check (context in ('Profesional', 'Semi-profesional', 'Amateur')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists teams_name_season_unique
on public.teams (name, season);

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

-- =========================================================
-- 2. JUGADORES
-- =========================================================

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  position text,
  line text,
  shirt_number integer,
  is_goalkeeper boolean default false,
  active boolean default true,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists players_team_normalized_name_unique
on public.players (team_id, normalized_name);

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

-- =========================================================
-- 3. PERFILES DE JUGADOR
-- Peso corporal, carga sentadilla, referencias internas
-- =========================================================

create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  player_name text not null,
  normalized_name text not null,
  body_mass_kg double precision,
  squat_load_kg double precision,
  preferred_squat_load_kg double precision,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists player_profiles_team_normalized_name_unique
on public.player_profiles (team_id, normalized_name);

drop trigger if exists set_player_profiles_updated_at on public.player_profiles;
create trigger set_player_profiles_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();

-- =========================================================
-- 4. SESIONES NEUROMUSCULARES
-- =========================================================

create table if not exists public.neuromuscular_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  session_date date not null,
  microcycle text not null check (
    microcycle in ('MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'PARTIDO', 'OTRO')
  ),
  session_name text,
  source_filename text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists neuromuscular_sessions_unique
on public.neuromuscular_sessions (team_id, session_date, microcycle);

drop trigger if exists set_neuromuscular_sessions_updated_at on public.neuromuscular_sessions;
create trigger set_neuromuscular_sessions_updated_at
before update on public.neuromuscular_sessions
for each row execute function public.set_updated_at();

-- =========================================================
-- 5. REGISTROS NEUROMUSCULARES
-- =========================================================

create table if not exists public.neuromuscular_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.neuromuscular_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,

  session_date date not null,
  microcycle text not null,

  player_name text not null,
  normalized_name text not null,
  position text,

  cmj_pre double precision,
  rsimod_pre double precision,
  vmp_pre double precision,

  cmj_post double precision,
  rsimod_post double precision,
  vmp_post double precision,

  squat_load_kg double precision,
  rpe double precision,

  cmj_baseline double precision,
  rsimod_baseline double precision,
  vmp_baseline double precision,

  cmj_pct_baseline double precision,
  rsimod_pct_baseline double precision,
  vmp_pct_baseline double precision,

  objective_loss_score double precision,
  readiness_score double precision,
  risk_label text,
  trend_label text,

  estimated_1rm_kg double precision,
  relative_1rm double precision,

  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists neuromuscular_records_unique
on public.neuromuscular_records (session_id, normalized_name);

drop trigger if exists set_neuromuscular_records_updated_at on public.neuromuscular_records;
create trigger set_neuromuscular_records_updated_at
before update on public.neuromuscular_records
for each row execute function public.set_updated_at();

-- =========================================================
-- 6. SESIONES GPS
-- =========================================================

create table if not exists public.gps_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  session_date date not null,
  microcycle text not null check (
    microcycle in ('MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'PARTIDO', 'OTRO')
  ),
  session_name text,
  source_filename text,
  is_match boolean default false,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists gps_sessions_unique
on public.gps_sessions (team_id, session_date, microcycle, coalesce(session_name, ''));

drop trigger if exists set_gps_sessions_updated_at on public.gps_sessions;
create trigger set_gps_sessions_updated_at
before update on public.gps_sessions
for each row execute function public.set_updated_at();

-- =========================================================
-- 7. REGISTROS GPS
-- =========================================================

create table if not exists public.gps_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.gps_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,

  session_date date not null,
  microcycle text not null,

  player_name text not null,
  normalized_name text not null,
  position text,
  is_goalkeeper boolean default false,

  time_played double precision,

  total_distance double precision,
  hsr double precision,
  sprints double precision,
  distance_vrange6 double precision,
  num_acc double precision,
  num_dec double precision,

  match_reference_source text,
  valid_matches_count integer,
  reference_total_distance double precision,
  reference_hsr double precision,
  reference_sprints double precision,
  reference_distance_vrange6 double precision,
  reference_num_acc double precision,
  reference_num_dec double precision,

  pct_total_distance double precision,
  pct_hsr double precision,
  pct_sprints double precision,
  pct_distance_vrange6 double precision,
  pct_num_acc double precision,
  pct_num_dec double precision,

  gps_status text,
  notes text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists gps_records_unique
on public.gps_records (session_id, normalized_name);

drop trigger if exists set_gps_records_updated_at on public.gps_records;
create trigger set_gps_records_updated_at
before update on public.gps_records
for each row execute function public.set_updated_at();

-- =========================================================
-- 8. SESIONES DE TESTS
-- =========================================================

create table if not exists public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  session_date date not null,
  session_name text not null,
  context text not null check (context in ('Profesional', 'Semi-profesional', 'Amateur')),
  tests jsonb default '[]'::jsonb,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists test_sessions_unique
on public.test_sessions (team_id, session_date, session_name);

drop trigger if exists set_test_sessions_updated_at on public.test_sessions;
create trigger set_test_sessions_updated_at
before update on public.test_sessions
for each row execute function public.set_updated_at();

-- =========================================================
-- 9. RESULTADOS DE TESTS
-- =========================================================

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,

  session_date date not null,
  player_name text not null,
  normalized_name text not null,
  position text,
  context text not null,

  test_block text not null,
  variable text not null,
  value double precision,
  unit text,
  direction text,
  available boolean default true,

  original_weight double precision,
  used_weight double precision,
  variable_score double precision,
  classification text,
  source text default 'app',

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists test_results_unique
on public.test_results (session_id, normalized_name, test_block, variable);

drop trigger if exists set_test_results_updated_at on public.test_results;
create trigger set_test_results_updated_at
before update on public.test_results
for each row execute function public.set_updated_at();

-- =========================================================
-- 10. PUNTUACIONES DE TESTS
-- =========================================================

create table if not exists public.test_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,

  session_date date not null,
  player_name text not null,
  normalized_name text not null,
  position text,
  context text not null,

  capacity text not null,
  final_score double precision,
  classification text,
  used_variables integer,
  expected_variables integer,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists test_scores_unique
on public.test_scores (session_id, normalized_name, capacity);

drop trigger if exists set_test_scores_updated_at on public.test_scores;
create trigger set_test_scores_updated_at
before update on public.test_scores
for each row execute function public.set_updated_at();

-- =========================================================
-- 11. REFERENCIAS ÉLITE
-- =========================================================

create table if not exists public.elite_references (
  id bigint generated always as identity primary key,
  context text not null,
  capacity text not null,
  variable text not null,
  unit text,
  direction text not null check (direction in ('higher', 'lower')),
  elite_value double precision,
  editable_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists elite_references_unique
on public.elite_references (context, capacity, variable);

drop trigger if exists set_elite_references_updated_at on public.elite_references;
create trigger set_elite_references_updated_at
before update on public.elite_references
for each row execute function public.set_updated_at();

-- =========================================================
-- REFERENCIAS ÉLITE INICIALES
-- =========================================================

insert into public.elite_references
(context, capacity, variable, unit, direction, elite_value, editable_notes)
values
('Profesional', 'Salto', 'CMJ altura', 'cm', 'higher', 50.0, 'Referencia inicial editable.'),
('Profesional', 'Salto', 'RSI mod', 'u.a.', 'higher', 0.80, 'Referencia inicial editable.'),
('Profesional', 'Salto', 'Potencia relativa CMJ', 'W/kg', 'higher', 55.0, 'Referencia inicial editable.'),
('Profesional', 'Fuerza', '1RM relativa', 'kg/kg', 'higher', 2.20, 'Referencia inicial editable.'),
('Profesional', 'Aceleración', '0-5 m', 's', 'lower', 1.00, 'Referencia inicial editable.'),
('Profesional', 'Aceleración', '0-10 m', 's', 'lower', 1.72, 'Referencia inicial editable.'),
('Profesional', 'Velocidad', '0-30 m', 's', 'lower', 4.00, 'Referencia inicial editable.'),
('Profesional', 'Velocidad', 'Velocidad máxima', 'km/h', 'higher', 34.0, 'Referencia inicial editable.'),
('Profesional', 'Capacidad intermitente', 'VIFT', 'km/h', 'higher', 21.0, 'Referencia inicial editable.'),
('Profesional', 'RSA', '% decremento RSA', '%', 'lower', 4.0, 'Referencia inicial editable.')
on conflict (context, capacity, variable) do nothing;

-- =========================================================
-- RLS
-- =========================================================

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.player_profiles enable row level security;
alter table public.neuromuscular_sessions enable row level security;
alter table public.neuromuscular_records enable row level security;
alter table public.gps_sessions enable row level security;
alter table public.gps_records enable row level security;
alter table public.test_sessions enable row level security;
alter table public.test_results enable row level security;
alter table public.test_scores enable row level security;
alter table public.elite_references enable row level security;

-- =========================================================
-- POLÍTICAS TEMPORALES DE DESARROLLO
-- Permiten leer/escribir desde la app con anon key.
-- Más adelante, cuando añadamos login, las endureceremos.
-- =========================================================

drop policy if exists "teams_all" on public.teams;
create policy "teams_all" on public.teams for all using (true) with check (true);

drop policy if exists "players_all" on public.players;
create policy "players_all" on public.players for all using (true) with check (true);

drop policy if exists "player_profiles_all" on public.player_profiles;
create policy "player_profiles_all" on public.player_profiles for all using (true) with check (true);

drop policy if exists "neuromuscular_sessions_all" on public.neuromuscular_sessions;
create policy "neuromuscular_sessions_all" on public.neuromuscular_sessions for all using (true) with check (true);

drop policy if exists "neuromuscular_records_all" on public.neuromuscular_records;
create policy "neuromuscular_records_all" on public.neuromuscular_records for all using (true) with check (true);

drop policy if exists "gps_sessions_all" on public.gps_sessions;
create policy "gps_sessions_all" on public.gps_sessions for all using (true) with check (true);

drop policy if exists "gps_records_all" on public.gps_records;
create policy "gps_records_all" on public.gps_records for all using (true) with check (true);

drop policy if exists "test_sessions_all" on public.test_sessions;
create policy "test_sessions_all" on public.test_sessions for all using (true) with check (true);

drop policy if exists "test_results_all" on public.test_results;
create policy "test_results_all" on public.test_results for all using (true) with check (true);

drop policy if exists "test_scores_all" on public.test_scores;
create policy "test_scores_all" on public.test_scores for all using (true) with check (true);

drop policy if exists "elite_references_all" on public.elite_references;
create policy "elite_references_all" on public.elite_references for all using (true) with check (true);

notify pgrst, 'reload schema';