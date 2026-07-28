import { supabase } from "@/lib/supabase/client";

export type TestSessionRow = {
  id: string;
  team_id: string | null;
  session_date: string;
  session_name: string;
  context: string;
  tests: unknown[] | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TestResultRow = {
  id: string;
  session_id: string;
  team_id: string | null;
  player_id: string | null;
  session_date: string;
  player_name: string;
  normalized_name: string;
  position: string | null;
  context: string;
  test_block: string;
  variable: string;
  value: number | null;
  unit: string | null;
  direction: string | null;
  available: boolean | null;
  original_weight: number | null;
  used_weight: number | null;
  variable_score: number | null;
  classification: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TestScoreRow = {
  id: string;
  session_id: string;
  team_id: string | null;
  player_id: string | null;
  session_date: string;
  player_name: string;
  normalized_name: string;
  position: string | null;
  context: string;
  capacity: string;
  final_score: number | null;
  classification: string | null;
  used_variables: number | null;
  expected_variables: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TestTeamRow = {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
};

export type TestPlayerRow = {
  id: string;
  name: string;
  normalized_name: string | null;
  position: string | null;
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

export async function getTestTeamsFromSupabase(): Promise<TestTeamRow[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("teams")
    .select("id, name, category, season")
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar los equipos: ${error.message}`);
  }

  return (data ?? []) as TestTeamRow[];
}

export async function getTestPlayersByTeamId(
  teamId: string,
): Promise<TestPlayerRow[]> {
  const client = getSupabaseClient();
  const selectedTeamId = cleanText(teamId);

  if (!selectedTeamId) {
    return [];
  }

  const { data, error } = await client
    .from("players")
    .select("id, name, normalized_name, position")
    .eq("team_id", selectedTeamId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar los jugadores: ${error.message}`);
  }

  return (data ?? []) as TestPlayerRow[];
}

export async function getTestSessionsFromSupabase(teamId?: string | null) {
  const client = getSupabaseClient();
  const selectedTeamId = cleanText(teamId);

  let query = client
    .from("test_sessions")
    .select("*");

  if (selectedTeamId) {
    query = query.eq("team_id", selectedTeamId);
  }

  const { data, error } = await query
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`No se han podido cargar las sesiones de tests: ${error.message}`);
  }

  return (data ?? []) as TestSessionRow[];
}

export async function getTestResultsBySessionId(
  sessionId: string,
  teamId?: string | null,
) {
  const client = getSupabaseClient();
  const selectedTeamId = cleanText(teamId);

  let query = client
    .from("test_results")
    .select("*")
    .eq("session_id", sessionId);

  if (selectedTeamId) {
    query = query.eq("team_id", selectedTeamId);
  }

  const { data, error } = await query
    .order("player_name", { ascending: true })
    .order("test_block", { ascending: true })
    .order("variable", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar los resultados de tests: ${error.message}`);
  }

  return (data ?? []) as TestResultRow[];
}

export async function getTestScoresBySessionId(
  sessionId: string,
  teamId?: string | null,
) {
  const client = getSupabaseClient();
  const selectedTeamId = cleanText(teamId);

  let query = client
    .from("test_scores")
    .select("*")
    .eq("session_id", sessionId);

  if (selectedTeamId) {
    query = query.eq("team_id", selectedTeamId);
  }

  const { data, error } = await query
    .order("player_name", { ascending: true })
    .order("capacity", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar las puntuaciones de tests: ${error.message}`);
  }

  return (data ?? []) as TestScoreRow[];
}

export type RawTestRow = Record<string, unknown>;

export type TestRecordInput = {
  player_id?: string | null;
  player_name: string;
  normalized_name?: string | null;
  position?: string | null;
  test_block: string;
  variable: string;
  value?: number | null;
  unit?: string | null;
  direction?: string | null;
  available?: boolean | null;
  original_weight?: number | null;
  used_weight?: number | null;
  variable_score?: number | null;
  classification?: string | null;
  source?: string | null;
};

export type CreateTestSessionInput = {
  team_id: string;
  session_date: string;
  session_name: string;
  context: string;
  notes?: string | null;
  tests?: unknown[] | null;
  records: TestRecordInput[];
  skipScores?: boolean;
};

type PlayerMatchForTests = {
  id: string;
  name: string;
  normalized_name: string;
  position: string | null;
};

type PlayerMapsForTests = {
  byId: Map<string, PlayerMatchForTests>;
  byNormalizedName: Map<string, PlayerMatchForTests>;
};

function normalizeTestName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toNumberOrNullForTests(value: number | null | undefined) {
  if (value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

async function getPlayersForTests(teamId: string): Promise<PlayerMapsForTests> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("players")
    .select("id, name, normalized_name, position")
    .eq("team_id", teamId)
    .eq("active", true);

  if (error) {
    throw new Error(`No se han podido cargar los jugadores: ${error.message}`);
  }

  const byId = new Map<string, PlayerMatchForTests>();
  const byNormalizedName = new Map<string, PlayerMatchForTests>();

  for (const player of data ?? []) {
    if (!player.normalized_name) continue;

    const playerMatch = {
      id: player.id,
      name: player.name,
      normalized_name: player.normalized_name,
      position: player.position ?? null,
    };

    byId.set(player.id, playerMatch);
    byNormalizedName.set(player.normalized_name, playerMatch);
  }

  return {
    byId,
    byNormalizedName,
  };
}

function getScoreClassification(score: number | null) {
  if (score === null || score === undefined) return null;

  if (score >= 8) return "Alto";
  if (score >= 5) return "Medio";
  return "Bajo";
}

export async function createTestSessionWithResults(
  input: CreateTestSessionInput,
) {
  const client = getSupabaseClient();

  if (!input.session_date) {
    throw new Error("La fecha de la sesión de tests es obligatoria.");
  }

  if (!input.session_name.trim()) {
    throw new Error("El nombre de la sesión de tests es obligatorio.");
  }

  if (!input.context.trim()) {
    throw new Error("El contexto de la sesión de tests es obligatorio.");
  }

  if (input.records.length === 0) {
    throw new Error("No hay registros de tests para guardar.");
  }

  const teamId = cleanText(input.team_id);

  if (!teamId) {
    throw new Error("Selecciona un equipo antes de guardar tests.");
  }

  const { data: session, error: sessionError } = await client
    .from("test_sessions")
    .insert({
      team_id: teamId,
      session_date: input.session_date,
      session_name: input.session_name,
      context: input.context,
      tests: input.tests ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (sessionError) {
    throw new Error(
      `No se ha podido crear la sesión de tests: ${sessionError.message}`,
    );
  }

  const playersMap = await getPlayersForTests(teamId);

  const resultRows = input.records.map((record) => {
    const normalizedName =
      cleanText(record.normalized_name) ?? normalizeTestName(record.player_name);
    const explicitPlayerId = cleanText(record.player_id);
    const matchedPlayer =
      (explicitPlayerId ? playersMap.byId.get(explicitPlayerId) : null) ??
      playersMap.byNormalizedName.get(normalizedName) ??
      null;

    return {
      session_id: session.id,
      team_id: teamId,
      player_id: matchedPlayer?.id ?? explicitPlayerId,
      session_date: input.session_date,

      player_name: matchedPlayer?.name ?? record.player_name,
      normalized_name: matchedPlayer?.normalized_name ?? normalizedName,
      position: record.position ?? matchedPlayer?.position ?? null,
      context: input.context,

      test_block: record.test_block,
      variable: record.variable,
      value: toNumberOrNullForTests(record.value),
      unit: record.unit ?? null,
      direction: record.direction ?? null,
      available: record.available ?? true,

      original_weight: toNumberOrNullForTests(record.original_weight),
      used_weight: toNumberOrNullForTests(record.used_weight),
      variable_score: toNumberOrNullForTests(record.variable_score),
      classification: record.classification ?? null,
      source: record.source ?? "CSV",
    };
  });

  const { data: insertedResults, error: resultsError } = await client
    .from("test_results")
    .insert(resultRows)
    .select("*");

  if (resultsError) {
    throw new Error(
      `No se han podido guardar los resultados de tests: ${resultsError.message}`,
    );
  }

  const groupedScores = new Map<
    string,
    {
      player_name: string;
      normalized_name: string;
      position: string | null;
      player_id: string | null;
      capacity: string;
      scores: number[];
      expected_variables: number;
    }
  >();

  for (const row of resultRows) {
    const key = `${row.normalized_name}__${row.test_block}`;

    const current = groupedScores.get(key) ?? {
      player_name: row.player_name,
      normalized_name: row.normalized_name,
      position: row.position,
      player_id: row.player_id,
      capacity: row.test_block,
      scores: [],
      expected_variables: 0,
    };

    current.expected_variables += 1;

    if (
      row.variable_score !== null &&
      row.variable_score !== undefined &&
      Number.isFinite(Number(row.variable_score))
    ) {
      current.scores.push(Number(row.variable_score));
    }

    groupedScores.set(key, current);
  }

  const scoreRows = input.skipScores
    ? []
    : Array.from(groupedScores.values()).map((group) => {
          const finalScore =
            group.scores.length > 0
              ? group.scores.reduce((sum, value) => sum + value, 0) /
                group.scores.length
              : null;

          return {
            session_id: session.id,
            team_id: teamId,
            player_id: group.player_id,
            session_date: input.session_date,

            player_name: group.player_name,
            normalized_name: group.normalized_name,
            position: group.position,
            context: input.context,

            capacity: group.capacity,
            final_score: finalScore,
            classification: getScoreClassification(finalScore),
            used_variables: group.scores.length,
            expected_variables: group.expected_variables,
          };
        });

  const { data: insertedScores, error: scoresError } =
    scoreRows.length > 0
      ? await client.from("test_scores").insert(scoreRows).select("*")
      : { data: [], error: null };

  if (scoresError) {
    throw new Error(
      `No se han podido guardar las puntuaciones de tests: ${scoresError.message}`,
    );
  }

  return {
    session: session as TestSessionRow,
    results: (insertedResults ?? []) as TestResultRow[],
    scores: (insertedScores ?? []) as TestScoreRow[],
    insertedResults: insertedResults?.length ?? 0,
    insertedScores: insertedScores?.length ?? 0,
    matchedPlayers: resultRows.filter((row) => row.player_id !== null).length,
    unmatchedPlayers: resultRows.filter((row) => row.player_id === null).length,
  };
}
