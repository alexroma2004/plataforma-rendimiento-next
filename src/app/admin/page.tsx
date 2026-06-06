"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  getAdminDashboardData,
  type AdminDashboardData,
} from "@/lib/supabase/admin-dashboard";

type QualityIssue = {
  title: string;
  value: number;
  description: string;
};

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("es-ES");
}

function getIssueClass(value: number) {
  if (value > 0) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getIssueLabel(value: number) {
  return value > 0 ? "Revisar" : "Correcto";
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], {
    type: mimeType,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function buildAdminAuditCsv(data: AdminDashboardData, qualityIssues: QualityIssue[]) {
  const summaryRows = [
    ["Bloque", "Variable", "Valor"],
    ["Resumen", "Equipos", data.counts.teams],
    ["Resumen", "Jugadores totales", data.counts.players],
    ["Resumen", "Jugadores activos", data.counts.activePlayers],
    ["Resumen", "Sesiones GPS", data.counts.gpsSessions],
    ["Resumen", "Registros GPS", data.counts.gpsRecords],
    ["Resumen", "Sesiones tests", data.counts.testSessions],
    ["Resumen", "Resultados tests", data.counts.testResults],
    ["Resumen", "Puntuaciones tests", data.counts.testScores],
    [],
    ["Integridad", "Indicador", "Valor", "Estado", "Descripción"],
    ...qualityIssues.map((issue) => [
      "Integridad",
      issue.title,
      issue.value,
      getIssueLabel(issue.value),
      issue.description,
    ]),
    [],
    ["Jugadores", "Nombre", "Nombre normalizado", "Posición", "Línea", "Dorsal", "Portero", "Estado"],
    ...data.players.map((player) => [
      "Jugadores",
      player.name,
      player.normalized_name,
      player.position ?? "",
      player.line ?? "",
      player.shirt_number ?? "",
      player.is_goalkeeper ? "Sí" : "No",
      player.active === false ? "Inactivo" : "Activo",
    ]),
  ];

  return summaryRows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
}

function buildAdminHtmlReport(data: AdminDashboardData, qualityIssues: QualityIssue[]) {
  const totalIssues = qualityIssues.reduce((sum, issue) => sum + issue.value, 0);

  const issuesHtml = qualityIssues
    .map((issue) => {
      const status = issue.value > 0 ? "Revisar" : "Correcto";
      const className = issue.value > 0 ? "bad" : "good";

      return `
        <tr>
          <td>${escapeHtml(issue.title)}</td>
          <td>${escapeHtml(issue.value)}</td>
          <td><span class="badge ${className}">${escapeHtml(status)}</span></td>
          <td>${escapeHtml(issue.description)}</td>
        </tr>
      `;
    })
    .join("");

  const playersHtml = data.players
    .map(
      (player) => `
        <tr>
          <td>
            <strong>${escapeHtml(player.name)}</strong>
            <br />
            <span>${escapeHtml(player.normalized_name)}</span>
          </td>
          <td>${escapeHtml(player.position ?? "—")}</td>
          <td>${escapeHtml(player.line ?? "—")}</td>
          <td>${escapeHtml(player.shirt_number ?? "—")}</td>
          <td>${player.is_goalkeeper ? "Sí" : "No"}</td>
          <td>${player.active === false ? "Inactivo" : "Activo"}</td>
        </tr>
      `,
    )
    .join("");

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe de administración</title>
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

    .grid {
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
      text-transform: uppercase;
    }

    .card strong {
      font-size: 26px;
    }

    .section {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }

    h1, h2 {
      margin: 0;
    }

    h2 {
      margin-bottom: 14px;
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
      vertical-align: top;
    }

    td span {
      color: #64748b;
      font-size: 12px;
    }

    .badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      border: 1px solid;
    }

    .badge.good {
      background: #ecfdf5;
      color: #047857;
      border-color: #6ee7b7;
    }

    .badge.bad {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fca5a5;
    }

    @media print {
      body {
        background: white;
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Informe de administración</h1>
    <p>Estado general de la base de datos, plantilla e integridad de vinculaciones.</p>
    <p>Estado global: ${totalIssues > 0 ? "Requiere revisión" : "Correcto"}</p>
  </div>

  <div class="grid">
    <div class="card">
      <span>Equipos</span>
      <strong>${escapeHtml(data.counts.teams)}</strong>
    </div>
    <div class="card">
      <span>Jugadores activos</span>
      <strong>${escapeHtml(data.counts.activePlayers)}</strong>
    </div>
    <div class="card">
      <span>Sesiones GPS</span>
      <strong>${escapeHtml(data.counts.gpsSessions)}</strong>
    </div>
    <div class="card">
      <span>Sesiones tests</span>
      <strong>${escapeHtml(data.counts.testSessions)}</strong>
    </div>
  </div>

  <section class="section">
    <h2>Integridad de datos</h2>
    <table>
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Valor</th>
          <th>Estado</th>
          <th>Descripción</th>
        </tr>
      </thead>
      <tbody>
        ${issuesHtml}
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2>Plantilla registrada</h2>
    <table>
      <thead>
        <tr>
          <th>Jugador</th>
          <th>Posición</th>
          <th>Línea</th>
          <th>Dorsal</th>
          <th>Portero</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${playersHtml}
      </tbody>
    </table>
  </section>
</body>
</html>
`;
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-black text-slate-950">
        {formatNumber(value)}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-500">{description}</p>
    </div>
  );
}

function IssueCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${getIssueClass(value)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide">{title}</p>

          <p className="mt-3 text-3xl font-black">{formatNumber(value)}</p>

          <p className="mt-2 text-sm font-bold">{description}</p>
        </div>

        <span className="rounded-full border border-current px-3 py-1 text-xs font-black">
          {getIssueLabel(value)}
        </span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAdminData() {
    try {
      setLoading(true);
      setError(null);

      const result = await getAdminDashboardData();

      setData(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar administración.";

      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const qualityIssues = useMemo<QualityIssue[]>(() => {
    if (!data) return [];

    return [
      {
        title: "GPS sin jugador",
        value: data.counts.gpsRecordsWithoutPlayer,
        description: "Registros GPS que no están vinculados a ningún jugador.",
      },
      {
        title: "GPS sin equipo",
        value:
          data.counts.gpsSessionsWithoutTeam + data.counts.gpsRecordsWithoutTeam,
        description: "Sesiones o registros GPS sin team_id.",
      },
      {
        title: "Neuromuscular sin jugador",
        value: data.counts.neuromuscularRecordsWithoutPlayer,
        description:
          "Registros neuromusculares que no están vinculados a ningún jugador.",
      },
      {
        title: "Neuromuscular sin equipo",
        value:
          data.counts.neuromuscularSessionsWithoutTeam +
          data.counts.neuromuscularRecordsWithoutTeam,
        description: "Sesiones o registros neuromusculares sin team_id.",
      },
      {
        title: "Tests sin jugador",
        value:
          data.counts.testResultsWithoutPlayer +
          data.counts.testScoresWithoutPlayer,
        description:
          "Resultados o puntuaciones de tests que no están vinculados a jugador.",
      },
      {
        title: "Tests sin equipo",
        value:
          data.counts.testSessionsWithoutTeam +
          data.counts.testResultsWithoutTeam +
          data.counts.testScoresWithoutTeam,
        description: "Sesiones, resultados o puntuaciones de tests sin team_id.",
      },
    ];
  }, [data]);

  const totalIssues = useMemo(() => {
    return qualityIssues.reduce((sum, issue) => sum + issue.value, 0);
  }, [qualityIssues]);

  function handleDownloadCsv() {
    if (!data) return;

    const csv = buildAdminAuditCsv(data, qualityIssues);

    downloadTextFile(
      "auditoria-administracion.csv",
      `\uFEFF${csv}`,
      "text/csv;charset=utf-8;",
    );
  }

  function handleDownloadHtml() {
    if (!data) return;

    const html = buildAdminHtmlReport(data, qualityIssues);

    downloadTextFile(
      "informe-administracion.html",
      html,
      "text/html;charset=utf-8;",
    );
  }

  return (
    <AppShell
      title="Administración"
      subtitle="Panel de control interno para revisar equipo, plantilla, sesiones cargadas e integridad de datos."
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                Control general
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Estado de la base de datos
              </h2>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Esta pantalla revisa si los datos principales están cargados y
                correctamente vinculados. Sirve para detectar errores antes de
                analizar informes, jugadores, equipo o comparadores.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:min-w-[240px]">
              <button
                type="button"
                onClick={loadAdminData}
                disabled={loading}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Actualizando..." : "Actualizar datos"}
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={!data || loading}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar auditoría CSV
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                disabled={!data || loading}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar informe HTML
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
              Cargando panel de administración...
            </div>
          )}

          {data && !loading && (
            <div
              className={`mt-6 rounded-xl border p-4 text-sm font-black ${
                totalIssues > 0
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {totalIssues > 0
                ? `Estado global: revisar ${formatNumber(
                    totalIssues,
                  )} incidencias de vinculación.`
                : "Estado global: todos los datos principales están correctamente vinculados."}
            </div>
          )}
        </section>

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Equipos"
                value={data.counts.teams}
                description="Equipos creados en Supabase."
              />

              <SummaryCard
                title="Jugadores activos"
                value={data.counts.activePlayers}
                description={`Total jugadores: ${formatNumber(data.counts.players)}.`}
              />

              <SummaryCard
                title="Sesiones GPS"
                value={data.counts.gpsSessions}
                description={`Registros GPS: ${formatNumber(data.counts.gpsRecords)}.`}
              />

              <SummaryCard
                title="Sesiones tests"
                value={data.counts.testSessions}
                description={`Resultados: ${formatNumber(
                  data.counts.testResults,
                )}. Puntuaciones: ${formatNumber(data.counts.testScores)}.`}
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                  Integridad
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Revisión de vinculaciones
                </h2>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                  Lo ideal es que todos estos valores estén en 0. Si aparece
                  algún valor en rojo, significa que hay registros cargados pero
                  no vinculados correctamente.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {qualityIssues.map((issue) => (
                  <IssueCard
                    key={issue.title}
                    title={issue.title}
                    value={issue.value}
                    description={issue.description}
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                  Equipo
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Equipo principal
                </h2>

                {data.team ? (
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500">Nombre</p>
                      <p className="mt-1 font-black text-slate-950">
                        {data.team.name}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500">Club</p>
                      <p className="mt-1 font-black text-slate-950">
                        {data.team.club ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500">
                        Categoría / temporada
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {data.team.category ?? "—"} · {data.team.season ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500">
                        Contexto
                      </p>
                      <p className="mt-1 font-black text-slate-950">
                        {data.team.context ?? "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                    No hay ningún equipo creado.
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
                <div className="border-b border-slate-200 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
                    Plantilla
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Jugadores registrados
                  </h2>
                </div>

                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Jugador</th>
                        <th className="px-4 py-3">Posición</th>
                        <th className="px-4 py-3">Línea</th>
                        <th className="px-4 py-3">Dorsal</th>
                        <th className="px-4 py-3">Portero</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.players.map((player) => (
                        <tr key={player.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-black text-slate-950">
                              {player.name}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {player.normalized_name}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            {player.position ?? "—"}
                          </td>

                          <td className="px-4 py-3">{player.line ?? "—"}</td>

                          <td className="px-4 py-3">
                            {player.shirt_number ?? "—"}
                          </td>

                          <td className="px-4 py-3">
                            {player.is_goalkeeper ? "Sí" : "No"}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                player.active === false
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {player.active === false ? "Inactivo" : "Activo"}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {data.players.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-6 text-center text-sm font-bold text-slate-500"
                          >
                            No hay jugadores registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                  Últimas sesiones GPS
                </h3>

                <div className="mt-4 space-y-3">
                  {data.latestGpsSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {session.session_date}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {session.microcycle ?? "Sin microciclo"} ·{" "}
                        {session.session_name ?? "Sesión GPS"}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {session.is_match ? "Partido" : "Entrenamiento"} ·{" "}
                        {session.source_filename ?? "Sin archivo"}
                      </p>
                    </div>
                  ))}

                  {data.latestGpsSessions.length === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                      No hay sesiones GPS cargadas.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                  Últimas sesiones neuromusculares
                </h3>

                <div className="mt-4 space-y-3">
                  {data.latestNeuromuscularSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {session.session_date}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {session.microcycle} ·{" "}
                        {session.session_name ?? "Control neuromuscular"}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {session.source_filename ?? "Sin archivo"}
                      </p>
                    </div>
                  ))}

                  {data.latestNeuromuscularSessions.length === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                      No hay sesiones neuromusculares cargadas.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                  Últimas sesiones de tests
                </h3>

                <div className="mt-4 space-y-3">
                  {data.latestTestSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {session.session_date}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {session.context} · {session.session_name}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {session.notes ?? "Sin notas"}
                      </p>
                    </div>
                  ))}

                  {data.latestTestSessions.length === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                      No hay sesiones de tests cargadas.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}