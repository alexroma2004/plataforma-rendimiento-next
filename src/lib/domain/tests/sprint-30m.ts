export const SPRINT_30M_TEST_ID = "SPRINT 30M";
export const SPRINT_30M_TEST_NAME = "SPRINT 30M";
export const SPRINT_30M_TEST_CATEGORY = "VELOCIDAD";
export const SPRINT_30M_UNIT_TIME = "s";
export const SPRINT_30M_UNIT_ATTEMPT = "intento";
export const SPRINT_30M_MIN_ATTEMPTS = 1;
export const SPRINT_30M_MAX_ATTEMPTS = 3;

export const SPRINT_30M_VARIABLES = {
  BEST_TIME_5M: "SPRINT 30M MEJOR TIEMPO 5M",
  BEST_TIME_30M: "SPRINT 30M MEJOR TIEMPO 30M",
  BEST_ATTEMPT_5M: "SPRINT 30M INTENTO MEJOR 5M",
  BEST_ATTEMPT_30M: "SPRINT 30M INTENTO MEJOR 30M",
  TIME_5M_ASSOCIATED_BEST_30M: "SPRINT 30M TIEMPO 5M ASOCIADO MEJOR 30M",
  TIME_30M_ASSOCIATED_BEST_5M: "SPRINT 30M TIEMPO 30M ASOCIADO MEJOR 5M",
  MEAN_TIME_5M: "SPRINT 30M PROMEDIO 5M",
  MEAN_TIME_30M: "SPRINT 30M PROMEDIO 30M",
} as const;

export type Sprint30AttemptInput = {
  time5m: string;
  time30m: string;
};

export type Sprint30FormState = {
  performedAt: string;
  attempts: Sprint30AttemptInput[];
  observations: string;
};

export type Sprint30ValidAttempt = {
  attemptNumber: number;
  time5m: number;
  time30m: number;
};

export type Sprint30Summary = {
  validAttempts: Sprint30ValidAttempt[];
  best5m: Sprint30ValidAttempt | null;
  best30m: Sprint30ValidAttempt | null;
  mean5m: number | null;
  mean30m: number | null;
  time5mAssociatedBest30m: number | null;
  time30mAssociatedBest5m: number | null;
  observations: string;
};

export type Sprint30AttemptValidationErrors = {
  time5m?: string;
  time30m?: string;
};

export type Sprint30ValidationErrors = {
  performedAt?: string;
  attempts: Sprint30AttemptValidationErrors[];
};

function normalizeSprint30Time(value: string | number | null | undefined) {
  return String(value ?? "").trim().replace(",", ".");
}

export function parseSprint30Time(
  value: string | number | null | undefined,
) {
  const normalized = normalizeSprint30Time(value);

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getSprint30AttemptValidationErrors(
  attempt: Sprint30AttemptInput,
): Sprint30AttemptValidationErrors {
  const errors: Sprint30AttemptValidationErrors = {};
  const time5m = parseSprint30Time(attempt.time5m);
  const time30m = parseSprint30Time(attempt.time30m);

  if (time5m === null) {
    errors.time5m = "Introduce un tiempo de 5 m numérico.";
  } else if (time5m <= 0) {
    errors.time5m = "El tiempo de 5 m debe ser mayor que 0.";
  }

  if (time30m === null) {
    errors.time30m = "Introduce un tiempo de 30 m numérico.";
  } else if (time30m <= 0) {
    errors.time30m = "El tiempo de 30 m debe ser mayor que 0.";
  }

  if (
    time5m !== null &&
    time5m > 0 &&
    time30m !== null &&
    time30m > 0 &&
    time5m >= time30m
  ) {
    errors.time30m = "El tiempo de 30 m debe ser mayor que el de 5 m.";
  }

  return errors;
}

export function getValidSprint30Attempts(
  attempts: readonly Sprint30AttemptInput[],
) {
  return attempts.flatMap((attempt, index) => {
    const errors = getSprint30AttemptValidationErrors(attempt);
    const time5m = parseSprint30Time(attempt.time5m);
    const time30m = parseSprint30Time(attempt.time30m);

    return Object.keys(errors).length === 0 &&
      time5m !== null &&
      time30m !== null
      ? [
          {
            attemptNumber: index + 1,
            time5m,
            time30m,
          },
        ]
      : [];
  });
}

export function calculateSprint30Summary(
  form: Sprint30FormState,
): Sprint30Summary {
  const validAttempts = getValidSprint30Attempts(form.attempts);

  if (validAttempts.length === 0) {
    return {
      validAttempts,
      best5m: null,
      best30m: null,
      mean5m: null,
      mean30m: null,
      time5mAssociatedBest30m: null,
      time30mAssociatedBest5m: null,
      observations: form.observations.trim(),
    };
  }

  const best5m = validAttempts.reduce((best, attempt) =>
    attempt.time5m < best.time5m ? attempt : best,
  );
  const best30m = validAttempts.reduce((best, attempt) =>
    attempt.time30m < best.time30m ? attempt : best,
  );
  const mean5m =
    validAttempts.reduce((sum, attempt) => sum + attempt.time5m, 0) /
    validAttempts.length;
  const mean30m =
    validAttempts.reduce((sum, attempt) => sum + attempt.time30m, 0) /
    validAttempts.length;

  return {
    validAttempts,
    best5m,
    best30m,
    mean5m,
    mean30m,
    time5mAssociatedBest30m: best30m.time5m,
    time30mAssociatedBest5m: best5m.time30m,
    observations: form.observations.trim(),
  };
}

export function validateSprint30Form(
  form: Sprint30FormState,
): Sprint30ValidationErrors {
  const errors: Sprint30ValidationErrors = {
    attempts: form.attempts.map(getSprint30AttemptValidationErrors),
  };

  if (!form.performedAt) {
    errors.performedAt = "La fecha del test es obligatoria.";
  }

  if (
    form.attempts.length < SPRINT_30M_MIN_ATTEMPTS ||
    form.attempts.length > SPRINT_30M_MAX_ATTEMPTS
  ) {
    errors.attempts = Array.from({ length: form.attempts.length }, () => ({
      time5m: `Registra entre ${SPRINT_30M_MIN_ATTEMPTS} y ${SPRINT_30M_MAX_ATTEMPTS} intentos.`,
    }));
  }

  return errors;
}

export function getSprint30Attempt5mVariable(attemptNumber: number) {
  return `SPRINT 30M INTENTO ${attemptNumber} TIEMPO 5M`;
}

export function getSprint30Attempt30mVariable(attemptNumber: number) {
  return `SPRINT 30M INTENTO ${attemptNumber} TIEMPO 30M`;
}
