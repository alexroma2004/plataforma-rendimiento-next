import EmptyState from "@/components/ui/EmptyState";
import StatusMessage from "@/components/ui/StatusMessage";
import type { NeuromuscularTeamSummary as NeuromuscularTeamSummaryData } from "@/lib/domain/neuromuscular-team";

type NeuromuscularTeamSummaryProps = {
  sessionDate: string | null;
  summary: NeuromuscularTeamSummaryData | null;
  loading: boolean;
  error: string | null;
};

type KpiDefinition = {
  label: string;
  value: string;
  description: string;
  accent: string;
};

function isFiniteNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value: number | null, decimals: number) {
  if (!isFiniteNumber(value)) return "—";

  return value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatSessionDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function KpiCard({ kpi }: { kpi: KpiDefinition }) {
  return (
    <article
      className={`min-w-0 rounded-2xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm sm:p-5 ${kpi.accent}`}
    >
      <p className="break-words text-xs font-black uppercase tracking-wide text-slate-500">
        {kpi.label}
      </p>
      <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
        {kpi.value}
      </p>
      <p className="mt-2 break-words text-xs font-bold leading-5 text-slate-500">
        {kpi.description}
      </p>
    </article>
  );
}

export default function NeuromuscularTeamSummary({
  sessionDate,
  summary,
  loading,
  error,
}: NeuromuscularTeamSummaryProps) {
  const classifiedDescription = summary
    ? summary.classifiedPlayerCount > 0
      ? `de ${summary.classifiedPlayerCount} clasificados`
      : "Sin jugadores clasificables"
    : "Estado del equipo";

  const kpis: KpiDefinition[] = [
    {
      label: "Fecha",
      value: formatSessionDate(sessionDate),
      description: "Sesión deportiva seleccionada",
      accent: "border-t-slate-400",
    },
    {
      label: "Readiness general",
      value: `${formatNumber(summary?.readinessMean ?? null, 1)}${isFiniteNumber(summary?.readinessMean ?? null) ? " /100" : ""}`,
      description: "Promedio de Readiness válido",
      accent: "border-t-emerald-400",
    },
    {
      label: "Objective Loss Score medio",
      value: `${formatNumber(summary?.objectiveLossScoreMean ?? null, 1)}${isFiniteNumber(summary?.objectiveLossScoreMean ?? null) ? " /3" : ""}`,
      description: "Media del score agregado",
      accent: "border-t-amber-400",
    },
    {
      label: "Pérdida media",
      value: `${formatNumber(summary?.meanLossPercent ?? null, 1)}${isFiniteNumber(summary?.meanLossPercent ?? null) ? " %" : ""}`,
      description: "Pérdida objetiva media",
      accent: "border-t-orange-400",
    },
    {
      label: "Z-score medio",
      value: formatNumber(summary?.zScoreMean ?? null, 2),
      description: "Media de z-scores compuestos",
      accent: "border-t-indigo-400",
    },
    {
      label: "Moderada o peor",
      value: String(summary?.moderateOrWorseCount ?? 0),
      description: classifiedDescription,
      accent: "border-t-orange-500",
    },
    {
      label: "Casos críticos",
      value: String(summary?.criticalCount ?? 0),
      description: classifiedDescription,
      accent: "border-t-red-500",
    },
  ];

  return (
    <section
      aria-labelledby="neuromuscular-team-summary-title"
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="neuromuscular-team-summary-title"
              className="break-words text-xl font-black text-slate-950 sm:text-2xl"
            >
              Rendimiento neuromuscular del equipo
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              PRE
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Estado PRE de la sesión seleccionada
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-4">
          <StatusMessage variant="info" title="Calculando estado del equipo">
            Cargando registros históricos y baseline del equipo.
          </StatusMessage>
        </div>
      )}

      {!loading && error && (
        <div className="mt-4">
          <StatusMessage variant="error" title="No se ha podido calcular el resumen grupal">
            {error}
          </StatusMessage>
        </div>
      )}

      {!loading && !error && !summary ? (
        <div className="mt-4">
          <EmptyState
            title="Sin datos neuromusculares suficientes"
            description="No hay registros neuromusculares suficientes para calcular el estado del equipo."
          />
        </div>
      ) : !loading && !error && summary ? (
        <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
