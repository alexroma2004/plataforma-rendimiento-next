"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabase/client";

type PlayerRow = {
  id: string;
  name: string;
  normalized_name: string;
  position: string | null;
  active: boolean | null;
};

type NeuromuscularRecordRow = {
  id: string;
  player_id: string | null;
  player_name: string;
  normalized_name: string | null;
  position: string | null;
  session_date: string | null;
  microcycle: string | null;
  cmj_pre: number | null;
  rsimod_pre: number | null;
  vmp_pre: number | null;
  cmj_post: number | null;
  rsimod_post: number | null;
  vmp_post: number | null;
  squat_load_kg: number | null;
  rpe: number | null;
  notes: string | null;
};

type BaseProfilePoint = {
  id: string;
  playerId: string;
  playerName: string;
  normalizedName: string;
  position: string | null;
  sessionDate: string;
  microcycle: string | null;
  cmj: number | null;
  rsimod: number | null;
  vmp: number | null;
  squatLoadKg: number | null;
  rpe: number | null;
  source: "PRE" | "POST";
};

type ProfileStatus = "MUY_BUENO" | "BUENO" | "CONTROL" | "BAJO";

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

function toNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatNumber(
  value: number | null | undefined,
  decimals = 1,
  suffix = "",
) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const number = Number(value);

  return `${number.toLocaleString("es-ES", {
    minimumFractionDigits: Number.isInteger(number) ? 0 : decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-ES");
}

function normalizeName(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getBestValue(
  preValue: number | null | undefined,
  postValue: number | null | undefined,
) {
  const post = toNumber(postValue);
  const pre = toNumber(preValue);

  return post ?? pre;
}

function getValueSource(
  preValue: number | null | undefined,
  postValue: number | null | undefined,
): "PRE" | "POST" {
  return toNumber(postValue) !== null ? "POST" : "PRE";
}

function isBaseProfilePoint(
  point: BaseProfilePoint | null,
): point is BaseProfilePoint {
  return point !== null;
}

function buildBaseProfilePoint(
  record: NeuromuscularRecordRow,
): BaseProfilePoint | null {
  if (!record.session_date) return null;

  const cmj = getBestValue(record.cmj_pre, record.cmj_post);
  const rsimod = getBestValue(record.rsimod_pre, record.rsimod_post);
  const vmp = getBestValue(record.vmp_pre, record.vmp_post);

  if (cmj === null && rsimod === null && vmp === null) {
    return null;
  }

  const normalizedName =
    record.normalized_name ?? normalizeName(record.player_name);

  return {
    id: record.id,
    playerId: record.player_id ?? normalizedName,
    playerName: record.player_name,
    normalizedName,
    position: record.position,
    sessionDate: record.session_date,
    microcycle: record.microcycle,
    cmj,
    rsimod,
    vmp,
    squatLoadKg: toNumber(record.squat_load_kg),
    rpe: toNumber(record.rpe),
    source: getValueSource(record.cmj_pre, record.cmj_post),
  };
}

function getProfileStatus(point: BaseProfilePoint): ProfileStatus {
  const cmj = point.cmj ?? 0;
  const rsimod = point.rsimod ?? 0;
  const vmp = point.vmp ?? 0;

  if (cmj >= 40 && rsimod >= 0.65 && vmp >= 1.05) {
    return "MUY_BUENO";
  }

  if (cmj >= 35 && rsimod >= 0.55 && vmp >= 0.95) {
    return "BUENO";
  }

  if (cmj >= 30 || rsimod >= 0.45 || vmp >= 0.85) {
    return "CONTROL";
  }

  return "BAJO";
}

function getProfileStatusLabel(status: ProfileStatus) {
  if (status === "MUY_BUENO") return "Perfil muy bueno";
  if (status === "BUENO") return "Perfil bueno";
  if (status === "CONTROL") return "Necesita control";
  return "Perfil bajo";
}

function getProfileStatusClass(status: ProfileStatus) {
  if (status === "MUY_BUENO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "BUENO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "CONTROL") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function getProfileInterpretation(point: BaseProfilePoint) {
  const cmj = point.cmj ?? 0;
  const rsimod = point.rsimod ?? 0;
  const vmp = point.vmp ?? 0;

  if (cmj >= 40 && rsimod >= 0.65 && vmp >= 1.05) {
    return "Buen equilibrio entre capacidad de salto, reactividad y velocidad de ejecución.";
  }

  if (cmj >= 38 && rsimod < 0.55) {
    return "Buena capacidad de salto, pero menor eficiencia reactiva. Puede beneficiarse de trabajo pliométrico y rigidez útil.";
  }

  if (vmp < 0.9 && cmj >= 35) {
    return "Buen componente neuromuscular general, pero la velocidad de ejecución en sentadilla aparece más limitada.";
  }

  if (cmj < 32 && rsimod < 0.5) {
    return "Perfil neuromuscular bajo. Conviene revisar fatiga, fuerza máxima, potencia y estado físico general.";
  }

  return "Perfil intermedio. Se recomienda interpretar junto al historial individual, el microciclo y la carga acumulada.";
}

function average(values: Array<number | null>) {
  const validValues = values.filter(
    (value): value is number =>
      value !== null && value !== undefined && Number.isFinite(Number(value)),
  );

  if (validValues.length === 0) return null;

  return (
    validValues.reduce((sum, value) => sum + Number(value), 0) /
    validValues.length
  );
}

function getLatestPointByPlayer(points: BaseProfilePoint[]) {
  const map = new Map<string, BaseProfilePoint>();

  points.forEach((point) => {
    const current = map.get(point.normalizedName);

    if (!current) {
      map.set(point.normalizedName, point);
      return;
    }

    if (new Date(point.sessionDate) > new Date(current.sessionDate)) {
      map.set(point.normalizedName, point);
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.playerName.localeCompare(b.playerName),
  );
}

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

function EmptyState({ children }: { children: string }) {
  return (
    <StatusMessage variant="warning" title="Sin datos disponibles">
      {children}
    </StatusMessage>
  );
}

export default function PerfilFrPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [records, setRecords] = useState<NeuromuscularRecordRow[]>([]);

  const [selectedPlayer, setSelectedPlayer] = useState("all");
  const [selectedMicrocycle, setSelectedMicrocycle] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const client = getSupabaseClient();

        const [playersResponse, recordsResponse] = await Promise.all([
          client
            .from("players")
            .select("id, name, normalized_name, position, active")
            .eq("active", true)
            .order("name", { ascending: true }),

          client
            .from("neuromuscular_records")
            .select(
              "id, player_id, player_name, normalized_name, position, session_date, microcycle, cmj_pre, rsimod_pre, vmp_pre, cmj_post, rsimod_post, vmp_post, squat_load_kg, rpe, notes",
            )
            .order("session_date", { ascending: false }),
        ]);

        if (playersResponse.error) {
          throw new Error(
            `No se han podido cargar los jugadores: ${playersResponse.error.message}`,
          );
        }

        if (recordsResponse.error) {
          throw new Error(
            `No se han podido cargar los registros neuromusculares: ${recordsResponse.error.message}`,
          );
        }

        setPlayers((playersResponse.data ?? []) as PlayerRow[]);
        setRecords((recordsResponse.data ?? []) as NeuromuscularRecordRow[]);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar el perfil F-R.";

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const baseProfilePoints = useMemo(() => {
    return records
      .map(buildBaseProfilePoint)
      .filter(isBaseProfilePoint)
      .sort(
        (a, b) =>
          new Date(b.sessionDate).getTime() -
          new Date(a.sessionDate).getTime(),
      );
  }, [records]);

  const microcycleOptions = useMemo(() => {
    const options = new Set<string>();

    baseProfilePoints.forEach((point) => {
      if (point.microcycle) {
        options.add(point.microcycle);
      }
    });

    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [baseProfilePoints]);

  const filteredPoints = useMemo(() => {
    return baseProfilePoints.filter((point) => {
      if (
        selectedPlayer !== "all" &&
        point.normalizedName !== selectedPlayer
      ) {
        return false;
      }

      if (
        selectedMicrocycle !== "all" &&
        point.microcycle !== selectedMicrocycle
      ) {
        return false;
      }

      if (fromDate && point.sessionDate < fromDate) {
        return false;
      }

      if (toDate && point.sessionDate > toDate) {
        return false;
      }

      return true;
    });
  }, [
    baseProfilePoints,
    selectedPlayer,
    selectedMicrocycle,
    fromDate,
    toDate,
  ]);

  const latestPoints = useMemo(() => {
    return getLatestPointByPlayer(filteredPoints);
  }, [filteredPoints]);

  const selectedPlayerPoints = useMemo(() => {
    if (selectedPlayer === "all") return [];

    return filteredPoints
      .filter((point) => point.normalizedName === selectedPlayer)
      .sort(
        (a, b) =>
          new Date(a.sessionDate).getTime() -
          new Date(b.sessionDate).getTime(),
      );
  }, [filteredPoints, selectedPlayer]);

  const chartPoints = useMemo(() => {
    const sourcePoints =
      selectedPlayer === "all" ? latestPoints : selectedPlayerPoints;

    return sourcePoints.map((point) => ({
      ...point,
      x: point.rsimod ?? 0,
      y: point.vmp ?? 0,
      cmjValue: point.cmj ?? 0,
    }));
  }, [latestPoints, selectedPlayer, selectedPlayerPoints]);

  const summary = useMemo(() => {
    return {
      players: latestPoints.length,
      records: filteredPoints.length,
      cmj: average(filteredPoints.map((point) => point.cmj)),
      rsimod: average(filteredPoints.map((point) => point.rsimod)),
      vmp: average(filteredPoints.map((point) => point.vmp)),
      rpe: average(filteredPoints.map((point) => point.rpe)),
    };
  }, [filteredPoints, latestPoints]);

  const rankingCmj = useMemo(() => {
    return [...latestPoints]
      .filter((point) => point.cmj !== null)
      .sort((a, b) => Number(b.cmj ?? 0) - Number(a.cmj ?? 0))
      .slice(0, 5);
  }, [latestPoints]);

  const rankingRsi = useMemo(() => {
    return [...latestPoints]
      .filter((point) => point.rsimod !== null)
      .sort((a, b) => Number(b.rsimod ?? 0) - Number(a.rsimod ?? 0))
      .slice(0, 5);
  }, [latestPoints]);

  const rankingVmp = useMemo(() => {
    return [...latestPoints]
      .filter((point) => point.vmp !== null)
      .sort((a, b) => Number(b.vmp ?? 0) - Number(a.vmp ?? 0))
      .slice(0, 5);
  }, [latestPoints]);

  const evolutionData = useMemo(() => {
    if (selectedPlayer === "all") {
      return [];
    }

    return selectedPlayerPoints.map((point) => ({
      fecha: formatDate(point.sessionDate),
      CMJ: point.cmj ?? 0,
      "RSI mod": point.rsimod ?? 0,
      VMP: point.vmp ?? 0,
    }));
  }, [selectedPlayer, selectedPlayerPoints]);

  return (
    <AppShell
      title="Perfil F-R"
      subtitle="Análisis del perfil neuromuscular a partir de CMJ, RSI modificado, VMP en sentadilla, carga utilizada y percepción subjetiva de esfuerzo."
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Filtros
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Seleccionar análisis
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Puedes analizar el último perfil disponible de todo el equipo o
                revisar la evolución individual de un jugador concreto.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <label className="text-sm font-bold text-slate-700 lg:col-span-2">
              Jugador
              <select
                value={selectedPlayer}
                onChange={(event) => setSelectedPlayer(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">Todos los jugadores</option>

                {players.map((player) => (
                  <option key={player.id} value={player.normalized_name}>
                    {player.name} {player.position ? `· ${player.position}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Microciclo
              <select
                value={selectedMicrocycle}
                onChange={(event) => setSelectedMicrocycle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">Todos</option>

                {microcycleOptions.map((microcycle) => (
                  <option key={microcycle} value={microcycle}>
                    {microcycle}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Desde
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Hasta
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>

          {error && (
            <div className="mt-6">
              <StatusMessage variant="error" title="No se ha podido cargar el perfil F-R">
                {error}
              </StatusMessage>
            </div>
          )}

          {loading && (
            <div className="mt-6">
              <StatusMessage variant="info" title="Cargando perfil F-R">
                Cargando jugadores activos y registros neuromusculares para
                construir el perfil F-R.
              </StatusMessage>
            </div>
          )}
        </section>

        {!loading && !error && (
          <>
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-6">
              <SummaryCard title="Jugadores" value={summary.players} />

              <SummaryCard title="Registros" value={summary.records} />

              <SummaryCard
                title="CMJ medio"
                value={formatNumber(summary.cmj, 1, " cm")}
              />

              <SummaryCard
                title="RSI mod medio"
                value={formatNumber(summary.rsimod, 2)}
              />

              <SummaryCard
                title="VMP media"
                value={formatNumber(summary.vmp, 2, " m/s")}
              />

              <SummaryCard
                title="RPE medio"
                value={formatNumber(summary.rpe, 1)}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6 xl:col-span-2">
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                    Mapa de perfil
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Relación RSI modificado - VMP
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    El gráfico cruza la capacidad reactiva con la velocidad de
                    ejecución. Si seleccionas un jugador, se muestra su evolución
                    temporal.
                  </p>
                </div>

                {chartPoints.length === 0 ? (
                  <EmptyState>
                    No hay registros neuromusculares válidos para los filtros
                    seleccionados.
                  </EmptyState>
                ) : (
                  <div className="h-[340px] w-full sm:h-[420px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{
                          top: 20,
                          right: 12,
                          bottom: 20,
                          left: 0,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                          type="number"
                          dataKey="x"
                          name="RSI mod"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) =>
                            formatNumber(Number(value), 2)
                          }
                        />

                        <YAxis
                          type="number"
                          dataKey="y"
                          name="VMP"
                          width={48}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) =>
                            formatNumber(Number(value), 2)
                          }
                        />

                        <Tooltip
                          formatter={(value: unknown, name: unknown) => {
                            const label = String(name);
                            const number = Number(value);

                            if (label === "VMP") {
                              return [formatNumber(number, 2, " m/s"), label];
                            }

                            if (label === "RSI mod") {
                              return [formatNumber(number, 2), label];
                            }

                            return [formatNumber(number, 2), label];
                          }}
                        />

                        <Scatter
                          name="Perfil"
                          data={chartPoints}
                          fill="#020617"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Lectura rápida
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Interpretación
                </h2>

                <div className="mt-5 space-y-4">
                  {latestPoints.slice(0, 5).map((point) => {
                    const status = getProfileStatus(point);

                    return (
                      <div
                        key={point.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words font-black text-slate-950">
                              {point.playerName}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {point.position ?? "Sin posición"} ·{" "}
                              {formatDate(point.sessionDate)}
                            </p>
                          </div>

                          <span
                            className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getProfileStatusClass(
                              status,
                            )}`}
                          >
                            {getProfileStatusLabel(status)}
                          </span>
                        </div>

                        <p className="mt-3 text-xs font-bold leading-5 text-slate-600">
                          {getProfileInterpretation(point)}
                        </p>
                      </div>
                    );
                  })}

                  {latestPoints.length === 0 && (
                    <EmptyState>No hay datos disponibles para interpretar.</EmptyState>
                  )}
                </div>
              </div>
            </section>

            {selectedPlayer !== "all" && evolutionData.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Evolución individual
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Evolución del jugador seleccionado
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Evolución de CMJ, RSI modificado y VMP en las sesiones
                  neuromusculares disponibles.
                </p>

                <div className="mt-6 h-[320px] w-full sm:h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={evolutionData}
                      margin={{
                        top: 10,
                        right: 12,
                        left: 0,
                        bottom: 50,
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

                      <Tooltip />

                      <Bar dataKey="CMJ" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="RSI mod" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="VMP" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            <section className="grid gap-4 xl:grid-cols-3">
              <RankingCard
                title="Top CMJ"
                rows={rankingCmj}
                metric="cmj"
                suffix=" cm"
                decimals={1}
              />

              <RankingCard
                title="Top RSI mod"
                rows={rankingRsi}
                metric="rsimod"
                suffix=""
                decimals={2}
              />

              <RankingCard
                title="Top VMP"
                rows={rankingVmp}
                metric="vmp"
                suffix=" m/s"
                decimals={2}
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">
                  Registros de perfil F-R
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Tabla completa de los registros neuromusculares utilizados
                  para el análisis.
                </p>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {filteredPoints.map((point) => {
                  const status = getProfileStatus(point);

                  return (
                    <article key={point.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-slate-950">
                            {point.playerName}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {point.position ?? "Sin posición"} ·{" "}
                            {formatDate(point.sessionDate)} ·{" "}
                            {point.microcycle ?? "Sin microciclo"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getProfileStatusClass(
                            status,
                          )}`}
                        >
                          {getProfileStatusLabel(status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            CMJ
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(point.cmj, 1, " cm")}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            RSI mod
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(point.rsimod, 2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            VMP
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(point.vmp, 2, " m/s")}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Carga sentadilla
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(point.squatLoadKg, 1, " kg")}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            RPE
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(point.rpe, 1)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Fuente
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {point.source}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {filteredPoints.length === 0 && (
                  <div className="p-5">
                    <StatusMessage variant="warning" title="Sin registros F-R">
                      No hay registros para los filtros seleccionados.
                    </StatusMessage>
                  </div>
                )}
              </div>

              <div className="hidden max-h-[620px] overflow-auto md:block">
                <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Jugador</th>
                      <th className="px-4 py-3">Posición</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Microciclo</th>
                      <th className="px-4 py-3">CMJ</th>
                      <th className="px-4 py-3">RSI mod</th>
                      <th className="px-4 py-3">VMP</th>
                      <th className="px-4 py-3">Carga sentadilla</th>
                      <th className="px-4 py-3">RPE</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPoints.map((point) => {
                      const status = getProfileStatus(point);

                      return (
                        <tr key={point.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-black">
                            {point.playerName}
                          </td>

                          <td className="px-4 py-3">{point.position ?? "—"}</td>

                          <td className="px-4 py-3">
                            {formatDate(point.sessionDate)}
                          </td>

                          <td className="px-4 py-3">
                            {point.microcycle ?? "—"}
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {formatNumber(point.cmj, 1, " cm")}
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {formatNumber(point.rsimod, 2)}
                          </td>

                          <td className="px-4 py-3 font-bold">
                            {formatNumber(point.vmp, 2, " m/s")}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(point.squatLoadKg, 1, " kg")}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(point.rpe, 1)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${getProfileStatusClass(
                                status,
                              )}`}
                            >
                              {getProfileStatusLabel(status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredPoints.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-6">
                          <StatusMessage variant="warning" title="Sin registros F-R">
                            No hay registros para los filtros seleccionados.
                          </StatusMessage>
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

function RankingCard({
  title,
  rows,
  metric,
  suffix,
  decimals,
}: {
  title: string;
  rows: BaseProfilePoint[];
  metric: "cmj" | "rsimod" | "vmp";
  suffix: string;
  decimals: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
        {title}
      </h3>

      {rows.length === 0 ? (
        <div className="mt-4">
          <StatusMessage variant="warning" title="Sin datos suficientes">
            No hay datos suficientes.
          </StatusMessage>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <div
              key={`${row.id}-${metric}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-slate-950">
                    {row.playerName}
                  </p>

                  <p className="break-words text-xs font-bold text-slate-500">
                    {row.position ?? "Sin posición"}
                  </p>
                </div>
              </div>

              <p className="shrink-0 text-sm font-black text-slate-900">
                {formatNumber(row[metric], decimals, suffix)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
