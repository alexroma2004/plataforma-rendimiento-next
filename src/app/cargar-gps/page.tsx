"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import Papa from "papaparse";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
import { saveGpsSessionToSupabase, type RawGpsRow } from "@/lib/supabase/gps";

type GpsPreviewRow = {
  jugador: string;
  posicion: string;
  sesion: string;
  tarea: string;
  md: string;
  distancia: number | null;
  hsr: number | null;
  sprint: number | null;
  sprints: number | null;
  acc: number | null;
  dec: number | null;
};

type GpsColumnGroup = {
  label: string;
  aliases: string[];
};

const requiredColumnGroups: GpsColumnGroup[] = [
  {
    label: "jugador",
    aliases: [
      "player",
      "player_name",
      "playername",
      "jugador",
      "nombre",
      "name",
      "athlete",
      "deportista",
    ],
  },
  {
    label: "distancia total",
    aliases: [
      "total_distance",
      "totaldistance",
      "distance",
      "distancia",
      "distancia_total",
    ],
  },
];

const recommendedColumnGroups: GpsColumnGroup[] = [
  { label: "posición", aliases: ["position", "posicion"] },
  { label: "sesión", aliases: ["session", "sesion", "session_name"] },
  { label: "tarea", aliases: ["task", "tarea", "drill"] },
  { label: "microciclo", aliases: ["md", "microcycle", "microciclo"] },
  {
    label: "HSR",
    aliases: ["hsr", "high_speed_running", "hsr_distance", "distancia_hsr"],
  },
  {
    label: "distancia sprint",
    aliases: [
      "distance_vrange6",
      "sprint",
      "sprint_distance",
      "distance_sprint",
      "distancia_sprint",
    ],
  },
  {
    label: "sprints",
    aliases: ["sprints", "num_sprints", "n_sprints", "sprint_count"],
  },
  {
    label: "aceleraciones",
    aliases: ["num_acc", "numacc", "acc", "accelerations", "aceleraciones"],
  },
  {
    label: "deceleraciones",
    aliases: ["num_dec", "numdec", "dec", "decelerations", "deceleraciones"],
  },
];

function normalizeHeader(value: string): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[().%]/g, "")
    .replace(/[/\\-]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function getFirstExistingValue(row: RawGpsRow, possibleKeys: string[]) {
  const rowAsRecord = row as Record<string, unknown>;

  for (const key of possibleKeys) {
    if (
      rowAsRecord[key] !== undefined &&
      rowAsRecord[key] !== null &&
      String(rowAsRecord[key]).trim() !== ""
    ) {
      return rowAsRecord[key];
    }
  }

  const normalizedRow: Record<string, unknown> = {};

  Object.entries(rowAsRecord).forEach(([key, value]) => {
    normalizedRow[normalizeHeader(key)] = value;
  });

  for (const key of possibleKeys) {
    const normalizedKey = normalizeHeader(key);

    if (
      normalizedRow[normalizedKey] !== undefined &&
      normalizedRow[normalizedKey] !== null &&
      String(normalizedRow[normalizedKey]).trim() !== ""
    ) {
      return normalizedRow[normalizedKey];
    }
  }

  return null;
}

function toText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).trim() || "—";
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value)
    .trim()
    .toLowerCase()
    .replace("km", "")
    .replace("m", "")
    .replace(/\s/g, "");

  if (!text || text === "—" || text.toUpperCase() === "N/A") {
    return null;
  }

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");

  if (hasComma && hasDot) {
    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");

    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (hasComma) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  text = text.replace(/[^\d.-]/g, "");

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function toGpsDistanceMeters(value: unknown): number | null {
  const number = toNumberOrNull(value);

  if (number === null) return null;

  /*
    En tus archivos GPS:
    - total_distance viene como 11,680 = 11.680 m
    - hsr viene como 0,639 = 639 m
    - distance_vrange6 viene como 0,190 = 190 m

    Por tanto, si el valor es menor de 300, lo tratamos como kilómetros
    y lo convertimos a metros.
  */
  if (Math.abs(number) > 0 && Math.abs(number) < 300) {
    return Math.round(number * 1000);
  }

  return Math.round(number);
}

function formatNumber(value: number | null, suffix = "") {
  if (value === null || value === undefined) return "—";

  return `${Math.round(value).toLocaleString("es-ES")}${suffix}`;
}

function preparePreviewRow(row: RawGpsRow): GpsPreviewRow {
  const jugador = getFirstExistingValue(row, [
    "player",
    "Player",
    "PLAYER",
    "player_name",
    "playerName",
    "jugador",
    "Jugador",
    "JUGADOR",
    "nombre",
    "Nombre",
    "NOMBRE",
    "name",
    "Name",
    "athlete",
    "Athlete",
    "deportista",
    "Deportista",
  ]);

  const posicion = getFirstExistingValue(row, [
    "position",
    "Position",
    "posición",
    "Posición",
    "POSICIÓN",
    "posicion",
    "Posicion",
    "POSICION",
  ]);

  const sesion = getFirstExistingValue(row, [
    "session",
    "Session",
    "sesion",
    "Sesión",
    "SESION",
    "SESIÓN",
    "session_name",
    "Session name",
  ]);

  const tarea = getFirstExistingValue(row, [
    "task",
    "Task",
    "tarea",
    "Tarea",
    "TAREA",
    "drill",
    "Drill",
  ]);

  const md = getFirstExistingValue(row, [
    "md",
    "MD",
    "microcycle",
    "Microcycle",
    "microciclo",
    "Microciclo",
    "MICROCICLO",
  ]);

  const distancia = getFirstExistingValue(row, [
    "total_distance",
    "totalDistance",
    "total distance",
    "distance",
    "Distance",
    "distancia",
    "Distancia",
    "DISTANCIA",
    "Distancia total",
    "DISTANCIA TOTAL",
  ]);

  const hsr = getFirstExistingValue(row, [
    "hsr",
    "HSR",
    "Hsr",
    "high_speed_running",
    "hsr_distance",
    "distancia_hsr",
    "distancia hsr",
  ]);

  const sprint = getFirstExistingValue(row, [
    "distance_vrange6",
    "DISTANCE_VRANGE6",
    "Distance Vrange 6",
    "Sprint",
    "SPRINT",
    "sprint",
    "sprint_distance",
    "distance_sprint",
    "distancia_sprint",
    "Distancia sprint",
    "DISTANCIA SPRINT",
  ]);

  const sprints = getFirstExistingValue(row, [
    "sprints",
    "Sprints",
    "SPRINTS",
    "num_sprints",
    "n_sprints",
    "sprint_count",
  ]);

  const acc = getFirstExistingValue(row, [
    "num_acc",
    "numAcc",
    "ACC",
    "Acc",
    "acc",
    "accelerations",
    "Aceleraciones",
    "ACELERACIONES",
  ]);

  const dec = getFirstExistingValue(row, [
    "num_dec",
    "numDec",
    "DEC",
    "Dec",
    "dec",
    "decelerations",
    "Deceleraciones",
    "DECELERACIONES",
  ]);

  return {
    jugador: toText(jugador),
    posicion: toText(posicion),
    sesion: toText(sesion),
    tarea: toText(tarea),
    md: toText(md),

    distancia: toGpsDistanceMeters(distancia),
    hsr: toGpsDistanceMeters(hsr),
    sprint: toGpsDistanceMeters(sprint),

    sprints: toNumberOrNull(sprints),
    acc: toNumberOrNull(acc),
    dec: toNumberOrNull(dec),
  };
}

function inferSessionName(filename: string | null) {
  if (!filename) return "Sesión GPS";

  return filename
    .replace(".csv", "")
    .replace(".xlsx", "")
    .replace(".xls", "")
    .replace(/_/g, " ")
    .trim();
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

export default function CargarGpsPage() {
  const [gpsRows, setGpsRows] = useState<RawGpsRow[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);

  const [sessionDate, setSessionDate] = useState("");
  const [microcycle, setMicrocycle] = useState("MD-1");
  const [sessionName, setSessionName] = useState("");
  const [isMatch, setIsMatch] = useState(false);
  const [notes, setNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const previewRows = useMemo(() => {
    return gpsRows.map(preparePreviewRow);
  }, [gpsRows]);

  const totals = useMemo(() => {
    return previewRows.reduce(
      (acc, row) => {
        acc.totalDistance += row.distancia ?? 0;
        acc.hsr += row.hsr ?? 0;
        acc.sprint += row.sprint ?? 0;
        acc.sprints += row.sprints ?? 0;
        acc.acc += row.acc ?? 0;
        acc.dec += row.dec ?? 0;

        return acc;
      },
      {
        totalDistance: 0,
        hsr: 0,
        sprint: 0,
        sprints: 0,
        acc: 0,
        dec: 0,
      },
    );
  }, [previewRows]);

  const fileAnalysis = useMemo(() => {
    const detectedHeaders = new Set(
      Object.keys(gpsRows[0] ?? {}).map(normalizeHeader),
    );
    const hasColumnGroup = (group: GpsColumnGroup) =>
      group.aliases.some((alias) => detectedHeaders.has(alias));
    const missingRequiredColumns = requiredColumnGroups
      .filter((group) => !hasColumnGroup(group))
      .map((group) => group.label);
    const missingRecommendedColumns = recommendedColumnGroups
      .filter((group) => !hasColumnGroup(group))
      .map((group) => group.label);
    const emptyText = toText(null);
    const uniquePlayers = new Set(
      previewRows
        .map((row) => row.jugador)
        .filter((player) => player !== emptyText),
    );
    const detectedSessions = Array.from(
      new Set(
        previewRows
          .map((row) => row.sesion)
          .filter((session) => session !== emptyText),
      ),
    );
    const rowsWithoutPlayer = previewRows.filter(
      (row) => row.jugador === emptyText,
    ).length;
    const rowsWithoutDistance = previewRows.filter(
      (row) => row.distancia === null,
    ).length;
    const metricValues = previewRows.flatMap((row) => [
      row.distancia,
      row.hsr,
      row.sprint,
      row.sprints,
      row.acc,
      row.dec,
    ]);
    const emptyMetricValues = metricValues.filter(
      (value) => value === null,
    ).length;
    const emptyMetricPercent =
      metricValues.length > 0
        ? (emptyMetricValues / metricValues.length) * 100
        : 0;
    const warnings: string[] = [];

    if (missingRecommendedColumns.length > 0) {
      warnings.push(
        `No se detectan estas columnas recomendadas: ${missingRecommendedColumns.join(
          ", ",
        )}.`,
      );
    }

    if (rowsWithoutPlayer > 0) {
      warnings.push(
        `${rowsWithoutPlayer} registros no tienen un jugador reconocible.`,
      );
    }

    if (rowsWithoutDistance > 0) {
      warnings.push(
        `${rowsWithoutDistance} registros no tienen distancia total válida.`,
      );
    }

    if (emptyMetricPercent >= 25) {
      warnings.push(
        `${formatNumber(
          emptyMetricPercent,
        )}% de los valores de métricas principales están vacíos.`,
      );
    }

    return {
      uniquePlayers: uniquePlayers.size,
      detectedSession: detectedSessions[0] ?? null,
      missingRequiredColumns,
      warnings,
    };
  }, [gpsRows, previewRows]);

  const missingSessionFields = [
    !sessionDate ? "fecha de sesión" : null,
    !microcycle ? "día de microciclo" : null,
    !sessionName.trim() ? "nombre de sesión" : null,
  ].filter((value): value is string => Boolean(value));
  const hasBlockingValidationIssues =
    missingSessionFields.length > 0 ||
    fileAnalysis.missingRequiredColumns.length > 0 ||
    fileAnalysis.uniquePlayers === 0;

  function handleGpsFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setSaveMessage(null);
    setSaveError(null);
    setGpsRows([]);

    if (!file) return;

    setSelectedFilename(file.name);

    const inferredName = inferSessionName(file.name);
    setSessionName(inferredName);

    Papa.parse<RawGpsRow>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      dynamicTyping: false,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
      complete: (results) => {
        const rows = results.data.filter((row) => {
          return Object.values(row as Record<string, unknown>).some(
            (value) =>
              value !== null &&
              value !== undefined &&
              String(value).trim() !== "",
          );
        });

        setGpsRows(rows);
      },
      error: (error) => {
        setGpsRows([]);
        setSaveError(`No se ha podido leer el archivo GPS: ${error.message}`);
      },
    });
  }

  async function handleSaveGpsSession() {
    setSaveMessage(null);
    setSaveError(null);

    if (gpsRows.length === 0) {
      setSaveError("Primero tienes que seleccionar un archivo GPS válido.");
      return;
    }

    if (!sessionDate) {
      setSaveError("Selecciona la fecha de la sesión antes de guardar.");
      return;
    }

    if (!microcycle) {
      setSaveError("Selecciona el día de microciclo antes de guardar.");
      return;
    }

    if (!sessionName.trim()) {
      setSaveError("Escribe un nombre para la sesión GPS.");
      return;
    }

    try {
      setIsSaving(true);

      const result = await saveGpsSessionToSupabase({
        sessionDate,
        microcycle,
        sessionName,
        sourceFilename: selectedFilename ?? "archivo_gps.csv",
        isMatch,
        notes,
        rows: gpsRows,
      });

      setSaveMessage(
        `Sesión GPS guardada correctamente. Registros insertados: ${result.insertedRecords}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al guardar la sesión GPS.";

      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell
      title="Cargar GPS"
      subtitle="Importa archivos CSV de GPS, revisa la previsualización y guarda sesiones de entrenamiento o partido en Supabase."
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                GPS
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Carga y previsualización de archivo GPS
              </h2>

              <p className="mt-3 max-w-4xl break-words text-sm leading-6 text-slate-600">
                Sube un archivo CSV exportado del sistema GPS. La aplicación
                leerá los registros, detectará las filas de jugadores y mostrará
                una previsualización antes de guardar los datos.
              </p>
            </div>

            <label className="w-full cursor-pointer rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white shadow hover:bg-slate-800 md:w-auto md:shrink-0">
              Seleccionar CSV GPS
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleGpsFileChange}
              />
            </label>
          </div>

          <div className="mt-6">
            <StatusMessage variant="info" title="Formato CSV esperado">
              Usa un CSV con encabezados y separador de punto y coma (;). Las
              columnas imprescindibles son jugador y distancia total. Se
              recomiendan posición, sesión, tarea, MD, HSR, distancia sprint,
              sprints, num_acc y num_dec. Se admiten coma o punto decimal.
            </StatusMessage>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Archivo seleccionado:{" "}
            <span className="break-all font-bold">
              {selectedFilename ?? "ninguno"}
            </span>
          </div>

          {saveMessage && (
            <div className="mt-4">
              <StatusMessage variant="success" title="Sesión guardada">
                {saveMessage}
              </StatusMessage>
            </div>
          )}

          {saveError && (
            <div className="mt-4">
              <StatusMessage variant="error" title="Revisa el archivo o la sesión">
                {saveError}
              </StatusMessage>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard
              title="Registros detectados"
              value={previewRows.length}
            />

            <SummaryCard
              title="Jugadores detectados"
              value={fileAnalysis.uniquePlayers}
            />

            <SummaryCard
              title="Fecha / sesión"
              value={
                sessionDate || sessionName
                  ? [
                      sessionDate || "Sin fecha",
                      sessionName ||
                        fileAnalysis.detectedSession ||
                        "Sin nombre",
                    ].join(" · ")
                  : "Pendiente"
              }
            />

            <SummaryCard
              title="Distancia total"
              value={formatNumber(totals.totalDistance, " m")}
            />

            <SummaryCard title="HSR total" value={formatNumber(totals.hsr, " m")} />

            <SummaryCard
              title="Sprint total"
              value={formatNumber(totals.sprint, " m")}
            />
          </div>

          {previewRows.length > 0 &&
            fileAnalysis.missingRequiredColumns.length > 0 && (
              <div className="mt-6">
                <StatusMessage
                  variant="error"
                  title="Columnas imprescindibles no detectadas"
                >
                  Revisa los encabezados del CSV. Faltan:{" "}
                  {fileAnalysis.missingRequiredColumns.join(", ")}.
                </StatusMessage>
              </div>
            )}

          {previewRows.length > 0 && fileAnalysis.warnings.length > 0 && (
            <div className="mt-4">
              <StatusMessage variant="warning" title="Revisa la calidad de los datos">
                {fileAnalysis.warnings.join(" ")}
              </StatusMessage>
            </div>
          )}

          {previewRows.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Sin previsualización GPS"
                description="Selecciona un archivo CSV GPS válido para revisar los jugadores detectados, las métricas de carga externa y los valores antes de guardar la sesión en Supabase."
              />
            </div>
          ) : (
            <>
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-black text-slate-950">
                  Datos de la sesión
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="text-sm font-bold text-slate-700">
                    Fecha de sesión
                    <input
                      type="date"
                      value={sessionDate}
                      onChange={(event) => setSessionDate(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Día de microciclo
                    <select
                      value={microcycle}
                      onChange={(event) => setMicrocycle(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="MD+1">MD+1</option>
                      <option value="MD+2">MD+2</option>
                      <option value="MD-4">MD-4</option>
                      <option value="MD-3">MD-3</option>
                      <option value="MD-2">MD-2</option>
                      <option value="MD-1">MD-1</option>
                      <option value="PARTIDO">PARTIDO</option>
                    </select>
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Nombre de sesión
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(event) => setSessionName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                      placeholder="Ej. 16-04 MD-2"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 md:mt-7">
                    <input
                      type="checkbox"
                      checked={isMatch}
                      onChange={(event) => setIsMatch(event.target.checked)}
                    />
                    Es partido
                  </label>
                </div>

                <label className="mt-4 block text-sm font-bold text-slate-700">
                  Notas
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Notas opcionales sobre la sesión..."
                  />
                </label>

                {missingSessionFields.length > 0 && (
                  <div className="mt-4">
                    <StatusMessage
                      variant="warning"
                      title="Completa los datos de la sesión"
                    >
                      Antes de guardar, revisa:{" "}
                      {missingSessionFields.join(", ")}.
                    </StatusMessage>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveGpsSession}
                  disabled={isSaving || hasBlockingValidationIssues}
                  className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSaving
                    ? "Guardando sesión GPS..."
                    : "Guardar sesión GPS en Supabase"}
                </button>
              </section>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-black text-slate-950">
                    Previsualización GPS
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Revisa que los jugadores, métricas y valores se hayan leído
                    correctamente antes de guardar.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {previewRows.map((row, index) => (
                    <article key={`${row.jugador}-${index}`} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-slate-950">
                            {row.jugador}
                          </p>

                          <p className="mt-1 break-words text-xs font-bold text-slate-500">
                            {row.posicion} · {row.md}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                          GPS
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Sesión / tarea
                          </p>

                          <p className="mt-1 break-words font-bold text-slate-700">
                            {row.sesion} · {row.tarea}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Distancia
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.distancia, " m")}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            HSR
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.hsr, " m")}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Sprint
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.sprint, " m")}
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
                            {formatNumber(row.acc)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            DEC
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.dec)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden max-h-[520px] overflow-auto md:block">
                  <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Jugador</th>
                        <th className="px-4 py-3">Posición</th>
                        <th className="px-4 py-3">Sesión</th>
                        <th className="px-4 py-3">Tarea</th>
                        <th className="px-4 py-3">MD</th>
                        <th className="px-4 py-3">Distancia</th>
                        <th className="px-4 py-3">HSR</th>
                        <th className="px-4 py-3">Sprint</th>
                        <th className="px-4 py-3">Sprints</th>
                        <th className="px-4 py-3">ACC</th>
                        <th className="px-4 py-3">DEC</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-black">
                            {row.jugador}
                          </td>
                          <td className="px-4 py-3">{row.posicion}</td>
                          <td className="px-4 py-3">{row.sesion}</td>
                          <td className="px-4 py-3">{row.tarea}</td>
                          <td className="px-4 py-3">{row.md}</td>
                          <td className="px-4 py-3">
                            {formatNumber(row.distancia, " m")}
                          </td>
                          <td className="px-4 py-3">
                            {formatNumber(row.hsr, " m")}
                          </td>
                          <td className="px-4 py-3">
                            {formatNumber(row.sprint, " m")}
                          </td>
                          <td className="px-4 py-3">
                            {formatNumber(row.sprints)}
                          </td>
                          <td className="px-4 py-3">
                            {formatNumber(row.acc)}
                          </td>
                          <td className="px-4 py-3">
                            {formatNumber(row.dec)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4">
                <StatusMessage variant="success" title="Archivo leído correctamente">
                  Archivo GPS leído correctamente. Revisa la fecha, el
                  microciclo y el nombre de sesión antes de guardar en Supabase.
                </StatusMessage>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
