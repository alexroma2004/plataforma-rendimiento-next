"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NeuromuscularTeamFatigueStatus } from "@/lib/domain/neuromuscular-team";

export type NeuromuscularRiskDistributionPoint = {
  status: NeuromuscularTeamFatigueStatus;
  label: string;
  count: number;
};

type Props = {
  data: readonly NeuromuscularRiskDistributionPoint[];
  classifiedPlayerCount: number;
  totalPlayerCount: number;
};

const STATUS_COLORS: Record<NeuromuscularTeamFatigueStatus, string> = {
  OPTIMAL: "#16a34a",
  GOOD: "#4ade80",
  MILD: "#f59e0b",
  MODERATE: "#f97316",
  CRITICAL: "#dc2626",
};

function RiskTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: NeuromuscularRiskDistributionPoint }>;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">
      <p className="font-black text-slate-950">{point.label}</p>
      <p className="mt-1">
        {point.count} {point.count === 1 ? "jugador" : "jugadores"}
      </p>
    </div>
  );
}

export default function NeuromuscularRiskDistributionChart({
  data,
  classifiedPlayerCount,
  totalPlayerCount,
}: Props) {
  const hasClassifiedPlayers = classifiedPlayerCount > 0;

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-black text-slate-950 sm:text-xl">
          Distribución de riesgo
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Estado PRE del equipo según pérdida media respecto al baseline.
        </p>
      </div>

      {!hasClassifiedPlayers ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
          <p className="font-black text-slate-800">Sin jugadores clasificables</p>
          <p className="mt-1 text-sm text-slate-600">
            Las cinco categorías se mostrarán cuando existan datos puntuables.
          </p>
        </div>
      ) : (
        <div className="mt-5 h-[280px] w-full" aria-label="Distribución de riesgo PRE">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} />
              <YAxis allowDecimals={false} allowDataOverflow={false} domain={[0, "auto"]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip content={<RiskTooltip />} />
              <Bar dataKey="count" name="Jugadores" radius={[6, 6, 0, 0]}>
                {data.map((point) => (
                  <Cell key={point.status} fill={STATUS_COLORS[point.status]} />
                ))}
                <LabelList dataKey="count" position="top" fill="#334155" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-3 text-xs font-bold text-slate-500">
        {classifiedPlayerCount} de {totalPlayerCount} jugadores clasificables
      </p>
    </section>
  );
}
