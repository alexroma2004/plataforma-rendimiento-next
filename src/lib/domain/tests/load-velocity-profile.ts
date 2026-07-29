export const LOAD_VELOCITY_PROFILE_TEST_ID = "PERFIL CARGA VELOCIDAD";
export const LOAD_VELOCITY_PROFILE_TEST_NAME = "PERFIL CARGA VELOCIDAD";
export const LOAD_VELOCITY_PROFILE_TEST_CATEGORY = "FUERZA";
export const LOAD_VELOCITY_PROFILE_DEVICE = "ADR ENCODER";

export const LOAD_VELOCITY_PROFILE_MIN_LOADS = 4;
export const LOAD_VELOCITY_PROFILE_MAX_LOADS = 8;
export const LOAD_VELOCITY_PROFILE_REPETITIONS = 3;

export const LOAD_VELOCITY_PROFILE_EXERCISES = [
  "SENTADILLA",
  "HIP THRUST",
] as const;

export type LoadVelocityExercise =
  (typeof LOAD_VELOCITY_PROFILE_EXERCISES)[number];

export const LOAD_VELOCITY_PROFILE_TARGET_SPEEDS: Record<
  LoadVelocityExercise,
  number
> = {
  SENTADILLA: 0.32,
  "HIP THRUST": 0.24,
};

export const LOAD_VELOCITY_PROFILE_VARIABLES = {
  LOAD_COUNT: "PERFIL CV NUMERO CARGAS",
  TARGET_SPEED: "PERFIL CV VELOCIDAD OBJETIVO 1RM",
  SLOPE: "PERFIL CV PENDIENTE",
  INTERCEPT: "PERFIL CV INTERCEPTO",
  R2: "PERFIL CV R2",
  ESTIMATED_1RM: "PERFIL CV 1RM ESTIMADA",
} as const;

export type LoadVelocityProfileRow = {
  loadKg: string;
  repetitions: [string, string, string];
};

export type LoadVelocityProfileFormState = {
  performedAt: string;
  exercise: LoadVelocityExercise;
  loads: LoadVelocityProfileRow[];
  observations: string;
};

export type ValidLoadVelocityRow = {
  index: number;
  loadKg: number;
  repetitions: [number, number, number];
  bestVmp: number;
};

export type LoadVelocityProfileSummary = {
  rows: ValidLoadVelocityRow[];
  targetSpeed: number;
  slope: number | null;
  intercept: number | null;
  r2: number | null;
  estimated1Rm: number | null;
  mathematicalError: string | null;
  warning: string | null;
  observations: string;
};

export type LoadVelocityProfileValidationErrors = {
  performedAt?: string;
  loads: Array<{
    loadKg?: string;
    repetitions?: string;
    duplicate?: string;
  }>;
};

const createEmptySummary = (
  rows: ValidLoadVelocityRow[],
  targetSpeed: number,
  observations: string,
) => ({ rows, targetSpeed, observations });

export const parseLoadVelocityNumber = (value: string): number | null => {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getLoadVelocityVariable = (
  index: number,
  field: "LOAD" | "REP1" | "REP2" | "REP3" | "BEST",
) => {
  const labels = {
    LOAD: "CARGA",
    REP1: "REPETICION 1 VMP",
    REP2: "REPETICION 2 VMP",
    REP3: "REPETICION 3 VMP",
    BEST: "MEJOR VMP",
  };

  return `PERFIL CV CARGA ${index + 1} ${labels[field]}`;
};

export function validateLoadVelocityProfile(
  form: LoadVelocityProfileFormState,
): LoadVelocityProfileValidationErrors {
  const errors: LoadVelocityProfileValidationErrors = {
    loads: form.loads.map(() => ({})),
  };

  if (!form.performedAt) {
    errors.performedAt = "La fecha del test es obligatoria.";
  }

  if (
    form.loads.length < LOAD_VELOCITY_PROFILE_MIN_LOADS ||
    form.loads.length > LOAD_VELOCITY_PROFILE_MAX_LOADS
  ) {
    errors.loads = form.loads.map(() => ({
      loadKg: "Registra entre 4 y 8 cargas.",
    }));
  }

  const seenLoads = new Set<number>();

  form.loads.forEach((row, index) => {
    const loadKg = parseLoadVelocityNumber(row.loadKg);

    if (loadKg === null || loadKg <= 0) {
      errors.loads[index].loadKg = "La carga debe ser numérica y mayor que 0.";
    } else if (seenLoads.has(loadKg)) {
      errors.loads[index].duplicate = "Las cargas deben ser distintas.";
    } else {
      seenLoads.add(loadKg);
    }

    const hasInvalidRepetition = row.repetitions.some((repetition) => {
      const vmp = parseLoadVelocityNumber(repetition);
      return vmp === null || vmp <= 0;
    });

    if (hasInvalidRepetition) {
      errors.loads[index].repetitions =
        "Registra tres VMP numéricas y mayores que 0.";
    }
  });

  return errors;
}

export function createLoadVelocityProfileSummary(
  form: LoadVelocityProfileFormState,
): LoadVelocityProfileSummary {
  const targetSpeed = LOAD_VELOCITY_PROFILE_TARGET_SPEEDS[form.exercise];
  const rows = form.loads.flatMap((row, index) => {
    const loadKg = parseLoadVelocityNumber(row.loadKg);
    const repetitions = row.repetitions.map(parseLoadVelocityNumber);
    const hasValidValues =
      loadKg !== null &&
      loadKg > 0 &&
      repetitions.every((value) => value !== null && value > 0);

    if (!hasValidValues) return [];

    const validRepetitions = repetitions as [number, number, number];

    return [
      {
        index,
        loadKg,
        repetitions: validRepetitions,
        bestVmp: Math.max(...validRepetitions),
      },
    ];
  });

  const base = createEmptySummary(
    rows,
    targetSpeed,
    form.observations.trim(),
  );

  if (rows.length < LOAD_VELOCITY_PROFILE_MIN_LOADS) {
    return {
      ...base,
      slope: null,
      intercept: null,
      r2: null,
      estimated1Rm: null,
      mathematicalError:
        "Completa entre 4 y 8 cargas válidas para calcular el perfil.",
      warning: null,
    };
  }

  const meanX =
    rows.reduce((sum, row) => sum + row.loadKg, 0) / rows.length;
  const meanY =
    rows.reduce((sum, row) => sum + row.bestVmp, 0) / rows.length;
  const ssX = rows.reduce(
    (sum, row) => sum + (row.loadKg - meanX) ** 2,
    0,
  );

  if (ssX === 0) {
    return {
      ...base,
      slope: null,
      intercept: null,
      r2: null,
      estimated1Rm: null,
      mathematicalError: "La varianza de las cargas no puede ser cero.",
      warning: null,
    };
  }

  const slope =
    rows.reduce(
      (sum, row) =>
        sum + (row.loadKg - meanX) * (row.bestVmp - meanY),
      0,
    ) / ssX;
  const intercept = meanY - slope * meanX;
  const predictVmp = (loadKg: number) => slope * loadKg + intercept;
  const ssTotal = rows.reduce(
    (sum, row) => sum + (row.bestVmp - meanY) ** 2,
    0,
  );
  const ssResidual = rows.reduce(
    (sum, row) => sum + (row.bestVmp - predictVmp(row.loadKg)) ** 2,
    0,
  );
  const r2 = ssTotal === 0 ? null : 1 - ssResidual / ssTotal;
  const estimated1Rm = (targetSpeed - intercept) / slope;
  const maximumLoad = Math.max(...rows.map((row) => row.loadKg));

  if (slope >= 0) {
    return {
      ...base,
      slope,
      intercept,
      r2,
      estimated1Rm: null,
      mathematicalError:
        "La velocidad debe disminuir conforme aumenta la carga para estimar el 1RM.",
      warning: null,
    };
  }

  if (!Number.isFinite(estimated1Rm) || estimated1Rm <= 0) {
    return {
      ...base,
      slope,
      intercept,
      r2,
      estimated1Rm: null,
      mathematicalError: "La estimación de 1RM no es válida.",
      warning: null,
    };
  }

  return {
    ...base,
    slope,
    intercept,
    r2,
    estimated1Rm,
    mathematicalError: null,
    warning:
      estimated1Rm < maximumLoad
        ? "La 1RM estimada queda por debajo de la carga máxima introducida."
        : null,
  };
}

export type LoadVelocityProfileResult = {
  variable: string;
  value: number;
  unit: string;
};

export function createLoadVelocityProfileResults(
  summary: LoadVelocityProfileSummary,
): LoadVelocityProfileResult[] {
  if (
    summary.slope === null ||
    summary.intercept === null ||
    summary.r2 === null ||
    summary.estimated1Rm === null
  ) {
    return [];
  }

  const rows = summary.rows.flatMap((row) => [
    {
      variable: getLoadVelocityVariable(row.index, "LOAD"),
      value: row.loadKg,
      unit: "kg",
    },
    {
      variable: getLoadVelocityVariable(row.index, "REP1"),
      value: row.repetitions[0],
      unit: "m/s",
    },
    {
      variable: getLoadVelocityVariable(row.index, "REP2"),
      value: row.repetitions[1],
      unit: "m/s",
    },
    {
      variable: getLoadVelocityVariable(row.index, "REP3"),
      value: row.repetitions[2],
      unit: "m/s",
    },
    {
      variable: getLoadVelocityVariable(row.index, "BEST"),
      value: row.bestVmp,
      unit: "m/s",
    },
  ]);

  return [
    ...rows,
    {
      variable: LOAD_VELOCITY_PROFILE_VARIABLES.LOAD_COUNT,
      value: summary.rows.length,
      unit: "cargas",
    },
    {
      variable: LOAD_VELOCITY_PROFILE_VARIABLES.TARGET_SPEED,
      value: summary.targetSpeed,
      unit: "m/s",
    },
    {
      variable: LOAD_VELOCITY_PROFILE_VARIABLES.SLOPE,
      value: summary.slope,
      unit: "(m/s)/kg",
    },
    {
      variable: LOAD_VELOCITY_PROFILE_VARIABLES.INTERCEPT,
      value: summary.intercept,
      unit: "m/s",
    },
    {
      variable: LOAD_VELOCITY_PROFILE_VARIABLES.R2,
      value: summary.r2,
      unit: "ratio",
    },
    {
      variable: LOAD_VELOCITY_PROFILE_VARIABLES.ESTIMATED_1RM,
      value: summary.estimated1Rm,
      unit: "kg",
    },
  ];
}
