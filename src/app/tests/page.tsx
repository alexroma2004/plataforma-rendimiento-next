"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
import {
  getTestResultsBySessionId,
  getTestScoresBySessionId,
  getTestSessionsFromSupabase,
  type TestResultRow,
  type TestScoreRow,
  type TestSessionRow,
} from "@/lib/supabase/tests";

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

function formatValue(value: number | null | undefined, unit: string | null) {
  if (value === null || value === undefined) return "—";

  const formatted = formatNumber(value, 2);

  return unit ? `${formatted} ${unit}` : formatted;
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

function getUniquePlayers(
  rows: Array<{ normalized_name: string; player_name: string }>,
) {
  const players = new Map<string, string>();

  rows.forEach((row) => {
    players.set(row.normalized_name, row.player_name);
  });

  return players;
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

function ClassificationBadge({
  classification,
}: {
  classification: string | null | undefined;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getClassificationClass(
        classification,
      )}`}
    >
      {classification ?? "Sin clasificar"}
    </span>
  );
}

export default function TestsPage() {
  const [sessions, setSessions] = useState<TestSessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [results, setResults] = useState<TestResultRow[]>([]);
  const [scores, setScores] = useState<TestScoreRow[]>([]);

  const [selectedCapacity, setSelectedCapacity] = useState("all");

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoadingSessions(true);
        setError(null);

        const data = await getTestSessionsFromSupabase();

        setSessions(data);

        if (data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar las sesiones de tests.";

        setError(message);
      } finally {
        setLoadingSessions(false);
      }
    }

    loadSessions();
  }, []);

  useEffect(() => {
    async function loadSessionData() {
      if (!selectedSessionId) {
        setResults([]);
        setScores([]);
        return;
      }

      try {
        setLoadingData(true);
        setError(null);

        const [resultsData, scoresData] = await Promise.all([
          getTestResultsBySessionId(selectedSessionId),
          getTestScoresBySessionId(selectedSessionId),
        ]);

        setResults(resultsData);
        setScores(scoresData);
        setSelectedCapacity("all");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar los datos de la sesión de tests.";

        setError(message);
      } finally {
        setLoadingData(false);
      }
    }

    loadSessionData();
  }, [selectedSessionId]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const capacityOptions = useMemo(() => {
    const capacities = new Set<string>();

    scores.forEach((score) => {
      if (score.capacity) capacities.add(score.capacity);
    });

    return Array.from(capacities).sort((a, b) => a.localeCompare(b));
  }, [scores]);

  const filteredScores = useMemo(() => {
    if (selectedCapacity === "all") return scores;

    return scores.filter((score) => score.capacity === selectedCapacity);
  }, [scores, selectedCapacity]);

  const filteredResults = useMemo(() => {
    if (selectedCapacity === "all") return results;

    return results.filter((result) => result.test_block === selectedCapacity);
  }, [results, selectedCapacity]);

  const summary = useMemo(() => {
    const players = getUniquePlayers(results.length > 0 ? results : scores);

    const validScores = scores.filter(
      (score) =>
        score.final_score !== null &&
        score.final_score !== undefined &&
        Number.isFinite(Number(score.final_score)),
    );

    const averageScore =
      validScores.length > 0
        ? validScores.reduce(
            (sum, score) => sum + Number(score.final_score),
            0,
          ) / validScores.length
        : null;

    const capacities = new Set(
      scores.map((score) => score.capacity).filter(Boolean),
    );

    const variables = new Set(
      results.map((result) => result.variable).filter(Boolean),
    );

    return {
      players: players.size,
      scores: scores.length,
      results: results.length,
      capacities: capacities.size,
      variables: variables.size,
      averageScore,
    };
  }, [results, scores]);

  const rankingRows = useMemo(() => {
    const players = new Map<
      string,
      {
        playerName: string;
        position: string | null;
        totalScore: number;
        count: number;
        averageScore: number;
      }
    >();

    scores.forEach((score) => {
      if (score.final_score === null || score.final_score === undefined) return;

      const current = players.get(score.normalized_name) ?? {
        playerName: score.player_name,
        position: score.position,
        totalScore: 0,
        count: 0,
        averageScore: 0,
      };

      current.totalScore += Number(score.final_score);
      current.count += 1;
      current.averageScore = current.totalScore / current.count;

      players.set(score.normalized_name, current);
    });

    return Array.from(players.values()).sort(
      (a, b) => b.averageScore - a.averageScore,
    );
  }, [scores]);

  return (
    <AppShell
      title="Tests físicos"
      subtitle="Visualización de sesiones de tests guardadas en Supabase. Consulta las puntuaciones por capacidad, los resultados por variable y el ranking general de jugadores."
      actions={
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/cargar-tests"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-slate-950 shadow transition hover:bg-slate-100"
          >
            Cargar nueva sesión de tests
          </Link>

          <Link
            href="/cargar"
            className="rounded-xl border border-white/20 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
          >
            Ir a carga de datos
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Sesiones guardadas
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Seleccionar sesión de tests
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Selecciona una sesión para visualizar los resultados físicos
                importados.
              </p>
            </div>

            <label className="w-full text-sm font-bold text-slate-700 md:w-[420px]">
              Sesión
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                disabled={loadingSessions || sessions.length === 0}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                {sessions.length === 0 && (
                  <option value="">No hay sesiones de tests guardadas</option>
                )}

                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_date} · {session.context} ·{" "}
                    {session.session_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="mt-6">
              <StatusMessage variant="error" title="No se han podido cargar los tests">
                {error}
              </StatusMessage>
            </div>
          )}

          {loadingSessions && (
            <div className="mt-6">
              <StatusMessage variant="info" title="Cargando sesiones de tests">
                Cargando sesiones de tests guardadas en Supabase.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && sessions.length === 0 && (
            <div className="mt-6">
              <EmptyState
                title="Sin sesiones de tests"
                description="Todavía no hay sesiones de tests guardadas. Primero carga una sesión desde el apartado de carga de tests."
                action={
                  <Link
                    href="/cargar-tests"
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow hover:bg-slate-800"
                  >
                    Cargar sesión de tests
                  </Link>
                }
              />
            </div>
          )}

          {selectedSession && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Fecha</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.session_date}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Contexto</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.context}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Sesión</p>
                <p className="mt-2 break-words text-lg font-black text-slate-950 sm:text-xl">
                  {selectedSession.session_name}
                </p>
              </div>
            </div>
          )}
        </section>

        {selectedSessionId && (
          <section>
            {loadingData ? (
              <StatusMessage variant="info" title="Cargando resultados de tests">
                Cargando puntuaciones por capacidad y resultados por variable de
                la sesión seleccionada.
              </StatusMessage>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <SummaryCard title="Jugadores" value={summary.players} />

                  <SummaryCard title="Capacidades" value={summary.capacities} />

                  <SummaryCard title="Variables" value={summary.variables} />

                  <SummaryCard
                    title="Puntuación media"
                    value={formatNumber(summary.averageScore)}
                  />
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                        Filtro
                      </p>

                      <h2 className="mt-2 text-xl font-black text-slate-950">
                        Análisis por capacidad
                      </h2>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Filtra los resultados para analizar una capacidad
                        concreta o revisa todas las puntuaciones de la sesión.
                      </p>
                    </div>

                    <label className="w-full text-sm font-bold text-slate-700 md:w-[320px]">
                      Capacidad
                      <select
                        value={selectedCapacity}
                        onChange={(event) =>
                          setSelectedCapacity(event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="all">Todas las capacidades</option>

                        {capacityOptions.map((capacity) => (
                          <option key={capacity} value={capacity}>
                            {capacity}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                      Ranking general
                    </h3>

                    {rankingRows.length === 0 ? (
                      <div className="mt-4">
                        <EmptyState
                          title="Sin ranking disponible"
                          description="No hay puntuaciones disponibles para generar el ranking general de jugadores."
                        />
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {rankingRows.slice(0, 10).map((row, index) => (
                          <div
                            key={`${row.playerName}-${index}`}
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
                              {formatNumber(row.averageScore)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow xl:col-span-2">
                    <div className="border-b border-slate-200 p-5">
                      <h2 className="text-xl font-black text-slate-950">
                        Puntuación por capacidad
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Puntuación final calculada para cada jugador y
                        capacidad.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100 md:hidden">
                      {filteredScores.map((score) => (
                        <article key={score.id} className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-base font-black text-slate-950">
                                {score.player_name}
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {score.position ?? "Sin posición"} ·{" "}
                                {score.capacity}
                              </p>
                            </div>

                            <ClassificationBadge
                              classification={score.classification}
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                Puntuación
                              </p>
                              <p className="mt-1 text-2xl font-black text-slate-950">
                                {formatNumber(score.final_score)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                Variables
                              </p>
                              <p className="mt-1 font-black text-slate-950">
                                {score.used_variables ?? "—"}/
                                {score.expected_variables ?? "—"}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}

                      {filteredScores.length === 0 && (
                        <div className="p-5">
                          <EmptyState
                            title="Sin puntuaciones"
                            description="No hay puntuaciones para esta selección. Cambia la capacidad o carga una sesión con puntuaciones válidas."
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
                            <th className="px-4 py-3">Capacidad</th>
                            <th className="px-4 py-3">Puntuación</th>
                            <th className="px-4 py-3">Clasificación</th>
                            <th className="px-4 py-3">Variables</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredScores.map((score) => (
                            <tr
                              key={score.id}
                              className="border-t border-slate-100"
                            >
                              <td className="px-4 py-3 font-black">
                                {score.player_name}
                              </td>

                              <td className="px-4 py-3">
                                {score.position ?? "—"}
                              </td>

                              <td className="px-4 py-3 font-bold">
                                {score.capacity}
                              </td>

                              <td className="px-4 py-3 font-black">
                                {formatNumber(score.final_score)}
                              </td>

                              <td className="px-4 py-3">
                                <ClassificationBadge
                                  classification={score.classification}
                                />
                              </td>

                              <td className="px-4 py-3">
                                {score.used_variables ?? "—"}/
                                {score.expected_variables ?? "—"}
                              </td>
                            </tr>
                          ))}

                          {filteredScores.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-6">
                                <EmptyState
                                  title="Sin puntuaciones"
                                  description="No hay puntuaciones para esta selección. Cambia la capacidad o carga una sesión con puntuaciones válidas."
                                />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
                  <div className="border-b border-slate-200 p-5">
                    <h2 className="text-xl font-black text-slate-950">
                      Resultados por variable
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Tabla completa con los valores originales, ponderaciones y
                      clasificación por variable.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredResults.map((result) => (
                      <article key={result.id} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-black text-slate-950">
                              {result.player_name}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {result.position ?? "Sin posición"} ·{" "}
                              {result.test_block}
                            </p>
                          </div>

                          <ClassificationBadge
                            classification={result.classification}
                          />
                        </div>

                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Variable
                          </p>

                          <p className="mt-1 break-words text-sm font-black text-slate-950">
                            {result.variable}
                          </p>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
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
                              {formatNumber(result.variable_score)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Peso original
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(result.original_weight)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Peso usado
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(result.used_weight)}
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

                    {filteredResults.length === 0 && (
                      <div className="p-5">
                        <EmptyState
                          title="Sin resultados por variable"
                          description="No hay resultados por variable para esta selección. Cambia la capacidad o revisa la sesión de tests cargada."
                        />
                      </div>
                    )}
                  </div>

                  <div className="hidden max-h-[620px] overflow-auto md:block">
                    <table className="w-full min-w-[1300px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Jugador</th>
                          <th className="px-4 py-3">Posición</th>
                          <th className="px-4 py-3">Bloque</th>
                          <th className="px-4 py-3">Variable</th>
                          <th className="px-4 py-3">Valor</th>
                          <th className="px-4 py-3">Peso original</th>
                          <th className="px-4 py-3">Peso usado</th>
                          <th className="px-4 py-3">Puntuación variable</th>
                          <th className="px-4 py-3">Clasificación</th>
                          <th className="px-4 py-3">Disponible</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredResults.map((result) => (
                          <tr
                            key={result.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3 font-black">
                              {result.player_name}
                            </td>

                            <td className="px-4 py-3">
                              {result.position ?? "—"}
                            </td>

                            <td className="px-4 py-3 font-bold">
                              {result.test_block}
                            </td>

                            <td className="px-4 py-3">{result.variable}</td>

                            <td className="px-4 py-3 font-black">
                              {formatValue(result.value, result.unit)}
                            </td>

                            <td className="px-4 py-3">
                              {formatNumber(result.original_weight)}
                            </td>

                            <td className="px-4 py-3">
                              {formatNumber(result.used_weight)}
                            </td>

                            <td className="px-4 py-3">
                              {formatNumber(result.variable_score)}
                            </td>

                            <td className="px-4 py-3">
                              <ClassificationBadge
                                classification={result.classification}
                              />
                            </td>

                            <td className="px-4 py-3">
                              {result.available === false ? "No" : "Sí"}
                            </td>
                          </tr>
                        ))}

                        {filteredResults.length === 0 && (
                          <tr>
                            <td colSpan={10} className="px-4 py-6">
                              <EmptyState
                                title="Sin resultados por variable"
                                description="No hay resultados por variable para esta selección. Cambia la capacidad o revisa la sesión de tests cargada."
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

