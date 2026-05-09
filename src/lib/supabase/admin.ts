import { getSupabaseClient } from "./client";

export type TableStatus = {
  table: string;
  label: string;
  count: number | null;
  ok: boolean;
  error: string | null;
};

export const APP_TABLES = [
  { table: "teams", label: "Equipos" },
  { table: "players", label: "Jugadores" },
  { table: "player_profiles", label: "Perfiles de jugador" },
  { table: "neuromuscular_sessions", label: "Sesiones neuromusculares" },
  { table: "neuromuscular_records", label: "Registros neuromusculares" },
  { table: "gps_sessions", label: "Sesiones GPS" },
  { table: "gps_records", label: "Registros GPS" },
  { table: "test_sessions", label: "Sesiones de tests" },
  { table: "test_results", label: "Resultados de tests" },
  { table: "test_scores", label: "Puntuaciones de tests" },
  { table: "elite_references", label: "Referencias élite" },
];

export async function getTableStatus(): Promise<TableStatus[]> {
  const supabase = getSupabaseClient();

  const results: TableStatus[] = [];

  for (const item of APP_TABLES) {
    const { count, error } = await supabase
      .from(item.table)
      .select("*", { count: "exact", head: true });

    results.push({
      table: item.table,
      label: item.label,
      count: typeof count === "number" ? count : null,
      ok: !error,
      error: error ? error.message : null,
    });
  }

  return results;
}