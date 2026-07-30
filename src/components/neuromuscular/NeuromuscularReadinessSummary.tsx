import type {
  NeuromuscularReadinessComponentUnavailableReason,
  NeuromuscularReadinessPoint,
} from "@/lib/domain/neuromuscular-readiness";

interface NeuromuscularReadinessSummaryProps {
  playerName: string;
  readinessPoint: NeuromuscularReadinessPoint;
}

function formatScore(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";

  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function getLevelClass(level: NeuromuscularReadinessPoint["readinessLevel"]) {
  switch (level) {
    case "NORMAL":
      return "bg-emerald-100 text-emerald-800";
    case "ATTENTION":
      return "bg-amber-100 text-amber-800";
    case "ALERT":
      return "bg-orange-100 text-orange-800";
    case "CRITICAL":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getLevelLabel(level: NeuromuscularReadinessPoint["readinessLevel"]) {
  switch (level) {
    case "NORMAL":
      return "Normal";
    case "ATTENTION":
      return "Atención";
    case "ALERT":
      return "Alerta";
    case "CRITICAL":
      return "Crítico";
    default:
      return "Sin valoración";
  }
}

function getUnavailableLabel(
  reason: NeuromuscularReadinessComponentUnavailableReason | null,
) {
  const labels: Record<NeuromuscularReadinessComponentUnavailableReason, string> = {
    MISSING_METRIC: "Métrica no registrada",
    COMPARISON_UNAVAILABLE: "Baseline todavía insuficiente",
    POST_NOT_ALLOWED: "Medición POST no puntuable",
    INVALID_OBJECTIVE_LOSS: "Valor no válido",
    EXCLUDED_MICROCYCLE: "Microciclo no puntuable",
    UNKNOWN_MICROCYCLE: "Microciclo no reconocido",
  };

  return reason === null ? "Sin valoración" : labels[reason];
}

export default function NeuromuscularReadinessSummary({
  playerName,
  readinessPoint,
}: NeuromuscularReadinessSummaryProps) {
  const coverageLabel =
    readinessPoint.coverage === "FULL"
      ? "Cobertura completa · 3/3 métricas"
      : "Cobertura parcial · 2/3 métricas";

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            Resumen longitudinal individual
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
            Readiness neuromuscular
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{playerName}</p>
          <p className="mt-1 text-sm text-slate-500">
            {readinessPoint.sessionDate} · {readinessPoint.microcycle}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Readiness
          </p>
          <p className="mt-1 text-3xl font-black">
            {formatScore(readinessPoint.readinessScore)}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${getLevelClass(
              readinessPoint.readinessLevel,
            )}`}
          >
            {getLevelLabel(readinessPoint.readinessLevel)}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
        {coverageLabel}
      </div>

      {readinessPoint.coverage === "PARTIAL" && (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Resultado calculado con 2 de 3 métricas disponibles.
        </p>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {readinessPoint.components.map((component) => {
          const lossPct =
            component.lossPoint?.statisticalPoint.comparison.objectiveLossPct ??
            null;

          return (
            <article
              key={component.metric}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-black text-slate-950">
                {component.metric === "RSIMOD" ? "RSI modificado" : component.metric}
              </p>

              {component.available ? (
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  <p>
                    Loss score: <strong>{component.lossScore}</strong> ·{" "}
                    {getLevelLabel(component.lossLevel)}
                  </p>
                  <p>
                    Readiness métrico: <strong>{component.metricReadinessScore}</strong>
                  </p>
                  {lossPct !== null && (
                    <p>Pérdida objetiva: {formatScore(lossPct)}%</p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  <strong>Sin valoración.</strong> {getUnavailableLabel(component.unavailableReason)}.
                </p>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-5 text-xs leading-5 text-slate-500">
        Indicador neuromuscular basado en la variación respecto al baseline individual.
      </p>
    </section>
  );
}
