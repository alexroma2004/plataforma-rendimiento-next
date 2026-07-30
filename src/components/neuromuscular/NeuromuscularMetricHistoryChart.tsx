"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  type DotProps,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import {
  NEUROMUSCULAR_METRIC_DEFINITIONS,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";
import type {
  NeuromuscularBaselineDecisionReason,
} from "@/lib/domain/neuromuscular-baseline";
import type {
  NeuromuscularLossLevel,
  NeuromuscularLossPoint,
  NeuromuscularLossSeries,
  NeuromuscularLossUnavailableReason,
} from "@/lib/domain/neuromuscular-loss";

interface NeuromuscularMetricHistoryChartProps {
  series: NeuromuscularLossSeries;
  points?: readonly NeuromuscularLossPoint[];
}

type ChartPoint = {
  recordId: string;
  sessionId: string;
  sessionDate: string;
  dateLabel: string;
  microcycle: string;
  metric: NeuromuscularMetric;
  value: number;
  baselineBefore: number | null;
  ma3: number | null;
  ma3Eligible: boolean;
  zScore: number | null;
  percentChange: number | null;
  objectiveLossPct: number | null;
  lossScore: number | null;
  lossLevel: NeuromuscularLossLevel | null;
  lossScoreAvailable: boolean;
  lossUnavailableReason: NeuromuscularLossUnavailableReason | null;
  includedInBaseline: boolean;
  baselineDecisionReason: NeuromuscularBaselineDecisionReason;
};

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-");

  return year && month && day ? `${day}/${month}` : date;
}

function formatMetricValue(
  value: number | null,
  metric: NeuromuscularMetric,
): string {
  if (value === null || !Number.isFinite(value)) return "No disponible";

  const decimals = metric === "CMJ" ? 2 : 3;

  return value.toLocaleString("es-ES", {
    maximumFractionDigits: decimals,
  });
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "No disponible";

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  })}%`;
}

function getMetricLabel(metric: NeuromuscularMetric): string {
  return metric === "RSIMOD" ? "RSI modificado" : metric;
}

function getBaselineReasonLabel(reason: NeuromuscularBaselineDecisionReason) {
  const labels: Record<NeuromuscularBaselineDecisionReason, string> = {
    SEED_MD1: "Registro utilizado para crear la semilla",
    INCLUDED_MD1: "MD-1 incorporado al baseline",
    INCLUDED_CANDIDATE: "Registro incorporado al baseline",
    INSUFFICIENT_SEED: "Baseline todavía insuficiente",
    EXCLUDED_MICROCYCLE: "Microciclo excluido del baseline",
    UNKNOWN_MICROCYCLE: "Microciclo no reconocido",
    POST_NOT_ALLOWED: "Medición POST no válida para baseline",
    INVALID_VALUE: "Valor no válido",
    BELOW_CANDIDATE_THRESHOLD: "Pérdida superior al umbral de inclusión",
  };

  return labels[reason];
}

function getLossUnavailableLabel(
  reason: NeuromuscularLossUnavailableReason | null,
): string | null {
  const labels: Record<NeuromuscularLossUnavailableReason, string> = {
    COMPARISON_UNAVAILABLE: "Sin baseline anterior para puntuar",
    POST_NOT_ALLOWED: "Medición POST no puntuable",
    INVALID_OBJECTIVE_LOSS: "Pérdida objetiva no válida",
    EXCLUDED_MICROCYCLE: "Microciclo no puntuable",
    UNKNOWN_MICROCYCLE: "Microciclo no reconocido",
  };

  return reason === null ? null : labels[reason];
}

function getLossLevelLabel(level: NeuromuscularLossLevel | null): string {
  const labels: Record<NeuromuscularLossLevel, string> = {
    NORMAL: "Normal",
    ATTENTION: "Atención",
    ALERT: "Alerta",
    CRITICAL: "Crítico",
  };

  return level === null ? "Sin valoración" : labels[level];
}

function ObservedValueDot({
  cx,
  cy,
  payload,
}: DotProps & { payload?: ChartPoint }) {
  const x = Number(cx);
  const y = Number(cy);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !payload) return null;

  if (!payload.lossScoreAvailable) {
    return <circle cx={x} cy={y} r={5} fill="white" stroke="#0f172a" strokeWidth={2} />;
  }

  if (!payload.includedInBaseline) {
    return (
      <path
        d={`M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z`}
        fill="#f97316"
        stroke="#9a3412"
        strokeWidth={1.5}
      />
    );
  }

  return <circle cx={x} cy={y} r={5} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.5} />;
}

function HistoryTooltip({
  active,
  payload,
}: TooltipContentProps) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;

  if (!active || !point) return null;

  const unit = NEUROMUSCULAR_METRIC_DEFINITIONS[point.metric].unit;
  const lossReason = getLossUnavailableLabel(point.lossUnavailableReason);

  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-black text-slate-950">
        {point.sessionDate} · {point.microcycle}
      </p>
      <p className="mt-1 text-slate-600">Registro: {point.recordId}</p>
      <div className="mt-3 space-y-1 text-slate-700">
        <p>Valor PRE: {formatMetricValue(point.value, point.metric)} {unit}</p>
        <p>
          Baseline anterior: {formatMetricValue(point.baselineBefore, point.metric)}
          {point.baselineBefore === null ? "" : ` ${unit}`}
        </p>
        <p>MA3: {formatMetricValue(point.ma3, point.metric)}</p>
        <p>
          Estado MA3: {point.ma3Eligible
            ? "Actualizado con esta medición"
            : "MA3 vigente, no actualizado con esta medición"}
        </p>
        <p>Cambio respecto al baseline: {formatSignedPercent(point.percentChange)}</p>
        <p>Pérdida objetiva: {formatSignedPercent(point.objectiveLossPct)}</p>
        <p>Z-score: {point.zScore === null ? "No disponible" : formatMetricValue(point.zScore, point.metric)}</p>
        <p>
          Baseline: {point.includedInBaseline ? "Incluido" : "Excluido"} ·{" "}
          {getBaselineReasonLabel(point.baselineDecisionReason)}
        </p>
        {point.lossScoreAvailable ? (
          <p>
            Loss score: {point.lossScore} · {getLossLevelLabel(point.lossLevel)}
          </p>
        ) : (
          <p>Sin score operativo: {lossReason ?? "Sin valoración"}</p>
        )}
      </div>
    </div>
  );
}

export default function NeuromuscularMetricHistoryChart({
  series,
  points,
}: NeuromuscularMetricHistoryChartProps) {
  const metricDefinition = NEUROMUSCULAR_METRIC_DEFINITIONS[series.metric];
  const displayPoints = points ?? series.points;
  const chartPoints = useMemo<ChartPoint[]>(
    () =>
      displayPoints.map((lossPoint) => {
        const statisticalPoint = lossPoint.statisticalPoint;
        const comparison = statisticalPoint.comparison;
        const point = comparison.point;

        return {
          recordId: point.recordId,
          sessionId: point.sessionId,
          sessionDate: point.sessionDate,
          dateLabel: formatDateLabel(point.sessionDate),
          microcycle: String(point.microcycle),
          metric: point.metric,
          value: point.value,
          baselineBefore: comparison.baselineValue,
          ma3: statisticalPoint.ma3,
          ma3Eligible: statisticalPoint.ma3Eligible,
          zScore: statisticalPoint.zScore,
          percentChange: comparison.percentChange,
          objectiveLossPct: comparison.objectiveLossPct,
          lossScore: lossPoint.lossScore,
          lossLevel: lossPoint.lossLevel,
          lossScoreAvailable: lossPoint.lossScoreAvailable,
          lossUnavailableReason: lossPoint.lossUnavailableReason,
          includedInBaseline: comparison.includedInBaseline,
          baselineDecisionReason: comparison.baselineDecisionReason,
        };
      }),
    [displayPoints],
  );
  const latestPoint = chartPoints[chartPoints.length - 1] ?? null;
  const latestBaseline = [...chartPoints]
    .reverse()
    .find((point) => point.baselineBefore !== null)?.baselineBefore ?? null;
  const latestMa3 = [...chartPoints]
    .reverse()
    .find((point) => point.ma3 !== null)?.ma3 ?? null;
  const latestLossScore = [...displayPoints]
    .reverse()
    .find((point) => point.lossScoreAvailable) ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            Evolución longitudinal · {getMetricLabel(series.metric)}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Valor PRE, baseline anterior y MA3. Unidad: {metricDefinition.unit}.
          </p>
        </div>
        <p className="text-sm font-bold text-slate-600">
          {chartPoints.length} registros
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">Último PRE</p>
          <p className="mt-1 font-black text-slate-950">
            {formatMetricValue(latestPoint?.value ?? null, series.metric)} {metricDefinition.unit}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">Último baseline</p>
          <p className="mt-1 font-black text-slate-950">
            {formatMetricValue(latestBaseline, series.metric)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">Último MA3</p>
          <p className="mt-1 font-black text-slate-950">
            {formatMetricValue(latestMa3, series.metric)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">Último loss score</p>
          <p className="mt-1 font-black text-slate-950">
            {latestLossScore
              ? `${latestLossScore.lossScore} · ${getLossLevelLabel(latestLossScore.lossLevel)}`
              : "No disponible"}
          </p>
        </div>
      </div>

      <div
        className="mt-6 h-[320px] w-full"
        aria-label={`Gráfico longitudinal de ${getMetricLabel(series.metric)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartPoints} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" minTickGap={24} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={44} />
            <Tooltip content={(props) => <HistoryTooltip {...props} />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name="Valor PRE"
              stroke="#2563eb"
              strokeWidth={3}
              dot={<ObservedValueDot />}
              activeDot={{ r: 7 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="baselineBefore"
              name="Baseline anterior"
              stroke="#0f766e"
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="ma3"
              name="MA3"
              stroke="#9333ea"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        <span>● Relleno: punto puntuable e incluido en baseline</span>
        <span>◆ Rombo: punto puntuable excluido del baseline</span>
        <span>○ Hueco: punto no puntuable</span>
      </div>
    </section>
  );
}
