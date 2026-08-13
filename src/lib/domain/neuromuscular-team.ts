import {
  createNeuromuscularHistoryPoints,
  getNeuromuscularMetricValue,
  NEUROMUSCULAR_METRICS,
  type NeuromuscularHistoryRecord,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";
import {
  calculateNeuromuscularLosses,
  type NeuromuscularLossPoint,
  type NeuromuscularLossScore,
} from "@/lib/domain/neuromuscular-loss";
import {
  calculateNeuromuscularReadinessPoint,
  type NeuromuscularReadinessLevel,
  type NeuromuscularReadinessPoint,
} from "@/lib/domain/neuromuscular-readiness";
import type {
  NeuromuscularBaselineConfigurationEvent,
} from "@/lib/domain/neuromuscular-baseline-configuration";

export type NeuromuscularTeamSession = {
  id: string;
  session_date: string;
};

export type NeuromuscularTeamPlayer = {
  id: string;
  name: string;
};

export type NeuromuscularTeamRecord = NeuromuscularHistoryRecord & {
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

export type NeuromuscularTeamFatigueStatus =
  | "OPTIMAL"
  | "GOOD"
  | "MILD"
  | "MODERATE"
  | "CRITICAL";

export type NeuromuscularTeamMetricSnapshot = {
  value: number | null;
  baselineValue: number | null;
  percentChange: number | null;
  objectiveLossPct: number | null;
  lossScore: NeuromuscularLossScore | null;
  zScore: number | null;
};

export type NeuromuscularTeamPlayerSnapshot = {
  teamId: string;
  playerId: string;
  displayName: string;
  sessionId: string;
  sessionDate: string;
  measuredMetricCount: number;
  availableMetricCount: number;
  readinessScore: number | null;
  readinessAvailable: boolean;
  readinessCoverage: NeuromuscularReadinessPoint["coverage"] | null;
  readinessLevel: NeuromuscularReadinessLevel | null;
  objectiveLossScore: number | null;
  meanLossPercent: number | null;
  zScore: number | null;
  zScoreAvailableMetricCount: number;
  fatigueStatus: NeuromuscularTeamFatigueStatus | null;
  metrics: Record<NeuromuscularMetric, NeuromuscularTeamMetricSnapshot>;
};

export type NeuromuscularTeamSummary = {
  readinessMean: number | null;
  objectiveLossScoreMean: number | null;
  meanLossPercent: number | null;
  zScoreMean: number | null;
  moderateOrWorseCount: number;
  criticalCount: number;
  classifiedPlayerCount: number;
  totalPlayerCount: number;
};

export type NeuromuscularTeamAggregation = {
  playerSnapshots: NeuromuscularTeamPlayerSnapshot[];
  summary: NeuromuscularTeamSummary;
};

export type BuildNeuromuscularTeamAggregationInput = {
  teamId: string;
  session: NeuromuscularTeamSession;
  players: readonly NeuromuscularTeamPlayer[];
  records: readonly NeuromuscularTeamRecord[];
  baselineConfigurationEvents: readonly NeuromuscularBaselineConfigurationEvent[];
};

const EMPTY_METRIC_SNAPSHOT: NeuromuscularTeamMetricSnapshot = {
  value: null,
  baselineValue: null,
  percentChange: null,
  objectiveLossPct: null,
  lossScore: null,
  zScore: null,
};

function mean(values: readonly (number | null)[]): number | null {
  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length === 0) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

export function calculateNeuromuscularTeamObjectiveLossScore(
  scores: readonly (NeuromuscularLossScore | null)[],
): number | null {
  const validScores = scores.filter(
    (score): score is NeuromuscularLossScore =>
      score === 0 || score === 1 || score === 2 || score === 3,
  );

  if (validScores.length === 0) return null;

  return validScores.filter((score) => score > 0).length;
}

export function calculateNeuromuscularTeamZScore(
  scores: readonly (number | null)[],
): number | null {
  return mean(scores);
}

export function classifyNeuromuscularTeamFatigue(
  meanLossPercent: number | null,
): NeuromuscularTeamFatigueStatus | null {
  if (meanLossPercent === null || !Number.isFinite(meanLossPercent)) return null;
  if (meanLossPercent === 0) return "OPTIMAL";
  if (meanLossPercent > 0 && meanLossPercent < 2.5) return "GOOD";
  if (meanLossPercent >= 2.5 && meanLossPercent < 5) return "MILD";
  if (meanLossPercent >= 5 && meanLossPercent < 10) return "MODERATE";
  if (meanLossPercent >= 10) return "CRITICAL";

  return null;
}

function getEmptyMetrics(): Record<NeuromuscularMetric, NeuromuscularTeamMetricSnapshot> {
  return {
    CMJ: { ...EMPTY_METRIC_SNAPSHOT },
    RSIMOD: { ...EMPTY_METRIC_SNAPSHOT },
    VMP: { ...EMPTY_METRIC_SNAPSHOT },
  };
}

function getTargetLossPoint(
  lossPoints: readonly NeuromuscularLossPoint[],
  session: NeuromuscularTeamSession,
): NeuromuscularLossPoint | null {
  return (
    lossPoints.find(
      (lossPoint) =>
        lossPoint.statisticalPoint.comparison.point.sessionId === session.id &&
        lossPoint.statisticalPoint.comparison.point.sessionDate ===
          session.session_date,
    ) ?? null
  );
}

function createMetricSnapshot(
  record: NeuromuscularTeamRecord | null,
  metric: NeuromuscularMetric,
  lossPoint: NeuromuscularLossPoint | null,
): NeuromuscularTeamMetricSnapshot {
  return {
    value: record
      ? getNeuromuscularMetricValue(record, metric, "PRE")
      : null,
    baselineValue: lossPoint?.statisticalPoint.comparison.baselineValue ?? null,
    percentChange: lossPoint?.statisticalPoint.comparison.percentChange ?? null,
    objectiveLossPct:
      lossPoint?.statisticalPoint.comparison.objectiveLossPct ?? null,
    lossScore: lossPoint?.lossScore ?? null,
    zScore: lossPoint?.statisticalPoint.zScore ?? null,
  };
}

function createReadinessPoint(
  lossPoints: readonly NeuromuscularLossPoint[],
): NeuromuscularReadinessPoint | null {
  if (lossPoints.length === 0) return null;

  return calculateNeuromuscularReadinessPoint(lossPoints);
}

function createPlayerSnapshot(
  input: BuildNeuromuscularTeamAggregationInput,
  player: NeuromuscularTeamPlayer,
): NeuromuscularTeamPlayerSnapshot {
  const playerRecords = input.records.filter(
    (record) =>
      record.player_id === player.id &&
      record.session_date <= input.session.session_date,
  );
  const targetRecord =
    playerRecords.find((record) => record.session_id === input.session.id) ?? null;
  const historyPoints = createNeuromuscularHistoryPoints(
    playerRecords,
    { moment: "PRE" },
  );
  const lossSeries = calculateNeuromuscularLosses(
    historyPoints,
    undefined,
    undefined,
    input.baselineConfigurationEvents,
  );
  const targetLossPoints = lossSeries
    .map((series) => getTargetLossPoint(series.points, input.session))
    .filter((lossPoint): lossPoint is NeuromuscularLossPoint => lossPoint !== null);
  const readinessPoint = createReadinessPoint(targetLossPoints);
  const metrics = getEmptyMetrics();
  const measuredMetricCount = NEUROMUSCULAR_METRICS.filter(
    (metric) => targetRecord && getNeuromuscularMetricValue(targetRecord, metric, "PRE") !== null,
  ).length;

  targetLossPoints.forEach((lossPoint) => {
    const metric = lossPoint.statisticalPoint.comparison.point.metric;
    metrics[metric] = createMetricSnapshot(targetRecord, metric, lossPoint);
  });

  const validLosses = targetLossPoints
    .filter((lossPoint) => lossPoint.lossScoreAvailable)
    .map(
      (lossPoint) => lossPoint.statisticalPoint.comparison.objectiveLossPct,
    );
  const zScores = targetLossPoints.map(
    (lossPoint) => lossPoint.statisticalPoint.zScore,
  );
  const meanLossPercent = mean(validLosses);
  const zScore = calculateNeuromuscularTeamZScore(zScores);
  const objectiveLossScore = calculateNeuromuscularTeamObjectiveLossScore(
    targetLossPoints.map((lossPoint) => lossPoint.lossScore),
  );

  return {
    teamId: input.teamId,
    playerId: player.id,
    displayName: player.name,
    sessionId: input.session.id,
    sessionDate: input.session.session_date,
    measuredMetricCount,
    availableMetricCount: targetLossPoints.filter(
      (lossPoint) => lossPoint.lossScoreAvailable,
    ).length,
    readinessScore: readinessPoint?.readinessScore ?? null,
    readinessAvailable: readinessPoint?.readinessAvailable ?? false,
    readinessCoverage: readinessPoint?.coverage ?? null,
    readinessLevel: readinessPoint?.readinessLevel ?? null,
    objectiveLossScore,
    meanLossPercent,
    zScore,
    zScoreAvailableMetricCount: zScores.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    ).length,
    fatigueStatus: classifyNeuromuscularTeamFatigue(meanLossPercent),
    metrics,
  };
}

function compareDisplayNames(
  first: NeuromuscularTeamPlayerSnapshot,
  second: NeuromuscularTeamPlayerSnapshot,
): number {
  return first.displayName.localeCompare(second.displayName, "es", {
    sensitivity: "base",
  });
}

export function buildNeuromuscularTeamAggregation(
  input: BuildNeuromuscularTeamAggregationInput,
): NeuromuscularTeamAggregation {
  const playerSnapshots = input.players
    .map((player) => createPlayerSnapshot(input, player))
    .sort(compareDisplayNames);
  const validSnapshots = playerSnapshots;

  const summary: NeuromuscularTeamSummary = {
    readinessMean: mean(validSnapshots.map((snapshot) => snapshot.readinessScore)),
    objectiveLossScoreMean: mean(
      validSnapshots.map((snapshot) => snapshot.objectiveLossScore),
    ),
    meanLossPercent: mean(
      validSnapshots.map((snapshot) => snapshot.meanLossPercent),
    ),
    zScoreMean: mean(validSnapshots.map((snapshot) => snapshot.zScore)),
    moderateOrWorseCount: validSnapshots.filter(
      (snapshot) =>
        snapshot.fatigueStatus === "MODERATE" ||
        snapshot.fatigueStatus === "CRITICAL",
    ).length,
    criticalCount: validSnapshots.filter(
      (snapshot) => snapshot.fatigueStatus === "CRITICAL",
    ).length,
    classifiedPlayerCount: validSnapshots.filter(
      (snapshot) => snapshot.fatigueStatus !== null,
    ).length,
    totalPlayerCount: input.players.length,
  };

  return { playerSnapshots, summary };
}
