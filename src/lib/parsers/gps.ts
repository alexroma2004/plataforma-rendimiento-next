export type GpsParsedRow = {
  player: string;
  playerName: string;
  player_name: string;

  normalizedName: string;
  normalized_name: string;

  position: string | null;
  session: string | null;
  task: string | null;
  tarea: string | null;

  microcycle: string | null;
  microcycleDay: string | null;
  md: string | null;

  isGoalkeeper: boolean;
  is_goalkeeper: boolean;

  timePlayed: number | null;
  time_played: number | null;

  totalDistance: number;
  totalDistanceM: number;
  total_distance: number;

  hsr: number;
  hsrM: number;

  sprintDistance: number;
  sprintDistanceM: number;
  distance_vrange6: number;

  sprints: number;

  num_acc: number;
  num_dec: number;
  accelerations: number;
  decelerations: number;

  raw?: Record<string, unknown>;
};

export type GpsSummary = {
  playersDetected: number;
  players: number;

  totalDistance: number;
  totalDistanceM: number;
  total_distance: number;

  averageDistanceM: number;
  averageDistance: number;

  totalHsr: number;
  totalHsrM: number;
  hsr: number;

  totalSprint: number;
  totalSprintDistanceM: number;
  distance_vrange6: number;

  totalSprints: number;
  sprints: number;

  totalAcc: number;
  num_acc: number;

  totalDec: number;
  num_dec: number;
};

export type ParsedGpsData = {
  rows: GpsParsedRow[];
  summary: GpsSummary;
  playersDetected: number;
  totalDistance: number;
  totalHsr: number;
  totalSprint: number;
  warnings: string[];
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

function normalizeName(value: string): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function detectDelimiter(headerLine: string): string {
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;

  return semicolonCount >= commaCount ? ";" : ",";
}

function parseNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  let text = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace("%", "");

  if (
    text === "" ||
    text === "-" ||
    text === "—" ||
    text.toLowerCase() === "nan" ||
    text.toLowerCase() === "null" ||
    text.toLowerCase() === "undefined"
  ) {
    return 0;
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
    text = text.replace(",", ".");
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function distanceToMeters(value: unknown): number {
  const n = parseNumber(value);

  /*
    En tus archivos GPS, columnas como:
    - total_distance
    - hsr
    - distance_vrange6

    suelen venir como kilómetros o decimales tipo:
    11,680 = 11.680 km = 11.680 m aprox.
    0,639 = 0.639 km = 639 m aprox.

    Por eso, si el valor es menor de 300, lo convertimos a metros.
    Si ya viniera en metros, por ejemplo 8218, no se multiplica.
  */
  if (Math.abs(n) > 0 && Math.abs(n) < 300) {
    return n * 1000;
  }

  return n;
}

function getValue(
  row: Record<string, unknown>,
  aliases: string[],
): unknown {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);

    if (Object.prototype.hasOwnProperty.call(row, normalizedAlias)) {
      return row[normalizedAlias];
    }
  }

  return undefined;
}

function getText(
  row: Record<string, unknown>,
  aliases: string[],
): string {
  const value = getValue(row, aliases);

  if (value === null || value === undefined) return "";

  return String(value).trim();
}

function parseCsvText(text: string): Record<string, unknown>[] {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function distanceFromGpsExportToMeters(value: unknown): number {
  const n = parseNumber(value);

  if (!Number.isFinite(n)) return 0;

  /*
    En los CSV GPS que estamos usando:
    - total_distance viene en km: 11,680 = 11.680 m
    - hsr viene en km: 0,639 = 639 m
    - distance_vrange6 viene en km: 0,190 = 190 m

    Por eso multiplicamos por 1000.
  */
  return Math.round(n * 1000);
}

function buildParsedRow(rawRow: Record<string, unknown>): GpsParsedRow | null {
  const player =
    getText(rawRow, [
      "player",
      "jugador",
      "player_name",
      "nombre",
      "name",
      "athlete",
      "deportista",
    ]) || "";

  if (!player) return null;

  const position =
    getText(rawRow, ["position", "posicion", "posición", "demarcacion"]) ||
    null;

  const session =
    getText(rawRow, ["session", "sesion", "sesión", "session_name"]) ||
    null;

  const task =
    getText(rawRow, ["task", "tarea", "drill", "ejercicio"]) ||
    null;

  const microcycle =
    getText(rawRow, [
      "md",
      "microcycle",
      "microciclo",
      "microcycle_day",
      "dia_microciclo",
      "día_microciclo",
    ]) || null;

  const timePlayedRaw = getValue(rawRow, [
    "time",
    "time_played",
    "minutes",
    "minutos",
    "duration",
    "duracion",
    "duración",
  ]);

  const totalDistanceM = distanceFromGpsExportToMeters(
    getValue(rawRow, [
      "total_distance",
      "distancia_total",
      "distance",
      "distancia",
      "totaldistance",
    ]),
  );

  const hsrM = distanceFromGpsExportToMeters(
    getValue(rawRow, [
      "hsr",
      "high_speed_running",
      "distancia_hsr",
      "hsr_distance",
    ]),
  );

  const sprintDistanceM = distanceFromGpsExportToMeters(
    getValue(rawRow, [
      "distance_vrange6",
      "sprint_distance",
      "distancia_sprint",
      "sprint",
      "sprint_dist",
    ]),
  );

  const sprints = parseNumber(
    getValue(rawRow, ["sprints", "num_sprints", "n_sprints", "sprint_count"]),
  );

  const numAcc = parseNumber(
    getValue(rawRow, [
      "num_acc",
      "acc",
      "accelerations",
      "aceleraciones",
      "n_acc",
    ]),
  );

  const numDec = parseNumber(
    getValue(rawRow, [
      "num_dec",
      "dec",
      "decelerations",
      "deceleraciones",
      "n_dec",
    ]),
  );

  const normalized = normalizeName(player);
  const isGoalkeeper =
    position?.toLowerCase().includes("goalkeeper") ||
    position?.toLowerCase().includes("portero") ||
    position?.toLowerCase() === "gk" ||
    false;

  return {
    player,
    playerName: player,
    player_name: player,

    normalizedName: normalized,
    normalized_name: normalized,

    position,
    session,
    task,
    tarea: task,

    microcycle,
    microcycleDay: microcycle,
    md: microcycle,

    isGoalkeeper,
    is_goalkeeper: isGoalkeeper,

    timePlayed: timePlayedRaw ? parseNumber(timePlayedRaw) : null,
    time_played: timePlayedRaw ? parseNumber(timePlayedRaw) : null,

    totalDistance: totalDistanceM,
    totalDistanceM,
    total_distance: totalDistanceM,

    hsr: hsrM,
    hsrM,

    sprintDistance: sprintDistanceM,
    sprintDistanceM,
    distance_vrange6: sprintDistanceM,

    sprints,

    num_acc: numAcc,
    num_dec: numDec,
    accelerations: numAcc,
    decelerations: numDec,

    raw: rawRow,
  };
}

export function parseGpsRows(
  rawRows: Record<string, unknown>[],
): GpsParsedRow[] {
  const grouped = new Map<string, GpsParsedRow>();

  for (const rawRow of rawRows) {
    const parsed = buildParsedRow(rawRow);
    if (!parsed) continue;

    const key = parsed.normalized_name;

    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, parsed);
      continue;
    }

    existing.totalDistance += parsed.totalDistance;
    existing.totalDistanceM += parsed.totalDistanceM;
    existing.total_distance += parsed.total_distance;

    existing.hsr += parsed.hsr;
    existing.hsrM += parsed.hsrM;

    existing.sprintDistance += parsed.sprintDistance;
    existing.sprintDistanceM += parsed.sprintDistanceM;
    existing.distance_vrange6 += parsed.distance_vrange6;

    existing.sprints += parsed.sprints;

    existing.num_acc += parsed.num_acc;
    existing.num_dec += parsed.num_dec;
    existing.accelerations += parsed.accelerations;
    existing.decelerations += parsed.decelerations;

    if (!existing.position && parsed.position) existing.position = parsed.position;
    if (!existing.session && parsed.session) existing.session = parsed.session;
    if (!existing.task && parsed.task) existing.task = parsed.task;
    if (!existing.tarea && parsed.tarea) existing.tarea = parsed.tarea;
    if (!existing.microcycle && parsed.microcycle) existing.microcycle = parsed.microcycle;
    if (!existing.microcycleDay && parsed.microcycleDay) existing.microcycleDay = parsed.microcycleDay;
    if (!existing.md && parsed.md) existing.md = parsed.md;

    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.player.localeCompare(b.player),
  );
}

export function getGpsSummary(rows: GpsParsedRow[]): GpsSummary {
  const playersDetected = rows.length;

  const totalDistanceM = rows.reduce(
    (sum, row) => sum + row.totalDistanceM,
    0,
  );

  const totalHsrM = rows.reduce(
    (sum, row) => sum + row.hsrM,
    0,
  );

  const totalSprintDistanceM = rows.reduce(
    (sum, row) => sum + row.sprintDistanceM,
    0,
  );

  const totalSprints = rows.reduce(
    (sum, row) => sum + row.sprints,
    0,
  );

  const totalAcc = rows.reduce(
    (sum, row) => sum + row.num_acc,
    0,
  );

  const totalDec = rows.reduce(
    (sum, row) => sum + row.num_dec,
    0,
  );

  const averageDistanceM =
    playersDetected > 0 ? totalDistanceM / playersDetected : 0;

  return {
    playersDetected,
    players: playersDetected,

    totalDistance: totalDistanceM,
    totalDistanceM,
    total_distance: totalDistanceM,

    averageDistanceM,
    averageDistance: averageDistanceM,

    totalHsr: totalHsrM,
    totalHsrM,
    hsr: totalHsrM,

    totalSprint: totalSprintDistanceM,
    totalSprintDistanceM,
    distance_vrange6: totalSprintDistanceM,

    totalSprints,
    sprints: totalSprints,

    totalAcc,
    num_acc: totalAcc,

    totalDec,
    num_dec: totalDec,
  };
}

export function parseGpsCsv(text: string): ParsedGpsData {
  const rawRows = parseCsvText(text);
  const rows = parseGpsRows(rawRows);
  const summary = getGpsSummary(rows);

  const warnings: string[] = [];

  if (rawRows.length === 0) {
    warnings.push("El archivo no contiene filas válidas.");
  }

  if (rows.length === 0 && rawRows.length > 0) {
    warnings.push(
      "El archivo se ha leído, pero no se han detectado jugadores. Revisa la columna player/jugador.",
    );
  }

  return {
    rows,
    summary,
    playersDetected: summary.playersDetected,
    totalDistance: summary.totalDistance,
    totalHsr: summary.totalHsr,
    totalSprint: summary.totalSprint,
    warnings,
  };
}

export async function parseGpsFile(file: File): Promise<ParsedGpsData> {
  const text = await file.text();
  return parseGpsCsv(text);
}

/*
  Alias de compatibilidad.
  Así evitamos errores si algún componente antiguo importa el parser
  con otro nombre.
*/
export const parseGps = parseGpsFile;
export const parseGpsCsvFile = parseGpsFile;
export const parseGpsText = parseGpsCsv;
function normalizeGpsText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeGpsName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function parseSpanishNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  const raw = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const n = Number(raw);

  return Number.isFinite(n) ? n : 0;
}

function kmToMeters(value: unknown): number {
  return Math.round(parseSpanishNumber(value) * 1000);
}

function countNumber(value: unknown): number {
  return Math.round(parseSpanishNumber(value));
}

function getGpsCell(row: Record<string, unknown>, possibleKeys: string[]): unknown {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }

  return "";
}