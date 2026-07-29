export const ILLINOIS_TEST_ID = "ILLINOIS";
export const ILLINOIS_TEST_NAME = "ILLINOIS";
export const ILLINOIS_TEST_CATEGORY = "AGILIDAD";
export const ILLINOIS_UNIT_TIME = "s";
export const ILLINOIS_UNIT_PERCENTAGE = "%";
export const ILLINOIS_UNIT_ATTEMPT = "intento";
export const ILLINOIS_MIN_ATTEMPTS = 1;
export const ILLINOIS_MAX_ATTEMPTS = 3;

export const ILLINOIS_VARIABLES = {
  ATTEMPT_1: "ILLINOIS INTENTO 1",
  ATTEMPT_2: "ILLINOIS INTENTO 2",
  ATTEMPT_3: "ILLINOIS INTENTO 3",
  BEST_TIME: "ILLINOIS MEJOR TIEMPO",
  BEST_ATTEMPT: "ILLINOIS INTENTO MEJOR",
  WORST_TIME: "ILLINOIS PEOR TIEMPO",
  MEAN_TIME: "ILLINOIS TIEMPO MEDIO",
  ABSOLUTE_DIFFERENCE: "ILLINOIS DIFERENCIA ABSOLUTA",
  BEST_WORST_VARIATION: "ILLINOIS VARIACION MEJOR PEOR",
} as const;

export const ILLINOIS_ATTEMPT_VARIABLES = [
  ILLINOIS_VARIABLES.ATTEMPT_1,
  ILLINOIS_VARIABLES.ATTEMPT_2,
  ILLINOIS_VARIABLES.ATTEMPT_3,
] as const;

export type IllinoisAttemptInput = { time: string };

export type IllinoisFormState = {
  performedAt: string;
  attempts: IllinoisAttemptInput[];
  observations: string;
};

export type IllinoisValidAttempt = { attemptNumber: number; time: number };

export type IllinoisSummary = {
  validAttempts: IllinoisValidAttempt[];
  bestAttempt: IllinoisValidAttempt | null;
  worstAttempt: IllinoisValidAttempt | null;
  meanTime: number | null;
  absoluteDifference: number | null;
  bestWorstVariation: number | null;
  observations: string;
};

export type IllinoisValidationErrors = {
  performedAt?: string;
  attempts: Array<{ time?: string }>;
};

function normalizeIllinoisTime(value: string | number | null | undefined) {
  return String(value ?? "").trim().replace(",", ".");
}

export function parseIllinoisTime(value: string | number | null | undefined) {
  const normalized = normalizeIllinoisTime(value);

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getIllinoisAttemptErrors(attempt: IllinoisAttemptInput) {
  const time = parseIllinoisTime(attempt.time);

  if (time === null) return { time: "Introduce un tiempo numérico." };
  if (time <= 0) return { time: "El tiempo debe ser mayor que 0." };

  return {};
}

export function getValidIllinoisAttempts(
  attempts: readonly IllinoisAttemptInput[],
) {
  return attempts.flatMap((attempt, index) => {
    const errors = getIllinoisAttemptErrors(attempt);
    const time = parseIllinoisTime(attempt.time);

    return Object.keys(errors).length === 0 && time !== null
      ? [{ attemptNumber: index + 1, time }]
      : [];
  });
}

export function calculateIllinoisSummary(form: IllinoisFormState): IllinoisSummary {
  const validAttempts = getValidIllinoisAttempts(form.attempts);

  if (validAttempts.length === 0) {
    return {
      validAttempts,
      bestAttempt: null,
      worstAttempt: null,
      meanTime: null,
      absoluteDifference: null,
      bestWorstVariation: null,
      observations: form.observations.trim(),
    };
  }

  const bestAttempt = validAttempts.reduce((best, attempt) =>
    attempt.time < best.time ? attempt : best,
  );
  const worstAttempt = validAttempts.reduce((worst, attempt) =>
    attempt.time > worst.time ? attempt : worst,
  );
  const meanTime =
    validAttempts.reduce((sum, attempt) => sum + attempt.time, 0) /
    validAttempts.length;
  const absoluteDifference = worstAttempt.time - bestAttempt.time;

  return {
    validAttempts,
    bestAttempt,
    worstAttempt,
    meanTime,
    absoluteDifference,
    bestWorstVariation: (absoluteDifference / bestAttempt.time) * 100,
    observations: form.observations.trim(),
  };
}

export function validateIllinoisForm(
  form: IllinoisFormState,
): IllinoisValidationErrors {
  const errors: IllinoisValidationErrors = {
    attempts: form.attempts.map(getIllinoisAttemptErrors),
  };

  if (!form.performedAt) errors.performedAt = "La fecha del test es obligatoria.";

  if (
    form.attempts.length < ILLINOIS_MIN_ATTEMPTS ||
    form.attempts.length > ILLINOIS_MAX_ATTEMPTS
  ) {
    errors.attempts = Array.from({ length: form.attempts.length }, () => ({
      time: `Registra entre ${ILLINOIS_MIN_ATTEMPTS} y ${ILLINOIS_MAX_ATTEMPTS} intentos.`,
    }));
  }

  return errors;
}
