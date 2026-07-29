export const HIP_THRUST_VMP_TEST_ID = "VMP HIP THRUST";
export const HIP_THRUST_VMP_TEST_NAME = "VMP HIP THRUST";
export const HIP_THRUST_VMP_TEST_CATEGORY = "FUERZA";
export const HIP_THRUST_VMP_DEVICE = "ADR ENCODER";
export const HIP_THRUST_VMP_UNIT_LOAD = "kg";
export const HIP_THRUST_VMP_UNIT_SPEED = "m/s";
export const HIP_THRUST_VMP_VARIABLES = { LOAD: "VMP HIP THRUST CARGA", REPETITION_1: "VMP HIP THRUST REPETICION 1", MAXIMUM: "VMP HIP THRUST MAXIMA" } as const;

export type HipThrustVmpFormState = { performedAt: string; loadKg: string; vmp: string; observations: string };
export type HipThrustVmpSummary = { loadKg: number | null; repetitionVmp: number | null; maximumVmp: number | null; observations: string };
export type HipThrustVmpResult = { variable: (typeof HIP_THRUST_VMP_VARIABLES)[keyof typeof HIP_THRUST_VMP_VARIABLES]; value: number; unit: typeof HIP_THRUST_VMP_UNIT_LOAD | typeof HIP_THRUST_VMP_UNIT_SPEED };
export type HipThrustVmpValidationErrors = Partial<Record<"performedAt" | "loadKg" | "vmp", string>>;

export function parseHipThrustVmpNumber(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateHipThrustMaximumVmp(value: string | number | null | undefined) {
  const vmp = parseHipThrustVmpNumber(value);
  return vmp !== null && vmp > 0 ? vmp : null;
}

export function createHipThrustVmpSummary(form: HipThrustVmpFormState): HipThrustVmpSummary {
  const loadKg = parseHipThrustVmpNumber(form.loadKg);
  const repetitionVmp = calculateHipThrustMaximumVmp(form.vmp);
  return { loadKg: loadKg !== null && loadKg > 0 ? loadKg : null, repetitionVmp, maximumVmp: repetitionVmp, observations: form.observations.trim() };
}

export function validateHipThrustVmpForm(form: HipThrustVmpFormState): HipThrustVmpValidationErrors {
  const errors: HipThrustVmpValidationErrors = {};
  const loadKg = parseHipThrustVmpNumber(form.loadKg);
  const vmp = parseHipThrustVmpNumber(form.vmp);
  if (!form.performedAt) errors.performedAt = "La fecha del test es obligatoria.";
  if (loadKg === null) errors.loadKg = "Introduce una carga numérica."; else if (loadKg <= 0) errors.loadKg = "La carga debe ser mayor que 0.";
  if (vmp === null) errors.vmp = "Introduce una VMP numérica."; else if (vmp <= 0) errors.vmp = "La VMP debe ser mayor que 0.";
  return errors;
}

export function createHipThrustVmpResults(summary: HipThrustVmpSummary): HipThrustVmpResult[] {
  if (summary.loadKg === null || summary.repetitionVmp === null || summary.maximumVmp === null) return [];
  return [{ variable: HIP_THRUST_VMP_VARIABLES.LOAD, value: summary.loadKg, unit: HIP_THRUST_VMP_UNIT_LOAD }, { variable: HIP_THRUST_VMP_VARIABLES.REPETITION_1, value: summary.repetitionVmp, unit: HIP_THRUST_VMP_UNIT_SPEED }, { variable: HIP_THRUST_VMP_VARIABLES.MAXIMUM, value: summary.maximumVmp, unit: HIP_THRUST_VMP_UNIT_SPEED }];
}
