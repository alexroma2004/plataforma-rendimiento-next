export const DROP_JUMP_TEST_ID = "DROP JUMP";
export const DROP_JUMP_TEST_NAME = "DROP JUMP";
export const DROP_JUMP_TEST_CATEGORY = "SALTO";
export const DROP_JUMP_DEVICE = "MY JUMP LAB";
export const DROP_JUMP_UNIT_HEIGHT = "cm";
export const DROP_JUMP_UNIT_BODY_MASS = "kg";
export const DROP_JUMP_UNIT_CONTACT = "ms";
export const DROP_JUMP_UNIT_RSI = "m/s";
export const DROP_JUMP_UNIT_ASYMMETRY = "%";
export const DROP_JUMP_MIN_ATTEMPTS = 1;
export const DROP_JUMP_MAX_ATTEMPTS = 3;

export const DROP_JUMP_MODALITIES = ["BIPODAL", "UNIPODAL", "AMBOS"] as const;

export type DropJumpModality = (typeof DROP_JUMP_MODALITIES)[number];

export const DROP_JUMP_ATTEMPT_SIDES = [
  "BIPODAL",
  "DERECHA",
  "IZQUIERDA",
] as const;

export type DropJumpAttemptSide = (typeof DROP_JUMP_ATTEMPT_SIDES)[number];

export type DropJumpBestSide =
  | "DERECHA"
  | "IZQUIERDA"
  | "EQUILIBRADO"
  | "NO_APLICA";

export type DropJumpNumericInput = string | number | null | undefined;

export type DropJumpAttemptInput = {
  heightCm: DropJumpNumericInput;
  contactMs: DropJumpNumericInput;
};

export type DropJumpValidAttempt = {
  attemptNumber: number;
  heightCm: number;
  contactMs: number;
  rsi: number;
};

export type DropJumpExecutionInput = {
  bodyMassKg: DropJumpNumericInput;
  boxHeightCm: DropJumpNumericInput;
  modality: DropJumpModality;
  bipodalAttempts: readonly DropJumpAttemptInput[];
  rightAttempts: readonly DropJumpAttemptInput[];
  leftAttempts: readonly DropJumpAttemptInput[];
};

export type DropJumpSummary = {
  bestBipodal: DropJumpValidAttempt | null;
  bestRight: DropJumpValidAttempt | null;
  bestLeft: DropJumpValidAttempt | null;
  asymmetry: number | null;
  bestSide: DropJumpBestSide;
  bestOverallRsi: number | null;
};

export const DROP_JUMP_VARIABLES = {
  BODY_MASS: "DROP JUMP PESO CORPORAL",
  BOX_HEIGHT: "DROP JUMP ALTURA CAJON",
  BEST_RSI_BIPODAL: "DROP JUMP MEJOR RSI BIPODAL",
  BEST_RSI_RIGHT: "DROP JUMP MEJOR RSI DERECHA",
  BEST_RSI_LEFT: "DROP JUMP MEJOR RSI IZQUIERDA",
  BEST_HEIGHT_BIPODAL: "DROP JUMP ALTURA ASOCIADA MEJOR RSI BIPODAL",
  BEST_HEIGHT_RIGHT: "DROP JUMP ALTURA ASOCIADA MEJOR RSI DERECHA",
  BEST_HEIGHT_LEFT: "DROP JUMP ALTURA ASOCIADA MEJOR RSI IZQUIERDA",
  BEST_CONTACT_BIPODAL: "DROP JUMP CONTACTO ASOCIADO MEJOR RSI BIPODAL",
  BEST_CONTACT_RIGHT: "DROP JUMP CONTACTO ASOCIADO MEJOR RSI DERECHA",
  BEST_CONTACT_LEFT: "DROP JUMP CONTACTO ASOCIADO MEJOR RSI IZQUIERDA",
  BEST_ATTEMPT_BIPODAL: "DROP JUMP INTENTO MEJOR RSI BIPODAL",
  BEST_ATTEMPT_RIGHT: "DROP JUMP INTENTO MEJOR RSI DERECHA",
  BEST_ATTEMPT_LEFT: "DROP JUMP INTENTO MEJOR RSI IZQUIERDA",
  ASYMMETRY: "DROP JUMP ASIMETRIA RSI UNIPODAL",
  BEST_SIDE: "DROP JUMP LADO MAYOR RSI UNIPODAL",
} as const;

function roundDropJumpValue(value: number, decimals = 4) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

export function isDropJumpModality(
  value: unknown,
): value is DropJumpModality {
  return DROP_JUMP_MODALITIES.includes(value as DropJumpModality);
}

export function modalityIncludesDropJumpBipodal(
  modality: DropJumpModality,
) {
  return modality === "BIPODAL" || modality === "AMBOS";
}

export function modalityIncludesDropJumpUnipodal(
  modality: DropJumpModality,
) {
  return modality === "UNIPODAL" || modality === "AMBOS";
}

export function parsePositiveDropJumpNumber(value: DropJumpNumericInput) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return roundDropJumpValue(parsed, 2);
}

export function calculateDropJumpRsi(
  heightCmInput: DropJumpNumericInput,
  contactMsInput: DropJumpNumericInput,
) {
  const heightCm = parsePositiveDropJumpNumber(heightCmInput);
  const contactMs = parsePositiveDropJumpNumber(contactMsInput);

  if (heightCm === null || contactMs === null) return null;

  return roundDropJumpValue((10 * heightCm) / contactMs);
}

export function getValidDropJumpAttempts(
  attempts: readonly DropJumpAttemptInput[],
) {
  return attempts
    .map((attempt, index) => {
      const heightCm = parsePositiveDropJumpNumber(attempt.heightCm);
      const contactMs = parsePositiveDropJumpNumber(attempt.contactMs);
      const rsi = calculateDropJumpRsi(attempt.heightCm, attempt.contactMs);

      if (heightCm === null || contactMs === null || rsi === null) {
        return null;
      }

      return {
        attemptNumber: index + 1,
        heightCm,
        contactMs,
        rsi,
      };
    })
    .filter((attempt): attempt is DropJumpValidAttempt => attempt !== null);
}

export function getBestDropJumpAttempt(
  attempts: readonly DropJumpAttemptInput[],
) {
  const validAttempts = getValidDropJumpAttempts(attempts);

  if (validAttempts.length === 0) return null;

  return validAttempts.reduce((bestAttempt, attempt) =>
    attempt.rsi > bestAttempt.rsi ? attempt : bestAttempt,
  );
}

export function getDropJumpAttemptHeightVariable(
  side: DropJumpAttemptSide,
  attempt: number,
) {
  return `DROP JUMP ALTURA ${side} INTENTO ${attempt}`;
}

export function getDropJumpAttemptContactVariable(
  side: DropJumpAttemptSide,
  attempt: number,
) {
  return `DROP JUMP CONTACTO ${side} INTENTO ${attempt}`;
}

export function getDropJumpAttemptRsiVariable(
  side: DropJumpAttemptSide,
  attempt: number,
) {
  return `DROP JUMP RSI ${side} INTENTO ${attempt}`;
}

export function calculateDropJumpAsymmetry(
  bestRight: DropJumpValidAttempt | null,
  bestLeft: DropJumpValidAttempt | null,
) {
  if (bestRight === null || bestLeft === null) return null;

  const maxValue = Math.max(bestRight.rsi, bestLeft.rsi);

  if (maxValue <= 0) return null;

  return roundDropJumpValue(
    (Math.abs(bestRight.rsi - bestLeft.rsi) / maxValue) * 100,
    2,
  );
}

export function getDropJumpBestSide(
  bestRight: DropJumpValidAttempt | null,
  bestLeft: DropJumpValidAttempt | null,
): DropJumpBestSide {
  if (bestRight === null || bestLeft === null) return "NO_APLICA";
  if (bestRight.rsi > bestLeft.rsi) return "DERECHA";
  if (bestLeft.rsi > bestRight.rsi) return "IZQUIERDA";

  return "EQUILIBRADO";
}

export function calculateDropJumpSummary(
  input: DropJumpExecutionInput,
): DropJumpSummary {
  const bestBipodal = modalityIncludesDropJumpBipodal(input.modality)
    ? getBestDropJumpAttempt(input.bipodalAttempts)
    : null;
  const bestRight = modalityIncludesDropJumpUnipodal(input.modality)
    ? getBestDropJumpAttempt(input.rightAttempts)
    : null;
  const bestLeft = modalityIncludesDropJumpUnipodal(input.modality)
    ? getBestDropJumpAttempt(input.leftAttempts)
    : null;
  const asymmetry = modalityIncludesDropJumpUnipodal(input.modality)
    ? calculateDropJumpAsymmetry(bestRight, bestLeft)
    : null;
  const bestSide = modalityIncludesDropJumpUnipodal(input.modality)
    ? getDropJumpBestSide(bestRight, bestLeft)
    : "NO_APLICA";
  const bestOverallRsi = Math.max(
    ...[bestBipodal, bestRight, bestLeft]
      .filter((attempt): attempt is DropJumpValidAttempt => attempt !== null)
      .map((attempt) => attempt.rsi),
  );

  return {
    bestBipodal,
    bestRight,
    bestLeft,
    asymmetry,
    bestSide,
    bestOverallRsi: Number.isFinite(bestOverallRsi) ? bestOverallRsi : null,
  };
}

function hasAnyAttemptValue(attempt: DropJumpAttemptInput) {
  return [attempt.heightCm, attempt.contactMs].some((value) => {
    return value !== null && value !== undefined && String(value).trim();
  });
}

function validateAttemptGroup(
  label: string,
  attempts: readonly DropJumpAttemptInput[],
) {
  const errors: string[] = [];

  if (attempts.length > DROP_JUMP_MAX_ATTEMPTS) {
    errors.push(`${label}: maximo ${DROP_JUMP_MAX_ATTEMPTS} intentos.`);
  }

  const attemptsWithAnyValue = attempts.filter(hasAnyAttemptValue);
  const validAttempts = getValidDropJumpAttempts(attempts);

  if (attemptsWithAnyValue.length > 0 && validAttempts.length !== attemptsWithAnyValue.length) {
    errors.push(
      `${label}: cada intento debe tener altura y contacto numericos mayores que 0.`,
    );
  }

  if (validAttempts.length < DROP_JUMP_MIN_ATTEMPTS) {
    errors.push(`${label}: registra al menos un intento valido.`);
  }

  return errors;
}

export function validateDropJumpExecutionInput(input: DropJumpExecutionInput) {
  const errors: string[] = [];

  if (!parsePositiveDropJumpNumber(input.bodyMassKg)) {
    errors.push("El peso corporal debe ser numerico y mayor que 0.");
  }

  if (!parsePositiveDropJumpNumber(input.boxHeightCm)) {
    errors.push("La altura del cajon debe ser numerica y mayor que 0.");
  }

  if (!isDropJumpModality(input.modality)) {
    errors.push("Selecciona una modalidad Drop Jump valida.");
  }

  if (modalityIncludesDropJumpBipodal(input.modality)) {
    errors.push(
      ...validateAttemptGroup("Bipodal", input.bipodalAttempts),
    );
  }

  if (modalityIncludesDropJumpUnipodal(input.modality)) {
    errors.push(...validateAttemptGroup("Derecha", input.rightAttempts));
    errors.push(...validateAttemptGroup("Izquierda", input.leftAttempts));
  }

  return errors;
}
