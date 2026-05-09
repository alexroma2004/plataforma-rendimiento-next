"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type GpsSession = {
  id: string;
  session_date: string;
  microcycle: string | null;
  session_name: string | null;
  source_filename: string | null;
  is_match: boolean | null;
  notes: string | null;
  created_at: string | null;
};

type GpsRecord = {
  id: string;
  session_id: string;
  player_id: string | null;
  player_name: string | null;
  normalized_name: string | null;
  position: string | null;
  is_goalkeeper: boolean | null;
  time_played: number | null;

  total_distance: number | null;
  hsr: number | null;
  distance_vrange6: number | null;
  sprints: number | null;
  num_acc: number | null;
  num_dec: number | null;

  reference_total_distance: number | null;
  reference_hsr: number | null;
  reference_distance_vrange6: number | null;
  reference_sprints: number | null;
  reference_num_acc: number | null;
  reference_num_dec: number | null;

  pct_total_distance: number | null;
  pct_hsr: number | null;
  pct_distance_vrange6: number | null;
  pct_sprints: number | null;
  pct_num_acc: number | null;
  pct_num_dec: number | null;

  gps_status: string | null;
  notes: string | null;
};

type SortKey =
  | "total_distance"
  | "hsr"
  | "distance_vrange6"
  | "sprints"
  | "num_acc"
  | "num_dec";

const MATCH_REFERENCE = {
  total_distance: 11039.7,
  hsr: 567.23,
  distance_vrange6: 185.94,
  sprints: 11.08,
  num_acc: 128.55,
  num_dec: 120.17,
};

function toNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString("es-ES", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function formatMeters(value: number) {
  return `${formatNumber(Math.round(value))} m`;
}

function formatPercent(value: number) {
  return `${formatNumber(value, 1)}%`;
}

function getPct(value: number, reference: number) {
  if (!reference || reference <= 0) return 0;
  return (value / reference) * 100;
}

function getLoadStatus(pct: number) {
  if (pct >= 90) {
    return {
      label: "Muy alta",
      className: "bg-red-50 text-red-700 border-red-200",
      bar: "bg-red-500",
    };
  }

  if (pct >= 70) {
    return {
      label: "Alta",
      className: "bg-orange-50 text-orange-700 border-orange-200",
      bar: "bg-orange-500",
    };
  }

  if (pct >= 45) {
    return {
      label: "Moderada",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
      bar: "bg-yellow-500",
    };
  }

  return {
    label: "Baja",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
  };
}

function getRecordReference(row: GpsRecord, key: SortKey) {
  if (key === "total_distance") {
    return toNumber(row.reference_total_distance) || MATCH_REFERENCE.total_distance;
  }

  if (key === "hsr") {
    return toNumber(row.reference_hsr) || MATCH_REFERENCE.hsr;
  }

  if (key === "distance_vrange6") {
    return (
      toNumber(row.reference_distance_vrange6) ||
      MATCH_REFERENCE.distance_vrange6
    );
  }

  if (key === "sprints") {
    return toNumber(row.reference_sprints) || MATCH_REFERENCE.sprints;
  }

  if (key === "num_acc") {
    return toNumber(row.reference_num_acc) || MATCH_REFERENCE.num_acc;
  }

  return toNumber(row.reference_num_dec) || MATCH_REFERENCE.num_dec;
}

function getRecordValue(row: GpsRecord, key: SortKey) {
  return toNumber(row[key]);
}

function getMetricLabel(key: SortKey) {
  if (key === "total_distance") return "Distancia total";
  if (key === "hsr") return "HSR";
  if (key === "distance_vrange6") return "Distancia sprint";
  if (key === "sprints") return "Nº sprints";
  if (key === "num_acc") return "Aceleraciones";
  return "Deceleraciones";
}

function getMetricUnit(key: SortKey) {
  if (key === "total_distance") return "m";
  if (key === "hsr") return "m";
  if (key === "distance_vrange6") return "m";
  return "";
}

function formatMetricValue(value: number, key: SortKey) {
  const unit = getMetricUnit(key);

  if (unit === "m") {
    return formatMeters(value);
  }

  return formatNumber(Math.round(value));
}

export default function GpsPage() {
  const [sessions, setSessions] = useState<GpsSession[]>([]);
  const [records, setRecords] = useState<GpsRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_distance");
  const [showGoalkeepers, setShowGoalkeepers] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoadingSessions(true);
        setError("");

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
          .from("gps_sessions")
          .select(
            "id, session_date, microcycle, session_name, source_filename, is_match, notes, created_at"
          )
          .order("session_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const loadedSessions = data ?? [];

        setSessions(loadedSessions);

        if (loadedSessions.length > 0) {
          setSelectedSessionId(loadedSessions[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("No se han podido cargar las sesiones GPS.");
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
        setError("");

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
          .from("gps_records")
          .select(
            `
            id,
            session_id,
            player_id,
            player_name,
            normalized_name,
            position,
            is_goalkeeper,
            time_played,
            total_distance,
            hsr,
            distance_vrange6,
            sprints,
            num_acc,
            num_dec,
            reference_total_distance,
            reference_hsr,
            reference_distance_vrange6,
            reference_sprints,
            reference_num_acc,
            reference_num_dec,
            pct_total_distance,
            pct_hsr,
            pct_distance_vrange6,
            pct_sprints,
            pct_num_acc,
            pct_num_dec,
            gps_status,
            notes
          `
          )
          .eq("session_id", selectedSessionId)
          .order("total_distance", { ascending: false });

        if (error) {
          throw error;
        }

        setRecords(data ?? []);
      } catch (err) {
        console.error(err);
        setError("No se han podido cargar los registros GPS de la sesión.");
      } finally {
        setLoadingRecords(false);
      }
    }

    loadRecords();
  }, [selectedSessionId]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const filteredRecords = useMemo(() => {
    const base = showGoalkeepers
      ? records
      : records.filter((row) => !row.is_goalkeeper);

    return [...base].sort((a, b) => {
      return getRecordValue(b, sortKey) - getRecordValue(a, sortKey);
    });
  }, [records, showGoalkeepers, sortKey]);

  const summary = useMemo(() => {
    const players = filteredRecords.length;

    const totalDistance = filteredRecords.reduce(
      (sum, row) => sum + toNumber(row.total_distance),
      0
    );

    const totalHsr = filteredRecords.reduce(
      (sum, row) => sum + toNumber(row.hsr),
      0
    );

    const totalSprintDistance = filteredRecords.reduce(
      (sum, row) => sum + toNumber(row.distance_vrange6),
      0
    );

    const totalSprints = filteredRecords.reduce(
      (sum, row) => sum + toNumber(row.sprints),
      0
    );

    const totalAcc = filteredRecords.reduce(
      (sum, row) => sum + toNumber(row.num_acc),
      0
    );

    const totalDec = filteredRecords.reduce(
      (sum, row) => sum + toNumber(row.num_dec),
      0
    );

    const averageDistance = players > 0 ? totalDistance / players : 0;
    const averageHsr = players > 0 ? totalHsr / players : 0;
    const averageSprintDistance = players > 0 ? totalSprintDistance / players : 0;

    const averageMatchPct =
      players > 0
        ? getPct(averageDistance, MATCH_REFERENCE.total_distance)
        : 0;

    const mostLoadedPlayer =
      filteredRecords.length > 0
        ? [...filteredRecords].sort(
            (a, b) => toNumber(b.total_distance) - toNumber(a.total_distance)
          )[0]
        : null;

    return {
      players,
      totalDistance,
      totalHsr,
      totalSprintDistance,
      totalSprints,
      totalAcc,
      totalDec,
      averageDistance,
      averageHsr,
      averageSprintDistance,
      averageMatchPct,
      mostLoadedPlayer,
    };
  }, [filteredRecords]);

  const sessionLabel = selectedSession
    ? `${selectedSession.session_date} · ${selectedSession.microcycle ?? "Sin MD"} · ${
        selectedSession.session_name ?? "Sesión GPS"
      }`
    : "Sin sesión seleccionada";

  const maxValueForRanking = useMemo(() => {
    const max = Math.max(
      ...filteredRecords.map((row) => getRecordValue(row, sortKey)),
      0
    );

    return max > 0 ? max : 1;
  }, [filteredRecords, sortKey]);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-950">
      <section className="rounded-2xl bg-slate-950 p-8 text-white shadow">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
          Plataforma de rendimiento
        </p>

        <h1 className="mt-3 text-4xl font-black">GPS</h1>

        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200">
          Dashboard de carga externa: distancia total, HSR, distancia a sprint,
          número de sprints, aceleraciones, deceleraciones y comparación con
          referencias de partido.
        </p>
      </section>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <label className="text-sm font-bold text-slate-700">
            Sesión GPS
            <select
              value={selectedSessionId}
              onChange={(event) => setSelectedSessionId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.session_date} · {session.microcycle ?? "Sin MD"} ·{" "}
                  {session.session_name ?? "Sesión GPS"}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-slate-700">
            Ranking principal
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="total_distance">Distancia total</option>
              <option value="hsr">HSR</option>
              <option value="distance_vrange6">Distancia sprint</option>
              <option value="sprints">Nº sprints</option>
              <option value="num_acc">Aceleraciones</option>
              <option value="num_dec">Deceleraciones</option>
            </select>
          </label>

          <label className="flex items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={showGoalkeepers}
              onChange={(event) => setShowGoalkeepers(event.target.checked)}
            />
            Incluir porteros
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-black text-slate-950">Sesión seleccionada:</span>{" "}
          {sessionLabel}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold text-slate-500">Jugadores</p>
          <p className="mt-2 text-3xl font-black">{summary.players}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold text-slate-500">Distancia total</p>
          <p className="mt-2 text-3xl font-black">
            {formatMeters(summary.totalDistance)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Media: {formatMeters(summary.averageDistance)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold text-slate-500">HSR total</p>
          <p className="mt-2 text-3xl font-black">
            {formatMeters(summary.totalHsr)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Media: {formatMeters(summary.averageHsr)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold text-slate-500">Sprint total</p>
          <p className="mt-2 text-3xl font-black">
            {formatMeters(summary.totalSprintDistance)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Media: {formatMeters(summary.averageSprintDistance)}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold text-slate-500">Sprints totales</p>
          <p className="mt-2 text-3xl font-black">
            {formatNumber(summary.totalSprints)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold text-slate-500">Aceleraciones</p>
          <p className="mt-2 text-3xl font-black">
            {formatNumber(summary.totalAcc)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold text-slate-500">Deceleraciones</p>
          <p className="mt-2 text-3xl font-black">
            {formatNumber(summary.totalDec)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold text-slate-500">
            Media vs partido
          </p>
          <p className="mt-2 text-3xl font-black">
            {formatPercent(summary.averageMatchPct)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Según distancia media por jugador.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                Ranking
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {getMetricLabel(sortKey)} por jugador
              </h2>
            </div>

            <p className="text-sm text-slate-500">
              Ordenado de mayor a menor carga.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {filteredRecords.map((row, index) => {
              const value = getRecordValue(row, sortKey);
              const pctWidth = Math.min((value / maxValueForRanking) * 100, 100);

              return (
                <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {index + 1}. {row.player_name ?? row.normalized_name ?? "Jugador"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.position || "Sin posición"}
                      </p>
                    </div>

                    <p className="text-sm font-black text-slate-950">
                      {formatMetricValue(value, sortKey)}
                    </p>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-950"
                      style={{ width: `${pctWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {!loadingRecords && filteredRecords.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                No hay registros GPS para esta sesión.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
            Referencia partido
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Carga relativa individual
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Este bloque compara la carga de cada jugador con una referencia de
            partido. Sirve para interpretar si la sesión se acerca poco, mucho o
            demasiado a las demandas competitivas.
          </p>

          <div className="mt-6 space-y-4">
            {filteredRecords.slice(0, 8).map((row) => {
              const value = getRecordValue(row, sortKey);
              const reference = getRecordReference(row, sortKey);
              const pct = getPct(value, reference);
              const status = getLoadStatus(pct);

              return (
                <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black">
                        {row.player_name ?? row.normalized_name ?? "Jugador"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatMetricValue(value, sortKey)} / ref.{" "}
                        {formatMetricValue(reference, sortKey)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${status.bar}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    <p className="w-16 text-right text-xs font-black">
                      {formatPercent(pct)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
              Tabla completa
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Registros GPS de la sesión
            </h2>
          </div>

          {loadingRecords && (
            <p className="text-sm font-bold text-slate-500">
              Cargando registros...
            </p>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[1300px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3">Posición</th>
                  <th className="px-4 py-3">Distancia</th>
                  <th className="px-4 py-3">HSR</th>
                  <th className="px-4 py-3">Sprint</th>
                  <th className="px-4 py-3">Sprints</th>
                  <th className="px-4 py-3">ACC</th>
                  <th className="px-4 py-3">DEC</th>
                  <th className="px-4 py-3">% distancia</th>
                  <th className="px-4 py-3">% HSR</th>
                  <th className="px-4 py-3">% sprint</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((row) => {
                  const pctDistance = getPct(
                    toNumber(row.total_distance),
                    getRecordReference(row, "total_distance")
                  );

                  const pctHsr = getPct(
                    toNumber(row.hsr),
                    getRecordReference(row, "hsr")
                  );

                  const pctSprint = getPct(
                    toNumber(row.distance_vrange6),
                    getRecordReference(row, "distance_vrange6")
                  );

                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-black">
                        {row.player_name ?? row.normalized_name ?? "Jugador"}
                      </td>
                      <td className="px-4 py-3">{row.position || "—"}</td>
                      <td className="px-4 py-3">
                        {formatMeters(toNumber(row.total_distance))}
                      </td>
                      <td className="px-4 py-3">
                        {formatMeters(toNumber(row.hsr))}
                      </td>
                      <td className="px-4 py-3">
                        {formatMeters(toNumber(row.distance_vrange6))}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(toNumber(row.sprints))}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(toNumber(row.num_acc))}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(toNumber(row.num_dec))}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {formatPercent(pctDistance)}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {formatPercent(pctHsr)}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {formatPercent(pctSprint)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}