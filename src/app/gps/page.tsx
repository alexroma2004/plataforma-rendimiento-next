"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
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

type GpsView = "session" | "objectives" | "weekly" | "records";

const gpsViewOptions: {
  key: GpsView;
  label: string;
  description: string;
}[] = [
  {
    key: "session",
    label: "Resumen sesión",
    description: "KPIs principales y rankings.",
  },
  {
    key: "objectives",
    label: "Objetivos microciclo",
    description: "Referencia de partido y cumplimiento diario.",
  },
  {
    key: "weekly",
    label: "Carga semanal",
    description: "Qué le falta por hacer esta semana.",
  },
  {
    key: "records",
    label: "Registros",
    description: "Tabla completa por jugador.",
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildWeeklyHtmlReport(evaluation: GpsWeeklyEvaluationResult) {
  const totalPlayers = evaluation.evaluations.length;
  const targetPlayers = evaluation.evaluations.filter(
    (row) => row.generalStatus === "OBJETIVO",
  ).length;
  const lowPlayers = evaluation.evaluations.filter(
    (row) => row.generalStatus === "BAJO",
  ).length;
  const highPlayers = evaluation.evaluations.filter(
    (row) => row.generalStatus === "ALTO",
  ).length;

  const metricLabels: Record<GpsMetricKey, string> = {
    total_distance: "Distancia total",
    hsr: "HSR",
    distance_vrange6: "Distancia sprint",
    sprints: "Sprints",
    num_acc: "Aceleraciones",
    num_dec: "Deceleraciones",
  };

  const rowsHtml = evaluation.evaluations
    .map((player) => {
      const metricRows = player.metrics
        .map((metric) => {
          const label = metricLabels[metric.key as GpsMetricKey] ?? metric.key;

          return `
            <tr>
              <td>${escapeHtml(label)}</td>
              <td>${escapeHtml(formatMetricValueForUnit(metric.currentValue, metric.unit))}</td>
              <td>${escapeHtml(formatPercent(metric.percentOfReference))}</td>
              <td>${escapeHtml(metric.status)}</td>
              <td>${escapeHtml(formatWeeklyActionCell(metric))}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <section class="player-card">
          <div class="player-header">
            <div>
              <h2>${escapeHtml(player.playerName)}</h2>
              <p>${escapeHtml(player.position ?? "Sin posición")} · Referencia: ${escapeHtml(player.referenceSource)}</p>
            </div>
            <span class="badge ${player.generalStatus.toLowerCase()}">
              ${escapeHtml(player.generalStatus)}
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Acumulado</th>
                <th>% referencia</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${metricRows}
            </tbody>
          </table>

          <p class="small">Partidos válidos para referencia: ${escapeHtml(player.referenceValidMatches)}</p>
        </section>
      `;
    })
    .join("");

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe semanal GPS</title>
  <style>
    body {
      margin: 0;
      padding: 32px;
      font-family: Arial, sans-serif;
      background: #f1f5f9;
      color: #020617;
    }

    .header {
      background: #020617;
      color: white;
      padding: 28px;
      border-radius: 18px;
      margin-bottom: 24px;
    }

    .header p {
      color: #cbd5e1;
      margin: 8px 0 0;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .card {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 18px;
    }

    .card span {
      display: block;
      font-size: 12px;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .card strong {
      font-size: 26px;
    }

    .player-card {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }

    .player-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    h1, h2 {
      margin: 0;
    }

    .player-header p {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
    }

    .badge {
      padding: 7px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      border: 1px solid;
    }

    .badge.bajo {
      background: #fffbeb;
      color: #b45309;
      border-color: #facc15;
    }

    .badge.objetivo {
      background: #ecfdf5;
      color: #047857;
      border-color: #6ee7b7;
    }

    .badge.alto {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fca5a5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th {
      text-align: left;
      background: #f1f5f9;
      color: #475569;
      padding: 10px;
      font-size: 11px;
      text-transform: uppercase;
    }

    td {
      border-top: 1px solid #e2e8f0;
      padding: 10px;
      font-weight: 700;
    }

    .small {
      margin-top: 12px;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
    }

    @media print {
      body {
        background: white;
        padding: 16px;
      }

      .player-card, .card, .header {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Informe semanal GPS</h1>
    <p>Semana ${escapeHtml(evaluation.weekStart)} / ${escapeHtml(evaluation.weekEnd)}</p>
    <p>Carga acumulada semanal comparada con referencia individual, posicional o general.</p>
  </div>

  <div class="summary">
    <div class="card">
      <span>Jugadores</span>
      <strong>${totalPlayers}</strong>
    </div>
    <div class="card">
      <span>En objetivo</span>
      <strong>${targetPlayers}</strong>
    </div>
    <div class="card">
      <span>Por debajo</span>
      <strong>${lowPlayers}</strong>
    </div>
    <div class="card">
      <span>Por encima</span>
      <strong>${highPlayers}</strong>
    </div>
  </div>

  ${rowsHtml}
</body>
</html>
`;
}

function buildWeeklyHtmlHref(evaluation: GpsWeeklyEvaluationResult | null) {
  if (!evaluation) return "";

  const html = buildWeeklyHtmlReport(evaluation);

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

type WeeklyInterventionPriority = "ALTA" | "MEDIA" | "CONTROL" | "OK";

function getWeeklyInterventionPriority(
  evaluation: GpsWeeklyPlayerEvaluation,
): WeeklyInterventionPriority {
  const lowMetrics = evaluation.metrics.filter(
    (metric) => metric.status === "BAJO",
  );

  const highMetrics = evaluation.metrics.filter(
    (metric) => metric.status === "ALTO",
  );

  if (evaluation.generalStatus === "ALTO" || highMetrics.length >= 2) {
    return "CONTROL";
  }

  if (lowMetrics.length >= 3) {
    return "ALTA";
  }

  if (lowMetrics.length >= 1) {
    return "MEDIA";
  }

  return "OK";
}

function getWeeklyInterventionPriorityLabel(
  priority: WeeklyInterventionPriority,
) {
  if (priority === "ALTA") return "Prioridad alta";
  if (priority === "MEDIA") return "Prioridad media";
  if (priority === "CONTROL") return "Controlar exceso";
  return "En rango";
}

function getWeeklyInterventionPriorityClass(
  priority: WeeklyInterventionPriority,
) {
  if (priority === "ALTA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "MEDIA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (priority === "CONTROL") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getWeeklyInterventionMessage(
  priority: WeeklyInterventionPriority,
  metrics: GpsWeeklyMetricEvaluation[],
) {
  const metricNames = metrics.map((metric) => metric.label).join(", ");

  if (priority === "ALTA") {
    return `Necesita carga complementaria prioritaria en: ${metricNames}.`;
  }

  if (priority === "MEDIA") {
    return `Puede necesitar un ajuste complementario en: ${metricNames}.`;
  }

  if (priority === "CONTROL") {
    return `Conviene controlar el exceso acumulado en: ${metricNames}.`;
  }

  return "Jugador dentro del rango semanal previsto.";
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getWeeklyMetricForCsv(
  evaluation: GpsWeeklyPlayerEvaluation,
  key: GpsMetricKey,
) {
  return evaluation.metrics.find((metric) => metric.key === key) ?? null;
}

function buildWeeklyCsv(weeklyEvaluation: GpsWeeklyEvaluationResult) {
  const headers = [
    "Semana inicio",
    "Semana fin",
    "Jugador",
    "Posición",
    "Estado general",
    "Referencia",
    "Partidos válidos",

    "Distancia acumulada",
    "Distancia % referencia",
    "Distancia falta mínimo",
    "Distancia exceso máximo",
    "Distancia estado",

    "HSR acumulado",
    "HSR % referencia",
    "HSR falta mínimo",
    "HSR exceso máximo",
    "HSR estado",

    "Sprint acumulado",
    "Sprint % referencia",
    "Sprint falta mínimo",
    "Sprint exceso máximo",
    "Sprint estado",

    "Sprints acumulados",
    "Sprints % referencia",
    "Sprints faltan mínimo",
    "Sprints exceso máximo",
    "Sprints estado",

    "Aceleraciones acumuladas",
    "Aceleraciones % referencia",
    "Aceleraciones faltan mínimo",
    "Aceleraciones exceso máximo",
    "Aceleraciones estado",

    "Deceleraciones acumuladas",
    "Deceleraciones % referencia",
    "Deceleraciones faltan mínimo",
    "Deceleraciones exceso máximo",
    "Deceleraciones estado",
  ];

  const rows = weeklyEvaluation.evaluations.map((evaluation) => {
    const totalDistance = getWeeklyMetricForCsv(evaluation, "total_distance");
    const hsr = getWeeklyMetricForCsv(evaluation, "hsr");
    const sprintDistance = getWeeklyMetricForCsv(
      evaluation,
      "distance_vrange6",
    );
    const sprints = getWeeklyMetricForCsv(evaluation, "sprints");
    const acc = getWeeklyMetricForCsv(evaluation, "num_acc");
    const dec = getWeeklyMetricForCsv(evaluation, "num_dec");

    return [
      weeklyEvaluation.weekStart,
      weeklyEvaluation.weekEnd,
      evaluation.playerName,
      evaluation.position ?? "",
      evaluation.generalStatus,
      evaluation.referenceSource,
      evaluation.referenceValidMatches,

      totalDistance?.currentValue ?? "",
      totalDistance?.percentOfReference ?? "",
      totalDistance?.missingToMinimum ?? "",
      totalDistance?.excessOverMaximum ?? "",
      totalDistance?.status ?? "",

      hsr?.currentValue ?? "",
      hsr?.percentOfReference ?? "",
      hsr?.missingToMinimum ?? "",
      hsr?.excessOverMaximum ?? "",
      hsr?.status ?? "",

      sprintDistance?.currentValue ?? "",
      sprintDistance?.percentOfReference ?? "",
      sprintDistance?.missingToMinimum ?? "",
      sprintDistance?.excessOverMaximum ?? "",
      sprintDistance?.status ?? "",

      sprints?.currentValue ?? "",
      sprints?.percentOfReference ?? "",
      sprints?.missingToMinimum ?? "",
      sprints?.excessOverMaximum ?? "",
      sprints?.status ?? "",

      acc?.currentValue ?? "",
      acc?.percentOfReference ?? "",
      acc?.missingToMinimum ?? "",
      acc?.excessOverMaximum ?? "",
      acc?.status ?? "",

      dec?.currentValue ?? "",
      dec?.percentOfReference ?? "",
      dec?.missingToMinimum ?? "",
      dec?.excessOverMaximum ?? "",
      dec?.status ?? "",
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(";"))
    .join("\n");
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
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">
                {index + 1}
              </div>

              <p className="break-words text-sm font-bold text-slate-950">
                {row.player_name}
              </p>
            </div>

            <p className="shrink-0 text-sm font-black text-slate-900">
              {formatNumber(Number(row[metric] ?? 0))}
              {suffix}
            </p>
          </div>
        ))}

        {ranking.length === 0 && (
          <EmptyState
            title="Sin registros"
            description="No hay registros disponibles."
          />
        )}
      </div>
    </div>
  );
}

export default function GpsPage() {
  const [gpsView, setGpsView] = useState<GpsView>("session");
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

  const weeklyInterventionRows = useMemo(() => {
    const evaluations = weeklyEvaluation?.evaluations ?? [];

    const priorityOrder: Record<WeeklyInterventionPriority, number> = {
      ALTA: 1,
      MEDIA: 2,
      CONTROL: 3,
      OK: 4,
    };

    return evaluations
      .map((evaluation) => {
        const priority = getWeeklyInterventionPriority(evaluation);

        const lowMetrics = evaluation.metrics.filter(
          (metric) => metric.status === "BAJO",
        );

        const highMetrics = evaluation.metrics.filter(
          (metric) => metric.status === "ALTO",
        );

        const problemMetrics =
          priority === "CONTROL"
            ? highMetrics.slice(0, 3)
            : lowMetrics.slice(0, 3);

        return {
          evaluation,
          priority,
          problemMetrics,
        };
      })
      .filter((row) => row.priority !== "OK")
      .sort((a, b) => {
        const priorityDifference =
          priorityOrder[a.priority] - priorityOrder[b.priority];

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return b.problemMetrics.length - a.problemMetrics.length;
      });
  }, [weeklyEvaluation]);

  const weeklyCsvHref = useMemo(() => {
    if (!weeklyEvaluation || weeklyEvaluation.evaluations.length === 0) {
      return "";
    }

    const csv = buildWeeklyCsv(weeklyEvaluation);

    return `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${csv}`)}`;
  }, [weeklyEvaluation]);

  const weeklyHtmlHref = useMemo(() => {
    if (!weeklyEvaluation || weeklyEvaluation.evaluations.length === 0) {
      return "";
    }

    return buildWeeklyHtmlHref(weeklyEvaluation);
  }, [weeklyEvaluation]);

  const summary = useMemo(() => {
    const safeFilteredRecords = filteredRecords ?? [];
    const players = safeFilteredRecords.length;

    const totalDistance = safeFilteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.total_distance),
      0,
    );

    const totalHsr = safeFilteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.hsr),
      0,
    );

    const totalSprintDistance = safeFilteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.distance_vrange6),
      0,
    );

    const totalSprints = safeFilteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.sprints),
      0,
    );

    const totalAcc = safeFilteredRecords.reduce(
      (sum, row) => sum + getNumeric(row.num_acc),
      0,
    );

    const totalDec = safeFilteredRecords.reduce(
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
    <AppShell
      title="GPS"
      subtitle="Análisis de sesiones GPS guardadas en Supabase. Consulta el resumen de carga externa, rankings individuales, referencia de partido y objetivos por microciclo."
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Sesiones guardadas
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Seleccionar sesión GPS
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
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
  <div className="mt-6">
    <StatusMessage variant="error" title="No se ha podido cargar GPS">
      {error}
    </StatusMessage>
  </div>
)}

{loadingSessions && (
  <div className="mt-6">
    <StatusMessage variant="info" title="Cargando sesiones GPS">
      Cargando sesiones GPS guardadas en Supabase.
    </StatusMessage>
  </div>
)}

{!loadingSessions && sessions.length === 0 && (
  <div className="mt-6">
    <EmptyState
      title="Sin sesiones GPS"
      description="Todavía no hay sesiones GPS guardadas. Primero sube una sesión desde la página Cargar datos."
    />
  </div>
)}

          {selectedSession && (
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Fecha</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.session_date}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Microciclo</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.microcycle ?? "N/A"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Nombre</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.session_name ?? "Sesión GPS"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Tipo</p>
                <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                  {selectedSession.is_match ? "Partido" : "Entrenamiento"}
                </p>
              </div>
            </div>
          )}

          {selectedSession && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                    Filtro de análisis
                  </p>

                  <h3 className="mt-2 text-lg font-black text-slate-950">
                    Población analizada
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
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

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard title="Registros totales" value={records.length} />

                <SummaryCard
                  title="Registros analizados"
                  value={filteredRecords.length}
                />

                <SummaryCard
                  title="Registros excluidos"
                  value={records.length - filteredRecords.length}
                />
              </div>
            </div>
          )}
        </section>

        {selectedSessionId && (
          <section>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {gpsViewOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setGpsView(option.key)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      gpsView === option.key
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-black">
                      {option.label}
                    </span>
                    <span
                      className={`mt-1 block text-xs font-bold ${
                        gpsView === option.key
                          ? "text-slate-200"
                          : "text-slate-500"
                      }`}
                    >
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {loadingRecords ? (
  <StatusMessage variant="info" title="Cargando registros GPS">
    Cargando registros de la sesión seleccionada.
  </StatusMessage>
) : (
              <>
                <div
                  className={
                    gpsView === "session"
                      ? "grid grid-cols-2 gap-4 lg:grid-cols-4"
                      : "hidden"
                  }
                >
                  <SummaryCard title="Jugadores" value={summary.players} />

                  <SummaryCard
                    title="Distancia total"
                    value={formatMeters(summary.totalDistance)}
                  />

                  <SummaryCard
                    title="HSR total"
                    value={formatMeters(summary.totalHsr)}
                  />

                  <SummaryCard
                    title="Sprint total"
                    value={formatMeters(summary.totalSprintDistance)}
                  />
                </div>

                <div
                  className={
                    gpsView === "session"
                      ? "mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4"
                      : "hidden"
                  }
                >
                  <SummaryCard
                    title="Distancia media"
                    value={formatMeters(summary.averageDistance)}
                  />

                  <SummaryCard
                    title="Sprints totales"
                    value={formatNumber(summary.totalSprints)}
                  />

                  <SummaryCard
                    title="Aceleraciones"
                    value={formatNumber(summary.totalAcc)}
                  />

                  <SummaryCard
                    title="Deceleraciones"
                    value={formatNumber(summary.totalDec)}
                  />
                </div>

                <div
                  className={
                    gpsView === "session"
                      ? "mt-8 grid gap-4 xl:grid-cols-3"
                      : "hidden"
                  }
                >
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

                <div
                  className={
                    gpsView === "weekly"
                      ? "rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6"
                      : "hidden"
                  }
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                        Carga semanal GPS
                      </p>

                      <h2 className="mt-2 text-xl font-black text-slate-950">
                        Qué le falta por hacer esta semana
                      </h2>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        La aplicación calcula la carga acumulada de lunes a
                        domingo y la compara con la referencia de partido del
                        jugador. Si no existe referencia propia suficiente, usa
                        referencia posicional o general.
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-3 md:w-[260px]">
                      <label className="text-sm font-bold text-slate-700">
                        Fecha de la semana
                        <input
                          type="date"
                          value={weeklyDate}
                          onChange={(event) =>
                            setWeeklyDate(event.target.value)
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      </label>

                      {weeklyCsvHref && weeklyEvaluation && (
                        <a
                          href={weeklyCsvHref}
                          download={`gps-semanal-${weeklyEvaluation.weekStart}-${weeklyEvaluation.weekEnd}.csv`}
                          className="rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white shadow hover:bg-slate-800"
                        >
                          Descargar CSV semanal
                        </a>
                      )}

                      {weeklyHtmlHref && weeklyEvaluation && (
                        <a
                          href={weeklyHtmlHref}
                          download={`informe-gps-semanal-${weeklyEvaluation.weekStart}-${weeklyEvaluation.weekEnd}.html`}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-slate-950 shadow hover:bg-slate-50"
                        >
                          Descargar informe HTML
                        </a>
                      )}
                    </div>
                  </div>

                  {weeklyError && (
  <div className="mt-6">
    <StatusMessage variant="error" title="No se ha podido calcular la semana GPS">
      {weeklyError}
    </StatusMessage>
  </div>
)}

{loadingWeeklyEvaluation && (
  <div className="mt-6">
    <StatusMessage variant="info" title="Calculando carga semanal GPS">
      Calculando la carga acumulada de lunes a domingo y comparándola con la
      referencia disponible.
    </StatusMessage>
  </div>
)}

                  {!loadingWeeklyEvaluation && weeklyEvaluation && (
                    <>
                      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <SummaryCard
                          title="Semana"
                          value={`${weeklyEvaluation.weekStart} / ${weeklyEvaluation.weekEnd}`}
                        />

                        <SummaryCard
                          title="Jugadores"
                          value={weeklySummary.totalPlayers}
                        />

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-xs font-bold text-emerald-700">
                            En objetivo
                          </p>
                          <p className="mt-2 text-2xl font-black text-emerald-800 sm:text-3xl">
                            {weeklySummary.targetPlayers}
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs font-bold text-amber-700">
                            Por debajo
                          </p>
                          <p className="mt-2 text-2xl font-black text-amber-800 sm:text-3xl">
                            {weeklySummary.lowPlayers}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                            Prioridades semanales
                          </p>

                          <h3 className="text-lg font-black text-slate-950">
                            Jugadores que requieren ajuste de carga
                          </h3>

                          <p className="max-w-4xl text-sm leading-6 text-slate-600">
                            Esta sección detecta automáticamente qué jugadores
                            están por debajo del objetivo semanal, cuáles
                            acumulan exceso de carga y en qué métricas hay que
                            actuar.
                          </p>
                        </div>

                        {weeklyInterventionRows.length === 0 ? (
  <div className="mt-5">
    <StatusMessage variant="success" title="Semana dentro de rango">
      Todos los jugadores se encuentran dentro del rango semanal previsto.
    </StatusMessage>
  </div>
) : (
                          <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            {weeklyInterventionRows.map(
                              ({ evaluation, priority, problemMetrics }) => (
                                <div
                                  key={evaluation.normalizedName}
                                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                      <p className="break-words text-base font-black text-slate-950">
                                        {evaluation.playerName}
                                      </p>

                                      <p className="mt-1 text-xs font-bold text-slate-500">
                                        {evaluation.position ?? "Sin posición"} ·
                                        Referencia: {evaluation.referenceSource}
                                      </p>
                                    </div>

                                    <span
                                      className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getWeeklyInterventionPriorityClass(
                                        priority,
                                      )}`}
                                    >
                                      {getWeeklyInterventionPriorityLabel(
                                        priority,
                                      )}
                                    </span>
                                  </div>

                                  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
                                    {getWeeklyInterventionMessage(
                                      priority,
                                      problemMetrics,
                                    )}
                                  </p>

                                  <div className="mt-4 space-y-3">
                                    {problemMetrics.map((metric) => (
                                      <div
                                        key={metric.key}
                                        className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <p className="text-sm font-black text-slate-900">
                                            {metric.label}
                                          </p>

                                          <span
                                            className={`rounded-full border px-2 py-1 text-[10px] font-black ${getWeeklyStatusClass(
                                              metric.status,
                                            )}`}
                                          >
                                            {metric.status}
                                          </span>
                                        </div>

                                        <div className="mt-2 flex flex-col gap-1 text-xs font-bold text-slate-600">
                                          <span>
                                            Acumulado:{" "}
                                            {formatMetricValueForUnit(
                                              metric.currentValue,
                                              metric.unit,
                                            )}{" "}
                                            ·{" "}
                                            {formatPercent(
                                              metric.percentOfReference,
                                            )}
                                          </span>

                                          <span>
                                            {formatWeeklyActionCell(metric)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      {selectedWeeklyPlayerEvaluation && (
                        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                                Detalle individual
                              </p>

                              <h3 className="mt-2 text-lg font-black text-slate-950">
                                Lectura semanal por jugador
                              </h3>

                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                Visualiza qué porcentaje de la referencia
                                semanal lleva acumulado el jugador y qué le
                                falta por completar.
                              </p>
                            </div>

                            <label className="w-full text-sm font-bold text-slate-700 md:w-[320px]">
                              Jugador
                              <select
                                value={
                                  selectedWeeklyPlayerEvaluation.normalizedName
                                }
                                onChange={(event) =>
                                  setSelectedWeeklyPlayer(event.target.value)
                                }
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

                          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <SummaryCard
                              title="Jugador"
                              value={selectedWeeklyPlayerEvaluation.playerName}
                              description={
                                selectedWeeklyPlayerEvaluation.position ??
                                "Sin posición"
                              }
                            />

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-bold text-slate-500">
                                Estado general
                              </p>
                              <span
                                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getWeeklyStatusClass(
                                  selectedWeeklyPlayerEvaluation.generalStatus,
                                )}`}
                              >
                                {selectedWeeklyPlayerEvaluation.generalStatus}
                              </span>
                            </div>

                            <SummaryCard
                              title="Referencia"
                              value={
                                selectedWeeklyPlayerEvaluation.referenceSource
                              }
                            />

                            <SummaryCard
                              title="Partidos válidos"
                              value={
                                selectedWeeklyPlayerEvaluation.referenceValidMatches
                              }
                            />
                          </div>

                          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {selectedWeeklyPlayerEvaluation.metrics.map(
                              (metric) => {
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
                                      <div className="min-w-0">
                                        <p className="break-words text-sm font-black text-slate-950">
                                          {metric.label}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {formatWeeklyMetricCell(metric)}
                                        </p>
                                      </div>

                                      <span
                                        className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${getWeeklyStatusClass(
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
                                      <span>
                                        {formatPercent(
                                          metric.percentOfReference,
                                        )}
                                      </span>
                                      <span>100%</span>
                                    </div>

                                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                                      {formatWeeklyActionCell(metric)}
                                    </p>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}

                      {weeklyEvaluation.evaluations.length === 0 ? (
                        <div className="mt-6">
                          <EmptyState
                            title="Sin registros semanales"
                            description="No hay registros GPS de entrenamiento para la semana seleccionada."
                          />
                        </div>
                      ) : (
                        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                          <div className="divide-y divide-slate-100 md:hidden">
                            {weeklyEvaluation.evaluations.map((evaluation) => {
                              const totalDistance = getWeeklyMetric(
                                evaluation,
                                "total_distance",
                              );
                              const hsr = getWeeklyMetric(evaluation, "hsr");
                              const sprintDistance = getWeeklyMetric(
                                evaluation,
                                "distance_vrange6",
                              );
                              const sprints = getWeeklyMetric(
                                evaluation,
                                "sprints",
                              );
                              const acc = getWeeklyMetric(evaluation, "num_acc");
                              const dec = getWeeklyMetric(evaluation, "num_dec");

                              return (
                                <article
                                  key={evaluation.normalizedName}
                                  className="bg-white p-5"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="break-words text-base font-black text-slate-950">
                                        {evaluation.playerName}
                                      </p>
                                      <p className="mt-1 text-xs font-bold text-slate-500">
                                        {evaluation.position ?? "Sin posición"} ·{" "}
                                        {evaluation.referenceSource}
                                      </p>
                                    </div>

                                    <span
                                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getWeeklyStatusClass(
                                        evaluation.generalStatus,
                                      )}`}
                                    >
                                      {evaluation.generalStatus}
                                    </span>
                                  </div>

                                  <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                                    {[
                                      ["Distancia", totalDistance],
                                      ["HSR", hsr],
                                      ["Sprint", sprintDistance],
                                      ["Sprints", sprints],
                                      ["ACC", acc],
                                      ["DEC", dec],
                                    ].map(([label, metric]) => (
                                      <div
                                        key={String(label)}
                                        className="rounded-xl bg-white p-3"
                                      >
                                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                          {String(label)}
                                        </p>
                                        <p className="mt-1 font-black text-slate-950">
                                          {formatWeeklyMetricCell(
                                            metric as GpsWeeklyMetricEvaluation | null,
                                          )}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                          {formatWeeklyActionCell(
                                            metric as GpsWeeklyMetricEvaluation | null,
                                          )}
                                        </p>
                                      </div>
                                    ))}

                                    <div className="rounded-xl bg-white p-3">
                                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                        Partidos válidos
                                      </p>
                                      <p className="mt-1 font-black text-slate-950">
                                        {evaluation.referenceValidMatches}
                                      </p>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>

                          <div className="hidden max-h-[520px] overflow-auto md:block">
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

                <div
                  className={
                    gpsView === "objectives"
                      ? "rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6"
                      : "hidden"
                  }
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                        Objetivos GPS
                      </p>

                      <h2 className="mt-2 text-xl font-black text-slate-950">
                        Referencia de partido y objetivo del microciclo
                      </h2>

                      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                        Para cada métrica se compara la carga realizada con una
                        referencia media de partido y con el rango objetivo
                        estimado para el día de microciclo seleccionado.
                      </p>

                      <p className="mt-2 text-sm font-bold text-slate-700">
                        {selectedObjective.label}:{" "}
                        {selectedObjective.description}
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

                        <p className="mt-1 text-sm leading-6 text-slate-600">
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

                  <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <SummaryCard
                      title="Referencia partido"
                      value={formatMetricValue(
                        selectedMetricReference,
                        selectedMetric,
                      )}
                    />

                    <SummaryCard
                      title={`Objetivo ${selectedObjective.label}`}
                      value={formatPercent(
                        selectedMetricObjective.targetPercent,
                      )}
                    />

                    <SummaryCard
                      title="Rango adecuado"
                      value={`${formatPercent(
                        selectedMetricObjective.minPercent,
                      )} - ${formatPercent(selectedMetricObjective.maxPercent)}`}
                    />

                    <SummaryCard
                      title="Jugadores en rango"
                      value={`${objectiveSummary.ok}/${filteredRecords.length}`}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
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

                  <div className="mt-6 h-[340px] w-full sm:h-[420px]">
  {chartData.length === 0 ? (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        title="Sin datos para el gráfico"
        description="No hay registros GPS para representar con la métrica seleccionada."
      />
    </div>
  ) : (
    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
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
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) =>
                            Math.round(Number(value)).toLocaleString("es-ES")
                          }
                        />

                        <YAxis
                          type="category"
                          dataKey="jugador"
                          width={100}
                          tick={{
                            fontSize: 11,
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
                  )}
                  </div>


                  <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-lg font-black text-slate-950">
                        Cumplimiento individual del objetivo
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Comparación de cada jugador con el objetivo de{" "}
                        {selectedMetricMeta.label} para{" "}
                        {selectedObjective.label}.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100 md:hidden">
                      {objectiveRows.map((row) => (
                        <article key={row.id} className="bg-white p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-base font-black text-slate-950">
                                {row.playerName}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {selectedMetricMeta.label}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${getObjectiveBadgeClass(
                                row.status,
                              )}`}
                            >
                              {row.label}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                Realizado
                              </p>
                              <p className="mt-1 font-black text-slate-950">
                                {formatMetricValue(row.value, selectedMetric)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                % partido
                              </p>
                              <p className="mt-1 font-black text-slate-950">
                                {formatPercent(row.percent)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                Objetivo
                              </p>
                              <p className="mt-1 font-black text-slate-950">
                                {formatPercent(row.targetPercent)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                                Diferencia
                              </p>
                              <p className="mt-1 font-black text-slate-950">
                                {formatPercent(row.differenceToTarget)}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                      {objectiveRows.length === 0 && (
                        <div className="p-5">
                          <EmptyState
                            title="Sin objetivos individuales"
                            description="No hay registros GPS para calcular objetivos individuales con esta selección."
                          />
                        </div>
                      )}
                    </div>

                    <div className="hidden max-h-[420px] overflow-auto md:block">
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
                            <tr
                              key={row.id}
                              className="border-t border-slate-100"
                            >
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
                          {objectiveRows.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-6">
                                <EmptyState
                                  title="Sin objetivos individuales"
                                  description="No hay registros GPS para calcular objetivos individuales con esta selección."
                                />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    gpsView === "records"
                      ? "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow"
                      : "hidden"
                  }
                >
                  <div className="border-b border-slate-200 p-5">
                    <h2 className="text-xl font-black text-slate-950">
                      Registros por jugador
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Tabla completa de la sesión GPS seleccionada.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredRecords.map((row) => (
                      <article key={row.id} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-black text-slate-950">
                              {row.player_name}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {row.position ?? "Sin posición"} ·{" "}
                              {row.is_goalkeeper ? "Portero" : "Campo"}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            {row.gps_status ?? "OK"}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Min
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {row.time_played
                                ? formatNumber(row.time_played)
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Distancia
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatMeters(row.total_distance)}
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
                              {formatMeters(row.distance_vrange6)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              Sprints
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(row.sprints)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              ACC
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(row.num_acc)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              DEC
                            </p>
                            <p className="mt-1 font-black text-slate-950">
                              {formatNumber(row.num_dec)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}

                    {filteredRecords.length === 0 && (
                      <div className="p-5">
                        <EmptyState
                          title="Sin registros GPS"
                          description="No hay registros GPS para esta selección."
                        />
                      </div>
                    )}
                  </div>

                  <div className="hidden max-h-[560px] overflow-auto md:block">
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

                            <td className="px-4 py-3">{row.position ?? "—"}</td>

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

                            <td className="px-4 py-3">
                              {formatMeters(row.hsr)}
                            </td>

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

                        {filteredRecords.length === 0 && (
                          <tr>
                            <td colSpan={11} className="px-4 py-6">
                              <EmptyState
                                title="Sin registros GPS"
                                description="No hay registros GPS para esta selección."
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