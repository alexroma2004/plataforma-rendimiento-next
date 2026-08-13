"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NeuromuscularTeamReadinessHistoryPoint } from "@/lib/domain/neuromuscular-team";

type Range = "4W" | "8W" | "12W" | "ALL";

type Props = {
  data: readonly NeuromuscularTeamReadinessHistoryPoint[];
  selectedSessionDate: string;
};

const RANGE_OPTIONS: Array<{ value: Range; label: string; days: number | null }> = [
  { value: "4W", label: "4 semanas", days: 28 },
  { value: "8W", label: "8 semanas", days: 56 },
  { value: "12W", label: "12 semanas", days: 84 },
  { value: "ALL", label: "Todo", days: null },
];

function toCivilDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? Date.UTC(year, month - 1, day) : Number.NaN;
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function ReadinessTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: NeuromuscularTeamReadinessHistoryPoint }>;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">
      <p className="font-black text-slate-950">{formatDate(point.sessionDate)}</p>
      <p className="mt-1">
        Readiness medio: {point.readinessMean === null ? "—" : `${point.readinessMean.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /100`}
      </p>
      <p className="mt-1 text-slate-500">{point.validPlayerCount} jugadores válidos</p>
    </div>
  );
}

export default function NeuromuscularTeamReadinessChart({
  data,
  selectedSessionDate,
}: Props) {
  const [range, setRange] = useState<Range>("8W");
  const selectedDateValue = toCivilDateValue(selectedSessionDate);
  const filteredData = useMemo(() => {
    const selectedRange = RANGE_OPTIONS.find((option) => option.value === range);
    const minimumDate = selectedRange?.days === null || selectedRange?.days === undefined
      ? Number.NEGATIVE_INFINITY
      : selectedDateValue - selectedRange.days * 24 * 60 * 60 * 1000;

    return data.filter((point) => {
      const pointDate = toCivilDateValue(point.sessionDate);
      return pointDate >= minimumDate && pointDate <= selectedDateValue;
    });
  }, [data, range, selectedDateValue]);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-black text-slate-950 sm:text-xl">
            Evolución del Readiness del equipo
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Media de Readiness PRE por sesión, hasta la fecha seleccionada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Rango temporal del gráfico">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
              className={`rounded-lg border px-3 py-2 text-xs font-black transition ${range === option.value ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
          <p className="font-black text-slate-800">Sin sesiones en este rango</p>
          <p className="mt-1 text-sm text-slate-600">
            Amplía el periodo para consultar la evolución disponible.
          </p>
        </div>
      ) : (
        <div className="mt-5 h-[280px] w-full" aria-label="Evolución temporal del Readiness PRE">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="sessionDate" tickFormatter={formatDateLabel} minTickGap={28} tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} width={34} />
              <ReferenceLine y={85} stroke="#cbd5e1" strokeDasharray="4 4" />
              <Tooltip content={<ReadinessTooltip />} />
              <Line type="monotone" dataKey="readinessMean" name="Readiness medio" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 5 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
