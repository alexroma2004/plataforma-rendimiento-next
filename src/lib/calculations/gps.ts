import type {
  GpsCompliance,
  GpsMetricKey,
  GpsMetricTargetMap,
  GpsStatus,
} from "@/types";

import { GPS_METRICS } from "@/lib/constants/gps";

export function normalizeGpsMetricValue(
  metric: GpsMetricKey,
  value: number | null | undefined
): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  if (metric === "hsr" || metric === "distance_vrange6") {
    if (value > 0 && value < 10) {
      return value * 1000;
    }
  }

  return value;
}

export function percentOfReference(
  current: number | null | undefined,
  reference: number | null | undefined
): number | null {
  if (
    current === null ||
    current === undefined ||
    reference === null ||
    reference === undefined ||
    reference <= 0
  ) {
    return null;
  }

  return (current / reference) * 100;
}

export function classifyGpsStatus(
  percent: number | null | undefined,
  min: number,
  max: number
): GpsStatus {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return "Sin referencia";
  }

  if (percent < min) return "Bajo";
  if (percent > max) return "Alto";
  return "Adecuado";
}

export function calculateGpsCompliance(
  currentValues: Partial<Record<GpsMetricKey, number | null>>,
  referenceValues: Partial<Record<GpsMetricKey, number | null>>,
  targets: GpsMetricTargetMap
): GpsCompliance[] {
  return GPS_METRICS.map(({ key }) => {
    const currentValue = normalizeGpsMetricValue(key, currentValues[key]);
    const referenceValue = normalizeGpsMetricValue(key, referenceValues[key]);
    const target = targets[key];

    const percent = percentOfReference(currentValue, referenceValue);

    const targetMinAbsolute =
      referenceValue !== null && referenceValue !== undefined
        ? (referenceValue * target.min) / 100
        : null;

    const targetMaxAbsolute =
      referenceValue !== null && referenceValue !== undefined
        ? (referenceValue * target.max) / 100
        : null;

    const missingToMin =
      currentValue !== null &&
      currentValue !== undefined &&
      targetMinAbsolute !== null
        ? Math.max(0, targetMinAbsolute - currentValue)
        : null;

    const marginToMax =
      currentValue !== null &&
      currentValue !== undefined &&
      targetMaxAbsolute !== null
        ? targetMaxAbsolute - currentValue
        : null;

    return {
      metric: key,
      currentValue,
      referenceValue,
      percentOfReference: percent,
      targetMinPercent: target.min,
      targetMaxPercent: target.max,
      targetMinAbsolute,
      targetMaxAbsolute,
      missingToMin,
      marginToMax,
      status: classifyGpsStatus(percent, target.min, target.max),
    };
  });
}

export function gpsStatusClass(status: GpsStatus): string {
  if (status === "Adecuado") return "bg-emerald-100 text-emerald-700";
  if (status === "Bajo") return "bg-amber-100 text-amber-700";
  if (status === "Alto") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}