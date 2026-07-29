export const VERTICAL_FORCE_VELOCITY_TEST_ID = "PERFIL FUERZA VELOCIDAD";
export const VERTICAL_FORCE_VELOCITY_TEST_NAME = "PERFIL FUERZA VELOCIDAD";
export const VERTICAL_FORCE_VELOCITY_TEST_CATEGORY = "FUERZA";
export const VERTICAL_FORCE_VELOCITY_PROTOCOL = "SQUAT JUMP CON CARGAS";
export const VERTICAL_FORCE_VELOCITY_DEVICE = "MY JUMP LAB";
export const VERTICAL_FORCE_VELOCITY_GRAVITY = 9.81;
export const VERTICAL_FORCE_VELOCITY_MIN_CONDITIONS = 4;
export const VERTICAL_FORCE_VELOCITY_MAX_CONDITIONS = 8;
export const VERTICAL_FORCE_VELOCITY_ATTEMPTS = 3;

export const VERTICAL_FORCE_VELOCITY_VARIABLES = {
  BODY_MASS: "PERFIL FV PESO CORPORAL",
  PUSH_OFF_DISTANCE: "PERFIL FV DISTANCIA EMPUJE",
  CONDITION_COUNT: "PERFIL FV NUMERO CONDICIONES",
  SLOPE: "PERFIL FV PENDIENTE",
  INTERCEPT: "PERFIL FV INTERCEPTO",
  F0: "PERFIL FV F0",
  F0_RELATIVE: "PERFIL FV F0 RELATIVA",
  V0: "PERFIL FV V0",
  PMAX: "PERFIL FV PMAX",
  PMAX_RELATIVE: "PERFIL FV PMAX RELATIVA",
  SLOPE_RELATIVE: "PERFIL FV PENDIENTE RELATIVA",
  R2: "PERFIL FV R2",
} as const;

export type VerticalForceVelocityConditionInput = {
  externalLoadKg: string;
  jumpHeightsCm: [string, string, string];
};

export type VerticalForceVelocityFormState = {
  performedAt: string;
  bodyMassKg: string;
  pushOffDistanceCm: string;
  conditions: VerticalForceVelocityConditionInput[];
  observations: string;
};

export type VerticalForceVelocityCondition = {
  index: number;
  externalLoadKg: number;
  systemMassKg: number;
  jumpHeightsCm: [number, number, number];
  bestHeightCm: number;
  meanForceN: number;
  meanVelocityMs: number;
  meanPowerW: number;
};

export type VerticalForceVelocitySummary = {
  bodyMassKg: number | null;
  pushOffDistanceCm: number | null;
  conditions: VerticalForceVelocityCondition[];
  slope: number | null;
  intercept: number | null;
  r2: number | null;
  f0N: number | null;
  f0Relative: number | null;
  v0Ms: number | null;
  pmaxW: number | null;
  pmaxRelative: number | null;
  slopeRelative: number | null;
  mathematicalError: string | null;
  warnings: string[];
  observations: string;
};

export type VerticalForceVelocityValidationErrors = {
  performedAt?: string;
  bodyMassKg?: string;
  pushOffDistanceCm?: string;
  conditions: Array<{
    externalLoadKg?: string;
    jumpHeightsCm?: string;
    duplicate?: string;
  }>;
  conditionsMessage?: string;
};

export type VerticalForceVelocityResult = {
  variable: string;
  value: number;
  unit: string;
};

const isFinitePositive = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value > 0;
const DECIMAL_NUMBER_PATTERN = /^\d+(?:[.,]\d+)?$/;

export function parseVerticalForceVelocityNumber(value: string): number | null {
  const rawValue = value.trim();

  if (!DECIMAL_NUMBER_PATTERN.test(rawValue)) return null;

  const normalized = rawValue.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getVerticalForceVelocityConditionVariable(
  index: number,
  field:
    | "EXTERNAL_LOAD"
    | "SYSTEM_MASS"
    | "HEIGHT_1"
    | "HEIGHT_2"
    | "HEIGHT_3"
    | "BEST_HEIGHT"
    | "MEAN_FORCE"
    | "MEAN_VELOCITY"
    | "MEAN_POWER",
) {
  const condition = index + 1;
  const labels = {
    EXTERNAL_LOAD: `PERFIL FV CARGA EXTERNA ${condition}`,
    SYSTEM_MASS: `PERFIL FV MASA SISTEMA ${condition}`,
    HEIGHT_1: `PERFIL FV CARGA ${condition} ALTURA INTENTO 1`,
    HEIGHT_2: `PERFIL FV CARGA ${condition} ALTURA INTENTO 2`,
    HEIGHT_3: `PERFIL FV CARGA ${condition} ALTURA INTENTO 3`,
    BEST_HEIGHT: `PERFIL FV CARGA ${condition} MEJOR ALTURA`,
    MEAN_FORCE: `PERFIL FV CARGA ${condition} FUERZA MEDIA`,
    MEAN_VELOCITY: `PERFIL FV CARGA ${condition} VELOCIDAD MEDIA`,
    MEAN_POWER: `PERFIL FV CARGA ${condition} POTENCIA MEDIA`,
  };

  return labels[field];
}

export function validateVerticalForceVelocityForm(
  form: VerticalForceVelocityFormState,
): VerticalForceVelocityValidationErrors {
  const errors: VerticalForceVelocityValidationErrors = {
    conditions: form.conditions.map(() => ({})),
  };
  const bodyMassKg = parseVerticalForceVelocityNumber(form.bodyMassKg);
  const pushOffDistanceCm = parseVerticalForceVelocityNumber(
    form.pushOffDistanceCm,
  );

  if (!form.performedAt) {
    errors.performedAt = "La fecha del test es obligatoria.";
  }

  if (!isFinitePositive(bodyMassKg)) {
    errors.bodyMassKg = "El peso corporal debe ser numérico y mayor que 0.";
  }

  if (!isFinitePositive(pushOffDistanceCm)) {
    errors.pushOffDistanceCm =
      "La distancia de empuje debe ser numérica y mayor que 0.";
  }

  if (
    form.conditions.length < VERTICAL_FORCE_VELOCITY_MIN_CONDITIONS ||
    form.conditions.length > VERTICAL_FORCE_VELOCITY_MAX_CONDITIONS
  ) {
    errors.conditionsMessage = "Registra entre 4 y 8 condiciones de carga.";
  }

  const seenLoads = new Set<number>();
  let zeroLoadCount = 0;
  let positiveLoadCount = 0;

  form.conditions.forEach((condition, index) => {
    const externalLoadKg = parseVerticalForceVelocityNumber(
      condition.externalLoadKg,
    );

    if (externalLoadKg === null || externalLoadKg < 0) {
      errors.conditions[index].externalLoadKg =
        "La carga externa debe ser numérica y no negativa.";
    } else if (seenLoads.has(externalLoadKg)) {
      errors.conditions[index].duplicate = "Las cargas externas deben ser distintas.";
    } else {
      seenLoads.add(externalLoadKg);
      if (externalLoadKg === 0) zeroLoadCount += 1;
      if (externalLoadKg > 0) positiveLoadCount += 1;
    }

    const hasInvalidHeight = condition.jumpHeightsCm.some(
      (height) => !isFinitePositive(parseVerticalForceVelocityNumber(height)),
    );

    if (hasInvalidHeight) {
      errors.conditions[index].jumpHeightsCm =
        "Registra tres alturas numéricas y mayores que 0.";
    }
  });

  if (zeroLoadCount !== 1) {
    errors.conditionsMessage =
      "Debe existir exactamente una condición con 0 kg de carga externa.";
  } else if (positiveLoadCount < 3) {
    errors.conditionsMessage =
      "Registra al menos tres condiciones con carga externa mayor que 0 kg.";
  }

  return errors;
}

function createInvalidSummary(
  bodyMassKg: number | null,
  pushOffDistanceCm: number | null,
  conditions: VerticalForceVelocityCondition[],
  observations: string,
  mathematicalError: string,
): VerticalForceVelocitySummary {
  return {
    bodyMassKg,
    pushOffDistanceCm,
    conditions,
    slope: null,
    intercept: null,
    r2: null,
    f0N: null,
    f0Relative: null,
    v0Ms: null,
    pmaxW: null,
    pmaxRelative: null,
    slopeRelative: null,
    mathematicalError,
    warnings: [],
    observations,
  };
}

export function createVerticalForceVelocitySummary(
  form: VerticalForceVelocityFormState,
): VerticalForceVelocitySummary {
  const bodyMassKg = parseVerticalForceVelocityNumber(form.bodyMassKg);
  const pushOffDistanceCm = parseVerticalForceVelocityNumber(
    form.pushOffDistanceCm,
  );
  const observations = form.observations.trim();

  if (!isFinitePositive(bodyMassKg) || !isFinitePositive(pushOffDistanceCm)) {
    return createInvalidSummary(
      bodyMassKg,
      pushOffDistanceCm,
      [],
      observations,
      "Completa un peso corporal y una distancia de empuje válidos.",
    );
  }

  const pushOffDistanceM = pushOffDistanceCm / 100;
  const conditions = form.conditions.flatMap((condition, index) => {
    const externalLoadKg = parseVerticalForceVelocityNumber(
      condition.externalLoadKg,
    );
    const jumpHeightsCm = condition.jumpHeightsCm.map(
      parseVerticalForceVelocityNumber,
    );

    if (
      externalLoadKg === null ||
      externalLoadKg < 0 ||
      jumpHeightsCm.some((height) => !isFinitePositive(height))
    ) {
      return [];
    }

    const validHeights = jumpHeightsCm as [number, number, number];
    const bestHeightCm = Math.max(...validHeights);
    const jumpHeightM = bestHeightCm / 100;
    const systemMassKg = bodyMassKg + externalLoadKg;
    const meanForceN =
      systemMassKg *
      VERTICAL_FORCE_VELOCITY_GRAVITY *
      (jumpHeightM / pushOffDistanceM + 1);
    const meanVelocityMs = Math.sqrt(
      (VERTICAL_FORCE_VELOCITY_GRAVITY * jumpHeightM) / 2,
    );
    const meanPowerW = meanForceN * meanVelocityMs;

    if (
      !Number.isFinite(systemMassKg) ||
      !Number.isFinite(meanForceN) ||
      !Number.isFinite(meanVelocityMs) ||
      !Number.isFinite(meanPowerW) ||
      systemMassKg <= 0 ||
      meanForceN <= 0 ||
      meanVelocityMs <= 0 ||
      meanPowerW <= 0
    ) {
      return [];
    }

    return [
      {
        index,
        externalLoadKg,
        systemMassKg,
        jumpHeightsCm: validHeights,
        bestHeightCm,
        meanForceN,
        meanVelocityMs,
        meanPowerW,
      },
    ];
  });

  if (conditions.length < VERTICAL_FORCE_VELOCITY_MIN_CONDITIONS) {
    return createInvalidSummary(
      bodyMassKg,
      pushOffDistanceCm,
      conditions,
      observations,
      "Completa entre 4 y 8 condiciones válidas para calcular el perfil.",
    );
  }

  const meanVelocity =
    conditions.reduce((sum, condition) => sum + condition.meanVelocityMs, 0) /
    conditions.length;
  const meanForce =
    conditions.reduce((sum, condition) => sum + condition.meanForceN, 0) /
    conditions.length;
  const velocityVariance = conditions.reduce(
    (sum, condition) =>
      sum + (condition.meanVelocityMs - meanVelocity) ** 2,
    0,
  );

  if (velocityVariance === 0) {
    return createInvalidSummary(
      bodyMassKg,
      pushOffDistanceCm,
      conditions,
      observations,
      "La varianza de las velocidades no puede ser cero.",
    );
  }

  const slope =
    conditions.reduce(
      (sum, condition) =>
        sum +
        (condition.meanVelocityMs - meanVelocity) *
          (condition.meanForceN - meanForce),
      0,
    ) / velocityVariance;
  const intercept = meanForce - slope * meanVelocity;
  const predictForce = (velocityMs: number) => slope * velocityMs + intercept;
  const ssTotal = conditions.reduce(
    (sum, condition) => sum + (condition.meanForceN - meanForce) ** 2,
    0,
  );
  const ssResidual = conditions.reduce(
    (sum, condition) =>
      sum + (condition.meanForceN - predictForce(condition.meanVelocityMs)) ** 2,
    0,
  );
  const r2 = ssTotal === 0 ? null : 1 - ssResidual / ssTotal;
  const f0N = intercept;
  const v0Ms = -f0N / slope;
  const pmaxW = (f0N * v0Ms) / 4;
  const f0Relative = f0N / bodyMassKg;
  const pmaxRelative = pmaxW / bodyMassKg;
  const slopeRelative = slope / bodyMassKg;

  if (
    !Number.isFinite(slope) ||
    !Number.isFinite(intercept) ||
    slope >= 0 ||
    !Number.isFinite(f0N) ||
    f0N <= 0 ||
    !Number.isFinite(v0Ms) ||
    v0Ms <= 0 ||
    !Number.isFinite(pmaxW) ||
    pmaxW <= 0 ||
    !Number.isFinite(f0Relative) ||
    !Number.isFinite(pmaxRelative) ||
    !Number.isFinite(slopeRelative) ||
    r2 === null ||
    !Number.isFinite(r2)
  ) {
    return {
      bodyMassKg,
      pushOffDistanceCm,
      conditions,
      slope: Number.isFinite(slope) ? slope : null,
      intercept: Number.isFinite(intercept) ? intercept : null,
      r2: Number.isFinite(r2) ? r2 : null,
      f0N: Number.isFinite(f0N) && f0N > 0 ? f0N : null,
      f0Relative: Number.isFinite(f0Relative) ? f0Relative : null,
      v0Ms: Number.isFinite(v0Ms) && v0Ms > 0 ? v0Ms : null,
      pmaxW: Number.isFinite(pmaxW) && pmaxW > 0 ? pmaxW : null,
      pmaxRelative: Number.isFinite(pmaxRelative) ? pmaxRelative : null,
      slopeRelative: Number.isFinite(slopeRelative) ? slopeRelative : null,
      mathematicalError:
        r2 === null
          ? "R² no está definido para este perfil."
          : "El perfil fuerza–velocidad no cumple las condiciones matemáticas requeridas.",
      warnings: [],
      observations,
    };
  }

  const conditionsByVelocity = conditions
    .slice()
    .sort((first, second) => first.meanVelocityMs - second.meanVelocityMs);
  const forceDoesNotDecreaseProgressively = conditionsByVelocity.some(
    (condition, index) =>
      index > 0 &&
      condition.meanForceN > conditionsByVelocity[index - 1].meanForceN,
  );
  const maximumResidual = Math.max(
    ...conditions.map((condition) =>
      Math.abs(condition.meanForceN - predictForce(condition.meanVelocityMs)),
    ),
  );
  const warnings = [
    ...(forceDoesNotDecreaseProgressively
      ? ["La fuerza no desciende de forma progresiva al aumentar la velocidad."]
      : []),
    ...(maximumResidual > meanForce * 0.1
      ? ["Hay puntos con una separación visual apreciable respecto a la recta."]
      : []),
    ...(r2 < 0.9
      ? ["El R² muestra dispersión respecto a la relación lineal calculada."]
      : []),
  ];

  return {
    bodyMassKg,
    pushOffDistanceCm,
    conditions,
    slope,
    intercept,
    r2,
    f0N,
    f0Relative,
    v0Ms,
    pmaxW,
    pmaxRelative,
    slopeRelative,
    mathematicalError: null,
    warnings,
    observations,
  };
}

export function createVerticalForceVelocityResults(
  summary: VerticalForceVelocitySummary,
): VerticalForceVelocityResult[] {
  if (
    summary.bodyMassKg === null ||
    summary.pushOffDistanceCm === null ||
    summary.slope === null ||
    summary.intercept === null ||
    summary.r2 === null ||
    summary.f0N === null ||
    summary.f0Relative === null ||
    summary.v0Ms === null ||
    summary.pmaxW === null ||
    summary.pmaxRelative === null ||
    summary.slopeRelative === null ||
    summary.mathematicalError !== null
  ) {
    return [];
  }

  const conditionResults = summary.conditions.flatMap((condition) => [
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "EXTERNAL_LOAD"), value: condition.externalLoadKg, unit: "kg" },
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "SYSTEM_MASS"), value: condition.systemMassKg, unit: "kg" },
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "HEIGHT_1"), value: condition.jumpHeightsCm[0], unit: "cm" },
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "HEIGHT_2"), value: condition.jumpHeightsCm[1], unit: "cm" },
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "HEIGHT_3"), value: condition.jumpHeightsCm[2], unit: "cm" },
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "BEST_HEIGHT"), value: condition.bestHeightCm, unit: "cm" },
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "MEAN_FORCE"), value: condition.meanForceN, unit: "N" },
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "MEAN_VELOCITY"), value: condition.meanVelocityMs, unit: "m/s" },
    { variable: getVerticalForceVelocityConditionVariable(condition.index, "MEAN_POWER"), value: condition.meanPowerW, unit: "W" },
  ]);

  return [
    ...conditionResults,
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.BODY_MASS, value: summary.bodyMassKg, unit: "kg" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.PUSH_OFF_DISTANCE, value: summary.pushOffDistanceCm, unit: "cm" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.CONDITION_COUNT, value: summary.conditions.length, unit: "condiciones" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.SLOPE, value: summary.slope, unit: "N·s/m" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.INTERCEPT, value: summary.intercept, unit: "N" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.F0, value: summary.f0N, unit: "N" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.F0_RELATIVE, value: summary.f0Relative, unit: "N/kg" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.V0, value: summary.v0Ms, unit: "m/s" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.PMAX, value: summary.pmaxW, unit: "W" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.PMAX_RELATIVE, value: summary.pmaxRelative, unit: "W/kg" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.SLOPE_RELATIVE, value: summary.slopeRelative, unit: "N·s/(m·kg)" },
    { variable: VERTICAL_FORCE_VELOCITY_VARIABLES.R2, value: summary.r2, unit: "ratio" },
  ];
}
