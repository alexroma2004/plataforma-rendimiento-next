begin;

-- Las policies PERMISSIVE se combinan mediante OR: las *_all públicas anulaban
-- las policies específicas. Se exige un inventario exacto de cinco policies,
-- semántica exacta y grants explícitos de service_role antes de modificar nada.
-- PostgreSQL 17.6 incluye MAINTAIN: se conserva para service_role y se retira
-- de anon y authenticated.
-- Los roles siguen siendo globales y el fallback de autenticados sin fila es viewer.

do $$
declare
  table_name text;
  table_oid regclass;
  expected_policy_names text[];
  policy_total integer;
  approved_policy_total integer;
  policy_command "char";
  policy_roles oid[];
  policy_permissive boolean;
  policy_qual text;
  policy_with_check text;
  authenticated_oid oid;
  anon_oid oid;
  service_role_oid oid;
  privilege_name text;
  read_pattern constant text := '^[[:space:]]*(\([[:space:]]*)*(public\.)?can_read_data[[:space:]]*\([[:space:]]*\)([[:space:]]*\))*[[:space:]]*$';
  write_pattern constant text := '^[[:space:]]*(\([[:space:]]*)*(public\.)?can_write_data[[:space:]]*\([[:space:]]*\)([[:space:]]*\))*[[:space:]]*$';
  delete_pattern constant text := '^[[:space:]]*(\([[:space:]]*)*(public\.)?can_delete_data[[:space:]]*\([[:space:]]*\)([[:space:]]*\))*[[:space:]]*$';
  true_pattern constant text := '^[[:space:]]*(\([[:space:]]*)*true([[:space:]]*\))*[[:space:]]*$';
begin
  foreach table_name in array array[
    'elite_references',
    'gps_records',
    'gps_sessions',
    'neuromuscular_records',
    'neuromuscular_sessions',
    'player_profiles',
    'players',
    'teams',
    'test_results',
    'test_scores',
    'test_sessions'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception 'Required table public.% does not exist', table_name;
    end if;
  end loop;

  foreach table_name in array array[
    'elite_references',
    'gps_records',
    'gps_sessions',
    'neuromuscular_records',
    'neuromuscular_sessions',
    'player_profiles',
    'players',
    'teams',
    'test_results',
    'test_scores',
    'test_sessions'
  ]
  loop
    table_oid := to_regclass(format('public.%I', table_name));
    if not exists (
      select 1 from pg_class as c where c.oid = table_oid and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', table_name;
    end if;
  end loop;

  if to_regprocedure('public.can_read_data()') is null then
    raise exception 'Required function public.can_read_data() does not exist';
  end if;
  if to_regprocedure('public.can_write_data()') is null then
    raise exception 'Required function public.can_write_data() does not exist';
  end if;
  if to_regprocedure('public.can_delete_data()') is null then
    raise exception 'Required function public.can_delete_data() does not exist';
  end if;
  if to_regprocedure('public.current_app_role()') is null then
    raise exception 'Required function public.current_app_role() does not exist';
  end if;

  select oid into authenticated_oid from pg_roles where rolname = 'authenticated';
  if authenticated_oid is null then
    raise exception 'Required database role authenticated does not exist';
  end if;

  select oid into anon_oid from pg_roles where rolname = 'anon';
  if anon_oid is null then
    raise exception 'Required database role anon does not exist';
  end if;

  select oid into service_role_oid from pg_roles where rolname = 'service_role';
  if service_role_oid is null then
    raise exception 'Required database role service_role does not exist';
  end if;

  foreach table_name in array array[
    'elite_references',
    'gps_records',
    'gps_sessions',
    'neuromuscular_records',
    'neuromuscular_sessions',
    'player_profiles',
    'players',
    'teams',
    'test_results',
    'test_scores',
    'test_sessions'
  ]
  loop
    table_oid := to_regclass(format('public.%I', table_name));

    expected_policy_names := array[
      'role_select_' || table_name,
      'role_insert_' || table_name,
      'role_update_' || table_name,
      'role_delete_' || table_name,
      table_name || '_all'
    ];

    select count(*)
      into policy_total
      from pg_policy as p
     where p.polrelid = table_oid;

    select count(*)
      into approved_policy_total
      from pg_policy as p
     where p.polrelid = table_oid
       and p.polname = any(expected_policy_names);

    if policy_total <> 5 or approved_policy_total <> 5 then
      raise exception
        'Unexpected policy inventory on public.%: found %, expected 5',
        table_name,
        policy_total;
    end if;

    if exists (
      select 1
        from pg_policy as p
       where p.polrelid = table_oid
         and p.polname <> table_name || '_all'
         and (0 = any(p.polroles) or p.polcmd = '*'::"char")
    ) then
      raise exception 'Unexpected public or ALL policy on public.%', table_name;
    end if;

    select p.polcmd,
           p.polroles,
           p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid),
           pg_get_expr(p.polwithcheck, p.polrelid)
      into policy_command,
           policy_roles,
           policy_permissive,
           policy_qual,
           policy_with_check
      from pg_policy as p
     where p.polrelid = table_oid
       and p.polname = 'role_select_' || table_name;

    if policy_command <> 'r'::"char"
       or policy_permissive is not true
       or policy_roles is distinct from array[authenticated_oid]::oid[]
       or coalesce(lower(policy_qual), '') !~ read_pattern
       or policy_with_check is not null then
      raise exception 'Incompatible policy role_select_% on public.%', table_name, table_name;
    end if;

    select p.polcmd,
           p.polroles,
           p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid),
           pg_get_expr(p.polwithcheck, p.polrelid)
      into policy_command,
           policy_roles,
           policy_permissive,
           policy_qual,
           policy_with_check
      from pg_policy as p
     where p.polrelid = table_oid
       and p.polname = 'role_insert_' || table_name;

    if policy_command <> 'a'::"char"
       or policy_permissive is not true
       or policy_roles is distinct from array[authenticated_oid]::oid[]
       or policy_qual is not null
       or coalesce(lower(policy_with_check), '') !~ write_pattern then
      raise exception 'Incompatible policy role_insert_% on public.%', table_name, table_name;
    end if;

    select p.polcmd,
           p.polroles,
           p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid),
           pg_get_expr(p.polwithcheck, p.polrelid)
      into policy_command,
           policy_roles,
           policy_permissive,
           policy_qual,
           policy_with_check
      from pg_policy as p
     where p.polrelid = table_oid
       and p.polname = 'role_update_' || table_name;

    if policy_command <> 'w'::"char"
       or policy_permissive is not true
       or policy_roles is distinct from array[authenticated_oid]::oid[]
       or coalesce(lower(policy_qual), '') !~ write_pattern
       or coalesce(lower(policy_with_check), '') !~ write_pattern then
      raise exception 'Incompatible policy role_update_% on public.%', table_name, table_name;
    end if;

    select p.polcmd,
           p.polroles,
           p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid),
           pg_get_expr(p.polwithcheck, p.polrelid)
      into policy_command,
           policy_roles,
           policy_permissive,
           policy_qual,
           policy_with_check
      from pg_policy as p
     where p.polrelid = table_oid
       and p.polname = 'role_delete_' || table_name;

    if policy_command <> 'd'::"char"
       or policy_permissive is not true
       or policy_roles is distinct from array[authenticated_oid]::oid[]
       or coalesce(lower(policy_qual), '') !~ delete_pattern
       or policy_with_check is not null then
      raise exception 'Incompatible policy role_delete_% on public.%', table_name, table_name;
    end if;

    select p.polcmd,
           p.polroles,
           p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid),
           pg_get_expr(p.polwithcheck, p.polrelid)
      into policy_command,
           policy_roles,
           policy_permissive,
           policy_qual,
           policy_with_check
      from pg_policy as p
     where p.polrelid = table_oid
       and p.polname = table_name || '_all';

    if policy_command <> '*'::"char"
       or policy_permissive is not true
       or policy_roles is distinct from array[0::oid]
       or coalesce(lower(policy_qual), '') !~ true_pattern
       or coalesce(lower(policy_with_check), '') !~ true_pattern then
      raise exception 'Incompatible public ALL policy %_all on public.%', table_name, table_name;
    end if;

    foreach privilege_name in array array[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'
    ]
    loop
      if not exists (
        select 1
          from pg_class as c
          cross join lateral aclexplode(c.relacl) as acl
         where c.oid = table_oid
           and acl.grantee = service_role_oid
           and acl.privilege_type = privilege_name
      ) then
        raise exception
          'service_role lacks explicit % grant on public.%',
          privilege_name,
          table_name;
      end if;
    end loop;
  end loop;
end
$$;

drop policy elite_references_all on public.elite_references;
drop policy gps_records_all on public.gps_records;
drop policy gps_sessions_all on public.gps_sessions;
drop policy neuromuscular_records_all on public.neuromuscular_records;
drop policy neuromuscular_sessions_all on public.neuromuscular_sessions;
drop policy player_profiles_all on public.player_profiles;
drop policy players_all on public.players;
drop policy teams_all on public.teams;
drop policy test_results_all on public.test_results;
drop policy test_scores_all on public.test_scores;
drop policy test_sessions_all on public.test_sessions;

revoke all privileges on table
  public.elite_references,
  public.gps_records,
  public.gps_sessions,
  public.neuromuscular_records,
  public.neuromuscular_sessions,
  public.player_profiles,
  public.players,
  public.teams,
  public.test_results,
  public.test_scores,
  public.test_sessions
from public;

revoke all privileges on table
  public.elite_references,
  public.gps_records,
  public.gps_sessions,
  public.neuromuscular_records,
  public.neuromuscular_sessions,
  public.player_profiles,
  public.players,
  public.teams,
  public.test_results,
  public.test_scores,
  public.test_sessions
from anon;

revoke all privileges on table
  public.elite_references,
  public.gps_records,
  public.gps_sessions,
  public.neuromuscular_records,
  public.neuromuscular_sessions,
  public.player_profiles,
  public.players,
  public.teams,
  public.test_results,
  public.test_scores,
  public.test_sessions
from authenticated;

grant select, insert, update, delete on table
  public.elite_references,
  public.gps_records,
  public.gps_sessions,
  public.neuromuscular_records,
  public.neuromuscular_sessions,
  public.player_profiles,
  public.players,
  public.teams,
  public.test_results,
  public.test_scores,
  public.test_sessions
to authenticated;

do $$
declare
  table_name text;
  table_oid regclass;
  expected_policy_names text[];
  policy_total integer;
  approved_policy_total integer;
  authenticated_oid oid;
  anon_oid oid;
  service_role_oid oid;
  privilege_name text;
begin
  select oid into authenticated_oid from pg_roles where rolname = 'authenticated';
  select oid into anon_oid from pg_roles where rolname = 'anon';
  select oid into service_role_oid from pg_roles where rolname = 'service_role';

  if authenticated_oid is null or anon_oid is null or service_role_oid is null then
    raise exception 'Required database roles are unavailable during postflight';
  end if;

  foreach table_name in array array[
    'elite_references',
    'gps_records',
    'gps_sessions',
    'neuromuscular_records',
    'neuromuscular_sessions',
    'player_profiles',
    'players',
    'teams',
    'test_results',
    'test_scores',
    'test_sessions'
  ]
  loop
    table_oid := to_regclass(format('public.%I', table_name));
    expected_policy_names := array[
      'role_select_' || table_name,
      'role_insert_' || table_name,
      'role_update_' || table_name,
      'role_delete_' || table_name
    ];

    select count(*)
      into policy_total
      from pg_policy as p
     where p.polrelid = table_oid;

    select count(*)
      into approved_policy_total
      from pg_policy as p
     where p.polrelid = table_oid
       and p.polname = any(expected_policy_names);

    if policy_total <> 4 or approved_policy_total <> 4 then
      raise exception
        'Unexpected postflight policy inventory on public.%: found %, expected 4',
        table_name,
        policy_total;
    end if;

    if exists (
      select 1
        from pg_policy as p
       where p.polrelid = table_oid
         and (0 = any(p.polroles) or p.polcmd = '*'::"char")
    ) then
      raise exception 'Unexpected public or ALL policy remains on public.%', table_name;
    end if;

    foreach privilege_name in array array[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'
    ]
    loop
      if has_table_privilege(anon_oid, table_oid, privilege_name) then
        raise exception 'anon retains % privilege on public.%', privilege_name, table_name;
      end if;

      if privilege_name in ('SELECT', 'INSERT', 'UPDATE', 'DELETE') then
        if not has_table_privilege(authenticated_oid, table_oid, privilege_name) then
          raise exception 'authenticated lacks % privilege on public.%', privilege_name, table_name;
        end if;
      elsif has_table_privilege(authenticated_oid, table_oid, privilege_name) then
        raise exception 'authenticated retains prohibited % privilege on public.%', privilege_name, table_name;
      end if;

      if not has_table_privilege(service_role_oid, table_oid, privilege_name) then
        raise exception 'service_role lost % privilege on public.%', privilege_name, table_name;
      end if;
    end loop;
  end loop;
end
$$;

commit;
