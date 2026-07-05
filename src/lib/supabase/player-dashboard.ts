import { supabase } from "@/lib/supabase/client";

export type PlayerDashboardPlayer = {
  id: string;
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

export async function getPlayerDashboardData(): Promise<PlayerDashboardData> {
  const client = getSupabaseClient();

  const [
    playersResponse,
    gpsResponse,
    neuromuscularResponse,
    testScoresResponse,
    testResultsResponse,
  ] = await Promise.all([
    client
      .from("players")
      .select(
        "id, name, normalized_name, first_name, last_name, birth_date, dominant_foot, primary_position, secondary_position, photo_path, position, active",
      )
      .eq("active", true)
      .order("name", { ascending: true }),

    client
      .from("gps_records")
      .select(
        "id, player_id, player_name, position, session_date, microcycle, total_distance, hsr, distance_vrange6, sprints, num_acc, num_dec",
      )
      .order("session_date", { ascending: false }),

    client
      .from("neuromuscular_records")
      .select(
        "id, player_id, player_name, position, session_date, microcycle, cmj_pre, rsimod_pre, vmp_pre, cmj_post, rsimod_post, vmp_post, squat_load_kg, rpe, notes",
      )
      .order("session_date", { ascending: false }),

    client
      .from("test_scores")
      .select(
        "id, player_id, player_name, normalized_name, position, capacity, final_score, classification, used_variables, expected_variables",
      )
      .order("capacity", { ascending: true }),

    client
      .from("test_results")
      .select(
        "id, player_id, player_name, normalized_name, position, test_block, variable, value, unit, original_weight, used_weight, variable_score, classification, available",
      )
      .order("test_block", { ascending: true }),
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
