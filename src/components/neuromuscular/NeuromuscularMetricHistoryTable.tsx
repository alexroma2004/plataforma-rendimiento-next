"use client";

import { useMemo } from "react";
import {
  NEUROMUSCULAR_METRIC_DEFINITIONS,
  type NeuromuscularMetric,
} from "@/lib/domain/neuromuscular";
import type { NeuromuscularBaselineDecisionReason } from "@/lib/domain/neuromuscular-baseline";
import type { EffectiveNeuromuscularBaselineSource } from "@/lib/domain/neuromuscular-baseline-configuration";
import type {
  NeuromuscularLossLevel,
  NeuromuscularLossPoint,
  NeuromuscularLossSeries,
  NeuromuscularLossUnavailableReason,
} from "@/lib/domain/neuromuscular-loss";

interface NeuromuscularMetricHistoryTableProps {
  series: NeuromuscularLossSeries;
  points?: readonly NeuromuscularLossPoint[];
}

function formatIsoDate(date: string): string {
  const [year, month, day] = date.split("-");
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = numericYear % 4 === 0 && (
    numericYear % 100 !== 0 || numericYear % 400 === 0
  );
  const maximumDay = numericMonth === 2 && isLeapYear
    ? 29
    : daysInMonth[numericMonth - 1];

  return /^\d{4}$/.test(year ?? "") &&
    /^\d{2}$/.test(month ?? "") &&
    /^\d{2}$/.test(day ?? "") &&
    Number.isInteger(maximumDay) &&
    numericDay >= 1 &&
    numericDay <= maximumDay
    ? `${day}/${month}/${year}`
    : date;
}

function getMetricDecimals(metric: NeuromuscularMetric): number {
  return metric === "CMJ" ? 2 : 3;
}

function formatNumber(value: number | null, decimals: number): string {
  if (value === null || !Number.isFinite(value)) return "—";

  return value.toLocaleString("es-ES", { maximumFractionDigits: decimals });
}

function formatMetricValue(
  value: number | null,
  metric: NeuromuscularMetric,
): string {
  const formatted = formatNumber(value, getMetricDecimals(metric));

  return formatted === "—"
    ? formatted
    : `${formatted} ${NEUROMUSCULAR_METRIC_DEFINITIONS[metric].unit}`;
}

function formatCivilDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function isFiniteNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getBaselineSourceLabel(
  source: EffectiveNeuromuscularBaselineSource,
): "Automático" | "Manual" {
  return source === "MANUAL_EVENT" ? "Manual" : "Automático";
}

function getBaselineSourceBadgeClass(
  source: EffectiveNeuromuscularBaselineSource,
): string {
  return source === "MANUAL_EVENT"
    ? "bg-blue-50 text-blue-800 ring-blue-200"
    : "bg-slate-100 text-slate-700 ring-slate-200";
}

function formatSignedValue(
  value: number | null,
  decimals: number,
  suffix = "",
): string {
  if (value === null || !Number.isFinite(value)) return "—";

  const sign = value > 0 ? "+" : "";

  return `${sign}${formatNumber(value, decimals)}${suffix}`;
}

function getBaselineReasonLabel(reason: NeuromuscularBaselineDecisionReason): string {
  const labels: Record<NeuromuscularBaselineDecisionReason, string> = {
    SEED_MD1: "Registro utilizado para crear la semilla",
    INCLUDED_MD1: "MD-1 incorporado al baseline",
    INCLUDED_CANDIDATE: "Registro incorporado al baseline",
    INSUFFICIENT_SEED: "Baseline todavía insuficiente",
    EXCLUDED_MICROCYCLE: "Microciclo excluido",
    UNKNOWN_MICROCYCLE: "Microciclo no reconocido",
    POST_NOT_ALLOWED: "Medición POST no válida",
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

function getLossLevelLabel(level: NeuromuscularLossLevel): string {
  const labels: Record<NeuromuscularLossLevel, string> = {
    NORMAL: "Normal",
    ATTENTION: "Atención",
    ALERT: "Alerta",
    CRITICAL: "Crítico",
  };

  return labels[level];
}

function getBaselineState(
  reason: NeuromuscularBaselineDecisionReason,
  includedInBaseline: boolean,
): string {
  if (reason === "SEED_MD1") return "Semilla";

  return includedInBaseline ? "Incluido" : "Excluido";
}

function getBaselineBadgeClass(state: string): string {
  if (state === "Semilla") return "bg-violet-50 text-violet-800 ring-violet-200";
  if (state === "Incluido") return "bg-emerald-50 text-emerald-800 ring-emerald-200";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getLossBadgeClass(level: NeuromuscularLossLevel | null): string {
  if (level === "NORMAL") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (level === "ATTENTION") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (level === "ALERT") return "bg-orange-50 text-orange-800 ring-orange-200";
  if (level === "CRITICAL") return "bg-rose-50 text-rose-800 ring-rose-200";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function NeuromuscularMetricHistoryTable({
  series,
  points,
}: NeuromuscularMetricHistoryTableProps) {
  const displayPoints = points ?? series.points;
  const rows = useMemo(() => [...displayPoints].reverse(), [displayPoints]);
  const includedCount = useMemo(
    () => rows.filter((row) => row.statisticalPoint.comparison.includedInBaseline).length,
    [rows],
  );
  const scoreAvailableCount = useMemo(
    () => rows.filter((row) => row.lossScoreAvailable).length,
    [rows],
  );

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">Detalle longitudinal</h3>
          <p className="mt-1 text-sm text-slate-600">
            Mediciones PRE ordenadas desde la más reciente, con su referencia individual
            y estado de inclusión en el baseline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">{rows.length} registros</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{scoreAvailableCount} puntuables</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{includedCount} incluidos</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500 md:hidden">
        Desliza horizontalmente para consultar todas las variables.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1480px] w-full border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">
            Detalle longitudinal PRE de {series.metric}, ordenado desde la medición más
            reciente.
          </caption>
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              {[
                "Fecha", "Microciclo", "Valor PRE", "Baseline aplicado", "Diferencia",
                "Cambio", "Pérdida", "MA3", "Z-score", "Loss score", "Baseline", "Motivo",
              ].map((label) => (
                <th key={label} scope="col" className="border-b border-slate-200 px-3 py-3 font-bold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {rows.map((lossPoint) => {
              const statisticalPoint = lossPoint.statisticalPoint;
              const comparison = statisticalPoint.comparison;
              const point = comparison.point;
              const baselineState = getBaselineState(
                comparison.baselineDecisionReason,
                comparison.includedInBaseline,
              );
              const lossReason = getLossUnavailableLabel(lossPoint.lossUnavailableReason);
              const baselineReason = getBaselineReasonLabel(comparison.baselineDecisionReason);
              const reasonLines = lossReason && lossReason !== baselineReason
                ? [baselineReason, lossReason]
                : [baselineReason];
              const hasAppliedBaseline = isFiniteNumber(comparison.baselineValue);
              const isManualBaseline = comparison.baselineSource === "MANUAL_EVENT";
              const automaticBaselineAlternative =
                isManualBaseline && isFiniteNumber(comparison.automaticBaselineValue)
                  ? comparison.automaticBaselineValue
                  : null;
              const effectiveFrom = comparison.configurationEvent?.effectiveFrom ?? null;

              return (
                <tr
                  key={`${point.sessionId}-${point.recordId}-${point.metric}`}
                  className="align-top hover:bg-slate-50"
                >
                  <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-950">
                    {formatIsoDate(point.sessionDate)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">{String(point.microcycle)}</td>
                  <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-950">
                    {formatMetricValue(point.value, series.metric)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    {hasAppliedBaseline ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-950">
                          {formatMetricValue(comparison.baselineValue, series.metric)}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getBaselineSourceBadgeClass(comparison.baselineSource)}`}
                        >
                          {getBaselineSourceLabel(comparison.baselineSource)}
                        </span>
                        {automaticBaselineAlternative !== null && (
                          <p className="text-xs leading-5 text-slate-600">
                            Automático calculado: {formatMetricValue(
                              automaticBaselineAlternative,
                              series.metric,
                            )}
                          </p>
                        )}
                        {effectiveFrom !== null && (
                          <p className="text-xs text-slate-500">
                            Desde {formatCivilDate(effectiveFrom)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">No disponible</span>
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    {formatSignedValue(
                      comparison.absoluteDifference,
                      getMetricDecimals(series.metric),
                      comparison.absoluteDifference === null ? "" : ` ${NEUROMUSCULAR_METRIC_DEFINITIONS[series.metric].unit}`,
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    {formatSignedValue(comparison.percentChange, 2, "%")}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    {formatNumber(lossPoint.objectiveLossPct, 2) === "—"
                      ? "—"
                      : `${formatNumber(lossPoint.objectiveLossPct, 2)}%`}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    {statisticalPoint.ma3 === null ? (
                      "—"
                    ) : (
                      <div>
                        <p className="font-medium">{formatMetricValue(statisticalPoint.ma3, series.metric)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {statisticalPoint.ma3Eligible ? "Actualizado" : "Vigente, no actualizado"}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    {formatSignedValue(statisticalPoint.zScore, 2)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getLossBadgeClass(lossPoint.lossLevel)}`}>
                      {lossPoint.lossScoreAvailable && lossPoint.lossScore !== null && lossPoint.lossLevel !== null
                        ? `${lossPoint.lossScore} · ${getLossLevelLabel(lossPoint.lossLevel)}`
                        : "Sin valoración"}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getBaselineBadgeClass(baselineState)}`}>
                      {baselineState}
                    </span>
                  </td>
                  <td className="min-w-64 border-b border-slate-100 px-3 py-3 text-xs leading-5 text-slate-600">
                    {reasonLines.map((reason) => <p key={reason}>{reason}</p>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        El porcentaje y el loss se calculan utilizando el baseline aplicado en la fecha de cada sesión.
      </p>
    </section>
  );
}
