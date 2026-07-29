export const RSA_6X30_TEST_ID = "RSA 6 X 30M";
export const RSA_6X30_TEST_NAME = "RSA 6 X 30M";
export const RSA_6X30_TEST_CATEGORY = "RESISTENCIA";
export const RSA_6X30_SPRINT_COUNT = 6;
export const RSA_6X30_UNIT_TIME = "s";
export const RSA_6X30_UNIT_PERCENTAGE = "%";

export const RSA_6X30_VARIABLES = {
  SPRINT_1: "RSA 6X30 SPRINT 1",
  SPRINT_2: "RSA 6X30 SPRINT 2",
  SPRINT_3: "RSA 6X30 SPRINT 3",
  SPRINT_4: "RSA 6X30 SPRINT 4",
  SPRINT_5: "RSA 6X30 SPRINT 5",
  SPRINT_6: "RSA 6X30 SPRINT 6",
  BEST_TIME: "RSA 6X30 MEJOR TIEMPO",
  WORST_TIME: "RSA 6X30 PEOR TIEMPO",
  MEAN_TIME: "RSA 6X30 TIEMPO MEDIO",
  TOTAL_TIME: "RSA 6X30 TIEMPO TOTAL",
  DECREMENT: "RSA 6X30 DECREMENTO",
  ABSOLUTE_DIFFERENCE: "RSA 6X30 DIFERENCIA ABSOLUTA",
} as const;

export const RSA_6X30_SPRINT_VARIABLES = [
  RSA_6X30_VARIABLES.SPRINT_1,
  RSA_6X30_VARIABLES.SPRINT_2,
  RSA_6X30_VARIABLES.SPRINT_3,
  RSA_6X30_VARIABLES.SPRINT_4,
  RSA_6X30_VARIABLES.SPRINT_5,
  RSA_6X30_VARIABLES.SPRINT_6,
] as const;

export type Rsa6x30SprintTimes = [
  string,
  string,
  string,
  string,
  string,
  string,
];

export type Rsa6x30FormState = {
  performedAt: string;
  sprintTimes: Rsa6x30SprintTimes;
  observations: string;
};

export type Rsa6x30Summary = {
  sprintTimes: number[];
  bestTime: number | null;
  worstTime: number | null;
  meanTime: number | null;
  totalTime: number | null;
  decrement: number | null;
  absoluteDifference: number | null;
  observations: string;
};

export type Rsa6x30ValidationErrors = {
  performedAt?: string;
  sprintTimes: Array<string | undefined>;
};

function normalizeRsa6x30Time(value: string | number | null | undefined) {
  return String(value ?? "").trim().replace(",", ".");
}

export function parseRsa6x30Time(
  value: string | number | null | undefined,
) {
  const normalized = normalizeRsa6x30Time(value);

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidRsa6x30Time(
  value: string | number | null | undefined,
) {
  const time = parseRsa6x30Time(value);

  return time !== null && time > 0;
}

export function getValidRsa6x30Times(
  sprintTimes: readonly (string | number | null | undefined)[],
) {
  if (sprintTimes.length !== RSA_6X30_SPRINT_COUNT) return null;

  const times = sprintTimes.map(parseRsa6x30Time);

  return times.every((time) => time !== null && time > 0)
    ? (times as number[])
    : null;
}

export function calculateRsa6x30Summary(
  form: Rsa6x30FormState,
): Rsa6x30Summary {
  const sprintTimes = getValidRsa6x30Times(form.sprintTimes) ?? [];

  if (sprintTimes.length !== RSA_6X30_SPRINT_COUNT) {
    return {
      sprintTimes,
      bestTime: null,
      worstTime: null,
      meanTime: null,
      totalTime: null,
      decrement: null,
      absoluteDifference: null,
      observations: form.observations.trim(),
    };
  }

  const totalTime = sprintTimes.reduce((sum, time) => sum + time, 0);
  const bestTime = Math.min(...sprintTimes);
  const worstTime = Math.max(...sprintTimes);
  const meanTime = totalTime / RSA_6X30_SPRINT_COUNT;
  const decrement =
    ((totalTime / (bestTime * RSA_6X30_SPRINT_COUNT)) - 1) * 100;

  return {
    sprintTimes,
    bestTime,
    worstTime,
    meanTime,
    totalTime,
    decrement,
    absoluteDifference: worstTime - bestTime,
    observations: form.observations.trim(),
  };
}

export function validateRsa6x30Form(
  form: Rsa6x30FormState,
): Rsa6x30ValidationErrors {
  const errors: Rsa6x30ValidationErrors = { sprintTimes: [] };

  if (!form.performedAt) {
    errors.performedAt = "La fecha del test es obligatoria.";
  }

  if (form.sprintTimes.length !== RSA_6X30_SPRINT_COUNT) {
    errors.sprintTimes = Array.from(
      { length: RSA_6X30_SPRINT_COUNT },
      () => "El protocolo requiere seis tiempos.",
    );
    return errors;
  }

  form.sprintTimes.forEach((time, index) => {
    const parsed = parseRsa6x30Time(time);

    if (parsed === null) {
      errors.sprintTimes[index] = "Introduce un tiempo numérico.";
    } else if (parsed <= 0) {
      errors.sprintTimes[index] = "El tiempo debe ser mayor que 0.";
    }
  });

  return errors;
}
