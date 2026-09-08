import type {
  NeuromuscularTeamFatigueStatus,
  NeuromuscularTeamMetricSnapshot,
} from "@/lib/domain/neuromuscular-team";

export const NEUROMUSCULAR_STATUS_VISUALS = {
  OPTIMAL: { label: "Óptimo", chartColor: "#16a34a", textClass: "text-green-950" },
  GOOD: { label: "Bueno", chartColor: "#4ade80", textClass: "text-green-950" },
  MILD: { label: "Fatiga leve", chartColor: "#f59e0b", textClass: "text-amber-950" },
  MODERATE: { label: "Fatiga moderada", chartColor: "#f97316", textClass: "text-orange-950" },
  CRITICAL: { label: "Fatiga crítica", chartColor: "#dc2626", textClass: "text-red-950" },
} satisfies Record<NeuromuscularTeamFatigueStatus, {
  label: string;
  chartColor: string;
  textClass: string;
}>;

export const NEUROMUSCULAR_STATUS_ORDER: readonly NeuromuscularTeamFatigueStatus[] = [
  "OPTIMAL", "GOOD", "MILD", "MODERATE", "CRITICAL",
];

// Visual mapping of an existing score; sporting thresholds remain in the domain.
export function getNeuromuscularMetricStatus(
  lossScore: NeuromuscularTeamMetricSnapshot["lossScore"],
  percentChange: number | null,
): NeuromuscularTeamFatigueStatus | null {
  if (percentChange === null || !Number.isFinite(percentChange)) return null;
  switch (lossScore) {
    case 0: return percentChange >= 0 ? "OPTIMAL" : "GOOD";
    case 1: return "MILD";
    case 2: return "MODERATE";
    case 3: return "CRITICAL";
    default: return null;
  }
}

export function getNeuromuscularCellBackground(status: NeuromuscularTeamFatigueStatus) {
  return `color-mix(in srgb, ${NEUROMUSCULAR_STATUS_VISUALS[status].chartColor} 22%, white)`;
}
