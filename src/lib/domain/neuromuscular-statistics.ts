import type {
  NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";
import { normalizeNeuromuscularMicrocycle } from "@/lib/domain/neuromuscular";
import type { NeuromuscularBaselineOptions } from "@/lib/domain/neuromuscular-baseline";
import {
  calculateNeuromuscularComparisons,
  type NeuromuscularComparisonPoint,
  type NeuromuscularComparisonSeries,
} from "@/lib/domain/neuromuscular-comparison";
import type { NeuromuscularHistoryPoint } from "@/lib/domain/neuromuscular";

export const NEUROMUSCULAR_MA3_WINDOW_SIZE = 3;

export type NeuromuscularMa3UnavailableReason =
  | "INSUFFICIENT_MA3_POINTS"
  | "POST_NOT_ALLOWED"
  | "INVALID_VALUE"
  | "EXCLUDED_MICROCYCLE"
  | "UNKNOWN_MICROCYCLE";

export type NeuromuscularZScoreUnavailableReason =
  | "COMPARISON_UNAVAILABLE"
  | "INSUFFICIENT_BASELINE_VALUES"
  | "ZERO_BASELINE_STANDARD_DEVIATION"
  | "INVALID_BASELINE_STANDARD_DEVIATION";

export interface NeuromuscularStatisticalPoint {
  comparison: NeuromuscularComparisonPoint;
  ma3Eligible: boolean;
  ma3UnavailableReason: NeuromuscularMa3UnavailableReason | null;
  ma3Values: number[];
  ma3: number | null;
  baselineReferenceValues: number[];
  baselineReferenceCount: number;
  baselineReferenceMean: number | null;
  baselineSampleStandardDeviation: number | null;
  zScoreAvailable: boolean;
  zScoreUnavailableReason: NeuromuscularZScoreUnavailableReason | null;
  zScore: number | null;
}

export interface NeuromuscularStatisticalSeries {
  teamId: string;
  playerId: string;
  metric: NeuromuscularMetric;
  moment: "PRE";
  comparisonSeries: NeuromuscularComparisonSeries;
  points: NeuromuscularStatisticalPoint[];
  ma3AvailablePoints: NeuromuscularStatisticalPoint[];
  zScoreAvailablePoints: NeuromuscularStatisticalPoint[];
  latestMa3Point: NeuromuscularStatisticalPoint | null;
  latestZScorePoint: NeuromuscularStatisticalPoint | null;
}

type Ma3Eligibility =
  | { eligible: true; unavailableReason: null }
  | {
      eligible: false;
      unavailableReason: NeuromuscularMa3UnavailableReason;
    };

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getMa3Eligibility(
  comparison: NeuromuscularComparisonPoint,
): Ma3Eligibility {
  const { point } = comparison;

  if (point.moment === "POST") {
    return { eligible: false, unavailableReason: "POST_NOT_ALLOWED" };
  }

  if (!isFinitePositiveNumber(point.value)) {
    return { eligible: false, unavailableReason: "INVALID_VALUE" };
  }

  const microcycle = normalizeNeuromuscularMicrocycle(String(point.microcycle));

  if (microcycle === "MD+1" || microcycle === "MD+2") {
    return { eligible: false, unavailableReason: "EXCLUDED_MICROCYCLE" };
  }

  if (microcycle === null) {
    return { eligible: false, unavailableReason: "UNKNOWN_MICROCYCLE" };
  }

  return { eligible: true, unavailableReason: null };
}

function getValidValues(values: readonly number[]): number[] {
  return values.filter(isFinitePositiveNumber);
}

export function calculateNeuromuscularMean(
  values: readonly number[],
): number | null {
  const validValues = getValidValues(values);

  if (validValues.length === 0) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

export function calculateNeuromuscularSampleStandardDeviation(
  values: readonly number[],
): number | null {
  const validValues = getValidValues(values);

  if (validValues.length < 2) return null;

  const mean = calculateNeuromuscularMean(validValues);

  if (mean === null) return null;

  const squaredDifferences = validValues.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0,
  );

  return Math.sqrt(squaredDifferences / (validValues.length - 1));
}

export function calculateNeuromuscularZScore(
  value: number,
  referenceMean: number,
  referenceStandardDeviation: number,
): number | null {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(referenceMean) ||
    !Number.isFinite(referenceStandardDeviation) ||
    referenceStandardDeviation <= 0
  ) {
    return null;
  }

  return (value - referenceMean) / referenceStandardDeviation;
}

export function calculateNeuromuscularMa3(
  values: readonly number[],
): number | null {
  const lastThreeValidValues = getValidValues(values).slice(
    -NEUROMUSCULAR_MA3_WINDOW_SIZE,
  );

  if (lastThreeValidValues.length < NEUROMUSCULAR_MA3_WINDOW_SIZE) {
    return null;
  }

  return calculateNeuromuscularMean(lastThreeValidValues);
}

export function calculateNeuromuscularStatisticalPoint(
  comparison: NeuromuscularComparisonPoint,
  ma3ValuesIncludingCurrent: readonly number[],
  ma3UnavailableReason: NeuromuscularMa3UnavailableReason | null,
): NeuromuscularStatisticalPoint {
  const ma3Values = [...ma3ValuesIncludingCurrent];
  const baselineReferenceValues = [...comparison.baselineWindowValues];
  const validBaselineReferenceValues = getValidValues(baselineReferenceValues);
  const baselineReferenceMean = calculateNeuromuscularMean(
    baselineReferenceValues,
  );
  const baselineSampleStandardDeviation =
    calculateNeuromuscularSampleStandardDeviation(baselineReferenceValues);
  const ma3 = calculateNeuromuscularMa3(ma3Values);

  let zScoreUnavailableReason: NeuromuscularZScoreUnavailableReason | null =
    null;
  let zScore: number | null = null;

  if (!comparison.comparisonAvailable) {
    zScoreUnavailableReason = "COMPARISON_UNAVAILABLE";
  } else if (validBaselineReferenceValues.length < 2) {
    zScoreUnavailableReason = "INSUFFICIENT_BASELINE_VALUES";
  } else if (baselineSampleStandardDeviation === 0) {
    zScoreUnavailableReason = "ZERO_BASELINE_STANDARD_DEVIATION";
  } else if (
    baselineReferenceMean === null ||
    baselineSampleStandardDeviation === null ||
    !Number.isFinite(baselineSampleStandardDeviation) ||
    baselineSampleStandardDeviation <= 0
  ) {
    zScoreUnavailableReason = "INVALID_BASELINE_STANDARD_DEVIATION";
  } else {
    zScore = calculateNeuromuscularZScore(
      comparison.point.value,
      baselineReferenceMean,
      baselineSampleStandardDeviation,
    );

    if (zScore === null || !Number.isFinite(zScore)) {
      zScore = null;
      zScoreUnavailableReason = "INVALID_BASELINE_STANDARD_DEVIATION";
    }
  }

  return {
    comparison,
    ma3Eligible: ma3UnavailableReason === null,
    ma3UnavailableReason:
      ma3 === null && ma3UnavailableReason === null
        ? "INSUFFICIENT_MA3_POINTS"
        : ma3UnavailableReason,
    ma3Values,
    ma3,
    baselineReferenceValues,
    baselineReferenceCount: baselineReferenceValues.length,
    baselineReferenceMean,
    baselineSampleStandardDeviation,
    zScoreAvailable: zScore !== null,
    zScoreUnavailableReason,
    zScore,
  };
}

export function calculateNeuromuscularStatisticalSeries(
  comparisonSeries: NeuromuscularComparisonSeries,
): NeuromuscularStatisticalSeries {
  let ma3Buffer: number[] = [];

  const points = comparisonSeries.comparisons.map((comparison) => {
    const eligibility = getMa3Eligibility(comparison);

    if (eligibility.eligible) {
      ma3Buffer = [...ma3Buffer, comparison.point.value].slice(
        -NEUROMUSCULAR_MA3_WINDOW_SIZE,
      );
    }

    return calculateNeuromuscularStatisticalPoint(
      comparison,
      ma3Buffer,
      eligibility.unavailableReason,
    );
  });
  const ma3AvailablePoints = points.filter((point) => point.ma3 !== null);
  const zScoreAvailablePoints = points.filter((point) => point.zScoreAvailable);

  return {
    teamId: comparisonSeries.teamId,
    playerId: comparisonSeries.playerId,
    metric: comparisonSeries.metric,
    moment: "PRE",
    comparisonSeries,
    points,
    ma3AvailablePoints,
    zScoreAvailablePoints,
    latestMa3Point: ma3AvailablePoints[ma3AvailablePoints.length - 1] ?? null,
    latestZScorePoint:
      zScoreAvailablePoints[zScoreAvailablePoints.length - 1] ?? null,
  };
}

export function calculateNeuromuscularStatistics(
  points: readonly NeuromuscularHistoryPoint[],
  options?: Partial<NeuromuscularBaselineOptions>,
): NeuromuscularStatisticalSeries[] {
  return calculateNeuromuscularComparisons(points, options).map(
    calculateNeuromuscularStatisticalSeries,
  );
}
