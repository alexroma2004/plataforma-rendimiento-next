import type { GpsRecordRow } from "@/lib/supabase/gps";
import {
  GPS_MATCH_REFERENCE,
  type GpsMatchReference,
  type GpsObjectiveMetricKey,
} from "@/lib/gps/objectives";

const GPS_REFERENCE_METRICS: GpsObjectiveMetricKey[] = [
  "total_distance",
  "hsr",
  "distance_vrange6",
  "sprints",
  "num_acc",
  "num_dec",
];

export type GpsMatchReferenceSource = "dynamic" | "fallback";

export type GpsMatchReferenceResult = {
  source: GpsMatchReferenceSource;
  values: GpsMatchReference;
  validMatchSessions: number;
  validRecords: number;
  minimumMatchesRequired: number;
  reason: string;
};

function getRecordSessionId(row: GpsRecordRow): string | null {
  const value = (row as { session_id?: string | null }).session_id;
  return value ?? null;
}

function getAverageMetric(
  records: GpsRecordRow[],
  metric: GpsObjectiveMetricKey,
): number {
  const values = records
    .map((row) => Number(row[metric] ?? 0))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return GPS_MATCH_REFERENCE[metric];
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return total / values.length;
}

export function buildGpsMatchReference(
  matchRecords: GpsRecordRow[],
  minimumMatchesRequired = 5,
): GpsMatchReferenceResult {
  const validRecords = matchRecords.filter((row) => {
    const isGoalkeeper = row.is_goalkeeper === true;
    const minutes = Number(row.time_played ?? 0);

    return !isGoalkeeper && minutes >= 80;
  });

  const validMatchSessions = new Set(
    validRecords.map(getRecordSessionId).filter(Boolean),
  ).size;

  if (
    validMatchSessions < minimumMatchesRequired ||
    validRecords.length === 0
  ) {
    return {
      source: "fallback",
      values: GPS_MATCH_REFERENCE,
      validMatchSessions,
      validRecords: validRecords.length,
      minimumMatchesRequired,
      reason:
        "Todavía no hay suficientes partidos válidos guardados. Se está usando la referencia fija de partido.",
    };
  }

  const dynamicReference = GPS_REFERENCE_METRICS.reduce((acc, metric) => {
    acc[metric] = getAverageMetric(validRecords, metric);
    return acc;
  }, {} as GpsMatchReference);

  return {
    source: "dynamic",
    values: dynamicReference,
    validMatchSessions,
    validRecords: validRecords.length,
    minimumMatchesRequired,
    reason:
      "La referencia se ha calculado automáticamente a partir de los partidos guardados en Supabase.",
  };
}