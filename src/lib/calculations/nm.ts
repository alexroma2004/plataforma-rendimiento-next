import type { RiskLabel } from "@/types";

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    return null;
  }

  if (typeof value === "string") {
    const clean = value
      .trim()
      .replace(",", ".")
      .replace("#DIV/0!", "")
      .replace("#¡DIV/0!", "")
      .replace("DIV/0", "")
      .replace("-", "");

    if (!clean) return null;

    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function percentChange(
  current: number | null | undefined,
  baseline: number | null | undefined
): number | null {
  if (
    current === null ||
    current === undefined ||
    baseline === null ||
    baseline === undefined ||
    baseline === 0
  ) {
    return null;
  }

  return ((current - baseline) / baseline) * 100;
}

export function classifyNeuromuscularChange(
  percent: number | null | undefined
): RiskLabel {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return "Sin referencia";
  }

  if (percent >= -2.5) return "Buen estado";
  if (percent >= -5) return "Fatiga leve";
  if (percent >= -10) return "Fatiga moderada";
  return "Fatiga crítica";
}

export function objectiveLossScore(
  changes: Array<number | null | undefined>
): number | null {
  const validLosses = changes
    .filter((value): value is number => {
      return typeof value === "number" && Number.isFinite(value);
    })
    .map((value) => Math.max(0, -value));

  if (validLosses.length === 0) return null;

  const total = validLosses.reduce((acc, value) => acc + value, 0);
  return total / validLosses.length;
}

export function readinessFromLoss(
  lossScore: number | null | undefined,
  factor = 5
): number | null {
  if (lossScore === null || lossScore === undefined || Number.isNaN(lossScore)) {
    return null;
  }

  const readiness = 100 - lossScore * factor;
  return Math.max(0, Math.min(100, readiness));
}

export function classifyReadiness(readiness: number | null | undefined): string {
  if (readiness === null || readiness === undefined || Number.isNaN(readiness)) {
    return "Sin dato";
  }

  if (readiness >= 90) return "Muy buen estado";
  if (readiness >= 80) return "Buen estado";
  if (readiness >= 70) return "Alerta leve";
  if (readiness >= 60) return "Alerta moderada";
  return "Alerta alta";
}

export function estimateSquat1RM(
  loadKg: number | null | undefined,
  vmp: number | null | undefined
): {
  percent1RM: number | null;
  estimated1RM: number | null;
} {
  if (
    loadKg === null ||
    loadKg === undefined ||
    vmp === null ||
    vmp === undefined ||
    loadKg <= 0 ||
    vmp <= 0
  ) {
    return {
      percent1RM: null,
      estimated1RM: null,
    };
  }

  const percent1RM = -5.961 * vmp ** 2 - 50.71 * vmp + 117.0;

  if (!Number.isFinite(percent1RM) || percent1RM <= 0) {
    return {
      percent1RM: null,
      estimated1RM: null,
    };
  }

  const estimated1RM = loadKg / (percent1RM / 100);

  return {
    percent1RM,
    estimated1RM,
  };
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 1,
  fallback = "—"
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return value.toFixed(decimals);
}