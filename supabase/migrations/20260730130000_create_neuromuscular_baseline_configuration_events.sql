-- Eventos inmutables y versionados para la configuración manual del baseline
-- neuromuscular. Esta migración depende de las funciones de rol ya desplegadas.

begin;

do $$
begin
  if to_regprocedure('public.can_read_data()') is null then
    raise exception 'Required function public.can_read_data() does not exist';
  end if;

  if to_regprocedure('public.can_write_data()') is null then
    raise exception 'Required function public.can_write_data() does not exist';
  end if;

  if to_regprocedure('public.current_app_role()') is null then
    raise exception 'Required function public.current_app_role() does not exist';
  end if;

  if to_regclass('public.teams') is null then
    raise exception 'Required table public.teams does not exist';
  end if;

  if to_regclass('public.players') is null then
    raise exception 'Required table public.players does not exist';
  end if;

  if to_regclass('public.neuromuscular_baseline_configuration_events') is not null then
    raise exception
      'Table public.neuromuscular_baseline_configuration_events already exists';
  end if;

  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.players'::regclass
      and attname = 'id'
      and atttypid = 'uuid'::regtype
      and not attisdropped
  ) or not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.players'::regclass
      and attname = 'team_id'
      and atttypid = 'uuid'::regtype
      and not attisdropped
  ) or not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.teams'::regclass
      and attname = 'id'
      and atttypid = 'uuid'::regtype
      and not attisdropped
  ) then
    raise exception 'public.teams.id, public.players.id and public.players.team_id must be uuid';
  end if;

end
$$;

create table public.neuromuscular_baseline_configuration_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  player_id uuid not null,
  metric text not null,
  mode text not null,
  manual_value double precision,
  effective_from date not null,
  reason text,
  created_at timestamp with time zone not null default now(),
  created_by uuid not null default auth.uid(),

  constraint neuromuscular_baseline_events_team_fk
    foreign key (team_id)
    references public.teams(id)
    on delete cascade,

  constraint neuromuscular_baseline_events_player_id_fkey
    foreign key (player_id)
    references public.players(id)
    on delete cascade,

  constraint neuromuscular_baseline_events_metric_check
    check (metric in ('CMJ', 'RSIMOD', 'VMP')),

  constraint neuromuscular_baseline_events_mode_check
    check (mode in ('MANUAL', 'AUTOMATIC')),

  constraint neuromuscular_baseline_events_mode_value_check
    check (
      (
        mode = 'MANUAL'
        and manual_value is not null
        and manual_value > 0
        and manual_value <> 'NaN'::double precision
        and manual_value <> 'Infinity'::double precision
        and manual_value <> '-Infinity'::double precision
      )
      or (
        mode = 'AUTOMATIC'
        and manual_value is null
      )
    ),

  constraint neuromuscular_baseline_events_reason_check
    check (
      reason is null
      or char_length(btrim(reason)) between 1 and 500
    )
);

create function public.validate_neuromuscular_baseline_event_player_team()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  player_team_id uuid;
begin
  select p.team_id
  into player_team_id
  from public.players as p
  where p.id = new.player_id
  for share;

  if not found then
    raise exception 'Player % does not exist', new.player_id
      using errcode = 'foreign_key_violation';
  end if;

  if player_team_id is null then
    raise exception 'Player % is not assigned to a team', new.player_id
      using errcode = 'foreign_key_violation';
  end if;

  if player_team_id <> new.team_id then
    raise exception 'Player % does not belong to team %', new.player_id, new.team_id
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_neuromuscular_baseline_event_player_team()
  from public;
revoke all on function public.validate_neuromuscular_baseline_event_player_team()
  from anon;
revoke all on function public.validate_neuromuscular_baseline_event_player_team()
  from authenticated;

create trigger neuromuscular_baseline_events_validate_player_team
  before insert on public.neuromuscular_baseline_configuration_events
  for each row
  execute function public.validate_neuromuscular_baseline_event_player_team();

comment on table public.neuromuscular_baseline_configuration_events is
  'Immutable, versioned events for effective neuromuscular baseline configuration.';
comment on column public.neuromuscular_baseline_configuration_events.mode is
  'MANUAL uses manual_value; AUTOMATIC returns to the calculated baseline from effective_from.';
comment on column public.neuromuscular_baseline_configuration_events.effective_from is
  'Inclusive session date from which this event becomes effective.';
comment on column public.neuromuscular_baseline_configuration_events.created_by is
  'Supabase Auth user id recorded at insertion time.';
comment on column public.neuromuscular_baseline_configuration_events.team_id is
  'Validated at insertion and retained as an immutable historical snapshot after player transfers.';

create index neuromuscular_baseline_events_lookup_idx
  on public.neuromuscular_baseline_configuration_events (
    team_id,
    player_id,
    metric,
    effective_from desc,
    created_at desc,
    id desc
  );

alter table public.neuromuscular_baseline_configuration_events
  enable row level security;

revoke all on table public.neuromuscular_baseline_configuration_events from public;
revoke all on table public.neuromuscular_baseline_configuration_events from anon;
revoke all on table public.neuromuscular_baseline_configuration_events from authenticated;
grant select, insert on table public.neuromuscular_baseline_configuration_events to authenticated;

-- Access is role-global until team membership policies are implemented.
create policy "neuromuscular_baseline_events_select"
  on public.neuromuscular_baseline_configuration_events
  for select
  to authenticated
  using (public.can_read_data());

create policy "neuromuscular_baseline_events_insert"
  on public.neuromuscular_baseline_configuration_events
  for insert
  to authenticated
  with check (
    public.can_write_data()
    and public.current_app_role()::text in ('admin', 'staff')
    and created_by = auth.uid()
    and (
      -- Effective dates use the Europe/Madrid civil day; created_at remains
      -- a timestamptz via now(), avoiding the Spain/UTC midnight offset.
      effective_from >= (now() at time zone 'Europe/Madrid')::date
      or (
        public.current_app_role()::text = 'admin'
        and reason is not null
        and char_length(btrim(reason)) > 0
      )
    )
  );

commit;
