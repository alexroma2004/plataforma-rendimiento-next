import {
  BASELINE_CANDIDATE_MICROCYCLES,
  BASELINE_EXCLUDED_MICROCYCLES,
  isIsoDate,
  NEUROMUSCULAR_METRICS,
  NEUROMUSCULAR_MICROCYCLES,
  normalizeNeuromuscularMicrocycle,
  type NeuromuscularHistoryPoint,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";

export interface NeuromuscularBaselineOptions {
  seedPointCount: number;
  movingWindowSize: number;
  candidateMinimumChangePct: number;
}

export const DEFAULT_NEUROMUSCULAR_BASELINE_OPTIONS = {
  seedPointCount: 3,
  movingWindowSize: 5,
  candidateMinimumChangePct: -5,
} as const;

export type NeuromuscularBaselineDecisionReason =
  | "SEED_MD1"
  | "INCLUDED_MD1"
  | "INCLUDED_CANDIDATE"
  | "INSUFFICIENT_SEED"
  | "EXCLUDED_MICROCYCLE"
  | "UNKNOWN_MICROCYCLE"
  | "POST_NOT_ALLOWED"
  | "INVALID_VALUE"
  | "BELOW_CANDIDATE_THRESHOLD";

export interface NeuromuscularBaselineDecision {
  point: NeuromuscularHistoryPoint;
  eligible: boolean;
  included: boolean;
  reason: NeuromuscularBaselineDecisionReason;
  baselineBefore: number | null;
  percentChangeBefore: number | null;
  baselineAfter: number | null;
  includedValuesCount: number;
  windowValuesAfter: number[];
}

export interface NeuromuscularBaselineSeries {
  teamId: string;
  playerId: string;
  metric: NeuromuscularMetric;
  moment: "PRE";
  options: NeuromuscularBaselineOptions;
  decisions: NeuromuscularBaselineDecision[];
  includedPoints: NeuromuscularHistoryPoint[];
  finalWindowValues: number[];
  finalBaseline: number | null;
  hasSufficientBaseline: boolean;
}

const METRIC_ORDER = new Map<NeuromuscularMetric, number>(
  NEUROMUSCULAR_METRICS.map((metric, index) => [metric, index]),
);

const MICROCYCLE_ORDER = new Map(
  NEUROMUSCULAR_MICROCYCLES.map((microcycle, index) => [microcycle, index]),
);

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isKnownMetric(value: unknown): value is NeuromuscularMetric {
  return NEUROMUSCULAR_METRICS.includes(value as NeuromuscularMetric);
}

function getMicrocycleOrder(value: string): number {
  const normalized = normalizeNeuromuscularMicrocycle(value);

  return normalized === null
    ? Number.MAX_SAFE_INTEGER
    : (MICROCYCLE_ORDER.get(normalized) ?? Number.MAX_SAFE_INTEGER);
}

function getBaselineBefore(
  includedValues: readonly number[],
  options: NeuromuscularBaselineOptions,
): number | null {
  if (includedValues.length < options.seedPointCount) return null;

  return calculateNeuromuscularBaselineMean(
    includedValues.slice(-options.movingWindowSize),
  );
}

function validateOptions(
  options: NeuromuscularBaselineOptions,
): NeuromuscularBaselineOptions {
  if (!Number.isInteger(options.seedPointCount) || options.seedPointCount <= 0) {
    throw new Error("seedPointCount debe ser un entero mayor que 0.");
  }

  if (
    !Number.isInteger(options.movingWindowSize) ||
    options.movingWindowSize <= 0
  ) {
    throw new Error("movingWindowSize debe ser un entero mayor que 0.");
  }

  if (options.movingWindowSize < options.seedPointCount) {
    throw new Error("movingWindowSize debe ser mayor o igual que seedPointCount.");
  }

  if (!Number.isFinite(options.candidateMinimumChangePct)) {
    throw new Error("candidateMinimumChangePct debe ser un número finito.");
  }

  return { ...options };
}

function resolveOptions(
  options: Partial<NeuromuscularBaselineOptions> | undefined,
): NeuromuscularBaselineOptions {
  return validateOptions({
    ...DEFAULT_NEUROMUSCULAR_BASELINE_OPTIONS,
    ...options,
  });
}

function createEmptySeries(
  options: NeuromuscularBaselineOptions,
): NeuromuscularBaselineSeries {
  // La serie vacía no tiene identidad real; CMJ solo satisface el tipo canónico.
  return {
    teamId: "",
    playerId: "",
    metric: "CMJ",
    moment: "PRE",
    options,
    decisions: [],
    includedPoints: [],
    finalWindowValues: [],
    finalBaseline: null,
    hasSufficientBaseline: false,
  };
}

function sortPoints(
  points: readonly NeuromuscularHistoryPoint[],
): NeuromuscularHistoryPoint[] {
  return [...points].sort((first, second) => {
    const dateOrder = first.sessionDate.localeCompare(second.sessionDate);

    if (dateOrder !== 0) return dateOrder;

    const microcycleOrder =
      getMicrocycleOrder(String(first.microcycle)) -
      getMicrocycleOrder(String(second.microcycle));

    if (microcycleOrder !== 0) return microcycleOrder;

    const sessionOrder = first.sessionId.localeCompare(second.sessionId);

    if (sessionOrder !== 0) return sessionOrder;

    return first.recordId.localeCompare(second.recordId);
  });
}

function validateSeriesIdentity(
  points: readonly NeuromuscularHistoryPoint[],
): { teamId: string; playerId: string; metric: NeuromuscularMetric } {
  const [firstPoint] = points;

  if (!firstPoint) {
    throw new Error("No hay puntos para validar la identidad de la serie.");
  }

  if (
    !firstPoint.teamId ||
    !firstPoint.playerId ||
    !isKnownMetric(firstPoint.metric)
  ) {
    throw new Error("Los puntos deben incluir equipo, jugador y métrica canónica.");
  }

  const identity = {
    teamId: firstPoint.teamId,
    playerId: firstPoint.playerId,
    metric: firstPoint.metric,
  };

  points.forEach((point) => {
    if (
      point.teamId !== identity.teamId ||
      point.playerId !== identity.playerId ||
      point.metric !== identity.metric
    ) {
      throw new Error(
        "Una serie de baseline no puede mezclar equipo, jugador o métrica.",
      );
    }
  });

  return identity;
}

function createDecision(
  point: NeuromuscularHistoryPoint,
  reason: NeuromuscularBaselineDecisionReason,
  eligible: boolean,
  included: boolean,
  baselineBefore: number | null,
  percentChangeBefore: number | null,
  includedValues: readonly number[],
  options: NeuromuscularBaselineOptions,
): NeuromuscularBaselineDecision {
  const baselineAfter = getBaselineBefore(includedValues, options);

  return {
    point,
    eligible,
    included,
    reason,
    baselineBefore,
    percentChangeBefore,
    baselineAfter,
    includedValuesCount: includedValues.length,
    windowValuesAfter: includedValues.slice(-options.movingWindowSize),
  };
}

export function calculateNeuromuscularPercentChange(
  value: number,
  baseline: number,
): number | null {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(baseline) ||
    baseline <= 0
  ) {
    return null;
  }

  return ((value - baseline) / baseline) * 100;
}

export function calculateNeuromuscularBaselineMean(
  values: readonly number[],
): number | null {
  const validValues = values.filter(isFinitePositiveNumber);

  if (validValues.length === 0) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

export function calculateNeuromuscularBaselineSeries(
  points: readonly NeuromuscularHistoryPoint[],
  partialOptions?: Partial<NeuromuscularBaselineOptions>,
): NeuromuscularBaselineSeries {
  const options = resolveOptions(partialOptions);

  if (points.length === 0) {
    return createEmptySeries(options);
  }

  const identity = validateSeriesIdentity(points);
  const includedValues: number[] = [];
  const includedPoints: NeuromuscularHistoryPoint[] = [];
  const decisions: NeuromuscularBaselineDecision[] = [];

  sortPoints(points).forEach((point) => {
    const baselineBefore = getBaselineBefore(includedValues, options);
    const normalizedMicrocycle = normalizeNeuromuscularMicrocycle(
      String(point.microcycle),
    );

    if (point.moment !== "PRE") {
      decisions.push(
        createDecision(
          point,
          "POST_NOT_ALLOWED",
          false,
          false,
          baselineBefore,
          null,
          includedValues,
          options,
        ),
      );
      return;
    }

    if (!isFinitePositiveNumber(point.value) || !isIsoDate(point.sessionDate)) {
      decisions.push(
        createDecision(
          point,
          "INVALID_VALUE",
          false,
          false,
          baselineBefore,
          null,
          includedValues,
          options,
        ),
      );
      return;
    }

    if (normalizedMicrocycle === null) {
      decisions.push(
        createDecision(
          point,
          "UNKNOWN_MICROCYCLE",
          false,
          false,
          baselineBefore,
          null,
          includedValues,
          options,
        ),
      );
      return;
    }

    if (
      BASELINE_EXCLUDED_MICROCYCLES.includes(
        normalizedMicrocycle as (typeof BASELINE_EXCLUDED_MICROCYCLES)[number],
      )
    ) {
      decisions.push(
        createDecision(
          point,
          "EXCLUDED_MICROCYCLE",
          false,
          false,
          baselineBefore,
          null,
          includedValues,
          options,
        ),
      );
      return;
    }

    if (includedValues.length < options.seedPointCount) {
      if (normalizedMicrocycle !== "MD-1") {
        decisions.push(
          createDecision(
            point,
            "INSUFFICIENT_SEED",
            false,
            false,
            baselineBefore,
            null,
            includedValues,
            options,
          ),
        );
        return;
      }

      includedValues.push(point.value);
      includedPoints.push(point);
      decisions.push(
        createDecision(
          point,
          "SEED_MD1",
          true,
          true,
          baselineBefore,
          null,
          includedValues,
          options,
        ),
      );
      return;
    }

    const percentChangeBefore = calculateNeuromuscularPercentChange(
      point.value,
      baselineBefore ?? Number.NaN,
    );

    if (normalizedMicrocycle === "MD-1") {
      includedValues.push(point.value);
      includedPoints.push(point);
      decisions.push(
        createDecision(
          point,
          "INCLUDED_MD1",
          true,
          true,
          baselineBefore,
          percentChangeBefore,
          includedValues,
          options,
        ),
      );
      return;
    }

    if (
      !BASELINE_CANDIDATE_MICROCYCLES.includes(
        normalizedMicrocycle as (typeof BASELINE_CANDIDATE_MICROCYCLES)[number],
      )
    ) {
      decisions.push(
        createDecision(
          point,
          "UNKNOWN_MICROCYCLE",
          false,
          false,
          baselineBefore,
          percentChangeBefore,
          includedValues,
          options,
        ),
      );
      return;
    }

    if (
      percentChangeBefore === null ||
      percentChangeBefore < options.candidateMinimumChangePct
    ) {
      decisions.push(
        createDecision(
          point,
          "BELOW_CANDIDATE_THRESHOLD",
          true,
          false,
          baselineBefore,
          percentChangeBefore,
          includedValues,
          options,
        ),
      );
      return;
    }

    includedValues.push(point.value);
    includedPoints.push(point);
    decisions.push(
      createDecision(
        point,
        "INCLUDED_CANDIDATE",
        true,
        true,
        baselineBefore,
        percentChangeBefore,
        includedValues,
        options,
      ),
    );
  });

  const finalBaseline = getBaselineBefore(includedValues, options);

  return {
    teamId: identity.teamId,
    playerId: identity.playerId,
    metric: identity.metric,
    moment: "PRE",
    options,
    decisions,
    includedPoints: [...includedPoints],
    finalWindowValues: includedValues.slice(-options.movingWindowSize),
    finalBaseline,
    hasSufficientBaseline: includedValues.length >= options.seedPointCount,
  };
}

export function calculateNeuromuscularBaselines(
  points: readonly NeuromuscularHistoryPoint[],
  partialOptions?: Partial<NeuromuscularBaselineOptions>,
): NeuromuscularBaselineSeries[] {
  const options = resolveOptions(partialOptions);
  const groups = new Map<string, NeuromuscularHistoryPoint[]>();

  points.forEach((point) => {
    const key = `${point.teamId}\u0000${point.playerId}\u0000${point.metric}`;
    const group = groups.get(key) ?? [];

    group.push(point);
    groups.set(key, group);
  });

  return Array.from(groups.values())
    .map((group) => calculateNeuromuscularBaselineSeries(group, options))
    .sort((first, second) => {
      const teamOrder = first.teamId.localeCompare(second.teamId);

      if (teamOrder !== 0) return teamOrder;

      const playerOrder = first.playerId.localeCompare(second.playerId);

      if (playerOrder !== 0) return playerOrder;

      return (
        (METRIC_ORDER.get(first.metric) ?? Number.MAX_SAFE_INTEGER) -
        (METRIC_ORDER.get(second.metric) ?? Number.MAX_SAFE_INTEGER)
      );
    });
}
