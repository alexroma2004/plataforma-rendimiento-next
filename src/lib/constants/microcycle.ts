import type { MicrocycleDay } from "@/types";

export const MICROCYCLE_DAYS: MicrocycleDay[] = [
  "MD+1",
  "MD+2",
  "MD-4",
  "MD-3",
  "MD-2",
  "MD-1",
  "PARTIDO",
];

export const BASELINE_MICROCYCLES: MicrocycleDay[] = [
  "MD-4",
  "MD-3",
  "MD-2",
  "MD-1",
];

export const EXCLUDED_BASELINE_MICROCYCLES: MicrocycleDay[] = [
  "MD+1",
  "MD+2",
  "PARTIDO",
];

export function isBaselineMicrocycle(day: string | null | undefined): boolean {
  if (!day) return false;
  return BASELINE_MICROCYCLES.includes(day as MicrocycleDay);
}

export function formatMicrocycleLabel(day: MicrocycleDay): string {
  if (day === "PARTIDO") return "Partido";
  return day;
}