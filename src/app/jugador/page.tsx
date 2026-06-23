"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
import {
  getPlayerDashboardData,
  type PlayerDashboardData,
  type PlayerDashboardGpsRecord,
  type PlayerDashboardNeuromuscularRecord,
  type PlayerDashboardTestScore,
} from "@/lib/supabase/player-dashboard";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const emptyPlayerDashboardData: PlayerDashboardData = {
  players: [],
  gpsRecords: [],
  neuromuscularRecords: [],
  testScores: [],
  testResults: [],
};

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const number = Number(value);

  return number.toLocaleString("es-ES", {
    minimumFractionDigits: Number.isInteger(number) ? 0 : decimals,
    maximumFractionDigits: decimals,
  });
}

function formatMeters(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return `${Math.round(Number(value)).toLocaleString("es-ES")} m`;
}

function formatValue(value: number | null | undefined, unit: string | null) {
  if (value === null || value === undefined) return "—";

  const formatted = formatNumber(value, 2);

  return unit ? `${formatted} ${unit}` : formatted;
}

function average(values: Array<number | null | undefined>) {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function getLatestRecord<T extends { session_date: string }>(records: T[]) {
  return [...records].sort((a, b) =>
    b.session_date.localeCompare(a.session_date),
  )[0] ?? null;
}

function getDifferencePercent(
  currentValue: number | null | undefined,
  referenceValue: number | null | undefined,
) {
  if (
    currentValue === null ||
    currentValue === undefined ||
    referenceValue === null ||
    referenceValue === undefined ||
    Number(referenceValue) === 0
  ) {
    return null;
  }

  return (
    ((Number(currentValue) - Number(referenceValue)) /
      Number(referenceValue)) *
    100
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(1).replace(".", ",")}%`;
}

function getStatusClass(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (value <= -10) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value <= -5) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getStatusLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "Sin referencia";
  if (value <= -10) return "Alerta";
  if (value <= -5) return "Control";
  return "OK";
}

function getClassificationClass(classification: string | null | undefined) {
  const text = String(classification ?? "").toLowerCase();

  if (
    text.includes("excelente") ||
    text.includes("óptimo") ||
    text.includes("optimo") ||
    text.includes("muy alto") ||
    text.includes("alto") ||
    text.includes("bueno") ||
    text.includes("ok")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    text.includes("medio") ||
    text.includes("moderado") ||
    text.includes("aceptable") ||
    text.includes("normal")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    text.includes("bajo") ||
    text.includes("deficiente") ||
    text.includes("riesgo") ||
    text.includes("malo") ||
    text.includes("insuficiente")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

type QuickReadingCard = {
  title: string;
  variant: "info" | "warning";
  message: string;
};

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold text-slate-500">{title}</p>

      <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs font-bold text-slate-500">{description}</p>
      )}
    </div>
  );
}


export default function JugadorPage() {
  const [data, setData] = useState<PlayerDashboardData>(
    emptyPlayerDashboardData,
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const dashboardData = await getPlayerDashboardData();

      setData(dashboardData);

      if (!selectedPlayerId && dashboardData.players.length > 0) {
        setSelectedPlayerId(dashboardData.players[0].id);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar el panel del jugador.";

      setError(message);
      setData(emptyPlayerDashboardData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedPlayer = useMemo(() => {
    return data.players.find((player) => player.id === selectedPlayerId) ?? null;
  }, [data.players, selectedPlayerId]);

  const playerGpsRecords = useMemo(() => {
    return data.gpsRecords.filter(
      (record) => record.player_id === selectedPlayerId,
    );
  }, [data.gpsRecords, selectedPlayerId]);

  const playerNeuromuscularRecords = useMemo(() => {
    return data.neuromuscularRecords.filter(
      (record) => record.player_id === selectedPlayerId,
    );
  }, [data.neuromuscularRecords, selectedPlayerId]);

  const playerTestScores = useMemo(() => {
    return data.testScores.filter(
      (score) => score.player_id === selectedPlayerId,
    );
  }, [data.testScores, selectedPlayerId]);

  const playerTestResults = useMemo(() => {
    return data.testResults.filter(
      (result) => result.player_id === selectedPlayerId,
    );
  }, [data.testResults, selectedPlayerId]);

  const latestNeuromuscularRecord = useMemo(() => {
    return getLatestRecord(playerNeuromuscularRecords);
  }, [playerNeuromuscularRecords]);

  const summary = useMemo(() => {
    const totalDistance = playerGpsRecords.reduce(
      (sum, record) => sum + Number(record.total_distance ?? 0),
      0,
    );

    const totalHsr = playerGpsRecords.reduce(
      (sum, record) => sum + Number(record.hsr ?? 0),
      0,
    );

    const totalSprint = playerGpsRecords.reduce(
      (sum, record) => sum + Number(record.distance_vrange6 ?? 0),
      0,
    );

    const averageCmj = average(
      playerNeuromuscularRecords.map((record) => record.cmj_pre),
    );

    const averageRsimod = average(
      playerNeuromuscularRecords.map((record) => record.rsimod_pre),
    );

    const averageVmp = average(
      playerNeuromuscularRecords.map((record) => record.vmp_pre),
    );

    const averageTestScore = average(
      playerTestScores.map((score) => score.final_score),
    );

    const cmjDifference = getDifferencePercent(
      latestNeuromuscularRecord?.cmj_pre,
      averageCmj,
    );

    return {
      gpsSessions: playerGpsRecords.length,
      neuromuscularControls: playerNeuromuscularRecords.length,
      testScores: playerTestScores.length,
      testResults: playerTestResults.length,
      totalDistance,
      totalHsr,
      totalSprint,
      averageCmj,
      averageRsimod,
      averageVmp,
      averageTestScore,
      latestCmj: latestNeuromuscularRecord?.cmj_pre ?? null,
      latestRsimod: latestNeuromuscularRecord?.rsimod_pre ?? null,
      latestVmp: latestNeuromuscularRecord?.vmp_pre ?? null,
      latestRpe: latestNeuromuscularRecord?.rpe ?? null,
      cmjDifference,
    };
  }, [
    playerGpsRecords,
    playerNeuromuscularRecords,
    playerTestScores,
    playerTestResults,
    latestNeuromuscularRecord,
  ]);

  const gpsChartData = useMemo(() => {
    return [...playerGpsRecords]
      .sort((a, b) => a.session_date.localeCompare(b.session_date))
      .map((record: PlayerDashboardGpsRecord) => ({
        fecha: record.session_date,
        md: record.microcycle ?? "—",
        distancia: Number(record.total_distance ?? 0),
        hsr: Number(record.hsr ?? 0),
        sprint: Number(record.distance_vrange6 ?? 0),
      }));
  }, [playerGpsRecords]);

  const neuromuscularChartData = useMemo(() => {
    return [...playerNeuromuscularRecords]
      .sort((a, b) => a.session_date.localeCompare(b.session_date))
      .map((record: PlayerDashboardNeuromuscularRecord) => ({
        fecha: record.session_date,
        md: record.microcycle,
        cmjPre: record.cmj_pre,
        cmjPost: record.cmj_post,
        rsimodPre: record.rsimod_pre,
        rsimodPost: record.rsimod_post,
        vmpPre: record.vmp_pre,
        vmpPost: record.vmp_post,
      }));
  }, [playerNeuromuscularRecords]);

  const testChartData = useMemo(() => {
    return playerTestScores.map((score: PlayerDashboardTestScore) => ({
      capacidad: score.capacity,
      puntuacion: Number(score.final_score ?? 0),
    }));
  }, [playerTestScores]);

  const quickPlayerReadingCards = useMemo<QuickReadingCard[]>(() => {
    const latestGpsSession = gpsChartData[gpsChartData.length - 1] ?? null;
    const previousGpsSession = gpsChartData[gpsChartData.length - 2] ?? null;
    const gpsDifference = getDifferencePercent(
      latestGpsSession?.distancia,
      previousGpsSession?.distancia,
    );
    const gpsComparisonMessage = !previousGpsSession
      ? "Todavía no hay una sesión anterior para realizar una comparación prudente."
      : gpsDifference === null
        ? "No se puede calcular una variación válida frente a la sesión anterior."
        : gpsDifference === 0
          ? "La distancia fue igual a la sesión anterior."
          : `La distancia fue un ${formatPercent(
              Math.abs(gpsDifference),
            )} ${gpsDifference > 0 ? "mayor" : "menor"} que en la sesión anterior.`;
    const gpsMessage = latestGpsSession
      ? `En la última sesión GPS registrada (${
          latestGpsSession.fecha
        }) acumuló ${formatMeters(
          latestGpsSession.distancia,
        )}, con ${formatMeters(latestGpsSession.hsr)} de HSR y ${formatMeters(
          latestGpsSession.sprint,
        )} de sprint. ${gpsComparisonMessage} La lectura puede variar por minutos, composición de la sesión y exposición real.`
      : "No hay registros GPS disponibles para realizar una lectura reciente.";
    const neuromuscularValues = [
      summary.latestCmj === null
        ? null
        : `CMJ ${formatNumber(summary.latestCmj, 2)}`,
      summary.latestRsimod === null
        ? null
        : `RSI mod ${formatNumber(summary.latestRsimod, 2)}`,
      summary.latestVmp === null
        ? null
        : `VMP ${formatNumber(summary.latestVmp, 3)}`,
      summary.latestRpe === null
        ? null
        : `RPE ${formatNumber(summary.latestRpe, 1)}`,
    ].filter((value): value is string => Boolean(value));
    const cmjMessage =
      summary.cmjDifference === null
        ? "El CMJ no dispone de una referencia individual válida."
        : summary.cmjDifference === 0
          ? "El CMJ coincide con la media individual disponible."
          : `El CMJ se sitúa un ${formatPercent(
              Math.abs(summary.cmjDifference),
            )} ${
              summary.cmjDifference > 0 ? "por encima" : "por debajo"
            } de su media individual (${getStatusLabel(
              summary.cmjDifference,
            )}).`;
    const neuromuscularMessage =
      summary.neuromuscularControls === 0
        ? "No hay controles neuromusculares disponibles para realizar una lectura reciente."
        : neuromuscularValues.length === 0
          ? "El último control disponible no contiene valores válidos de CMJ, RSI mod, VMP o RPE."
          : `En el último control disponible: ${neuromuscularValues.join(
              ", ",
            )}. ${cmjMessage} Conviene revisar la tendencia y no interpretar una medición de forma aislada.`;
    const testsMessage =
      summary.testScores === 0
        ? "No hay puntuaciones de tests disponibles para realizar una lectura general."
        : summary.averageTestScore === null
          ? "Hay puntuaciones registradas, pero no permiten calcular una media válida."
          : `Hay ${summary.testScores} puntuaciones disponibles, con una media global de ${formatNumber(
              summary.averageTestScore,
              1,
            )}. Deben revisarse por capacidades y según la cobertura de variables disponible.`;
    const needsCmjReview =
      summary.cmjDifference !== null && summary.cmjDifference <= -5;
    const recommendationMessage = needsCmjReview
      ? "Revisar el próximo control y contrastar la variación de CMJ con GPS, RSI mod, VMP y RPE antes de ajustar la carga; una señal aislada no diagnostica fatiga, lesión ni riesgo."
      : summary.gpsSessions > 0 && summary.neuromuscularControls > 0
        ? "Cruzar los últimos registros de GPS, CMJ, RSI mod, VMP y RPE antes de tomar decisiones, incorporando también los tests físicos disponibles."
        : "Completar los módulos sin registros y evitar conclusiones a partir de un único indicador; los datos disponibles no diagnostican fatiga, lesión ni riesgo.";

    return [
      {
        title: "GPS reciente",
        variant: "info",
        message: gpsMessage,
      },
      {
        title: "Estado neuromuscular",
        variant: needsCmjReview ? "warning" : "info",
        message: neuromuscularMessage,
      },
      {
        title: "Tests físicos",
        variant: "info",
        message: testsMessage,
      },
      {
        title: "Recomendación para el staff",
        variant: needsCmjReview ? "warning" : "info",
        message: recommendationMessage,
      },
    ];
  }, [gpsChartData, summary]);

  const hasPlayerPerformanceData =
    summary.gpsSessions > 0 ||
    summary.neuromuscularControls > 0 ||
    summary.testScores > 0;

  return (
    <AppShell
      title="Jugador"
      subtitle="Panel individual del jugador. Integra carga GPS, evolución neuromuscular y resultados de tests físicos para analizar el estado del deportista de forma completa."
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Selección individual
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Seleccionar jugador
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Escoge un jugador para visualizar todos sus datos integrados.
              </p>
            </div>

            <label className="w-full text-sm font-bold text-slate-700 md:w-[420px]">
              Jugador
              <select
                value={selectedPlayerId}
                onChange={(event) => setSelectedPlayerId(event.target.value)}
                disabled={loading || data.players.length === 0}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                {data.players.length === 0 && (
                  <option value="">No hay jugadores activos</option>
                )}

                {data.players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} · {player.position ?? "Sin posición"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="mt-6">
              <StatusMessage variant="error" title="No se ha podido cargar el jugador">
                {error}
              </StatusMessage>
            </div>
          )}

          {loading && (
            <div className="mt-6">
              <StatusMessage variant="info" title="Cargando panel individual">
                Cargando jugadores, registros GPS, controles neuromusculares, tests y
                resultados por variable.
              </StatusMessage>
            </div>
          )}

          {!loading && !error && !selectedPlayer && (
            <div className="mt-6">
              <EmptyState
                title="Sin jugador seleccionado"
                description="No hay ningún jugador disponible para mostrar en el panel individual."
              />
            </div>
          )}

          {!loading && !error && selectedPlayer && (
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Jugador</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedPlayer.name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Posición</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedPlayer.position ?? "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Estado</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedPlayer.active ? "Activo" : "Inactivo"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">
                  Nombre normalizado
                </p>
                <p className="mt-2 break-all text-sm font-black text-slate-950">
                  {selectedPlayer.normalized_name}
                </p>
              </div>
            </div>
          )}
        </section>

        {!loading && !error && selectedPlayer && (
          <>
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard
                title="Sesiones GPS"
                value={summary.gpsSessions}
                description={formatMeters(summary.totalDistance)}
              />

              <SummaryCard
                title="Controles neuromusculares"
                value={summary.neuromuscularControls}
                description={`CMJ medio: ${formatNumber(summary.averageCmj, 2)}`}
              />

              <SummaryCard
                title="Tests físicos"
                value={summary.testScores}
                description={`Media: ${formatNumber(summary.averageTestScore, 1)}`}
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-bold text-slate-500">Estado CMJ</p>

                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                    summary.cmjDifference,
                  )}`}
                >
                  {getStatusLabel(summary.cmjDifference)}
                </span>

                <p className="mt-2 text-xs font-bold text-slate-500">
                  Diferencia: {formatPercent(summary.cmjDifference)}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard
                title="Distancia acumulada"
                value={formatMeters(summary.totalDistance)}
              />

              <SummaryCard
                title="HSR acumulado"
                value={formatMeters(summary.totalHsr)}
              />

              <SummaryCard
                title="Sprint acumulado"
                value={formatMeters(summary.totalSprint)}
              />

              <SummaryCard
                title="Último RPE"
                value={formatNumber(summary.latestRpe, 1)}
              />
            </section>

            {hasPlayerPerformanceData && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Interpretación individual
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Lectura rápida del jugador
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Señales orientativas a partir de los últimos registros
                  disponibles. Deben interpretarse junto al contexto del
                  jugador y de cada sesión.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {quickPlayerReadingCards.map((card) => (
                    <StatusMessage
                      key={card.title}
                      variant={card.variant}
                      title={card.title}
                    >
                      {card.message}
                    </StatusMessage>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  GPS
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Evolución de carga externa
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Evolución individual de distancia total, HSR y distancia
                  sprint.
                </p>

                <div className="mt-6 h-[320px] w-full sm:h-[380px]">
                  {gpsChartData.length === 0 ? (
                    <EmptyState
                      title="Sin registros GPS"
                      description="Este jugador todavía no tiene registros GPS."
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={gpsChartData}
                        margin={{
                          top: 10,
                          right: 12,
                          left: 0,
                          bottom: 10,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                          dataKey="fecha"
                          tick={{ fontSize: 11 }}
                          angle={-25}
                          textAnchor="end"
                          height={70}
                        />

                        <YAxis
                          width={58}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) =>
                            Math.round(Number(value)).toLocaleString("es-ES")
                          }
                        />

                        <Tooltip
                          formatter={(value) =>
                            `${Math.round(Number(value ?? 0)).toLocaleString(
                              "es-ES",
                            )} m`
                          }
                        />

                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="distancia"
                          name="Distancia"
                          strokeWidth={2}
                        />

                        <Line
                          type="monotone"
                          dataKey="hsr"
                          name="HSR"
                          strokeWidth={2}
                        />

                        <Line
                          type="monotone"
                          dataKey="sprint"
                          name="Sprint"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Neuromuscular
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Evolución CMJ y RSI mod
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Evolución individual de las variables neuromusculares
                  principales.
                </p>

                <div className="mt-6 h-[320px] w-full sm:h-[380px]">
                  {neuromuscularChartData.length === 0 ? (
                    <EmptyState
                      title="Sin controles neuromusculares"
                      description="Este jugador todavía no tiene controles neuromusculares."
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={neuromuscularChartData}
                        margin={{
                          top: 10,
                          right: 12,
                          left: 0,
                          bottom: 10,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                          dataKey="fecha"
                          tick={{ fontSize: 11 }}
                          angle={-25}
                          textAnchor="end"
                          height={70}
                        />

                        <YAxis width={48} tick={{ fontSize: 11 }} />

                        <Tooltip
                          formatter={(value) =>
                            formatNumber(Number(value ?? 0), 2)
                          }
                        />

                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="cmjPre"
                          name="CMJ PRE"
                          strokeWidth={2}
                        />

                        <Line
                          type="monotone"
                          dataKey="cmjPost"
                          name="CMJ POST"
                          strokeWidth={2}
                        />

                        <Line
                          type="monotone"
                          dataKey="rsimodPre"
                          name="RSI mod PRE"
                          strokeWidth={2}
                        />

                        <Line
                          type="monotone"
                          dataKey="rsimodPost"
                          name="RSI mod POST"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Tests físicos
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                Puntuación por capacidad
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Puntuaciones finales del jugador en cada capacidad evaluada.
              </p>

              <div className="mt-6 h-[320px] w-full sm:h-[360px]">
                {testChartData.length === 0 ? (
                  <EmptyState
                    title="Sin puntuaciones de tests"
                    description="Este jugador todavía no tiene puntuaciones de tests."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={testChartData}
                      margin={{
                        top: 10,
                        right: 12,
                        left: 0,
                        bottom: 70,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="capacidad"
                        tick={{ fontSize: 11 }}
                        angle={-25}
                        textAnchor="end"
                        height={90}
                      />

                      <YAxis
                        width={38}
                        domain={[0, 10]}
                        tick={{ fontSize: 11 }}
                      />

                      <Tooltip
                        formatter={(value) => formatNumber(Number(value ?? 0), 1)}
                      />

                      <Bar dataKey="puntuacion" name="Puntuación" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Registros GPS del jugador
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Tabla completa con la carga externa registrada.
                </p>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {playerGpsRecords.map((record) => (
                  <article key={record.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-950">
                          {record.session_date}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          MD: {record.microcycle ?? "—"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                        GPS
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Distancia
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatMeters(record.total_distance)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          HSR
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatMeters(record.hsr)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Sprint
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatMeters(record.distance_vrange6)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Sprints
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.sprints, 0)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          ACC
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.num_acc, 0)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          DEC
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.num_dec, 0)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}

                {playerGpsRecords.length === 0 && (
  <div className="p-5">
    <EmptyState
      title="Sin registros GPS"
      description="No hay registros GPS para este jugador."
    />
  </div>
)}
              </div>

              <div className="hidden max-h-[520px] overflow-auto md:block">
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">MD</th>
                      <th className="px-4 py-3">Distancia</th>
                      <th className="px-4 py-3">HSR</th>
                      <th className="px-4 py-3">Sprint</th>
                      <th className="px-4 py-3">Sprints</th>
                      <th className="px-4 py-3">ACC</th>
                      <th className="px-4 py-3">DEC</th>
                    </tr>
                  </thead>

                  <tbody>
                    {playerGpsRecords.map((record) => (
                      <tr key={record.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">
                          {record.session_date}
                        </td>
                        <td className="px-4 py-3">{record.microcycle ?? "—"}</td>
                        <td className="px-4 py-3">
                          {formatMeters(record.total_distance)}
                        </td>
                        <td className="px-4 py-3">{formatMeters(record.hsr)}</td>
                        <td className="px-4 py-3">
                          {formatMeters(record.distance_vrange6)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.sprints, 0)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.num_acc, 0)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.num_dec, 0)}
                        </td>
                      </tr>
                    ))}

                    {playerGpsRecords.length === 0 && (
  <tr>
    <td colSpan={8} className="px-4 py-6">
      <EmptyState
        title="Sin registros GPS"
        description="No hay registros GPS para este jugador."
      />
    </td>
  </tr>
)}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Registros neuromusculares del jugador
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Tabla completa de CMJ, RSI mod, VMP y RPE.
                </p>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {playerNeuromuscularRecords.map((record) => (
                  <article key={record.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-950">
                          {record.session_date}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          MD: {record.microcycle}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                        RPE {formatNumber(record.rpe, 1)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          CMJ PRE
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.cmj_pre, 2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          CMJ POST
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.cmj_post, 2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          RSI PRE
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.rsimod_pre, 2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          RSI POST
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.rsimod_post, 2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          VMP PRE
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.vmp_pre, 3)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          VMP POST
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.vmp_post, 3)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Carga sentadilla
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.squat_load_kg, 1)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          RPE
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(record.rpe, 1)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}

                {playerNeuromuscularRecords.length === 0 && (
  <div className="p-5">
    <EmptyState
      title="Sin registros neuromusculares"
      description="No hay registros neuromusculares para este jugador."
    />
  </div>
)}
              </div>

              <div className="hidden max-h-[520px] overflow-auto md:block">
                <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">MD</th>
                      <th className="px-4 py-3">CMJ PRE</th>
                      <th className="px-4 py-3">CMJ POST</th>
                      <th className="px-4 py-3">RSI PRE</th>
                      <th className="px-4 py-3">RSI POST</th>
                      <th className="px-4 py-3">VMP PRE</th>
                      <th className="px-4 py-3">VMP POST</th>
                      <th className="px-4 py-3">Carga sentadilla</th>
                      <th className="px-4 py-3">RPE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {playerNeuromuscularRecords.map((record) => (
                      <tr key={record.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">
                          {record.session_date}
                        </td>
                        <td className="px-4 py-3">{record.microcycle}</td>
                        <td className="px-4 py-3">
                          {formatNumber(record.cmj_pre, 2)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.cmj_post, 2)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.rsimod_pre, 2)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.rsimod_post, 2)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.vmp_pre, 3)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.vmp_post, 3)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.squat_load_kg, 1)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(record.rpe, 1)}
                        </td>
                      </tr>
                    ))}

                    {playerNeuromuscularRecords.length === 0 && (
  <tr>
    <td colSpan={10} className="px-4 py-6">
      <EmptyState
        title="Sin registros neuromusculares"
        description="No hay registros neuromusculares para este jugador."
      />
    </td>
  </tr>
)}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Puntuaciones de tests del jugador
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Puntuación final por capacidad.
                </p>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {playerTestScores.map((score) => (
                  <article key={score.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-black text-slate-950">
                          {score.capacity}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Variables: {score.used_variables ?? "—"}/
                          {score.expected_variables ?? "—"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getClassificationClass(
                          score.classification,
                        )}`}
                      >
                        {score.classification ?? "Sin clasificar"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Puntuación
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {formatNumber(score.final_score, 1)}
                      </p>
                    </div>
                  </article>
                ))}

                {playerTestScores.length === 0 && (
  <div className="p-5">
    <EmptyState
      title="Sin puntuaciones de tests"
      description="No hay puntuaciones de tests para este jugador."
    />
  </div>
)}
              </div>

              <div className="hidden max-h-[520px] overflow-auto md:block">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Capacidad</th>
                      <th className="px-4 py-3">Puntuación</th>
                      <th className="px-4 py-3">Clasificación</th>
                      <th className="px-4 py-3">Variables usadas</th>
                    </tr>
                  </thead>

                  <tbody>
                    {playerTestScores.map((score) => (
                      <tr key={score.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">
                          {score.capacity}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(score.final_score, 1)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${getClassificationClass(
                              score.classification,
                            )}`}
                          >
                            {score.classification ?? "Sin clasificar"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {score.used_variables ?? "—"}/
                          {score.expected_variables ?? "—"}
                        </td>
                      </tr>
                    ))}

                    {playerTestScores.length === 0 && (
  <tr>
    <td colSpan={4} className="px-4 py-6">
      <EmptyState
        title="Sin puntuaciones de tests"
        description="No hay puntuaciones de tests para este jugador."
      />
    </td>
  </tr>
)}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Resultados por variable del jugador
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Valores originales, pesos y puntuaciones por variable.
                </p>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {playerTestResults.map((result) => (
                  <article key={result.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-black text-slate-950">
                          {result.variable}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {result.test_block}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getClassificationClass(
                          result.classification,
                        )}`}
                      >
                        {result.classification ?? "Sin clasificar"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Valor
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatValue(result.value, result.unit)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Puntuación
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(result.variable_score, 2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Peso original
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(result.original_weight, 2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Peso usado
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatNumber(result.used_weight, 2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Disponible
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {result.available === false ? "No" : "Sí"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}

                {playerTestResults.length === 0 && (
  <div className="p-5">
    <EmptyState
      title="Sin resultados por variable"
      description="No hay resultados por variable para este jugador."
    />
  </div>
)}
              </div>

              <div className="hidden max-h-[620px] overflow-auto md:block">
                <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Bloque</th>
                      <th className="px-4 py-3">Variable</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Peso original</th>
                      <th className="px-4 py-3">Peso usado</th>
                      <th className="px-4 py-3">Puntuación</th>
                      <th className="px-4 py-3">Clasificación</th>
                      <th className="px-4 py-3">Disponible</th>
                    </tr>
                  </thead>

                  <tbody>
                    {playerTestResults.map((result) => (
                      <tr key={result.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">
                          {result.test_block}
                        </td>
                        <td className="px-4 py-3">{result.variable}</td>
                        <td className="px-4 py-3">
                          {formatValue(result.value, result.unit)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(result.original_weight, 2)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(result.used_weight, 2)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(result.variable_score, 2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${getClassificationClass(
                              result.classification,
                            )}`}
                          >
                            {result.classification ?? "Sin clasificar"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {result.available === false ? "No" : "Sí"}
                        </td>
                      </tr>
                    ))}

                    {playerTestResults.length === 0 && (
  <tr>
    <td colSpan={8} className="px-4 py-6">
      <EmptyState
        title="Sin resultados por variable"
        description="No hay resultados por variable para este jugador."
      />
    </td>
  </tr>
)}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}


