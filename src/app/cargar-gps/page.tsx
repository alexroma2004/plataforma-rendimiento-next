"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
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

export default function CargarDatosPage() {
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
      }
    );
  }, [previewRows]);

  function handleGpsFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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
            (value) => value !== null && value !== undefined && String(value).trim() !== ""
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
        `Sesión GPS guardada correctamente. Registros insertados: ${result.insertedRecords}.`
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
    <main className="min-h-screen bg-slate-100 p-8 text-slate-950">
      <section className="rounded-2xl bg-slate-950 p-8 text-white shadow">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
          Plataforma de rendimiento
        </p>

        <h1 className="mt-3 text-4xl font-black">Cargar datos</h1>

        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200">
          Importación de sesiones neuromusculares, sesiones GPS y tests físicos.
          En esta sección se cargarán archivos Excel o CSV, se revisará la
          interpretación de columnas y posteriormente se guardarán los datos en
          Supabase.
        </p>
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
              GPS
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Carga y previsualización de archivo GPS
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              Sube un archivo CSV exportado del sistema GPS. La aplicación leerá
              los registros, detectará las filas de jugadores y mostrará una
              previsualización antes de guardar los datos.
            </p>
          </div>

          <label className="cursor-pointer rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow hover:bg-slate-800">
            Seleccionar CSV GPS
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleGpsFileChange}
            />
          </label>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Archivo seleccionado:{" "}
          <span className="font-bold">{selectedFilename ?? "ninguno"}</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">
              Jugadores detectados
            </p>
            <p className="mt-2 text-3xl font-black">{previewRows.length}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">Distancia total</p>
            <p className="mt-2 text-3xl font-black">
              {formatNumber(totals.totalDistance, " m")}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">HSR total</p>
            <p className="mt-2 text-3xl font-black">
              {formatNumber(totals.hsr, " m")}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">Sprint total</p>
            <p className="mt-2 text-3xl font-black">
              {formatNumber(totals.sprint, " m")}
            </p>
          </div>
        </div>

        {previewRows.length > 0 && (
          <>
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-black">Datos de la sesión</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <label className="text-sm font-bold text-slate-700">
                  Fecha de sesión
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(event) => setSessionDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>

                <label className="text-sm font-bold text-slate-700">
                  Día de microciclo
                  <select
                    value={microcycle}
                    onChange={(event) => setMicrocycle(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
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
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Ej. 16-04 MD-2"
                  />
                </label>

                <label className="flex items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
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
                  className="mt-2 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Notas opcionales sobre la sesión..."
                />
              </label>

              <button
                type="button"
                onClick={handleSaveGpsSession}
                disabled={isSaving}
                className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando sesión GPS..." : "Guardar sesión GPS en Supabase"}
              </button>

              {saveMessage && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  {saveMessage}
                </div>
              )}

              {saveError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {saveError}
                </div>
              )}
            </section>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-[520px] overflow-auto">
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
                        <td className="px-4 py-3 font-black">{row.jugador}</td>
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
                        <td className="px-4 py-3">{formatNumber(row.acc)}</td>
                        <td className="px-4 py-3">{formatNumber(row.dec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              Archivo GPS leído correctamente. Revisa la fecha, el microciclo y
              el nombre de sesión antes de guardar en Supabase.
            </div>
          </>
        )}
      </section>
    </main>
  );
}