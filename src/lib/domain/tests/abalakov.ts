export const ABALAKOV_TEST_ID = "ABALAKOV";
export const ABALAKOV_TEST_NAME = "ABALAKOV";
export const ABALAKOV_TEST_CATEGORY = "SALTO";
export const ABALAKOV_DEVICE = "MY JUMP LAB";
export const ABALAKOV_UNIT_HEIGHT = "cm";
export const ABALAKOV_UNIT_BODY_MASS = "kg";
export const ABALAKOV_UNIT_ASYMMETRY = "%";
export const ABALAKOV_MIN_ATTEMPTS = 1;
export const ABALAKOV_MAX_ATTEMPTS = 3;

export const ABALAKOV_MODALITIES = ["BIPODAL", "UNIPODAL", "AMBOS"] as const;

export type AbalakovModality = (typeof ABALAKOV_MODALITIES)[number];

export const ABALAKOV_ATTEMPT_SIDES = [
  "BIPODAL",
  "DERECHA",
  "IZQUIERDA",
] as const;

export type AbalakovAttemptSide = (typeof ABALAKOV_ATTEMPT_SIDES)[number];

export type AbalakovBestSide =
  | "DERECHA"
  | "IZQUIERDA"
  | "EQUILIBRADO"
  | "NO_APLICA";

export type AbalakovAttemptInput = string | number | null | undefined;

export type AbalakovExecutionInput = {
  bodyMassKg: AbalakovAttemptInput;
  modality: AbalakovModality;
  bipodalAttempts: readonly AbalakovAttemptInput[];
  rightAttempts: readonly AbalakovAttemptInput[];
  leftAttempts: readonly AbalakovAttemptInput[];
};

export type AbalakovSummary = {
  bestBipodal: number | null;
  bestRight: number | null;
  bestLeft: number | null;
  asymmetry: number | null;
  bestSide: AbalakovBestSide;
  bestOverall: number | null;
};

export const ABALAKOV_VARIABLES = {
  BODY_MASS: "ABALAKOV PESO CORPORAL",
  BEST_BIPODAL: "ABALAKOV MEJOR BIPODAL",
  BEST_RIGHT: "ABALAKOV MEJOR DERECHA",
  BEST_LEFT: "ABALAKOV MEJOR IZQUIERDA",
  ASYMMETRY: "ABALAKOV ASIMETRIA UNIPODAL",
  BEST_SIDE: "ABALAKOV LADO MAYOR UNIPODAL",
} as const;

function roundAbalakovValue(value: number, decimals = 2) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

export function isAbalakovModality(
  value: unknown,
): value is AbalakovModality {
  return ABALAKOV_MODALITIES.includes(value as AbalakovModality);
}

export function modalityIncludesAbalakovBipodal(
  modality: AbalakovModality,
) {
  return modality === "BIPODAL" || modality === "AMBOS";
}

export function modalityIncludesAbalakovUnipodal(
  modality: AbalakovModality,
) {
  return modality === "UNIPODAL" || modality === "AMBOS";
}

export function parsePositiveAbalakovNumber(value: AbalakovAttemptInput) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return roundAbalakovValue(parsed);
}

export function getValidAbalakovAttempts(
  attempts: readonly AbalakovAttemptInput[],
) {
  return attempts
    .map((attempt) => parsePositiveAbalakovNumber(attempt))
    .filter((attempt): attempt is number => attempt !== null);
}

export function getBestAbalakovAttempt(
  attempts: readonly AbalakovAttemptInput[],
) {
  const validAttempts = getValidAbalakovAttempts(attempts);

  if (validAttempts.length === 0) return null;

  return Math.max(...validAttempts);
}

export function getAbalakovAttemptVariable(
  side: AbalakovAttemptSide,
  attempt: number,
) {
  return `ABALAKOV ALTURA ${side} INTENTO ${attempt}`;
}

export function calculateAbalakovAsymmetry(
  bestRight: number | null,
  bestLeft: number | null,
) {
  if (bestRight === null || bestLeft === null) return null;

  const maxValue = Math.max(bestRight, bestLeft);

  if (maxValue <= 0) return null;

  return roundAbalakovValue((Math.abs(bestRight - bestLeft) / maxValue) * 100);
}

export function getAbalakovBestSide(
  bestRight: number | null,
  bestLeft: number | null,
): AbalakovBestSide {
  if (bestRight === null || bestLeft === null) return "NO_APLICA";
  if (bestRight > bestLeft) return "DERECHA";
  if (bestLeft > bestRight) return "IZQUIERDA";

  return "EQUILIBRADO";
}

export function calculateAbalakovSummary(
  input: AbalakovExecutionInput,
): AbalakovSummary {
  const bestBipodal = modalityIncludesAbalakovBipodal(input.modality)
    ? getBestAbalakovAttempt(input.bipodalAttempts)
    : null;
  const bestRight = modalityIncludesAbalakovUnipodal(input.modality)
    ? getBestAbalakovAttempt(input.rightAttempts)
    : null;
  const bestLeft = modalityIncludesAbalakovUnipodal(input.modality)
    ? getBestAbalakovAttempt(input.leftAttempts)
    : null;
  const asymmetry = modalityIncludesAbalakovUnipodal(input.modality)
    ? calculateAbalakovAsymmetry(bestRight, bestLeft)
    : null;
  const bestSide = modalityIncludesAbalakovUnipodal(input.modality)
    ? getAbalakovBestSide(bestRight, bestLeft)
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
  attempts: readonly AbalakovAttemptInput[],
) {
  const errors: string[] = [];

  if (attempts.length > ABALAKOV_MAX_ATTEMPTS) {
    errors.push(`${label}: maximo ${ABALAKOV_MAX_ATTEMPTS} intentos.`);
  }

  const nonEmptyAttempts = attempts.filter((attempt) => {
    return attempt !== null && attempt !== undefined && String(attempt).trim();
  });
  const validAttempts = getValidAbalakovAttempts(attempts);

  if (nonEmptyAttempts.length > 0 && validAttempts.length !== nonEmptyAttempts.length) {
    errors.push(`${label}: todos los saltos deben ser numericos y mayores que 0.`);
  }

  if (validAttempts.length < ABALAKOV_MIN_ATTEMPTS) {
    errors.push(`${label}: registra al menos un intento valido.`);
  }

  return errors;
}

export function validateAbalakovExecutionInput(input: AbalakovExecutionInput) {
  const errors: string[] = [];

  if (!parsePositiveAbalakovNumber(input.bodyMassKg)) {
    errors.push("El peso corporal debe ser numerico y mayor que 0.");
  }

  if (!isAbalakovModality(input.modality)) {
    errors.push("Selecciona una modalidad Abalakov valida.");
  }

  if (modalityIncludesAbalakovBipodal(input.modality)) {
    errors.push(
      ...validateAttemptGroup("Bipodal", input.bipodalAttempts),
    );
  }

  if (modalityIncludesAbalakovUnipodal(input.modality)) {
    errors.push(...validateAttemptGroup("Derecha", input.rightAttempts));
    errors.push(...validateAttemptGroup("Izquierda", input.leftAttempts));
  }

  return errors;
}
