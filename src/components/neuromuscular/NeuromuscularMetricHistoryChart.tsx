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
  EffectiveNeuromuscularBaselineSource,
  NeuromuscularBaselineConfigurationEvent,
} from "@/lib/domain/neuromuscular-baseline-configuration";
import type {
  NeuromuscularLossLevel,
  NeuromuscularLossPoint,
  NeuromuscularLossSeries,
} from "@/lib/domain/neuromuscular-loss";

interface NeuromuscularMetricHistoryChartProps {
  series: NeuromuscularLossSeries;
  points?: readonly NeuromuscularLossPoint[];
}

type ChartPoint = {
  sessionId: string;
  sessionDate: string;
  dateLabel: string;
  microcycle: string;
  metric: NeuromuscularMetric;
  value: number;
  baselineBefore: number | null;
  automaticBaselineValue: number | null;
  baselineSource: EffectiveNeuromuscularBaselineSource;
  configurationEvent: NeuromuscularBaselineConfigurationEvent | null;
  ma3: number | null;
  zScore: number | null;
  percentChange: number | null;
  objectiveLossPct: number | null;
  lossScore: number | null;
  lossLevel: NeuromuscularLossLevel | null;
  lossScoreAvailable: boolean;
  includedInBaseline: boolean;
};

type HistoryTooltipProps = Pick<
  TooltipContentProps<number, string>,
  "active" | "payload"
>;

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-");

  return year && month && day ? `${day}/${month}` : date;
}

function formatCivilDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
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

function formatMetricValueWithUnit(
  value: number | null,
  metric: NeuromuscularMetric,
): string {
  const formattedValue = formatMetricValue(value, metric);

  return formattedValue === "No disponible"
    ? formattedValue
    : `${formattedValue} ${NEUROMUSCULAR_METRIC_DEFINITIONS[metric].unit}`;
}

function formatPercent(value: number | null, includeSign = false): string {
  if (value === null || !Number.isFinite(value)) return "No disponible";

  const sign = includeSign && value > 0 ? "+" : "";

  return `${sign}${value.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  })}%`;
}

function getMetricLabel(metric: NeuromuscularMetric): string {
  return metric === "RSIMOD" ? "RSI modificado" : metric;
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isNeuromuscularMetric(value: unknown): value is NeuromuscularMetric {
  return value === "CMJ" || value === "RSIMOD" || value === "VMP";
}

function isBaselineSource(
  value: unknown,
): value is EffectiveNeuromuscularBaselineSource {
  return value === "AUTOMATIC_DEFAULT" ||
    value === "AUTOMATIC_EVENT" ||
    value === "MANUAL_EVENT";
}

function isConfigurationEvent(
  value: unknown,
): value is NeuromuscularBaselineConfigurationEvent {
  return typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).effectiveFrom === "string";
}

function isChartPoint(value: unknown): value is ChartPoint {
  if (typeof value !== "object" || value === null) return false;

  const point = value as Record<string, unknown>;

  return typeof point.sessionId === "string" &&
    typeof point.sessionDate === "string" &&
    typeof point.dateLabel === "string" &&
    typeof point.microcycle === "string" &&
    isNeuromuscularMetric(point.metric) &&
    typeof point.value === "number" &&
    isNullableNumber(point.baselineBefore) &&
    isNullableNumber(point.automaticBaselineValue) &&
    isBaselineSource(point.baselineSource) &&
    (point.configurationEvent === null || isConfigurationEvent(point.configurationEvent)) &&
    isNullableNumber(point.ma3) &&
    isNullableNumber(point.zScore) &&
    isNullableNumber(point.percentChange) &&
    isNullableNumber(point.objectiveLossPct) &&
    isNullableNumber(point.lossScore) &&
    (point.lossLevel === null ||
      point.lossLevel === "NORMAL" ||
      point.lossLevel === "ATTENTION" ||
      point.lossLevel === "ALERT" ||
      point.lossLevel === "CRITICAL") &&
    typeof point.lossScoreAvailable === "boolean" &&
    typeof point.includedInBaseline === "boolean";
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
}: HistoryTooltipProps) {
  const candidate = payload?.[0]?.payload;

  if (!active || !isChartPoint(candidate)) return null;

  const point = candidate;
  const hasAppliedBaseline = isFiniteNumber(point.baselineBefore);
  const automaticBaselineAlternative = hasAppliedBaseline &&
    point.baselineSource === "MANUAL_EVENT" &&
    isFiniteNumber(point.automaticBaselineValue)
    ? point.automaticBaselineValue
    : null;
  const effectiveFrom = hasAppliedBaseline
    ? point.configurationEvent?.effectiveFrom ?? null
    : null;
  const sessionContext = point.microcycle.trim();

  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-black text-slate-950">
        {formatCivilDate(point.sessionDate)}{sessionContext ? ` · ${sessionContext}` : ""}
      </p>
      <div className="mt-3 space-y-1 text-slate-700">
        <p>Valor PRE: {formatMetricValueWithUnit(point.value, point.metric)}</p>
        <p>MA3: {formatMetricValueWithUnit(point.ma3, point.metric)}</p>
        <p>
          Baseline aplicado: {formatMetricValueWithUnit(point.baselineBefore, point.metric)}
        </p>
        {hasAppliedBaseline && (
          <>
            <p>
              Fuente: {point.baselineSource === "MANUAL_EVENT" ? "Manual" : "Automático"}
            </p>
            {automaticBaselineAlternative !== null && (
              <p>
                Automático calculado: {formatMetricValueWithUnit(
                  automaticBaselineAlternative,
                  point.metric,
                )}
              </p>
            )}
            {effectiveFrom !== null && <p>Desde {formatCivilDate(effectiveFrom)}</p>}
          </>
        )}
        <p>Variación: {formatPercent(point.percentChange, true)}</p>
        <p>Loss: {formatPercent(point.objectiveLossPct)}</p>
        <p>Z-score: {formatMetricValue(point.zScore, point.metric)}</p>
        {point.lossScoreAvailable && isFiniteNumber(point.lossScore) ? (
          <p>
            Loss score: {point.lossScore} · {getLossLevelLabel(point.lossLevel)}
          </p>
        ) : (
          <p>Loss score: No disponible</p>
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
          sessionId: point.sessionId,
          sessionDate: point.sessionDate,
          dateLabel: formatDateLabel(point.sessionDate),
          microcycle: String(point.microcycle),
          metric: point.metric,
          value: point.value,
          baselineBefore: comparison.baselineValue,
          automaticBaselineValue: comparison.automaticBaselineValue,
          baselineSource: comparison.baselineSource,
          configurationEvent: comparison.configurationEvent,
          ma3: statisticalPoint.ma3,
          zScore: statisticalPoint.zScore,
          percentChange: comparison.percentChange,
          objectiveLossPct: comparison.objectiveLossPct,
          lossScore: lossPoint.lossScore,
          lossLevel: lossPoint.lossLevel,
          lossScoreAvailable: lossPoint.lossScoreAvailable,
          includedInBaseline: comparison.includedInBaseline,
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
