import {
  normalizeNeuromuscularMicrocycle,
  type NeuromuscularHistoryPoint,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";
import type { NeuromuscularBaselineOptions } from "@/lib/domain/neuromuscular-baseline";
import type {
  NeuromuscularBaselineConfigurationEvent,
} from "@/lib/domain/neuromuscular-baseline-configuration";
import type { NeuromuscularStatisticalPoint, NeuromuscularStatisticalSeries } from "@/lib/domain/neuromuscular-statistics";
import { calculateNeuromuscularStatistics } from "@/lib/domain/neuromuscular-statistics";

export type NeuromuscularLossScore = 0 | 1 | 2 | 3;

export interface NeuromuscularLossThresholds {
  attentionLossPct: number;
  alertLossPct: number;
  criticalLossPct: number;
}

export const DEFAULT_NEUROMUSCULAR_LOSS_THRESHOLDS = {
  attentionLossPct: 2.5,
  alertLossPct: 5,
  criticalLossPct: 10,
} as const;

export type NeuromuscularLossLevel =
  | "NORMAL"
  | "ATTENTION"
  | "ALERT"
  | "CRITICAL";

export type NeuromuscularLossUnavailableReason =
  | "COMPARISON_UNAVAILABLE"
  | "POST_NOT_ALLOWED"
  | "INVALID_OBJECTIVE_LOSS"
  | "EXCLUDED_MICROCYCLE"
  | "UNKNOWN_MICROCYCLE";

type ScoredMicrocycle = "MD-4" | "MD-3" | "MD-2" | "MD-1";

export interface NeuromuscularLossPoint {
  statisticalPoint: NeuromuscularStatisticalPoint;
  lossScoreAvailable: boolean;
  lossUnavailableReason: NeuromuscularLossUnavailableReason | null;
  objectiveLossPct: number | null;
  lossScore: NeuromuscularLossScore | null;
  lossLevel: NeuromuscularLossLevel | null;
  scoredMicrocycle: ScoredMicrocycle | null;
}

export interface NeuromuscularLossSeries {
  teamId: string;
  playerId: string;
  metric: NeuromuscularMetric;
  moment: "PRE";
  thresholds: NeuromuscularLossThresholds;
  statisticalSeries: NeuromuscularStatisticalSeries;
  points: NeuromuscularLossPoint[];
  availableLossPoints: NeuromuscularLossPoint[];
  latestAvailableLossPoint: NeuromuscularLossPoint | null;
  maximumAvailableLossScore: NeuromuscularLossScore | null;
  maximumAvailableLossPoint: NeuromuscularLossPoint | null;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function resolveLossThresholds(
  thresholds?: Partial<NeuromuscularLossThresholds>,
): NeuromuscularLossThresholds {
  return validateNeuromuscularLossThresholds({
    ...DEFAULT_NEUROMUSCULAR_LOSS_THRESHOLDS,
    ...thresholds,
  });
}

function getScoredMicrocycle(
  value: string,
): ScoredMicrocycle | null {
  const microcycle = normalizeNeuromuscularMicrocycle(value);

  if (
    microcycle === "MD-4" ||
    microcycle === "MD-3" ||
    microcycle === "MD-2" ||
    microcycle === "MD-1"
  ) {
    return microcycle;
  }

  return null;
}

function getLossUnavailableReason(
  statisticalPoint: NeuromuscularStatisticalPoint,
): NeuromuscularLossUnavailableReason | null {
  const comparison = statisticalPoint.comparison;

  if (comparison.point.moment === "POST") return "POST_NOT_ALLOWED";

  if (!comparison.comparisonAvailable) return "COMPARISON_UNAVAILABLE";

  if (!isFiniteNonNegativeNumber(comparison.objectiveLossPct)) {
    return "INVALID_OBJECTIVE_LOSS";
  }

  const microcycle = normalizeNeuromuscularMicrocycle(
    String(comparison.point.microcycle),
  );

  if (microcycle === "MD+1" || microcycle === "MD+2") {
    return "EXCLUDED_MICROCYCLE";
  }

  if (microcycle === null) return "UNKNOWN_MICROCYCLE";

  return null;
}

export function validateNeuromuscularLossThresholds(
  thresholds: NeuromuscularLossThresholds,
): NeuromuscularLossThresholds {
  const {
    attentionLossPct,
    alertLossPct,
    criticalLossPct,
  } = thresholds;

  if (
    !isFiniteNonNegativeNumber(attentionLossPct) ||
    !isFiniteNonNegativeNumber(alertLossPct) ||
    !isFiniteNonNegativeNumber(criticalLossPct)
  ) {
    throw new Error("Los umbrales de pérdida deben ser finitos y no negativos.");
  }

  if (
    attentionLossPct >= alertLossPct ||
    alertLossPct >= criticalLossPct
  ) {
    throw new Error(
      "Los umbrales deben cumplir attentionLossPct < alertLossPct < criticalLossPct.",
    );
  }

  return { ...thresholds };
}

export function calculateNeuromuscularLossScore(
  objectiveLossPct: number,
  thresholds?: Partial<NeuromuscularLossThresholds>,
): NeuromuscularLossScore | null {
  const resolvedThresholds = resolveLossThresholds(thresholds);

  if (!isFiniteNonNegativeNumber(objectiveLossPct)) return null;

  if (objectiveLossPct >= resolvedThresholds.criticalLossPct) return 3;
  if (objectiveLossPct >= resolvedThresholds.alertLossPct) return 2;
  if (objectiveLossPct >= resolvedThresholds.attentionLossPct) return 1;

  return 0;
}

export function getNeuromuscularLossLevel(
  score: NeuromuscularLossScore,
): NeuromuscularLossLevel {
  switch (score) {
    case 0:
      return "NORMAL";
    case 1:
      return "ATTENTION";
    case 2:
      return "ALERT";
    case 3:
      return "CRITICAL";
  }
}

export function calculateNeuromuscularLossPoint(
  statisticalPoint: NeuromuscularStatisticalPoint,
  thresholds?: Partial<NeuromuscularLossThresholds>,
): NeuromuscularLossPoint {
  const resolvedThresholds = resolveLossThresholds(thresholds);
  const objectiveLossPct = statisticalPoint.comparison.objectiveLossPct;
  const unavailableReason = getLossUnavailableReason(statisticalPoint);

  if (unavailableReason !== null) {
    return {
      statisticalPoint,
      lossScoreAvailable: false,
      lossUnavailableReason: unavailableReason,
      objectiveLossPct,
      lossScore: null,
      lossLevel: null,
      scoredMicrocycle: null,
    };
  }

  if (!isFiniteNonNegativeNumber(objectiveLossPct)) {
    return {
      statisticalPoint,
      lossScoreAvailable: false,
      lossUnavailableReason: "INVALID_OBJECTIVE_LOSS",
      objectiveLossPct,
      lossScore: null,
      lossLevel: null,
      scoredMicrocycle: null,
    };
  }

  const lossScore = calculateNeuromuscularLossScore(
    objectiveLossPct,
    resolvedThresholds,
  );
  const scoredMicrocycle = getScoredMicrocycle(
    String(statisticalPoint.comparison.point.microcycle),
  );

  if (lossScore === null || scoredMicrocycle === null) {
    return {
      statisticalPoint,
      lossScoreAvailable: false,
      lossUnavailableReason: "INVALID_OBJECTIVE_LOSS",
      objectiveLossPct,
      lossScore: null,
      lossLevel: null,
      scoredMicrocycle: null,
    };
  }

  return {
    statisticalPoint,
    lossScoreAvailable: true,
    lossUnavailableReason: null,
    objectiveLossPct,
    lossScore,
    lossLevel: getNeuromuscularLossLevel(lossScore),
    scoredMicrocycle,
  };
}

export function calculateNeuromuscularLossSeries(
  statisticalSeries: NeuromuscularStatisticalSeries,
  thresholds?: Partial<NeuromuscularLossThresholds>,
): NeuromuscularLossSeries {
  const resolvedThresholds = resolveLossThresholds(thresholds);
  const points = statisticalSeries.points.map((point) =>
    calculateNeuromuscularLossPoint(point, resolvedThresholds),
  );
  const availableLossPoints = points.filter((point) => point.lossScoreAvailable);
  let maximumAvailableLossPoint: NeuromuscularLossPoint | null = null;

  for (const point of availableLossPoints) {
    if (point.lossScore === null) continue;

    if (
      maximumAvailableLossPoint === null ||
      point.lossScore >= maximumAvailableLossPoint.lossScore!
    ) {
      maximumAvailableLossPoint = point;
    }
  }

  return {
    teamId: statisticalSeries.teamId,
    playerId: statisticalSeries.playerId,
    metric: statisticalSeries.metric,
    moment: "PRE",
    thresholds: resolvedThresholds,
    statisticalSeries,
    points,
    availableLossPoints,
    latestAvailableLossPoint:
      availableLossPoints[availableLossPoints.length - 1] ?? null,
    maximumAvailableLossScore:
      maximumAvailableLossPoint === null
        ? null
        : maximumAvailableLossPoint.lossScore,
    maximumAvailableLossPoint,
  };
}

export function calculateNeuromuscularLosses(
  points: readonly NeuromuscularHistoryPoint[],
  baselineOptions?: Partial<NeuromuscularBaselineOptions>,
  thresholds?: Partial<NeuromuscularLossThresholds>,
  baselineConfigurationEvents: readonly NeuromuscularBaselineConfigurationEvent[] = [],
): NeuromuscularLossSeries[] {
  return calculateNeuromuscularStatistics(
    points,
    baselineOptions,
    baselineConfigurationEvents,
  ).map((series) => calculateNeuromuscularLossSeries(series, thresholds));
}
