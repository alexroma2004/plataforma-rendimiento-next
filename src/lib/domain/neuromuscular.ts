export const NEUROMUSCULAR_METRICS = ["CMJ", "RSIMOD", "VMP"] as const;

export type NeuromuscularMetric = (typeof NEUROMUSCULAR_METRICS)[number];

export const NEUROMUSCULAR_MOMENTS = ["PRE", "POST"] as const;

export type NeuromuscularMoment = (typeof NEUROMUSCULAR_MOMENTS)[number];

export const NEUROMUSCULAR_MICROCYCLES = [
  "MD+1",
  "MD+2",
  "MD-4",
  "MD-3",
  "MD-2",
  "MD-1",
] as const;

export type NeuromuscularMicrocycle =
  (typeof NEUROMUSCULAR_MICROCYCLES)[number];

export const BASELINE_EXCLUDED_MICROCYCLES = ["MD+1", "MD+2"] as const;

export const BASELINE_CANDIDATE_MICROCYCLES = [
  "MD-4",
  "MD-3",
  "MD-2",
  "MD-1",
] as const;

export type NeuromuscularMetricColumn =
  | "cmj_pre"
  | "cmj_post"
  | "rsimod_pre"
  | "rsimod_post"
  | "vmp_pre"
  | "vmp_post";

export type NeuromuscularMetricDefinition = {
  id: NeuromuscularMetric;
  label: string;
  preColumn: NeuromuscularMetricColumn;
  postColumn: NeuromuscularMetricColumn;
  unit: "cm" | "ratio" | "m/s";
  favorableDirection: "higher";
  suggestedDecimals: number;
};

export const NEUROMUSCULAR_METRIC_DEFINITIONS: Record<
  NeuromuscularMetric,
  NeuromuscularMetricDefinition
> = {
  CMJ: {
    id: "CMJ",
    label: "CMJ",
    preColumn: "cmj_pre",
    postColumn: "cmj_post",
    unit: "cm",
    favorableDirection: "higher",
    suggestedDecimals: 1,
  },
  RSIMOD: {
    id: "RSIMOD",
    label: "RSI modificado",
    preColumn: "rsimod_pre",
    postColumn: "rsimod_post",
    unit: "ratio",
    favorableDirection: "higher",
    suggestedDecimals: 2,
  },
  VMP: {
    id: "VMP",
    label: "VMP",
    preColumn: "vmp_pre",
    postColumn: "vmp_post",
    unit: "m/s",
    favorableDirection: "higher",
    suggestedDecimals: 2,
  },
};

export type NeuromuscularMetricRecord = {
  cmj_pre?: unknown;
  cmj_post?: unknown;
  rsimod_pre?: unknown;
  rsimod_post?: unknown;
  vmp_pre?: unknown;
  vmp_post?: unknown;
};

export type NeuromuscularHistoryRecord = NeuromuscularMetricRecord & {
  id: string;
  session_id: string;
  team_id: string | null;
  player_id: string | null;
  session_date: string;
  microcycle: string;
};

export type NeuromuscularHistoryPoint = {
  recordId: string;
  sessionId: string;
  teamId: string;
  playerId: string;
  sessionDate: string;
  microcycle: NeuromuscularMicrocycle | string;
  metric: NeuromuscularMetric;
  moment: NeuromuscularMoment;
  value: number;
  unit: NeuromuscularMetricDefinition["unit"];
};

const METRIC_ORDER = new Map<NeuromuscularMetric, number>(
  NEUROMUSCULAR_METRICS.map((metric, index) => [metric, index]),
);

const MICROCYCLE_ORDER = new Map<NeuromuscularMicrocycle, number>(
  NEUROMUSCULAR_MICROCYCLES.map((microcycle, index) => [microcycle, index]),
);

const STRICT_NUMERIC_STRING = /^[+-]?\d+(?:\.\d+)?$/;

export function normalizeNeuromuscularMetric(
  input: string | null | undefined,
): NeuromuscularMetric | null {
  const normalized = String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "");

  if (normalized === "CMJ") return "CMJ";
  if (
    normalized === "RSI" ||
    normalized === "RSIMOD" ||
    normalized === "RSIMODIFICADO"
  ) {
    return "RSIMOD";
  }
  if (normalized === "VMP" || normalized === "VELOCIDADMEDIAPROPULSIVA") {
    return "VMP";
  }

  return null;
}

export function normalizeNeuromuscularMicrocycle(
  input: string | null | undefined,
): NeuromuscularMicrocycle | null {
  const normalized = String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "");

  if (normalized === "MD+1") return "MD+1";
  if (normalized === "MD+2") return "MD+2";
  if (normalized === "MD4") return "MD-4";
  if (normalized === "MD3") return "MD-3";
  if (normalized === "MD2") return "MD-2";
  if (normalized === "MD1") return "MD-1";

  return null;
}

export function getNeuromuscularMetricColumn(
  metric: NeuromuscularMetric,
  moment: NeuromuscularMoment,
): NeuromuscularMetricColumn {
  const definition = NEUROMUSCULAR_METRIC_DEFINITIONS[metric];
  return moment === "PRE" ? definition.preColumn : definition.postColumn;
}

export function isFiniteNeuromuscularValue(value: unknown): value is number {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value !== "string") return false;

  const normalized = value.trim();

  if (!STRICT_NUMERIC_STRING.test(normalized)) return false;

  return Number.isFinite(Number(normalized));
}

export function getNeuromuscularMetricValue(
  record: NeuromuscularMetricRecord,
  metric: NeuromuscularMetric,
  moment: NeuromuscularMoment,
): number | null {
  const value = record[getNeuromuscularMetricColumn(metric, moment)];

  return isFiniteNeuromuscularValue(value) ? Number(value) : null;
}

export function isIsoDate(value: string | null | undefined): boolean {
  const text = String(value ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;

  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getMicrocycleSortOrder(value: string): number {
  const normalized = normalizeNeuromuscularMicrocycle(value);

  return normalized === null
    ? Number.MAX_SAFE_INTEGER
    : (MICROCYCLE_ORDER.get(normalized) ?? Number.MAX_SAFE_INTEGER);
}

export function createNeuromuscularHistoryPoints(
  records: readonly NeuromuscularHistoryRecord[],
  options: {
    metric?: NeuromuscularMetric;
    moment?: NeuromuscularMoment;
  } = {},
): NeuromuscularHistoryPoint[] {
  const moment = options.moment ?? "PRE";
  const metrics = options.metric ? [options.metric] : NEUROMUSCULAR_METRICS;
  const points: NeuromuscularHistoryPoint[] = [];

  records.forEach((record) => {
    if (!record.team_id || !record.player_id || !isIsoDate(record.session_date)) {
      return;
    }

    const teamId = record.team_id;
    const playerId = record.player_id;

    metrics.forEach((metric) => {
      const value = getNeuromuscularMetricValue(record, metric, moment);

      if (value === null) return;

      const definition = NEUROMUSCULAR_METRIC_DEFINITIONS[metric];

      points.push({
        recordId: record.id,
        sessionId: record.session_id,
        teamId,
        playerId,
        sessionDate: record.session_date,
        microcycle:
          normalizeNeuromuscularMicrocycle(record.microcycle) ?? record.microcycle,
        metric,
        moment,
        value,
        unit: definition.unit,
      });
    });
  });

  return points.sort((first, second) => {
    const dateOrder = first.sessionDate.localeCompare(second.sessionDate);

    if (dateOrder !== 0) return dateOrder;

    const microcycleOrder =
      getMicrocycleSortOrder(String(first.microcycle)) -
      getMicrocycleSortOrder(String(second.microcycle));

    if (microcycleOrder !== 0) return microcycleOrder;

    const sessionOrder = first.sessionId.localeCompare(second.sessionId);

    if (sessionOrder !== 0) return sessionOrder;

    const recordOrder = first.recordId.localeCompare(second.recordId);

    if (recordOrder !== 0) return recordOrder;

    return (
      (METRIC_ORDER.get(first.metric) ?? Number.MAX_SAFE_INTEGER) -
      (METRIC_ORDER.get(second.metric) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}
