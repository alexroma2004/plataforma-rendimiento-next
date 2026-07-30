"use client";

import { useMemo, useState } from "react";
import NeuromuscularMetricHistoryChart from "@/components/neuromuscular/NeuromuscularMetricHistoryChart";
import NeuromuscularMetricHistoryTable from "@/components/neuromuscular/NeuromuscularMetricHistoryTable";
import EmptyState from "@/components/ui/EmptyState";
import StatusMessage from "@/components/ui/StatusMessage";
import type {
  NeuromuscularLossPoint,
  NeuromuscularLossSeries,
} from "@/lib/domain/neuromuscular-loss";

type NeuromuscularHistoryRange =
  | "ALL"
  | "LAST_30_DAYS"
  | "LAST_90_DAYS"
  | "LAST_180_DAYS"
  | "CUSTOM";

type IsoRange = {
  from: string;
  to: string;
};

interface NeuromuscularMetricHistorySectionProps {
  series: NeuromuscularLossSeries;
}

const RANGE_OPTIONS: Array<{ value: NeuromuscularHistoryRange; label: string }> = [
  { value: "ALL", label: "Todo el histórico" },
  { value: "LAST_30_DAYS", label: "Últimos 30 días" },
  { value: "LAST_90_DAYS", label: "Últimos 90 días" },
  { value: "LAST_180_DAYS", label: "Últimos 180 días" },
  { value: "CUSTOM", label: "Rango personalizado" },
];

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function subtractUtcDays(date: string, days: number): string | null {
  if (!isIsoDate(date) || !Number.isInteger(days) || days < 0) return null;

  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day) - days * 86_400_000);

  return [
    result.getUTCFullYear().toString().padStart(4, "0"),
    (result.getUTCMonth() + 1).toString().padStart(2, "0"),
    result.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}

function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-");

  return isIsoDate(value) ? `${day}/${month}/${year}` : value;
}

function getQuickRangeDays(mode: NeuromuscularHistoryRange): number | null {
  if (mode === "LAST_30_DAYS") return 30;
  if (mode === "LAST_90_DAYS") return 90;
  if (mode === "LAST_180_DAYS") return 180;

  return null;
}

export default function NeuromuscularMetricHistorySection({
  series,
}: NeuromuscularMetricHistorySectionProps) {
  const [rangeMode, setRangeMode] = useState<NeuromuscularHistoryRange>("ALL");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [appliedCustomRange, setAppliedCustomRange] = useState<IsoRange | null>(null);
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

  const anchorDate = useMemo(() => {
    for (let index = series.points.length - 1; index >= 0; index -= 1) {
      const date = series.points[index].statisticalPoint.comparison.point.sessionDate;

      if (isIsoDate(date)) return date;
    }

    return null;
  }, [series.points]);

  const activeRange = useMemo<IsoRange | null>(() => {
    const quickRangeDays = getQuickRangeDays(rangeMode);

    if (quickRangeDays !== null) {
      if (!anchorDate) return null;

      const from = subtractUtcDays(anchorDate, quickRangeDays - 1);

      return from ? { from, to: anchorDate } : null;
    }

    return rangeMode === "CUSTOM" ? appliedCustomRange : null;
  }, [anchorDate, appliedCustomRange, rangeMode]);

  const { visiblePoints, invalidDateCount } = useMemo(() => {
    if (rangeMode === "ALL") {
      return { visiblePoints: series.points, invalidDateCount: 0 };
    }

    if (activeRange === null) {
      if (getQuickRangeDays(rangeMode) !== null) {
        return {
          visiblePoints: [],
          invalidDateCount: series.points.filter(
            (point) => !isIsoDate(point.statisticalPoint.comparison.point.sessionDate),
          ).length,
        };
      }

      return { visiblePoints: series.points, invalidDateCount: 0 };
    }

    let invalidDateCount = 0;
    const visiblePoints: NeuromuscularLossPoint[] = [];

    for (const point of series.points) {
      const sessionDate = point.statisticalPoint.comparison.point.sessionDate;

      if (!isIsoDate(sessionDate)) {
        invalidDateCount += 1;
        continue;
      }

      if (sessionDate >= activeRange.from && sessionDate <= activeRange.to) {
        visiblePoints.push(point);
      }
    }

    return { visiblePoints, invalidDateCount };
  }, [activeRange, rangeMode, series.points]);

  const rangeDescription = useMemo(() => {
    if (rangeMode === "ALL") return "Todo el histórico disponible.";

    if (activeRange) {
      const prefix = rangeMode === "CUSTOM" ? "Rango personalizado: " : "";

      return `${prefix}Del ${formatIsoDate(activeRange.from)} al ${formatIsoDate(activeRange.to)}.`;
    }

    if (rangeMode === "CUSTOM") {
      return "Introduce y aplica las dos fechas para consultar un rango personalizado.";
    }

    return "No hay una fecha válida de referencia para calcular este intervalo.";
  }, [activeRange, rangeMode]);

  const handleRangeModeChange = (nextMode: NeuromuscularHistoryRange) => {
    setRangeMode(nextMode);
    setCustomRangeError(null);
  };

  const handleApplyCustomRange = () => {
    if (!customDateFrom || !customDateTo) {
      setCustomRangeError("Selecciona las dos fechas del rango.");
      return;
    }

    if (!isIsoDate(customDateFrom) || !isIsoDate(customDateTo)) {
      setCustomRangeError("Introduce fechas válidas para aplicar el rango.");
      return;
    }

    if (customDateFrom > customDateTo) {
      setCustomRangeError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }

    setAppliedCustomRange({ from: customDateFrom, to: customDateTo });
    setCustomRangeError(null);
  };

  const handleClearCustomRange = () => {
    setCustomDateFrom("");
    setCustomDateTo("");
    setAppliedCustomRange(null);
    setCustomRangeError(null);
    setRangeMode("ALL");
  };

  return (
    <section className="space-y-5" aria-label="Histórico longitudinal neuromuscular">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <fieldset>
          <legend className="text-lg font-black text-slate-950">Filtro temporal</legend>
          <p className="mt-1 text-sm text-slate-600">
            El filtro cambia los registros visibles, pero los cálculos mantienen todo el
            histórico del jugador.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label
                htmlFor="neuromuscular-history-range"
                className="text-sm font-bold text-slate-700"
              >
                Periodo visible
              </label>
              <select
                id="neuromuscular-history-range"
                value={rangeMode}
                onChange={(event) =>
                  handleRangeModeChange(event.target.value as NeuromuscularHistoryRange)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none ring-blue-500 focus:ring-2"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <p className="text-sm font-semibold text-slate-600">
              Mostrando {visiblePoints.length} de {series.points.length} registros.
            </p>
          </div>

          {getQuickRangeDays(rangeMode) !== null && (
            <p className="mt-3 text-xs text-slate-500">
              Rango calculado desde la medición más reciente de esta métrica.
            </p>
          )}

          {rangeMode === "CUSTOM" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end">
              <label className="text-sm font-bold text-slate-700" htmlFor="neuromuscular-history-from">
                Fecha desde
                <input
                  id="neuromuscular-history-from"
                  type="date"
                  value={customDateFrom}
                  onChange={(event) => setCustomDateFrom(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none ring-blue-500 focus:ring-2"
                />
              </label>
              <label className="text-sm font-bold text-slate-700" htmlFor="neuromuscular-history-to">
                Fecha hasta
                <input
                  id="neuromuscular-history-to"
                  type="date"
                  value={customDateTo}
                  onChange={(event) => setCustomDateTo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none ring-blue-500 focus:ring-2"
                />
              </label>
              <button
                type="button"
                onClick={handleApplyCustomRange}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={handleClearCustomRange}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          )}

          {customRangeError && (
            <p className="mt-3 text-sm font-semibold text-rose-700" role="alert">
              {customRangeError}
            </p>
          )}

          <p className="mt-4 text-sm text-slate-600">{rangeDescription}</p>
        </fieldset>
      </div>

      {invalidDateCount > 0 && (
        <StatusMessage variant="warning">
          Hay {invalidDateCount} registros con una fecha no válida que no pueden incluirse
          en este filtro.
        </StatusMessage>
      )}

      {visiblePoints.length === 0 ? (
        <EmptyState
          title="No hay mediciones de esta métrica dentro del intervalo seleccionado"
          description="Ajusta o limpia el filtro temporal para consultar otros registros disponibles."
        />
      ) : (
        <>
          <NeuromuscularMetricHistoryChart series={series} points={visiblePoints} />
          <NeuromuscularMetricHistoryTable series={series} points={visiblePoints} />
        </>
      )}
    </section>
  );
}
