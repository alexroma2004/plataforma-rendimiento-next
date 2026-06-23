"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
import {
  getTeamDashboardData,
  type TeamDashboardData,
  type TeamDashboardGpsRecord,
  type TeamDashboardNeuromuscularRecord,
  type TeamDashboardTestScore,
} from "@/lib/supabase/team-dashboard";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const emptyTeamDashboardData: TeamDashboardData = {
  players: [],
  gpsRecords: [],
  neuromuscularRecords: [],
  testScores: [],
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

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(1).replace(".", ",")}%`;
}

function formatSessionDate(value: string | null | undefined) {
  if (!value) return "fecha no disponible";

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return value;

  return (
    String(day).padStart(2, "0") +
    "/" +
    String(month).padStart(2, "0") +
    "/" +
    year
  );
}

function getGpsSessionPlayerCount(
  records: TeamDashboardGpsRecord[],
  sessionDate: string | null | undefined,
) {
  if (!sessionDate) return 0;

  return new Set(
    records
      .filter((record) => record.session_date === sessionDate)
      .map((record) => record.player_id || record.player_name)
      .filter(Boolean),
  ).size;
}

function average(values: Array<number | null | undefined>) {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
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

type GpsPlayerSummary = {
  playerId: string;
  playerName: string;
  position: string | null;
  totalDistance: number;
  hsr: number;
  sprint: number;
  sprints: number;
  acc: number;
  dec: number;
  sessions: number;
};

type NeuromuscularPlayerSummary = {
  playerId: string;
  playerName: string;
  position: string | null;
  latestRecord: TeamDashboardNeuromuscularRecord | null;
  averageCmj: number | null;
  cmjDifference: number | null;
  controls: number;
};

type TestPlayerSummary = {
  playerId: string;
  playerName: string;
  position: string | null;
  averageScore: number | null;
  scores: number;
  bestClassification: string | null;
};

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

function ChartEmptyState({ description }: { description: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center">
      <div className="w-full">
        <EmptyState title="Sin datos disponibles" description={description} />
      </div>
    </div>
  );
}

export default function EquipoPage() {
  const [data, setData] = useState<TeamDashboardData>(emptyTeamDashboardData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const dashboardData = await getTeamDashboardData();

      setData(dashboardData);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar el dashboard del equipo.";

      setError(message);
      setData(emptyTeamDashboardData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  const summary = useMemo(() => {
    const gpsPlayers = new Set(
      data.gpsRecords
        .map((record) => record.player_id)
        .filter((playerId): playerId is string => Boolean(playerId)),
    );

    const neuromuscularPlayers = new Set(
      data.neuromuscularRecords
        .map((record) => record.player_id)
        .filter((playerId): playerId is string => Boolean(playerId)),
    );

    const testPlayers = new Set(
      data.testScores
        .map((score) => score.player_id)
        .filter((playerId): playerId is string => Boolean(playerId)),
    );

    return {
      players: data.players.length,
      gpsRecords: data.gpsRecords.length,
      gpsPlayers: gpsPlayers.size,
      neuromuscularRecords: data.neuromuscularRecords.length,
      neuromuscularPlayers: neuromuscularPlayers.size,
      testScores: data.testScores.length,
      testPlayers: testPlayers.size,
      averageDistance: average(
        data.gpsRecords.map((record) => record.total_distance),
      ),
      averageHsr: average(data.gpsRecords.map((record) => record.hsr)),
      averageSprint: average(
        data.gpsRecords.map((record) => record.distance_vrange6),
      ),
      averageCmj: average(
        data.neuromuscularRecords.map((record) => record.cmj_pre),
      ),
      averageRsimod: average(
        data.neuromuscularRecords.map((record) => record.rsimod_pre),
      ),
      averageVmp: average(
        data.neuromuscularRecords.map((record) => record.vmp_pre),
      ),
      averageTestScore: average(
        data.testScores.map((score) => score.final_score),
      ),
    };
  }, [data]);

  const gpsPlayerSummary = useMemo(() => {
    const rows = new Map<string, GpsPlayerSummary>();

    data.gpsRecords.forEach((record: TeamDashboardGpsRecord) => {
      if (!record.player_id) return;

      const current = rows.get(record.player_id) ?? {
        playerId: record.player_id,
        playerName: record.player_name,
        position: record.position,
        totalDistance: 0,
        hsr: 0,
        sprint: 0,
        sprints: 0,
        acc: 0,
        dec: 0,
        sessions: 0,
      };

      current.totalDistance += Number(record.total_distance ?? 0);
      current.hsr += Number(record.hsr ?? 0);
      current.sprint += Number(record.distance_vrange6 ?? 0);
      current.sprints += Number(record.sprints ?? 0);
      current.acc += Number(record.num_acc ?? 0);
      current.dec += Number(record.num_dec ?? 0);
      current.sessions += 1;

      rows.set(record.player_id, current);
    });

    return Array.from(rows.values()).sort(
      (a, b) => b.totalDistance - a.totalDistance,
    );
  }, [data.gpsRecords]);

  const neuromuscularPlayerSummary = useMemo(() => {
    const rows = new Map<string, NeuromuscularPlayerSummary>();

    data.players.forEach((player) => {
      const playerRecords = data.neuromuscularRecords
        .filter((record) => record.player_id === player.id)
        .sort((a, b) => b.session_date.localeCompare(a.session_date));

      const latestRecord = playerRecords[0] ?? null;
      const averageCmj = average(playerRecords.map((record) => record.cmj_pre));
      const cmjDifference = getDifferencePercent(
        latestRecord?.cmj_pre,
        averageCmj,
      );

      rows.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        latestRecord,
        averageCmj,
        cmjDifference,
        controls: playerRecords.length,
      });
    });

    return Array.from(rows.values()).sort((a, b) => {
      const valueA = a.cmjDifference ?? 999;
      const valueB = b.cmjDifference ?? 999;

      return valueA - valueB;
    });
  }, [data.players, data.neuromuscularRecords]);

  const testPlayerSummary = useMemo(() => {
    const rows = new Map<string, TestPlayerSummary>();

    data.testScores.forEach((score: TeamDashboardTestScore) => {
      if (!score.player_id) return;

      const current = rows.get(score.player_id) ?? {
        playerId: score.player_id,
        playerName: score.player_name,
        position: score.position,
        averageScore: null,
        scores: 0,
        bestClassification: score.classification ?? null,
      };

      const playerScores = data.testScores.filter(
        (playerScore) => playerScore.player_id === score.player_id,
      );

      current.averageScore = average(
        playerScores.map((playerScore) => playerScore.final_score),
      );
      current.scores = playerScores.length;

      rows.set(score.player_id, current);
    });

    return Array.from(rows.values()).sort(
      (a, b) => Number(b.averageScore ?? 0) - Number(a.averageScore ?? 0),
    );
  }, [data.testScores]);

  const gpsEvolutionData = useMemo(() => {
    const rows = new Map<
      string,
      {
        fecha: string;
        distancia: number;
        hsr: number;
        sprint: number;
      }
    >();

    data.gpsRecords.forEach((record) => {
      const current = rows.get(record.session_date) ?? {
        fecha: record.session_date,
        distancia: 0,
        hsr: 0,
        sprint: 0,
      };

      current.distancia += Number(record.total_distance ?? 0);
      current.hsr += Number(record.hsr ?? 0);
      current.sprint += Number(record.distance_vrange6 ?? 0);

      rows.set(record.session_date, current);
    });

    return Array.from(rows.values()).sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    );
  }, [data.gpsRecords]);

  const testChartData = useMemo(() => {
    return testPlayerSummary.slice(0, 10).map((row) => ({
      jugador: row.playerName,
      puntuacion: Number(row.averageScore ?? 0),
    }));
  }, [testPlayerSummary]);

  const hasAnyDashboardData = useMemo(() => {
    return (
      data.players.length > 0 ||
      data.gpsRecords.length > 0 ||
      data.neuromuscularRecords.length > 0 ||
      data.testScores.length > 0
    );
  }, [data]);

  const quickTeamReadingCards = useMemo<QuickReadingCard[]>(() => {
    const latestGpsSession =
      gpsEvolutionData[gpsEvolutionData.length - 1] ?? null;
    const previousGpsSession =
      gpsEvolutionData[gpsEvolutionData.length - 2] ?? null;
    const latestGpsCoverage = getGpsSessionPlayerCount(
      data.gpsRecords,
      latestGpsSession?.fecha,
    );
    const previousGpsCoverage = getGpsSessionPlayerCount(
      data.gpsRecords,
      previousGpsSession?.fecha,
    );
    const gpsDifference = getDifferencePercent(
      latestGpsSession?.distancia,
      previousGpsSession?.distancia,
    );
    const gpsCoverageChanged = Boolean(
      previousGpsSession && latestGpsCoverage !== previousGpsCoverage,
    );
    const neuromuscularStatus = {
      alert: 0,
      control: 0,
      ok: 0,
      withoutReference: 0,
    };

    neuromuscularPlayerSummary.forEach((row) => {
      const status = getStatusLabel(row.cmjDifference);

      if (status === "Alerta") neuromuscularStatus.alert += 1;
      else if (status === "Control") neuromuscularStatus.control += 1;
      else if (status === "OK") neuromuscularStatus.ok += 1;
      else neuromuscularStatus.withoutReference += 1;
    });

    const playersToReview =
      neuromuscularStatus.alert + neuromuscularStatus.control;
    const gpsComparisonMessage = !previousGpsSession
      ? "Todavía no hay una sesión anterior para realizar una comparación prudente."
      : gpsDifference === null
        ? "No se puede calcular una variación porcentual válida frente a la sesión anterior."
        : gpsDifference === 0
          ? "La distancia acumulada fue igual a la sesión anterior."
          : `La distancia acumulada fue un ${formatPercent(
              Math.abs(gpsDifference),
            )} ${gpsDifference > 0 ? "mayor" : "menor"} que en la sesión anterior.`;
    const gpsCoverageMessage = !previousGpsSession
      ? ""
      : gpsCoverageChanged
        ? `La cobertura cambió de ${previousGpsCoverage} a ${latestGpsCoverage} jugadores, por lo que la comparación es orientativa.`
        : "La cobertura fue equivalente, aunque la carga también puede variar por minutos, composición de la sesión o jugadores disponibles.";
    const gpsMessage = latestGpsSession
      ? `La última sesión registrada (${formatSessionDate(
          latestGpsSession.fecha,
        )}) acumuló ${formatMeters(
          latestGpsSession.distancia,
        )} con ${latestGpsCoverage} ${
          latestGpsCoverage === 1 ? "jugador" : "jugadores"
        }. ${[gpsComparisonMessage, gpsCoverageMessage]
          .filter(Boolean)
          .join(" ")}`
      : "No hay sesiones GPS registradas para interpretar la carga del equipo.";
    const neuromuscularFollowUp =
      playersToReview >= 2
        ? "Varios jugadores presentan una caída dentro de los umbrales actuales; conviene revisar su evolución individual y el RPE."
        : playersToReview === 1
          ? "Conviene revisar la evolución individual del jugador señalado sin interpretar el dato de forma aislada."
          : "No aparecen caídas dentro de los umbrales actuales; conviene mantener el seguimiento habitual.";
    const neuromuscularMessage =
      summary.neuromuscularRecords > 0
        ? `Según el último CMJ frente a la media individual: ${
            neuromuscularStatus.alert
          } en alerta, ${neuromuscularStatus.control} en control, ${
            neuromuscularStatus.ok
          } OK y ${
            neuromuscularStatus.withoutReference
          } sin referencia. ${neuromuscularFollowUp}`
        : "No hay controles neuromusculares registrados para establecer una referencia.";
    const testCoverageMessage =
      summary.testPlayers <= 1
        ? "La cobertura es reducida y no representa al conjunto de la plantilla."
        : "La media debe revisarse junto al rendimiento por capacidades y la cobertura disponible.";
    const testsMessage =
      summary.testScores === 0
        ? "No hay puntuaciones de tests disponibles para realizar una lectura general prudente."
        : summary.averageTestScore === null
          ? "Hay puntuaciones registradas, pero no permiten calcular una media válida."
          : `Hay ${summary.testScores} puntuaciones disponibles en ${
              summary.testPlayers
            } ${
              summary.testPlayers === 1 ? "jugador" : "jugadores"
            }, con una media global de ${formatNumber(
              summary.averageTestScore,
              1,
            )}. ${testCoverageMessage}`;
    let staffRecommendation =
      "Revisar la exposición individual y cruzar GPS, CMJ y RPE antes de tomar decisiones; un único indicador no permite concluir fatiga.";

    if (playersToReview >= 2) {
      staffRecommendation =
        "Priorizar la revisión individual de los jugadores en alerta o control y cruzar su exposición GPS con CMJ y RPE, sin concluir fatiga por un indicador aislado.";
    } else if (gpsCoverageChanged) {
      staffRecommendation =
        "Revisar la exposición individual antes de atribuir el cambio GPS a una variación real de carga y cruzar la lectura con CMJ y RPE.";
    } else if (
      summary.gpsRecords === 0 ||
      summary.neuromuscularRecords === 0
    ) {
      staffRecommendation =
        "Completar la información disponible y cruzar GPS, CMJ y RPE antes de tomar decisiones; un único indicador no permite concluir fatiga.";
    }

    return [
      {
        title: "Carga GPS reciente",
        variant: gpsCoverageChanged ? "warning" : "info",
        message: gpsMessage,
      },
      {
        title: "Estado neuromuscular",
        variant: playersToReview > 0 ? "warning" : "info",
        message: neuromuscularMessage,
      },
      {
        title: "Tests físicos",
        variant: "info",
        message: testsMessage,
      },
      {
        title: "Recomendación para el staff",
        variant:
          playersToReview >= 2 || gpsCoverageChanged ? "warning" : "info",
        message: staffRecommendation,
      },
    ];
  }, [
    data.gpsRecords,
    gpsEvolutionData,
    neuromuscularPlayerSummary,
    summary,
  ]);

  return (
    <AppShell
      title="Equipo"
      subtitle="Panel general del equipo. Integra jugadores activos, carga GPS, controles neuromusculares y puntuaciones de tests físicos para obtener una visión global del estado de la plantilla."
    >
      <div className="space-y-8">
        {error && (
          <StatusMessage variant="error" title="No se ha podido cargar el equipo">
            {error}
          </StatusMessage>
        )}

        {loading ? (
          <StatusMessage variant="info" title="Cargando dashboard del equipo">
            Cargando jugadores, registros GPS, controles neuromusculares y
            puntuaciones de tests físicos.
          </StatusMessage>
        ) : error ? null : (
          <>
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard title="Jugadores activos" value={summary.players} />

              <SummaryCard
                title="Registros GPS"
                value={summary.gpsRecords}
                description={`${summary.gpsPlayers} jugadores con datos`}
              />

              <SummaryCard
                title="Controles neuromusculares"
                value={summary.neuromuscularRecords}
                description={`${summary.neuromuscularPlayers} jugadores con datos`}
              />

              <SummaryCard
                title="Puntuaciones tests"
                value={summary.testScores}
                description={`${summary.testPlayers} jugadores con datos`}
              />
            </section>

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard
                title="Distancia media GPS"
                value={formatMeters(summary.averageDistance)}
              />

              <SummaryCard
                title="HSR medio"
                value={formatMeters(summary.averageHsr)}
              />

              <SummaryCard
                title="CMJ medio"
                value={formatNumber(summary.averageCmj, 2)}
              />

              <SummaryCard
                title="Media tests físicos"
                value={formatNumber(summary.averageTestScore, 1)}
              />
            </section>

            {!hasAnyDashboardData && (
              <EmptyState
                title="Sin datos del equipo"
                description="Todavía no hay jugadores, registros GPS, controles neuromusculares ni puntuaciones de tests físicos para mostrar en el dashboard."
              />
            )}

            {hasAnyDashboardData && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Interpretación
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Lectura rápida del equipo
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Señales orientativas a partir de los últimos registros
                  disponibles. Deben interpretarse junto al contexto de cada
                  sesión y jugador.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {quickTeamReadingCards.map((card) => (
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

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6 xl:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  GPS
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Evolución de carga del equipo
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Suma total del equipo por fecha de sesión: distancia total,
                  HSR y distancia sprint.
                </p>

                <div className="mt-6 h-[320px] w-full sm:h-[380px]">
                  {gpsEvolutionData.length === 0 ? (
                    <ChartEmptyState description="Todavía no hay registros GPS para representar." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={gpsEvolutionData}
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
                  Tests
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Top puntuación media
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ranking de jugadores según su puntuación media en tests
                  físicos.
                </p>

                <div className="mt-6 h-[320px] w-full sm:h-[380px]">
                  {testChartData.length === 0 ? (
                    <ChartEmptyState description="Todavía no hay puntuaciones de tests." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={testChartData}
                        layout="vertical"
                        margin={{
                          top: 10,
                          right: 12,
                          left: 40,
                          bottom: 10,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                          type="number"
                          domain={[0, 10]}
                          tick={{ fontSize: 11 }}
                        />

                        <YAxis
                          type="category"
                          dataKey="jugador"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />

                        <Tooltip
                          formatter={(value) =>
                            formatNumber(Number(value ?? 0), 1)
                          }
                        />

                        <Bar dataKey="puntuacion" name="Puntuación media" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                <div className="border-b border-slate-200 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                    GPS
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Ranking acumulado GPS
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Carga acumulada por jugador en todos los registros guardados.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {gpsPlayerSummary.map((row) => (
                    <article key={row.playerId} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-slate-950">
                            {row.playerName}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {row.position ?? "Sin posición"}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                          {row.sessions} ses.
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Distancia
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMeters(row.totalDistance)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            HSR
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMeters(row.hsr)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Sprint
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMeters(row.sprint)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Sprints
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.sprints, 0)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}

                  {gpsPlayerSummary.length === 0 && (
                    <div className="p-5">
                      <EmptyState
                        title="Sin datos GPS"
                        description="No hay datos GPS disponibles."
                      />
                    </div>
                  )}
                </div>

                <div className="hidden max-h-[520px] overflow-auto md:block">
                  <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Jugador</th>
                        <th className="px-4 py-3">Posición</th>
                        <th className="px-4 py-3">Sesiones</th>
                        <th className="px-4 py-3">Distancia</th>
                        <th className="px-4 py-3">HSR</th>
                        <th className="px-4 py-3">Sprint</th>
                        <th className="px-4 py-3">Sprints</th>
                      </tr>
                    </thead>

                    <tbody>
                      {gpsPlayerSummary.map((row) => (
                        <tr
                          key={row.playerId}
                          className="border-t border-slate-100"
                        >
                          <td className="px-4 py-3 font-black">
                            {row.playerName}
                          </td>
                          <td className="px-4 py-3">{row.position ?? "—"}</td>
                          <td className="px-4 py-3">{row.sessions}</td>
                          <td className="px-4 py-3">
                            {formatMeters(row.totalDistance)}
                          </td>
                          <td className="px-4 py-3">{formatMeters(row.hsr)}</td>
                          <td className="px-4 py-3">
                            {formatMeters(row.sprint)}
                          </td>
                          <td className="px-4 py-3">
                            {formatNumber(row.sprints, 0)}
                          </td>
                        </tr>
                      ))}

                      {gpsPlayerSummary.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6">
                            <EmptyState
                              title="Sin datos GPS"
                              description="No hay datos GPS disponibles."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                <div className="border-b border-slate-200 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                    Neuromuscular
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Control de estado CMJ
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Comparación del último CMJ del jugador frente a su media
                    individual.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {neuromuscularPlayerSummary.map((row) => (
                    <article key={row.playerId} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-slate-950">
                            {row.playerName}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {row.position ?? "Sin posición"} · {row.controls}{" "}
                            controles
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                            row.cmjDifference,
                          )}`}
                        >
                          {getStatusLabel(row.cmjDifference)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Último CMJ
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.latestRecord?.cmj_pre, 2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Media CMJ
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.averageCmj, 2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Diferencia
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatPercent(row.cmjDifference)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Controles
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {row.controls}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}

                  {neuromuscularPlayerSummary.length === 0 && (
                    <div className="p-5">
                      <EmptyState
                        title="Sin datos neuromusculares"
                        description="No hay datos neuromusculares disponibles."
                      />
                    </div>
                  )}
                </div>

                <div className="hidden max-h-[520px] overflow-auto md:block">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Jugador</th>
                        <th className="px-4 py-3">Posición</th>
                        <th className="px-4 py-3">Controles</th>
                        <th className="px-4 py-3">Último CMJ</th>
                        <th className="px-4 py-3">Media CMJ</th>
                        <th className="px-4 py-3">Diferencia</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {neuromuscularPlayerSummary.map((row) => (
                        <tr
                          key={row.playerId}
                          className="border-t border-slate-100"
                        >
                          <td className="px-4 py-3 font-black">
                            {row.playerName}
                          </td>

                          <td className="px-4 py-3">{row.position ?? "—"}</td>

                          <td className="px-4 py-3">{row.controls}</td>

                          <td className="px-4 py-3">
                            {formatNumber(row.latestRecord?.cmj_pre, 2)}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(row.averageCmj, 2)}
                          </td>

                          <td className="px-4 py-3">
                            {formatPercent(row.cmjDifference)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                row.cmjDifference,
                              )}`}
                            >
                              {getStatusLabel(row.cmjDifference)}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {neuromuscularPlayerSummary.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6">
                            <EmptyState
                              title="Sin datos neuromusculares"
                              description="No hay datos neuromusculares disponibles."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Tests físicos
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Ranking medio de tests
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Media de puntuaciones por jugador en las capacidades
                  evaluadas.
                </p>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {testPlayerSummary.map((row, index) => (
                  <article key={row.playerId} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                          Ranking #{index + 1}
                        </p>

                        <p className="mt-1 break-words text-base font-black text-slate-950">
                          {row.playerName}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {row.position ?? "Sin posición"} · {row.scores}{" "}
                          puntuaciones
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getClassificationClass(
                          row.bestClassification,
                        )}`}
                      >
                        {row.bestClassification ?? "Sin clasificar"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Media
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {formatNumber(row.averageScore, 1)}
                      </p>
                    </div>
                  </article>
                ))}

                {testPlayerSummary.length === 0 && (
                  <div className="p-5">
                    <EmptyState
                      title="Sin puntuaciones de tests"
                      description="No hay puntuaciones de tests disponibles."
                    />
                  </div>
                )}
              </div>

              <div className="hidden max-h-[520px] overflow-auto md:block">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Ranking</th>
                      <th className="px-4 py-3">Jugador</th>
                      <th className="px-4 py-3">Posición</th>
                      <th className="px-4 py-3">Puntuaciones</th>
                      <th className="px-4 py-3">Media</th>
                      <th className="px-4 py-3">Clasificación</th>
                    </tr>
                  </thead>

                  <tbody>
                    {testPlayerSummary.map((row, index) => (
                      <tr
                        key={row.playerId}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-black">{index + 1}</td>

                        <td className="px-4 py-3 font-black">
                          {row.playerName}
                        </td>

                        <td className="px-4 py-3">{row.position ?? "—"}</td>

                        <td className="px-4 py-3">{row.scores}</td>

                        <td className="px-4 py-3 font-black">
                          {formatNumber(row.averageScore, 1)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${getClassificationClass(
                              row.bestClassification,
                            )}`}
                          >
                            {row.bestClassification ?? "Sin clasificar"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {testPlayerSummary.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6">
                        <EmptyState
                          title="Sin puntuaciones de tests"
                          description="No hay puntuaciones de tests disponibles."
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

