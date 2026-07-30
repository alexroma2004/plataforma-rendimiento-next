import {
  NEUROMUSCULAR_METRICS,
  NEUROMUSCULAR_MICROCYCLES,
  normalizeNeuromuscularMicrocycle,
  type NeuromuscularHistoryPoint,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";
import type { NeuromuscularBaselineOptions } from "@/lib/domain/neuromuscular-baseline";
import {
  calculateNeuromuscularLosses,
  type NeuromuscularLossLevel,
  type NeuromuscularLossPoint,
  type NeuromuscularLossScore,
  type NeuromuscularLossSeries,
  type NeuromuscularLossThresholds,
  type NeuromuscularLossUnavailableReason,
} from "@/lib/domain/neuromuscular-loss";

export type NeuromuscularMetricReadinessScore = 40 | 60 | 80 | 100;

export type NeuromuscularReadinessComponentUnavailableReason =
  | "MISSING_METRIC"
  | NeuromuscularLossUnavailableReason;

export interface NeuromuscularReadinessMetricComponent {
  metric: NeuromuscularMetric;
  lossPoint: NeuromuscularLossPoint | null;
  available: boolean;
  unavailableReason: NeuromuscularReadinessComponentUnavailableReason | null;
  lossScore: NeuromuscularLossScore | null;
  lossLevel: NeuromuscularLossLevel | null;
  metricReadinessScore: NeuromuscularMetricReadinessScore | null;
  weight: number;
}

export type NeuromuscularReadinessCoverage =
  | "FULL"
  | "PARTIAL"
  | "INSUFFICIENT";

export type NeuromuscularReadinessUnavailableReason =
  | "INSUFFICIENT_METRICS";

export type NeuromuscularReadinessLevel =
  | "NORMAL"
  | "ATTENTION"
  | "ALERT"
  | "CRITICAL";

export interface NeuromuscularReadinessThresholds {
  normalMinimum: number;
  attentionMinimum: number;
  alertMinimum: number;
}

export const DEFAULT_NEUROMUSCULAR_READINESS_THRESHOLDS = {
  normalMinimum: 85,
  attentionMinimum: 70,
  alertMinimum: 50,
} as const;

export interface NeuromuscularReadinessPoint {
  teamId: string;
  playerId: string;
  sessionId: string;
  recordId: string;
  sessionDate: string;
  microcycle: string;
  components: NeuromuscularReadinessMetricComponent[];
  availableMetrics: NeuromuscularMetric[];
  unavailableMetrics: NeuromuscularMetric[];
  missingMetrics: NeuromuscularMetric[];
  availableMetricCount: number;
  coverage: NeuromuscularReadinessCoverage;
  readinessAvailable: boolean;
  readinessUnavailableReason: NeuromuscularReadinessUnavailableReason | null;
  readinessScore: number | null;
  readinessLevel: NeuromuscularReadinessLevel | null;
}

export interface NeuromuscularReadinessSeries {
  teamId: string;
  playerId: string;
  points: NeuromuscularReadinessPoint[];
  availableReadinessPoints: NeuromuscularReadinessPoint[];
  latestAvailableReadinessPoint: NeuromuscularReadinessPoint | null;
  fullCoveragePoints: NeuromuscularReadinessPoint[];
  partialCoveragePoints: NeuromuscularReadinessPoint[];
  insufficientCoveragePoints: NeuromuscularReadinessPoint[];
}

const MICROCYCLE_ORDER = new Map(
  NEUROMUSCULAR_MICROCYCLES.map((microcycle, index) => [microcycle, index]),
);

function isFiniteReadinessScore(
  score: unknown,
): score is NeuromuscularMetricReadinessScore {
  return score === 40 || score === 60 || score === 80 || score === 100;
}

function isFiniteWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidThreshold(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function resolveReadinessThresholds(
  thresholds?: Partial<NeuromuscularReadinessThresholds>,
): NeuromuscularReadinessThresholds {
  return validateNeuromuscularReadinessThresholds({
    ...DEFAULT_NEUROMUSCULAR_READINESS_THRESHOLDS,
    ...thresholds,
  });
}

function getPointContext(lossPoint: NeuromuscularLossPoint) {
  const point = lossPoint.statisticalPoint.comparison.point;

  return {
    teamId: point.teamId,
    playerId: point.playerId,
    sessionId: point.sessionId,
    recordId: point.recordId,
    sessionDate: point.sessionDate,
    microcycle: String(point.microcycle),
  };
}

function getSnapshotKey(lossPoint: NeuromuscularLossPoint): string {
  const { teamId, playerId, sessionId, recordId } = getPointContext(lossPoint);

  return JSON.stringify([teamId, playerId, sessionId, recordId]);
}

function getPlayerKey(point: NeuromuscularReadinessPoint): string {
  return JSON.stringify([point.teamId, point.playerId]);
}

function getMicrocycleOrder(value: string): number {
  const microcycle = normalizeNeuromuscularMicrocycle(value);

  return microcycle === null
    ? Number.MAX_SAFE_INTEGER
    : (MICROCYCLE_ORDER.get(microcycle) ?? Number.MAX_SAFE_INTEGER);
}

function compareReadinessPoints(
  first: NeuromuscularReadinessPoint,
  second: NeuromuscularReadinessPoint,
): number {
  const dateOrder = first.sessionDate.localeCompare(second.sessionDate);

  if (dateOrder !== 0) return dateOrder;

  const microcycleOrder =
    getMicrocycleOrder(first.microcycle) - getMicrocycleOrder(second.microcycle);

  if (microcycleOrder !== 0) return microcycleOrder;

  const sessionOrder = first.sessionId.localeCompare(second.sessionId);

  if (sessionOrder !== 0) return sessionOrder;

  return first.recordId.localeCompare(second.recordId);
}

function getCoverage(availableMetricCount: number): NeuromuscularReadinessCoverage {
  if (availableMetricCount === NEUROMUSCULAR_METRICS.length) return "FULL";
  if (availableMetricCount === 2) return "PARTIAL";

  return "INSUFFICIENT";
}

function createMetricComponent(
  metric: NeuromuscularMetric,
  lossPoint: NeuromuscularLossPoint | null,
): NeuromuscularReadinessMetricComponent {
  if (lossPoint === null) {
    return {
      metric,
      lossPoint: null,
      available: false,
      unavailableReason: "MISSING_METRIC",
      lossScore: null,
      lossLevel: null,
      metricReadinessScore: null,
      weight: 1,
    };
  }

  if (!lossPoint.lossScoreAvailable || lossPoint.lossScore === null) {
    return {
      metric,
      lossPoint,
      available: false,
      unavailableReason:
        lossPoint.lossUnavailableReason ?? "INVALID_OBJECTIVE_LOSS",
      lossScore: null,
      lossLevel: null,
      metricReadinessScore: null,
      weight: 1,
    };
  }

  return {
    metric,
    lossPoint,
    available: true,
    unavailableReason: null,
    lossScore: lossPoint.lossScore,
    lossLevel: lossPoint.lossLevel,
    metricReadinessScore: calculateNeuromuscularMetricReadinessScore(
      lossPoint.lossScore,
    ),
    weight: 1,
  };
}

export function calculateNeuromuscularMetricReadinessScore(
  lossScore: NeuromuscularLossScore,
): NeuromuscularMetricReadinessScore {
  switch (lossScore) {
    case 0:
      return 100;
    case 1:
      return 80;
    case 2:
      return 60;
    case 3:
      return 40;
  }
}

export function calculateNeuromuscularCombinedReadiness(
  components: readonly NeuromuscularReadinessMetricComponent[],
): number | null {
  let availableComponentCount = 0;
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const component of components) {
    if (!component.available) continue;

    if (
      !isFiniteReadinessScore(component.metricReadinessScore) ||
      !isFiniteWeight(component.weight)
    ) {
      return null;
    }

    availableComponentCount += 1;
    weightedTotal += component.metricReadinessScore * component.weight;
    totalWeight += component.weight;
  }

  if (
    availableComponentCount < 2 ||
    !Number.isFinite(weightedTotal) ||
    !Number.isFinite(totalWeight) ||
    totalWeight <= 0
  ) {
    return null;
  }

  const readiness = weightedTotal / totalWeight;

  return Number.isFinite(readiness) && readiness >= 0 && readiness <= 100
    ? readiness
    : null;
}

export function validateNeuromuscularReadinessThresholds(
  thresholds: NeuromuscularReadinessThresholds,
): NeuromuscularReadinessThresholds {
  const { normalMinimum, attentionMinimum, alertMinimum } = thresholds;

  if (
    !isValidThreshold(normalMinimum) ||
    !isValidThreshold(attentionMinimum) ||
    !isValidThreshold(alertMinimum)
  ) {
    throw new Error(
      "Los umbrales de readiness deben ser finitos y estar entre 0 y 100.",
    );
  }

  if (
    alertMinimum >= attentionMinimum || attentionMinimum >= normalMinimum
  ) {
    throw new Error(
      "Los umbrales deben cumplir alertMinimum < attentionMinimum < normalMinimum.",
    );
  }

  return { ...thresholds };
}

export function getNeuromuscularReadinessLevel(
  readinessScore: number,
  thresholds?: Partial<NeuromuscularReadinessThresholds>,
): NeuromuscularReadinessLevel | null {
  const resolvedThresholds = resolveReadinessThresholds(thresholds);

  if (
    !Number.isFinite(readinessScore) ||
    readinessScore < 0 ||
    readinessScore > 100
  ) {
    return null;
  }

  if (readinessScore >= resolvedThresholds.normalMinimum) return "NORMAL";
  if (readinessScore >= resolvedThresholds.attentionMinimum) {
    return "ATTENTION";
  }
  if (readinessScore >= resolvedThresholds.alertMinimum) return "ALERT";

  return "CRITICAL";
}

export function calculateNeuromuscularReadinessPoint(
  lossPoints: readonly NeuromuscularLossPoint[],
  thresholds?: Partial<NeuromuscularReadinessThresholds>,
): NeuromuscularReadinessPoint {
  const resolvedThresholds = resolveReadinessThresholds(thresholds);
  const [firstLossPoint] = lossPoints;

  if (!firstLossPoint) {
    throw new Error("Un snapshot de readiness requiere al menos un punto.");
  }

  const context = getPointContext(firstLossPoint);
  const lossPointsByMetric = new Map<NeuromuscularMetric, NeuromuscularLossPoint>();

  lossPoints.forEach((lossPoint) => {
    const currentContext = getPointContext(lossPoint);

    if (
      currentContext.teamId !== context.teamId ||
      currentContext.playerId !== context.playerId ||
      currentContext.sessionId !== context.sessionId ||
      currentContext.recordId !== context.recordId ||
      currentContext.sessionDate !== context.sessionDate ||
      currentContext.microcycle !== context.microcycle
    ) {
      throw new Error(
        "Los puntos de readiness deben pertenecer al mismo equipo, jugador y registro neuromuscular.",
      );
    }

    const metric = lossPoint.statisticalPoint.comparison.point.metric;

    if (lossPointsByMetric.has(metric)) {
      throw new Error(
        "Un snapshot de readiness no puede contener métricas duplicadas.",
      );
    }

    lossPointsByMetric.set(metric, lossPoint);
  });

  const components = NEUROMUSCULAR_METRICS.map((metric) =>
    createMetricComponent(metric, lossPointsByMetric.get(metric) ?? null),
  );
  const availableMetrics = components
    .filter((component) => component.available)
    .map((component) => component.metric);
  const unavailableMetrics = components
    .filter((component) => !component.available)
    .map((component) => component.metric);
  const missingMetrics = components
    .filter((component) => component.lossPoint === null)
    .map((component) => component.metric);
  const availableMetricCount = availableMetrics.length;
  const coverage = getCoverage(availableMetricCount);
  const readinessScore = calculateNeuromuscularCombinedReadiness(components);
  const readinessAvailable = readinessScore !== null;

  return {
    ...context,
    components,
    availableMetrics,
    unavailableMetrics,
    missingMetrics,
    availableMetricCount,
    coverage,
    readinessAvailable,
    readinessUnavailableReason: readinessAvailable
      ? null
      : "INSUFFICIENT_METRICS",
    readinessScore,
    readinessLevel: readinessAvailable
      ? getNeuromuscularReadinessLevel(readinessScore, resolvedThresholds)
      : null,
  };
}

export function calculateNeuromuscularReadinessFromLossSeries(
  lossSeries: readonly NeuromuscularLossSeries[],
  thresholds?: Partial<NeuromuscularReadinessThresholds>,
): NeuromuscularReadinessSeries[] {
  const resolvedThresholds = resolveReadinessThresholds(thresholds);
  const snapshots = new Map<string, NeuromuscularLossPoint[]>();

  lossSeries.forEach((series) => {
    series.points.forEach((point) => {
      const key = getSnapshotKey(point);
      const snapshot = snapshots.get(key) ?? [];

      snapshot.push(point);
      snapshots.set(key, snapshot);
    });
  });

  const pointsByPlayer = new Map<string, NeuromuscularReadinessPoint[]>();

  snapshots.forEach((lossPoints) => {
    const readinessPoint = calculateNeuromuscularReadinessPoint(
      lossPoints,
      resolvedThresholds,
    );
    const playerKey = getPlayerKey(readinessPoint);
    const playerPoints = pointsByPlayer.get(playerKey) ?? [];

    playerPoints.push(readinessPoint);
    pointsByPlayer.set(playerKey, playerPoints);
  });

  return Array.from(pointsByPlayer.values())
    .map((points) => {
      const orderedPoints = [...points].sort(compareReadinessPoints);
      const availableReadinessPoints = orderedPoints.filter(
        (point) => point.readinessAvailable,
      );
      const fullCoveragePoints = orderedPoints.filter(
        (point) => point.coverage === "FULL",
      );
      const partialCoveragePoints = orderedPoints.filter(
        (point) => point.coverage === "PARTIAL",
      );
      const insufficientCoveragePoints = orderedPoints.filter(
        (point) => point.coverage === "INSUFFICIENT",
      );
      const [firstPoint] = orderedPoints;

      if (!firstPoint) {
        throw new Error("No se puede crear una serie de readiness vacía.");
      }

      return {
        teamId: firstPoint.teamId,
        playerId: firstPoint.playerId,
        points: orderedPoints,
        availableReadinessPoints,
        latestAvailableReadinessPoint:
          availableReadinessPoints[availableReadinessPoints.length - 1] ?? null,
        fullCoveragePoints,
        partialCoveragePoints,
        insufficientCoveragePoints,
      };
    })
    .sort((first, second) => {
      const teamOrder = first.teamId.localeCompare(second.teamId);

      if (teamOrder !== 0) return teamOrder;

      return first.playerId.localeCompare(second.playerId);
    });
}

export function calculateNeuromuscularReadiness(
  points: readonly NeuromuscularHistoryPoint[],
  baselineOptions?: Partial<NeuromuscularBaselineOptions>,
  lossThresholds?: Partial<NeuromuscularLossThresholds>,
  readinessThresholds?: Partial<NeuromuscularReadinessThresholds>,
): NeuromuscularReadinessSeries[] {
  const lossSeries = calculateNeuromuscularLosses(
    points,
    baselineOptions,
    lossThresholds,
  );

  return calculateNeuromuscularReadinessFromLossSeries(
    lossSeries,
    readinessThresholds,
  );
}
