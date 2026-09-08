"use client";

import { useMemo } from "react";
import EmptyState from "@/components/ui/EmptyState";
import type { NeuromuscularTeamPlayerSnapshot } from "@/lib/domain/neuromuscular-team";
import {
  NEUROMUSCULAR_STATUS_ORDER,
  NEUROMUSCULAR_STATUS_VISUALS,
} from "@/lib/ui/neuromuscular-status";

type Props = {
  playerSnapshots: readonly NeuromuscularTeamPlayerSnapshot[];
};

function isValidScore(score: number | null): score is number {
  return score === 0 || score === 1 || score === 2 || score === 3;
}

function comparePlayers(first: NeuromuscularTeamPlayerSnapshot, second: NeuromuscularTeamPlayerSnapshot) {
  const firstScore = first.objectiveLossScore;
  const secondScore = second.objectiveLossScore;
  if (isValidScore(firstScore) && isValidScore(secondScore)) {
    if (firstScore !== secondScore) return secondScore - firstScore;
  } else if (isValidScore(firstScore)) {
    return -1;
  } else if (isValidScore(secondScore)) {
    return 1;
  }
  return first.displayName.localeCompare(second.displayName, "es", { sensitivity: "base" });
}

function formatLoss(value: number | null) {
  return value !== null && Number.isFinite(value)
    ? `${value.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
    : "No disponible";
}

export default function NeuromuscularTeamLossRanking({ playerSnapshots }: Props) {
  const players = useMemo(() => [...playerSnapshots].sort(comparePlayers), [playerSnapshots]);
  const hasScores = players.some((player) => isValidScore(player.objectiveLossScore));

  return (
    <section className="min-w-0 w-full space-y-4 border-t border-slate-200 bg-white py-5" aria-labelledby="team-loss-ranking-title">
      <header className="px-4 sm:px-5">
        <h2 id="team-loss-ranking-title" className="text-xl font-bold text-slate-950">Objective Loss Score por jugador</h2>
        <p className="mt-1 text-sm text-slate-600">Número de variables neuromusculares con pérdida relevante por jugador</p>
      </header>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 px-4 text-xs text-slate-700 sm:px-5" aria-label="Estados globales">
        {NEUROMUSCULAR_STATUS_ORDER.map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: NEUROMUSCULAR_STATUS_VISUALS[status].chartColor }} />
            {NEUROMUSCULAR_STATUS_VISUALS[status].label}
          </li>
        ))}
      </ul>
      {players.length === 0 ? (
        <EmptyState title="Sin jugadores" description="No hay jugadores disponibles para calcular Objective Loss Score." />
      ) : (
        <div className="px-4 sm:px-5">
          {!hasScores && <p className="mb-3 text-sm text-slate-600">No hay Objective Loss Score calculable en esta sesión.</p>}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.5rem] gap-3 pb-2 text-xs text-slate-500" aria-hidden="true">
            <span>Jugador</span>
            <div className="relative h-4">
              {[0, 1, 2, 3].map((tick) => <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${tick / 3 * 100}%` }}>{tick}</span>)}
            </div>
            <span className="text-right">OLS</span>
          </div>
          <ol className="divide-y divide-slate-100">
            {players.map((player) => {
              const score = player.objectiveLossScore;
              const valid = isValidScore(score);
              const visual = valid && player.fatigueStatus !== null
                ? NEUROMUSCULAR_STATUS_VISUALS[player.fatigueStatus] : null;
              const stateLabel = visual?.label ?? (valid ? "Sin clasificación" : "Sin datos suficientes");
              const alteredLabel = valid ? `${score} ${score === 1 ? "variable alterada" : "variables alteradas"}` : "Variables alteradas: no disponible";
              return (
                <li key={player.playerId} className="group relative grid min-h-10 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.5rem] items-center gap-3 py-2 text-sm focus:outline-2 focus:outline-blue-600" tabIndex={0}>
                  <span className="min-w-0 break-words font-medium text-slate-800">{player.displayName}</span>
                  <div className="relative flex h-6 items-center" aria-hidden="true">
                    {[0, 1, 2, 3].map((tick) => <span key={tick} className="absolute inset-y-0 border-l border-slate-200" style={{ left: `${tick / 3 * 100}%` }} />)}
                    {valid && (
                      <span className={`relative h-3 rounded-r-sm ${visual ? "" : "bg-slate-400"}`} style={{ width: `${score / 3 * 100}%`, backgroundColor: visual?.chartColor }} />
                    )}
                    {score === 0 && <span className={`absolute left-0 h-2 w-2 -translate-x-1/2 rounded-full ${visual ? "" : "bg-slate-400"}`} style={{ backgroundColor: visual?.chartColor }} />}
                  </div>
                  <span className="text-right font-semibold tabular-nums text-slate-800">{valid ? score : "—"}</span>
                  <span className="sr-only">Objective Loss Score, escala de 0 a 3. {stateLabel}.</span>
                  <div className="pointer-events-none absolute inset-x-0 bottom-full z-30 hidden rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 shadow-md group-hover:block group-focus:block">
                    <p className="break-words font-semibold text-slate-950">{player.displayName}</p>
                    <p>Objective Loss Score: {valid ? `${score} / 3` : "No disponible"}</p>
                    <p>{alteredLabel}</p>
                    <p>{player.availableMetricCount} de 3 variables puntuables</p>
                    <p>Estado: {stateLabel}</p>
                    <p>Pérdida media: {formatLoss(player.meanLossPercent)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
