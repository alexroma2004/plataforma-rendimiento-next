export type GpsObjectiveMetricKey =
  | "total_distance"
  | "hsr"
  | "distance_vrange6"
  | "sprints"
  | "num_acc"
  | "num_dec";

export type MicrocycleKey =
  | "MD+1"
  | "MD+2"
  | "MD-4"
  | "MD-3"
  | "MD-2"
  | "MD-1"
  | "PARTIDO";

export type ObjectiveStatus = "low" | "ok" | "high";

export type GpsObjectiveRange = {
  minPercent: number;
  targetPercent: number;
  maxPercent: number;
};

export type GpsMicrocycleObjective = {
  key: MicrocycleKey;
  label: string;
  description: string;
  metrics: Record<GpsObjectiveMetricKey, GpsObjectiveRange>;
};

export const GPS_MATCH_REFERENCE: Record<GpsObjectiveMetricKey, number> = {
  total_distance: 11040,
  hsr: 567,
  distance_vrange6: 186,
  sprints: 11,
  num_acc: 129,
  num_dec: 120,
};

function range(
  minPercent: number,
  targetPercent: number,
  maxPercent: number,
): GpsObjectiveRange {
  return {
    minPercent,
    targetPercent,
    maxPercent,
  };
}

export const GPS_MICROCYCLE_OBJECTIVES: Record<
  MicrocycleKey,
  GpsMicrocycleObjective
> = {
  "MD+1": {
    key: "MD+1",
    label: "MD+1",
    description:
      "Día posterior al partido. Puede representar recuperación para titulares o compensatorio para suplentes.",
    metrics: {
      total_distance: range(35, 50, 65),
      hsr: range(20, 35, 50),
      distance_vrange6: range(10, 25, 40),
      sprints: range(10, 25, 40),
      num_acc: range(25, 40, 60),
      num_dec: range(25, 40, 60),
    },
  },

  "MD+2": {
    key: "MD+2",
    label: "MD+2",
    description:
      "Día de baja carga o recuperación. El objetivo es mantener estímulo sin acumular fatiga excesiva.",
    metrics: {
      total_distance: range(20, 30, 40),
      hsr: range(5, 15, 25),
      distance_vrange6: range(0, 8, 18),
      sprints: range(0, 8, 18),
      num_acc: range(10, 20, 35),
      num_dec: range(10, 20, 35),
    },
  },

  "MD-4": {
    key: "MD-4",
    label: "MD-4",
    description:
      "Día de mayor carga del microciclo. Objetivo alto de volumen, aceleraciones y deceleraciones.",
    metrics: {
      total_distance: range(55, 70, 85),
      hsr: range(40, 55, 75),
      distance_vrange6: range(25, 45, 65),
      sprints: range(25, 45, 65),
      num_acc: range(50, 70, 90),
      num_dec: range(50, 70, 90),
    },
  },

  "MD-3": {
    key: "MD-3",
    label: "MD-3",
    description:
      "Día orientado a estímulos intensos, desplazamientos horizontales y acciones de alta velocidad.",
    metrics: {
      total_distance: range(45, 60, 75),
      hsr: range(40, 60, 80),
      distance_vrange6: range(35, 55, 75),
      sprints: range(35, 55, 75),
      num_acc: range(35, 55, 75),
      num_dec: range(35, 55, 75),
    },
  },

  "MD-2": {
    key: "MD-2",
    label: "MD-2",
    description:
      "Día de carga moderada. Se busca mantener intensidad sin acercarse demasiado a demandas de partido.",
    metrics: {
      total_distance: range(30, 45, 60),
      hsr: range(20, 35, 50),
      distance_vrange6: range(15, 30, 45),
      sprints: range(15, 30, 45),
      num_acc: range(20, 35, 50),
      num_dec: range(20, 35, 50),
    },
  },

  "MD-1": {
    key: "MD-1",
    label: "MD-1",
    description:
      "Día previo al partido. Objetivo bajo-moderado, con estímulo de activación y mínima fatiga residual.",
    metrics: {
      total_distance: range(15, 25, 35),
      hsr: range(5, 15, 25),
      distance_vrange6: range(5, 12, 22),
      sprints: range(5, 12, 22),
      num_acc: range(8, 18, 30),
      num_dec: range(8, 18, 30),
    },
  },

  PARTIDO: {
    key: "PARTIDO",
    label: "Partido",
    description:
      "Referencia competitiva. El objetivo se sitúa alrededor del 100% de la demanda media de partido.",
    metrics: {
      total_distance: range(85, 100, 115),
      hsr: range(85, 100, 115),
      distance_vrange6: range(85, 100, 115),
      sprints: range(85, 100, 115),
      num_acc: range(85, 100, 115),
      num_dec: range(85, 100, 115),
    },
  },
};

export function normalizeMicrocycleKey(value: string | null | undefined): MicrocycleKey {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (normalized === "MD+1") return "MD+1";
  if (normalized === "MD+2") return "MD+2";
  if (normalized === "MD-4") return "MD-4";
  if (normalized === "MD-3") return "MD-3";
  if (normalized === "MD-2") return "MD-2";
  if (normalized === "MD-1") return "MD-1";
  if (normalized === "PARTIDO" || normalized === "MATCH") return "PARTIDO";

  return "MD-1";
}

export function getGpsObjectiveForMicrocycle(
  microcycle: string | null | undefined,
): GpsMicrocycleObjective {
  const key = normalizeMicrocycleKey(microcycle);
  return GPS_MICROCYCLE_OBJECTIVES[key];
}

export function getMetricReference(metric: GpsObjectiveMetricKey): number {
  return GPS_MATCH_REFERENCE[metric] ?? 0;
}

export function getObjectiveValue(
  metric: GpsObjectiveMetricKey,
  microcycle: string | null | undefined,
): number {
  const reference = getMetricReference(metric);
  const objective = getGpsObjectiveForMicrocycle(microcycle);

  return reference * (objective.metrics[metric].targetPercent / 100);
}

export function getMetricMatchPercent(
  value: number | null | undefined,
  metric: GpsObjectiveMetricKey,
): number {
  const reference = getMetricReference(metric);

  if (!reference) return 0;

  return (Number(value ?? 0) / reference) * 100;
}

export function getObjectiveStatus(params: {
  value: number | null | undefined;
  metric: GpsObjectiveMetricKey;
  microcycle: string | null | undefined;
}) {
  const { value, metric, microcycle } = params;

  const objective = getGpsObjectiveForMicrocycle(microcycle);
  const range = objective.metrics[metric];
  const percent = getMetricMatchPercent(value, metric);

  let status: ObjectiveStatus = "ok";

  if (percent < range.minPercent) {
    status = "low";
  } else if (percent > range.maxPercent) {
    status = "high";
  }

  const label =
    status === "low"
      ? "Bajo"
      : status === "high"
        ? "Alto"
        : "Adecuado";

  return {
    status,
    label,
    percent,
    minPercent: range.minPercent,
    targetPercent: range.targetPercent,
    maxPercent: range.maxPercent,
    differenceToTarget: percent - range.targetPercent,
  };
}