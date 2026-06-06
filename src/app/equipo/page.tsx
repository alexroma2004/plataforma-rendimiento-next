"use client";

import { useEffect, useMemo, useState } from "react";
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

  return ((Number(currentValue) - Number(referenceValue)) / Number(referenceValue)) * 100;
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
    loadData();
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
      averageDistance: average(data.gpsRecords.map((record) => record.total_distance)),
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
      averageTestScore: average(data.testScores.map((score) => score.final_score)),
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
      const cmjDifference = getDifferencePercent(latestRecord?.cmj_pre, averageCmj);

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

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-950">
      <section className="rounded-2xl bg-slate-950 p-8 text-white shadow">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
          Plataforma de rendimiento
        </p>

        <h1 className="mt-3 text-4xl font-black">Equipo</h1>

        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200">
          Panel general del equipo. Integra jugadores activos, carga GPS,
          controles neuromusculares y puntuaciones de tests físicos para obtener
          una visión global del estado de la plantilla.
        </p>
      </section>

      {error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-2xl bg-white p-6 text-sm font-bold text-slate-600 shadow">
          Cargando dashboard del equipo...
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">
                Jugadores activos
              </p>
              <p className="mt-2 text-3xl font-black">{summary.players}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">Registros GPS</p>
              <p className="mt-2 text-3xl font-black">{summary.gpsRecords}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {summary.gpsPlayers} jugadores con datos
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">
                Controles neuromusculares
              </p>
              <p className="mt-2 text-3xl font-black">
                {summary.neuromuscularRecords}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {summary.neuromuscularPlayers} jugadores con datos
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">
                Puntuaciones tests
              </p>
              <p className="mt-2 text-3xl font-black">{summary.testScores}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {summary.testPlayers} jugadores con datos
              </p>
            </div>
          </section>

          <section className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">
                Distancia media GPS
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatMeters(summary.averageDistance)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">HSR medio</p>
              <p className="mt-2 text-3xl font-black">
                {formatMeters(summary.averageHsr)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">CMJ medio</p>
              <p className="mt-2 text-3xl font-black">
                {formatNumber(summary.averageCmj, 2)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">
                Media tests físicos
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatNumber(summary.averageTestScore, 1)}
              </p>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow xl:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                GPS
              </p>

              <h2 className="mt-2 text-xl font-black">
                Evolución de carga del equipo
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Suma total del equipo por fecha de sesión: distancia total, HSR
                y distancia sprint.
              </p>

              <div className="mt-6 h-[380px] w-full">
                {gpsEvolutionData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                    Todavía no hay registros GPS para representar.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gpsEvolutionData}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="fecha"
                        tick={{ fontSize: 11 }}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                      />

                      <YAxis
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

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                Tests
              </p>

              <h2 className="mt-2 text-xl font-black">
                Top puntuación media
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Ranking de jugadores según su puntuación media en tests físicos.
              </p>

              <div className="mt-6 h-[380px] w-full">
                {testChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                    Todavía no hay puntuaciones de tests.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={testChartData}
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 30,
                        left: 80,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis type="number" domain={[0, 10]} />

                      <YAxis
                        type="category"
                        dataKey="jugador"
                        width={120}
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

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                  GPS
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Ranking acumulado GPS
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Carga acumulada por jugador en todos los registros guardados.
                </p>
              </div>

              <div className="max-h-[520px] overflow-auto">
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
                      <tr key={row.playerId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">
                          {row.playerName}
                        </td>
                        <td className="px-4 py-3">{row.position ?? "—"}</td>
                        <td className="px-4 py-3">{row.sessions}</td>
                        <td className="px-4 py-3">
                          {formatMeters(row.totalDistance)}
                        </td>
                        <td className="px-4 py-3">{formatMeters(row.hsr)}</td>
                        <td className="px-4 py-3">{formatMeters(row.sprint)}</td>
                        <td className="px-4 py-3">
                          {formatNumber(row.sprints, 0)}
                        </td>
                      </tr>
                    ))}

                    {gpsPlayerSummary.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-sm font-bold text-slate-500"
                        >
                          No hay datos GPS disponibles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                  Neuromuscular
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Control de estado CMJ
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Comparación del último CMJ del jugador frente a su media
                  individual.
                </p>
              </div>

              <div className="max-h-[520px] overflow-auto">
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
                      <tr key={row.playerId} className="border-t border-slate-100">
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
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-sm font-bold text-slate-500"
                        >
                          No hay datos neuromusculares disponibles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
            <div className="border-b border-slate-200 p-5">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                Tests físicos
              </p>

              <h2 className="mt-2 text-xl font-black">
                Ranking medio de tests
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Media de puntuaciones por jugador en las capacidades evaluadas.
              </p>
            </div>

            <div className="max-h-[520px] overflow-auto">
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
                    <tr key={row.playerId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-black">{index + 1}</td>

                      <td className="px-4 py-3 font-black">{row.playerName}</td>

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
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-sm font-bold text-slate-500"
                      >
                        No hay puntuaciones de tests disponibles.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}