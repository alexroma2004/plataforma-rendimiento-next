"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  getPlayerDashboardData,
  type PlayerDashboardData,
} from "@/lib/supabase/player-dashboard";
import {
  buildPerformanceInsights,
  type InsightCategory,
  type InsightPriority,
  type PerformanceInsight,
} from "@/lib/analytics/performance-insights";

type CategoryFilter = "all" | InsightCategory;
type PriorityFilter = "all" | InsightPriority;

const categoryLabels: Record<InsightCategory, string> = {
  gps: "GPS",
  neuromuscular: "Neuromuscular",
  tests: "Tests",
  disponibilidad: "Disponibilidad",
  general: "General",
};

const priorityLabels: Record<InsightPriority, string> = {
  alta: "Prioridad alta",
  media: "Prioridad media",
  baja: "Prioridad baja",
};

function getPriorityClass(priority: InsightPriority) {
  if (priority === "alta") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "media") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getCategoryClass(category: InsightCategory) {
  if (category === "gps") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (category === "neuromuscular") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (category === "tests") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (category === "disponibilidad") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getPriorityNumber(priority: InsightPriority) {
  if (priority === "alta") return 1;
  if (priority === "media") return 2;
  return 3;
}

function buildQuickSummary(insights: PerformanceInsight[]) {
  const highPriority = insights.filter((insight) => insight.priority === "alta");
  const mediumPriority = insights.filter(
    (insight) => insight.priority === "media",
  );

  if (insights.length === 0) {
    return "No hay alertas automáticas con los datos actuales.";
  }

  if (highPriority.length > 0) {
    return `Hay ${highPriority.length} alerta(s) de prioridad alta. Conviene revisar primero a los jugadores con posibles caídas neuromusculares, alta exposición GPS o puntuaciones físicas bajas.`;
  }

  if (mediumPriority.length > 0) {
    return `Hay ${mediumPriority.length} aviso(s) de prioridad media. No parece haber una situación crítica, pero sí puntos que revisar para ajustar la carga o el trabajo individual.`;
  }

  return "La mayoría de avisos son de baja prioridad. El foco principal debería estar en seguir aumentando la cantidad y calidad de datos disponibles.";
}

function SummaryCard({
  title,
  value,
  className = "border-slate-200 bg-white text-slate-950",
}: {
  title: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${className}`}>
      <p className="text-xs font-bold">{title}</p>

      <p className="mt-2 text-2xl font-black sm:text-3xl">{value}</p>
    </div>
  );
}

export default function LupaIAPage() {
  const [dashboardData, setDashboardData] =
    useState<PlayerDashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");

  const [selectedPriority, setSelectedPriority] =
    useState<PriorityFilter>("all");

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const data = await getPlayerDashboardData();

        setDashboardData(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar la Lupa IA.";

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const insights = useMemo(() => {
    if (!dashboardData) return [];

    return buildPerformanceInsights({
      gpsRecords: dashboardData.gpsRecords,
      neuromuscularRecords: dashboardData.neuromuscularRecords,
      testScores: dashboardData.testScores,
    });
  }, [dashboardData]);

  const filteredInsights = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return insights.filter((insight) => {
      const matchesCategory =
        selectedCategory === "all" || insight.category === selectedCategory;

      const matchesPriority =
        selectedPriority === "all" || insight.priority === selectedPriority;

      const matchesSearch =
        search.length === 0 ||
        insight.title.toLowerCase().includes(search) ||
        insight.description.toLowerCase().includes(search) ||
        insight.recommendation.toLowerCase().includes(search) ||
        String(insight.playerName ?? "").toLowerCase().includes(search);

      return matchesCategory && matchesPriority && matchesSearch;
    });
  }, [insights, selectedCategory, selectedPriority, searchText]);

  const summary = useMemo(() => {
    const playersWithInsights = new Set(
      insights
        .map((insight) => insight.playerName)
        .filter((playerName): playerName is string => Boolean(playerName)),
    );

    return {
      total: insights.length,
      high: insights.filter((insight) => insight.priority === "alta").length,
      medium: insights.filter((insight) => insight.priority === "media").length,
      low: insights.filter((insight) => insight.priority === "baja").length,
      playersWithInsights: playersWithInsights.size,
    };
  }, [insights]);

  const topPlayerRows = useMemo(() => {
    const players = new Map<
      string,
      {
        playerName: string;
        total: number;
        high: number;
        medium: number;
        low: number;
      }
    >();

    insights.forEach((insight) => {
      if (!insight.playerName) return;

      const current = players.get(insight.playerName) ?? {
        playerName: insight.playerName,
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      current.total += 1;

      if (insight.priority === "alta") current.high += 1;
      if (insight.priority === "media") current.medium += 1;
      if (insight.priority === "baja") current.low += 1;

      players.set(insight.playerName, current);
    });

    return Array.from(players.values())
      .sort((a, b) => {
        if (b.high !== a.high) return b.high - a.high;
        if (b.medium !== a.medium) return b.medium - a.medium;
        return b.total - a.total;
      })
      .slice(0, 8);
  }, [insights]);

  const hasSourceData = useMemo(() => {
    if (!dashboardData) return false;

    return (
      dashboardData.gpsRecords.length > 0 ||
      dashboardData.neuromuscularRecords.length > 0 ||
      dashboardData.testScores.length > 0
    );
  }, [dashboardData]);

  const sortedFilteredInsights = useMemo(() => {
    return [...filteredInsights].sort((a, b) => {
      const priorityDifference =
        getPriorityNumber(a.priority) - getPriorityNumber(b.priority);

      if (priorityDifference !== 0) return priorityDifference;

      return a.title.localeCompare(b.title);
    });
  }, [filteredInsights]);

  return (
    <AppShell
      title="Lupa IA"
      subtitle="Análisis automático de alertas, patrones y recomendaciones a partir de GPS, rendimiento neuromuscular y tests físicos."
    >
      {loading ? (
        <StatusMessage variant="info" title="Cargando Lupa IA">
          Cargando análisis automático a partir de GPS, rendimiento
          neuromuscular y tests físicos.
        </StatusMessage>
      ) : error ? (
        <StatusMessage variant="error" title="No se ha podido cargar la Lupa IA">
          {error}
        </StatusMessage>
      ) : !dashboardData ? (
        <EmptyState
          title="Sin datos cargados"
          description="No se han recibido datos suficientes para ejecutar el análisis automático."
        />
      ) : (
        <div className="space-y-8">
          <section className="rounded-2xl bg-slate-950 p-5 text-white shadow sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300 sm:tracking-[0.35em]">
              Resumen automático
            </p>

            <h2 className="mt-3 text-xl font-black sm:text-2xl">
              Lectura global de la plantilla
            </h2>

            <p className="mt-3 max-w-5xl break-words text-sm leading-6 text-slate-200">
              {buildQuickSummary(insights)}
            </p>
          </section>

          {!hasSourceData && (
            <EmptyState
              title="Sin datos para analizar"
              description="Todavía no hay registros GPS, controles neuromusculares ni puntuaciones de tests suficientes para que la Lupa IA genere conclusiones útiles."
            />
          )}

          {hasSourceData && insights.length === 0 && (
            <EmptyState
              title="Sin alertas automáticas"
              description="Hay datos cargados, pero actualmente no se han generado alertas automáticas con los criterios de análisis disponibles."
            />
          )}

          <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <SummaryCard
              title="Insights totales"
              value={summary.total}
              className="border-slate-200 bg-white text-slate-950"
            />

            <SummaryCard
              title="Alta prioridad"
              value={summary.high}
              className="border-red-200 bg-red-50 text-red-800"
            />

            <SummaryCard
              title="Prioridad media"
              value={summary.medium}
              className="border-amber-200 bg-amber-50 text-amber-800"
            />

            <SummaryCard
              title="Prioridad baja"
              value={summary.low}
              className="border-slate-200 bg-slate-50 text-slate-950"
            />

            <div className="col-span-2 lg:col-span-1">
              <SummaryCard
                title="Jugadores señalados"
                value={summary.playersWithInsights}
                className="border-blue-200 bg-blue-50 text-blue-800"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Filtros
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Revisión de alertas automáticas
                </h2>

                <p className="mt-2 max-w-4xl break-words text-sm leading-6 text-slate-600">
                  Puedes filtrar por área, prioridad o jugador para revisar de
                  forma rápida las conclusiones generadas por la plataforma.
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3 xl:w-[760px]">
                <label className="text-sm font-bold text-slate-700">
                  Área
                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value as CategoryFilter)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="all">Todas las áreas</option>
                    <option value="gps">GPS</option>
                    <option value="neuromuscular">Neuromuscular</option>
                    <option value="tests">Tests</option>
                    <option value="disponibilidad">Disponibilidad</option>
                    <option value="general">General</option>
                  </select>
                </label>

                <label className="text-sm font-bold text-slate-700">
                  Prioridad
                  <select
                    value={selectedPriority}
                    onChange={(event) =>
                      setSelectedPriority(event.target.value as PriorityFilter)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="all">Todas</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </label>

                <label className="text-sm font-bold text-slate-700">
                  Buscar
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Jugador, métrica, alerta..."
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5">
              <StatusMessage variant="info" title="Lectura automática">
                La Lupa IA no sustituye la decisión del cuerpo técnico. Sirve
                para ordenar prioridades y detectar patrones que conviene revisar
                con el contexto de entrenamiento, partido, lesiones y minutos de
                juego.
              </StatusMessage>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                Jugadores con más avisos
              </h3>

              {topPlayerRows.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="Sin jugadores señalados"
                    description="No hay jugadores con avisos automáticos por ahora."
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {topPlayerRows.map((row, index) => (
                    <div
                      key={row.playerName}
                      className="rounded-xl bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">
                            {index + 1}
                          </div>

                          <p className="break-words text-sm font-black text-slate-950">
                            {row.playerName}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-black text-slate-900">
                          {row.total}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
                          Alta: {row.high}
                        </span>

                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                          Media: {row.medium}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-600">
                          Baja: {row.low}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 xl:col-span-2">
              {sortedFilteredInsights.length === 0 ? (
                <EmptyState
                  title={
                    insights.length === 0
                      ? "Sin alertas generadas"
                      : "Sin alertas para estos filtros"
                  }
                  description={
                    insights.length === 0
                      ? "No hay alertas automáticas con los datos actuales."
                      : "No hay alertas que coincidan con el área, la prioridad o la búsqueda seleccionada."
                  }
                />
              ) : (
                sortedFilteredInsights.map((insight) => (
                  <article
                    key={insight.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${getPriorityClass(
                              insight.priority,
                            )}`}
                          >
                            {priorityLabels[insight.priority]}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${getCategoryClass(
                              insight.category,
                            )}`}
                          >
                            {categoryLabels[insight.category]}
                          </span>
                        </div>

                        <h3 className="mt-3 break-words text-lg font-black text-slate-950">
                          {insight.title}
                        </h3>

                        {insight.playerName && (
                          <p className="mt-1 break-words text-sm font-bold text-slate-500">
                            {insight.playerName}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 break-words text-sm leading-6 text-slate-700">
                      {insight.description}
                    </p>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Recomendación
                      </p>

                      <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-800">
                        {insight.recommendation}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
