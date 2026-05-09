"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getGpsRecordsBySessionId,
  getGpsSessionsFromSupabase,
  type GpsRecordRow,
  type GpsSessionRow,
} from "@/lib/supabase/gps";

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

function formatMeters(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return `${Math.round(number).toLocaleString("es-ES")} m`;
}

function formatNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return Math.round(number).toLocaleString("es-ES");
}

function formatPercent(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return `${number.toFixed(1).replace(".", ",")} %`;
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
  const [sessions, setSessions] = useState<GpsSessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState<GpsRecordRow[]>([]);
  const [selectedMetric, setSelectedMetric] =
    useState<GpsMetricKey>("total_distance");
  const [playerScope, setPlayerScope] = useState<PlayerScope>("field");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const selectedMetricObjective = selectedObjective.metrics[selectedMetric];

  const selectedMetricReference = useMemo(() => {
    return getMetricReference(selectedMetric);
  }, [selectedMetric]);

  const selectedMetricObjectiveValue = useMemo(() => {
    return getObjectiveValue(selectedMetric, selectedMicrocycle);
  }, [selectedMetric, selectedMicrocycle]);

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
      });

      return {
        id: row.id,
        playerName: row.player_name,
        value,
        ...objective,
      };
    });
  }, [filteredRecords, selectedMetric, selectedMicrocycle]);

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
                      {formatMetricValue(selectedMetricReference, selectedMetric)}
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