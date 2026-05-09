import { supabase } from "@/lib/supabase/client";
import { parseGpsRows, type GpsParsedRow } from "@/lib/parsers/gps";

export type RawGpsRow = Record<string, unknown>;

export type SaveGpsSessionInput = {
  sessionDate: string;
  microcycle: string;
  sessionName: string;
  sourceFilename: string;
  isMatch: boolean;
  notes?: string;
  rows: RawGpsRow[];
};

export type SaveGpsSessionResult = {
  sessionId: string;
  insertedRecords: number;
};

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  if (!text || text === "—" || text.toLowerCase() === "null") {
    return null;
  }

  return text;
}

function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function normalizeSafeName(value: string): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

async function getDefaultTeamId(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const { data: existingTeam, error: existingTeamError } = await supabase
    .from("teams")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existingTeamError) {
    throw new Error(
      `No se ha podido leer el equipo por defecto: ${existingTeamError.message}`,
    );
  }

  if (existingTeam?.id) {
    return existingTeam.id;
  }

  const { data: createdTeam, error: createdTeamError } = await supabase
    .from("teams")
    .insert({
      name: "Equipo principal",
    })
    .select("id")
    .single();

  if (createdTeamError || !createdTeam?.id) {
    throw new Error(
      `No se ha podido crear el equipo por defecto: ${
        createdTeamError?.message ?? "sin id devuelto"
      }`,
    );
  }

  return createdTeam.id;
}

function validateParsedRows(rows: GpsParsedRow[]) {
  if (rows.length === 0) {
    throw new Error(
      "No se han detectado jugadores válidos en el archivo GPS. Revisa la columna player/jugador.",
    );
  }

  const emptyNameRows = rows.filter((row) => !row.normalized_name);

  if (emptyNameRows.length > 0) {
    throw new Error(
      "Hay registros GPS sin nombre normalizado. Revisa la columna player/jugador del CSV.",
    );
  }

  const seen = new Set<string>();
  const duplicated: string[] = [];

  for (const row of rows) {
    const key = row.normalized_name;

    if (seen.has(key)) {
      duplicated.push(row.player_name);
    }

    seen.add(key);
  }

  if (duplicated.length > 0) {
    throw new Error(
      `Hay jugadores duplicados dentro de la misma sesión GPS: ${duplicated.join(
        ", ",
      )}`,
    );
  }
}

function buildGpsRecordPayload(params: {
  parsedRow: GpsParsedRow;
  sessionId: string;
  teamId: string;
  sessionDate: string;
  microcycle: string;
}) {
  const { parsedRow, sessionId, teamId, sessionDate, microcycle } = params;

  const normalizedName =
    parsedRow.normalized_name || normalizeSafeName(parsedRow.player_name);

  return {
    session_id: sessionId,
    team_id: teamId,
    player_id: null,

    session_date: sessionDate,
    microcycle,

    player_name: parsedRow.player_name,
    normalized_name: normalizedName,

    position: cleanText(parsedRow.position),
    is_goalkeeper: parsedRow.is_goalkeeper,

    time_played: cleanNumber(parsedRow.time_played),

    total_distance: cleanNumber(parsedRow.total_distance) ?? 0,
    hsr: cleanNumber(parsedRow.hsr) ?? 0,
    distance_vrange6: cleanNumber(parsedRow.distance_vrange6) ?? 0,
    sprints: cleanNumber(parsedRow.sprints) ?? 0,
    num_acc: cleanNumber(parsedRow.num_acc) ?? 0,
    num_dec: cleanNumber(parsedRow.num_dec) ?? 0,

    gps_status: "OK",
    notes: null,
  };
}

export async function saveGpsSessionToSupabase(
  input: SaveGpsSessionInput,
): Promise<SaveGpsSessionResult> {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const parsedRows = parseGpsRows(input.rows);

  validateParsedRows(parsedRows);

  const teamId = await getDefaultTeamId();

  const { data: session, error: sessionError } = await supabase
    .from("gps_sessions")
    .insert({
      team_id: teamId,
      session_date: input.sessionDate,
      microcycle: input.microcycle,
      session_name: input.sessionName.trim(),
      source_filename: input.sourceFilename,
      is_match: input.isMatch,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (sessionError || !session?.id) {
    throw new Error(
      `No se ha podido crear la sesión GPS: ${
        sessionError?.message ?? "sin id devuelto"
      }`,
    );
  }

  const sessionId = session.id;

  const recordPayload = parsedRows.map((parsedRow) =>
    buildGpsRecordPayload({
      parsedRow,
      sessionId,
      teamId,
      sessionDate: input.sessionDate,
      microcycle: input.microcycle,
    }),
  );

  const { error: recordsError } = await supabase
    .from("gps_records")
    .insert(recordPayload);

  if (recordsError) {
    await supabase.from("gps_sessions").delete().eq("id", sessionId);

    throw new Error(
      `La sesión se ha creado, pero no se han podido guardar los registros GPS: ${recordsError.message}`,
    );
  }

  return {
    sessionId,
    insertedRecords: recordPayload.length,
  };
}