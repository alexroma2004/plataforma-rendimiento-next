import { supabase } from "@/lib/supabase/client";
import {
  createNeuromuscularHistoryPoints,
  isIsoDate,
  type NeuromuscularHistoryPoint,
  type NeuromuscularHistoryRecord,
  type NeuromuscularMetric,
  type NeuromuscularMoment,
} from "@/lib/domain/neuromuscular";
import {
  sortBaselineConfigurationEventsDescending,
  type NeuromuscularBaselineConfigurationEvent,
  type NeuromuscularBaselineConfigurationMode,
} from "@/lib/domain/neuromuscular-baseline-configuration";

export type NeuromuscularSessionRow = {
  id: string;
  team_id: string | null;
  session_date: string;
  microcycle: string;
  session_name: string | null;
  source_filename: string | null;
};

export type NeuromuscularRecordRow = {
  id: string;
  session_id: string;
  team_id: string | null;
  player_id: string | null;
  session_date: string;
  microcycle: string;
  player_name: string;
  normalized_name: string;
  position: string | null;
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

export type NeuromuscularRecordInput = {
  player_name: string;
  position?: string | null;
  cmj_pre?: number | null;
  rsimod_pre?: number | null;
  vmp_pre?: number | null;
  cmj_post?: number | null;
  rsimod_post?: number | null;
  vmp_post?: number | null;
  squat_load_kg?: number | null;
  rpe?: number | null;
  notes?: string | null;
};

export type CreateNeuromuscularSessionInput = {
  team_id: string;
  session_date: string;
  microcycle: string;
  session_name?: string | null;
  source_filename?: string | null;
  notes?: string | null;
  records: NeuromuscularRecordInput[];
};

export type NeuromuscularTeamRow = {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
};

export type NeuromuscularPlayerRow = {
  id: string;
  name: string;
  normalized_name: string | null;
  position: string | null;
};

export type LoadPlayerNeuromuscularHistoryInput = {
  teamId: string;
  playerId: string;
  metric?: NeuromuscularMetric;
  moment?: NeuromuscularMoment;
  dateFrom?: string;
  dateTo?: string;
};

type NeuromuscularBaselineConfigurationEventRow = {
  id: string;
  team_id: string;
  player_id: string;
  metric: string;
  mode: string;
  manual_value: number | null;
  effective_from: string;
  reason: string | null;
  created_at: string;
  created_by: string;
};

type PlayerMatch = {
  id: string;
  name: string;
  normalized_name: string;
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

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toNumberOrNull(value: number | null | undefined) {
  if (value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

async function getPlayersByNormalizedName(teamId: string) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("players")
    .select("id, name, normalized_name, position")
    .eq("team_id", teamId)
    .eq("active", true);

  if (error) {
    throw new Error(`No se han podido cargar los jugadores: ${error.message}`);
  }

  const playersMap = new Map<string, PlayerMatch>();

  for (const player of data ?? []) {
    const normalizedFromName = normalizeName(player.name);
    const normalizedFromDatabase = player.normalized_name
      ? normalizeName(player.normalized_name)
      : "";

    const playerMatch: PlayerMatch = {
      id: player.id,
      name: player.name,
      normalized_name: normalizedFromName,
      position: player.position ?? null,
    };

    if (normalizedFromName) {
      playersMap.set(normalizedFromName, playerMatch);
    }

    if (normalizedFromDatabase) {
      playersMap.set(normalizedFromDatabase, playerMatch);
    }
  }

  return playersMap;
}

export async function getNeuromuscularTeamsFromSupabase(): Promise<
  NeuromuscularTeamRow[]
> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("teams")
    .select("id, name, category, season")
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se han podido cargar los equipos: ${error.message}`);
  }

  return (data ?? []) as NeuromuscularTeamRow[];
}

export async function getNeuromuscularPlayersByTeamId(
  teamId: string,
): Promise<NeuromuscularPlayerRow[]> {
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

  return (data ?? []) as NeuromuscularPlayerRow[];
}

export async function getNeuromuscularSessionsFromSupabase(
  teamId?: string | null,
) {
  const client = getSupabaseClient();
  const selectedTeamId = cleanText(teamId);

  let query = client
    .from("neuromuscular_sessions")
    .select("*");

  if (selectedTeamId) {
    query = query.eq("team_id", selectedTeamId);
  }

  const { data, error } = await query
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `No se han podido cargar las sesiones neuromusculares: ${error.message}`,
    );
  }

  return (data ?? []) as NeuromuscularSessionRow[];
}

export async function getNeuromuscularRecordsBySessionId(
  sessionId: string,
  teamId?: string | null,
) {
  const client = getSupabaseClient();
  const selectedTeamId = cleanText(teamId);

  let query = client
    .from("neuromuscular_records")
    .select("*")
    .eq("session_id", sessionId);

  if (selectedTeamId) {
    query = query.eq("team_id", selectedTeamId);
  }

  const { data, error } = await query
    .order("player_name", { ascending: true });

  if (error) {
    throw new Error(
      `No se han podido cargar los registros neuromusculares: ${error.message}`,
    );
  }

  return (data ?? []) as NeuromuscularRecordRow[];
}

export async function loadPlayerNeuromuscularHistory(
  input: LoadPlayerNeuromuscularHistoryInput,
): Promise<NeuromuscularHistoryPoint[]> {
  const client = getSupabaseClient();
  const teamId = cleanText(input.teamId);
  const playerId = cleanText(input.playerId);

  if (!teamId) {
    throw new Error("El equipo es obligatorio para cargar el histórico neuromuscular.");
  }

  if (!playerId) {
    throw new Error("El jugador es obligatorio para cargar el histórico neuromuscular.");
  }

  if (input.dateFrom && !isIsoDate(input.dateFrom)) {
    throw new Error("La fecha inicial debe usar el formato ISO YYYY-MM-DD.");
  }

  if (input.dateTo && !isIsoDate(input.dateTo)) {
    throw new Error("La fecha final debe usar el formato ISO YYYY-MM-DD.");
  }

  if (input.dateFrom && input.dateTo && input.dateFrom > input.dateTo) {
    throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
  }

  let query = client
    .from("neuromuscular_records")
    .select(
      "id, session_id, team_id, player_id, session_date, microcycle, cmj_pre, cmj_post, rsimod_pre, rsimod_post, vmp_pre, vmp_post",
    )
    .eq("team_id", teamId)
    .eq("player_id", playerId);

  if (input.dateFrom) {
    query = query.gte("session_date", input.dateFrom);
  }

  if (input.dateTo) {
    query = query.lte("session_date", input.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `No se ha podido cargar el histórico neuromuscular: ${error.message}`,
    );
  }

  return createNeuromuscularHistoryPoints(
    (data ?? []) as NeuromuscularHistoryRecord[],
    {
      metric: input.metric,
      moment: input.moment ?? "PRE",
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertNonEmptyIdentifier(
  value: string,
  label: "teamId" | "playerId",
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} debe ser un texto no vacío.`);
  }
}

function getBaselineEventIdentifier(
  row: Record<string, unknown>,
): string | null {
  const value = row.id;

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getRequiredBaselineEventString(
  row: Record<string, unknown>,
  field: string,
  eventId: string | null,
): string {
  const value = row[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    const identifier = eventId ?? "desconocido";
    throw new Error(
      `Evento de configuración del baseline "${identifier}" inválido: ${field} debe ser un texto no vacío.`,
    );
  }

  return value;
}

function getBaselineEventManualValue(
  row: Record<string, unknown>,
  eventId: string,
): number | null {
  const value = row.manual_value;

  if (value === null) return null;

  if (typeof value !== "number") {
    throw new Error(
      `Evento de configuración del baseline "${eventId}" inválido: manual_value debe ser numérico o null.`,
    );
  }

  return value;
}

function getBaselineEventReason(
  row: Record<string, unknown>,
  eventId: string,
): string | null {
  const value = row.reason;

  if (value === null) return null;

  if (typeof value !== "string") {
    throw new Error(
      `Evento de configuración del baseline "${eventId}" inválido: reason debe ser texto o null.`,
    );
  }

  return value;
}

function parseBaselineConfigurationEventRow(
  value: unknown,
): NeuromuscularBaselineConfigurationEventRow {
  if (!isRecord(value)) {
    throw new Error(
      "Evento de configuración del baseline inválido: la fila remota no es un objeto.",
    );
  }

  const eventId = getBaselineEventIdentifier(value);
  const id = getRequiredBaselineEventString(value, "id", eventId);

  return {
    id,
    team_id: getRequiredBaselineEventString(value, "team_id", id),
    player_id: getRequiredBaselineEventString(value, "player_id", id),
    metric: getRequiredBaselineEventString(value, "metric", id),
    mode: getRequiredBaselineEventString(value, "mode", id),
    manual_value: getBaselineEventManualValue(value, id),
    effective_from: getRequiredBaselineEventString(value, "effective_from", id),
    reason: getBaselineEventReason(value, id),
    created_at: getRequiredBaselineEventString(value, "created_at", id),
    created_by: getRequiredBaselineEventString(value, "created_by", id),
  };
}

function isBaselineConfigurationMetric(
  value: string,
): value is NeuromuscularMetric {
  return value === "CMJ" || value === "RSIMOD" || value === "VMP";
}

function isBaselineConfigurationMode(
  value: string,
): value is NeuromuscularBaselineConfigurationMode {
  return value === "AUTOMATIC" || value === "MANUAL";
}

function mapBaselineConfigurationEventRow(
  row: NeuromuscularBaselineConfigurationEventRow,
): NeuromuscularBaselineConfigurationEvent {
  if (!isBaselineConfigurationMetric(row.metric)) {
    throw new Error(
      `Evento de configuración del baseline "${row.id}" inválido: métrica no compatible "${row.metric}".`,
    );
  }

  if (!isBaselineConfigurationMode(row.mode)) {
    throw new Error(
      `Evento de configuración del baseline "${row.id}" inválido: modo no compatible "${row.mode}".`,
    );
  }

  if (!isIsoDate(row.effective_from)) {
    throw new Error(
      `Evento de configuración del baseline "${row.id}" inválido: effective_from debe usar el formato ISO YYYY-MM-DD.`,
    );
  }

  if (row.mode === "MANUAL") {
    if (
      typeof row.manual_value !== "number" ||
      !Number.isFinite(row.manual_value) ||
      row.manual_value <= 0
    ) {
      throw new Error(
        `Evento de configuración del baseline "${row.id}" inválido: MANUAL exige manual_value finito y mayor que cero.`,
      );
    }
  } else if (row.manual_value !== null) {
    throw new Error(
      `Evento de configuración del baseline "${row.id}" inválido: AUTOMATIC exige manual_value null.`,
    );
  }

  return {
    id: row.id,
    teamId: row.team_id,
    playerId: row.player_id,
    metric: row.metric,
    mode: row.mode,
    manualValue: row.manual_value,
    effectiveFrom: row.effective_from,
    reason: row.reason,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export async function loadPlayerNeuromuscularBaselineConfigurationEvents({
  teamId,
  playerId,
}: {
  teamId: string;
  playerId: string;
}): Promise<NeuromuscularBaselineConfigurationEvent[]> {
  const client = getSupabaseClient();
  assertNonEmptyIdentifier(teamId, "teamId");
  assertNonEmptyIdentifier(playerId, "playerId");

  const { data, error } = await client
    .from("neuromuscular_baseline_configuration_events")
    .select(
      "id, team_id, player_id, metric, mode, manual_value, effective_from, reason, created_at, created_by",
    )
    .eq("team_id", teamId)
    .eq("player_id", playerId)
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(
      `No se pudieron cargar los eventos de configuración del baseline: ${error.message}`,
    );
  }

  const events = (data ?? [])
    .map(parseBaselineConfigurationEventRow)
    .map(mapBaselineConfigurationEventRow);

  return sortBaselineConfigurationEventsDescending(events);
}

export async function createNeuromuscularSessionWithRecords(
  input: CreateNeuromuscularSessionInput,
) {
  const client = getSupabaseClient();

  if (!input.session_date) {
    throw new Error("La fecha de la sesión neuromuscular es obligatoria.");
  }

  if (!input.microcycle) {
    throw new Error("El día de microciclo es obligatorio.");
  }

  if (input.records.length === 0) {
    throw new Error("No hay registros neuromusculares para guardar.");
  }

  const teamId = cleanText(input.team_id);

  if (!teamId) {
    throw new Error("Selecciona un equipo antes de guardar datos neuromusculares.");
  }

  const { data: session, error: sessionError } = await client
    .from("neuromuscular_sessions")
    .insert({
      team_id: teamId,
      session_date: input.session_date,
      microcycle: input.microcycle,
      session_name: input.session_name ?? "Sesión neuromuscular",
      source_filename: input.source_filename ?? null,
    })
    .select("*")
    .single();

  if (sessionError) {
    throw new Error(
      `No se ha podido crear la sesión neuromuscular: ${sessionError.message}`,
    );
  }

  const playersMap = await getPlayersByNormalizedName(teamId);

  const rowsToInsert = input.records.map((record) => {
    const normalizedName = normalizeName(record.player_name);
    const matchedPlayer = playersMap.get(normalizedName) ?? null;

    return {
      session_id: session.id,
      team_id: teamId,
      player_id: matchedPlayer?.id ?? null,
      session_date: input.session_date,
      microcycle: input.microcycle,
      player_name: record.player_name,
      normalized_name: normalizedName,
      position: record.position ?? matchedPlayer?.position ?? null,

      cmj_pre: toNumberOrNull(record.cmj_pre),
      rsimod_pre: toNumberOrNull(record.rsimod_pre),
      vmp_pre: toNumberOrNull(record.vmp_pre),

      cmj_post: toNumberOrNull(record.cmj_post),
      rsimod_post: toNumberOrNull(record.rsimod_post),
      vmp_post: toNumberOrNull(record.vmp_post),

      squat_load_kg: toNumberOrNull(record.squat_load_kg),
      rpe: toNumberOrNull(record.rpe),

      notes: record.notes ?? null,
    };
  });

  const { data: records, error: recordsError } = await client
    .from("neuromuscular_records")
    .insert(rowsToInsert)
    .select("*");

  if (recordsError) {
    throw new Error(
      `No se han podido guardar los registros neuromusculares: ${recordsError.message}`,
    );
  }

  return {
    session: session as NeuromuscularSessionRow,
    records: (records ?? []) as NeuromuscularRecordRow[],
  };
}
