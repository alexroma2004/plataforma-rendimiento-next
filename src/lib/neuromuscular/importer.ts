import type { NeuromuscularRecordInput } from "@/lib/supabase/neuromuscular";

type RawImportedRow = Record<string, unknown>;

export type NeuromuscularImportResult = {
  records: NeuromuscularRecordInput[];
  warnings: string[];
};

const PLAYER_ALIASES = [
  "jugador",
  "nombre",
  "nombre jugador",
  "player",
  "player name",
  "deportista",
];

const POSITION_ALIASES = [
  "posicion",
  "posición",
  "position",
  "demarcacion",
  "demarcación",
];

const VARIABLE_ALIASES = [
  "variable",
  "variables",
  "test",
  "metric",
  "métrica",
  "metrica",
];

const PRE_ALIASES = [
  "pre",
  "valor pre",
  "pre test",
  "inicial",
  "valor inicial",
];

const POST_ALIASES = [
  "post",
  "valor post",
  "post test",
  "final",
  "valor final",
];

const VALUE_ALIASES = [
  "valor",
  "value",
  "resultado",
  "result",
];

const CMJ_PRE_ALIASES = [
  "cmj pre",
  "cmj_pre",
  "pre cmj",
  "cmj inicial",
  "cmj_inicio",
];

const CMJ_POST_ALIASES = [
  "cmj post",
  "cmj_post",
  "post cmj",
  "cmj final",
  "cmj_fin",
];

const RSIMOD_PRE_ALIASES = [
  "rsi pre",
  "rsi_pre",
  "rsi mod pre",
  "rsimod pre",
  "rsi_mod_pre",
  "rsimod_pre",
  "rsi modificado pre",
  "rsi inicial",
];

const RSIMOD_POST_ALIASES = [
  "rsi post",
  "rsi_post",
  "rsi mod post",
  "rsimod post",
  "rsi_mod_post",
  "rsimod_post",
  "rsi modificado post",
  "rsi final",
];

const VMP_PRE_ALIASES = [
  "vmp pre",
  "vmp_pre",
  "pre vmp",
  "vmp inicial",
  "velocidad pre",
  "velocidad media propulsiva pre",
];

const VMP_POST_ALIASES = [
  "vmp post",
  "vmp_post",
  "post vmp",
  "vmp final",
  "velocidad post",
  "velocidad media propulsiva post",
];

const LOAD_ALIASES = [
  "carga",
  "carga sentadilla",
  "carga_sentadilla",
  "squat load",
  "squat_load_kg",
  "load",
  "kg",
];

const RPE_ALIASES = [
  "rpe",
  "srpe",
  "rpe pre",
  "rpe post",
  "fatiga",
  "fatiga percibida",
  "percepcion fatiga",
  "percepción fatiga",
];

const NOTES_ALIASES = [
  "observaciones",
  "observacion",
  "observación",
  "notes",
  "nota",
  "comentarios",
];

function compactText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizePlayerName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCell(row: RawImportedRow, aliases: string[]) {
  const normalizedAliases = aliases.map(compactText);

  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.includes(compactText(key))) {
      return value;
    }
  }

  return null;
}

function hasCell(row: RawImportedRow, aliases: string[]) {
  const value = getCell(row, aliases);

  return String(value ?? "").trim() !== "";
}

function isEmptyRow(row: RawImportedRow) {
  return Object.values(row).every((value) => String(value ?? "").trim() === "");
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!text) return null;

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function hasAnyMeasurement(record: NeuromuscularRecordInput) {
  return [
    record.cmj_pre,
    record.cmj_post,
    record.rsimod_pre,
    record.rsimod_post,
    record.vmp_pre,
    record.vmp_post,
    record.squat_load_kg,
    record.rpe,
  ].some((value) => value !== null && value !== undefined);
}

function classifyVariable(value: unknown) {
  const key = compactText(value);

  if (!key) return null;

  if (key.includes("cmj") || key.includes("countermovement")) {
    return "cmj";
  }

  if (
    key.includes("rsimod") ||
    key.includes("rsimodificado") ||
    key.includes("rsimodified") ||
    key === "rsi" ||
    key.includes("reactive")
  ) {
    return "rsimod";
  }

  if (
    key.includes("vmp") ||
    key.includes("velocidadmediapropulsiva") ||
    key.includes("meanpropulsivevelocity")
  ) {
    return "vmp";
  }

  if (
    key.includes("rpe") ||
    key.includes("srpe") ||
    key.includes("fatiga") ||
    key.includes("esfuerzo")
  ) {
    return "rpe";
  }

  if (
    key.includes("carga") ||
    key.includes("load") ||
    key.includes("kg") ||
    key.includes("sentadilla")
  ) {
    return "load";
  }

  return null;
}

function looksLikeBlockFormat(rows: RawImportedRow[]) {
  return rows.some((row) => {
    if (isEmptyRow(row)) return false;

    return (
      hasCell(row, VARIABLE_ALIASES) &&
      (hasCell(row, PRE_ALIASES) ||
        hasCell(row, POST_ALIASES) ||
        hasCell(row, VALUE_ALIASES))
    );
  });
}

function parseWideFormatRows(rows: RawImportedRow[]): NeuromuscularImportResult {
  const warnings: string[] = [];
  const records: NeuromuscularRecordInput[] = [];

  rows.forEach((row, index) => {
    if (isEmptyRow(row)) return;

    const playerName = toText(getCell(row, PLAYER_ALIASES));

    if (!playerName) {
      warnings.push(`Fila ${index + 2}: no se ha encontrado nombre de jugador.`);
      return;
    }

    const record: NeuromuscularRecordInput = {
      player_name: playerName,
      position: toText(getCell(row, POSITION_ALIASES)) || null,

      cmj_pre: toNumberOrNull(getCell(row, CMJ_PRE_ALIASES)),
      cmj_post: toNumberOrNull(getCell(row, CMJ_POST_ALIASES)),

      rsimod_pre: toNumberOrNull(getCell(row, RSIMOD_PRE_ALIASES)),
      rsimod_post: toNumberOrNull(getCell(row, RSIMOD_POST_ALIASES)),

      vmp_pre: toNumberOrNull(getCell(row, VMP_PRE_ALIASES)),
      vmp_post: toNumberOrNull(getCell(row, VMP_POST_ALIASES)),

      squat_load_kg: toNumberOrNull(getCell(row, LOAD_ALIASES)),
      rpe: toNumberOrNull(getCell(row, RPE_ALIASES)),

      notes: toText(getCell(row, NOTES_ALIASES)) || null,
    };

    if (!hasAnyMeasurement(record)) {
      warnings.push(
        `Fila ${index + 2}: ${playerName} no tiene ninguna variable neuromuscular válida.`,
      );
      return;
    }

    records.push(record);
  });

  return {
    records,
    warnings,
  };
}

function parseBlockFormatRows(rows: RawImportedRow[]): NeuromuscularImportResult {
  const warnings: string[] = [];
  const recordsByPlayer = new Map<string, NeuromuscularRecordInput>();
  let currentPlayerName = "";

  rows.forEach((row, index) => {
    if (isEmptyRow(row)) return;

    const explicitPlayerName = toText(getCell(row, PLAYER_ALIASES));

    if (explicitPlayerName) {
      currentPlayerName = explicitPlayerName;
    }

    if (!currentPlayerName) {
      warnings.push(`Fila ${index + 2}: no se ha podido asignar jugador.`);
      return;
    }

    const variable = classifyVariable(getCell(row, VARIABLE_ALIASES));

    if (!variable) return;

    const playerKey = normalizePlayerName(currentPlayerName);

    const existingRecord = recordsByPlayer.get(playerKey);

    const record: NeuromuscularRecordInput =
      existingRecord ??
      {
        player_name: currentPlayerName,
        position: toText(getCell(row, POSITION_ALIASES)) || null,
        cmj_pre: null,
        cmj_post: null,
        rsimod_pre: null,
        rsimod_post: null,
        vmp_pre: null,
        vmp_post: null,
        squat_load_kg: null,
        rpe: null,
        notes: null,
      };

    const position = toText(getCell(row, POSITION_ALIASES));

    if (position && !record.position) {
      record.position = position;
    }

    const notes = toText(getCell(row, NOTES_ALIASES));

    if (notes && !record.notes) {
      record.notes = notes;
    }

    const preValue = toNumberOrNull(getCell(row, PRE_ALIASES));
    const postValue = toNumberOrNull(getCell(row, POST_ALIASES));
    const singleValue = toNumberOrNull(getCell(row, VALUE_ALIASES));

    if (variable === "cmj") {
      if (preValue !== null) record.cmj_pre = preValue;
      if (postValue !== null) record.cmj_post = postValue;
      if (singleValue !== null && record.cmj_pre === null) {
        record.cmj_pre = singleValue;
      }
    }

    if (variable === "rsimod") {
      if (preValue !== null) record.rsimod_pre = preValue;
      if (postValue !== null) record.rsimod_post = postValue;
      if (singleValue !== null && record.rsimod_pre === null) {
        record.rsimod_pre = singleValue;
      }
    }

    if (variable === "vmp") {
      if (preValue !== null) record.vmp_pre = preValue;
      if (postValue !== null) record.vmp_post = postValue;
      if (singleValue !== null && record.vmp_pre === null) {
        record.vmp_pre = singleValue;
      }
    }

    if (variable === "rpe") {
      record.rpe = singleValue ?? postValue ?? preValue ?? record.rpe ?? null;
    }

    if (variable === "load") {
      record.squat_load_kg =
        singleValue ?? postValue ?? preValue ?? record.squat_load_kg ?? null;
    }

    recordsByPlayer.set(playerKey, record);
  });

  const records = Array.from(recordsByPlayer.values()).filter((record) => {
    if (hasAnyMeasurement(record)) {
      return true;
    }

    warnings.push(
      `${record.player_name}: no tiene ninguna variable neuromuscular válida.`,
    );

    return false;
  });

  return {
    records,
    warnings,
  };
}

export function parseNeuromuscularImportedRows(
  rows: RawImportedRow[],
): NeuromuscularImportResult {
  const cleanRows = rows.filter((row) => !isEmptyRow(row));

  if (cleanRows.length === 0) {
    return {
      records: [],
      warnings: ["El archivo no contiene filas válidas."],
    };
  }

  if (looksLikeBlockFormat(cleanRows)) {
    return parseBlockFormatRows(cleanRows);
  }

  return parseWideFormatRows(cleanRows);
}