export const ACCELERATION_5M_TEST_ID = "ACELERACION 5 M";
export const ACCELERATION_5M_TEST_NAME = "ACELERACION 5 M";
export const ACCELERATION_5M_TEST_CATEGORY = "VELOCIDAD";
export const ACCELERATION_5M_UNIT_TIME = "s";
export const ACCELERATION_5M_UNIT_PERCENTAGE = "%";
export const ACCELERATION_5M_UNIT_ATTEMPT = "intento";
export const ACCELERATION_5M_MIN_ATTEMPTS = 1;
export const ACCELERATION_5M_MAX_ATTEMPTS = 3;

export const ACCELERATION_5M_VARIABLES = {
  ATTEMPT_1: "ACELERACION 5M INTENTO 1",
  ATTEMPT_2: "ACELERACION 5M INTENTO 2",
  ATTEMPT_3: "ACELERACION 5M INTENTO 3",
  BEST_TIME: "ACELERACION 5M MEJOR TIEMPO",
  BEST_ATTEMPT: "ACELERACION 5M INTENTO MEJOR",
  WORST_TIME: "ACELERACION 5M PEOR TIEMPO",
  MEAN_TIME: "ACELERACION 5M TIEMPO MEDIO",
  ABSOLUTE_DIFFERENCE: "ACELERACION 5M DIFERENCIA ABSOLUTA",
  BEST_WORST_VARIATION: "ACELERACION 5M VARIACION MEJOR PEOR",
} as const;

export const ACCELERATION_5M_ATTEMPT_VARIABLES = [
  ACCELERATION_5M_VARIABLES.ATTEMPT_1,
  ACCELERATION_5M_VARIABLES.ATTEMPT_2,
  ACCELERATION_5M_VARIABLES.ATTEMPT_3,
] as const;

export type Acceleration5mAttemptInput = { time: string };

export type Acceleration5mFormState = {
  performedAt: string;
  attempts: Acceleration5mAttemptInput[];
  observations: string;
};

export type Acceleration5mValidAttempt = {
  attemptNumber: number;
  time: number;
};

export type Acceleration5mSummary = {
  validAttempts: Acceleration5mValidAttempt[];
  bestAttempt: Acceleration5mValidAttempt | null;
  worstAttempt: Acceleration5mValidAttempt | null;
  meanTime: number | null;
  absoluteDifference: number | null;
  bestWorstVariation: number | null;
  observations: string;
};

export type Acceleration5mValidationErrors = {
  performedAt?: string;
  attempts: Array<{ time?: string }>;
};

function normalizeAcceleration5mTime(
  value: string | number | null | undefined,
) {
  return String(value ?? "").trim().replace(",", ".");
}

export function parseAcceleration5mTime(
  value: string | number | null | undefined,
) {
  const normalized = normalizeAcceleration5mTime(value);

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getAcceleration5mAttemptErrors(
  attempt: Acceleration5mAttemptInput,
) {
  const time = parseAcceleration5mTime(attempt.time);

  if (time === null) return { time: "Introduce un tiempo numérico." };
  if (time <= 0) return { time: "El tiempo debe ser mayor que 0." };

  return {};
}

export function getValidAcceleration5mAttempts(
  attempts: readonly Acceleration5mAttemptInput[],
) {
  return attempts.flatMap((attempt, index) => {
    const errors = getAcceleration5mAttemptErrors(attempt);
    const time = parseAcceleration5mTime(attempt.time);

    return Object.keys(errors).length === 0 && time !== null
      ? [{ attemptNumber: index + 1, time }]
      : [];
  });
}

export function calculateAcceleration5mSummary(
  form: Acceleration5mFormState,
): Acceleration5mSummary {
  const validAttempts = getValidAcceleration5mAttempts(form.attempts);

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

export function validateAcceleration5mForm(
  form: Acceleration5mFormState,
): Acceleration5mValidationErrors {
  const errors: Acceleration5mValidationErrors = {
    attempts: form.attempts.map(getAcceleration5mAttemptErrors),
  };

  if (!form.performedAt) {
    errors.performedAt = "La fecha del test es obligatoria.";
  }

  if (
    form.attempts.length < ACCELERATION_5M_MIN_ATTEMPTS ||
    form.attempts.length > ACCELERATION_5M_MAX_ATTEMPTS
  ) {
    errors.attempts = Array.from({ length: form.attempts.length }, () => ({
      time: `Registra entre ${ACCELERATION_5M_MIN_ATTEMPTS} y ${ACCELERATION_5M_MAX_ATTEMPTS} intentos.`,
    }));
  }

  return errors;
}
