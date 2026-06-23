"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
import {
  getTeamDashboardData,
  type TeamDashboardData,
  type TeamDashboardPlayer,
} from "@/lib/supabase/team-dashboard";

type ReportType = "team" | "player";

type ReportFilters = {
  dateFrom: string;
  dateTo: string;
  positionFilter: string;
};

type PlayerReportRow = {
  player: TeamDashboardPlayer;
  gpsSessions: number;
  neuromuscularSessions: number;
  testScores: number;
  latestGpsDate: string | null;
  latestNeuromuscularDate: string | null;
  gpsTotalDistance: number;
  gpsHsr: number;
  gpsSprintDistance: number;
  gpsSprints: number;
  gpsAcc: number;
  gpsDec: number;
  cmjPre: number | null;
  rsimodPre: number | null;
  vmpPre: number | null;
  rpe: number | null;
  averageTestScore: number | null;
};

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getNumber(value: number | null | undefined) {
  return Number(value ?? 0);
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

function formatMeters(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return `${Math.round(Number(value)).toLocaleString("es-ES")} m`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return value;
}

function getAverage(values: Array<number | null | undefined>) {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function isSamePlayer(
  player: TeamDashboardPlayer,
  row: {
    player_id?: string | null;
    player_name?: string | null;
    normalized_name?: string | null;
  },
) {
  if (row.player_id && row.player_id === player.id) return true;

  const rowNormalizedName =
    row.normalized_name ?? normalizeName(row.player_name ?? "");

  return rowNormalizedName === player.normalized_name;
}

function isDateInRange(
  value: string | null | undefined,
  dateFrom: string,
  dateTo: string,
) {
  if (!value) return false;

  if (dateFrom && value < dateFrom) return false;
  if (dateTo && value > dateTo) return false;

  return true;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function slugify(value: string) {
  return normalizeName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], {
    type,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function buildPlayerRows(
  data: TeamDashboardData,
  filters: ReportFilters,
): PlayerReportRow[] {
  const players = data.players.filter((player) => {
    if (filters.positionFilter === "all") return true;

    return (player.position ?? "Sin posición") === filters.positionFilter;
  });

  return players.map((player) => {
    const gpsRecords = data.gpsRecords.filter((row) => {
      return (
        isSamePlayer(player, row) &&
        isDateInRange(row.session_date, filters.dateFrom, filters.dateTo)
      );
    });

    const neuromuscularRecords = data.neuromuscularRecords.filter((row) => {
      return (
        isSamePlayer(player, row) &&
        isDateInRange(row.session_date, filters.dateFrom, filters.dateTo)
      );
    });

    const testScores = data.testScores.filter((row) => isSamePlayer(player, row));

    const latestGps = [...gpsRecords].sort((a, b) =>
      String(b.session_date).localeCompare(String(a.session_date)),
    )[0];

    const latestNeuromuscular = [...neuromuscularRecords].sort((a, b) =>
      String(b.session_date).localeCompare(String(a.session_date)),
    )[0];

    return {
      player,
      gpsSessions: gpsRecords.length,
      neuromuscularSessions: neuromuscularRecords.length,
      testScores: testScores.length,
      latestGpsDate: latestGps?.session_date ?? null,
      latestNeuromuscularDate: latestNeuromuscular?.session_date ?? null,
      gpsTotalDistance: gpsRecords.reduce(
        (sum, row) => sum + getNumber(row.total_distance),
        0,
      ),
      gpsHsr: gpsRecords.reduce((sum, row) => sum + getNumber(row.hsr), 0),
      gpsSprintDistance: gpsRecords.reduce(
        (sum, row) => sum + getNumber(row.distance_vrange6),
        0,
      ),
      gpsSprints: gpsRecords.reduce((sum, row) => sum + getNumber(row.sprints), 0),
      gpsAcc: gpsRecords.reduce((sum, row) => sum + getNumber(row.num_acc), 0),
      gpsDec: gpsRecords.reduce((sum, row) => sum + getNumber(row.num_dec), 0),
      cmjPre: latestNeuromuscular?.cmj_pre ?? null,
      rsimodPre: latestNeuromuscular?.rsimod_pre ?? null,
      vmpPre: latestNeuromuscular?.vmp_pre ?? null,
      rpe: latestNeuromuscular?.rpe ?? null,
      averageTestScore: getAverage(testScores.map((score) => score.final_score)),
    };
  });
}

function buildFilterText(filters: ReportFilters) {
  const periodText =
    filters.dateFrom || filters.dateTo
      ? `${filters.dateFrom || "inicio"} / ${filters.dateTo || "actualidad"}`
      : "Todos los registros disponibles";

  const positionText =
    filters.positionFilter === "all" ? "Todas las posiciones" : filters.positionFilter;

  return {
    periodText,
    positionText,
  };
}

function buildTeamCsv(rows: PlayerReportRow[], filters: ReportFilters) {
  const { periodText, positionText } = buildFilterText(filters);

  const headers = [
    "Periodo",
    "Filtro posición",
    "Jugador",
    "Posición",
    "Sesiones GPS",
    "Sesiones neuromusculares",
    "Puntuaciones tests",
    "Último GPS",
    "Último neuromuscular",
    "Distancia GPS acumulada",
    "HSR acumulado",
    "Sprint acumulado",
    "Sprints acumulados",
    "Aceleraciones acumuladas",
    "Deceleraciones acumuladas",
    "CMJ pre último",
    "RSI mod pre último",
    "VMP pre último",
    "RPE último",
    "Puntuación media tests",
  ];

  const csvRows = rows.map((row) => [
    periodText,
    positionText,
    row.player.name,
    row.player.position ?? "",
    row.gpsSessions,
    row.neuromuscularSessions,
    row.testScores,
    row.latestGpsDate ?? "",
    row.latestNeuromuscularDate ?? "",
    Math.round(row.gpsTotalDistance),
    Math.round(row.gpsHsr),
    Math.round(row.gpsSprintDistance),
    Math.round(row.gpsSprints),
    Math.round(row.gpsAcc),
    Math.round(row.gpsDec),
    row.cmjPre ?? "",
    row.rsimodPre ?? "",
    row.vmpPre ?? "",
    row.rpe ?? "",
    row.averageTestScore ?? "",
  ]);

  return [headers, ...csvRows]
    .map((row) => row.map(escapeCsvCell).join(";"))
    .join("\n");
}

function getHtmlStyles() {
  return `
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

    .section {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .section h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      font-size: 12px;
    }

    th {
      text-align: left;
      background: #f1f5f9;
      color: #475569;
      padding: 10px;
      font-size: 10px;
      text-transform: uppercase;
    }

    td {
      border-top: 1px solid #e2e8f0;
      padding: 10px;
      font-weight: 700;
    }

    .muted {
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
    }

    .print-button {
      position: fixed;
      right: 24px;
      bottom: 24px;
      border: 0;
      border-radius: 999px;
      background: #020617;
      color: white;
      padding: 12px 18px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
    }

    @media print {
      body {
        background: white;
        padding: 16px;
      }

      .print-button {
        display: none;
      }
    }
  `;
}

function buildTeamHtmlReport(rows: PlayerReportRow[], filters: ReportFilters) {
  const totalPlayers = rows.length;
  const playersWithGps = rows.filter((row) => row.gpsSessions > 0).length;
  const playersWithNeuromuscular = rows.filter(
    (row) => row.neuromuscularSessions > 0,
  ).length;
  const playersWithTests = rows.filter((row) => row.testScores > 0).length;
  const { periodText, positionText } = buildFilterText(filters);

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.player.name)}</td>
          <td>${escapeHtml(row.player.position ?? "—")}</td>
          <td>${escapeHtml(row.gpsSessions)}</td>
          <td>${escapeHtml(row.neuromuscularSessions)}</td>
          <td>${escapeHtml(row.testScores)}</td>
          <td>${escapeHtml(formatDate(row.latestGpsDate))}</td>
          <td>${escapeHtml(formatDate(row.latestNeuromuscularDate))}</td>
          <td>${escapeHtml(formatMeters(row.gpsTotalDistance))}</td>
          <td>${escapeHtml(formatMeters(row.gpsHsr))}</td>
          <td>${escapeHtml(formatMeters(row.gpsSprintDistance))}</td>
          <td>${escapeHtml(formatNumber(row.cmjPre, 2))}</td>
          <td>${escapeHtml(formatNumber(row.rsimodPre, 2))}</td>
          <td>${escapeHtml(formatNumber(row.vmpPre, 3))}</td>
          <td>${escapeHtml(formatNumber(row.averageTestScore, 1))}</td>
        </tr>
      `,
    )
    .join("");

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe global equipo</title>
  <style>${getHtmlStyles()}</style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Imprimir / guardar PDF</button>

  <div class="header">
    <h1>Informe global del equipo</h1>
    <p>Resumen integrado de GPS, rendimiento neuromuscular y tests físicos.</p>
    <p>Periodo: ${escapeHtml(periodText)} · Posición: ${escapeHtml(positionText)}</p>
  </div>

  <div class="summary">
    <div class="card">
      <span>Jugadores</span>
      <strong>${totalPlayers}</strong>
    </div>
    <div class="card">
      <span>Con GPS</span>
      <strong>${playersWithGps}</strong>
    </div>
    <div class="card">
      <span>Con neuromuscular</span>
      <strong>${playersWithNeuromuscular}</strong>
    </div>
    <div class="card">
      <span>Con tests</span>
      <strong>${playersWithTests}</strong>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Jugador</th>
        <th>Posición</th>
        <th>GPS</th>
        <th>Neuromuscular</th>
        <th>Tests</th>
        <th>Último GPS</th>
        <th>Último NM</th>
        <th>Distancia</th>
        <th>HSR</th>
        <th>Sprint</th>
        <th>CMJ</th>
        <th>RSI mod</th>
        <th>VMP</th>
        <th>Score tests</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>
`;
}

function buildPlayerHtmlReport(row: PlayerReportRow, filters: ReportFilters) {
  const { periodText, positionText } = buildFilterText(filters);

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe individual ${escapeHtml(row.player.name)}</title>
  <style>${getHtmlStyles()}</style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Imprimir / guardar PDF</button>

  <div class="header">
    <h1>Informe individual</h1>
    <p>${escapeHtml(row.player.name)} · ${escapeHtml(row.player.position ?? "Sin posición")}</p>
    <p>Periodo: ${escapeHtml(periodText)} · Filtro posición: ${escapeHtml(positionText)}</p>
  </div>

  <div class="summary">
    <div class="card">
      <span>Sesiones GPS</span>
      <strong>${row.gpsSessions}</strong>
    </div>
    <div class="card">
      <span>Sesiones neuromusculares</span>
      <strong>${row.neuromuscularSessions}</strong>
    </div>
    <div class="card">
      <span>Puntuaciones tests</span>
      <strong>${row.testScores}</strong>
    </div>
    <div class="card">
      <span>Score medio tests</span>
      <strong>${escapeHtml(formatNumber(row.averageTestScore, 1))}</strong>
    </div>
  </div>

  <div class="section">
    <h2>Carga GPS acumulada</h2>
    <table>
      <thead>
        <tr>
          <th>Último GPS</th>
          <th>Distancia</th>
          <th>HSR</th>
          <th>Sprint</th>
          <th>Sprints</th>
          <th>ACC</th>
          <th>DEC</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(formatDate(row.latestGpsDate))}</td>
          <td>${escapeHtml(formatMeters(row.gpsTotalDistance))}</td>
          <td>${escapeHtml(formatMeters(row.gpsHsr))}</td>
          <td>${escapeHtml(formatMeters(row.gpsSprintDistance))}</td>
          <td>${escapeHtml(formatNumber(row.gpsSprints, 0))}</td>
          <td>${escapeHtml(formatNumber(row.gpsAcc, 0))}</td>
          <td>${escapeHtml(formatNumber(row.gpsDec, 0))}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Último control neuromuscular</h2>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>CMJ pre</th>
          <th>RSI mod pre</th>
          <th>VMP pre</th>
          <th>RPE</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(formatDate(row.latestNeuromuscularDate))}</td>
          <td>${escapeHtml(formatNumber(row.cmjPre, 2))}</td>
          <td>${escapeHtml(formatNumber(row.rsimodPre, 2))}</td>
          <td>${escapeHtml(formatNumber(row.vmpPre, 3))}</td>
          <td>${escapeHtml(formatNumber(row.rpe, 1))}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <p class="muted">
    Nota: este informe usa los registros disponibles en la base de datos. El filtro de fecha se aplica a GPS y registros neuromusculares. Las puntuaciones de tests se integran de forma global porque la tabla actual de puntuaciones no incluye fecha de sesión.
  </p>
</body>
</html>
`;
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

export default function InformesPage() {
  const [data, setData] = useState<TeamDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportType, setReportType] = useState<ReportType>("team");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const dashboardData = await getTeamDashboardData();

        setData(dashboardData);

        if (dashboardData.players.length > 0) {
          setSelectedPlayerId(dashboardData.players[0].id);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido al cargar los datos para informes.";

        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const positionOptions = useMemo(() => {
    const positions = new Set<string>();

    data?.players.forEach((player) => {
      positions.add(player.position ?? "Sin posición");
    });

    return Array.from(positions).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filters = useMemo<ReportFilters>(() => {
    return {
      dateFrom,
      dateTo,
      positionFilter,
    };
  }, [dateFrom, dateTo, positionFilter]);

  const playerRows = useMemo(() => {
    if (!data) return [];

    return buildPlayerRows(data, filters);
  }, [data, filters]);

  useEffect(() => {
    if (playerRows.length === 0) {
      setSelectedPlayerId("");
      return;
    }

    const selectedExists = playerRows.some(
      (row) => row.player.id === selectedPlayerId,
    );

    if (!selectedExists) {
      setSelectedPlayerId(playerRows[0].player.id);
    }
  }, [playerRows, selectedPlayerId]);

  const selectedPlayerRow = useMemo(() => {
    return (
      playerRows.find((row) => row.player.id === selectedPlayerId) ??
      playerRows[0] ??
      null
    );
  }, [playerRows, selectedPlayerId]);

  const summary = useMemo(() => {
    const playersWithGps = playerRows.filter((row) => row.gpsSessions > 0).length;
    const playersWithNeuromuscular = playerRows.filter(
      (row) => row.neuromuscularSessions > 0,
    ).length;
    const playersWithTests = playerRows.filter((row) => row.testScores > 0).length;

    return {
      players: playerRows.length,
      playersWithGps,
      playersWithNeuromuscular,
      playersWithTests,
      gpsRecords: playerRows.reduce((sum, row) => sum + row.gpsSessions, 0),
      neuromuscularRecords: playerRows.reduce(
        (sum, row) => sum + row.neuromuscularSessions,
        0,
      ),
      testScores: playerRows.reduce((sum, row) => sum + row.testScores, 0),
    };
  }, [playerRows]);

  function handleDownloadHtml() {
    if (reportType === "team") {
      const html = buildTeamHtmlReport(playerRows, filters);

      downloadTextFile(
        "informe-global-equipo.html",
        html,
        "text/html;charset=utf-8",
      );

      return;
    }

    if (!selectedPlayerRow) return;

    const html = buildPlayerHtmlReport(selectedPlayerRow, filters);
    const filename = `informe-individual-${slugify(
      selectedPlayerRow.player.name,
    )}.html`;

    downloadTextFile(filename, html, "text/html;charset=utf-8");
  }

  function handleDownloadCsv() {
    const csv = buildTeamCsv(playerRows, filters);

    downloadTextFile(
      "resumen-informes-equipo.csv",
      `\uFEFF${csv}`,
      "text/csv;charset=utf-8",
    );
  }

  return (
    <AppShell
      title="Informes"
      subtitle="Generación de informes individuales, informes de sesión, informes semanales y reportes globales para cuerpo técnico."
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Informes descargables
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Generador de informes HTML y CSV
              </h2>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                Esta sección integra jugadores, GPS, rendimiento neuromuscular y
                tests físicos para generar informes descargables. El HTML puede
                abrirse en el navegador y guardarse como PDF desde el botón de
                impresión.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-[280px] md:shrink-0">
              <button
                type="button"
                onClick={handleDownloadHtml}
                disabled={loading || Boolean(error) || playerRows.length === 0}
                className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar informe HTML
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={loading || Boolean(error) || playerRows.length === 0}
                className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar resumen CSV
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6">
              <StatusMessage
                variant="error"
                title="No se han podido cargar los informes"
              >
                {error}
              </StatusMessage>
            </div>
          )}

          {loading && (
            <div className="mt-6">
              <StatusMessage variant="info" title="Cargando datos para informes">
                Cargando jugadores, registros GPS, controles neuromusculares y
                puntuaciones de tests.
              </StatusMessage>
            </div>
          )}

          {!loading && !error && !data && (
            <div className="mt-6">
              <EmptyState
                title="Sin datos disponibles"
                description="No se han encontrado datos para generar informes. Revisa que haya jugadores y registros cargados en la plataforma."
              />
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryCard title="Jugadores" value={summary.players} />

                <SummaryCard title="Con GPS" value={summary.playersWithGps} />

                <SummaryCard
                  title="Con neuromuscular"
                  value={summary.playersWithNeuromuscular}
                />

                <SummaryCard title="Con tests" value={summary.playersWithTests} />
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label className="text-sm font-bold text-slate-700">
                    Tipo de informe
                    <select
                      value={reportType}
                      onChange={(event) =>
                        setReportType(event.target.value as ReportType)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="team">Informe global del equipo</option>
                      <option value="player">Informe individual</option>
                    </select>
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Jugador
                    <select
                      value={selectedPlayerId}
                      onChange={(event) => setSelectedPlayerId(event.target.value)}
                      disabled={reportType !== "player" || playerRows.length === 0}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {playerRows.map((row) => (
                        <option key={row.player.id} value={row.player.id}>
                          {row.player.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Posición
                    <select
                      value={positionFilter}
                      onChange={(event) => setPositionFilter(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="all">Todas las posiciones</option>

                      {positionOptions.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Desde
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Hasta
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <StatusMessage variant="info" title="Criterio de filtrado">
                    El filtro de fecha se aplica a GPS y registros
                    neuromusculares. Las puntuaciones de tests se integran de
                    forma global porque la tabla actual de puntuaciones no
                    incluye fecha de sesión.
                  </StatusMessage>
                </div>

                {playerRows.length === 0 && (
                  <div className="mt-4">
                    <EmptyState
                      title="Sin jugadores para el informe"
                      description="No hay jugadores disponibles con los filtros seleccionados. Cambia la posición o el rango de fechas para ampliar la búsqueda."
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {!loading && !error && data && reportType === "player" && !selectedPlayerRow && (
          <EmptyState
            title="Sin jugador seleccionado"
            description="No hay ningún jugador disponible para generar el informe individual con los filtros actuales."
          />
        )}

        {!loading && !error && data && reportType === "player" && selectedPlayerRow && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Vista previa individual
              </p>

              <h2 className="break-words text-xl font-black text-slate-950">
                {selectedPlayerRow.player.name}
              </h2>

              <p className="text-sm font-bold text-slate-500">
                {selectedPlayerRow.player.position ?? "Sin posición"}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard
                title="Distancia GPS"
                value={formatMeters(selectedPlayerRow.gpsTotalDistance)}
              />

              <SummaryCard
                title="CMJ último"
                value={formatNumber(selectedPlayerRow.cmjPre, 2)}
              />

              <SummaryCard
                title="VMP última"
                value={formatNumber(selectedPlayerRow.vmpPre, 3)}
              />

              <SummaryCard
                title="Score tests"
                value={formatNumber(selectedPlayerRow.averageTestScore, 1)}
              />
            </div>
          </section>
        )}

        {!loading && !error && data && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-950">
                Resumen integrado por jugador
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Vista previa de los datos que se utilizan para generar los
                informes.
              </p>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {playerRows.map((row) => (
                <article key={row.player.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-black text-slate-950">
                        {row.player.name}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {row.player.position ?? "Sin posición"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                      Informe
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        GPS
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {row.gpsSessions}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Neuro
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {row.neuromuscularSessions}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Tests
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {row.testScores}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Últimos registros
                      </p>

                      <p className="mt-1 font-bold text-slate-700">
                        GPS: {formatDate(row.latestGpsDate)} · NM:{" "}
                        {formatDate(row.latestNeuromuscularDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Distancia
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatMeters(row.gpsTotalDistance)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        HSR
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatMeters(row.gpsHsr)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Sprint
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatMeters(row.gpsSprintDistance)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Sprints
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(row.gpsSprints, 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        ACC
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(row.gpsAcc, 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        DEC
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(row.gpsDec, 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        CMJ
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(row.cmjPre, 2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        RSI mod
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(row.rsimodPre, 2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        VMP
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(row.vmpPre, 3)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        RPE
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(row.rpe, 1)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Score tests
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {formatNumber(row.averageTestScore, 1)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              {playerRows.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    title="Sin jugadores disponibles"
                    description="No hay jugadores disponibles para generar informes con los filtros seleccionados."
                  />
                </div>
              )}
            </div>

            <div className="hidden max-h-[620px] overflow-auto md:block">
              <table className="w-full min-w-[1500px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Jugador</th>
                    <th className="px-4 py-3">Posición</th>
                    <th className="px-4 py-3">GPS</th>
                    <th className="px-4 py-3">Neuromuscular</th>
                    <th className="px-4 py-3">Tests</th>
                    <th className="px-4 py-3">Último GPS</th>
                    <th className="px-4 py-3">Último NM</th>
                    <th className="px-4 py-3">Distancia</th>
                    <th className="px-4 py-3">HSR</th>
                    <th className="px-4 py-3">Sprint</th>
                    <th className="px-4 py-3">Sprints</th>
                    <th className="px-4 py-3">ACC</th>
                    <th className="px-4 py-3">DEC</th>
                    <th className="px-4 py-3">CMJ</th>
                    <th className="px-4 py-3">RSI mod</th>
                    <th className="px-4 py-3">VMP</th>
                    <th className="px-4 py-3">RPE</th>
                    <th className="px-4 py-3">Score tests</th>
                  </tr>
                </thead>

                <tbody>
                  {playerRows.map((row) => (
                    <tr key={row.player.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-black text-slate-950">
                        {row.player.name}
                      </td>

                      <td className="px-4 py-3">{row.player.position ?? "—"}</td>

                      <td className="px-4 py-3">{row.gpsSessions}</td>

                      <td className="px-4 py-3">{row.neuromuscularSessions}</td>

                      <td className="px-4 py-3">{row.testScores}</td>

                      <td className="px-4 py-3">{formatDate(row.latestGpsDate)}</td>

                      <td className="px-4 py-3">
                        {formatDate(row.latestNeuromuscularDate)}
                      </td>

                      <td className="px-4 py-3">
                        {formatMeters(row.gpsTotalDistance)}
                      </td>

                      <td className="px-4 py-3">{formatMeters(row.gpsHsr)}</td>

                      <td className="px-4 py-3">
                        {formatMeters(row.gpsSprintDistance)}
                      </td>

                      <td className="px-4 py-3">{formatNumber(row.gpsSprints, 0)}</td>

                      <td className="px-4 py-3">{formatNumber(row.gpsAcc, 0)}</td>

                      <td className="px-4 py-3">{formatNumber(row.gpsDec, 0)}</td>

                      <td className="px-4 py-3">{formatNumber(row.cmjPre, 2)}</td>

                      <td className="px-4 py-3">
                        {formatNumber(row.rsimodPre, 2)}
                      </td>

                      <td className="px-4 py-3">{formatNumber(row.vmpPre, 3)}</td>

                      <td className="px-4 py-3">{formatNumber(row.rpe, 1)}</td>

                      <td className="px-4 py-3">
                        {formatNumber(row.averageTestScore, 1)}
                      </td>
                    </tr>
                  ))}

                  {playerRows.length === 0 && (
                    <tr>
                      <td colSpan={18} className="px-4 py-6">
                        <EmptyState
                          title="Sin jugadores disponibles"
                          description="No hay jugadores disponibles para generar informes con los filtros seleccionados."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
