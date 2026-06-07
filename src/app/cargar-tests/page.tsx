"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import Papa from "papaparse";
import AppShell from "@/components/layout/AppShell";
import {
  createTestSessionWithResults,
  type RawTestRow,
  type TestRecordInput,
} from "@/lib/supabase/tests";

type TestPreviewRow = TestRecordInput;

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

function getFirstExistingValue(row: RawTestRow, possibleKeys: string[]) {
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
  if (value === null || value === undefined || value === "") return "";

  return String(value).trim();
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value).trim().toLowerCase().replace(/\s/g, "");

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

function toBooleanOrNull(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;

  const text = String(value).trim().toLowerCase();

  if (["si", "sí", "true", "1", "yes", "y"].includes(text)) return true;
  if (["no", "false", "0", "n"].includes(text)) return false;

  return null;
}

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined) return "—";

  return Number(value).toLocaleString("es-ES", {
    maximumFractionDigits: decimals,
  });
}

function inferSessionName(filename: string | null) {
  if (!filename) return "Sesión tests";

  return filename
    .replace(".csv", "")
    .replace(".xlsx", "")
    .replace(".xls", "")
    .replace(/_/g, " ")
    .trim();
}

function preparePreviewRow(row: RawTestRow): TestPreviewRow | null {
  const playerName = toText(
    getFirstExistingValue(row, [
      "player_name",
      "playerName",
      "jugador",
      "Jugador",
      "JUGADOR",
      "nombre",
      "Nombre",
      "NOMBRE",
      "player",
      "Player",
      "PLAYER",
      "name",
      "Name",
      "athlete",
      "Athlete",
      "deportista",
      "Deportista",
    ]),
  );

  const position = toText(
    getFirstExistingValue(row, [
      "position",
      "Position",
      "posición",
      "Posición",
      "POSICIÓN",
      "posicion",
      "Posicion",
      "POSICION",
    ]),
  );

  const testBlock = toText(
    getFirstExistingValue(row, [
      "test_block",
      "testBlock",
      "bloque",
      "Bloque",
      "BLOQUE",
      "capacidad",
      "Capacidad",
      "CAPACIDAD",
      "capacity",
      "Capacity",
    ]),
  );

  const variable = toText(
    getFirstExistingValue(row, [
      "variable",
      "Variable",
      "VARIABLE",
      "test",
      "Test",
      "prueba",
      "Prueba",
      "PRUEBA",
    ]),
  );

  const value = getFirstExistingValue(row, [
    "value",
    "Value",
    "valor",
    "Valor",
    "VALOR",
    "resultado",
    "Resultado",
    "RESULTADO",
    "marca",
    "Marca",
  ]);

  const unit = toText(
    getFirstExistingValue(row, [
      "unit",
      "Unit",
      "unidad",
      "Unidad",
      "UNIDAD",
    ]),
  );

  const direction = toText(
    getFirstExistingValue(row, [
      "direction",
      "Direction",
      "direccion",
      "Dirección",
      "DIRECCION",
      "criterio",
      "Criterio",
    ]),
  );

  const available = getFirstExistingValue(row, [
    "available",
    "Available",
    "disponible",
    "Disponible",
    "DISPONIBLE",
  ]);

  const originalWeight = getFirstExistingValue(row, [
    "original_weight",
    "originalWeight",
    "peso_original",
    "Peso original",
    "PESO ORIGINAL",
  ]);

  const usedWeight = getFirstExistingValue(row, [
    "used_weight",
    "usedWeight",
    "peso_usado",
    "Peso usado",
    "PESO USADO",
    "peso_final",
    "Peso final",
  ]);

  const variableScore = getFirstExistingValue(row, [
    "variable_score",
    "variableScore",
    "puntuacion_variable",
    "Puntuación variable",
    "PUNTUACION VARIABLE",
    "score",
    "Score",
    "puntuacion",
    "Puntuación",
  ]);

  const classification = toText(
    getFirstExistingValue(row, [
      "classification",
      "Classification",
      "clasificacion",
      "Clasificación",
      "CLASIFICACION",
      "nivel",
      "Nivel",
    ]),
  );

  if (!playerName || !testBlock || !variable) {
    return null;
  }

  return {
    player_name: playerName,
    position: position || null,
    test_block: testBlock,
    variable,
    value: toNumberOrNull(value),
    unit: unit || null,
    direction: direction || null,
    available: toBooleanOrNull(available) ?? true,
    original_weight: toNumberOrNull(originalWeight),
    used_weight: toNumberOrNull(usedWeight),
    variable_score: toNumberOrNull(variableScore),
    classification: classification || null,
    source: "CSV",
  };
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

export default function CargarTestsPage() {
  const [rawRows, setRawRows] = useState<RawTestRow[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);

  const [sessionDate, setSessionDate] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [context, setContext] = useState("GENERAL");
  const [notes, setNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const previewRows = useMemo(() => {
    return rawRows
      .map(preparePreviewRow)
      .filter((row): row is TestPreviewRow => row !== null);
  }, [rawRows]);

  const summary = useMemo(() => {
    const players = new Set(previewRows.map((row) => row.player_name));
    const blocks = new Set(previewRows.map((row) => row.test_block));
    const variables = new Set(previewRows.map((row) => row.variable));

    return {
      rows: previewRows.length,
      players: players.size,
      blocks: blocks.size,
      variables: variables.size,
    };
  }, [previewRows]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setSaveMessage(null);
    setSaveError(null);
    setRawRows([]);

    if (!file) return;

    setSelectedFilename(file.name);
    setSessionName(inferSessionName(file.name));

    Papa.parse<RawTestRow>(file, {
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

        setRawRows(rows);
      },
      error: (error) => {
        setRawRows([]);
        setSaveError(`No se ha podido leer el archivo de tests: ${error.message}`);
      },
    });
  }

  async function handleSaveSession() {
    setSaveMessage(null);
    setSaveError(null);

    if (previewRows.length === 0) {
      setSaveError("No se ha detectado ningún registro válido en el archivo.");
      return;
    }

    if (!sessionDate) {
      setSaveError("Selecciona la fecha de la sesión antes de guardar.");
      return;
    }

    if (!sessionName.trim()) {
      setSaveError("Escribe un nombre para la sesión de tests.");
      return;
    }

    if (!context.trim()) {
      setSaveError("Escribe el contexto de la sesión.");
      return;
    }

    try {
      setIsSaving(true);

      const result = await createTestSessionWithResults({
        session_date: sessionDate,
        session_name: sessionName,
        context,
        notes,
        records: previewRows,
      });

      setSaveMessage(
        `Sesión de tests guardada correctamente. Resultados: ${result.insertedResults}. Puntuaciones: ${result.insertedScores}. Jugadores vinculados: ${result.matchedPlayers}. Sin vincular: ${result.unmatchedPlayers}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al guardar la sesión de tests.";

      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell
      title="Cargar tests físicos"
      subtitle="Importación de resultados de tests físicos desde CSV. La aplicación detecta jugador, bloque de test, variable, resultado y puntuación para guardar la sesión en Supabase."
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Tests
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Carga y previsualización de archivo
              </h2>

              <p className="mt-3 max-w-4xl break-words text-sm leading-6 text-slate-600">
                El CSV debe incluir, como mínimo, jugador, bloque/capacidad,
                variable/prueba y valor. Si incluye puntuación de variable, la
                app calculará automáticamente la puntuación final por capacidad.
              </p>
            </div>

            <label className="w-full cursor-pointer rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white shadow hover:bg-slate-800 md:w-auto md:shrink-0">
              Seleccionar CSV tests
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Archivo seleccionado:{" "}
            <span className="break-all font-bold">
              {selectedFilename ?? "ninguno"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard title="Registros válidos" value={summary.rows} />
            <SummaryCard title="Jugadores detectados" value={summary.players} />
            <SummaryCard title="Bloques/capacidades" value={summary.blocks} />
            <SummaryCard title="Variables" value={summary.variables} />
          </div>

          {rawRows.length > 0 && previewRows.length === 0 && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              El archivo se ha leído, pero no se ha detectado ningún registro
              válido. Revisa que existan columnas equivalentes a jugador,
              bloque/capacidad y variable/prueba.
            </div>
          )}

          {previewRows.length > 0 && (
            <>
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-black text-slate-950">
                  Datos de la sesión
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    Nombre de sesión
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(event) => setSessionName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                      placeholder="Ej. Tests pretemporada"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Contexto
                    <input
                      type="text"
                      value={context}
                      onChange={(event) => setContext(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                      placeholder="Ej. PRETEMPORADA"
                    />
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

                <button
                  type="button"
                  onClick={handleSaveSession}
                  disabled={isSaving}
                  className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSaving
                    ? "Guardando sesión de tests..."
                    : "Guardar sesión de tests en Supabase"}
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

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-black text-slate-950">
                    Previsualización de tests
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Revisa que los jugadores, bloques, variables y puntuaciones
                    se hayan leído correctamente antes de guardar.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {previewRows.map((row, index) => (
                    <article key={`${row.player_name}-${index}`} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-slate-950">
                            {row.player_name}
                          </p>

                          <p className="mt-1 break-words text-xs font-bold text-slate-500">
                            {row.position ?? "Sin posición"} · {row.test_block}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                          Test
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Variable
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-slate-950">
                          {row.variable}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Valor
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.value)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Unidad
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {row.unit ?? "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Puntuación
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatNumber(row.variable_score)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Clasificación
                          </p>
                          <p className="mt-1 break-words font-black text-slate-950">
                            {row.classification ?? "—"}
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
                        <th className="px-4 py-3">Bloque</th>
                        <th className="px-4 py-3">Variable</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Unidad</th>
                        <th className="px-4 py-3">Puntuación</th>
                        <th className="px-4 py-3">Clasificación</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-black">
                            {row.player_name}
                          </td>
                          <td className="px-4 py-3">{row.position ?? "—"}</td>
                          <td className="px-4 py-3">{row.test_block}</td>
                          <td className="px-4 py-3">{row.variable}</td>
                          <td className="px-4 py-3">
                            {formatNumber(row.value)}
                          </td>
                          <td className="px-4 py-3">{row.unit ?? "—"}</td>
                          <td className="px-4 py-3">
                            {formatNumber(row.variable_score)}
                          </td>
                          <td className="px-4 py-3">
                            {row.classification ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                Archivo de tests leído correctamente. Revisa la fecha, el
                contexto y el nombre de sesión antes de guardar en Supabase.
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}