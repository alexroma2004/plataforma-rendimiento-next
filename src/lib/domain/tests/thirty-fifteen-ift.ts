export const THIRTY_FIFTEEN_IFT_TEST_ID = "30-15 IFT";
export const THIRTY_FIFTEEN_IFT_TEST_NAME = "30-15 IFT";
export const THIRTY_FIFTEEN_IFT_TEST_CATEGORY = "RESISTENCIA";
export const THIRTY_FIFTEEN_IFT_UNIT_SPEED = "km/h";
export const THIRTY_FIFTEEN_IFT_MIN_SPEED = 8;
export const THIRTY_FIFTEEN_IFT_SPEED_INCREMENT = 0.5;

export const THIRTY_FIFTEEN_IFT_VARIABLES = {
  LAST_COMPLETED_LEVEL: "30-15 IFT ULTIMO NIVEL COMPLETO",
  WITHDRAWAL_LEVEL: "30-15 IFT NIVEL ABANDONO",
  VIFT: "30-15 IFT VIFT",
} as const;

export type ThirtyFifteenIftFormState = {
  performedAt: string;
  lastCompletedLevel: string;
  withdrawalLevel: string;
  observations: string;
};

export type ThirtyFifteenIftSummary = {
  lastCompletedLevel: number | null;
  withdrawalLevel: number | null;
  vift: number | null;
  observations: string;
};

export type ThirtyFifteenIftValidationErrors = Partial<
  Record<"performedAt" | "lastCompletedLevel" | "withdrawalLevel", string>
>;

function normalizeSpeedInput(value: string | number | null | undefined) {
  return String(value ?? "").trim().replace(",", ".");
}

export function parseThirtyFifteenIftSpeed(
  value: string | number | null | undefined,
) {
  const normalized = normalizeSpeedInput(value);

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function isThirtyFifteenIftHalfStep(value: number) {
  const doubled = value * 2;

  return Math.abs(doubled - Math.round(doubled)) < 1e-9;
}

export function isValidThirtyFifteenIftSpeed(
  value: string | number | null | undefined,
) {
  const speed = parseThirtyFifteenIftSpeed(value);

  return (
    speed !== null &&
    speed >= THIRTY_FIFTEEN_IFT_MIN_SPEED &&
    isThirtyFifteenIftHalfStep(speed)
  );
}

export function calculateThirtyFifteenIftVift(
  lastCompletedLevel: string | number | null | undefined,
) {
  return isValidThirtyFifteenIftSpeed(lastCompletedLevel)
    ? parseThirtyFifteenIftSpeed(lastCompletedLevel)
    : null;
}

export function createThirtyFifteenIftSummary(
  form: ThirtyFifteenIftFormState,
): ThirtyFifteenIftSummary {
  const lastCompletedLevel = calculateThirtyFifteenIftVift(
    form.lastCompletedLevel,
  );
  const withdrawalLevel = isValidThirtyFifteenIftSpeed(form.withdrawalLevel)
    ? parseThirtyFifteenIftSpeed(form.withdrawalLevel)
    : null;

  return {
    lastCompletedLevel,
    withdrawalLevel,
    vift: lastCompletedLevel,
    observations: form.observations.trim(),
  };
}

export function validateThirtyFifteenIftForm(
  form: ThirtyFifteenIftFormState,
): ThirtyFifteenIftValidationErrors {
  const errors: ThirtyFifteenIftValidationErrors = {};
  const lastCompletedLevel = parseThirtyFifteenIftSpeed(
    form.lastCompletedLevel,
  );
  const withdrawalText = normalizeSpeedInput(form.withdrawalLevel);
  const withdrawalLevel = parseThirtyFifteenIftSpeed(form.withdrawalLevel);

  if (!form.performedAt) {
    errors.performedAt = "La fecha del test es obligatoria.";
  }

  if (lastCompletedLevel === null) {
    errors.lastCompletedLevel = "Introduce el último nivel completado.";
  } else if (lastCompletedLevel < THIRTY_FIFTEEN_IFT_MIN_SPEED) {
    errors.lastCompletedLevel = `El nivel debe ser igual o superior a ${THIRTY_FIFTEEN_IFT_MIN_SPEED} km/h.`;
  } else if (!isThirtyFifteenIftHalfStep(lastCompletedLevel)) {
    errors.lastCompletedLevel = "Usa valores enteros o incrementos de 0,5 km/h.";
  }

  if (withdrawalText) {
    if (withdrawalLevel === null) {
      errors.withdrawalLevel = "El nivel de abandono debe ser numérico.";
    } else if (withdrawalLevel < THIRTY_FIFTEEN_IFT_MIN_SPEED) {
      errors.withdrawalLevel = `El nivel debe ser igual o superior a ${THIRTY_FIFTEEN_IFT_MIN_SPEED} km/h.`;
    } else if (!isThirtyFifteenIftHalfStep(withdrawalLevel)) {
      errors.withdrawalLevel =
        "Usa valores enteros o incrementos de 0,5 km/h.";
    } else if (
      lastCompletedLevel !== null &&
      Math.round(withdrawalLevel * 2) !==
        Math.round(lastCompletedLevel * 2) +
          Math.round(THIRTY_FIFTEEN_IFT_SPEED_INCREMENT * 2)
    ) {
      errors.withdrawalLevel =
        "El abandono debe ser exactamente 0,5 km/h superior al último nivel completado.";
    }
  }

  return errors;
}
