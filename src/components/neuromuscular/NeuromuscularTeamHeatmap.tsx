import EmptyState from "@/components/ui/EmptyState";
import type { NeuromuscularTeamPlayerSnapshot } from "@/lib/domain/neuromuscular-team";
import {
  getNeuromuscularCellBackground,
  getNeuromuscularMetricStatus,
  NEUROMUSCULAR_STATUS_ORDER,
  NEUROMUSCULAR_STATUS_VISUALS,
} from "@/lib/ui/neuromuscular-status";

type Props = {
  playerSnapshots: readonly NeuromuscularTeamPlayerSnapshot[];
};

const METRICS = [
  { key: "CMJ", label: "CMJ", unit: "cm", decimals: 1 },
  { key: "RSIMOD", label: "RSI mod", unit: "ratio", decimals: 2 },
  { key: "VMP", label: "VMP", unit: "m/s", decimals: 2 },
] as const;

function isFiniteNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatPercentChange(value: number | null): string {
  if (!isFiniteNumber(value)) return "—";
  const displayValue = Math.abs(value) < 0.05 ? 0 : value;
  return `${displayValue > 0 ? "+" : ""}${displayValue.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

function formatMetricValue(value: number | null, decimals: number, unit: string) {
  return isFiniteNumber(value)
    ? `${value.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`
    : "No disponible";
}

export default function NeuromuscularTeamHeatmap({ playerSnapshots }: Props) {
  return (
    <section className="min-w-0 w-full space-y-4 border-t border-slate-200 bg-white py-5" aria-labelledby="team-heatmap-title">
      <header className="px-4 sm:px-5">
        <h2 id="team-heatmap-title" className="text-xl font-bold text-slate-950">Heatmap del equipo</h2>
        <p className="mt-1 text-sm text-slate-600">Variación PRE respecto al baseline efectivo de cada jugador</p>
      </header>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 px-4 text-xs text-slate-700 sm:px-5" aria-label="Estados por variable">
        {NEUROMUSCULAR_STATUS_ORDER.map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: NEUROMUSCULAR_STATUS_VISUALS[status].chartColor }} aria-hidden="true" />
            {NEUROMUSCULAR_STATUS_VISUALS[status].label}
          </li>
        ))}
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-slate-300 bg-slate-100" aria-hidden="true" />Sin dato</li>
      </ul>
      {playerSnapshots.length === 0 ? (
        <EmptyState title="Sin jugadores" description="No hay jugadores con datos neuromusculares para esta sesión." />
      ) : (
        <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Heatmap del equipo" >
          <table className="w-full min-w-[560px] table-fixed border-separate border-spacing-0 text-sm">
            <caption className="sr-only">Variación PRE por jugador y variable. Detalles de PRE y baseline en cada celda.</caption>
            <colgroup><col className="w-[34%]" /><col className="w-[22%]" /><col className="w-[22%]" /><col className="w-[22%]" /></colgroup>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-600">Jugador</th>
                {METRICS.map((metric) => <th key={metric.key} scope="col" className="border-b border-slate-200 px-3 py-3 text-center font-semibold text-slate-600">{metric.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {playerSnapshots.map((player) => (
                <tr key={player.playerId}>
                  <th scope="row" className="sticky left-0 z-10 break-words border-b border-r border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-800">{player.displayName}</th>
                  {METRICS.map((definition) => {
                    const metric = player.metrics[definition.key];
                    const comparison = isFiniteNumber(metric.value) && isFiniteNumber(metric.baselineValue)
                      ? metric.percentChange : null;
                    const status = getNeuromuscularMetricStatus(metric.lossScore, comparison);
                    const visual = status === null ? null : NEUROMUSCULAR_STATUS_VISUALS[status];
                    const percent = formatPercentChange(comparison);
                    const detail = [
                      `${definition.label} · ${player.displayName}`,
                      isFiniteNumber(metric.value) ? `PRE: ${formatMetricValue(metric.value, definition.decimals, definition.unit)}` : "Sin medición PRE",
                      isFiniteNumber(metric.baselineValue) ? `Baseline: ${formatMetricValue(metric.baselineValue, definition.decimals, definition.unit)}` : "Baseline no disponible",
                      `Variación: ${percent}`,
                      visual?.label ?? "Sin clasificación disponible",
                    ].join("\n");
                    return (
                      <td key={definition.key} title={detail} className={`border-b border-white px-3 py-3 text-center font-semibold tabular-nums ${visual?.textClass ?? "bg-slate-100 text-slate-600"}`} style={status === null ? undefined : { backgroundColor: getNeuromuscularCellBackground(status) }}>
                        <span aria-hidden="true">{percent}</span><span className="sr-only">{detail}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
