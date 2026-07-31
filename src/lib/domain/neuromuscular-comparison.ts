import {
  calculateNeuromuscularBaselines,
  calculateNeuromuscularPercentChange,
  type NeuromuscularBaselineDecision,
  type NeuromuscularBaselineDecisionReason,
  type NeuromuscularBaselineOptions,
  type NeuromuscularBaselineSeries,
} from "@/lib/domain/neuromuscular-baseline";
import {
  resolveEffectiveNeuromuscularBaseline,
} from "@/lib/domain/neuromuscular-baseline-configuration";
import type {
  EffectiveNeuromuscularBaselineSource,
  NeuromuscularBaselineConfigurationEvent,
} from "@/lib/domain/neuromuscular-baseline-configuration";
import type {
  NeuromuscularHistoryPoint,
  NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";

export type NeuromuscularComparisonUnavailableReason =
  | "NO_BASELINE_BEFORE"
  | "POST_NOT_ALLOWED"
  | "INVALID_VALUE"
  | "INVALID_BASELINE";

export type NeuromuscularComparisonAvailability =
  | {
      available: true;
      unavailableReason: null;
    }
  | {
      available: false;
      unavailableReason: NeuromuscularComparisonUnavailableReason;
    };

export interface NeuromuscularComparisonPoint {
  point: NeuromuscularHistoryPoint;
  baselineDecisionReason: NeuromuscularBaselineDecisionReason;
  eligibleForBaseline: boolean;
  includedInBaseline: boolean;
  comparisonAvailable: boolean;
  unavailableReason: NeuromuscularComparisonUnavailableReason | null;
  baselineValue: number | null;
  automaticBaselineValue: number | null;
  baselineSource: EffectiveNeuromuscularBaselineSource;
  configurationEvent: NeuromuscularBaselineConfigurationEvent | null;
  absoluteDifference: number | null;
  percentChange: number | null;
  objectiveLossPct: number | null;
  improvementPct: number | null;
  baselineWindowValues: number[];
  baselineWindowSize: number;
}

export interface NeuromuscularComparisonSeries {
  teamId: string;
  playerId: string;
  metric: NeuromuscularMetric;
  moment: "PRE";
  baselineOptions: NeuromuscularBaselineOptions;
  comparisons: NeuromuscularComparisonPoint[];
  availableComparisons: NeuromuscularComparisonPoint[];
  latestAvailableComparison: NeuromuscularComparisonPoint | null;
  finalBaseline: number | null;
  hasSufficientBaseline: boolean;
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getComparisonAvailability(
  decision: NeuromuscularBaselineDecision,
  baselineValue: number | null,
): NeuromuscularComparisonAvailability {
  if (decision.point.moment === "POST") {
    return { available: false, unavailableReason: "POST_NOT_ALLOWED" };
  }

  if (!isFinitePositiveNumber(decision.point.value)) {
    return { available: false, unavailableReason: "INVALID_VALUE" };
  }

  if (baselineValue === null) {
    return { available: false, unavailableReason: "NO_BASELINE_BEFORE" };
  }

  if (!isFinitePositiveNumber(baselineValue)) {
    return { available: false, unavailableReason: "INVALID_BASELINE" };
  }

  return { available: true, unavailableReason: null };
}

export function calculateNeuromuscularAbsoluteDifference(
  value: number,
  baseline: number,
): number | null {
  if (!Number.isFinite(value) || !isFinitePositiveNumber(baseline)) {
    return null;
  }

  return value - baseline;
}

export function calculateNeuromuscularObjectiveLossPct(
  percentChange: number | null,
): number | null {
  if (percentChange === null || !Number.isFinite(percentChange)) return null;

  return Math.max(0, -percentChange);
}

export function calculateNeuromuscularImprovementPct(
  percentChange: number | null,
): number | null {
  if (percentChange === null || !Number.isFinite(percentChange)) return null;

  return Math.max(0, percentChange);
}

export function calculateNeuromuscularComparisonPoint(
  decision: NeuromuscularBaselineDecision,
  baselineWindowValuesBefore: readonly number[] = [],
  baselineConfigurationEvents: readonly NeuromuscularBaselineConfigurationEvent[] = [],
): NeuromuscularComparisonPoint {
  const automaticBaselineValue = decision.baselineBefore;
  const effectiveBaseline = resolveEffectiveNeuromuscularBaseline({
    automaticValue: automaticBaselineValue,
    events: baselineConfigurationEvents,
    teamId: decision.point.teamId,
    playerId: decision.point.playerId,
    metric: decision.point.metric,
    date: decision.point.sessionDate,
  });
  const availability = getComparisonAvailability(
    decision,
    effectiveBaseline.effectiveValue,
  );
  const baselineWindowValues = [...baselineWindowValuesBefore];
  const baselineValue = availability.available
    ? effectiveBaseline.effectiveValue
    : null;
  const absoluteDifference = baselineValue === null
    ? null
    : calculateNeuromuscularAbsoluteDifference(
        decision.point.value,
        baselineValue,
      );
  const percentChange = baselineValue === null
    ? null
    : calculateNeuromuscularPercentChange(
        decision.point.value,
        baselineValue,
      );

  return {
    point: decision.point,
    baselineDecisionReason: decision.reason,
    eligibleForBaseline: decision.eligible,
    includedInBaseline: decision.included,
    comparisonAvailable: availability.available,
    unavailableReason: availability.unavailableReason,
    baselineValue,
    automaticBaselineValue: effectiveBaseline.automaticValue,
    baselineSource: effectiveBaseline.source,
    configurationEvent: effectiveBaseline.configurationEvent,
    absoluteDifference,
    percentChange,
    objectiveLossPct: calculateNeuromuscularObjectiveLossPct(percentChange),
    improvementPct: calculateNeuromuscularImprovementPct(percentChange),
    baselineWindowValues,
    baselineWindowSize: baselineWindowValues.length,
  };
}

export function calculateNeuromuscularComparisonSeries(
  baselineSeries: NeuromuscularBaselineSeries,
  baselineConfigurationEvents: readonly NeuromuscularBaselineConfigurationEvent[] = [],
): NeuromuscularComparisonSeries {
  let previousWindowValues: number[] = [];

  const comparisons = baselineSeries.decisions.map((decision) => {
    const comparison = calculateNeuromuscularComparisonPoint(
      decision,
      previousWindowValues,
      baselineConfigurationEvents,
    );

    previousWindowValues = [...decision.windowValuesAfter];

    return comparison;
  });
  const availableComparisons = comparisons.filter(
    (comparison) => comparison.comparisonAvailable,
  );

  return {
    teamId: baselineSeries.teamId,
    playerId: baselineSeries.playerId,
    metric: baselineSeries.metric,
    moment: "PRE",
    baselineOptions: { ...baselineSeries.options },
    comparisons,
    availableComparisons,
    latestAvailableComparison:
      availableComparisons[availableComparisons.length - 1] ?? null,
    finalBaseline: baselineSeries.finalBaseline,
    hasSufficientBaseline: baselineSeries.hasSufficientBaseline,
  };
}

export function calculateNeuromuscularComparisons(
  points: readonly NeuromuscularHistoryPoint[],
  options?: Partial<NeuromuscularBaselineOptions>,
  baselineConfigurationEvents: readonly NeuromuscularBaselineConfigurationEvent[] = [],
): NeuromuscularComparisonSeries[] {
  return calculateNeuromuscularBaselines(points, options).map(
    (baselineSeries) =>
      calculateNeuromuscularComparisonSeries(
        baselineSeries,
        baselineConfigurationEvents,
      ),
  );
}
