export const SQUAT_VMP_TEST_ID = "VMP SENTADILLA";
export const SQUAT_VMP_TEST_NAME = "VMP SENTADILLA";
export const SQUAT_VMP_TEST_CATEGORY = "FUERZA";
export const SQUAT_VMP_DEVICE = "ADR ENCODER";
export const SQUAT_VMP_UNIT_LOAD = "kg";
export const SQUAT_VMP_UNIT_SPEED = "m/s";

export const SQUAT_VMP_VARIABLES = {
  LOAD: "VMP SENTADILLA CARGA",
  REPETITION_1: "VMP SENTADILLA REPETICION 1",
  MAXIMUM: "VMP SENTADILLA MAXIMA",
} as const;

export type SquatVmpFormState = {
  performedAt: string;
  loadKg: string;
  vmp: string;
  observations: string;
};

export type SquatVmpSummary = {
  loadKg: number | null;
  repetitionVmp: number | null;
  maximumVmp: number | null;
  observations: string;
};

export type SquatVmpResult = {
  variable: (typeof SQUAT_VMP_VARIABLES)[keyof typeof SQUAT_VMP_VARIABLES];
  value: number;
  unit: typeof SQUAT_VMP_UNIT_LOAD | typeof SQUAT_VMP_UNIT_SPEED;
};

export type SquatVmpValidationErrors = Partial<
  Record<"performedAt" | "loadKg" | "vmp", string>
>;

function normalizeSquatVmpNumber(value: string | number | null | undefined) {
  return String(value ?? "").trim().replace(",", ".");
}

export function parseSquatVmpNumber(
  value: string | number | null | undefined,
) {
  const normalized = normalizeSquatVmpNumber(value);

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateSquatMaximumVmp(
  vmp: string | number | null | undefined,
) {
  const parsed = parseSquatVmpNumber(vmp);

  return parsed !== null && parsed > 0 ? parsed : null;
}

export function createSquatVmpSummary(
  form: SquatVmpFormState,
): SquatVmpSummary {
  const loadKg = parseSquatVmpNumber(form.loadKg);
  const repetitionVmp = calculateSquatMaximumVmp(form.vmp);

  return {
    loadKg: loadKg !== null && loadKg > 0 ? loadKg : null,
    repetitionVmp,
    maximumVmp: repetitionVmp,
    observations: form.observations.trim(),
  };
}

export function validateSquatVmpForm(
  form: SquatVmpFormState,
): SquatVmpValidationErrors {
  const errors: SquatVmpValidationErrors = {};
  const loadKg = parseSquatVmpNumber(form.loadKg);
  const vmp = parseSquatVmpNumber(form.vmp);

  if (!form.performedAt) errors.performedAt = "La fecha del test es obligatoria.";
  if (loadKg === null) errors.loadKg = "Introduce una carga numérica.";
  else if (loadKg <= 0) errors.loadKg = "La carga debe ser mayor que 0.";
  if (vmp === null) errors.vmp = "Introduce una VMP numérica.";
  else if (vmp <= 0) errors.vmp = "La VMP debe ser mayor que 0.";

  return errors;
}

export function createSquatVmpResults(
  summary: SquatVmpSummary,
): SquatVmpResult[] {
  if (
    summary.loadKg === null ||
    summary.repetitionVmp === null ||
    summary.maximumVmp === null
  ) {
    return [];
  }

  return [
    { variable: SQUAT_VMP_VARIABLES.LOAD, value: summary.loadKg, unit: SQUAT_VMP_UNIT_LOAD },
    { variable: SQUAT_VMP_VARIABLES.REPETITION_1, value: summary.repetitionVmp, unit: SQUAT_VMP_UNIT_SPEED },
    { variable: SQUAT_VMP_VARIABLES.MAXIMUM, value: summary.maximumVmp, unit: SQUAT_VMP_UNIT_SPEED },
  ];
}
