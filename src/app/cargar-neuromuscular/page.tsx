"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  createNeuromuscularSessionWithRecords,
  type NeuromuscularRecordInput,
} from "@/lib/supabase/neuromuscular";

type ManualRecordForm = {
  player_name: string;
  position: string;
  cmj_pre: string;
  rsimod_pre: string;
  vmp_pre: string;
  cmj_post: string;
  rsimod_post: string;
  vmp_post: string;
  squat_load_kg: string;
  rpe: string;
  notes: string;
};

const emptyManualForm: ManualRecordForm = {
  player_name: "",
  position: "",
  cmj_pre: "",
  rsimod_pre: "",
  vmp_pre: "",
  cmj_post: "",
  rsimod_post: "",
  vmp_post: "",
  squat_load_kg: "",
  rpe: "",
  notes: "",
};

const microcycleOptions = ["MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1"];

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-./]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");
}

function toNumberOrNull(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  if (!text) return null;

  const normalized = text.replace(",", ".");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function formatCellNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return Number(value).toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
}

function detectDelimiter(headerLine: string) {
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const tabCount = (headerLine.match(/\t/g) ?? []).length;

  if (tabCount > semicolonCount && tabCount > commaCount) return "\t";
  if (semicolonCount >= commaCount) return ";";

  return ",";
}

function parseDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values;
}

const headerAliases = {
  player_name: [
    "jugador",
    "nombre",
    "nombre_jugador",
    "player",
    "player_name",
    "playername",
  ],
  position: ["posicion", "position", "demarcacion", "puesto"],
  cmj_pre: [
    "cmj_pre",
    "cmj_inicial",
    "cmj_inicio",
    "cmj_pre_cm",
    "cmj",
  ],
  rsimod_pre: [
    "rsimod_pre",
    "rsi_pre",
    "rsi_mod_pre",
    "rsi_modificado_pre",
    "rsimod_inicial",
    "rsi_inicial",
  ],
  vmp_pre: [
    "vmp_pre",
    "vmp_inicial",
    "vmp_inicio",
    "velocidad_pre",
    "velocidad_inicial",
  ],
  cmj_post: ["cmj_post", "cmj_final", "cmj_fin", "cmj_post_cm"],
  rsimod_post: [
    "rsimod_post",
    "rsi_post",
    "rsi_mod_post",
    "rsi_modificado_post",
    "rsimod_final",
    "rsi_final",
  ],
  vmp_post: [
    "vmp_post",
    "vmp_final",
    "vmp_fin",
    "velocidad_post",
    "velocidad_final",
  ],
  squat_load_kg: [
    "squat_load_kg",
    "carga_sentadilla",
    "carga",
    "kg",
    "carga_kg",
    "load",
  ],
  rpe: [
    "rpe",
    "srpe",
    "fatiga",
    "fatiga_percibida",
    "percepcion_fatiga",
    "percepcion_subjetiva_fatiga",
  ],
  notes: ["notes", "nota", "notas", "observaciones"],
};

function getValueFromRow(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);

    if (row[normalizedAlias] !== undefined) {
      return row[normalizedAlias];
    }
  }

  return "";
}

function parseNeuromuscularCsv(text: string): NeuromuscularRecordInput[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(
      "El archivo debe tener una fila de encabezados y al menos una fila de datos.",
    );
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter).map(normalizeHeader);

  const records: NeuromuscularRecordInput[] = [];

  for (const line of lines.slice(1)) {
    const values = parseDelimitedLine(line, delimiter);

    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    const playerName = getValueFromRow(row, headerAliases.player_name).trim();

    if (!playerName) continue;

    records.push({
      player_name: playerName,
      position: getValueFromRow(row, headerAliases.position).trim() || null,
      cmj_pre: toNumberOrNull(getValueFromRow(row, headerAliases.cmj_pre)),
      rsimod_pre: toNumberOrNull(
        getValueFromRow(row, headerAliases.rsimod_pre),
      ),
      vmp_pre: toNumberOrNull(getValueFromRow(row, headerAliases.vmp_pre)),
      cmj_post: toNumberOrNull(getValueFromRow(row, headerAliases.cmj_post)),
      rsimod_post: toNumberOrNull(
        getValueFromRow(row, headerAliases.rsimod_post),
      ),
      vmp_post: toNumberOrNull(getValueFromRow(row, headerAliases.vmp_post)),
      squat_load_kg: toNumberOrNull(
        getValueFromRow(row, headerAliases.squat_load_kg),
      ),
      rpe: toNumberOrNull(getValueFromRow(row, headerAliases.rpe)),
      notes: getValueFromRow(row, headerAliases.notes).trim() || null,
    });
  }

  if (records.length === 0) {
    throw new Error("No se ha encontrado ningún jugador válido en el archivo.");
  }

  return records;
}

function buildManualRecord(form: ManualRecordForm): NeuromuscularRecordInput {
  return {
    player_name: form.player_name.trim(),
    position: form.position.trim() || null,
    cmj_pre: toNumberOrNull(form.cmj_pre),
    rsimod_pre: toNumberOrNull(form.rsimod_pre),
    vmp_pre: toNumberOrNull(form.vmp_pre),
    cmj_post: toNumberOrNull(form.cmj_post),
    rsimod_post: toNumberOrNull(form.rsimod_post),
    vmp_post: toNumberOrNull(form.vmp_post),
    squat_load_kg: toNumberOrNull(form.squat_load_kg),
    rpe: toNumberOrNull(form.rpe),
    notes: form.notes.trim() || null,
  };
}

type NeuromuscularNumberKey =
  | "cmj_pre"
  | "cmj_post"
  | "rsimod_pre"
  | "rsimod_post"
  | "vmp_pre"
  | "vmp_post"
  | "squat_load_kg"
  | "rpe";

function normalizeCsvText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\-./()]+/g, " ")
    .replace(/\s+/g, " ");
}

function parseCsvNumber(value: unknown): number | null {
  const raw = String(value ?? "").trim();

  if (!raw || raw === "-" || raw === "—") return null;

  const cleaned = raw
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function detectCsvDelimiter(lines: string[]) {
  const firstLines = lines.slice(0, 5).join("\n");

  const candidates = [";", ",", "\t"];

  return candidates
    .map((delimiter) => ({
      delimiter,
      count: firstLines.split(delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  if (result.length === 1 && result[0].includes(delimiter)) {
    return splitCsvLine(result[0], delimiter);
  }

  return result;
}

function findColumn(headers: string[], aliases: string[]) {
  const normalizedHeaders = headers.map(normalizeCsvText);
  const normalizedAliases = aliases.map(normalizeCsvText);

  const exactIndex = normalizedHeaders.findIndex((header) =>
    normalizedAliases.includes(header),
  );

  if (exactIndex !== -1) return exactIndex;

  return normalizedHeaders.findIndex((header) =>
    normalizedAliases.some((alias) => header.includes(alias)),
  );
}

function getCell(row: string[], index: number) {
  if (index < 0) return "";
  return row[index] ?? "";
}

function setNumberValue(
  record: NeuromuscularRecordInput,
  key: NeuromuscularNumberKey,
  value: number | null,
) {
  if (value === null) return;

  record[key] = value;
}

function hasAnyNeuromuscularValue(record: NeuromuscularRecordInput) {
  return (
    record.cmj_pre !== undefined ||
    record.cmj_post !== undefined ||
    record.rsimod_pre !== undefined ||
    record.rsimod_post !== undefined ||
    record.vmp_pre !== undefined ||
    record.vmp_post !== undefined ||
    record.squat_load_kg !== undefined ||
    record.rpe !== undefined
  );
}

function getOrCreateNeuromuscularRecord(
  recordsMap: Map<string, NeuromuscularRecordInput>,
  playerName: string,
  position?: string | null,
) {
  const normalizedName = normalizeCsvText(playerName);

  const existing = recordsMap.get(normalizedName);

  if (existing) return existing;

  const record: NeuromuscularRecordInput = {
    player_name: playerName.trim(),
    position: position ?? null,
  };

  recordsMap.set(normalizedName, record);

  return record;
}

function getMetricKeysFromVariable(variable: string): {
  pre?: NeuromuscularNumberKey;
  post?: NeuromuscularNumberKey;
  single?: NeuromuscularNumberKey;
} | null {
  const normalized = normalizeCsvText(variable);

  if (normalized.includes("cmj")) {
    return {
      pre: "cmj_pre",
      post: "cmj_post",
    };
  }

  if (
    normalized.includes("rsi") ||
    normalized.includes("rsimod") ||
    normalized.includes("rsi mod")
  ) {
    return {
      pre: "rsimod_pre",
      post: "rsimod_post",
    };
  }

  if (
    normalized.includes("vmp") ||
    normalized.includes("velocidad") ||
    normalized.includes("fuerza aplicada")
  ) {
    return {
      pre: "vmp_pre",
      post: "vmp_post",
    };
  }

  if (
    normalized.includes("carga") ||
    normalized.includes("sentadilla") ||
    normalized.includes("load")
  ) {
    return {
      single: "squat_load_kg",
    };
  }

  if (
    normalized.includes("rpe") ||
    normalized.includes("fatiga") ||
    normalized.includes("percepcion")
  ) {
    return {
      single: "rpe",
    };
  }

  return null;
}

async function parseNeuromuscularCsvFile(
  file: File,
): Promise<NeuromuscularRecordInput[]> {
  const text = (await file.text()).replace(/^\uFEFF/, "");

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectCsvDelimiter(lines);

  const rows = lines.map((line) => splitCsvLine(line, delimiter));

  const headers = rows[0];

  const nameColumn = findColumn(headers, [
    "jugador",
    "nombre",
    "nombre jugador",
    "player",
    "player name",
  ]);

  const positionColumn = findColumn(headers, [
    "posicion",
    "posición",
    "position",
    "demarcacion",
    "demarcación",
  ]);

  const variableColumn = findColumn(headers, [
    "variable",
    "variables",
    "metrica",
    "métrica",
    "test",
  ]);

  const preColumn = findColumn(headers, [
    "pre",
    "valor pre",
    "inicial",
    "valor inicial",
  ]);

  const postColumn = findColumn(headers, [
    "post",
    "valor post",
    "final",
    "valor final",
  ]);

  const recordsMap = new Map<string, NeuromuscularRecordInput>();

  const isBlockFormat =
    nameColumn !== -1 &&
    variableColumn !== -1 &&
    (preColumn !== -1 || postColumn !== -1);

  if (isBlockFormat) {
    let currentPlayerName = "";
    let currentPosition: string | null = null;

    for (const row of rows.slice(1)) {
      const playerNameFromRow = getCell(row, nameColumn).trim();

      if (playerNameFromRow) {
        currentPlayerName = playerNameFromRow;
        currentPosition =
          positionColumn !== -1 ? getCell(row, positionColumn) : null;
      }

      if (!currentPlayerName) continue;

      const variable = getCell(row, variableColumn);
      const metricKeys = getMetricKeysFromVariable(variable);

      if (!metricKeys) continue;

      const record = getOrCreateNeuromuscularRecord(
        recordsMap,
        currentPlayerName,
        currentPosition,
      );

      const preValue = parseCsvNumber(getCell(row, preColumn));
      const postValue = parseCsvNumber(getCell(row, postColumn));

      if (metricKeys.pre) {
        setNumberValue(record, metricKeys.pre, preValue);
      }

      if (metricKeys.post) {
        setNumberValue(record, metricKeys.post, postValue);
      }

      if (metricKeys.single) {
        setNumberValue(record, metricKeys.single, postValue ?? preValue);
      }
    }

    return Array.from(recordsMap.values()).filter(
      (record) => record.player_name && hasAnyNeuromuscularValue(record),
    );
  }

  const cmjPreColumn = findColumn(headers, [
    "cmj pre",
    "cmj_pre",
    "pre cmj",
    "cmj inicial",
  ]);

  const cmjPostColumn = findColumn(headers, [
    "cmj post",
    "cmj_post",
    "post cmj",
    "cmj final",
  ]);

  const cmjSingleColumn =
    cmjPreColumn === -1 && cmjPostColumn === -1
      ? findColumn(headers, ["cmj"])
      : -1;

  const rsimodPreColumn = findColumn(headers, [
    "rsi pre",
    "rsi_pre",
    "rsimod pre",
    "rsimod_pre",
    "rsi mod pre",
    "rsi modificado pre",
    "rsi inicial",
    "rsimod inicial",
  ]);

  const rsimodPostColumn = findColumn(headers, [
    "rsi post",
    "rsi_post",
    "rsimod post",
    "rsimod_post",
    "rsi mod post",
    "rsi modificado post",
    "rsi final",
    "rsimod final",
  ]);

  const rsimodSingleColumn =
    rsimodPreColumn === -1 && rsimodPostColumn === -1
      ? findColumn(headers, ["rsi", "rsimod", "rsi mod", "rsi modificado"])
      : -1;

  const vmpPreColumn = findColumn(headers, [
    "vmp pre",
    "vmp_pre",
    "pre vmp",
    "vmp inicial",
    "velocidad pre",
  ]);

  const vmpPostColumn = findColumn(headers, [
    "vmp post",
    "vmp_post",
    "post vmp",
    "vmp final",
    "velocidad post",
  ]);

  const vmpSingleColumn =
    vmpPreColumn === -1 && vmpPostColumn === -1
      ? findColumn(headers, ["vmp", "velocidad", "fuerza aplicada"])
      : -1;

  const squatLoadColumn = findColumn(headers, [
    "carga sentadilla",
    "carga",
    "kg",
    "load",
    "squat load",
    "squat_load_kg",
  ]);

  const rpeColumn = findColumn(headers, [
    "rpe",
    "srpe",
    "fatiga",
    "percepcion",
    "percepción",
    "sensacion fatiga",
    "sensación fatiga",
  ]);

  if (nameColumn === -1) return [];

  for (const row of rows.slice(1)) {
    const playerName = getCell(row, nameColumn).trim();

    if (!playerName) continue;

    const record: NeuromuscularRecordInput = {
      player_name: playerName,
      position: positionColumn !== -1 ? getCell(row, positionColumn) || null : null,

      cmj_pre: parseCsvNumber(
        getCell(row, cmjPreColumn !== -1 ? cmjPreColumn : cmjSingleColumn),
      ),
      cmj_post: parseCsvNumber(getCell(row, cmjPostColumn)),

      rsimod_pre: parseCsvNumber(
        getCell(
          row,
          rsimodPreColumn !== -1 ? rsimodPreColumn : rsimodSingleColumn,
        ),
      ),
      rsimod_post: parseCsvNumber(getCell(row, rsimodPostColumn)),

      vmp_pre: parseCsvNumber(
        getCell(row, vmpPreColumn !== -1 ? vmpPreColumn : vmpSingleColumn),
      ),
      vmp_post: parseCsvNumber(getCell(row, vmpPostColumn)),

      squat_load_kg: parseCsvNumber(getCell(row, squatLoadColumn)),
      rpe: parseCsvNumber(getCell(row, rpeColumn)),
    };

    if (hasAnyNeuromuscularValue(record)) {
      recordsMap.set(normalizeCsvText(playerName), record);
    }
  }

  return Array.from(recordsMap.values()).filter(
    (record) => record.player_name && hasAnyNeuromuscularValue(record),
  );
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

export default function CargarNeuromuscularPage() {
  const [sessionDate, setSessionDate] = useState(getTodayInputDate());
  const [microcycle, setMicrocycle] = useState("MD-1");
  const [sessionName, setSessionName] = useState("Control neuromuscular");
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);

  const [records, setRecords] = useState<NeuromuscularRecordInput[]>([]);
  const [manualForm, setManualForm] =
    useState<ManualRecordForm>(emptyManualForm);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    const total = records.length;

    const withCmj = records.filter(
      (record) => record.cmj_pre !== null || record.cmj_post !== null,
    ).length;

    const withRsimod = records.filter(
      (record) => record.rsimod_pre !== null || record.rsimod_post !== null,
    ).length;

    const withVmp = records.filter(
      (record) => record.vmp_pre !== null || record.vmp_post !== null,
    ).length;

    const withRpe = records.filter((record) => record.rpe !== null).length;

    return {
      total,
      withCmj,
      withRsimod,
      withVmp,
      withRpe,
    };
  }, [records]);

  async function handleFileUpload(file: File | null) {
    if (!file) return;

    try {
      setError(null);
      setSuccessMessage(null);

      const parsedRecords = await parseNeuromuscularCsvFile(file);

      setSourceFilename(file.name);
      setRecords(parsedRecords);
      setSuccessMessage(
        `Archivo cargado correctamente. Registros detectados: ${parsedRecords.length}.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al leer el archivo.";

      setError(message);
      setSuccessMessage(null);
    }
  }

  function handleAddManualRecord() {
    try {
      setError(null);
      setSuccessMessage(null);

      if (!manualForm.player_name.trim()) {
        throw new Error("El nombre del jugador es obligatorio.");
      }

      const newRecord = buildManualRecord(manualForm);

      setRecords((currentRecords) => [...currentRecords, newRecord]);
      setManualForm(emptyManualForm);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al añadir el registro.";

      setError(message);
    }
  }

  function handleRemoveRecord(indexToRemove: number) {
    setRecords((currentRecords) =>
      currentRecords.filter((_, index) => index !== indexToRemove),
    );
  }

  async function handleSaveSession() {
    if (records.length === 0) {
      setError("No hay registros para guardar.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createNeuromuscularSessionWithRecords({
        session_date: sessionDate,
        microcycle,
        session_name: sessionName,
        source_filename: sourceFilename,
        records,
      });

      const matchedPlayers = result.records.filter(
        (record) => record.player_id !== null,
      ).length;

      const unmatchedPlayers = result.records.length - matchedPlayers;

      setSuccessMessage(
        `Sesión guardada correctamente. Registros insertados: ${result.records.length}. Jugadores vinculados: ${matchedPlayers}. Sin vincular: ${unmatchedPlayers}.`,
      );

      setRecords([]);
      setSourceFilename(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar la sesión neuromuscular.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Cargar control neuromuscular"
      subtitle="Importa o introduce manualmente los datos de CMJ, RSI modificado, VMP, carga de sentadilla y RPE. Al guardar, la sesión se vincula automáticamente con el equipo y los jugadores existentes."
    >
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="text-sm font-bold text-slate-700">
              Fecha
              <input
                type="date"
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Microciclo
              <select
                value={microcycle}
                onChange={(event) => setMicrocycle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                {microcycleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700 md:col-span-2">
              Nombre de la sesión
              <input
                type="text"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Control neuromuscular"
              />
            </label>
          </div>

          {error && (
  <div className="mt-6">
    <StatusMessage variant="error" title="Error en la carga neuromuscular">
      {error}
    </StatusMessage>
  </div>
)}

{successMessage && (
  <div className="mt-6">
    <StatusMessage variant="success" title="Operación completada">
      {successMessage}
    </StatusMessage>
  </div>
)}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
              Importación
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
              Cargar archivo CSV
            </h2>

            <p className="mt-2 break-words text-sm leading-6 text-slate-600">
              Sube un CSV separado por punto y coma. La app reconoce columnas
              como Jugador, Posición, CMJ pre, CMJ post, RSI mod pre, RSI mod
              post, VMP pre, VMP post, Carga y RPE.
            </p>

            <label className="mt-5 block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center sm:p-6">
              <span className="text-sm font-black text-slate-700">
                Seleccionar CSV
              </span>

              <input
                type="file"
                accept=".csv,.txt"
                onChange={(event) =>
                  handleFileUpload(event.target.files?.[0] ?? null)
                }
                className="mt-4 block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
              />
            </label>

            {sourceFilename && (
              <p className="mt-4 break-all text-sm font-bold text-slate-600">
                Archivo cargado: {sourceFilename}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
              Entrada manual
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
              Añadir jugador
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="text"
                value={manualForm.player_name}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    player_name: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Jugador"
              />

              <input
                type="text"
                value={manualForm.position}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    position: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Posición"
              />

              <input
                type="text"
                value={manualForm.cmj_pre}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    cmj_pre: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="CMJ pre"
              />

              <input
                type="text"
                value={manualForm.cmj_post}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    cmj_post: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="CMJ post"
              />

              <input
                type="text"
                value={manualForm.rsimod_pre}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    rsimod_pre: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="RSI mod pre"
              />

              <input
                type="text"
                value={manualForm.rsimod_post}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    rsimod_post: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="RSI mod post"
              />

              <input
                type="text"
                value={manualForm.vmp_pre}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    vmp_pre: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="VMP pre"
              />

              <input
                type="text"
                value={manualForm.vmp_post}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    vmp_post: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="VMP post"
              />

              <input
                type="text"
                value={manualForm.squat_load_kg}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    squat_load_kg: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Carga sentadilla kg"
              />

              <input
                type="text"
                value={manualForm.rpe}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    rpe: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="RPE"
              />

              <input
                type="text"
                value={manualForm.notes}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 md:col-span-2"
                placeholder="Observaciones"
              />
            </div>

            <button
              type="button"
              onClick={handleAddManualRecord}
              className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow hover:bg-slate-800"
            >
              Añadir registro
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Registros preparados
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                Vista previa antes de guardar
              </h2>

              <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                Comprueba que los datos son correctos antes de insertarlos en
                Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSession}
              disabled={loading || records.length === 0}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 md:w-auto md:shrink-0"
            >
              {loading ? "Guardando..." : "Guardar sesión"}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <SummaryCard title="Registros" value={summary.total} />
            <SummaryCard title="Con CMJ" value={summary.withCmj} />
            <SummaryCard title="Con RSI mod" value={summary.withRsimod} />
            <SummaryCard title="Con VMP" value={summary.withVmp} />
            <SummaryCard title="Con RPE" value={summary.withRpe} />
          </div>

          {records.length === 0 ? (
  <div className="mt-6">
    <StatusMessage variant="warning" title="Sin registros preparados">
      Todavía no hay registros preparados. Carga un CSV o añade jugadores de
      forma manual antes de guardar la sesión.
    </StatusMessage>
  </div>
) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="divide-y divide-slate-100 md:hidden">
                {records.map((record, index) => (
                  <article key={`${record.player_name}-${index}`} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-black text-slate-950">
                          {record.player_name}
                        </p>

                        <p className="mt-1 break-words text-xs font-bold text-slate-500">
                          {record.position ?? "Sin posición"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRecord(index)}
                        className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          CMJ pre
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatCellNumber(record.cmj_pre)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          CMJ post
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatCellNumber(record.cmj_post)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          RSI pre
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatCellNumber(record.rsimod_pre)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          RSI post
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatCellNumber(record.rsimod_post)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          VMP pre
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatCellNumber(record.vmp_pre)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          VMP post
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatCellNumber(record.vmp_post)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Carga
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatCellNumber(record.squat_load_kg)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          RPE
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatCellNumber(record.rpe)}
                        </p>
                      </div>
                    </div>

                    {record.notes && (
                      <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Observaciones
                        </p>

                        <p className="mt-1 break-words text-sm font-bold text-slate-700">
                          {record.notes}
                        </p>
                      </div>
                    )}
                  </article>
                ))}
              </div>

              <div className="hidden max-h-[520px] overflow-auto md:block">
                <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Jugador</th>
                      <th className="px-4 py-3">Posición</th>
                      <th className="px-4 py-3">CMJ pre</th>
                      <th className="px-4 py-3">CMJ post</th>
                      <th className="px-4 py-3">RSI pre</th>
                      <th className="px-4 py-3">RSI post</th>
                      <th className="px-4 py-3">VMP pre</th>
                      <th className="px-4 py-3">VMP post</th>
                      <th className="px-4 py-3">Carga</th>
                      <th className="px-4 py-3">RPE</th>
                      <th className="px-4 py-3">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {records.map((record, index) => (
                      <tr
                        key={`${record.player_name}-${index}`}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-black">
                          {record.player_name}
                        </td>

                        <td className="px-4 py-3">{record.position ?? "—"}</td>

                        <td className="px-4 py-3">
                          {formatCellNumber(record.cmj_pre)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCellNumber(record.cmj_post)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCellNumber(record.rsimod_pre)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCellNumber(record.rsimod_post)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCellNumber(record.vmp_pre)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCellNumber(record.vmp_post)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCellNumber(record.squat_load_kg)}
                        </td>

                        <td className="px-4 py-3">
                          {formatCellNumber(record.rpe)}
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveRecord(index)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}