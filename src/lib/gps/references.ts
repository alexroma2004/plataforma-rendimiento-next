import type { SupabaseClient } from "@supabase/supabase-js";

export type GpsMetricKey =
  | "total_distance"
  | "hsr"
  | "distance_vrange6"
  | "sprints"
  | "num_acc"
  | "num_dec";

export type GpsSessionForReference = {
  id: string;
  session_date: string | null;
  microcycle: string | null;
  is_match: boolean | null;
};

export type GpsRecordForReference = {
  id: string;
  session_id: string;
  player_name: string | null;
  normalized_name: string | null;
  position: string | null;
  is_goalkeeper: boolean | null;
  time_played: number | null;

  total_distance: number | null;
  hsr: number | null;
  distance_vrange6: number | null;
  sprints: number | null;
  num_acc: number | null;
  num_dec: number | null;
};

export type GpsReferenceSource =
  | "PROPIA_5_PARTIDOS"
  | "POSICIONAL"
  | "GENERAL"
  | "SIN_REFERENCIA";

export type GpsReference = {
  total_distance: number;
  hsr: number;
  distance_vrange6: number;
  sprints: number;
  num_acc: number;
  num_dec: number;

  source: GpsReferenceSource;
  validMatches: number;
  lastMatchDate: string | null;
};

export type GpsReferenceModel = {
  ownReferences: Map<string, GpsReference>;
  positionReferences: Map<string, GpsReference>;
  playerValidMatches: Map<string, number>;
  playerLastMatchDate: Map<string, string | null>;
};

export type EnrichedGpsRecordWithReference = GpsRecordForReference & {
  reference_total_distance: number;
  reference_hsr: number;
  reference_distance_vrange6: number;
  reference_sprints: number;
  reference_num_acc: number;
  reference_num_dec: number;

  pct_total_distance: number;
  pct_hsr: number;
  pct_distance_vrange6: number;
  pct_sprints: number;
  pct_num_acc: number;
  pct_num_dec: number;

  reference_source: GpsReferenceSource;
  reference_valid_matches: number;
  reference_last_match_date: string | null;
};

export const MIN_VALID_MATCHES_FOR_OWN_REFERENCE = 5;
export const MIN_MINUTES_FOR_VALID_MATCH = 80;

export const GENERAL_MATCH_REFERENCE: Record<GpsMetricKey, number> = {
  total_distance: 11039.7,
  hsr: 567.23,
  distance_vrange6: 185.94,
  sprints: 11.08,
  num_acc: 128.55,
  num_dec: 120.17,
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizePosition(value: unknown): string {
  const raw = normalizeText(value);

  if (!raw) return "SIN_POSICION";

  if (raw === "GK" || raw.includes("PORTERO") || raw.includes("GOALKEEPER")) {
    return "PORTERO";
  }

  if (raw.includes("CENTRAL")) return "CENTRAL";
  if (raw.includes("LATERAL")) return "LATERAL";
  if (raw.includes("MEDIO") || raw.includes("MEDIOCENTRO")) return "MEDIOCENTRO";
  if (raw.includes("EXTREMO")) return "EXTREMO";
  if (raw.includes("DELANTERO")) return "DELANTERO";

  return raw;
}

function isMatchSession(session: GpsSessionForReference | undefined): boolean {
  if (!session) return false;

  const microcycle = normalizeText(session.microcycle);

  return Boolean(session.is_match) || microcycle === "PARTIDO";
}

function getPlayerKey(record: GpsRecordForReference): string {
  return (
    normalizeText(record.normalized_name) ||
    normalizeText(record.player_name)
  );
}

function getMetricValue(record: GpsRecordForReference, key: GpsMetricKey): number {
  return toNumber(record[key]);
}

function average(values: number[]): number {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return 0;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function averageMetric(
  rows: GpsRecordForReference[],
  key: GpsMetricKey,
): number {
  return average(rows.map((row) => getMetricValue(row, key)));
}

function getLastMatchDate(
  rows: GpsRecordForReference[],
  sessionMap: Map<string, GpsSessionForReference>,
): string | null {
  const dates = rows
    .map((row) => sessionMap.get(row.session_id)?.session_date ?? null)
    .filter((date): date is string => Boolean(date))
    .sort();

  if (dates.length === 0) return null;

  return dates[dates.length - 1];
}

function buildReferenceFromRows(
  rows: GpsRecordForReference[],
  source: GpsReferenceSource,
  sessionMap: Map<string, GpsSessionForReference>,
): GpsReference {
  return {
    total_distance: averageMetric(rows, "total_distance"),
    hsr: averageMetric(rows, "hsr"),
    distance_vrange6: averageMetric(rows, "distance_vrange6"),
    sprints: averageMetric(rows, "sprints"),
    num_acc: averageMetric(rows, "num_acc"),
    num_dec: averageMetric(rows, "num_dec"),

    source,
    validMatches: rows.length,
    lastMatchDate: getLastMatchDate(rows, sessionMap),
  };
}

function buildGeneralReference(): GpsReference {
  return {
    total_distance: GENERAL_MATCH_REFERENCE.total_distance,
    hsr: GENERAL_MATCH_REFERENCE.hsr,
    distance_vrange6: GENERAL_MATCH_REFERENCE.distance_vrange6,
    sprints: GENERAL_MATCH_REFERENCE.sprints,
    num_acc: GENERAL_MATCH_REFERENCE.num_acc,
    num_dec: GENERAL_MATCH_REFERENCE.num_dec,

    source: "GENERAL",
    validMatches: 0,
    lastMatchDate: null,
  };
}

function referenceToRows(reference: GpsReference): GpsRecordForReference {
  return {
    id: "",
    session_id: "",
    player_name: "",
    normalized_name: "",
    position: "",
    is_goalkeeper: false,
    time_played: null,

    total_distance: reference.total_distance,
    hsr: reference.hsr,
    distance_vrange6: reference.distance_vrange6,
    sprints: reference.sprints,
    num_acc: reference.num_acc,
    num_dec: reference.num_dec,
  };
}

export function buildGpsReferenceModel(
  sessions: GpsSessionForReference[],
  records: GpsRecordForReference[],
): GpsReferenceModel {
  const sessionMap = new Map<string, GpsSessionForReference>();

  for (const session of sessions) {
    sessionMap.set(session.id, session);
  }

  const validMatchRows = records.filter((record) => {
    const session = sessionMap.get(record.session_id);

    if (!isMatchSession(session)) return false;
    if (record.is_goalkeeper) return false;
    if (toNumber(record.time_played) < MIN_MINUTES_FOR_VALID_MATCH) return false;

    const playerKey = getPlayerKey(record);

    if (!playerKey) return false;

    return true;
  });

  const rowsByPlayer = new Map<string, GpsRecordForReference[]>();

  for (const row of validMatchRows) {
    const playerKey = getPlayerKey(row);

    if (!rowsByPlayer.has(playerKey)) {
      rowsByPlayer.set(playerKey, []);
    }

    rowsByPlayer.get(playerKey)?.push(row);
  }

  const ownReferences = new Map<string, GpsReference>();
  const playerValidMatches = new Map<string, number>();
  const playerLastMatchDate = new Map<string, string | null>();

  for (const [playerKey, playerRows] of rowsByPlayer.entries()) {
    playerValidMatches.set(playerKey, playerRows.length);
    playerLastMatchDate.set(playerKey, getLastMatchDate(playerRows, sessionMap));

    if (playerRows.length >= MIN_VALID_MATCHES_FOR_OWN_REFERENCE) {
      ownReferences.set(
        playerKey,
        buildReferenceFromRows(playerRows, "PROPIA_5_PARTIDOS", sessionMap),
      );
    }
  }

  const ownReferencesByPosition = new Map<string, GpsReference[]>();

  for (const [playerKey, reference] of ownReferences.entries()) {
    const playerRows = rowsByPlayer.get(playerKey) ?? [];
    const firstRow = playerRows[0];

    const position = normalizePosition(firstRow?.position);

    if (!ownReferencesByPosition.has(position)) {
      ownReferencesByPosition.set(position, []);
    }

    ownReferencesByPosition.get(position)?.push(reference);
  }

  const positionReferences = new Map<string, GpsReference>();

  for (const [position, references] of ownReferencesByPosition.entries()) {
    const pseudoRows = references.map(referenceToRows);

    positionReferences.set(
      position,
      buildReferenceFromRows(pseudoRows, "POSICIONAL", sessionMap),
    );
  }

  return {
    ownReferences,
    positionReferences,
    playerValidMatches,
    playerLastMatchDate,
  };
}

export function getReferenceForRecord(
  record: GpsRecordForReference,
  model: GpsReferenceModel,
): GpsReference {
  const playerKey = getPlayerKey(record);
  const positionKey = normalizePosition(record.position);

  const ownReference = model.ownReferences.get(playerKey);

  if (ownReference) {
    return ownReference;
  }

  const positionalReference = model.positionReferences.get(positionKey);
  const playerValidMatches = model.playerValidMatches.get(playerKey) ?? 0;
  const playerLastMatchDate = model.playerLastMatchDate.get(playerKey) ?? null;

  if (positionalReference) {
    return {
      ...positionalReference,
      source: "POSICIONAL",
      validMatches: playerValidMatches,
      lastMatchDate: playerLastMatchDate,
    };
  }

  return {
    ...buildGeneralReference(),
    source: "GENERAL",
    validMatches: playerValidMatches,
    lastMatchDate: playerLastMatchDate,
  };
}

function percentage(value: number, reference: number): number {
  if (!reference || reference <= 0) return 0;

  return (value / reference) * 100;
}

export function enrichGpsRecordWithReference(
  record: GpsRecordForReference,
  model: GpsReferenceModel,
): EnrichedGpsRecordWithReference {
  const reference = getReferenceForRecord(record, model);

  const totalDistance = toNumber(record.total_distance);
  const hsr = toNumber(record.hsr);
  const sprintDistance = toNumber(record.distance_vrange6);
  const sprints = toNumber(record.sprints);
  const acc = toNumber(record.num_acc);
  const dec = toNumber(record.num_dec);

  return {
    ...record,

    reference_total_distance: reference.total_distance,
    reference_hsr: reference.hsr,
    reference_distance_vrange6: reference.distance_vrange6,
    reference_sprints: reference.sprints,
    reference_num_acc: reference.num_acc,
    reference_num_dec: reference.num_dec,

    pct_total_distance: percentage(totalDistance, reference.total_distance),
    pct_hsr: percentage(hsr, reference.hsr),
    pct_distance_vrange6: percentage(
      sprintDistance,
      reference.distance_vrange6,
    ),
    pct_sprints: percentage(sprints, reference.sprints),
    pct_num_acc: percentage(acc, reference.num_acc),
    pct_num_dec: percentage(dec, reference.num_dec),

    reference_source: reference.source,
    reference_valid_matches: reference.validMatches,
    reference_last_match_date: reference.lastMatchDate,
  };
}

export function enrichGpsRecordsWithReferences(
  records: GpsRecordForReference[],
  model: GpsReferenceModel,
): EnrichedGpsRecordWithReference[] {
  return records.map((record) => enrichGpsRecordWithReference(record, model));
}

export async function fetchGpsReferenceModel(
  supabase: SupabaseClient,
): Promise<GpsReferenceModel> {
  const { data: sessions, error: sessionsError } = await supabase
    .from("gps_sessions")
    .select("id, session_date, microcycle, is_match");

  if (sessionsError) {
    throw new Error(
      `No se han podido leer las sesiones GPS para calcular referencias: ${sessionsError.message}`,
    );
  }

  const { data: records, error: recordsError } = await supabase
    .from("gps_records")
    .select(
      `
      id,
      session_id,
      player_name,
      normalized_name,
      position,
      is_goalkeeper,
      time_played,
      total_distance,
      hsr,
      distance_vrange6,
      sprints,
      num_acc,
      num_dec
    `,
    );

  if (recordsError) {
    throw new Error(
      `No se han podido leer los registros GPS para calcular referencias: ${recordsError.message}`,
    );
  }

  return buildGpsReferenceModel(
    (sessions ?? []) as GpsSessionForReference[],
    (records ?? []) as GpsRecordForReference[],
  );
}

export async function updateGpsReferencesForSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<{
  updatedRecords: number;
}> {
  if (!sessionId) {
    throw new Error("No se ha recibido sessionId para actualizar referencias.");
  }

  const referenceModel = await fetchGpsReferenceModel(supabase);

  const { data: sessionRecords, error: sessionRecordsError } = await supabase
    .from("gps_records")
    .select(
      `
      id,
      session_id,
      player_name,
      normalized_name,
      position,
      is_goalkeeper,
      time_played,
      total_distance,
      hsr,
      distance_vrange6,
      sprints,
      num_acc,
      num_dec
    `,
    )
    .eq("session_id", sessionId);

  if (sessionRecordsError) {
    throw new Error(
      `No se han podido leer los registros de la sesión seleccionada: ${sessionRecordsError.message}`,
    );
  }

  const records = (sessionRecords ?? []) as GpsRecordForReference[];

  const enrichedRecords = enrichGpsRecordsWithReferences(
    records,
    referenceModel,
  );

  for (const record of enrichedRecords) {
    const { error: updateError } = await supabase
      .from("gps_records")
      .update({
        reference_total_distance: record.reference_total_distance,
        reference_hsr: record.reference_hsr,
        reference_distance_vrange6: record.reference_distance_vrange6,
        reference_sprints: record.reference_sprints,
        reference_num_acc: record.reference_num_acc,
        reference_num_dec: record.reference_num_dec,

        pct_total_distance: record.pct_total_distance,
        pct_hsr: record.pct_hsr,
        pct_distance_vrange6: record.pct_distance_vrange6,
        pct_sprints: record.pct_sprints,
        pct_num_acc: record.pct_num_acc,
        pct_num_dec: record.pct_num_dec,

        reference_source: record.reference_source,
        reference_valid_matches: record.reference_valid_matches,
        reference_last_match_date: record.reference_last_match_date,
        reference_updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (updateError) {
      throw new Error(
        `No se ha podido actualizar la referencia GPS de ${record.player_name ?? record.normalized_name ?? "un jugador"}: ${updateError.message}`,
      );
    }
  }

  return {
    updatedRecords: enrichedRecords.length,
  };
}