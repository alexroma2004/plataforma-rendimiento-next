export const SJ_TEST_ID = "SJ";
export const SJ_TEST_NAME = "SJ";
export const SJ_TEST_CATEGORY = "SALTO";
export const SJ_DEVICE = "MY JUMP LAB";
export const SJ_UNIT_HEIGHT = "cm";
export const SJ_UNIT_BODY_MASS = "kg";
export const SJ_UNIT_ASYMMETRY = "%";
export const SJ_MIN_ATTEMPTS = 1;
export const SJ_MAX_ATTEMPTS = 3;

export const SJ_MODALITIES = ["BIPODAL", "UNIPODAL", "AMBOS"] as const;

export type SjModality = (typeof SJ_MODALITIES)[number];

export const SJ_ATTEMPT_SIDES = [
  "BIPODAL",
  "DERECHA",
  "IZQUIERDA",
] as const;

export type SjAttemptSide = (typeof SJ_ATTEMPT_SIDES)[number];

export type SjBestSide = "DERECHA" | "IZQUIERDA" | "EQUILIBRADO" | "NO_APLICA";

export type SjAttemptInput = string | number | null | undefined;

export type SjExecutionInput = {
  bodyMassKg: SjAttemptInput;
  modality: SjModality;
  bipodalAttempts: readonly SjAttemptInput[];
  rightAttempts: readonly SjAttemptInput[];
  leftAttempts: readonly SjAttemptInput[];
};

export type SjSummary = {
  bestBipodal: number | null;
  bestRight: number | null;
  bestLeft: number | null;
  asymmetry: number | null;
  bestSide: SjBestSide;
  bestOverall: number | null;
};

export const SJ_VARIABLES = {
  BODY_MASS: "SJ PESO CORPORAL",
  BEST_BIPODAL: "SJ MEJOR BIPODAL",
  BEST_RIGHT: "SJ MEJOR DERECHA",
  BEST_LEFT: "SJ MEJOR IZQUIERDA",
  ASYMMETRY: "SJ ASIMETRIA UNIPODAL",
  BEST_SIDE: "SJ LADO MAYOR UNIPODAL",
} as const;

function roundSjValue(value: number, decimals = 2) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

export function isSjModality(value: unknown): value is SjModality {
  return SJ_MODALITIES.includes(value as SjModality);
}

export function modalityIncludesSjBipodal(modality: SjModality) {
  return modality === "BIPODAL" || modality === "AMBOS";
}

export function modalityIncludesSjUnipodal(modality: SjModality) {
  return modality === "UNIPODAL" || modality === "AMBOS";
}

export function parsePositiveSjNumber(value: SjAttemptInput) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return roundSjValue(parsed);
}

export function getValidSjAttempts(attempts: readonly SjAttemptInput[]) {
  return attempts
    .map((attempt) => parsePositiveSjNumber(attempt))
    .filter((attempt): attempt is number => attempt !== null);
}

export function getBestSjAttempt(attempts: readonly SjAttemptInput[]) {
  const validAttempts = getValidSjAttempts(attempts);

  if (validAttempts.length === 0) return null;

  return Math.max(...validAttempts);
}

export function getSjAttemptVariable(side: SjAttemptSide, attempt: number) {
  return `SJ ALTURA ${side} INTENTO ${attempt}`;
}

export function calculateSjAsymmetry(
  bestRight: number | null,
  bestLeft: number | null,
) {
  if (bestRight === null || bestLeft === null) return null;

  const maxValue = Math.max(bestRight, bestLeft);

  if (maxValue <= 0) return null;

  return roundSjValue((Math.abs(bestRight - bestLeft) / maxValue) * 100);
}

export function getSjBestSide(
  bestRight: number | null,
  bestLeft: number | null,
): SjBestSide {
  if (bestRight === null || bestLeft === null) return "NO_APLICA";
  if (bestRight > bestLeft) return "DERECHA";
  if (bestLeft > bestRight) return "IZQUIERDA";

  return "EQUILIBRADO";
}

export function calculateSjSummary(input: SjExecutionInput): SjSummary {
  const bestBipodal = modalityIncludesSjBipodal(input.modality)
    ? getBestSjAttempt(input.bipodalAttempts)
    : null;
  const bestRight = modalityIncludesSjUnipodal(input.modality)
    ? getBestSjAttempt(input.rightAttempts)
    : null;
  const bestLeft = modalityIncludesSjUnipodal(input.modality)
    ? getBestSjAttempt(input.leftAttempts)
    : null;
  const asymmetry = modalityIncludesSjUnipodal(input.modality)
    ? calculateSjAsymmetry(bestRight, bestLeft)
    : null;
  const bestSide = modalityIncludesSjUnipodal(input.modality)
    ? getSjBestSide(bestRight, bestLeft)
    : "NO_APLICA";
  const bestOverall = Math.max(
    ...[bestBipodal, bestRight, bestLeft].filter(
      (value): value is number => value !== null,
    ),
  );

  return {
    bestBipodal,
    bestRight,
    bestLeft,
    asymmetry,
    bestSide,
    bestOverall: Number.isFinite(bestOverall) ? bestOverall : null,
  };
}

function validateAttemptGroup(
  label: string,
  attempts: readonly SjAttemptInput[],
) {
  const errors: string[] = [];

  if (attempts.length > SJ_MAX_ATTEMPTS) {
    errors.push(`${label}: maximo ${SJ_MAX_ATTEMPTS} intentos.`);
  }

  const nonEmptyAttempts = attempts.filter((attempt) => {
    return attempt !== null && attempt !== undefined && String(attempt).trim();
  });
  const validAttempts = getValidSjAttempts(attempts);

  if (nonEmptyAttempts.length > 0 && validAttempts.length !== nonEmptyAttempts.length) {
    errors.push(`${label}: todos los saltos deben ser numericos y mayores que 0.`);
  }

  if (validAttempts.length < SJ_MIN_ATTEMPTS) {
    errors.push(`${label}: registra al menos un intento valido.`);
  }

  return errors;
}

export function validateSjExecutionInput(input: SjExecutionInput) {
  const errors: string[] = [];

  if (!parsePositiveSjNumber(input.bodyMassKg)) {
    errors.push("El peso corporal debe ser numerico y mayor que 0.");
  }

  if (!isSjModality(input.modality)) {
    errors.push("Selecciona una modalidad SJ valida.");
  }

  if (modalityIncludesSjBipodal(input.modality)) {
    errors.push(
      ...validateAttemptGroup("Bipodal", input.bipodalAttempts),
    );
  }

  if (modalityIncludesSjUnipodal(input.modality)) {
    errors.push(...validateAttemptGroup("Derecha", input.rightAttempts));
    errors.push(...validateAttemptGroup("Izquierda", input.leftAttempts));
  }

  return errors;
}
