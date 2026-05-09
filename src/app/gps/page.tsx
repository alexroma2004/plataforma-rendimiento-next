"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getGpsMatchReferenceRecordsFromSupabase,
  getGpsRecordsBySessionId,
  getGpsSessionsFromSupabase,
  type GpsRecordRow,
  type GpsSessionRow,
} from "@/lib/supabase/gps";
import { buildGpsMatchReference } from "@/lib/gps/match-reference";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getGpsObjectiveForMicrocycle,
  getMetricReference,
  getObjectiveStatus,
  getObjectiveValue,
  type GpsObjectiveMetricKey,
  type ObjectiveStatus,
} from "@/lib/gps/objectives";

import { supabase } from "@/lib/supabase/client";

import {
  fetchGpsWeeklyEvaluations,
  type GpsWeeklyEvaluationResult,
  type GpsWeeklyMetricEvaluation,
  type GpsWeeklyPlayerEvaluation,
  type GpsWeeklyStatus,
} from "@/lib/gps/references";

function formatMeters(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return `${Math.round(number).toLocaleString("es-ES")} m`;
}

function formatNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return Math.round(number).toLocaleString("es-ES");
}

function getNumeric(value: number | null | undefined) {
  return Number(value ?? 0);
}

function sortByMetric(
  rows: GpsRecordRow[],
  metric: keyof GpsRecordRow,
): GpsRecordRow[] {
  return [...rows].sort((a, b) => {
    const valueA = Number(a[metric] ?? 0);
    const valueB = Number(b[metric] ?? 0);
    return valueB - valueA;
  });
}

type GpsMetricKey = GpsObjectiveMetricKey;

const gpsMetricOptions: {
  key: GpsMetricKey;
  label: string;
  unit: string;
}[] = [
  {
    key: "total_distance",
    label: "Distancia total",
    unit: " m",
  },
  {
    key: "hsr",
    label: "HSR",
    unit: " m",
  },
  {
    key: "distance_vrange6",
    label: "Distancia sprint",
    unit: " m",
  },
  {
    key: "sprints",
    label: "Número de sprints",
    unit: "",
  },
  {
    key: "num_acc",
    label: "Aceleraciones",
    unit: "",
  },
  {
    key: "num_dec",
    label: "Deceleraciones",
    unit: "",
  },
];

type PlayerScope = "field" | "all" | "goalkeepers";

const playerScopeOptions: {
  key: PlayerScope;
  label: string;
  description: string;
}[] = [
  {
    key: "field",
    label: "Jugadores de campo",
    description: "Excluye porteros del análisis principal.",
  },
  {
    key: "all",
    label: "Todos",
    description: "Incluye jugadores de campo y porteros.",
  },
  {
    key: "goalkeepers",
    label: "Solo porteros",
    description: "Muestra únicamente porteros.",
  },
];

function getMetricValue(row: GpsRecordRow, metric: GpsMetricKey) {
  return Number(row[metric] ?? 0);
}

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatPercent(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return `${Math.round(number)}%`;
}

function formatMetricValueForUnit(value: number, unit: string) {
  if (unit === "m" || unit === " m") {
    return formatMeters(value);
  }

  return formatNumber(value);
}

function getWeeklyStatusClass(status: GpsWeeklyStatus) {
  if (status === "BAJO") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "ALTO") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function getWeeklyMetric(
  evaluation: GpsWeeklyPlayerEvaluation,
  key: GpsMetricKey,
): GpsWeeklyMetricEvaluation | null {
  return evaluation.metrics.find((metric) => metric.key === key) ?? null;
}

function formatWeeklyMetricCell(metric: GpsWeeklyMetricEvaluation | null) {
  if (!metric) return "—";

  return `${formatMetricValueForUnit(
    metric.currentValue,
    metric.unit,
  )} · ${formatPercent(metric.percentOfReference)}`;
}

function formatWeeklyActionCell(metric: GpsWeeklyMetricEvaluation | null) {
  if (!metric) return "—";

  if (metric.status === "BAJO") {
    return `Faltan ${formatMetricValueForUnit(
      metric.missingToMinimum,
      metric.unit,
    )}`;
  }

  if (metric.status === "ALTO") {
    return `Exceso ${formatMetricValueForUnit(
      metric.excessOverMaximum,
      metric.unit,
    )}`;
  }

  return "En rango";
}

function formatMetricValue(
  value: number | null | undefined,
  metric: GpsMetricKey,
) {
  if (
    metric === "total_distance" ||
    metric === "hsr" ||
    metric === "distance_vrange6"
  ) {
    return formatMeters(value);
  }

  return formatNumber(value);
}

function getObjectiveBadgeClass(status: ObjectiveStatus) {
  if (status === "low") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "high") {
    return "bg-red-50 text-red-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function RankingCard({
  title,
  rows,
  metric,
  suffix = "",
}: {
  title: string;
  rows: GpsRecordRow[];
  metric: keyof GpsRecordRow;
  suffix?: string;
}) {
  const ranking = sortByMetric(rows, metric).slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
        {title}
      </h3>

      <div className="mt-4 space-y-3">
        {ranking.map((row, index) => (
          <div
            key={`${row.id}-${metric}`}
            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">
                {index + 1}
              </div>

              <p className="text-sm font-bold text-slate-950">
                {row.player_name}
              </p>
            </div>

            <p className="text-sm font-black text-slate-900">
              {formatNumber(Number(row[metric] ?? 0))}
              {suffix}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GpsPage() {
  const [weeklyDate, setWeeklyDate] = useState(getTodayInputDate);
  const [weeklyEvaluation, setWeeklyEvaluation] =
    useState<GpsWeeklyEvaluationResult | null>(null);
    const [selectedWeeklyPlayer, setSelectedWeeklyPlayer] = useState("");
  const [loadingWeeklyEvaluation, setLoadingWeeklyEvaluation] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<GpsSessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState<GpsRecordRow[]>([]);
  const [selectedMetric, setSelectedMetric] =
    useState<GpsMetricKey>("total_distance");
  const [playerScope, setPlayerScope] = useState<PlayerScope>("field");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [matchReferenceRecords, setMatchReferenceRecords] = useState<
    GpsRecordRow[]
  >([]);
  const [loadingMatchReference, setLoadingMatchReference] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoadingSessions(true);
        setError(null);

        const data = await getGpsSessionsFromSupabase();

        setSessions(data);

        if (data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar sesiones GPS.";

        setError(message);
      } finally {
        setLoadingSessions(false);
      }
    }

    loadSessions();
  }, []);

  useEffect(() => {
    async function loadWeeklyEvaluation() {
      if (!weeklyDate) {
        setWeeklyEvaluation(null);
        return;
      }

      if (!supabase) {
        setWeeklyError("Supabase no está configurado.");
        setWeeklyEvaluation(null);
        return;
      }

      try {
        setLoadingWeeklyEvaluation(true);
        setWeeklyError(null);

        const data = await fetchGpsWeeklyEvaluations(supabase, weeklyDate);

        setWeeklyEvaluation(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al calcular la semana GPS.";

        setWeeklyError(message);
        setWeeklyEvaluation(null);
      } finally {
        setLoadingWeeklyEvaluation(false);
      }
    }

    loadWeeklyEvaluation();
  }, [weeklyDate]);

  useEffect(() => {
    async function loadRecords() {
      if (!selectedSessionId) {
        setRecords([]);
        return;
      }

      try {
        setLoadingRecords(true);
        setError(null);

        const data = await getGpsRecordsBySessionId(selectedSessionId);
        setRecords(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar registros GPS.";

        setError(message);
      } finally {
        setLoadingRecords(false);
      }
    }

    loadRecords();
  }, [selectedSessionId]);

  useEffect(() => {
    async function loadMatchReferenceRecords() {
      try {
        setLoadingMatchReference(true);

        const data = await getGpsMatchReferenceRecordsFromSupabase();

        setMatchReferenceRecords(data);
      } catch (err) {
        console.warn("No se ha podido cargar la referencia de partido GPS:", err);
        setMatchReferenceRecords([]);
      } finally {
        setLoadingMatchReference(false);
      }
    }

    loadMatchReferenceRecords();
  }, []);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const selectedMicrocycle = selectedSession?.microcycle ?? "MD-1";

  const filteredRecords = useMemo(() => {
    if (playerScope === "all") {
      return records;
    }

    if (playerScope === "goalkeepers") {
      return records.filter((row) => row.is_goalkeeper === true);
    }

    return records.filter((row) => row.is_goalkeeper !== true);
  }, [records, playerScope]);

  const selectedPlayerScopeMeta = useMemo(() => {
    return (
      playerScopeOptions.find((option) => option.key === playerScope) ??
      playerScopeOptions[0]
    );
  }, [playerScope]);

  const selectedMetricMeta = useMemo(() => {
    return (
      gpsMetricOptions.find((option) => option.key === selectedMetric) ??
      gpsMetricOptions[0]
    );
  }, [selectedMetric]);

  const selectedObjective = useMemo(() => {
    return getGpsObjectiveForMicrocycle(selectedMicrocycle);
  }, [selectedMicrocycle]);

  const matchReference = useMemo(() => {
    return buildGpsMatchReference(matchReferenceRecords, 5);
  }, [matchReferenceRecords]);

  const selectedMetricObjective = selectedObjective.metrics[selectedMetric];

  const selectedMetricReference = useMemo(() => {
    return getMetricReference(selectedMetric, matchReference.values);
  }, [selectedMetric, matchReference.values]);

  const selectedMetricObjectiveValue = useMemo(() => {
    return getObjectiveValue(
      selectedMetric,
      selectedMicrocycle,
      matchReference.values,
    );
  }, [selectedMetric, selectedMicrocycle, matchReference.values]);

  const chartData = useMemo(() => {
    return sortByMetric(filteredRecords, selectedMetric)
      .slice(0, 12)
      .map((row) => ({
        jugador: row.player_name,
        valor: getMetricValue(row, selectedMetric),
      }));
  }, [filteredRecords, selectedMetric]);

  const objectiveRows = useMemo(() => {
    return filteredRecords.map((row) => {
      const value = getMetricValue(row, selectedMetric);

      const objective = getObjectiveStatus({
        value,
        metric: selectedMetric,
        microcycle: selectedMicrocycle,
        reference: matchReference.values,
      });

      return {
        id: row.id,
        playerName: row.player_name,
        value,
        ...objective,
      };
    });
  }, [
    filteredRecords,
    selectedMetric,
    selectedMicrocycle,
    matchReference.values,
  ]);

  const objectiveSummary = useMemo(() => {
    return objectiveRows.reduce(
      (acc, row) => {
        if (row.status === "low") acc.low += 1;
        if (row.status === "ok") acc.ok += 1;
        if (row.status === "high") acc.high += 1;

        return acc;
      },
      {
        low: 0,
        ok: 0,
        high: 0,
      },
    );
  }, [objectiveRows]);

  const weeklySummary = useMemo(() => {
    const evaluations = weeklyEvaluation?.evaluations ?? [];

    return {
      totalPlayers: evaluations.length,
      lowPlayers: evaluations.filter((row) => row.generalStatus === "BAJO")
        .length,
      targetPlayers: evaluations.filter(
        (row) => row.generalStatus === "OBJETIVO",
      ).length,
      highPlayers: evaluations.filter((row) => row.generalStatus === "ALTO")
        .length,
    };
  }, [weeklyEvaluation]);

  const weeklyPlayerOptions = useMemo(() => {
  return weeklyEvaluation?.evaluations ?? [];
}, [weeklyEvaluation]);

const selectedWeeklyPlayerEvaluation = useMemo(() => {
  const evaluations = weeklyEvaluation?.evaluations ?? [];

  if (evaluations.length === 0) return null;

  if (!selectedWeeklyPlayer) {
    return evaluations[0];
  }

  return (
    evaluations.find(
      (evaluation) => evaluation.normalizedName === selectedWeeklyPlayer,
    ) ?? evaluations[0]
  );
}, [weeklyEvaluation, selectedWeeklyPlayer]);

  const summary = useMemo(() => {
    const players = filteredRecords.length;

    const totalDistance = filteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.total_distance),
      0,
    );

    const totalHsr = filteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.hsr),
      0,
    );

    const totalSprintDistance = filteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.distance_vrange6),
      0,
    );

    const totalSprints = filteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.sprints),
      0,
    );

    const totalAcc = filteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.num_acc),
      0,
    );

    const totalDec = filteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.num_dec),
      0,
    );

    const averageDistance = players > 0 ? totalDistance / players : 0;

    return {
      players,
      totalDistance,
      averageDistance,
      totalHsr,
      totalSprintDistance,
      totalSprints,
      totalAcc,
      totalDec,
    };
  }, [filteredRecords]);

useEffect(() => {
  const evaluations = weeklyEvaluation?.evaluations ?? [];

  if (evaluations.length === 0) {
    setSelectedWeeklyPlayer("");
    return;
  }

  const selectedExists = evaluations.some(
    (evaluation) => evaluation.normalizedName === selectedWeeklyPlayer,
  );

  if (!selectedExists) {
    setSelectedWeeklyPlayer(evaluations[0].normalizedName);
  }
}, [weeklyEvaluation, selectedWeeklyPlayer]);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-950">
      <section className="rounded-2xl bg-slate-950 p-8 text-white shadow">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
          Plataforma de rendimiento
        </p>

        <h1 className="mt-3 text-4xl font-black">GPS</h1>

        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200">
          Análisis de sesiones GPS guardadas en Supabase. Consulta el resumen de
          carga externa, rankings individuales, referencia de partido y
          objetivos por microciclo.
        </p>
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
              Sesiones guardadas
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Seleccionar sesión GPS
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Selecciona una sesión para visualizar los registros importados.
            </p>
          </div>

          <div className="w-full md:w-[420px]">
            <label className="text-sm font-bold text-slate-700">
              Sesión
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                disabled={loadingSessions || sessions.length === 0}
              >
                {sessions.length === 0 && (
                  <option value="">No hay sesiones GPS guardadas</option>
                )}

                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_date} · {session.microcycle ?? "N/A"} ·{" "}
                    {session.session_name ?? "Sesión sin nombre"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loadingSessions && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
            Cargando sesiones GPS...
          </div>
        )}

        {!loadingSessions && sessions.length === 0 && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
            Todavía no hay sesiones GPS guardadas. Primero sube una sesión desde
            la página Cargar datos.
          </div>
        )}

        {selectedSession && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Fecha</p>
              <p className="mt-2 text-2xl font-black">
                {selectedSession.session_date}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Microciclo</p>
              <p className="mt-2 text-2xl font-black">
                {selectedSession.microcycle ?? "N/A"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Nombre</p>
              <p className="mt-2 text-2xl font-black">
                {selectedSession.session_name ?? "Sesión GPS"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Tipo</p>
              <p className="mt-2 text-2xl font-black">
                {selectedSession.is_match ? "Partido" : "Entrenamiento"}
              </p>
            </div>
          </div>
        )}

        {selectedSession && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                  Filtro de análisis
                </p>

                <h3 className="mt-2 text-lg font-black text-slate-950">
                  Población analizada
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  {selectedPlayerScopeMeta.description}
                </p>
              </div>

              <label className="w-full text-sm font-bold text-slate-700 md:w-[320px]">
                Analizar
                <select
                  value={playerScope}
                  onChange={(event) =>
                    setPlayerScope(event.target.value as PlayerScope)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {playerScopeOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500">
                  Registros totales
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {records.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500">
                  Registros analizados
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {filteredRecords.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500">
                  Registros excluidos
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {records.length - filteredRecords.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {selectedSessionId && (
        <section className="mt-8">
          {loadingRecords ? (
            <div className="rounded-2xl bg-white p-6 text-sm font-bold text-slate-600 shadow">
              Cargando registros de la sesión...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">
                    Jugadores
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {summary.players}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">
                    Distancia total
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatMeters(summary.totalDistance)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">
                    HSR total
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatMeters(summary.totalHsr)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">
                    Sprint total
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatMeters(summary.totalSprintDistance)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">
                    Distancia media
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatMeters(summary.averageDistance)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">
                    Sprints totales
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatNumber(summary.totalSprints)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">
                    Aceleraciones
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatNumber(summary.totalAcc)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">
                    Deceleraciones
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatNumber(summary.totalDec)}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                      Carga semanal GPS
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      Qué le falta por hacer esta semana
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm text-slate-600">
                      La aplicación calcula la carga acumulada de lunes a
                      domingo y la compara con la referencia de partido del
                      jugador. Si no existe referencia propia suficiente, usa
                      referencia posicional o general.
                    </p>
                  </div>

                  <label className="w-full text-sm font-bold text-slate-700 md:w-[260px]">
                    Fecha de la semana
                    <input
                      type="date"
                      value={weeklyDate}
                      onChange={(event) => setWeeklyDate(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                {weeklyError && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    {weeklyError}
                  </div>
                )}

                {loadingWeeklyEvaluation && (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
                    Calculando carga semanal GPS...
                  </div>
                )}

                {!loadingWeeklyEvaluation && weeklyEvaluation && (
                  <>
                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-500">
                          Semana
                        </p>
                        <p className="mt-2 text-lg font-black">
                          {weeklyEvaluation.weekStart} /{" "}
                          {weeklyEvaluation.weekEnd}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-500">
                          Jugadores
                        </p>
                        <p className="mt-2 text-3xl font-black">
                          {weeklySummary.totalPlayers}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-bold text-emerald-700">
                          En objetivo
                        </p>
                        <p className="mt-2 text-3xl font-black text-emerald-800">
                          {weeklySummary.targetPlayers}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-bold text-amber-700">
                          Por debajo
                        </p>
                        <p className="mt-2 text-3xl font-black text-amber-800">
                          {weeklySummary.lowPlayers}
                        </p>
                      </div>
                    </div>

{selectedWeeklyPlayerEvaluation && (
  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
          Detalle individual
        </p>

        <h3 className="mt-2 text-lg font-black text-slate-950">
          Lectura semanal por jugador
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          Visualiza qué porcentaje de la referencia semanal lleva acumulado el
          jugador y qué le falta por completar.
        </p>
      </div>

      <label className="w-full text-sm font-bold text-slate-700 md:w-[320px]">
        Jugador
        <select
          value={selectedWeeklyPlayerEvaluation.normalizedName}
          onChange={(event) => setSelectedWeeklyPlayer(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
        >
          {weeklyPlayerOptions.map((evaluation) => (
            <option
              key={evaluation.normalizedName}
              value={evaluation.normalizedName}
            >
              {evaluation.playerName}
            </option>
          ))}
        </select>
      </label>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold text-slate-500">Jugador</p>
        <p className="mt-2 text-xl font-black text-slate-950">
          {selectedWeeklyPlayerEvaluation.playerName}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          {selectedWeeklyPlayerEvaluation.position ?? "Sin posición"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold text-slate-500">Estado general</p>
        <span
          className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getWeeklyStatusClass(
            selectedWeeklyPlayerEvaluation.generalStatus,
          )}`}
        >
          {selectedWeeklyPlayerEvaluation.generalStatus}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold text-slate-500">Referencia</p>
        <p className="mt-2 text-lg font-black text-slate-950">
          {selectedWeeklyPlayerEvaluation.referenceSource}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold text-slate-500">Partidos válidos</p>
        <p className="mt-2 text-3xl font-black text-slate-950">
          {selectedWeeklyPlayerEvaluation.referenceValidMatches}
        </p>
      </div>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {selectedWeeklyPlayerEvaluation.metrics.map((metric) => {
        const progress = Math.min(
          Math.max(metric.percentOfReference, 0),
          140,
        );

        return (
          <div
            key={metric.key}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">
                  {metric.label}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {formatWeeklyMetricCell(metric)}
                </p>
              </div>

              <span
                className={`rounded-full border px-2 py-1 text-[10px] font-black ${getWeeklyStatusClass(
                  metric.status,
                )}`}
              >
                {metric.status}
              </span>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-950"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>0%</span>
              <span>{formatPercent(metric.percentOfReference)}</span>
              <span>100%</span>
            </div>

            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
              {formatWeeklyActionCell(metric)}
            </p>
          </div>
        );
      })}
    </div>
  </div>
)}

                    {weeklyEvaluation.evaluations.length === 0 ? (
                      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                        No hay registros GPS de entrenamiento para la semana
                        seleccionada.
                      </div>
                    ) : (
                      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="max-h-[520px] overflow-auto">
                          <table className="w-full min-w-[1300px] border-collapse text-left text-sm">
                            <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Jugador</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Distancia</th>
                                <th className="px-4 py-3">HSR</th>
                                <th className="px-4 py-3">Sprint</th>
                                <th className="px-4 py-3">Sprints</th>
                                <th className="px-4 py-3">ACC</th>
                                <th className="px-4 py-3">DEC</th>
                                <th className="px-4 py-3">Referencia</th>
                              </tr>
                            </thead>

                            <tbody>
                              {weeklyEvaluation.evaluations.map(
                                (evaluation) => {
                                  const totalDistance = getWeeklyMetric(
                                    evaluation,
                                    "total_distance",
                                  );
                                  const hsr = getWeeklyMetric(
                                    evaluation,
                                    "hsr",
                                  );
                                  const sprintDistance = getWeeklyMetric(
                                    evaluation,
                                    "distance_vrange6",
                                  );
                                  const sprints = getWeeklyMetric(
                                    evaluation,
                                    "sprints",
                                  );
                                  const acc = getWeeklyMetric(
                                    evaluation,
                                    "num_acc",
                                  );
                                  const dec = getWeeklyMetric(
                                    evaluation,
                                    "num_dec",
                                  );

                                  return (
                                    <tr
                                      key={evaluation.normalizedName}
                                      className="border-t border-slate-100"
                                    >
                                      <td className="px-4 py-3">
                                        <p className="font-black text-slate-950">
                                          {evaluation.playerName}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {evaluation.position ??
                                            "Sin posición"}
                                        </p>
                                      </td>

                                      <td className="px-4 py-3">
                                        <span
                                          className={`rounded-full border px-3 py-1 text-xs font-black ${getWeeklyStatusClass(
                                            evaluation.generalStatus,
                                          )}`}
                                        >
                                          {evaluation.generalStatus}
                                        </span>
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-black">
                                          {formatWeeklyMetricCell(
                                            totalDistance,
                                          )}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {formatWeeklyActionCell(
                                            totalDistance,
                                          )}
                                        </p>
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-black">
                                          {formatWeeklyMetricCell(hsr)}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {formatWeeklyActionCell(hsr)}
                                        </p>
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-black">
                                          {formatWeeklyMetricCell(
                                            sprintDistance,
                                          )}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {formatWeeklyActionCell(
                                            sprintDistance,
                                          )}
                                        </p>
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-black">
                                          {formatWeeklyMetricCell(sprints)}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {formatWeeklyActionCell(sprints)}
                                        </p>
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-black">
                                          {formatWeeklyMetricCell(acc)}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {formatWeeklyActionCell(acc)}
                                        </p>
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-black">
                                          {formatWeeklyMetricCell(dec)}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {formatWeeklyActionCell(dec)}
                                        </p>
                                      </td>

                                      <td className="px-4 py-3">
                                        <p className="font-black">
                                          {evaluation.referenceSource}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          Partidos válidos:{" "}
                                          {
                                            evaluation.referenceValidMatches
                                          }
                                        </p>
                                      </td>
                                    </tr>
                                  );
                                },
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                      Objetivos GPS
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      Referencia de partido y objetivo del microciclo
                    </h2>

                    <p className="mt-2 max-w-4xl text-sm text-slate-600">
                      Para cada métrica se compara la carga realizada con una
                      referencia media de partido y con el rango objetivo
                      estimado para el día de microciclo seleccionado.
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-700">
                      {selectedObjective.label}: {selectedObjective.description}
                    </p>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Origen de la referencia de partido
                      </p>

                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {loadingMatchReference
                          ? "Cargando referencia de partido..."
                          : matchReference.source === "dynamic"
                            ? "Referencia propia calculada desde partidos guardados"
                            : "Referencia fija provisional"}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {matchReference.reason}
                      </p>

                      <p className="mt-2 text-xs font-bold text-slate-500">
                        Partidos válidos: {matchReference.validMatchSessions}/
                        {matchReference.minimumMatchesRequired} · Registros
                        válidos: {matchReference.validRecords}
                      </p>
                    </div>
                  </div>

                  <label className="w-full text-sm font-bold text-slate-700 md:w-[320px]">
                    Métrica
                    <select
                      value={selectedMetric}
                      onChange={(event) =>
                        setSelectedMetric(event.target.value as GpsMetricKey)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    >
                      {gpsMetricOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">
                      Referencia partido
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {formatMetricValue(
                        selectedMetricReference,
                        selectedMetric,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">
                      Objetivo {selectedObjective.label}
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {formatPercent(selectedMetricObjective.targetPercent)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">
                      Rango adecuado
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {formatPercent(selectedMetricObjective.minPercent)} -{" "}
                      {formatPercent(selectedMetricObjective.maxPercent)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500">
                      Jugadores en rango
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {objectiveSummary.ok}/{filteredRecords.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-bold text-amber-700">
                      Por debajo
                    </p>
                    <p className="mt-1 text-2xl font-black text-amber-700">
                      {objectiveSummary.low}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-bold text-emerald-700">
                      Adecuado
                    </p>
                    <p className="mt-1 text-2xl font-black text-emerald-700">
                      {objectiveSummary.ok}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-bold text-red-700">
                      Por encima
                    </p>
                    <p className="mt-1 text-2xl font-black text-red-700">
                      {objectiveSummary.high}
                    </p>
                  </div>
                </div>

                <div className="mt-6 h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 30,
                        left: 80,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        type="number"
                        tickFormatter={(value) =>
                          Math.round(Number(value)).toLocaleString("es-ES")
                        }
                      />

                      <YAxis
                        type="category"
                        dataKey="jugador"
                        width={120}
                        tick={{
                          fontSize: 12,
                        }}
                      />

                      <Tooltip
                        formatter={(value) => {
                          const number = Math.round(
                            Number(value ?? 0),
                          ).toLocaleString("es-ES");

                          return [
                            `${number}${selectedMetricMeta.unit}`,
                            selectedMetricMeta.label,
                          ];
                        }}
                      />

                      <ReferenceLine
                        x={selectedMetricObjectiveValue}
                        strokeDasharray="4 4"
                        label="Objetivo"
                      />

                      <Bar dataKey="valor" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-lg font-black">
                      Cumplimiento individual del objetivo
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Comparación de cada jugador con el objetivo de{" "}
                      {selectedMetricMeta.label} para {selectedObjective.label}.
                    </p>
                  </div>

                  <div className="max-h-[420px] overflow-auto">
                    <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Jugador</th>
                          <th className="px-4 py-3">Realizado</th>
                          <th className="px-4 py-3">% partido</th>
                          <th className="px-4 py-3">Objetivo</th>
                          <th className="px-4 py-3">Diferencia</th>
                          <th className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>

                      <tbody>
                        {objectiveRows.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-black">
                              {row.playerName}
                            </td>

                            <td className="px-4 py-3">
                              {formatMetricValue(row.value, selectedMetric)}
                            </td>

                            <td className="px-4 py-3">
                              {formatPercent(row.percent)}
                            </td>

                            <td className="px-4 py-3">
                              {formatPercent(row.targetPercent)}
                            </td>

                            <td className="px-4 py-3">
                              {formatPercent(row.differenceToTarget)}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${getObjectiveBadgeClass(
                                  row.status,
                                )}`}
                              >
                                {row.label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 xl:grid-cols-3">
                <RankingCard
                  title="Ranking distancia"
                  rows={filteredRecords}
                  metric="total_distance"
                  suffix=" m"
                />

                <RankingCard
                  title="Ranking HSR"
                  rows={filteredRecords}
                  metric="hsr"
                  suffix=" m"
                />

                <RankingCard
                  title="Ranking sprint"
                  rows={filteredRecords}
                  metric="distance_vrange6"
                  suffix=" m"
                />

                <RankingCard
                  title="Ranking sprints"
                  rows={filteredRecords}
                  metric="sprints"
                />

                <RankingCard
                  title="Ranking aceleraciones"
                  rows={filteredRecords}
                  metric="num_acc"
                />

                <RankingCard
                  title="Ranking deceleraciones"
                  rows={filteredRecords}
                  metric="num_dec"
                />
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-black">Registros por jugador</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Tabla completa de la sesión GPS seleccionada.
                  </p>
                </div>

                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Jugador</th>
                        <th className="px-4 py-3">Posición</th>
                        <th className="px-4 py-3">Portero</th>
                        <th className="px-4 py-3">Min</th>
                        <th className="px-4 py-3">Distancia</th>
                        <th className="px-4 py-3">HSR</th>
                        <th className="px-4 py-3">Sprint</th>
                        <th className="px-4 py-3">Sprints</th>
                        <th className="px-4 py-3">ACC</th>
                        <th className="px-4 py-3">DEC</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRecords.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-black">
                            {row.player_name}
                          </td>

                          <td className="px-4 py-3">
                            {row.position ?? "—"}
                          </td>

                          <td className="px-4 py-3">
                            {row.is_goalkeeper ? "Sí" : "No"}
                          </td>

                          <td className="px-4 py-3">
                            {row.time_played
                              ? formatNumber(row.time_played)
                              : "—"}
                          </td>

                          <td className="px-4 py-3">
                            {formatMeters(row.total_distance)}
                          </td>

                          <td className="px-4 py-3">{formatMeters(row.hsr)}</td>

                          <td className="px-4 py-3">
                            {formatMeters(row.distance_vrange6)}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(row.sprints)}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(row.num_acc)}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(row.num_dec)}
                          </td>

                          <td className="px-4 py-3">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                              {row.gps_status ?? "OK"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}