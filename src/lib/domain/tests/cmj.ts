export const CMJ_TEST_ID = "CMJ";
export const CMJ_TEST_NAME = "CMJ";
export const CMJ_TEST_CATEGORY = "SALTO";
export const CMJ_DEVICE = "MY JUMP LAB";
export const CMJ_UNIT_HEIGHT = "cm";
export const CMJ_UNIT_BODY_MASS = "kg";
export const CMJ_UNIT_ASYMMETRY = "%";
export const CMJ_MIN_ATTEMPTS = 1;
export const CMJ_MAX_ATTEMPTS = 3;

export const CMJ_MODALITIES = ["BIPODAL", "UNIPODAL", "AMBOS"] as const;

export type CmjModality = (typeof CMJ_MODALITIES)[number];

export const CMJ_ATTEMPT_SIDES = [
  "BIPODAL",
  "DERECHA",
  "IZQUIERDA",
] as const;

export type CmjAttemptSide = (typeof CMJ_ATTEMPT_SIDES)[number];

export type CmjBestSide = "DERECHA" | "IZQUIERDA" | "EQUILIBRADO" | "NO_APLICA";

export type CmjAttemptInput = string | number | null | undefined;

export type CmjExecutionInput = {
  bodyMassKg: CmjAttemptInput;
  modality: CmjModality;
  bipodalAttempts: readonly CmjAttemptInput[];
  rightAttempts: readonly CmjAttemptInput[];
  leftAttempts: readonly CmjAttemptInput[];
};

export type CmjSummary = {
  bestBipodal: number | null;
  bestRight: number | null;
  bestLeft: number | null;
  asymmetry: number | null;
  bestSide: CmjBestSide;
  bestOverall: number | null;
};

export const CMJ_VARIABLES = {
  BODY_MASS: "CMJ PESO CORPORAL",
  BEST_BIPODAL: "CMJ MEJOR BIPODAL",
  BEST_RIGHT: "CMJ MEJOR DERECHA",
  BEST_LEFT: "CMJ MEJOR IZQUIERDA",
  ASYMMETRY: "CMJ ASIMETRIA UNIPODAL",
  BEST_SIDE: "CMJ LADO MAYOR UNIPODAL",
} as const;

function roundCmjValue(value: number, decimals = 2) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

export function isCmjModality(value: unknown): value is CmjModality {
  return CMJ_MODALITIES.includes(value as CmjModality);
}

export function modalityIncludesBipodal(modality: CmjModality) {
  return modality === "BIPODAL" || modality === "AMBOS";
}

export function modalityIncludesUnipodal(modality: CmjModality) {
  return modality === "UNIPODAL" || modality === "AMBOS";
}

export function parsePositiveCmjNumber(value: CmjAttemptInput) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return roundCmjValue(parsed);
}

export function getValidCmjAttempts(attempts: readonly CmjAttemptInput[]) {
  return attempts
    .map((attempt) => parsePositiveCmjNumber(attempt))
    .filter((attempt): attempt is number => attempt !== null);
}

export function getBestCmjAttempt(attempts: readonly CmjAttemptInput[]) {
  const validAttempts = getValidCmjAttempts(attempts);

  if (validAttempts.length === 0) return null;

  return Math.max(...validAttempts);
}

export function getCmjAttemptVariable(side: CmjAttemptSide, attempt: number) {
  return `CMJ ALTURA ${side} INTENTO ${attempt}`;
}

export function calculateCmjAsymmetry(
  bestRight: number | null,
  bestLeft: number | null,
) {
  if (bestRight === null || bestLeft === null) return null;

  const maxValue = Math.max(bestRight, bestLeft);

  if (maxValue <= 0) return null;

  return roundCmjValue((Math.abs(bestRight - bestLeft) / maxValue) * 100);
}

export function getCmjBestSide(
  bestRight: number | null,
  bestLeft: number | null,
): CmjBestSide {
  if (bestRight === null || bestLeft === null) return "NO_APLICA";
  if (bestRight > bestLeft) return "DERECHA";
  if (bestLeft > bestRight) return "IZQUIERDA";

  return "EQUILIBRADO";
}

export function calculateCmjSummary(input: CmjExecutionInput): CmjSummary {
  const bestBipodal = modalityIncludesBipodal(input.modality)
    ? getBestCmjAttempt(input.bipodalAttempts)
    : null;
  const bestRight = modalityIncludesUnipodal(input.modality)
    ? getBestCmjAttempt(input.rightAttempts)
    : null;
  const bestLeft = modalityIncludesUnipodal(input.modality)
    ? getBestCmjAttempt(input.leftAttempts)
    : null;
  const asymmetry = modalityIncludesUnipodal(input.modality)
    ? calculateCmjAsymmetry(bestRight, bestLeft)
    : null;
  const bestSide = modalityIncludesUnipodal(input.modality)
    ? getCmjBestSide(bestRight, bestLeft)
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
  attempts: readonly CmjAttemptInput[],
) {
  const errors: string[] = [];

  if (attempts.length > CMJ_MAX_ATTEMPTS) {
    errors.push(`${label}: máximo ${CMJ_MAX_ATTEMPTS} intentos.`);
  }

  const nonEmptyAttempts = attempts.filter((attempt) => {
    return attempt !== null && attempt !== undefined && String(attempt).trim();
  });
  const validAttempts = getValidCmjAttempts(attempts);

  if (nonEmptyAttempts.length > 0 && validAttempts.length !== nonEmptyAttempts.length) {
    errors.push(`${label}: todos los saltos deben ser numéricos y mayores que 0.`);
  }

  if (validAttempts.length < CMJ_MIN_ATTEMPTS) {
    errors.push(`${label}: registra al menos un intento válido.`);
  }

  return errors;
}

export function validateCmjExecutionInput(input: CmjExecutionInput) {
  const errors: string[] = [];

  if (!parsePositiveCmjNumber(input.bodyMassKg)) {
    errors.push("El peso corporal debe ser numérico y mayor que 0.");
  }

  if (!isCmjModality(input.modality)) {
    errors.push("Selecciona una modalidad CMJ válida.");
  }

  if (modalityIncludesBipodal(input.modality)) {
    errors.push(
      ...validateAttemptGroup("Bipodal", input.bipodalAttempts),
    );
  }

  if (modalityIncludesUnipodal(input.modality)) {
    errors.push(...validateAttemptGroup("Derecha", input.rightAttempts));
    errors.push(...validateAttemptGroup("Izquierda", input.leftAttempts));
  }

  return errors;
}
