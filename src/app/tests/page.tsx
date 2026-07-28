"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
import { TEST_DEFINITIONS, type TestCategory } from "@/lib/domain/performance";
import {
  getTestPlayersByTeamId,
  getTestResultsBySessionId,
  getTestScoresBySessionId,
  getTestSessionsFromSupabase,
  getTestTeamsFromSupabase,
  type TestPlayerRow,
  type TestResultRow,
  type TestScoreRow,
  type TestSessionRow,
  type TestTeamRow,
} from "@/lib/supabase/tests";

function getTeamLabel(team: TestTeamRow) {
  const details = [team.category, team.season]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" · ");

  return details ? `${team.name} · ${details}` : team.name;
}

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

type QuickReadingCard = {
  title: string;
  variant: "info" | "warning";
  message: string;
};

type TestsView = "catalog" | "history";

type CatalogTest = {
  category: TestCategory;
  name: string;
};

type CatalogMessage = {
  title: string;
  variant: "info" | "warning";
  message: string;
};

const TEST_VIEW_OPTIONS = [
  { id: "catalog", label: "Realizar tests" },
  { id: "history", label: "Resultados e histórico" },
] as const satisfies readonly { id: TestsView; label: string }[];

const TEST_CATALOG_GROUPS = TEST_DEFINITIONS.map((group) => ({
  category: group.category,
  tests: group.tests.map((name) => ({
    category: group.category,
    name,
  })),
}));

function getCatalogTestKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function getCatalogTestName(name: string) {
  const key = getCatalogTestKey(name);

  if (key.includes("PERFIL CARGA")) return "Perfil carga-velocidad";
  if (key.includes("PERFIL FUERZA")) return "Perfil fuerza-velocidad";
  if (key.includes("VMP SENTADILLA")) return "VMP sentadilla";
  if (key.includes("VMP HIP THRUST")) return "VMP hip thrust";
  if (key.includes("SPRINT 30")) return "Sprint 30 m";
  if (key.includes("ACELERACI")) return "Aceleración 5 m";
  if (key.includes("ABALAKOV")) return "Abalakov";
  if (key.includes("DROP JUMP")) return "Drop Jump";
  if (key.includes("30-15")) return "30-15 IFT";
  if (key.includes("RSA")) return "RSA 6 × 30 m";
  if (key.includes("ILLINOIS")) return "Illinois Test";
  if (key === "CMJ" || key === "SJ") return key;

  return name;
}

function getCatalogTestDescription(name: string) {
  const key = getCatalogTestKey(name);

  if (key.includes("PERFIL CARGA")) {
    return "Relación orientativa entre carga externa y velocidad de ejecución.";
  }

  if (key.includes("PERFIL FUERZA")) {
    return "Lectura inicial del perfil fuerza-velocidad con datos disponibles.";
  }

  if (key.includes("VMP SENTADILLA")) {
    return "Registro de velocidad media propulsiva en sentadilla.";
  }

  if (key.includes("VMP HIP THRUST")) {
    return "Registro de velocidad media propulsiva en hip thrust.";
  }

  if (key.includes("SPRINT 30")) {
    return "Medición de velocidad lineal en 30 metros.";
  }

  if (key.includes("ACELERACI")) {
    return "Medición de aceleración inicial en 5 metros.";
  }

  if (key === "CMJ") {
    return "Salto con contramovimiento para valorar expresión neuromuscular.";
  }

  if (key === "SJ") {
    return "Salto sin contramovimiento para observar componente concéntrico.";
  }

  if (key.includes("ABALAKOV")) {
    return "Salto con acción libre de brazos para observar capacidad de salto.";
  }

  if (key.includes("DROP JUMP")) {
    return "Salto reactivo para observar respuesta elástica y contacto.";
  }

  if (key.includes("30-15")) {
    return "Prueba intermitente para estimar capacidad aeróbica específica.";
  }

  if (key.includes("RSA")) {
    return "Repetición de sprints para observar tolerancia a esfuerzos repetidos.";
  }

  if (key.includes("ILLINOIS")) {
    return "Prueba de agilidad con cambios de dirección.";
  }

  return "Test disponible para preparar una toma de datos posterior.";
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
  const [teams, setTeams] = useState<TestTeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [sessions, setSessions] = useState<TestSessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [results, setResults] = useState<TestResultRow[]>([]);
  const [scores, setScores] = useState<TestScoreRow[]>([]);

  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [activeView, setActiveView] = useState<TestsView>("catalog");
  const [teamPlayers, setTeamPlayers] = useState<TestPlayerRow[]>([]);
  const [loadingTeamPlayers, setLoadingTeamPlayers] = useState(false);
  const [selectedCatalogTest, setSelectedCatalogTest] =
    useState<CatalogTest | null>(null);
  const [selectedCatalogPlayerId, setSelectedCatalogPlayerId] = useState("");
  const [catalogMessage, setCatalogMessage] =
    useState<CatalogMessage | null>(null);

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionsRequestId = useRef(0);

  async function loadSessionsForTeam(teamId: string) {
    const requestId = sessionsRequestId.current + 1;
    sessionsRequestId.current = requestId;

    if (!teamId) {
      setSessions([]);
      setSelectedSessionId("");
      return;
    }

    const data = await getTestSessionsFromSupabase(teamId);

    if (requestId !== sessionsRequestId.current) {
      return;
    }

    setSessions(data);
    setSelectedSessionId(data[0]?.id ?? "");
  }

  useEffect(() => {
    async function loadInitialTestsData() {
      try {
        setLoadingSessions(true);
        setError(null);

        const teamsData = await getTestTeamsFromSupabase();
        const [onlyTeam] = teamsData;
        const resolvedTeamId =
          teamsData.length === 1 && onlyTeam ? onlyTeam.id : "";

        setTeams(teamsData);
        setSelectedTeamId(resolvedTeamId);
        setResults([]);
        setScores([]);
        setSelectedCapacity("all");

        await loadSessionsForTeam(resolvedTeamId);
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

    loadInitialTestsData();
  }, []);

  async function handleTeamChange(teamId: string) {
    try {
      setLoadingSessions(true);
      setError(null);
      setSelectedTeamId(teamId);
      setSessions([]);
      setSelectedSessionId("");
      setResults([]);
      setScores([]);
      setSelectedCapacity("all");
      setTeamPlayers([]);
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setCatalogMessage(null);
      setLoadingData(false);

      await loadSessionsForTeam(teamId);
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

  function handleViewChange(view: TestsView) {
    setActiveView(view);

    if (view === "history") {
      setSelectedCatalogTest(null);
      setSelectedCatalogPlayerId("");
      setCatalogMessage(null);
    }
  }

  async function handleOpenCatalogTest(test: CatalogTest) {
    if (!selectedTeamId) {
      setCatalogMessage({
        variant: "warning",
        title: "Selecciona un equipo",
        message:
          "Elige un equipo antes de abrir un test para trabajar solo con sus jugadores activos.",
      });
      return;
    }

    setCatalogMessage(null);
    setSelectedCatalogTest(test);
    setSelectedCatalogPlayerId("");
    setTeamPlayers([]);

    try {
      setLoadingTeamPlayers(true);

      const playersData = await getTestPlayersByTeamId(selectedTeamId);

      setTeamPlayers(playersData);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar jugadores del equipo.";

      setCatalogMessage({
        variant: "warning",
        title: "No se han podido cargar jugadores",
        message,
      });
    } finally {
      setLoadingTeamPlayers(false);
    }
  }

  function handleBackToCatalog() {
    setSelectedCatalogTest(null);
    setSelectedCatalogPlayerId("");
    setCatalogMessage(null);
  }

  function handleContinueCatalogTest() {
    if (!selectedCatalogTest || !selectedCatalogPlayerId) {
      setCatalogMessage({
        variant: "warning",
        title: "Selecciona un jugador",
        message:
          "Elige un jugador activo del equipo antes de continuar con el test.",
      });
      return;
    }

    const player = teamPlayers.find(
      (candidate) => candidate.id === selectedCatalogPlayerId,
    );

    setCatalogMessage({
      variant: "info",
      title: "Test preparado",
      message: `${getCatalogTestName(
        selectedCatalogTest.name,
      )} queda preparado para ${
        player?.name ?? "el jugador seleccionado"
      }. En este bloque todavía no se abre formulario específico ni se guardan resultados.`,
    });
  }

  useEffect(() => {
    async function loadSessionData() {
      if (!selectedSessionId || !selectedTeamId) {
        setResults([]);
        setScores([]);
        setSelectedCapacity("all");
        return;
      }

      try {
        setLoadingData(true);
        setError(null);

        const [resultsData, scoresData] = await Promise.all([
          getTestResultsBySessionId(selectedSessionId, selectedTeamId),
          getTestScoresBySessionId(selectedSessionId, selectedTeamId),
        ]);

        if (ignore) {
          return;
        }

        setResults(resultsData);
        setScores(scoresData);
        setSelectedCapacity("all");
      } catch (err) {
        if (ignore) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar los datos de la sesión de tests.";

        setError(message);
      } finally {
        if (!ignore) {
          setLoadingData(false);
        }
      }
    }

    let ignore = false;
    loadSessionData();

    return () => {
      ignore = true;
    };
  }, [selectedSessionId, selectedTeamId]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const selectedTeam = useMemo(() => {
    return teams.find((team) => team.id === selectedTeamId) ?? null;
  }, [teams, selectedTeamId]);

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

  const quickTestReadingCards = useMemo<QuickReadingCard[]>(() => {
    const capacityMap = new Map<string, { total: number; count: number }>();

    scores.forEach((score) => {
      const value = Number(score.final_score);

      if (
        score.final_score === null ||
        score.final_score === undefined ||
        !Number.isFinite(value) ||
        !score.capacity
      ) {
        return;
      }

      const current = capacityMap.get(score.capacity) ?? {
        total: 0,
        count: 0,
      };

      current.total += value;
      current.count += 1;
      capacityMap.set(score.capacity, current);
    });

    const capacitySummaries = Array.from(capacityMap.entries())
      .map(([capacity, values]) => ({
        capacity,
        average: values.total / values.count,
      }))
      .sort((a, b) => b.average - a.average);
    const bestCapacity = capacitySummaries[0] ?? null;
    const lowestCapacity =
      capacitySummaries[capacitySummaries.length - 1] ?? null;
    const invalidScores = scores.filter((score) => {
      return (
        score.final_score === null ||
        score.final_score === undefined ||
        !Number.isFinite(Number(score.final_score))
      );
    }).length;
    const incompleteScores = scores.filter((score) => {
      const used = Number(score.used_variables);
      const expected = Number(score.expected_variables);

      return (
        Number.isFinite(used) &&
        Number.isFinite(expected) &&
        expected > 0 &&
        used < expected
      );
    }).length;
    const unavailableResults = results.filter(
      (result) =>
        result.available === false ||
        result.value === null ||
        result.value === undefined,
    ).length;
    const validScoreCount = scores.length - invalidScores;
    const generalMessage =
      summary.averageScore === null
        ? "Los últimos datos disponibles no permiten calcular una puntuación media válida."
        : `Los últimos datos disponibles incluyen ${
            validScoreCount
          } puntuaciones válidas, con una media descriptiva de ${formatNumber(
            summary.averageScore,
          )}. Resume esta sesión y no representa por sí sola el rendimiento global absoluto.`;
    const capacitiesMessage =
      !bestCapacity || !lowestCapacity
        ? "No hay puntuaciones suficientes para comparar capacidades."
        : bestCapacity.capacity === lowestCapacity.capacity
          ? `Solo hay datos comparables de ${
              bestCapacity.capacity
            }, con una media de ${formatNumber(bestCapacity.average)}.`
          : `La media más alta disponible corresponde a ${
              bestCapacity.capacity
            } (${formatNumber(
              bestCapacity.average,
            )}) y la más baja a ${lowestCapacity.capacity} (${formatNumber(
              lowestCapacity.average,
            )}). La comparación depende de la muestra y variables disponibles.`;
    const coverageMessages = [
      `Hay ${summary.players} jugadores, ${
        summary.capacities
      } capacidades, ${summary.variables} variables, ${
        summary.scores
      } puntuaciones y ${summary.results} resultados registrados.`,
      incompleteScores > 0
        ? `${incompleteScores} puntuaciones utilizan menos variables de las esperadas.`
        : null,
      unavailableResults > 0
        ? `${unavailableResults} resultados figuran como no disponibles o sin valor.`
        : null,
      invalidScores > 0
        ? `${invalidScores} puntuaciones no tienen un valor final válido.`
        : null,
    ].filter((value): value is string => Boolean(value));
    const hasCoverageIssue =
      incompleteScores > 0 || unavailableResults > 0 || invalidScores > 0;
    const recommendationMessage = hasCoverageIssue
      ? "Completar o revisar los datos incompletos antes de comparar perfiles y priorizar las capacidades con menor media solo después de confirmar su cobertura."
      : "Revisar las capacidades con menor media junto a sus variables de origen y al contexto del jugador; una sesión aislada no define rendimiento global ni riesgo.";

    return [
      {
        title: "Estado general",
        variant: "info",
        message: generalMessage,
      },
      {
        title: "Capacidades destacadas",
        variant: "info",
        message: capacitiesMessage,
      },
      {
        title: "Cobertura de datos",
        variant: hasCoverageIssue ? "warning" : "info",
        message: coverageMessages.join(" "),
      },
      {
        title: "Recomendación para el staff",
        variant: hasCoverageIssue ? "warning" : "info",
        message: recommendationMessage,
      },
    ];
  }, [results, scores, summary]);

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

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {selectedTeam
                  ? `Mostrando sesiones de ${getTeamLabel(selectedTeam)}.`
                  : "Selecciona un equipo para evitar mezclar datos de tests."}
              </p>
            </div>

            <div className="grid w-full gap-3 md:w-[480px]">
              <label className="text-sm font-bold text-slate-700">
                Equipo
                <select
                  value={selectedTeamId}
                  onChange={(event) => {
                    void handleTeamChange(event.target.value);
                  }}
                  disabled={loadingSessions || teams.length === 0}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">Selecciona equipo</option>

                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {getTeamLabel(team)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold text-slate-700">
              Sesión
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                disabled={
                  loadingSessions || !selectedTeamId || sessions.length === 0
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
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

          {!loadingSessions && teams.length === 0 && (
            <div className="mt-6">
              <StatusMessage
                variant="warning"
                title="No hay equipos disponibles"
              >
                Crea o confirma un equipo antes de consultar tests por equipo.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && teams.length > 1 && !selectedTeamId && (
            <div className="mt-6">
              <StatusMessage variant="warning" title="Selecciona un equipo">
                Para evitar mezclar datos de varios equipos, selecciona un
                equipo antes de mostrar sesiones, jugadores, resultados,
                puntuaciones, rankings, tablas y lectura rápida de tests.
              </StatusMessage>
            </div>
          )}

          {!loadingSessions && selectedTeamId && sessions.length === 0 && (
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

          {activeView === "history" && selectedSession && (
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

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            {TEST_VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleViewChange(option.id)}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  activeView === option.id
                    ? "bg-slate-950 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {activeView === "catalog" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
            {selectedCatalogTest ? (
              <>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                      Test seleccionado
                    </p>

                    <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                      {getCatalogTestName(selectedCatalogTest.name)}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {getCatalogTestDescription(selectedCatalogTest.name)}
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    {selectedCatalogTest.category}
                  </span>
                </div>

                {catalogMessage && (
                  <div className="mt-6">
                    <StatusMessage
                      variant={catalogMessage.variant}
                      title={catalogMessage.title}
                    >
                      {catalogMessage.message}
                    </StatusMessage>
                  </div>
                )}

                <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
                  <label className="text-sm font-bold text-slate-700">
                    Jugador del equipo seleccionado
                    <select
                      value={selectedCatalogPlayerId}
                      onChange={(event) =>
                        setSelectedCatalogPlayerId(event.target.value)
                      }
                      disabled={
                        loadingTeamPlayers ||
                        !selectedTeamId ||
                        teamPlayers.length === 0
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {loadingTeamPlayers
                          ? "Cargando jugadores activos"
                          : "Selecciona jugador"}
                      </option>

                      {teamPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                          {player.position ? ` · ${player.position}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {selectedTeam
                      ? `Mostrando solo jugadores activos de ${getTeamLabel(
                          selectedTeam,
                        )}.`
                      : "Selecciona un equipo para cargar sus jugadores activos."}
                  </p>
                </div>

                {selectedTeamId &&
                  !loadingTeamPlayers &&
                  teamPlayers.length === 0 && (
                    <div className="mt-6">
                      <EmptyState
                        title="Sin jugadores activos"
                        description="No hay jugadores activos disponibles para iniciar este test en el equipo seleccionado."
                      />
                    </div>
                  )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleBackToCatalog}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                  >
                    Volver
                  </button>

                  <button
                    type="button"
                    onClick={handleContinueCatalogTest}
                    disabled={!selectedCatalogPlayerId}
                    className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                      Catálogo ejecutable
                    </p>

                    <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                      Realizar tests
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      Selecciona un test del catálogo para preparar la toma de
                      datos. En este bloque todavía no se guardan resultados ni
                      se abren formularios específicos.
                    </p>
                  </div>
                </div>

                {!selectedTeamId && (
                  <div className="mt-6">
                    <StatusMessage variant="warning" title="Selecciona un equipo">
                      Para abrir un test, selecciona antes un equipo y trabaja
                      solo con sus jugadores activos.
                    </StatusMessage>
                  </div>
                )}

                {catalogMessage && (
                  <div className="mt-6">
                    <StatusMessage
                      variant={catalogMessage.variant}
                      title={catalogMessage.title}
                    >
                      {catalogMessage.message}
                    </StatusMessage>
                  </div>
                )}

                <div className="mt-6 space-y-7">
                  {TEST_CATALOG_GROUPS.map((group) => (
                    <div key={group.category}>
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                        {group.category}
                      </h3>

                      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {group.tests.map((test) => (
                          <article
                            key={`${test.category}-${test.name}`}
                            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                {test.category}
                              </p>

                              <h4 className="mt-2 text-base font-black text-slate-950">
                                {getCatalogTestName(test.name)}
                              </h4>

                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {getCatalogTestDescription(test.name)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                void handleOpenCatalogTest(test);
                              }}
                              className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800"
                            >
                              Abrir test
                            </button>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeView === "history" && selectedSessionId && (
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

                {(scores.length > 0 || results.length > 0) && (
                  <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                      Interpretación de tests
                    </p>

                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      Lectura rápida de tests
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Señales orientativas a partir de los últimos datos
                      disponibles de la sesión seleccionada.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {quickTestReadingCards.map((card) => (
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

