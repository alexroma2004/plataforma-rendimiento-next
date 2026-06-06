import { supabase } from "@/lib/supabase/client";

export type TeamDashboardPlayer = {
  id: string;
  name: string;
  normalized_name: string;
  position: string | null;
  active: boolean | null;
};

export type TeamDashboardGpsRecord = {
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

export type TeamDashboardNeuromuscularRecord = {
  id: string;
  player_id: string | null;
  player_name: string;
  position: string | null;
  session_date: string;
  microcycle: string;
  cmj_pre: number | null;
  rsimod_pre: number | null;
  vmp_pre: number | null;
  rpe: number | null;
};

export type TeamDashboardTestScore = {
  id: string;
  player_id: string | null;
  player_name: string;
  normalized_name: string;
  position: string | null;
  capacity: string;
  final_score: number | null;
  classification: string | null;
};

export type TeamDashboardData = {
  players: TeamDashboardPlayer[];
  gpsRecords: TeamDashboardGpsRecord[];
  neuromuscularRecords: TeamDashboardNeuromuscularRecord[];
  testScores: TeamDashboardTestScore[];
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

export async function getTeamDashboardData(): Promise<TeamDashboardData> {
  const client = getSupabaseClient();

  const [playersResponse, gpsResponse, neuromuscularResponse, testScoresResponse] =
    await Promise.all([
      client
        .from("players")
        .select("id, name, normalized_name, position, active")
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
          "id, player_id, player_name, position, session_date, microcycle, cmj_pre, rsimod_pre, vmp_pre, rpe",
        )
        .order("session_date", { ascending: false }),

      client
        .from("test_scores")
        .select(
          "id, player_id, player_name, normalized_name, position, capacity, final_score, classification",
        )
        .order("capacity", { ascending: true }),
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

  return {
    players: (playersResponse.data ?? []) as TeamDashboardPlayer[],
    gpsRecords: (gpsResponse.data ?? []) as TeamDashboardGpsRecord[],
    neuromuscularRecords:
      (neuromuscularResponse.data ?? []) as TeamDashboardNeuromuscularRecord[],
    testScores: (testScoresResponse.data ?? []) as TeamDashboardTestScore[],
  };
}
