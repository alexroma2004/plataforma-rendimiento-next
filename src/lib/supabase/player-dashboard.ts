import { supabase } from "@/lib/supabase/client";

const PLAYER_PHOTOS_BUCKET = "player-photos";
const PLAYER_SELECT =
  "id, team_id, name, normalized_name, first_name, last_name, birth_date, dominant_foot, primary_position, secondary_position, photo_path, position, active";

export type PlayerDashboardPlayer = {
  id: string;
  team_id: string | null;
  name: string;
  normalized_name: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  dominant_foot: string | null;
  primary_position: string | null;
  secondary_position: string | null;
  photo_path: string | null;
  position: string | null;
  active: boolean | null;
};

export type PlayerDashboardGpsRecord = {
  id: string;
  player_id: string | null;
  player_name: string;
  position: string | null;
  session_date: string;
  microcycle: string | null;
  total_distance: number | null;
  hsr: number | null;
  distance_vrange6: number | null;
  sprints: number | null;
  num_acc: number | null;
  num_dec: number | null;
};

export type PlayerDashboardNeuromuscularRecord = {
  id: string;
  player_id: string | null;
  player_name: string;
  position: string | null;
  session_date: string;
  microcycle: string;
  cmj_pre: number | null;
  rsimod_pre: number | null;
  vmp_pre: number | null;
  cmj_post: number | null;
  rsimod_post: number | null;
  vmp_post: number | null;
  squat_load_kg: number | null;
  rpe: number | null;
  notes: string | null;
};

export type PlayerDashboardTestScore = {
  id: string;
  player_id: string | null;
  player_name: string;
  normalized_name: string;
  position: string | null;
  capacity: string;
  final_score: number | null;
  classification: string | null;
  used_variables: number | null;
  expected_variables: number | null;
};

export type PlayerDashboardTestResult = {
  id: string;
  player_id: string | null;
  player_name: string;
  normalized_name: string;
  position: string | null;
  test_block: string;
  variable: string;
  value: number | null;
  unit: string | null;
  original_weight: number | null;
  used_weight: number | null;
  variable_score: number | null;
  classification: string | null;
  available: boolean | null;
};

export type PlayerDashboardTeam = {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
};

export type PlayerDashboardData = {
  players: PlayerDashboardPlayer[];
  gpsRecords: PlayerDashboardGpsRecord[];
  neuromuscularRecords: PlayerDashboardNeuromuscularRecord[];
  testScores: PlayerDashboardTestScore[];
  testResults: PlayerDashboardTestResult[];
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

function cleanStoragePath(value: string | null | undefined) {
  const text = String(value ?? "").trim();

  return text || null;
}

function cleanText(value: string | null | undefined) {
  const text = String(value ?? "").trim();

  return text || null;
}

export async function getPlayerDashboardTeams(): Promise<PlayerDashboardTeam[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("teams")
    .select("id, name, category, season")
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar los equipos: ${error.message}`);
  }

  return (data ?? []) as PlayerDashboardTeam[];
}

export async function getPlayerDashboardPlayers(
  teamId?: string | null,
): Promise<PlayerDashboardPlayer[]> {
  const client = getSupabaseClient();
  const selectedTeamId = cleanText(teamId);

  const query = selectedTeamId
    ? client
        .from("players")
        .select(PLAYER_SELECT)
        .eq("active", true)
        .eq("team_id", selectedTeamId)
        .order("name", { ascending: true })
    : client
        .from("players")
        .select(PLAYER_SELECT)
        .eq("active", true)
        .order("name", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`No se han podido cargar los jugadores: ${error.message}`);
  }

  return (data ?? []) as PlayerDashboardPlayer[];
}

export async function getPlayerDashboardPhotoSignedUrl(
  photoPath: string | null | undefined,
) {
  const cleanPath = cleanStoragePath(photoPath);

  if (!cleanPath) return null;

  const client = getSupabaseClient();

  const { data, error } = await client.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .createSignedUrl(cleanPath, 60 * 30);

  if (error) {
    throw new Error(`No se ha podido cargar la foto del jugador: ${error.message}`);
  }

  return data.signedUrl;
}

export async function getPlayerDashboardData(
  teamId?: string | null,
  playerId?: string | null,
): Promise<PlayerDashboardData> {
  const client = getSupabaseClient();
  const selectedTeamId = cleanText(teamId);
  const selectedPlayerId = cleanText(playerId);

  const playersQuery = selectedTeamId
    ? client
        .from("players")
        .select(PLAYER_SELECT)
        .eq("active", true)
        .eq("team_id", selectedTeamId)
        .order("name", { ascending: true })
    : client
        .from("players")
        .select(PLAYER_SELECT)
        .eq("active", true)
        .order("name", { ascending: true });

  let gpsQuery = client
    .from("gps_records")
    .select(
      "id, player_id, player_name, position, session_date, microcycle, total_distance, hsr, distance_vrange6, sprints, num_acc, num_dec",
    );

  if (selectedTeamId) {
    gpsQuery = gpsQuery.eq("team_id", selectedTeamId);
  }

  if (selectedPlayerId) {
    gpsQuery = gpsQuery.eq("player_id", selectedPlayerId);
  }

  let neuromuscularQuery = client
    .from("neuromuscular_records")
    .select(
      "id, player_id, player_name, position, session_date, microcycle, cmj_pre, rsimod_pre, vmp_pre, cmj_post, rsimod_post, vmp_post, squat_load_kg, rpe, notes",
    );

  if (selectedTeamId) {
    neuromuscularQuery = neuromuscularQuery.eq("team_id", selectedTeamId);
  }

  if (selectedPlayerId) {
    neuromuscularQuery = neuromuscularQuery.eq("player_id", selectedPlayerId);
  }

  let testScoresQuery = client
    .from("test_scores")
    .select(
      "id, player_id, player_name, normalized_name, position, capacity, final_score, classification, used_variables, expected_variables",
    );

  if (selectedTeamId) {
    testScoresQuery = testScoresQuery.eq("team_id", selectedTeamId);
  }

  if (selectedPlayerId) {
    testScoresQuery = testScoresQuery.eq("player_id", selectedPlayerId);
  }

  let testResultsQuery = client
    .from("test_results")
    .select(
      "id, player_id, player_name, normalized_name, position, test_block, variable, value, unit, original_weight, used_weight, variable_score, classification, available",
    );

  if (selectedTeamId) {
    testResultsQuery = testResultsQuery.eq("team_id", selectedTeamId);
  }

  if (selectedPlayerId) {
    testResultsQuery = testResultsQuery.eq("player_id", selectedPlayerId);
  }

  const [
    playersResponse,
    gpsResponse,
    neuromuscularResponse,
    testScoresResponse,
    testResultsResponse,
  ] = await Promise.all([
    playersQuery,
    gpsQuery.order("session_date", { ascending: false }),
    neuromuscularQuery.order("session_date", { ascending: false }),
    testScoresQuery.order("capacity", { ascending: true }),
    testResultsQuery.order("test_block", { ascending: true }),
  ]);

  if (playersResponse.error) {
    throw new Error(
      `No se han podido cargar los jugadores: ${playersResponse.error.message}`,
    );
  }

  if (gpsResponse.error) {
    throw new Error(
      `No se han podido cargar los registros GPS: ${gpsResponse.error.message}`,
    );
  }

  if (neuromuscularResponse.error) {
    throw new Error(
      `No se han podido cargar los registros neuromusculares: ${neuromuscularResponse.error.message}`,
    );
  }

  if (testScoresResponse.error) {
    throw new Error(
      `No se han podido cargar las puntuaciones de tests: ${testScoresResponse.error.message}`,
    );
  }

  if (testResultsResponse.error) {
    throw new Error(
      `No se han podido cargar los resultados de tests: ${testResultsResponse.error.message}`,
    );
  }

  return {
    players: (playersResponse.data ?? []) as PlayerDashboardPlayer[],
    gpsRecords: (gpsResponse.data ?? []) as PlayerDashboardGpsRecord[],
    neuromuscularRecords:
      (neuromuscularResponse.data ?? []) as PlayerDashboardNeuromuscularRecord[],
    testScores: (testScoresResponse.data ?? []) as PlayerDashboardTestScore[],
    testResults: (testResultsResponse.data ?? []) as PlayerDashboardTestResult[],
  };
}
