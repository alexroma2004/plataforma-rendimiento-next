import { supabase } from "@/lib/supabase/client";

export type AdminTeamRow = {
  id: string;
  name: string;
  club: string | null;
  category: string | null;
  season: string | null;
  context: string | null;
  notes: string | null;
};

export type AdminPlayerRow = {
  id: string;
  name: string;
  normalized_name: string;
  position: string | null;
  line: string | null;
  shirt_number: number | null;
  is_goalkeeper: boolean | null;
  active: boolean | null;
  notes: string | null;
};

export type AdminGpsSessionRow = {
  id: string;
  team_id: string | null;
  session_date: string;
  microcycle: string | null;
  session_name: string | null;
  source_filename: string | null;
  is_match: boolean | null;
};

export type AdminNeuromuscularSessionRow = {
  id: string;
  team_id: string | null;
  session_date: string;
  microcycle: string;
  session_name: string | null;
  source_filename: string | null;
};

export type AdminTestSessionRow = {
  id: string;
  team_id: string | null;
  session_date: string;
  session_name: string;
  context: string;
  notes: string | null;
};

export type AdminDashboardCounts = {
  teams: number;
  players: number;
  activePlayers: number;

  gpsSessions: number;
  gpsRecords: number;
  gpsSessionsWithoutTeam: number;
  gpsRecordsWithoutTeam: number;
  gpsRecordsWithoutPlayer: number;

  neuromuscularSessions: number;
  neuromuscularRecords: number;
  neuromuscularSessionsWithoutTeam: number;
  neuromuscularRecordsWithoutTeam: number;
  neuromuscularRecordsWithoutPlayer: number;

  testSessions: number;
  testResults: number;
  testScores: number;
  testSessionsWithoutTeam: number;
  testResultsWithoutTeam: number;
  testResultsWithoutPlayer: number;
  testScoresWithoutTeam: number;
  testScoresWithoutPlayer: number;
};

export type AdminDashboardData = {
  team: AdminTeamRow | null;
  players: AdminPlayerRow[];
  latestGpsSessions: AdminGpsSessionRow[];
  latestNeuromuscularSessions: AdminNeuromuscularSessionRow[];
  latestTestSessions: AdminTestSessionRow[];
  counts: AdminDashboardCounts;
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

function getCount(value: number | null | undefined) {
  return Number(value ?? 0);
}

function throwIfError(error: unknown, message: string) {
  if (!error) return;

  const errorMessage =
    error instanceof Error ? error.message : "Error desconocido.";

  throw new Error(`${message}: ${errorMessage}`);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const client = getSupabaseClient();

  const [
    teamResponse,
    playersResponse,
    latestGpsSessionsResponse,
    latestNeuromuscularSessionsResponse,
    latestTestSessionsResponse,

    teamsCountResponse,
    playersCountResponse,
    activePlayersCountResponse,

    gpsSessionsCountResponse,
    gpsRecordsCountResponse,
    gpsSessionsWithoutTeamResponse,
    gpsRecordsWithoutTeamResponse,
    gpsRecordsWithoutPlayerResponse,

    neuromuscularSessionsCountResponse,
    neuromuscularRecordsCountResponse,
    neuromuscularSessionsWithoutTeamResponse,
    neuromuscularRecordsWithoutTeamResponse,
    neuromuscularRecordsWithoutPlayerResponse,

    testSessionsCountResponse,
    testResultsCountResponse,
    testScoresCountResponse,
    testSessionsWithoutTeamResponse,
    testResultsWithoutTeamResponse,
    testResultsWithoutPlayerResponse,
    testScoresWithoutTeamResponse,
    testScoresWithoutPlayerResponse,
  ] = await Promise.all([
    client
      .from("teams")
      .select("id, name, club, category, season, context, notes")
      .order("created_at", { ascending: true })
      .limit(1),

    client
      .from("players")
      .select(
        "id, name, normalized_name, position, line, shirt_number, is_goalkeeper, active, notes",
      )
      .order("name", { ascending: true }),

    client
      .from("gps_sessions")
      .select(
        "id, team_id, session_date, microcycle, session_name, source_filename, is_match",
      )
      .order("session_date", { ascending: false })
      .limit(8),

    client
      .from("neuromuscular_sessions")
      .select("id, team_id, session_date, microcycle, session_name, source_filename")
      .order("session_date", { ascending: false })
      .limit(8),

    client
      .from("test_sessions")
      .select("id, team_id, session_date, session_name, context, notes")
      .order("session_date", { ascending: false })
      .limit(8),

    client.from("teams").select("id", { count: "exact", head: true }),
    client.from("players").select("id", { count: "exact", head: true }),
    client
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("active", true),

    client.from("gps_sessions").select("id", { count: "exact", head: true }),
    client.from("gps_records").select("id", { count: "exact", head: true }),
    client
      .from("gps_sessions")
      .select("id", { count: "exact", head: true })
      .is("team_id", null),
    client
      .from("gps_records")
      .select("id", { count: "exact", head: true })
      .is("team_id", null),
    client
      .from("gps_records")
      .select("id", { count: "exact", head: true })
      .is("player_id", null),

    client
      .from("neuromuscular_sessions")
      .select("id", { count: "exact", head: true }),
    client
      .from("neuromuscular_records")
      .select("id", { count: "exact", head: true }),
    client
      .from("neuromuscular_sessions")
      .select("id", { count: "exact", head: true })
      .is("team_id", null),
    client
      .from("neuromuscular_records")
      .select("id", { count: "exact", head: true })
      .is("team_id", null),
    client
      .from("neuromuscular_records")
      .select("id", { count: "exact", head: true })
      .is("player_id", null),

    client.from("test_sessions").select("id", { count: "exact", head: true }),
    client.from("test_results").select("id", { count: "exact", head: true }),
    client.from("test_scores").select("id", { count: "exact", head: true }),
    client
      .from("test_sessions")
      .select("id", { count: "exact", head: true })
      .is("team_id", null),
    client
      .from("test_results")
      .select("id", { count: "exact", head: true })
      .is("team_id", null),
    client
      .from("test_results")
      .select("id", { count: "exact", head: true })
      .is("player_id", null),
    client
      .from("test_scores")
      .select("id", { count: "exact", head: true })
      .is("team_id", null),
    client
      .from("test_scores")
      .select("id", { count: "exact", head: true })
      .is("player_id", null),
  ]);

  throwIfError(teamResponse.error, "No se ha podido cargar el equipo");
  throwIfError(playersResponse.error, "No se han podido cargar los jugadores");
  throwIfError(
    latestGpsSessionsResponse.error,
    "No se han podido cargar las últimas sesiones GPS",
  );
  throwIfError(
    latestNeuromuscularSessionsResponse.error,
    "No se han podido cargar las últimas sesiones neuromusculares",
  );
  throwIfError(
    latestTestSessionsResponse.error,
    "No se han podido cargar las últimas sesiones de tests",
  );

  const countResponses = [
    teamsCountResponse,
    playersCountResponse,
    activePlayersCountResponse,

    gpsSessionsCountResponse,
    gpsRecordsCountResponse,
    gpsSessionsWithoutTeamResponse,
    gpsRecordsWithoutTeamResponse,
    gpsRecordsWithoutPlayerResponse,

    neuromuscularSessionsCountResponse,
    neuromuscularRecordsCountResponse,
    neuromuscularSessionsWithoutTeamResponse,
    neuromuscularRecordsWithoutTeamResponse,
    neuromuscularRecordsWithoutPlayerResponse,

    testSessionsCountResponse,
    testResultsCountResponse,
    testScoresCountResponse,
    testSessionsWithoutTeamResponse,
    testResultsWithoutTeamResponse,
    testResultsWithoutPlayerResponse,
    testScoresWithoutTeamResponse,
    testScoresWithoutPlayerResponse,
  ];

  countResponses.forEach((response) => {
    throwIfError(response.error, "No se ha podido calcular el resumen de datos");
  });

  return {
    team: ((teamResponse.data ?? [])[0] ?? null) as AdminTeamRow | null,
    players: (playersResponse.data ?? []) as AdminPlayerRow[],
    latestGpsSessions:
      (latestGpsSessionsResponse.data ?? []) as AdminGpsSessionRow[],
    latestNeuromuscularSessions:
      (latestNeuromuscularSessionsResponse.data ??
        []) as AdminNeuromuscularSessionRow[],
    latestTestSessions:
      (latestTestSessionsResponse.data ?? []) as AdminTestSessionRow[],
    counts: {
      teams: getCount(teamsCountResponse.count),
      players: getCount(playersCountResponse.count),
      activePlayers: getCount(activePlayersCountResponse.count),

      gpsSessions: getCount(gpsSessionsCountResponse.count),
      gpsRecords: getCount(gpsRecordsCountResponse.count),
      gpsSessionsWithoutTeam: getCount(gpsSessionsWithoutTeamResponse.count),
      gpsRecordsWithoutTeam: getCount(gpsRecordsWithoutTeamResponse.count),
      gpsRecordsWithoutPlayer: getCount(gpsRecordsWithoutPlayerResponse.count),

      neuromuscularSessions: getCount(
        neuromuscularSessionsCountResponse.count,
      ),
      neuromuscularRecords: getCount(neuromuscularRecordsCountResponse.count),
      neuromuscularSessionsWithoutTeam: getCount(
        neuromuscularSessionsWithoutTeamResponse.count,
      ),
      neuromuscularRecordsWithoutTeam: getCount(
        neuromuscularRecordsWithoutTeamResponse.count,
      ),
      neuromuscularRecordsWithoutPlayer: getCount(
        neuromuscularRecordsWithoutPlayerResponse.count,
      ),

      testSessions: getCount(testSessionsCountResponse.count),
      testResults: getCount(testResultsCountResponse.count),
      testScores: getCount(testScoresCountResponse.count),
      testSessionsWithoutTeam: getCount(testSessionsWithoutTeamResponse.count),
      testResultsWithoutTeam: getCount(testResultsWithoutTeamResponse.count),
      testResultsWithoutPlayer: getCount(
        testResultsWithoutPlayerResponse.count,
      ),
      testScoresWithoutTeam: getCount(testScoresWithoutTeamResponse.count),
      testScoresWithoutPlayer: getCount(testScoresWithoutPlayerResponse.count),
    },
  };
}